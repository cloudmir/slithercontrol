import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...JSON.parse(fs.readFileSync('runs/v10_maze_cycle5_20261001_140421/initial.json')).values};const ss=JSON.parse(fs.readFileSync('research/v10_maze_2h_20261001/cycle5_fail_states.json'));const out=[];
for(const s of ss){s.cmdNow=s.actualCommand?.ang??s.ang;s.boostNow=s.actualCommand?.boost??false;const p=new SlpPilot.Pilot(V,'safe'),W=p.v10World(s),PW=p.v10ProbeWorld(W),ph=p.v4Physics(s.sc),root=p.v10Root(s,W,ph),m=p.v10MazeGuides(s,W,root,2100,Infinity);let found=null,attempts=0;
outer:for(const duration of [.39,.65])for(const offset of [0,-.6,.6,-1.2,1.2,-2,2,Math.PI])for(const boost of [false,true]){const r=p.v9Roll(s,PW,ph,root.st,0,duration,root.t,root.st.h+offset,boost);if(!r.ok)continue;const seed={...r,pts:[...root.pts,...r.pts],clear:Math.min(root.clear,r.clear)};
for(const g of m.guides){attempts++;const f=p.v10Follow(s,PW,ph,seed,g);if(f.ok){found={offset,duration,boost,sector:g.sector,clear:f.clear};break outer;}}}
out.push({t:s.t,attempts,found});}
console.log(JSON.stringify(out,null,2));
