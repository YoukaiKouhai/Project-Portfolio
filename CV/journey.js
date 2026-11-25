"use strict";

// Scene controls: the horizon locates the vanishing point in viewport fractions.
// Lower cameraHeight for a shallower view. Travel time is in milliseconds per stop.
const SCENE = {
  horizonX: 0.20, horizonY: 0.20, cameraHeight: 6.3,
  stationSpacing: 90, travelMs: 3600
};
let trainStyle = "shinkansen500";
const STRIPE_FOLLOWS_LINE = false;
const TRAIN_BOX = {left:-1.2,right:1.2,near:2.5,far:13.6,top:2.15};
const JR_LINE_COLORS = ["#24624f","#0072bc","#009944","#e65100","#6a1b9a","#00838f","#1565c0","#ad1457"];
const numberTag = n => String(n+1).padStart(2,"0");
const codeAt = i => "JY-"+numberTag(i);
const $ = id => document.getElementById(id);
const sections = [...document.querySelectorAll(".station")];
const names = sections.map(s => s.querySelector("h2").textContent);
const shortNames = ["Summary", "Education", "Skills", "Work", "Research", "Eng Projects", "CS Projects", "Leadership"];
const compact = matchMedia("(max-width: 760px), (max-height: 560px)");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d",{alpha:false});
let station = 0, position = 0, page = 0, trip = null, frame = 0;
let width=1,height=1,lens=1,horizon=0,cameraHeight=SCENE.cameraHeight;
const riding = () => !$("journey").hidden;
const stationWorldZ = sections.map((_, i) => i * SCENE.stationSpacing);
let signBounds = null;

// Wheel input sets a target along one stretch of track. The train has its own
// position and speed, so even a large trackpad flick takes time to cover it.
const SCROLL_PX = 1100, SETTLE_MS = 300, INERTIA_MS = 180, COMMIT_PX = 60;
let scrub = 0, lastWheel = -Infinity;
let parkedDirection = 0;
let motionChoice=true;
const skipTrainMotion = () => $("journey").dataset.motion==="off";
const smoother = t => t*t*t*(t*(6*t-15)+10);
function warp(s) {
  const segment=Math.floor(s);
  return segment+smoother(s-segment);
}

