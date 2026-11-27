"use strict";
// All calculations are local. No upload or prediction request leaves the browser.
const $ = id => document.getElementById(id);
const pct = v => Number.isFinite(v) ? (100*v).toFixed(1)+"%" : "undefined";
const options = (el, values) => el.replaceChildren(...values.map(v => new Option(v,v)));
let D, modelNames, rows, values;
function cards(id,pairs){
  $(id).replaceChildren(...pairs.map(([label,value])=>{
    const d=document.createElement("div"),s=document.createElement("strong"),l=document.createElement("small");
    l.textContent=label;s.textContent=value;d.append(l,s);return d;
  }));
}
function score(model,x){
  const c=x.map((v,i)=>(v-model.mean[i])/model.scale[i]*model.coef[i]);
  const p=1/(1+Math.exp(-(model.intercept+c.reduce((a,b)=>a+b,0))));
  const includeB=p<=model.q,includeM=(1-p)<=model.q;
  return {p,c,set:includeB===includeM?"Review":includeB?"Likely benign":"Likely malignant",
          members:includeB===includeM?(includeB?"B, M":"empty"):includeB?"B":"M"};
}
function distance(x){
  const m=D.models["L2 reference"], z=x.map((v,i)=>(v-m.mean[i])/m.scale[i]);
  return z.reduce((total,v,i)=>total+v*D.precision_matrix[i].reduce((s,w,j)=>s+w*z[j],0),0);
}
function simulator(){
  const name=$("candidate").value, p=D.probabilities[name],t=Number($("threshold").value);
  $("tout").textContent=t.toFixed(3);
  let tn=0,fp=0,fn=0,tp=0;
  p.forEach((s,i)=>{if(s>=t){D.labels[i]?tp++:fp++;}else{D.labels[i]?fn++:tn++;}});
  cards("sim",[["Sensitivity",pct(tp/(tp+fn))],["Specificity",pct(tn/(tn+fp))],["False negatives",fn],["False positives",fp]]);
  $("simnote").textContent="Confusion counts: TN "+tn+" · FP "+fp+" · FN "+fn+" · TP "+tp+
    ". Precision: "+pct(tp/(tp+fp))+". Illustrative cost: "+($("cost").value*fn+fp)+" units (not a clinical cost).";
}
function chart(){
  const names=[$("candidate").value,$("reference").value],pr=$("curveType").value!=="ROC";
  const svg=$("comparePlot"),ns="http://www.w3.org/2000/svg";svg.replaceChildren();
  function line(coords,color,dash=""){
    const el=document.createElementNS(ns,"polyline");
    for(const [k,v] of Object.entries({points:coords.map(([x,y])=>[15+470*x,218-200*y].join(",")).join(" "),fill:"none",stroke:color,"stroke-width":2,"stroke-dasharray":dash}))el.setAttribute(k,v);
    svg.append(el);
  }
  line([[0,1],[0,0],[1,0]],"#607f84");
  names.forEach((name,j)=>{
    const prob=D.probabilities[name],sorted=prob.map((p,i)=>[p,D.labels[i]]).sort((a,b)=>b[0]-a[0]);
    const pos=D.labels.reduce((a,b)=>a+b,0),neg=D.labels.length-pos;let tp=0,fp=0,pts=[[0,pr?1:0]];
    sorted.forEach(([p,y],i)=>{tp+=y;fp+=1-y;if(sorted[i+1]?.[0]!==p)pts.push(pr?[tp/pos,tp/(fp+tp)]:[fp/neg,tp/pos]);});
    line(pts,j?"#a64127":"#087477",j?"5 4":"");
  });
  $("plotLegend").textContent="Solid teal: "+names[0]+" · dashed rust: "+names[1]+(pr?". Horizontal: recall; vertical: precision.":". Horizontal: false-positive rate; vertical: sensitivity.")+" Both axes span 0 to 1.";
}
function retained(){
  const n=Math.max(1,Math.round(Number($("retain").value)*D.labels.length/100)),s=D.final.selective;
  $("retained").textContent=n+" / "+D.labels.length+" retained by distance from 0.5; error among retained: "+pct(D.risk.error[n-1])+". This exploratory ranking is not a conformal guarantee.";
  $("setsInfo").textContent="Separate locked evaluation: "+s.auto+" singleton sets, "+s.empty+" empty and "+s.both+" doubleton sets. Among automatic cases, sensitivity was "+pct(s.auto_sensitivity)+" and specificity "+pct(s.auto_specificity)+". A referral is not a correct diagnosis.";
}
function cases(){
  const key=$("filter").value, p=D.probabilities[D.selected], t=D.threshold;
  rows=D.rows.map((_,i)=>i).filter(i=>key==="Benign"?D.labels[i]===0:key==="Malignant"?D.labels[i]===1:
    key==="False positives"?D.labels[i]===0&&p[i]>=t:key==="False negatives"?D.labels[i]===1&&p[i]<t:true);
  const disagreement=i=>{const a=Object.values(D.probabilities).map(v=>v[i]),m=a.reduce((s,v)=>s+v,0)/a.length;
    return a.reduce((s,v)=>s+(v-m)**2,0);};
  if(key.startsWith("Closest")) rows.sort((a,b)=>Math.abs(p[a]-t)-Math.abs(p[b]-t));
  if(key.startsWith("Most")) rows.sort((a,b)=>disagreement(b)-disagreement(a));
  $("sample").replaceChildren(...rows.map(i=>new Option("Study row "+D.rows[i],i)));
  loadCase();
}
function loadCase(){
  if(!$("sample").value){$("sampleinfo").textContent="No matching development cases.";return;}
  const i=Number($("sample").value);values=D.measurements[i].slice();
  $("sampleinfo").textContent="Source row "+D.rows[i]+" · recorded "+(D.labels[i]?"malignant":"benign")+
    " · original out-of-fold selected-model score "+pct(D.probabilities[D.selected][i])+". Edits below do not alter this record.";
  $("fields").replaceChildren(...D.features.map((name,j)=>{
    const label=document.createElement("label"),input=document.createElement("input");
    label.textContent=name;input.type="number";input.min="0";input.step="any";input.value=values[j];
    input.oninput=()=>{values[j]=input.valueAsNumber;live();};label.append(input);return label;
  }));live();
}
function live(){
  if(!values)return;
  $("bars").replaceChildren();
  if(!values.every(v=>Number.isFinite(v)&&v>=0)){
    $("livecards").replaceChildren();$("warning").textContent="Enter a finite, nonnegative number in every field.";return;
  }
  const m=$("live").value,r=score(D.models[m],values),t=Number($("threshold").value);
  const n=modelNames.filter(k=>(score(D.models[k],values).p>=t)===(r.p>=t)).length;
  const out=values.some((v,i)=>v<D.min[i]||v>D.max[i])||distance(values)>D.distance_limit;
  if(!Number.isFinite(distance(values))||!Number.isFinite(r.p)){
    $("livecards").replaceChildren();$("warning").textContent="Unsupported numerical range; no score reported.";return;
  }
  cards("livecards",[["Dataset score · malignant",pct(r.p)],["Binary at "+t.toFixed(3),r.p>=t?"Malignant":"Benign"],
    ["Conformal set {"+r.members+"}",r.set],["Live model agreement",n+" / "+modelNames.length]]);
  $("warning").textContent=out?"Outside the development range or joint-distance envelope. This extrapolated score is unsupported.":
    "Inside the measured range and development distance envelope; this does not establish clinical validity.";
  const ranked=D.features.map((name,i)=>[name,r.c[i]]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,6);
  ranked.forEach(([name,v])=>{const label=document.createElement("span"),bar=document.createElement("div");
    label.textContent=name+"   "+(v>=0?"+":"")+v.toFixed(2);bar.className="bar";bar.style.background=v>=0?"#aa4621":"#087e83";
    bar.style.width=(100*Math.abs(v)/(Math.abs(ranked[0][1])||1))+"%";$("bars").append(label,bar);});
}
async function batch(){
  const file=$("batch").files[0];if(!file)return;
  try{
    if(file.size>1e6)throw Error("File exceeds 1 MB.");
    const lines=(await file.text()).trim().split(/\r?\n/), header=lines.shift().replace(/^\uFEFF/,"").split(",").map(s=>s.trim().replace(/^"|"$/g,""));
    if(header.length!==30||D.features.some(c=>!header.includes(c)))throw Error("Expected the 30 measurement headers only.");
    if(!lines.length||lines.length>500)throw Error("Provide 1–500 rows.");
    const m=D.models[$("live").value],t=Number($("threshold").value),records=["row,score,binary,conformal,outside_envelope"];
    lines.forEach((line,i)=>{const a=line.split(",").map(s=>s.trim().replace(/^"|"$/g,""));
      if(a.length!==30||a.some(v=>v===""||!Number.isFinite(Number(v))||Number(v)<0))throw Error("Invalid row "+(i+1));
      const x=D.features.map(c=>Number(a[header.indexOf(c)])),r=score(m,x),dist=distance(x);
      if(!Number.isFinite(r.p)||!Number.isFinite(dist))throw Error("Unsupported range on row "+(i+1));
      records.push([i+1,r.p,r.p>=t?"M":"B",r.set,dist>D.distance_limit||x.some((v,j)=>v<D.min[j]||v>D.max[j])].join(","));
    });
    const link=document.createElement("a"),url=URL.createObjectURL(new Blob([records.join("\n")],{type:"text/csv"}));
    link.href=url;link.download="public-example-scores.csv";link.textContent="Download "+lines.length+" results";
    $("batchstatus").replaceChildren(link);link.onclick=()=>setTimeout(()=>URL.revokeObjectURL(url),5000);
  }catch(e){$("batchstatus").textContent=e.message;}
}
const figures={
 "holdout-matrix":["Frozen confusion matrix","114 held-out observations. The counts are fixed; the operating-point simulator uses only development predictions."],
 "error-locations":["Locate shared errors","Rings are reference errors from development OOF scores; projections were fitted without class labels."],
 "error-profiles":["Morphology of difficult cases","Compare three shared-error profiles against development class medians and interquartile ranges."],
 "fold-distributions":["Fold variability","Evaluation folds reuse training observations. Points are descriptive, not independent replications."],
 "projection":["Projection atlas","PCA and UMAP are learned without diagnosis labels. Colors are added afterward; overlap is not a labeling error."],
 "redundancy":["Correlation and clustering","Size-related summaries share information. Removing one does not isolate a biological mechanism."],
 "validation":["Model validation","Development out-of-fold ROC, precision–recall, reliability, learning, feature count, and selective risk."],
 "operating-points":["Decision thresholds","Sensitivity and specificity trade off as the score threshold changes. Costs are illustrative."],
 "agreement":["Error patterns","Independent families sometimes miss the same cases. Dark cells mark out-of-fold errors."],
 "shap-beeswarm":["Global contributions","Refitted linear model; independent-background attributions are additive in log odds, not probabilities."],
 "waterfall-fn":["Individual explanation","This development case was missed out of fold; the waterfall explains the refitted reference, a different prediction."],
 "stress-importance":["Stress tests","Synthetic missingness and coherent size shifts are engineering perturbations, not clinical validation."],
 "ablation":["Controlled comparisons","Same development folds, same evaluation rows. Small differences need not justify added complexity."]};
