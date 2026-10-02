import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const out='research/t1_20261001';function load(p){const c=vm.createContext({performance});vm.runInContext(fs.readFileSync(p,'utf8'),c);return c.SlpPilot;}
const {Pilot}=load('ext/pilot.js'),old=load(out+'/before/pilot.js'),d=JSON.parse(fs.readFileSync('params.json')),V={...d.defaults,...d.presets.t1_thickness.values};
for(const k of ['probeStep','pilotStep','v10Step','v111Step','va1Step','v4Adv'])assert.equal(Pilot.prototype[k].toString(),old.Pilot.prototype[k].toString(),k);
const segs=[],sid=[];for(let x=27000;x<33000;x+=200){segs.push(x,30000,x+200,30000,20);sid.push(9);}
const base={x:30000,y:30046.5,ang:0,sp:5.8,sc:1,L:100,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs,sid,heads:[34000,30000,0,5.8,20/14.5],hid:[9],food:[],own:[]};
const p=new Pilot(V),events=[],ph=p.v4Physics(1);let st={x:base.x,y:base.y,h:0,v:5.8*31};
for(let i=0;i<200;i++){const s={...base,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:10+i*.04},cmd=p.step(s);assert(p.last.trace.t1_on===1);assert(!cmd[1]);if(p.last.trace.t1_level)events.push(p.last.trace.t1_level);st=p.v4Adv(st,cmd[0],cmd[1],.04,ph);}
assert(events.length>=3);assert.equal(events[0].set,12);assert.equal(events[1].set,11);assert(events.every(e=>e.duration>=.75&&Math.abs(e.gap-e.set)<1));assert(events.every(e=>e.samples>=15));
const q=new Pilot(V);q.step({...base,y:30150});assert.equal(q.last.trace.t1_level,null);
const c=new Pilot(V);c.step({...base,heads:[30090,30000,Math.PI,6,2],hid:[9]});assert.equal(c.last.trace.t1_phase,'excluded');assert.equal(c.last.trace.t1_level,null);
const sideData={...base,segs:[...base.segs,30000,29970,30300,29970,50,30300,29970,30700,29970,50,30700,29970,31000,29970,50],sid:[...base.sid,10,10,10],heads:[],hid:[]};const bin=new Pilot({...V,T1_BIN:4});bin.step({...sideData,y:30150});assert.equal(bin.last.trace.t1_target,10);
const control=new Pilot({...V,T1_ON:0}),before=new old.Pilot({...V,T1_ON:0});assert.equal(JSON.stringify(control.step(base)),JSON.stringify(before.step(base)));
// Seeking and interference must never invoke another driving algorithm.
const active=new Pilot(V);active.pilotStep=()=>{throw new Error('T1 delegated to pilotStep')};
active.step({...base,segs:[],sid:[],heads:[],hid:[],food:[29000,30000,100]});
active.step({...base,heads:[30090,30000,Math.PI,6,2],hid:[9]});assert.equal(active.last.trace.t1_phase,'excluded');
const approach=(direction,side)=>{const q=new Pilot(V);q.pilotStep=()=>{throw new Error('fallback')};let st={x:30000,y:30000+side*(34.5+150),h:direction,v:5.8*31};let min=Infinity,levels=0,ids=new Set();
 for(let i=0;i<450;i++){const s={...base,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:20+i*.033,food:[30000,31000,500]},c=q.step(s);assert(!c[1]);ids.add(q.last.trace.t1_target);min=Math.min(min,q.last.trace.t1_gap??Infinity);if(q.last.trace.t1_level)levels++;st=q.v4Adv(st,c[0],false,.033,ph);}
 assert(min<13&&levels>=2);assert.equal(ids.size,1);return {direction,side,min,levels};};
const acquisition=[approach(0,1),approach(Math.PI,1),approach(0,-1),approach(Math.PI,-1)];
const result={independentNoFallback:true,activeApproach:acquisition,originalFunctionsPreserved:6,stableLevels:events,acquisitionExcluded:true,headInterferenceExcluded:true,thicknessTargetEffective:true,defaultModeParity:true,scope:'synthetic follower geometry; no measured death threshold yet'};fs.writeFileSync(out+'/check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
