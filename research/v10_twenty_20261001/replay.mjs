import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';
vm.runInThisContext(fs.readFileSync(process.argv[4]||'ext/pilot.js','utf8'));
const rec=JSON.parse(fs.readFileSync(process.argv[2])),box=JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[3]))),frames=box.frames,end=frames.at(-1).t;
const p=new SlpPilot.Pilot(rec.values,rec.profile);p.step(frames[0]);p.v10ComputeMs=rec.decide_ms?.p50??3;
const trials=[];
for(const lead of [.8,2]){
 const s=frames.reduce((a,b)=>Math.abs(a.t-(end-lead))<Math.abs(b.t-(end-lead))?a:b),ph=p.v4Physics(s.sc),root=p.v10Root(s,p.v10World(s,true),ph);
 const future=frames.filter(f=>f.t>=s.t),worlds=future.map(f=>p.v10World(f,true));
 for(const offset of [0,-.5,.5,-1,1,-2,2,Math.PI])for(const boost of s.L>=(rec.values.V2_MINL??30)?[false,true]:[false]){
  const angle=p.v10WireAngle(root.st.h+offset);let st={...root.st},t=root.t,clear=root.clear,depth=0,idx=0;const path=[{t:s.t,x:s.x,y:s.y},...Array.from({length:root.pts.length/5},(_,i)=>({t:s.t+root.pts[i*5],x:root.pts[i*5+1],y:root.pts[i*5+2]}))];
  while(s.t+t<end-1e-8){const dt=Math.min(.04,end-s.t-t),next=p.v4Adv(st,angle,boost,dt,ph);while(idx+1<future.length&&future[idx+1].t<=s.t+t)idx++;
   const gap=worlds[idx].check(st,next,0,dt,.15,true,true);clear=Math.min(clear,gap);depth+=Math.max(0,-gap)*dt;st=next;t+=dt;path.push({t:s.t+t,x:st.x,y:st.y});
  }
  trials.push({lead,start:s.t,offset,angle,boost,clear,depth,rootSafe:root.ok,modelClear:root.ok&&clear>=0,path});
 }
}
trials.sort((a,b)=>Number(b.modelClear)-Number(a.modelClear)||a.depth-b.depth||b.clear-a.clear);
const best=trials[0];fs.writeFileSync(process.argv[5],JSON.stringify({best,candidates:trials.map(({path,...q})=>q),limits:['Recorded moving-enemy future, observed interval only; not an interactive counterfactual','No enemy response to different own trajectory; server physics and variable delay unconfirmed','Model clearance is not proven real survival']},null,2));