async function start(){
  const embedded=$("study-data");
  if(embedded) D=JSON.parse(embedded.textContent);
  else {const resp=await fetch("./dashboard.json");if(!resp.ok)throw Error("Missing data export.");D=await resp.json();}
  const f=D.final,m=f.selected;modelNames=Object.keys(D.models);
  cards("cards",[["Evaluated observations",f.test_n],["Malignant sensitivity",pct(m.sensitivity)],["Benign specificity",pct(m.specificity)],["Missed malignancies",m.fn+" / "+(m.fn+m.tp)]]);
  $("context").textContent=f.winner+" · "+m.tp+" true positives, "+m.tn+" true negatives, "+m.fp+" false positive(s). 95% sensitivity interval: "+
    f.sensitivity_ci.map(pct).join(" – ")+". Independent conformal sets referred "+f.selective.abstain+" for review; coverage "+pct(f.selective.coverage)+".";
  options($("candidate"),Object.keys(D.probabilities));$("candidate").value=D.selected;options($("live"),modelNames);
  $("threshold").value=f.threshold;options($("figure"),Object.keys(figures).map(k=>figures[k][0]));
  const plate=()=>{const k=Object.keys(figures).find(k=>figures[k][0]===$("figure").value);
    $("plate").src="figures/"+k+".png";$("plate").alt=figures[k][0];$("caption").textContent=figures[k][1];};
  D.leaderboard.forEach(r=>{const tr=document.createElement("tr");[r.model,r.ap,r.ap_sd,r.auc,r.brier,r.fit_s,r.infer_us,r.n_features].forEach(v=>{
    const td=document.createElement("td");td.textContent=typeof v==="number"?v.toFixed(3):v;tr.append(td);});$("leader").append(tr);});
  options($("reference"),Object.keys(D.probabilities));$("reference").value="Soft vote";
  $("reference").onchange=$("curveType").onchange=chart;$("retain").oninput=retained;chart();retained();
  $("threshold").oninput=()=>{simulator();live();};$("candidate").onchange=()=>{simulator();chart();};$("cost").onchange=simulator;
  $("filter").onchange=cases;$("sample").onchange=loadCase;$("live").onchange=live;$("figure").onchange=plate;$("batch").onchange=batch;
  simulator();cases();plate();$("content").hidden=false;$("loading").hidden=true;
}
if(typeof document!=="undefined")start().catch(e=>{$("loading").textContent="Study unavailable. Serve this folder over HTTP with its exported data. "+e.message;});
if(typeof module!=="undefined")module.exports={score};
