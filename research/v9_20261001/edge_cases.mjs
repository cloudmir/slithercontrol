import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));const cfg=JSON.parse(fs.readFileSync('params.json')),V={...cfg.defaults,...cfg.presets.v9_maze.values};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const out={};
for(const width of [100,120]){const s={...base,segs:[28000,30000-width/2,32000,30000-width/2,20,28000,30000+width/2,32000,30000+width/2,20],sid:[1,2]},p=new SlpPilot.Pilot(V,'safe'),r=p.v9Route(s,1);out['corridor'+width]={routes:r.routes.length,reason:r.reason,ms:r.ms};assert.equal(!!r.routes.length,width===120);}
const p=new SlpPilot.Pilot(V,'safe'),route=p.v9Route(base,1),local=new SlpPilot.Pilot(V,'safe');local.step({...base,route});assert(local.last.trace.v9_routes>0);
local.step({...base,route,t:base.t+V.V9_ROUTE_AGE+.01});assert.equal(local.last.trace.v9_routes,0);assert.equal(local.last.trace.cause,'old');out.staleRemoved=true;
// New closed box across every candidate, beyond the latency prefix.
const blocked={...base,route,segs:[29900,29900,30300,29900,20,30300,29900,30300,30100,20,30300,30100,29900,30100,20,29900,30100,29900,29900,20],sid:[1,2,3,4]};
local.step(blocked);assert.equal(local.last.trace.v9_routes,0);assert.equal(local.last.trace.cause,'changed');out.newWallsInvalidateAll=true;
// Swept collision catches a thin obstacle between the endpoints of an interval.
const W=p.v9World({...base,segs:[30004,29900,30004,30100,1],sid:[1]});assert(W.check({x:29950,y:30000},{x:30060,y:30000})<0);out.sweptCrossingRejected=true;
// Enemy future trail, even after its head has crossed the future crossing point.
const D=p.v9World({...base,heads:[30200,29700,Math.PI/2,6,1],hid:[1]});assert(D.check({x:30199,y:30000},{x:30201,y:30000},2,2.02)<0);out.futureTrailRejected=true;
// Full displayed replans start from the current head, with a changed heading.
local.step({...base,t:10.1,x:30015,ang:.1,route});for(const path of local.last.draw.v9Paths){assert.equal(path[0],30015);assert.equal(path[1],30000)}out.rebasedFromCurrentHead=true;
// Earlier controllers must keep their exact algorithm implementations.
const old=vm.createContext({});vm.runInContext(fs.readFileSync('research/v9_20261001/before/pilot.js','utf8'),old);
for(const name of ['pilotStep','v6Route','v6Step','v8Step','v8Values','v8Route','v4World','v4Adv'])assert.equal(SlpPilot.Pilot.prototype[name].toString(),old.SlpPilot.Pilot.prototype[name].toString());out.earlierAlgorithmsUnchanged=true;
fs.writeFileSync('research/v9_20261001/edge_cases.json',JSON.stringify(out,null,2));console.log(out);
