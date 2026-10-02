import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...JSON.parse(fs.readFileSync('runs/v10_maze_cycle2_20261001_134218/initial.json')).values};
const states=JSON.parse(fs.readFileSync(process.argv[2]));const out=[];
for(const s of states){s.cmdNow=s.actualCommand?.ang??s.cmd?.[0]??s.ang;s.boostNow=s.actualCommand?.boost??s.boost;const p=new SlpPilot.Pilot(V,'safe'),W=p.v10World(s),PW=p.v10ProbeWorld(W),ph=p.v4Physics(s.sc),root=p.v10Root(s,W,ph),edge=Math.min(Math.max(V.V10_EDGE,(s.viewRadius||0)*.85),W.obs-150),m=p.v10MazeGuides(s,W,root,edge,Infinity);const rs=[];
for(const g of m.guides){const tests=[];for(const scale of [.4,.65,1,1.5]){let r=p.v10Follow(s,PW,ph,root,{...g,lookScale:scale});tests.push({scale,ok:r.ok,why:r.reason,at:r.pts?.at(-5),clear:r.clear});}rs.push({sector:g.sector,length:g.length,tests});}
out.push({t:s.t,root:root.ok,rootclear:root.clear,geometry:m.reason,rs});}
console.log(JSON.stringify(out,null,2));