// z is distance along the rails. Dividing by depth shrinks distant objects
// and brings their ground positions closer to the same point on the horizon.
function project(x, z, altitude = 0) {
  const depth = z + 9;
  const scale = lens / depth;
  return [(compact.matches ? width*(.36+1.50/depth) : width*(SCENE.horizonX+3.3/depth)) + x * scale,
          horizon + (cameraHeight - altitude) * scale];
}
function polygon(points, fill) {
  ctx.beginPath();
  points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function surface(points, color) {
  polygon(points.map(([x,z,y]) => project(x,z,y)), color);
}
function strip(x1, x2, near, far, y, color) {
  surface([[x1,near,y],[x2,near,y],[x2,far,y],[x1,far,y]], color);
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fill();
}
function noise(n) {
  const v = Math.sin(n * 127.1 + 19.4) * 43758.55;
  return v - Math.floor(v);
}
// Each pair of stops shares a landscape. Blend only over the intervening leg;
// world coordinates stay fixed so reversing retraces the same scenery.
function biomeWeights(stop) {
  const blend=start=>smoother(clamp(stop-start,0,1));
  const town=blend(1),river=blend(3),city=blend(5);
  return {paddies:1-town,town:town-river,river:river-city,city};
}
function drawFuji(distance) {
  ctx.save();
  ctx.translate(width*(.58-.012*Math.sin(distance*.003)),0);
  ctx.scale(Math.min(width*.26,horizon*2.3),horizon);
  polygon([[-1,.82],[-.57,.50],[-.24,.21],[-.075,.042],[.045,.038],
    [.27,.25],[.60,.54],[1,.82]],"#788f9d");
  polygon([[-.03,.10],[.045,.038],[.27,.25],[.60,.54],[1,.82],[.24,.65]],"#91a5aa");
  polygon([[-.35,.31],[-.075,.042],[.045,.038],[.32,.30],[.16,.23],
    [.10,.25],[.018,.16],[-.10,.28],[-.14,.22]],"#f1f5ef");
  ctx.restore();
}
// The skyline is a distant painted layer. Cache its towers and windows at
// display resolution on resize; each frame only pans the finished panorama.
const skyline=document.createElement("canvas");
function cacheSkyline() {
  const dpr=Math.min(devicePixelRatio||1,2);
  skyline.width=Math.ceil(width*1.08*dpr);skyline.height=Math.ceil(horizon*dpr);
  const g=skyline.getContext("2d");
  g.setTransform(skyline.width/1080,0,0,skyline.height/100,0,0);
  for(let row=0;row<2;row++) {
    for(let i=0,x=-4;x<1080;i++) {
      const seed=200*row+i,w=9+noise(seed+19)*20;
      const h=13+noise(seed+4)*27+(row?2:13);
      g.fillStyle=row?"#657c81":"#90a2a7";g.fillRect(x,100-h,w,h);
      if(i%4===0) g.fillRect(x+w*.20,97-h,w*.56,4);
      if(row && i%3!==0) {
        g.fillStyle="#cdbf9d";
        for(let j=1;j<4;j++) g.fillRect(x+3+j%2*4,102-h+j*5,w*.22,1.4);
      }
      x+=w+1+noise(seed+8)*4;
    }
  }
  const cx=756;
  function towerLine(x1,y1,x2,y2,color,weight) {
    g.beginPath();g.moveTo(cx+x1,y1);g.lineTo(cx+x2,y2);
    g.strokeStyle=color;g.lineWidth=weight;g.stroke();
  }
  const levels=[[0,4],[1.3,17],[2.2,31],[3.7,49],[6.2,64],[13,92]];
  for(let i=1;i<levels.length;i++) {
    const [a,y]=levels[i-1],[b,end]=levels[i],color=i%2?"#a54e40":"#f1eee5";
    for(const side of [-1,1]) {
      towerLine(side*a,y,side*b,end,color,1.8);
      towerLine(side*a,y,-side*b,end,color,1.05);
    }
    towerLine(-b,end,b,end,color,1.4);
  }
  g.fillStyle="#a65343";g.fillRect(cx-6,47,12,4);g.fillRect(cx-3,28,6,2.5);
}
function drawHills(distance,biome) {
  const sky = ctx.createLinearGradient(0,0,0,height*.26);
  sky.addColorStop(0,"#a8ced5");
  sky.addColorStop(1,"#f5e7bd");
  ctx.fillStyle = sky;
  // Overpaint the fractional horizon pixel before compositing the ground.
  ctx.fillRect(0,0,width,Math.ceil(horizon)+1);
  ellipse(width*.72,height*.09,height*.045,height*.045,"#fff2ca");
  if(biome.river>0) {ctx.globalAlpha=biome.river;drawFuji(distance);ctx.globalAlpha=1;}
  for (let layer=0; layer<3; layer++) {
    const points = [[0,horizon]];
    for (let i=0; i<=70; i++) {
      const x=i/70, t=x*8 + distance*(layer+1)*.0008;
      const ridge=.102 + layer*.036 + Math.sin(t*1.6+layer)*.021 + Math.cos(t*3.7+layer)*.012;
      points.push([x*width,ridge*horizon/SCENE.horizonY]);
    }
    points.push([width,horizon]);
    polygon(points,["#a9c1b8","#8fae99","#729581"][layer]);
  }
  if(biome.city>0) {
    ctx.globalAlpha=biome.city;
    ctx.drawImage(skyline,-width*(.04+.017*Math.sin(distance*.004)),0,width*1.08,horizon);
    ctx.globalAlpha=1;
  }
}
function drawTree(x, z, n) {
  const [cx,cy] = project(x,z);
  const unit = lens/(z+9), h = (2+noise(n)*2.6)*unit;
  ellipse(cx+unit*.45,cy,unit*.95,unit*.17,"#7b986a");
  ctx.fillStyle="#716953";
  ctx.fillRect(cx-unit*.09,cy-h*.5,unit*.18,h*.5);
  const half=h*.24;
  polygon([[cx-half,cy-h*.45],[cx-half*.6,cy-h*.84],[cx,cy-h],[cx+half*.8,cy-h*.81],
           [cx+half,cy-h*.43],[cx,cy-h*.28]],"#456e56");
  polygon([[cx-half,cy-h*.45],[cx-half*.6,cy-h*.84],[cx,cy-h],[cx+half*.16,cy-h*.55],
           [cx-half*.16,cy-h*.34]],"#709668");
}
function wrapSignText(label, maxChars = 16) {
  const lines = [""];
  for (const word of label.split(" ")) {
    const last = lines.length - 1;
    const candidate = (lines[last] + " " + word).trim();
    if (lines[last] && candidate.length > maxChars) lines.push(word);
    else lines[last] = candidate;
  }
  return lines;
}
function platformSign(z,index) {
  const signZ=z+8;
  if (signZ < -2 || signZ > 105) return null;
  const [x,y]=project(3.7,signZ,.63);
  const scale=lens/(signZ+9), size=clamp(scale*.33,4,18);
  ctx.font="700 "+size+"px Segoe UI, sans-serif";
  const lines=wrapSignText(names[index]);
  const w=Math.max(...lines.map(line=>ctx.measureText(line).width))+2.8*size;
  const lineHeight=size*1.18, h=lines.length*lineHeight+size*1.05;
  const bottom=y-1.65*scale;
  return {x,y,scale,size,lines,w,h,lineHeight,bottom,top:bottom-h};
}
function drawCanopy(near,end,z,opacity) {
  ctx.save();ctx.globalAlpha=opacity;
  for(let post=z+14;post>=z+2;post-=6) {
    if(post<near) continue;
    for(const x of [2.32,5.53]) {
      surface([[x,post,.63],[x+.075,post,.63],[x+.075,post,2.55],[x,post,2.55]],"#546a70");
    }
  }
  ctx.globalAlpha=opacity*.53;strip(2,5.8,near,end,2.55,"#a5c9ce");
  ctx.globalAlpha=opacity;
  for(let rib=z+16;rib>=near;rib-=2.6) strip(2,5.8,Math.max(near,rib-.065),rib,2.55,"#698389");
  for(const x of [2,3.89,5.73]) strip(x,x+.07,near,end,2.55,"#475f68");
  ctx.restore();
}
function drawPlatform(z, index,city) {
  const end=z+16;
  // Clip the long platform as it passes behind the viewer.
  const near=Math.max(-4,z);
  if (end<=near) return;
  surface([[2,near,0],[2,end,0],[2,end,.63],[2,near,.63]],"#867f6c");
  strip(2,5.8,near,end,.63,"#d5c5a4");
  strip(2.08,2.19,near,end,.64,"#fff0b4");
  // Timber bench on the far edge of the platform.
  const bench=z+4.5;
  if (bench > -2 && bench < 70) {
    for (const leg of [bench+.15,bench+1.5]) {
      surface([[4.7,leg,.64],[5.05,leg,.64],[5.05,leg,1.07],[4.7,leg,1.07]],"#645b48");
    }
    strip(4.63,5.12,bench,bench+1.75,1.09,"#95724d");
    surface([[5.12,bench,1.18],[5.12,bench+1.75,1.18],[5.12,bench+1.75,1.5],[5.12,bench,1.5]],"#9b7952");
  }
  if(city>0 && index>=6) drawCanopy(near,end,z,city);
  const sign = platformSign(z,index);
  if (!sign) return;
  const {x,y,scale,size,lines,w,h,lineHeight,bottom,top}=sign;
  ctx.font="700 "+size+"px Segoe UI, sans-serif";
  ctx.fillStyle="#544f3e";
  for (const post of [-.32,.32]) ctx.fillRect(x+w*post,bottom,scale*.09,y-bottom);
  const left=x-w/2, accent=JR_LINE_COLORS[index];
  ctx.fillStyle="#ffffff";ctx.fillRect(left,top,w,h);
  ctx.fillStyle="#202a31";ctx.fillRect(left,top,w,size*.25);
  ctx.fillStyle=accent;ctx.fillRect(left,bottom-size*.28,w,size*.28);
  const badge=1.20*size,bx=left+size*.28,by=top+(h-badge)/2;
  ctx.strokeStyle=accent;ctx.lineWidth=Math.max(.6,size*.11);ctx.strokeRect(bx,by,badge,badge);
  ctx.fillStyle="#19272f";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="bold "+size*.72+"px monospace";ctx.fillText(numberTag(index),bx+badge/2,by+badge/2);
  ctx.font="700 "+size+"px Segoe UI, sans-serif";
  lines.forEach((line,i)=>ctx.fillText(line,x+.64*size,top+size*.52+(i+.5)*lineHeight));
  if (index === station) signBounds = {x:x-w/2, y:top, w, h};
}
// Model coordinates are [lateral x, track distance z, height y] in rail units.
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
const mid = points => points.reduce((v,p)=>v.map((n,i)=>n+p[i]/points.length),[0,0,0]);
const tint = (color,factor) => "rgb("+color.map(v=>Math.round(v*factor)).join(",")+")";

// Each convex section uses outward winding. The same builder handles round
// boilers, wheel axles, box-shaped equipment and the streamlined nose.
function makeTrain(style) {
  const faces=[];
  let part=0;
  function face(points,color,inside) {
    const [a,b,c]=points;
    const u=b.map((v,i)=>v-a[i]), v=c.map((n,i)=>n-a[i]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const center=mid(points);
    if(n.reduce((s,val,i)=>s+val*(center[i]-inside[i]),0)<0) {
      points=points.slice().reverse();
      for(let i=0;i<3;i++) n[i]=-n[i];
    }
    const diffuse=(n[0]*.48+n[1]*.24+n[2]*Math.sqrt(.712))/Math.hypot(...n);
    const shade=.55+.45*Math.max(0,diffuse);
    faces.push({points,part,z:center[1],shade,color:tint(rgb(color),shade),stripe:color==="#0b62a8"});
  }
  function cap(ring,color,inside) {
    // A fan of quads, with a triangle at the end of odd-sided sections.
    for(let i=1;i<ring.length-1;i+=2) face([ring[0],...ring.slice(i,i+3)],color,inside);
  }
  function shell(a,b,color,endCaps=true) {
    const inside=mid([...a,...b]);
    a.forEach((p,i)=>{
      const j=(i+1)%a.length;
      face([p,a[j],b[j],b[i]],Array.isArray(color)?color[i]:color,inside);
    });
    if(endCaps) {
      const endColor=Array.isArray(color)?color[0]:color;
      cap(a,endColor,inside);cap(b,endColor,inside);
    }
  }
  function box(x1,x2,z1,z2,y1,y2,color) {
    const ring=z=>[[x1,z,y1],[x2,z,y1],[x2,z,y2],[x1,z,y2]];
    shell(ring(z1),ring(z2),color);
  }
  function profile(z,w,lo,hi) {
    const h=hi-lo;
    return [[-.72,0],[.72,0],[1,.18],[1,.72],[.67,1],[-.67,1],[-1,.72],[-1,.18]]
      .map(([x,y])=>[x*w,z,lo+y*h]);
  }
  function wheelset(z,r) {
    const ring=x=>Array.from({length:8},(_,i)=>{
      const t=i*Math.PI/4;
      return [x,z+r*Math.cos(t),.12+r+r*Math.sin(t)];
    });
    shell(ring(-.82),ring(.82),"#363b3c");
  }
  if(style==="shinkansen500") {
    const white="#f3f6f8", glass="#1f2a33", roof="#cfd8de", skirt="#5d6b75", stripe="#0b62a8";
    function car(stations,cabSegment,passengerWindow,visor=null) {
      const rings=stations.map(([z,w,h])=>profile(z,w,.21,h));
      const center=mid(rings.flat());
      cap(rings[0],white,center);cap(rings.at(-1),white,center);
      for(let k=0;k<rings.length-1;k++) {
        const a=rings[k], b=rings[k+1],inside=mid([...a,...b]);
        const cab=k===cabSegment;
        const z0=stations[k][0], z1=stations[k+1][0];
        const sideCab=visor && z0>=visor.start && z1<=visor.end;
        // Raise the sill toward the tip while keeping the visor below the shoulder.
        const sill=z=>sideCab ? .57+.22*(z-visor.start)/(visor.end-visor.start) : .52;
        const cutsA=[0,.23,.40,sill(z0),.90,1], cutsB=[0,.23,.40,sill(z1),.90,1];
        for(let i=0;i<8;i++) {
          const j=(i+1)%8;
          if(i===2 || i===6) {
            // Split the side panel itself into livery strips to avoid coplanar decals.
            const low=i===2?i:j, high=i===2?j:i;
            const colors=[white,stripe,white,(sideCab || passengerWindow(k))?glass:white,white];
            for(let m=0;m<colors.length;m++)
              face([mix(a[low],a[high],cutsA[m]),mix(b[low],b[high],cutsB[m]),
                mix(b[low],b[high],cutsB[m+1]),mix(a[low],a[high],cutsA[m+1])],colors[m],inside);
          } else {
            const color=i===0 || i===1 || i===7?skirt:cab?glass:i===4?roof:white;
            face([a[i],a[j],b[j],b[i]],color,inside);
          }
        }
      }
    }
    const body=[8.12,8.72,8.83,9.65].map(z=>[z,1.02,1.81]);
    const nose=Array.from({length:9},(_,i)=>{
      const t=i/8;
      // Lower the roof before pulling in the flanks so the side visor
      // remains visible even from the more central mobile camera.
      return [10+3.5*t,1.02-.80*t**4,1.81-1.35*t**2.1];
    });
    car([...body,...nose],null,k=>k<body.length && k%2===0,
      {start:nose[2][0],end:nose[4][0]});
    part++;
    box(-.40,.40,8.30,8.95,1.81,1.89,roof);
    // Two folded wing plates on a raised pantograph shoe.
    box(-.13,.13,9.35,9.60,1.81,2.03,skirt);
    for(const side of [-1,1]) face([[0,9.38,2.01],[side*.67,9.22,2.15],
      [side*.56,9.60,2.13],[0,9.62,2.01]],roof,[0,9.45,1.7]);
    part++;
    car([[2.7,.22,.46],[3.18,.53,.63],[4.28,.72,.94],[5.46,.95,1.64],[5.98,1.02,1.81],
      [6.65,1.02,1.81],[6.8,1.02,1.81],[7.72,1.02,1.81],[7.99,1.02,1.81]],2,k=>k>=3 && k%2===0);
    part++;
    for(const side of [-1,1]) {
      const light=[[.40,3.57,.65],[.55,3.66,.62],[.54,3.82,.67],[.41,3.74,.69]]
        .map(([x,z,y])=>[x*side,z,y+.02]);
      face(light,"#ff5a4a",[0,3.7,.45]);
    }
  } else {
    const black="#1d2022",grey="#34393c",brown="#5a3425",warm="#d8c98f";
    // The locomotive is farthest from the camera. Its six axles form a 2-8-2.
    [9.55,10.12,10.71,11.3,11.89,12.58].forEach((z,i)=>wheelset(z,i===0||i===5?.21:.29));
    part++;
    for(const x of [-.855,.83]) box(x,x+.025,10.12,11.89,.34,.40,"#859093");
    box(-.84,.84,9.33,12.96,.49,.78,black);
    box(-.93,.93,12.73,12.99,.47,.68,"#b3261e");
    const barrel=z=>Array.from({length:8},(_,i)=>[.58*Math.cos(i*Math.PI/4),z,1.18+.51*Math.sin(i*Math.PI/4)]);
    shell(barrel(10.03),barrel(12.32),grey);
    shell(barrel(12.32),barrel(12.91),black);
    for(const [z,r,top] of [[10.85,.22,1.90],[11.58,.19,1.88],[12.54,.17,2.15]]) {
      const ring=(y,radius)=>Array.from({length:6},(_,i)=>[radius*Math.cos(i*Math.PI/3),z+radius*Math.sin(i*Math.PI/3),y]);
      shell(ring(1.62,r),ring(top,r*.88),black);
    }
    box(-.86,.86,9.32,10.12,.76,1.83,black);
    box(-.94,.94,9.30,10.17,1.83,1.99,grey);
    box(-.88,-.86,9.44,9.95,1.28,1.65,warm);
    box(-.88,-.86,9.50,9.89,.93,1.09,"#c8a24a");
    part++;
    wheelset(7.10,.22);wheelset(8.72,.22);
    box(-.85,.85,6.65,9.19,.32,1.37,black);
    shell(profile(6.83,.72,1.29,1.54),profile(9.00,.72,1.29,1.54),grey);
    part++;
    wheelset(3.37,.20);wheelset(5.96,.20);
    box(-.82,.82,2.70,6.42,.25,.48,"#1f2224");
    shell(profile(2.99,.96,.48,1.61),profile(6.39,.96,.48,1.61),
      [brown,brown,brown,"#7a4a35","#3f4543","#3f4543",brown,brown]);
    part++;
    for(const x of [-.965,.965]) {
      for(let i=0;i<5;i++) {
        const z=3.16+i*.62;
        face([[x,z,.90],[x,z+.44,.90],[x,z+.44,1.26],[x,z,1.26]],warm,[0,z,1]);
      }
    }
    for(const x of [-.56,.13]) face([[x,2.98,.95],[x+.40,2.98,.95],[x+.40,2.98,1.27],[x,2.98,1.27]],warm,[0,3.3,1]);
    for(const x of [-.77,.74]) box(x,x+.035,2.73,2.78,.47,1.03,grey);
    box(-.78,.78,2.72,2.77,.98,1.03,grey);
    box(-.74,-.55,2.71,2.75,.59,.74,"#ff3b30");
  }
  return faces.sort((a,b)=>a.part-b.part || b.z-a.z);
}
const trainMeshes={shinkansen500:makeTrain("shinkansen500"),d51:makeTrain("d51")};
let trainPaths=[],steamClip=0,trainSpeed=0,lastDistance=0,lastTrainTime=0;
const trainSprite=document.createElement("canvas");
let spriteLeft=0,spriteTop=0,spriteScale=1,spriteTint="",stripeFrame=0;
let stripeStart=rgb("#0b62a8"),stripeEnd=stripeStart,stripeChanged=0;
function stripeAt(now) {
  return mix(stripeStart,stripeEnd,skipTrainMotion()?1:Math.min(1,(now-stripeChanged)/300));
}
function cacheTrain() {
  trainPaths=[];
  const xs=[],ys=[];
  for(const f of trainMeshes[trainStyle]) {
    const p=f.points.map(([x,z,y])=>project(x,z,y));
    const area=p.reduce((sum,[x,y],i)=>{const q=p[(i+1)%p.length];return sum+x*q[1]-y*q[0];},0);
    if(area>=0) continue;
    const path=new Path2D();path.moveTo(...p[0]);p.slice(1).forEach(v=>path.lineTo(...v));path.closePath();
    trainPaths.push({...f,path});
    for(const [x,y] of p) {xs.push(x);ys.push(y);}
  }
  spriteScale=Math.min(devicePixelRatio||1,2);
  spriteLeft=Math.floor(Math.min(...xs))-2;spriteTop=Math.floor(Math.min(...ys))-2;
  trainSprite.width=Math.ceil((Math.max(...xs)-spriteLeft+2)*spriteScale);
  trainSprite.height=Math.ceil((Math.max(...ys)-spriteTop+2)*spriteScale);
  paintTrainSprite(STRIPE_FOLLOWS_LINE?stripeAt(performance.now()):null);
  updateSteamClip();
}
function updateSteamClip() {
  if(trainStyle!=="d51") return;
  steamClip=Math.max(0,document.querySelector(".journey-head").getBoundingClientRect().bottom-canvas.getBoundingClientRect().top);
}
// Rasterize the projected faces only on resize or a livery change. During
// ordinary travel the two cars are a single native-resolution canvas blit.
function paintTrainSprite(stripe) {
  const brush=trainSprite.getContext("2d");
  brush.setTransform(spriteScale,0,0,spriteScale,-spriteLeft*spriteScale,-spriteTop*spriteScale);
  brush.clearRect(spriteLeft,spriteTop,trainSprite.width/spriteScale,trainSprite.height/spriteScale);
  brush.strokeStyle="rgba(0,0,0,.16)";brush.lineWidth=1;
  for(const f of trainPaths) {
    brush.fillStyle=stripe && f.stripe?tint(stripe,f.shade):f.color;
    brush.fill(f.path);if(!compact.matches) brush.stroke(f.path);
  }
  spriteTint=stripe?stripe.map(Math.round).join(","):"";
}
function drawTrain() {
  const now=performance.now(),distance=position*SCENE.stationSpacing,dt=Math.max(1,now-lastTrainTime);
  const velocity=(distance-lastDistance)*1000/dt;
  trainSpeed=trip && !skipTrainMotion()?trainSpeed+(velocity-trainSpeed)*(1-Math.exp(-dt/110)):0;
  lastDistance=distance;lastTrainTime=now;
  const strength=Math.min(1,Math.abs(trainSpeed)/28);
  const stripe=STRIPE_FOLLOWS_LINE?stripeAt(now):null;
  ctx.save();
  ctx.translate(1.5*strength*Math.sin(distance*.64),strength*Math.sin(distance*1.42));
  if(stripe && stripe.map(Math.round).join(",")!==spriteTint) paintTrainSprite(stripe);
  ctx.drawImage(trainSprite,spriteLeft,spriteTop,trainSprite.width/spriteScale,trainSprite.height/spriteScale);
  if(trainStyle==="d51" && strength>.01) {
    ctx.beginPath();ctx.rect(0,steamClip,width,height);ctx.clip();
    const count=compact.matches?3:6;
    for(let i=0;i<count;i++) {
      const phase=(now/1700+i/count)%1;
      const [x,y]=project(.12*Math.sin(distance*.08+i),12.54-Math.sign(trainSpeed)*phase*1.45,2.13+phase*1.65);
      const r=lens/21*(.10+phase*.40);
      const puff=Array.from({length:6},(_,j)=>[x+r*Math.cos(j*Math.PI/3+i),y+r*.8*Math.sin(j*Math.PI/3+i)]);
      polygon(puff,"rgba(224,230,229,"+(.37*strength*(1-phase))+")");
    }
  }
  ctx.restore();
}
// In a perspective view even a distant canopy can project across a sign.
// Test its screen rectangle as well as its world-space clearance.
function treeObstacles(distance) {
  const boxes=[];
  for (const [i,stop] of stationWorldZ.entries()) {
    const z=stop+1-distance;
    if (z+16<=-4 || z>=200) continue;
    boxes.push(projectedBox(2,5.8,Math.max(-4,z),z+16,1.5));
    const sign=platformSign(z,i);
    if (sign) boxes.push({x:sign.x-sign.w/2,y:sign.top,w:sign.w,h:sign.y-sign.top});
  }
  boxes.push(projectedBox(TRAIN_BOX.left,TRAIN_BOX.right,TRAIN_BOX.near,TRAIN_BOX.far,TRAIN_BOX.top));
  return boxes;
}
function projectedBox(left,right,near,far,top) {
  const corners=[project(left,near,top),project(left,far,top),project(right,near),project(right,far)];
  const xs=corners.map(p=>p[0]), ys=corners.map(p=>p[1]);
  const x=Math.min(...xs), y=Math.min(...ys);
  return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};
}
function clearTree(x,z,n,obstacles) {
  const unit=lens/(z+9), [cx,cy]=project(x,z);
  const h=(2+noise(n)*2.6)*unit, half=Math.max(unit*.5,h*.24);
  const tree={x:cx-half,y:cy-h,w:half+Math.max(unit*1.4,half),h:h+unit*.17};
  if (obstacles.some(box=>overlaps(tree,box))) return false;
  // Only the portion of the rail bed spanning this tree's screen heights matters.
  const depthAt=y=>clamp(lens*cameraHeight/Math.max(.001,y-horizon)-9,-4,200);
  const rail=projectedBox(-1.5,1.5,depthAt(cy+unit*.17),depthAt(cy-h),.09);
  return !overlaps(tree,rail);
}
function drawPaddies(distance,opacity) {
  ctx.save();ctx.globalAlpha=opacity;
  for(let row=Math.floor((distance+115)/14);row>=Math.floor((distance-4)/14);row--) {
    const z=row*14-distance,end=z+14,near=Math.max(-4,z);
    for(const side of [-1,1]) {
      for(const [inner,outer] of [[2.3,10],[10.3,23],[23.3,40]]) {
        strip(side*inner,side*outer,near,end,0,"#7c9668");
        const start=Math.max(-4,z+.44);
        if(end-.44<=start) continue;
        const water=noise(row+inner+side)>.42;
        strip(side*(inner+.16),side*(outer-.16),start,end-.44,.01,water?"#9ec4c5":"#8eb69b");
        if(water && z+5>near) strip(side*(inner+.8),side*(outer-1.4),Math.max(near,z+4.8),z+5,.015,"#bad2cb");
      }
    }
  }
  ctx.restore();
}
function drawTown(distance,opacity) {
  ctx.save();
  for(let block=Math.floor((distance+140)/11);block>=Math.ceil((distance+45)/11);block--) {
    const z=block*11-distance;
    ctx.globalAlpha=opacity*clamp(Math.min(z-45,140-z)/10,0,1);
    for(const side of [-1,1]) {
      const seed=block*7+side,x=side*(9+noise(seed)*38);
      const w=3+noise(seed+2)*2,d=4.1,eave=2.5+noise(seed+5)*1.6;
      const left=x-w/2,right=x+w/2;
      const wall=side<0?right:left;
      surface([[wall,z,0],[wall,z+d,0],[wall,z+d,eave],[wall,z,eave]],"#c0b59a");
      surface([[left,z,0],[right,z,0],[right,z,eave],[left,z,eave]],"#eddfc3");
      surface([[left,z,eave],[right,z,eave],[x,z,eave+1.25]],"#e1d0af");
      for(const edge of (side<0?[left-.24,right+.24]:[right+.24,left-.24])) {
        surface([[edge,z-.3,eave],[edge,z+d+.3,eave],[x,z+d+.3,eave+1.32],[x,z-.3,eave+1.32]],
          edge<x?"#54626c":"#68777b");
      }
      surface([[left+.45,z,.85],[x,z,.85],[x,z,1.75],[left+.45,z,1.75]],"#66777a");
    }
  }
  ctx.restore();
}
function drawParapets(opacity) {
  ctx.save();ctx.globalAlpha=opacity;
  for(const x of [-1.55,1.55]) {
    surface([[x,-4,0],[x,168,0],[x,168,.48],[x,-4,.48]],"#abaeaa");
    strip(x-.065,x+.065,-4,168,.48,"#dadbd2");
  }
  ctx.restore();
}
// A crossing occupies a fixed interval beyond each river station. Clip each
// truss bay at the near plane so its diagonals pass the camera in reverse too.
function drawCrossings(distance,opacity,steel) {
  ctx.save();ctx.globalAlpha=opacity;
  for(const stop of [4,5]) {
    const far=stationWorldZ[stop]+53-distance,start=far-30,near=Math.max(-4,start);
    if(far<=near || near>180) continue;
    if(!steel) {
      strip(-65,65,near,far,0,"#839d93");
      if(far-1>near) strip(-65,65,Math.max(near,start+1),far-1,.01,"#81aeb6");
      for(let r=0;r<5;r++) {
        const z=start+4+r*4.7;
        if(z>=near) strip(r%2?-14:6,r%2?-5:19,z,z+.16,.02,"#a8c9c7");
      }
      continue;
    }
    for(const x of [-1.65,1.65]) {
      for(const y of [.10,2.60]) surface([[x,near,y],[x,far,y],[x,far,y+.10],[x,near,y+.10]],"#698593");
      for(let i=5;i>=0;i--) {
        const z=start+i*6;
        if(z>=near) surface([[x,z,0],[x,z+.12,0],[x,z+.12,2.7],[x,z,2.7]],"#718b9a");
        if(i===5 || z+6<=near) continue;
        const a=Math.max(near,z),lo=i%2?2.55:.14,hi=i%2?.14:2.55,y=lo+(hi-lo)*(a-z)/6;
        surface([[x,a,y],[x,z+6,hi],[x,z+6,hi+.11],[x,a,y+.11]],"#849eaa");
      }
    }
  }
  ctx.restore();
}
function drawCatenary(distance,near,far) {
  // Droppers, paired cantilevers and uprights share one batched stroke each.
  const supports=[];
  for(let n=Math.ceil((distance+near-8)/18);n*18+8-distance<far;n++) {
    const world=n*18+8;
    if(stationWorldZ.some(stop=>Math.abs(world-(stop+9))<8)) continue;
    supports.push(world-distance);
  }
  function segment(x1,z1,y1,x2,z2,y2) {
    ctx.moveTo(...project(x1,z1,y1));ctx.lineTo(...project(x2,z2,y2));
  }
  ctx.beginPath();
  for(const z of supports) for(const x of [-1.75,1.75]) {
    const half=.045;
    ctx.moveTo(...project(x-half,z,0));ctx.lineTo(...project(x+half,z,0));
    ctx.lineTo(...project(x+half,z,2.88));ctx.lineTo(...project(x-half,z,2.88));ctx.closePath();
  }
  ctx.fillStyle="#68767b";ctx.fill();
  ctx.beginPath();
  for(const z of supports) for(const x of [-1.75,1.75]) {
    segment(x,z,2.78,0,z,2.45);segment(x,z,2.13,x*.36,z,2.56);
  }
  ctx.strokeStyle="#647178";ctx.lineWidth=1.35;ctx.stroke();
  ctx.beginPath();
  for(const y of [2.35,2.65]) segment(0,near,y,0,far,y);
  for(const z of supports) segment(0,z,2.35,0,z,2.65);
  ctx.strokeStyle="#455359";ctx.lineWidth=1;ctx.stroke();
}
function drawScene() {
  const distance=position*SCENE.stationSpacing;
  const biome=biomeWeights(position);
  drawHills(distance,biome);
  ctx.fillStyle="#a8bd87"; ctx.fillRect(0,horizon,width,height-horizon);
  // Every sleeper, field and tree has a fixed world coordinate, including in reverse.
  const start=Math.floor(distance-4), far=200;
  for (let n=Math.floor((distance+far)/9); n>=Math.floor(start/9); n--) {
    const z=Math.max(-4,n*9-distance), end=(n+1)*9-distance;
    if (end<=z) continue;
    for (const sign of [-1,1]) {
      strip(sign*2,sign*65,z,end,0,["#adc38d","#a6bb82","#b6c996"][Math.floor(noise(n+sign)*3)]);
      strip(sign*9,sign*19,z,end,0,noise(n)>.5?"#bfca8e":"#94b282");
    }
  }
  if(biome.paddies>0) drawPaddies(distance,biome.paddies);
  if(biome.river>0) drawCrossings(distance,biome.river,false);
  if(biome.town>0) drawTown(distance,biome.town);
  // Trees fade into the urban horizon during the last biome transition.
  ctx.globalAlpha=1-biome.city;
  const obstacles=treeObstacles(distance);
  for (let n=Math.ceil((distance+far)/6); biome.city<1 && n>=Math.floor(start/6); n--) {
    const worldZ=n*6+noise(n)*3, z=worldZ-distance;
    if (z < -3 || stationWorldZ.some(stop => worldZ>=stop-6 && worldZ<=stop+24)) continue;
    const x=n%2 ? -4.8-noise(n+3)*10 : 10+noise(n+3)*10;
    if (clearTree(x,z,n,obstacles)) drawTree(x,z,n);
  }
  ctx.globalAlpha=1;
  strip(-1.47,1.47,-4,far,0,"#919482");
  // Sleepers share a material. Batch them into one path and one GPU fill.
  ctx.beginPath();
  for (let n=Math.ceil((distance+far)/.8); n>=Math.ceil((distance-4)/.8); n--) {
    const z=n*.8-distance;
    ctx.moveTo(...project(-1.16,z,.035));ctx.lineTo(...project(1.16,z,.035));
    ctx.lineTo(...project(1.16,z+.19,.035));ctx.lineTo(...project(-1.16,z+.19,.035));
    ctx.closePath();
  }
  ctx.fillStyle="#756e5f";ctx.fill();
  for (const x of [-.81,.81]) {
    strip(x-.055,x+.055,-4,far,.08,"#4b5b58");
    strip(x,x+.048,-4,far,.09,"#dedbc5");
  }
  if(biome.town>0) drawParapets(biome.town);
  if(biome.river>0) drawCrossings(distance,biome.river,true);
  const electric=trainStyle==="shinkansen500";
  if(electric) drawCatenary(distance,TRAIN_BOX.far,180);
  sections.forEach((_,i)=>{
    const z=i*SCENE.stationSpacing-distance+1;
    if (z<far && z+16>-4) drawPlatform(z,i,biome.city);
  });
  drawTrain();
  if(electric) {
    // Near wires pass above the roof; mask the lettered area of visible signs.
    // Extend the contact wire past the bottom of the view, including on phones.
    ctx.save();
    for(const [i,world] of stationWorldZ.entries()) {
      const sign=platformSign(world+1-distance,i);
      if(!sign) continue;
      ctx.beginPath();ctx.rect(0,0,width,height);
      ctx.rect(sign.x-sign.w/2-1,sign.top-1,sign.w+2,sign.h+2);ctx.clip("evenodd");
    }
    drawCatenary(distance,-7,TRAIN_BOX.far);
    ctx.restore();
  }
}
function paintSizedScene() {
  const rect=canvas.getBoundingClientRect();
  if(!rect.width || !rect.height) return;
  width=rect.width; height=rect.height;
  horizon=height*(compact.matches ? .14 : SCENE.horizonY);
  lens=compact.matches?Math.min(height*.37,width*.51):height;
  cameraHeight=compact.matches?8.2:SCENE.cameraHeight;
  cacheSkyline();
  cacheTrain();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.round(width*dpr)); canvas.height=Math.max(1,Math.round(height*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawScene();
}
function resizeScene() {
  if (!riding()) return;
  paintSizedScene();
  if (!trip && compact.matches) {measurePreviews();syncCarousel();}
  else if (!trip) layoutCards();
}

const GAP = 10;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(value, hi));
const overlaps = (a,b) => a.x < b.x+b.w && b.x < a.x+a.w && a.y < b.y+b.h && b.y < a.y+a.h;
function padded(box, gap) {
  return {x:box.x-gap, y:box.y-gap, w:box.w+2*gap, h:box.h+2*gap};
}
// Fractional slot edges in the landscape above the navigation bar, followed
// by preferred width in viewport units and its rem cap. Order follows the CV.
const stationSlots={
  summary:[[.66,.04,.99,.90,32,27]],
  education:[[.36,.01,.70,.44,34,29],[.71,.34,.995,.91,29,25],
             [.018,.26,.36,.675,34,28],[.025,.68,.39,.995,36,30]],
  skills:[[.018,.22,.225,.52,21,19],[.012,.52,.33,.80,32,26],[.014,.72,.37,.995,35,29],
          [.32,.055,.65,.44,33,28],[.66,.30,.985,.51,32,25],[.73,.52,.99,.95,26,22]],
  work:[[.415,.05,.73,.56,31,26],[.735,.14,.995,.94,27,24],[.04,.585,.35,.995,31,26]],
  research:[[.605,.055,.99,.995,39,36],[.025,.305,.385,.995,36,31]],
  'engineering-projects':[[.53,.055,.99,.39,46,38],[.75,.405,.99,.97,24,21],
                          [.032,.26,.33,.57,30,25],[.048,.58,.34,.995,29,24]],
  'cs-projects':[[.59,.055,.99,.475,40,33],[.59,.495,.99,.995,40,33],
                 [.065,.61,.325,.995,26,23]],
  leadership:[[.70,.045,.995,.98,30,26]]
};
const staticLayouts=new Set(["summary","skills","leadership"]);
function clearance(layout) {
  const obstacles=signBounds ? [padded(signBounds,GAP)] : [];
  if (["education","skills","summary","leadership"].includes(layout)) {
    // Slice the receding rails so their clearance follows the diagonal.
    for (let z=-4;z<200;) {
      const next=Math.min(200,z+(z+9)*.14);
      obstacles.push(padded(projectedBox(-1.47,1.47,z,next,.09),4));
      z=next;
    }
  }
  for (let z=TRAIN_BOX.near;z<TRAIN_BOX.far;z+=.75)
    obstacles.push(padded(projectedBox(TRAIN_BOX.left,TRAIN_BOX.right,z,
      Math.min(TRAIN_BOX.far,z+.75),TRAIN_BOX.top),3));
  if (layout==="summary" || layout==="leadership") {
    for (let z=1;z<17;z+=2)
      obstacles.push(padded(projectedBox(2,5.8,z,z+2,.65),5));
    obstacles.push(padded(projectedBox(4.6,5.15,5.5,7.3,1.5),5));
  }
  return obstacles;
}
// Choose a clear rectangle inside a single reserved slot. Only obstacle
// edges can improve the available width or height, so no random search is needed.
function fitSlot(cell,desiredW,desiredH,obstacles) {
  const right=cell.x+cell.w,bottom=cell.y+cell.h;
  const blocks=obstacles.filter(o=>overlaps(cell,o)).sort((a,b)=>a.x-b.x);
  const tops=[cell.y,...blocks.map(o=>o.y+o.h).filter(y=>y>cell.y && y<bottom)];
  const ends=[bottom,...blocks.map(o=>o.y).filter(y=>y>cell.y && y<bottom)];
  let best=null,bestScore=-Infinity;
  for (const y of tops) for (const end of ends) {
    const h=Math.min(desiredH,end-y);
    if (h<=0) continue;
    let left=cell.x;
    function consider(stop) {
      const w=Math.min(desiredW,stop-left);
      if (w<=0) return;
      const score=w/desiredW*h/desiredH-.12*((left-cell.x)/cell.w+(y-cell.y)/cell.h);
      if (score>bestScore) {best={x:left,y,w,h};bestScore=score;}
    }
    for (const o of blocks) {
      if (o.y>=y+h || o.y+o.h<=y) continue;
      consider(Math.min(right,o.x));
      left=Math.max(left,o.x+o.w);
    }
    consider(right);
  }
  return best;
}
function sizePill(card,immediate) {
  const oldW=card.offsetWidth,oldH=card.offsetHeight;
  const maxW=parseFloat(card.style.maxWidth);
  const rem=parseFloat(getComputedStyle(document.documentElement).fontSize);
  const w=card.classList.contains("expanded") ? maxW : Math.min(maxW,width*.23,16*rem);
  card.classList.add("measuring");
  card.style.width=w+"px"; card.style.height="auto";
  const h=card.offsetHeight;
  card.style.width=(immediate ? w : oldW)+"px";
  card.style.height=(immediate ? h : oldH)+"px";
  void card.offsetWidth;
  card.classList.remove("measuring");
  card.style.width=w+"px"; card.style.height=h+"px";
}
// Measure the actual expanded text even while its pill is closed. If the
// desktop is short, extend the landscape instead of nesting scrollbars.
function readingHeight(card,w) {
  const probe=card.cloneNode(true);
  probe.inert=true;
  probe.removeAttribute("id"); probe.querySelectorAll("[id]").forEach(el=>el.removeAttribute("id"));
  Object.assign(probe.style,{visibility:"hidden",width:w+"px",maxWidth:"none",height:"auto",
    minHeight:"0",maxHeight:"none",animation:"none",transition:"none",left:"0",top:"0"});
  const detail=probe.querySelector(".card-detail");
  if (detail) { probe.classList.add("expanded"); detail.hidden=false; }
  card.parentElement.append(probe);
  const needed=Math.ceil(probe.getBoundingClientRect().height)+1;
  const header=probe.querySelector("button")?.offsetHeight ?? 0;
  probe.remove();
  return {needed,header};
}
let readingKey="";
function layoutCards() {
  const group=$("cards");
  if (!group.children.length || compact.matches || trip || !riding()) return;
  const view=$("stage-view"), stage=$("stage");
  const key=[station,view.clientWidth,view.clientHeight].join("-");
  if (key!==readingKey) {
    stage.style.removeProperty("--reading-height"); view.scrollTop=0;
    readingKey=key;
    paintSizedScene();
  }
  for (let pass=0; pass<8; pass++) {
    const ratio=placeStationCards(group);
    if (ratio<=1 || pass===7) break;
    stage.style.setProperty("--reading-height",Math.ceil(stage.offsetHeight*Math.min(1.45,ratio)+12)+"px");
    paintSizedScene();
  }
  followThreads(360+group.children.length*60);
}
function placeStationCards(group) {
  let ratio=1;
  const origin=group.getBoundingClientRect();
  const heading=document.querySelector(".journey-head > div").getBoundingClientRect();
  const bottom=origin.height-GAP;
  if (bottom<=0) return 1;
  const yAt=f=>f*bottom;
  const rem=parseFloat(getComputedStyle(document.documentElement).fontSize);
  const layout=sections[station].dataset.layout,obstacles=clearance(layout);
  obstacles.push(padded({x:heading.left-origin.left,y:heading.top-origin.top,w:heading.width,h:heading.height},6));
  const preset=layout==="projects" ? sections[station].id : layout;
  const skillGap=clamp(bottom*.024,10,20);
  let nextSkillTop;
  let lvSlot;
  const distantSign=preset==="engineering-projects" ? platformSign(SCENE.stationSpacing+1,station+1) : null;
  Array.from(group.children).forEach((card,i)=>{
    const [left,y,right,end,vw,cap]=stationSlots[preset][i];
    const cell={x:left*origin.width,y:yAt(y),w:(right-left)*origin.width-GAP,h:yAt(end)-yAt(y)-4};
    if (distantSign && i===2) {
      // The old ECG slot now holds Transvenous. Leave the distant sign and its posts visible.
      cell.y=Math.max(cell.y,distantSign.y+GAP);
      cell.h=yAt(end)-cell.y-4;
    }
    if (preset==="cs-projects" && i<2) {
      const rightEdge=cell.x+cell.w;
      const clearLeft=Math.max(cell.x,signBounds.x+signBounds.w+GAP);
      // On tall portrait desktops the sign can project beyond the right edge.
      // Keep a readable column and let fitSlot clear it vertically in that case.
      if (rightEdge-clearLeft>=10*rem) {
        cell.x=clearLeft;
        cell.w=rightEdge-clearLeft;
      }
      if (i===1 && lvSlot) {
        // Reserve the open LV card's height even while collapsed, keeping both cards anchored.
        cell.y=lvSlot.y+lvSlot.h+yAt(.02)+4;
        cell.h=yAt(end)-cell.y-4;
      }
    }
    // Stack the three left-hand skills with equal gaps measured edge to edge.
    // Anchor Programming just above Data, then flow Data and Imaging downward.
    const leftSkill=layout==="skills" && i<3;
    if (leftSkill && i===0) cell.h=yAt(end)-skillGap-cell.y;
    if (leftSkill && i>0) {
      cell.y=nextSkillTop;
      cell.h=Math.max(1,bottom-cell.y);
    }
    const desiredW=Math.min(cell.w,width*vw/100,cap*rem);
    // Keep Redwood centered above the sign even when a taller, narrower
    // rectangle would fit beside it. Its heading stays at the marked point.
    if (layout==="work" && i===0 && signBounds) {
      const sign=padded(signBounds,GAP);
      if (sign.y>cell.y && overlaps(cell,sign)) cell.h=sign.y-cell.y;
    }
    const slot=fitSlot(cell,desiredW,cell.h,obstacles);
    if (!slot) return;
    const {needed,header}=readingHeight(card,slot.w);
    if (preset==="cs-projects" && i===0) lvSlot={y:slot.y,h:Math.min(slot.h,needed)};
    if (leftSkill) {
      if (i===0) slot.y+=Math.max(0,slot.h-needed);
      nextSkillTop=slot.y+needed+skillGap;
    }
    // Project cards can scroll, but leave enough room below a wrapped title
    // for several lines of the description even on a small laptop.
    const required=layout==="projects" ? Math.min(needed,header+76) : needed;
    // Work keeps the normal viewport-sized camera. Long job descriptions
    // scroll inside their own card when its reserved space is exhausted.
    if (layout!=="work") ratio=Math.max(ratio,required/slot.h);
    Object.assign(card.style,{left:slot.x+"px",top:slot.y+"px",maxWidth:slot.w+"px",maxHeight:slot.h+"px"});
    if (layout==="skills" && i===3) card.style.minHeight=Math.min(slot.h,yAt(.22))+"px";
    if (card.classList.contains("pill")) sizePill(card,true);
    else card.style.width=slot.w+"px";
  });
  return ratio;
}

function svgNode(tag) { return document.createElementNS("http://www.w3.org/2000/svg",tag); }
function buildThreads(cards) {
  const svg=$("threads");
  svg.replaceChildren();
  for (let i=0; i<cards.length; i++) {
    const g=svgNode("g"), path=svgNode("path"), dot=svgNode("circle");
    // A normalized length lets short and long branches use the same stroke animation.
    path.setAttribute("pathLength","1");
    dot.setAttribute("r",4); g.style.setProperty("--order",i);
    g.append(path,dot); svg.append(g);
  }
  const anchor=svgNode("circle");
  anchor.setAttribute("r",4); svg.append(anchor);
}
// Edge and fractional distance along it, as marked on the station sketches.
const threadPorts={
  education:[["bottom",.85],["left",.77],["right",.36],["right",.78]],
  "professional-experience":[["bottom",.75],["left",.76],["right",.78]],
  "research-experience":[["left",.50],["right",.87]],
  "engineering-projects":[["bottom",.17],["left",.43],["right",.76],["right",.84]],
  "cs-projects":[["bottom",.20],["left",.67],["right",.70]],
  "leadership-and-technical-communication":[["left",.52]]
};
let threadFrame=0,mobilePortX=null;
function followThreads(duration) {
  cancelAnimationFrame(threadFrame);
  const until=performance.now()+(skipTrainMotion() ? 0 : duration);
  function tick() {
    if (trip || !riding()) return;
    const svg=$("threads"), cards=$("cards").children;
    if(!cards.length) return;
    const shown=compact.matches?[cards[page]]:Array.from(cards);
    if (!shown[0] || svg.children.length!==shown.length+1) return;
    const origin=svg.getBoundingClientRect(), [ax,ay]=project(2.35,4,.65);
    const dot=(node,x,y)=>{node.setAttribute("cx",x); node.setAttribute("cy",y);};
    dot(svg.lastElementChild,ax,ay);
    shown.forEach((c,i)=>{
      const r=c.getBoundingClientRect(), left=r.left-origin.left, top=r.top-origin.top;
      if(compact.matches) {
        // Follow the nearest point on the centered monitor's top edge.
        const target=clamp(width/2,left+8,left+r.width-8),y=top;
        if(mobilePortX===null || skipTrainMotion() || performance.now()>=until) mobilePortX=target;
        else mobilePortX+=(target-mobilePortX)*.38;
        const x=mobilePortX;
        const g=svg.children[0];
        g.firstElementChild.setAttribute("d",`M ${ax} ${ay} C ${ax} ${ay+24} ${x} ${y-24} ${x} ${y}`);
        dot(g.lastElementChild,x,y);return;
      }
      const port=threadPorts[sections[station].id]?.[i];
      const edge=port?.[0] ?? (ax<left+r.width/2 ? "left" : "right");
      const fraction=port?.[1] ?? clamp((ay-top)/r.height,.22,.78);
      const x=edge==="bottom" ? left+r.width*fraction : left+(edge==="right" ? r.width : 0);
      const y=edge==="bottom" ? top+r.height : top+r.height*fraction;
      const bend=clamp(Math.hypot(ax-x,ay-y)*.36,16,100);
      const cx=x+(edge==="left" ? -bend : edge==="right" ? bend : 0);
      const cy=y+(edge==="bottom" ? bend : 0);
      const g=svg.children[i];
      g.firstElementChild.setAttribute("d",`M ${ax} ${ay} C ${ax} ${ay+(y<ay?-bend:bend)} ${cx} ${cy} ${x} ${y}`);
      dot(g.lastElementChild,x,y);
    });
    if (performance.now()<until) threadFrame=requestAnimationFrame(tick);
  }
  tick();
}
const headSign=document.querySelector(".journey-head > div");
const badge=document.createElement("span");
badge.className="station-code";headSign.prepend(badge);
const directions=document.createElement("div");
directions.className="directions";headSign.append(directions);
const dots=document.createElement("nav");
dots.id="entry-dots";dots.setAttribute("aria-label","Entries at this station");
$("cards").after(dots);
const sheet=document.createElement("dialog");
sheet.className="lcd-sheet";sheet.setAttribute("aria-label","Entry details");
$("journey").append(sheet);
let sheetTrigger=null,carouselFrame=0;
function closeSheet() {
  if(sheet.open) sheet.close();
}
sheet.addEventListener("close",()=>{
  if(sheetTrigger?.isConnected && riding()) sheetTrigger.focus({preventScroll:true});
  sheetTrigger=null;
});
sheet.addEventListener("click",e=>{
  if(e.target===sheet || e.target.closest(".sheet-close")) closeSheet();
});
function showSheet(card) {
  if(sheet.open) return;
  const detail=card.querySelector(".monitor-body").cloneNode(true);
  const panel=document.createElement("article");
  panel.className="card expanded-sheet";
  const close=document.createElement("button");
  close.type="button";close.className="sheet-close";close.textContent="×";
  close.setAttribute("aria-label","Close details");
  panel.append(card.querySelector(".monitor-meta").cloneNode(true),close,detail);
  sheet.replaceChildren(panel);
  sheet.setAttribute("aria-label",card.getAttribute("aria-label"));
  sheetTrigger=card;sheet.showModal();close.focus();
}
function entryMeta(entry,index,total) {
  const meta=document.createElement("span");meta.className="monitor-meta";
  const period=document.createElement("span"), counter=document.createElement("span");
  period.textContent=entry.querySelector(".column1")?.textContent.trim() || codeAt(station);
  counter.textContent=numberTag(index)+" / "+String(total).padStart(2,"0");
  meta.append(period,counter);return meta;
}
function cleanMilestones(card) {
  for(const li of card.querySelectorAll("li")) {
    const walker=document.createTreeWalker(li,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) walker.currentNode.data=walker.currentNode.data.replace(/♦\s*/g,"");
  }
}
function mobileCard(entry,i,total) {
  const card=document.createElement("article");
  card.className="card";card.tabIndex=0;
  card.setAttribute("aria-label",entry.querySelector("strong")?.textContent || names[station]);
  const body=entry.cloneNode(true);
  body.className="monitor-body";body.querySelectorAll(".column1").forEach(n=>n.remove());
  const expand=document.createElement("button");
  expand.className="expand-details";expand.textContent="Expand details ↑";
  expand.setAttribute("aria-haspopup","dialog");expand.hidden=true;
  card.append(entryMeta(entry,i,total),body,expand);
  card.addEventListener("click",e=>{
    if(!e.target.closest("a") && !window.getSelection().toString()) showSheet(card);
  });
  card.addEventListener("keydown",e=>{
    if(e.target===card && (e.key==="Enter" || e.key===" ")) {e.preventDefault();showSheet(card);}
  });
  return card;
}
function measurePreviews() {
  if(!compact.matches || !riding() || trip) return;
  for(const card of $("cards").children) {
    const body=card.querySelector(".monitor-body");
    if(!body) continue;
    const button=card.querySelector(".expand-details");
    button.hidden=true;
    button.hidden=body.scrollHeight<=body.clientHeight+1;
  }
}
function centerEntry(i,smooth) {
  const card=$("cards").children[i];
  if(!card) return;
  const tray=$("cards"),left=card.offsetLeft+(card.offsetWidth-tray.clientWidth)/2;
  tray.scrollTo({left,behavior:smooth && !skipTrainMotion()?"smooth":"instant"});
  syncCarousel();
}
function syncCarousel() {
  if(!compact.matches || trip || !riding()) return;
  const tray=$("cards"),center=tray.scrollLeft+tray.clientWidth/2;
  let nearest=0,min=Infinity;
  Array.from(tray.children).forEach((c,i)=>{
    const distance=Math.abs(c.offsetLeft+c.offsetWidth/2-center);
    if(distance<min) {nearest=i;min=distance;}
  });
  page=nearest;
  Array.from(dots.children).forEach((b,i)=>b.setAttribute("aria-current",i===page?"true":"false"));
  $("page-label").textContent=(page+1)+" of "+tray.children.length;
  followThreads(160);
}
$("cards").addEventListener("scroll",()=>{
  if(!compact.matches || carouselFrame) return;
  carouselFrame=requestAnimationFrame(()=>{carouselFrame=0;syncCarousel();});
},{passive:true});
function updateSign(i) {
  const accent=JR_LINE_COLORS[i];
  $("journey").style.setProperty("--line-color",accent);
  if(STRIPE_FOLLOWS_LINE && tint(stripeEnd,1)!==tint(rgb(accent),1)) {
    const now=performance.now();
    stripeStart=stripeAt(now);stripeEnd=rgb(accent);stripeChanged=now;
    cancelAnimationFrame(stripeFrame);
    function paintLivery(t) {
      if(!riding() || trip) return;
      drawScene();
      if(!skipTrainMotion() && t-stripeChanged<300) stripeFrame=requestAnimationFrame(paintLivery);
    }
    if(!trip) stripeFrame=requestAnimationFrame(paintLivery);
  }
  badge.textContent=codeAt(i);
  directions.replaceChildren();
  for(const [j,prev] of [[i-1,true],[i+1,false]]) {
    const label=document.createElement("span");
    if(names[j]) label.textContent=prev?"← "+shortNames[j]:shortNames[j]+" →";
    directions.append(label);
  }
}
function desktopCard(entry,i,total) {
  if (staticLayouts.has(sections[station].dataset.layout)) {
    const staticCard=entry.cloneNode(true);
    staticCard.className="card always-open"; staticCard.tabIndex=0;
    staticCard.setAttribute("aria-label",entry.querySelector("strong")?.textContent || names[station]);
    staticCard.querySelectorAll(".column1").forEach(n=>n.remove());
    staticCard.prepend(entryMeta(entry,i,total));
    return staticCard;
  }
  const card=document.createElement("article"), button=document.createElement("button");
  card.className="card pill"; button.className="card-toggle";
  const date=entry.querySelector(".column1")?.textContent.trim();
  const title=entry.querySelector("strong")?.textContent.trim() || date || names[station];
  const role=entry.querySelector(".role")?.textContent.trim();
  button.append(entryMeta(entry,i,total));
  for (const [tag,value] of [["strong",title],["em",role]]) {
    if (value) {const el=document.createElement(tag); el.textContent=value; button.append(el);}
  }
  const body=entry.cloneNode(true);
  body.className="card-detail"; body.id="detail-"+station+"-"+i;
  body.querySelectorAll(".column1, .role").forEach(el=>el.remove());
  body.querySelector("strong")?.remove();
  body.querySelectorAll(".column2").forEach(col=>{
    if (col.firstChild?.nodeType===Node.TEXT_NODE) col.firstChild.data=col.firstChild.data.replace(/^\s*,?\s*/,"");
    col.querySelector(":scope > br:first-child")?.remove();
  });
  body.tabIndex=0; button.id="entry-toggle-"+station+"-"+i;
  body.setAttribute("aria-labelledby",button.id);
  body.hidden=true;
  button.setAttribute("aria-controls",body.id); button.setAttribute("aria-expanded","false");
  button.addEventListener("click",()=>{
    const open=card.classList.toggle("expanded");
    button.setAttribute("aria-expanded",String(open)); body.hidden=!open;
    card.scrollTop=0; sizePill(card,false); followThreads(360);
  });
  card.append(button,body);
  return card;
}
function renderCards(animateArrival=false) {
  const entries=[...sections[station].querySelectorAll(".entry")]
    .map((entry,i)=>({entry,order:Number(entry.dataset.journeyOrder ?? i+1)}))
    .sort((a,b)=>a.order-b.order).map(item=>item.entry);
  const mobile=compact.matches;
  const cards=$("cards");
  cards.replaceChildren(); $("threads").replaceChildren();
  $("journey").classList.toggle("growing",animateArrival && !mobile && !skipTrainMotion());
  cards.dataset.layout=sections[station].dataset.layout;
  cards.dataset.section=sections[station].id;
  const preset=cards.dataset.layout==="projects" ? cards.dataset.section : cards.dataset.layout;
  const capacity=mobile ? entries.length : stationSlots[preset].length;
  const start=mobile ? 0 : page*capacity;
  const visible=entries.slice(start,start+capacity);
  $("journey").style.setProperty("--last-branch",visible.length-1);
  closeSheet();mobilePortX=null;dots.replaceChildren();dots.hidden=!mobile || entries.length<=1;
  visible.forEach((entry,i)=>{
    const card=mobile?mobileCard(entry,i,entries.length):desktopCard(entry,start+i,entries.length);
    cleanMilestones(card);card.style.setProperty("--order",i);cards.append(card);
    if(mobile && entries.length>1) {
      const dot=document.createElement("button");
      dot.setAttribute("aria-label","Entry "+(i+1)+" of "+entries.length+": "+card.getAttribute("aria-label"));
      dot.addEventListener("click",()=>centerEntry(i,true));dots.append(dot);
    }
  });
  const pages=Math.ceil(entries.length/capacity);
  $("pages").hidden=mobile || pages<=1;
  $("page-label").textContent=(page+1)+" of "+pages;
  $("earlier").disabled=page===0;
  $("later").disabled=page>=pages-1;
  buildThreads(mobile?visible.slice(0,1):visible);
  if(mobile) {measurePreviews();centerEntry(page,false);}
  else layoutCards();

}
function updateHud(destination) {
  updateSign(destination);
  $("station-title").textContent=names[destination];
  $("stop-count").textContent=(trip ? "Approaching · " : "Station ")+(destination+1)+" / "+sections.length;
  updateSteamClip();
  $("prev").disabled=destination===0;
  $("next").disabled=destination===sections.length-1;
  Array.from($("route").children).forEach((btn,i)=>{
    if (!trip && i===station) btn.setAttribute("aria-current","step");
    else btn.removeAttribute("aria-current");
  });
}
function arrive(index) {
  parkedDirection=trip?.scrubbing ? trip.direction : 0;
  trip=null; station=index; position=index; scrub=index; page=0;
  $("cards").classList.remove("leaving"); $("threads").classList.remove("leaving");
  $("cards").inert=false;
  updateHud(index);
  drawScene(); renderCards(true);
  $("announce").textContent="Arrived at "+names[index]+". Station "+(index+1)+" of "+sections.length+".";
}
function clearDepartedCards(now) {
  if ($("cards").children.length && now-trip.departed>=240) {
    $("cards").replaceChildren(); $("threads").replaceChildren();
  }
}
function animate(now) {
  const t=clamp((now-trip.start)/trip.duration,0,1);
  if (t===1 || skipTrainMotion()) { arrive(trip.to); return; }
  clearDepartedCards(now);
  position=trip.from+(trip.to-trip.from)*smoother(t);
  drawScene();
  frame=requestAnimationFrame(animate);
}
function depart(destination,details,loop) {
  closeSheet();dots.hidden=true;
  cancelAnimationFrame(frame);
  trip={...details,to:destination,departed:trip?.departed ?? performance.now()};
  $("cards").classList.add("leaving"); $("threads").classList.add("leaving");
  $("cards").inert=true; $("pages").hidden=true;
  updateHud(destination);
  frame=requestAnimationFrame(loop);
}
function travel(index) {
  if (index<0 || index>=sections.length || (!trip?.scrubbing && index===(trip?.to ?? station))) return;
  if (skipTrainMotion() || position===index) { cancelAnimationFrame(frame); arrive(index); return; }
  const duration=SCENE.travelMs*Math.min(2,Math.sqrt(Math.abs(index-position)));
  depart(index,{from:position,start:performance.now(),duration},animate);
}
function drive(now) {
  const dt=clamp(now-trip.lastTick,0,50);
  trip.lastTick=now;
  // A deliberate wheel notch completes the leg after release. Reversing
  // toward the starting platform can still bring the train back to it.
  const offset=scrub-station;
  const committed=offset*trip.direction*SCROLL_PX>=COMMIT_PX;
  const goal=committed ? station+trip.direction : Math.round(scrub);
  if (skipTrainMotion()) { arrive(goal); return; }
  const quiet=now-lastWheel>=SETTLE_MS;
  const target=quiet ? goal : scrub;
  // Cap the underlying progress at one leg per travelMs. Warp that progress
  // into track distance for a slow pull-away, faster middle, and gentle stop.
  const remaining=target-trip.progress;
  const maxRate=1/SCENE.travelMs;
  const desiredRate=clamp(remaining/Math.max(1,dt),-maxRate,maxRate);
  trip.rate+=(desiredRate-trip.rate)*(1-Math.exp(-dt/INERTIA_MS));
  const advance=trip.rate*dt;
  if (remaining===0 || (advance*remaining>0 && Math.abs(advance)>=Math.abs(remaining))) {
    trip.progress=target;
    trip.rate=0;
  } else {
    trip.progress=clamp(trip.progress+advance,0,sections.length-1);
  }
  position=warp(trip.progress);
  if (trip.progress===goal && (quiet || scrub===goal)) { arrive(goal); return; }
  if (goal!==trip.to) { trip.to=goal; updateHud(goal); }
  clearDepartedCards(now);
  drawScene();
  frame=requestAnimationFrame(drive);
}
function step(direction) { travel((trip?.to ?? station)+direction); }
function readingStation() {
  // At the bottom, even a short last section counts as the section being read.
  if (scrollY+innerHeight>=document.documentElement.scrollHeight-2) return sections.length-1;
  const line=$("toggle").getBoundingClientRect().bottom+innerHeight*.22;
  return Math.max(0,sections.findLastIndex(s=>s.getBoundingClientRect().top<=line));
}
function toggleRide() {
  closeSheet();
  const entering=!riding();
  const index=entering ? readingStation() : (trip?.to ?? station);
  cancelAnimationFrame(frame); trip=null;
  $("toggle").setAttribute("aria-pressed",String(entering));
  $("cv").hidden=entering;
  $("journey").hidden=!entering;
  document.body.classList.toggle("riding",entering);
  if (entering) {
    resizeScene(); arrive(index);
  } else {
    const section=sections[index];
    section.scrollIntoView({block:"start"});
    section.querySelector("h2").focus({preventScroll:true});
  }
}
sections.forEach((section,i)=>{
  const link=document.createElement("a");
  link.href="#"+section.id; link.textContent=names[i];
  $("cv-contents").append(link);
  const stop=document.createElement("button");
  stop.textContent=shortNames[i]; stop.title=names[i]; stop.setAttribute("aria-label",names[i]);
  stop.addEventListener("click",()=>travel(i));
  $("route").append(stop);
});
$("cv-contents").hidden=false;
if (ctx) $("toggle").hidden=false;
$("toggle").addEventListener("click",toggleRide);
$("next").addEventListener("click",()=>step(1));
$("prev").addEventListener("click",()=>step(-1));
function turnPage(delta) {
  if (compact.matches) centerEntry(page+delta,true);
  else { page+=delta; renderCards(); }
}
$("earlier").addEventListener("click",()=>turnPage(-1));
$("later").addEventListener("click",()=>turnPage(1));

compact.addEventListener("change",()=>{
  syncMotionControl();
  page=0;
  if (riding() && !trip) renderCards();
});
function syncMotionControl() {
  const enabled=motionChoice;
  $("journey").dataset.motion=enabled ? "on" : "off";
  $("motion").setAttribute("aria-pressed",String(enabled));
  $("motion-state").textContent=enabled ? "On" : "Off";
  if (!enabled) $("journey").classList.remove("growing");
}
syncMotionControl();
const trainButton=document.createElement("button");
trainButton.type="button";trainButton.id="train-style";
trainButton.textContent="Train: 500 Shinkansen";
trainButton.title="Switch between the 500-Series Shinkansen and D51 steam locomotive";
$("motion").after(trainButton);
trainButton.addEventListener("click",()=>{
  trainStyle=trainStyle==="shinkansen500"?"d51":"shinkansen500";
  trainButton.textContent=trainStyle==="d51"?"Train: D51 Steam":"Train: 500 Shinkansen";
  cacheTrain(); // Reprojects the selected mesh and refreshes the steam clip.
  drawScene();
});
$("motion").addEventListener("click",()=>{
  motionChoice=skipTrainMotion();
  syncMotionControl();
});
new ResizeObserver(resizeScene).observe(canvas.parentElement);
document.addEventListener("keydown",event=>{
  if (sheet.open || !riding() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key==="Escape") { toggleRide(); return; }
  // Keep normal keyboard reading and link activation inside the card.
  if (event.target.closest(".card")) return;
  const direction={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[event.key];
  if (direction) { event.preventDefault(); if (!event.repeat) step(direction); }
});
// Only the exposed scenery drives the train. Card and tray events never arrive here.
canvas.addEventListener("wheel",event=>{
  const unit=event.deltaMode===1 ? 16 : event.deltaMode===2 ? height : 1;
  if (event.ctrlKey || !event.deltaY) return;
  event.preventDefault();
  const now=performance.now();
  const freshGesture=now-lastWheel>SETTLE_MS;
  const direction=Math.sign(event.deltaY);
  lastWheel=now;
  if (skipTrainMotion()) {
    if (freshGesture && !trip) step(direction);
    return;
  }
  if (trip && !trip.scrubbing) return;
  // Park at each platform, even if the OS is still sending wheel momentum.
  if (!trip && !freshGesture && parkedDirection===direction) return;
  const next=clamp(scrub+event.deltaY*unit/SCROLL_PX,
    Math.max(0,station-1),Math.min(sections.length-1,station+1));
  if (next===scrub) return;
  scrub=next;
  if (trip) trip.direction=direction;
  else depart(Math.round(scrub),{scrubbing:true,lastTick:now,progress:position,rate:0,direction},drive);
},{passive:false});
let finger=null;
canvas.addEventListener("pointerdown",event=>{
  if (!event.isPrimary || event.pointerType==="mouse") return;
  finger={id:event.pointerId,y:event.clientY};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup",event=>{
  if (finger?.id!==event.pointerId) return;
  const dy=finger.y-event.clientY;
  finger=null;
  if (Math.abs(dy)>32 && !trip) step(Math.sign(dy));
});
canvas.addEventListener("pointercancel",()=>{ finger=null; });
