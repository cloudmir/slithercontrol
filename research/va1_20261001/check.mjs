import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {performance} from 'node:perf_hooks';
const out='research/va1_20261001',d=JSON.parse(fs.readFileSync('params.json'));
function load(path){const c=vm.createContext({performance});vm.runInContext(fs.readFileSync(path,'utf8'),c);return c.SlpPilot;}
const {Pilot}=load('ext/pilot.js'),old=load(out+'/before/pilot.js'),V={...d.defaults,...d.presets.va1.values};
const preserved=['pilotStep','v8Step','v6Step','v10Step','v111Step','v111Local','v10World','v9World','v10Route','v10Follow','v10FeedPrefix','v10MazeGuides','v4Adv','v10Root','v101Step'];
for(const k of preserved)assert.equal(Pilot.prototype[k].toString(),old.Pilot.prototype[k].toString(),k);
const base={x:30000,y:30000,ang:0,sp:6.12,sc:1,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const tests={},p=new Pilot(V);assert(p.va1Foods({...base,food:[30100,30000,5]}).length===1);tests.smallFoodRecognized=true;
function step(patch,values={}){const p=new Pilot({...V,...values}),s={...base,...patch},cmd=p.step(s);assert(cmd.every(x=>Number.isFinite(x)||typeof x==='boolean'));return {p,s,cmd};}
const side=step({food:[30100,30100,16]});assert(side.cmd[0]>.5&&!side.cmd[1]);tests.sideFoodTurn=side.cmd;
const front=step({food:[30300,30000,16]});assert(front.cmd[1]);assert(!step({},{VA1_BOOST_COST:1}).cmd[1]);assert(!step({food:[30300,30000,16]},{V10_ESCAPE_BOOST:0}).cmd[1]);tests.boostCostAndSwitchEffective=true;
assert(!step({food:[30060,30000,16]}).cmd[1]);tests.nearFoodSlows=true;
const simulation=new Pilot(V),ph=simulation.v4Physics(1);let st={x:base.x,y:base.y,h:0,v:base.sp*31},minDistance=Infinity;
for(let i=0;i<90;i++){const s={...base,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:10+i*.04,cmdNow:simulation.prev??0,boostNow:simulation.prevBoost,food:[30100,30100,16]};const [angle,boost]=simulation.step(s);st=simulation.v4Adv(st,angle,boost,.04,ph);minDistance=Math.min(minDistance,Math.hypot(st.x-30100,st.y-30100));if(minDistance<20.5)break;}
assert(minDistance<20.5,minDistance);tests.sideFoodModelTouchDistance=minDistance;
const centre=step({x:34000,ang:0,cmdNow:0});const end=centre.p.last.plan.slice(-5);assert(Math.hypot(end[1]-30000,end[2]-30000)<4000);tests.inwardFromOutwardHeading=true;
const dense={...base,heads:[30800,30000,0,6,1,30810,30000,0,6,1,30820,30000,0,6,1,30830,30000,0,6,1],hid:[1,2,3,4],segs:[30800,30000,31000,30000,15,30500,30200,30600,30200,15,30800,30200,30900,30200,15],sid:[1,5,5]};
const cp=new Pilot(V),c0=cp.va1Crowd(dense,30000,30000),c1=cp.va1Crowd(dense,30600,30000);assert(c1.value>c0.value);assert.equal(cp.va1CrowdPoints.length,5);assert(cp.va1Crowd({...dense,heads:[],hid:[],segs:[...dense.segs.slice(10),...dense.segs.slice(5,10)],sid:[5,5]},30000,30000).count<1);tests.crowdDeduplicatedAndModeratePreferred=true;
const hold=new Pilot(V),a={id:'held',closure:{risk:.3},foodValue:0},b={id:'new',closure:{risk:.1},foodValue:0};hold.va1Now=10;assert.equal(hold.va1Choose([a,b],'held').id,'held');a.closure.risk=.9;assert.equal(hold.va1Choose([a,b],'held').id,'new');a.closure.risk=.3;b.foodValue=1;assert.equal(hold.va1Choose([a,b],'held').id,'new');hold.va1Now=10.1;assert.equal(hold.va1Choose([a,b],'held').id,'held');tests.riskAndFoodHysteresis=true;
const corridor={...base,segs:[29800,29967,31200,29967,15,29800,30033,31200,30033,15],sid:[1,2],food:[30300,30000,16]};
const np=new Pilot(V),nr=np.va1Route(corridor,1);assert(nr.routes.length>0,JSON.stringify(nr.failures));assert(nr.routes[0].clear>0&&nr.routes[0].clear<3);assert(nr.routes[0].kind==='direct_escape');const chosen=np.step({...corridor,route:nr});assert.equal(np.last.trace.mode,'v10route');assert(chosen[1]);tests.narrowGap={visibleSurfaceGap:36,modelMargin:1.5,minimumClear:nr.routes[0].clear,routeKind:nr.routes[0].kind,boost:chosen[1]};
const blocked={...base,segs:[30040,29900,30040,30100,25],sid:[1],food:[30100,30000,16]};const recovery=step(blocked);assert.equal(recovery.p.last.trace.mode,'v10emergency');assert(recovery.p.last.draw.localUnsafe);assert(!recovery.p.last.trace.v10_closure_cert);tests.blockedFoodNeverCertifiedSafe=true;
const maze={...base,segs:[30350,29700,30350,30200,15,30350,30200,31100,30200,15],sid:[1,2],food:[30500,29900,16]};const mp=new Pilot(V),mr=mp.va1Route(maze,1);assert(mr.routes.length>0);assert(mr.routes.every(r=>r.clear>=0&&r.drivable));tests.bentMazeRoutes=mr.routes.length;
// Same controllers and frozen observations remain available outside VA1.
for(const name of ['v81_density','v101_hybrid']){const values={...d.defaults,...d.presets[name].values},q=new Pilot(values),o=new old.Pilot(values);for(let i=0;i<5;i++){const s={...base,food:[30300,30000,16],t:10+i*.1};assert.equal(JSON.stringify(q.step(s)),JSON.stringify(o.step(s)));}}
tests.originalModesParityFrames=10;
const framePath='research/v111_20261001/page_0_box.json.gz',replay=[];
if(fs.existsSync(framePath)){const frames=JSON.parse(zlib.gunzipSync(fs.readFileSync(framePath))).frames;for(const f of frames.slice(-20).filter((_,i)=>i%4===0)){const q=new Pilot(V),cmd=q.step(f);replay.push({t:f.t,cmd,mode:q.last.trace.mode,unsafe:q.last.draw.localUnsafe,ms:q.last.trace.v10_local_ms});assert(cmd.every(x=>Number.isFinite(x)||typeof x==='boolean'));assert(q.last.trace.va1_on===1);}}
const timings=[];const tp=new Pilot(V);for(let i=0;i<40;i++){tp.step({...corridor,t:10+i*.04});timings.push(tp.last.trace.v10_local_ms);}timings.sort((a,b)=>a-b);
const result={tests,originalFunctionsUnchanged:preserved.length,replay,localMs:{median:timings[20],p95:timings[38],max:timings[39]},scope:'local swept-physics scenarios and fixed-observation replay; no live growth/survival proof'};fs.writeFileSync(out+'/check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
