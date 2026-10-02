import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const cases={open:{},corridor:{segs:[29900,29925,31800,29925,20,29900,30075,31800,30075,20],sid:[1,2]},frontWall:{segs:[30300,29700,30300,30300,20],sid:[1]},u:{segs:[29800,29800,30600,29800,20,30600,29800,30600,30200,20,30600,30200,29800,30200,20],sid:[1,1,1]},attack:{heads:[30400,30000,Math.PI,6,2],hid:[1]},food:{food:[30500,30000,16,30520,30000,16,30540,30000,16]},closed:{segs:[29800,29800,30200,29800,20,30200,29800,30200,30200,20,30200,30200,29800,30200,20,29800,30200,29800,29800,20],sid:[1,1,1,1]}};
const out={};
for(const [name,patch] of Object.entries(cases)){
 const p=new SlpPilot.Pilot(V,'safe'),s={...base,...patch};s.threat=p.v10Threat(s);s.route=p.v10Route(s,1);p.step(s);
 const W=p.v10World(s);for(const r of s.route.routes)for(let i=1;i<r.path.length;i++)assert(W.check(r.path[i-1],r.path[i],0,0,.1,false)>=0,name+' cuts body');
 out[name]={routes:s.route.routes.length,map_ms:s.route.ms,trace:p.last.trace,cmd:p.prev};
 if(name==='open'||name==='corridor'||name==='frontWall')assert(s.route.routes.length>0,name);
 if(name==='closed')assert.equal(s.route.routes.length,0);
 if(name==='food')assert(s.route.routes.some(r=>r.kind==='food'));
 assert(Number.isFinite(p.prev));
}
fs.writeFileSync('research/v10_20261001/test.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
