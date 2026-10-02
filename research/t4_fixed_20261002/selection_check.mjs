import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const ctx=vm.createContext({performance});vm.runInContext(fs.readFileSync('ext/pilot.js','utf8'),ctx);const {Pilot}=ctx.SlpPilot;
const d=JSON.parse(fs.readFileSync('params.json')),values={...d.defaults,...d.presets.t4_close.values};
const state={x:30000,y:30000,ang:0,sp:5.8,sc:1,L:100,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],heads:[],hid:[],food:[],own:[]};
function body(id,y,len){const segs=[],sid=[];for(let x=30000-len/2;x<30000+len/2;x+=50){segs.push(x,y,Math.min(x+50,30000+len/2),y,20);sid.push(id);}return {segs,sid};}
function scene(t,bodies){return {...state,t,segs:bodies.flatMap(b=>b.segs),sid:bodies.flatMap(b=>b.sid)};}
const c=new Pilot(values),a=body(1,30100,1500),b=body(2,30200,4000),short=body(3,30050,900);
c.step(scene(10,[a,b,short]));assert.equal(c.last.trace.t4_target,1,'nearest eligible, ignore closer <1000');
c.step(scene(12.1,[a,b]));assert.equal(c.last.trace.t4_target,1,'longer persistence required');
c.step(scene(12.7,[a,b]));assert.equal(c.last.trace.t4_target,2,'upgrade to longer');assert.equal(c.last.trace.t4_selection,'longer_visible_target');
c.step(scene(13,[a,b]));assert.equal(c.last.trace.t4_target,2,'retain longer despite closer shorter');
const blocked=new Pilot(values);blocked.step(scene(10,[a]));const barrier=body(4,30065,900);blocked.step(scene(12.1,[a,b,barrier]));blocked.step(scene(12.7,[a,b,barrier]));assert.equal(blocked.last.trace.t4_target,1,'blocked transfer retained');
const result={nearest_eligible:true,short_body_excluded:true,longer_upgrade:true,persistence:true,retention:true,blocked_transfer_retained:true,threshold_px:1000,scope:'Synthetic target choice and 0.7-second motion guard; no live collision claim'};
fs.writeFileSync('research/t4_fixed_20261002/selection_check.json',JSON.stringify(result,null,2));console.log(result);
