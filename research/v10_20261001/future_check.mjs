import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const D=JSON.parse(fs.readFileSync('params.json')),F=JSON.parse(fs.readFileSync('research/v10_20261001/fixtures.json')),future=JSON.parse(fs.readFileSync('research/v10_20261001/futures.json'));
function gap(p,f,ro){let g=f.wall[2]-Math.hypot(p.x-f.wall[0],p.y-f.wall[1])-ro;for(let i=0;i<f.segs.length;i+=5){const [x,y,b,c,r]=f.segs.slice(i,i+5),dx=b-x,dy=c-y,u=Math.max(0,Math.min(1,((p.x-x)*dx+(p.y-y)*dy)/Math.max(1e-9,dx*dx+dy*dy)));g=Math.min(g,Math.hypot(p.x-x-u*dx,p.y-y-u*dy)-ro-r);}for(let i=0;i<f.heads.length;i+=5)g=Math.min(g,Math.hypot(p.x-f.heads[i],p.y-f.heads[i+1])-ro-14.5*f.heads[i+4]);return g;}
const past=JSON.parse(fs.readFileSync('research/v10_20261001/past.json'));const rows=[];
for(const [index,f] of F.entries()){
 const s={...f.frame,cmdNow:f.frame.cmd?.[0],boostNow:f.frame.cmd?.[1]},frames=future[f.source+':'+f.before];
 for(const mode of ['v9','v10']){
  const V={...D.defaults,...D.presets[mode==='v9'?'v9_maze':'v10_layered'].values},p=new SlpPilot.Pilot(V,'safe');
  if(mode==='v10'){for(const prev of past[f.source+':'+f.before])p.v10Threat(prev);s.threat=p.v10Threat(s);}const route=mode==='v10'?p.v10Route(s,index):p.v9Route(s,index);p.step({...s,route});const P=p.last.plan||[],checks=[];
  for(const fr of frames){const t=fr.t-s.t;if(!P.length||t>P[P.length-5])continue;let i=0;while(i+5<P.length&&P[i+5]<t)i+=5;if(i+5>=P.length)continue;const u=(t-P[i])/(P[i+5]-P[i]);const pos={x:P[i+1]+u*(P[i+6]-P[i+1]),y:P[i+2]+u*(P[i+7]-P[i+2])};checks.push(gap(pos,fr,14.5*s.sc));}
  rows.push({source:f.source,before:f.before,mode,checks:checks.length,minGap:checks.length?Math.min(...checks):null,localClaimSafe:mode==='v10'?!p.last.draw.localUnsafe:!p.last.draw.localUnsafe,collision:checks.some(g=>g<0),prefixCollision:checks.slice(0,3).some(g=>g<0),complete:frames.length>=10});
 }
 if(index%30===0)console.log(index);
}
const summary={};for(const mode of ['v9','v10']){const r=rows.filter(r=>r.mode===mode&&r.complete&&r.localClaimSafe);summary[mode]={completeSafePredictions:r.length,recordedFutureCollision:r.filter(r=>r.collision).length,commandPrefixCollision:r.filter(r=>r.prefixCollision).length,holdoutPredictions:r.filter(r=>!r.source.includes('cycle4_')).length,holdoutCollision:r.filter(r=>!r.source.includes('cycle4_')&&r.collision).length};}
fs.writeFileSync('research/v10_20261001/future_check.json',JSON.stringify({summary,note:'Sampled recorded enemy future; counterfactual policy does not change enemies. Not live survival. Excludes truncated futures and already-unsafe predictions.',rows},null,2));console.log(summary);
