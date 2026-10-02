import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let clock=0;const c=vm.createContext({performance:{now:()=>clock++*.001}});vm.runInContext(fs.readFileSync('ext/pilot.js','utf8'),c);
const {Pilot,v8Choice}=c.SlpPilot,cfg=JSON.parse(fs.readFileSync('params.json')),V={...cfg.defaults,...cfg.presets.v8_exact.values};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const out={};
const wall={...base,segs:[30200,28000,30200,32000,20],sid:[8]};
const p=new Pilot(V,'safe');p.step(wall);out.wallNoHeads={phase:p.last.trace.v8_phase,mode:p.last.trace.mode};assert.equal(out.wallNoHeads.phase,'feed');
const d=new Pilot({...V,V81_BODY_ON:1,V81_BODY_PCT:1},'safe');d.step(wall);out.wallBodyEnabled={phase:d.last.trace.v8_phase,density:d.last.trace.v81_density};assert.equal(out.wallBodyEnabled.phase,'avoid');
const crowd={...base,heads:[28000,29950,Math.PI,5.8,1,28000,30000,Math.PI,5.8,1,28000,30050,Math.PI,5.8,1],hid:[1,2,3],food:[30408,30312,20,30410,30313,20]};
const choice=v8Choice({phase:'feed',clearSince:null},3,10,{...V,V8_HEAD_R:2500});const r=new Pilot(V,'safe').v8Route({...crowd,v8Control:choice},1);const local=new Pilot(V,'safe');local.step({...crowd,v8Control:choice,route:r});out.crowd={headRadius:2500,phase:choice.phase,intent:r.intent,reason:r.reason,routeUsed:local.last.trace.v3_route_match,mode:local.last.trace.mode};assert.equal(choice.phase,'avoid');assert.equal(r.intent,'food');assert.equal(out.crowd.routeUsed,1);
const planner=new Pilot(V,'safe'),route=planner.v8Route(wall,2);const ph=planner.v8Plan.v4Physics(wall.sc),P=route.pts;let maxRatio=0,maxAngle=0;
for(let i=10;i<P.length;i+=5){let a=(P[i+3]-P[i-2]+3*Math.PI)%(2*Math.PI)-Math.PI,dt=P[i]-P[i-5];maxRatio=Math.max(maxRatio,Math.abs(a)/(ph.w*dt));maxAngle=Math.max(maxAngle,Math.abs(a)*180/Math.PI)}
out.wallRoute={intent:route.intent,certified:route.certified,reason:route.reason,maxHeadingChangeDegrees:maxAngle,maxRequiredTurnRateRatio:maxRatio,points:P.length/5};assert.equal(route.certified,1);assert(maxRatio>1);
fs.writeFileSync('research/v8_maze_review_20261001/probe.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
