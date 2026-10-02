import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const out='research/v10_emergency_recovery_20261001';
function load(path){const c=vm.createContext({performance,console});vm.runInContext(fs.readFileSync(path,'utf8'),c);return c.SlpPilot.Pilot;}
const Pilot=load('ext/pilot.js'),Old=load(out+'/before/pilot.js'),D=JSON.parse(fs.readFileSync('params.json'));
const values={...D.defaults,...D.presets.v10_layered.values};
const s={x:30000,y:30000,ang:0,sp:6.12,sc:1,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const p=new Pilot(values,'safe'),ph=p.v4Physics(1),root={st:{x:s.x,y:s.y,h:0,v:s.sp*31},t:.063,pts:[],ok:false};
// Every initial option overlaps; turning away must be evaluated beyond that point.
const W={check:(a,b)=>Math.min(-.1,-3+(30000-b.y)*.3)};
const straight=p.v10Recovery(s,W,ph,root,0,false,.9),turn=p.v10Recovery(s,W,ph,root,-1,false,.9);
assert(turn.pts.length>5);assert(turn.depthArea<straight.depthArea);assert(p.v10RecoveryCompare(turn,straight)<0);assert.equal(turn.ok,false);
const wall={...s,segs:[30000,29900,30000,30100,20],sid:[1]};const w=p.v10World(wall,true);assert(w.check(root.st,root.st,0,0,0,true,true)<0);
const swapped={...wall,segs:[30000,29900,30000,30100,20,30002,29900,30002,30100,30],sid:[1,2]};const w1=p.v10World(swapped,true),w2=p.v10World({...swapped,segs:swapped.segs.slice(5).concat(swapped.segs.slice(0,5))},true);assert.equal(w1.check(root.st,root.st,0,0,0,true,true),w2.check(root.st,root.st,0,0,0,true,true));
const old=new Old(values,'safe'),cur=new Pilot(values,'safe');const ca=cur.step(s),oa=old.step(s);assert.deepEqual(Array.from(ca),Array.from(oa));assert(!cur.last.trace.v10_recovery);
const page=JSON.parse(fs.readFileSync('research/latest_death_frames_20261001/page_0.json')),frames=JSON.parse(fs.readFileSync('research/latest_death_frames_20261001/tail.json'));
const replay=[];for(const f of frames.filter((q,i)=>q.t>=143.7&&(i%3===0||i===frames.length-1))){const a=new Old(page.values,'safe'),b=new Pilot(page.values,'safe');const before=a.step(f),oldMs=a.last.trace.v10_local_ms,after=b.step(f);replay.push({t:f.t,before:Array.from(before),after:Array.from(after),mode:b.last.trace.mode,recovery:b.last.trace.v10_recovery,depth:b.last.trace.v10_recovery_depth,terminal:b.last.trace.v10_recovery_terminal,oldMs,ms:b.last.trace.v10_local_ms});}
assert(replay.some(q=>q.recovery));assert(replay.some(q=>Math.abs(q.after[0]-q.before[0])>.2));assert(replay.filter(q=>q.recovery).every(q=>q.mode==='v10emergency'));
fs.writeFileSync(out+'/check.json',JSON.stringify({checks:['continuous_overlap_evaluation','turn_recovery_beats_straight','never_certified_safe','wall_order_independent_depth','safe_empty_command_unchanged','last_death_changes_direction'],synthetic:{straightDepth:straight.depthArea,turnDepth:turn.depthArea},replay,limits:['fixed observed world/model replay; actual survival unproven']},null,2));console.log(replay);
