"use strict";

// Scene controls: the horizon locates the vanishing point in viewport fractions.
// Lower cameraHeight for a shallower view. Travel time is in milliseconds per stop.
const SCENE = {
  horizonX: 0.20, horizonY: 0.20, cameraHeight: 6.3,
  carriage: "#ac4936", stripe: "#f3d69a", roof: "#c4ccba",
  stationSpacing: 90, travelMs: 3600
};
const $ = id => document.getElementById(id);
const sections = [...document.querySelectorAll(".station")];
const names = sections.map(s => s.querySelector("h2").textContent);
const shortNames = ["Summary", "Education", "Skills", "Work", "Research", "Eng Projects", "CS Projects", "Leadership"];
const compact = matchMedia("(max-width: 760px), (max-height: 560px)");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
let station = 0, position = 0, page = 0, trip = null, frame = 0;
let width = 1, height = 1;
const riding = () => !$("journey").hidden;
const stationWorldZ = sections.map((_, i) => i * SCENE.stationSpacing);
let signBounds = null;

// Wheel input sets a target along one stretch of track. The train has its own
// position and speed, so even a large trackpad flick takes time to cover it.
const SCROLL_PX = 1100, SETTLE_MS = 300, INERTIA_MS = 180, COMMIT_PX = 60;
let scrub = 0, lastWheel = -Infinity;
let parkedDirection = 0;
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
  const scale = height / depth;
  return [width * (SCENE.horizonX + 3.3 / depth) + x * scale,
          height * SCENE.horizonY + (SCENE.cameraHeight - altitude) * scale];
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
function drawHills(distance) {
  const sky = ctx.createLinearGradient(0,0,0,height*.26);
  sky.addColorStop(0,"#a8ced5");
  sky.addColorStop(1,"#f5e7bd");
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,width,height);
  ellipse(width*.72,height*.09,height*.045,height*.045,"#fff2ca");
  for (let layer=0; layer<3; layer++) {
    const points = [[0,height]];
    for (let i=0; i<=70; i++) {
      const x=i/70, t=x*8 + distance*(layer+1)*.0008;
      const ridge=.102 + layer*.036 + Math.sin(t*1.6+layer)*.021 + Math.cos(t*3.7+layer)*.012;
      points.push([x*width,ridge*height]);
    }
    points.push([width,height]);
    polygon(points,["#a9c1b8","#8fae99","#729581"][layer]);
  }
}
function drawTree(x, z, n) {
  const [cx,cy] = project(x,z);
  const unit = height/(z+9), h = (2+noise(n)*2.6)*unit;
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
  const scale=height/(signZ+9), size=clamp(scale*.33,4,18);
  ctx.font="bold "+size+"px Georgia";
  const lines=wrapSignText(names[index]);
  const w=Math.max(...lines.map(line=>ctx.measureText(line).width))+1.4*size;
  const lineHeight=size*1.18, h=lines.length*lineHeight+size*.75;
  const bottom=y-1.65*scale;
  return {x,y,scale,size,lines,w,h,lineHeight,bottom,top:bottom-h};
}
function drawPlatform(z, index) {
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
  const sign = platformSign(z,index);
  if (!sign) return;
  const {x,y,scale,size,lines,w,h,lineHeight,bottom,top}=sign;
  ctx.font="bold "+size+"px Georgia";
  ctx.fillStyle="#544f3e";
  for (const post of [-.32,.32]) ctx.fillRect(x+w*post,bottom,scale*.09,y-bottom);
  ctx.fillStyle="#234c42";
  ctx.fillRect(x-w/2,top,w,h);
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="#fff3cd";
  lines.forEach((line, i) => ctx.fillText(line,x,top+size*.375+(i+.5)*lineHeight));
  if (index === station) signBounds = {x:x-w/2, y:top, w, h};
}
function drawCar(near, far, rear) {
  const side=(x,a,b,low,high,color)=>surface([[x,a,low],[x,b,low],[x,b,high],[x,a,high]],color);
  const face=(left,right,low,high,color)=>surface([[left,near,low],[right,near,low],[right,near,high],[left,near,high]],color);
  strip(-1.2,1.2,near-.16,far,.14,"#4c5547");
  side(-.98,near,far,.28,1.88,SCENE.carriage);
  side(-.99,near,far,.92,1.79,SCENE.stripe);
  for (let z=near+.32; z<far-.55; z+=.94) side(-1,z,z+.63,1.06,1.62,"#395b61");
  face(-.98,.98,.28,1.88,SCENE.carriage);
  face(-.98,.98,.92,1.79,SCENE.stripe);
  face(-.73,-.08,1.04,1.63,"#385860");
  face(.08,.73,1.04,1.63,"#385860");
  surface([[-1,near,1.85],[-1,far,1.85],[-.72,far,2.08],[-.72,near,2.08]],"#9ca999");
  strip(-.72,.72,near,far,2.08,SCENE.roof);
  surface([[.72,near,2.08],[.72,far,2.08],[1,far,1.85],[1,near,1.85]],"#a2afa2");
  surface([[-1,near,1.85],[-.72,near,2.08],[.72,near,2.08],[1,near,1.85]],"#afbbab");
  strip(-.35,.35,near+1.25,near+2.3,2.13,"#909e92");
  if (rear) {
    face(-.9,.9,.25,.38,"#3d4945");
    for (const x of [-.65,.65]) {
      const [cx,cy]=project(x,near,.69);
      ellipse(cx,cy,height*.006,height*.006,"#ffe2a1");
    }
  }
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
  boxes.push(projectedBox(-1.2,1.2,2.5,13,2.15));
  return boxes;
}
function projectedBox(left,right,near,far,top) {
  const corners=[project(left,near,top),project(left,far,top),project(right,near),project(right,far)];
  const xs=corners.map(p=>p[0]), ys=corners.map(p=>p[1]);
  const x=Math.min(...xs), y=Math.min(...ys);
  return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};
}
function clearTree(x,z,n,obstacles) {
  const unit=height/(z+9), [cx,cy]=project(x,z);
  const h=(2+noise(n)*2.6)*unit, half=Math.max(unit*.5,h*.24);
  const tree={x:cx-half,y:cy-h,w:half+Math.max(unit*1.4,half),h:h+unit*.17};
  if (obstacles.some(box=>overlaps(tree,box))) return false;
  // Only the portion of the rail bed spanning this tree's screen heights matters.
  const depthAt=y=>clamp(height*SCENE.cameraHeight/Math.max(.001,y-height*SCENE.horizonY)-9,-4,200);
  const rail=projectedBox(-1.5,1.5,depthAt(cy+unit*.17),depthAt(cy-h),.09);
  return !overlaps(tree,rail);
}
function drawScene() {
  const distance=position*SCENE.stationSpacing;
  drawHills(distance);
  const horizon=height*SCENE.horizonY;
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
  // Trees live in fixed world coordinates; draw the railway in front of the landscape.
  const obstacles=treeObstacles(distance);
  for (let n=Math.ceil((distance+far)/6); n>=Math.floor(start/6); n--) {
    const worldZ=n*6+noise(n)*3, z=worldZ-distance;
    if (z < -3 || stationWorldZ.some(stop => worldZ>=stop-6 && worldZ<=stop+24)) continue;
    const x=n%2 ? -4.8-noise(n+3)*10 : 10+noise(n+3)*10;
    if (clearTree(x,z,n,obstacles)) drawTree(x,z,n);
  }
  strip(-1.47,1.47,-4,far,0,"#919482");
  for (let n=Math.ceil((distance+far)/.8); n>=Math.ceil((distance-4)/.8); n--) {
    const z=n*.8-distance;
    strip(-1.16,1.16,z,z+.19,.035,"#756e5f");
  }
  for (const x of [-.81,.81]) {
    strip(x-.055,x+.055,-4,far,.08,"#4b5b58");
    strip(x,x+.048,-4,far,.09,"#dedbc5");
  }
  // The right-hand platform is beyond the train from this camera angle.
  sections.forEach((_,i)=>{
    const z=i*SCENE.stationSpacing-distance+1;
    if (z<far && z+16>-4) drawPlatform(z,i);
  });
  drawCar(8,13,false);
  drawCar(2.7,7.7,true);
}
function paintSizedScene() {
  const rect=canvas.getBoundingClientRect();
  width=rect.width; height=rect.height;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.round(width*dpr)); canvas.height=Math.max(1,Math.round(height*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawScene();
}
function resizeScene() {
  if (!riding()) return;
  paintSizedScene();
  if (!trip) layoutCards();
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
    for (let z=2.5;z<13;z+=1.5)
      obstacles.push(padded(projectedBox(-1.2,1.2,z,Math.min(13,z+1.5),2.15),5));
  }
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
let threadFrame=0;
function followThreads(duration) {
  cancelAnimationFrame(threadFrame);
  const until=performance.now()+(skipTrainMotion() ? 0 : duration);
  function tick() {
    if (trip || compact.matches || !riding()) return;
    const svg=$("threads"), cards=$("cards").children;
    if (svg.children.length!==cards.length+1) return;
    const origin=svg.getBoundingClientRect(), [ax,ay]=project(2.35,4,.65);
    const dot=(node,x,y)=>{node.setAttribute("cx",x); node.setAttribute("cy",y);};
    dot(svg.lastElementChild,ax,ay);
    Array.from(cards).forEach((c,i)=>{
      const r=c.getBoundingClientRect(), left=r.left-origin.left, top=r.top-origin.top;
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
function desktopCard(entry,i) {
  if (staticLayouts.has(sections[station].dataset.layout)) {
    const staticCard=entry.cloneNode(true);
    staticCard.className="card always-open"; staticCard.tabIndex=0;
    staticCard.setAttribute("aria-label",entry.querySelector("strong")?.textContent || names[station]);
    return staticCard;
  }
  const card=document.createElement("article"), button=document.createElement("button");
  card.className="card pill"; button.className="card-toggle";
  const date=entry.querySelector(".column1")?.textContent.trim();
  const title=entry.querySelector("strong")?.textContent.trim() || date || names[station];
  const role=entry.querySelector(".role")?.textContent.trim();
  for (const [tag,value] of [["small",date!==title && date],["strong",title],["em",role]]) {
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
    .sort((a,b)=>a.order-b.order)
    .map(item=>item.entry);
  const mobile=compact.matches;
  const cards=$("cards");
  cards.replaceChildren(); $("threads").replaceChildren();
  $("journey").classList.toggle("growing",animateArrival && !mobile && !skipTrainMotion());
  cards.dataset.layout=sections[station].dataset.layout;
  cards.dataset.section=sections[station].id;
  const preset=cards.dataset.layout==="projects" ? cards.dataset.section : cards.dataset.layout;
  const capacity=mobile ? 1 : stationSlots[preset].length;
  const pageCount=Math.ceil(entries.length/capacity);
  const visible=entries.slice(page*capacity,(page+1)*capacity);
  $("journey").style.setProperty("--last-branch",visible.length-1);
  visible.forEach((entry,i)=>{
    const card=mobile ? entry.cloneNode(true) : desktopCard(entry,i);
    if (mobile) {
      card.className="card"; card.tabIndex=0;
      card.setAttribute("aria-label",entry.querySelector("strong")?.textContent || names[station]);
    }
    card.style.setProperty("--order",i);
    cards.append(card);
  });
  $("pages").hidden=pageCount<=1;
  $("page-label").textContent=(page+1)+" of "+pageCount;
  $("earlier").disabled=page===0;
  $("later").disabled=page===pageCount-1;
  if (!mobile) { buildThreads(visible); layoutCards(true); }
}
function updateHud(destination) {
  $("station-title").textContent=names[destination];
  $("stop-count").textContent=(trip ? "Approaching · " : "Station ")+(destination+1)+" / "+sections.length;
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
  link.href="#"+section.id;
  link.textContent=names[i];
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
  page+=delta; renderCards();
  $("cards").firstElementChild?.focus({preventScroll:true});
}
$("earlier").addEventListener("click",()=>turnPage(-1));
$("later").addEventListener("click",()=>turnPage(1));

compact.addEventListener("change",()=>{
  page=0;
  if (riding() && !trip) renderCards();
});
function setTrainMotion(enabled) {
  $("journey").dataset.motion=enabled ? "on" : "off";
  $("motion").setAttribute("aria-pressed",String(enabled));
  $("motion-state").textContent=enabled ? "On" : "Off";
  if (!enabled) $("journey").classList.remove("growing");
}
setTrainMotion(true);
$("motion").addEventListener("click",()=>{
  setTrainMotion(skipTrainMotion());
});
new ResizeObserver(resizeScene).observe(canvas.parentElement);
document.addEventListener("keydown",event=>{
  if (!riding() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
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
