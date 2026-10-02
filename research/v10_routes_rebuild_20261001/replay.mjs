import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';
const dir='runs/v10_death_capture_20261001_114834',read=n=>JSON.parse(n.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(dir+'/'+n)):fs.readFileSync(dir+'/'+n));
let code=fs.readFileSync('research/v10_routes_rebuild_20261001/pilot_candidate.js','utf8');code=code.replace('if(!found)continue;','globalThis.geoAudit?.push({goal:goal.kind,angle:Math.atan2(goal.y-s.y,goal.x-s.x),found:!!found,expanded,elapsed:performance.now()-begin,budget,cell});if(!found)continue;');vm.runInThisContext(code);
const rec=read('slp_01.json'),box=read('slp_01_box.json.gz'),log=read('slp_01_log.json.gz');const end=box.frames.at(-1).t;
const out={note:'Offline replay of fixed observations. Original threat worker state and timing not fully recorded; recomputed. Does not prove survival.',samples:[]};
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
for(const offset of [5,3,2,1,.5,0]){
 const f=box.frames.reduce((a,b)=>Math.abs(b.t-(end-offset))<Math.abs(a.t-(end-offset))?b:a);const s={...f,cmdNow:f.cmdHistory.at(-1)?.ang??f.ang,boostNow:f.cmdHistory.at(-1)?.boost??f.boost,inputAgeMs:5};
 const tp=new SlpPilot.Pilot(rec.values,'safe');for(const prior of box.frames.filter(x=>x.t>=f.t-.6&&x.t<=f.t))s.threat=tp.v10Threat(prior);
 const sample={offset,t:s.t,x:s.x,y:s.y,heading:s.ang,actual:f.actualCommand,recordedRoute:f.route, variants:[]};
 for(const [budget,edge] of [[90,2100],[500,2100]]){
  const p=new SlpPilot.Pilot({...rec.values,V10_BUDGET:budget,V10_EDGE:edge},'safe');const follows=[];const follow=p.v10Follow.bind(p);p.v10Follow=(...args)=>{const z=follow(...args);follows.push({ok:z.ok,reason:z.reason,duration:z.duration,clear:z.clear});return z};globalThis.geoAudit=[];const r=p.v10Route(s,1);const W=p.v10World(s),ph=p.v4Physics(s.sc),root=p.v10Root(s,W,ph);let safe=[];
  for(let i=0;i<36;i++){const angle=i*Math.PI/18;const q=p.v9Roll(s,W,ph,root.st,0,1.2,root.t,angle,false);if(root.ok&&q.ok)safe.push(Math.round(angle*180/Math.PI));}
  const chosen=p.v9Roll(s,W,ph,root.st,0,1.2,root.t,f.cmd[0],!!f.cmd[1]);
  sample.variants.push({budget,edge,follows,recordedCommand12s:{ok:root.ok&&chosen.ok,hitOrEnd:chosen.t,clear:chosen.clear},reason:r.reason,ms:r.ms,routes:r.routes.map(q=>({goal:q.goal,duration:q.duration,clear:q.clear})),rootSafe:root.ok,rootClear:root.clear,safe12sAngles:safe,geometry:globalThis.geoAudit});
 }
 let near=[];for(let i=0;i<s.segs.length;i+=5){const [x,y,bx,by,r]=s.segs.slice(i,i+5),dx=bx-x,dy=by-y,u=Math.max(0,Math.min(1,((s.x-x)*dx+(s.y-y)*dy)/Math.max(1e-9,dx*dx+dy*dy)));near.push({id:s.sid[i/5],gap:Math.hypot(s.x-x-u*dx,s.y-y-u*dy)-r-14.5*s.sc,tangent:Math.atan2(dy,dx),relative:wrap(s.ang-Math.atan2(dy,dx))*180/Math.PI});}near.sort((a,b)=>a.gap-b.gap);sample.nearest=near[0];out.samples.push(sample);
}
fs.writeFileSync('research/v10_routes_rebuild_20261001/candidate_replay.json',JSON.stringify(out,null,2));console.log(out.samples.map(s=>({offset:s.offset,t:s.t,near:s.nearest,variants:s.variants.map(v=>({budget:v.budget,reason:v.reason,ms:v.ms,routes:v.routes.length,root:v.rootSafe,safe12:v.safe12sAngles.length,goals:v.geometry.length,found:v.geometry.filter(g=>g.found).length}))})));
