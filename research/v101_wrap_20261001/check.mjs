import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const out='research/v101_wrap_20261001',ctx=vm.createContext({performance:{now:()=>0}}),old=vm.createContext({performance:{now:()=>0}});
vm.runInContext(fs.readFileSync('ext/pilot.js','utf8'),ctx);vm.runInContext(fs.readFileSync(out+'/before/pilot.js','utf8'),old);
const {Pilot,v101Wrap,v101Choice,v8Choice}=ctx.SlpPilot,d=JSON.parse(fs.readFileSync('params.json')),V={...d.defaults,...d.presets.v101_hybrid.values,V81_BODY_ON:0},base={x:30000,y:30000,ang:0,sp:6.12,sc:1,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[30200,30000,30],own:[]};
for(const key of ['pilotStep','v8Step','v10Step','v10Route','v10World','v9Roll','v4Adv','v111Step'])assert.equal(Pilot.prototype[key].toString(),old.SlpPilot.Pilot.prototype[key].toString(),key+' unchanged');assert.equal(v8Choice.toString(),old.SlpPilot.v8Choice.toString());
function arc(bins,{id=7,r=350,thick=14.5}={}){const segs=[],sid=[];for(const b of bins){const a=(b+.5)/24*2*Math.PI-Math.PI,x=base.x+r*Math.cos(a),y=base.y+r*Math.sin(a);segs.push(x,y,x+.01,y+.01,thick);sid.push(id);}return {...base,segs,sid};}
const bins=Array.from({length:15},(_,i)=>i),s=arc(bins),p=new Pilot({...V,V101_WRAP_ON:0},'safe');p.pilotStep(s);
const e=v101Wrap({},s,V);assert(e&&e.coverage===15/24);assert.equal(e.coverage,p.last.draw.analysis.ring.wrapCov);assert.equal(e.angle,p.last.draw.analysis.ring.wrapEsc);
const k={phase:'feed',clearSince:null},fallback=()=>v8Choice(k,0,s.t,V,0);
const c=v101Choice(k,s,V,fallback);assert.equal(c.phase,'avoid');assert.equal(c.reason,'wrap');assert.equal(c.switched,1);
assert.equal(v101Choice(k,{...base,t:11},V,()=>v8Choice(k,0,11,V)).phase,'avoid');assert.equal(v101Choice(k,{...base,t:12.1},V,()=>v8Choice(k,0,12.1,V)).phase,'feed');
const wf=v101Wrap({},arc([0,1,2,3,4,5],{thick:30}),{...V,WF_ON:1,WF_COV:.2,WF_RATIO:1.5});assert(wf?.early);
const rising={};assert.equal(v101Wrap(rising,arc([0,1,2,3,4,5]),V),null);assert(v101Wrap(rising,{...arc(Array.from({length:10},(_,i)=>i)),t:10.5},V));
const tail=arc(Array.from({length:9},(_,i)=>i));tail.heads=[base.x+250,base.y,Math.PI/2,14,1];tail.hid=[7];assert(v101Wrap({},tail,V)?.raid);
const lock={};v101Wrap(lock,s,V);const swapped={...arc(Array.from({length:15},(_,i)=>i+9),{id:8}),t:10.1},fresh=v101Wrap({},swapped,V);assert.equal(v101Wrap(lock,swapped,V).angle,fresh.angle);
const on=new Pilot(V,'safe'),before=new old.SlpPilot.Pilot({...V,V101_WRAP_ON:0},'safe');
for(let i=0;i<12;i++){const state={...base,t:20+i*.1,food:i%2?[30180,30100,30]:[]};assert.equal(JSON.stringify(on.step(state)),JSON.stringify(before.step(state)),'food parity');}
const off=new Pilot({...V,V101_WRAP_ON:0},'safe'),oldOff=new old.SlpPilot.Pilot({...V,V101_WRAP_ON:0},'safe');for(let i=0;i<4;i++){const state={...s,t:30+i*.1};assert.equal(JSON.stringify(off.step(state)),JSON.stringify(oldOff.step(state)),'off parity');}
const active=new Pilot(V,'safe');const result=active.step({...s,ang:e.angle,cmdNow:e.angle});assert.equal(active.last.trace.v101_wrap_active,1);assert(active.last.trace.mode.startsWith('v10'));assert.equal(active.last.draw.localUnsafe,false);assert(Math.cos(result[0]-e.angle)>.99);assert.equal(active.last.trace.v10_food_value,0);
const gap=active.last.trace.v10_clear;assert(gap>=0);
// Every route/short option still passes the actual V10 roll check. A fully
// blocked delayed prefix remains unsafe, irrespective of the preferred exit.
const blocked=new Pilot(V,'safe'),bad={...arc(Array.from({length:24},(_,i)=>i),{r:30,thick:50}),ang:0,cmdNow:0};blocked.step(bad);assert(blocked.last.draw.localUnsafe);assert.equal(blocked.last.trace.v10_root_safe,false);
const r={originalFunctionsUnchanged:8,detectorMatchesOriginal:true,rising:true,raid:true,earlyThickWrap:true,newEnemyResetsExit:true,feedParityFrames:12,offParityFrames:4,wrapTriggersWithoutCrowd:true,returnDelay:true,safeExitAngle:result[0],safeExitGap:gap,foodIgnoredDuringEscape:true,blockedPrefixRemainsUnsafe:true,liveSurvivalTest:false};fs.writeFileSync(out+'/check.json',JSON.stringify(r,null,2));console.log(r);
