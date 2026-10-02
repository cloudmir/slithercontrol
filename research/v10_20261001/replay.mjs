import fs from 'node:fs';import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values},old={...D.defaults,...D.presets.v9_maze.values};
const fixtures=JSON.parse(fs.readFileSync('research/v10_20261001/fixtures.json'));
const past=JSON.parse(fs.readFileSync('research/v10_20261001/past.json'));const rows=[];const p=new SlpPilot.Pilot(V,'safe'),map=new SlpPilot.Pilot(V,'safe'),threat=new SlpPilot.Pilot(V,'safe');
let lastSource='';
for(const [i,f] of fixtures.entries()){
 if(f.source!==lastSource){threat.v10History=null;lastSource=f.source;}
 const s={...f.frame,cmdNow:f.frame.cmd?.[0]??f.frame.ang,boostNow:!!f.frame.cmd?.[1]};for(const prev of past[f.source+':'+f.before])threat.v10Threat(prev);s.threat=threat.v10Threat(s);s.route=map.v10Route(s,i);p.step(s);
 const t=p.last.trace,op=new SlpPilot.Pilot(old,'safe');const oldRoute=op.v9Route(s,i);const st=performance.now();op.step({...s,route:oldRoute});
 rows.push({source:f.source,before:f.before,localMs:t.v10_local_ms,mapMs:s.route.ms,threatMs:s.threat.ms,routes:s.route.routes.length,rootSafe:t.v10_root_safe,safe:t.n_safe,boost:t.boost,clear:t.v10_clear,strategy:t.v10_strategy,oldRoutes:oldRoute.routes.length,oldMs:performance.now()-st,oldMapMs:oldRoute.ms,oldSafe:op.last.trace.n_safe});
 if(i%20===0)console.log(i);
}
const q=(a,p)=>a.sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))];
const result={frames:rows.length,v10:{mapFound:rows.filter(r=>r.routes).length,localSafe:rows.filter(r=>r.rootSafe&&r.safe).length,boost:rows.filter(r=>r.boost).length,localP50:q(rows.map(r=>r.localMs),.5),localP95:q(rows.map(r=>r.localMs),.95),localP99:q(rows.map(r=>r.localMs),.99),mapP95:q(rows.map(r=>r.mapMs),.95),threatP95:q(rows.map(r=>r.threatMs),.95)},v9:{drivableFound:rows.filter(r=>r.oldRoutes).length,localP95:q(rows.map(r=>r.oldMs),.95),mapP95:q(rows.map(r=>r.oldMapMs),.95)},note:'V10 static guide discovery is not comparable to V9 full dynamic rollout certification; fixed observation replay is not survival evidence'};
fs.writeFileSync('research/v10_20261001/replay.json',JSON.stringify({summary:result,rows},null,2));console.log(result);
