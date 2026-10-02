import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const out='research/v10_wire_fix_20261001',checks=[];
function load(file){const c=vm.createContext({performance,console});vm.runInContext(fs.readFileSync(file,'utf8'),c);return c.SlpPilot.Pilot;}
const Pilot=load('ext/pilot.js'),Old=load(out+'/before/pilot.js'),D=JSON.parse(fs.readFileSync('params.json')),values={...D.defaults,...D.presets.v10_layered.values},p=new Pilot(values,'safe');
const s={x:30000,y:30000,ang:4.727510130238209,sp:6.12,sc:1,L:1000,t:10,cmdNow:1.5908844429633298,boostNow:true,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]},ph=p.v4Physics(1),W={check:()=>1000};
for(let q=0;q<251;q++)assert.equal(Math.round(p.v10WireAngle(q*2*Math.PI/251)*251/(2*Math.PI)),q);checks.push('all_251_bucket_boundaries_idempotent');
const root={st:{x:s.x,y:s.y,h:s.ang,v:s.sp*31},t:0};
const roll=p.v9Roll(s,W,ph,root.st,0,.04,0,s.cmdNow,true);assert(roll.st.h>s.ang);assert(new Old(values,'safe').v9Roll(s,W,ph,root.st,0,.04,0,s.cmdNow,true).st.h<s.ang);checks.push('half_turn_candidate_simulates_packet_direction');
const angle=63*2*Math.PI/251,wire={...s,wireHistory:[{t:8,ang:angle,boost:true}],wireNow:{ang:angle,boost:true},wirePending:{ang:angle,boost:true},sendWaitMs:0,boostWaitMs:0,cmdHistory:[{t:8,ang:s.cmdNow,boost:true}]};
p.v10ComputeMs=3;let r=p.v10Root(wire,W,ph);assert(r.st.h>s.ang);assert.equal(r.t,.063);checks.push('root_prefers_sent_packet_over_input_history');
r=p.v10Root({...wire,sendWaitMs:24,boostWaitMs:41},W,ph);assert(Math.abs(r.t-.101)<1e-10);checks.push('root_includes_angle_and_boost_send_gates');
r=p.v10Root({...wire,inputAgeMs:10,sendWaitMs:24,boostWaitMs:0},W,ph);assert(Math.abs(r.t-.084)<1e-10);checks.push('observation_age_and_gate_wait_overlap_without_double_count');
const fixed=p.v10Root({...wire,wirePending:{ang:3,boost:false},sendWaitMs:25,boostWaitMs:40},W,ph);assert(fixed.st.h>s.ang);checks.push('pending_input_not_falsely_applied_before_gate');
p.v10ComputeMs=20;const queued=p.v10Root({...wire,wirePending:{ang:3,boost:false},sendWaitMs:5,boostWaitMs:15},W,ph);assert.equal(queued.pts.at(-1),0);checks.push('pending_angle_and_boost_have_separate_send_slots');
r=p.v10Root({...wire,sendWaitMs:20}, {check:()=>-1},ph);assert.equal(r.ok,false);checks.push('longer_prefix_cannot_be_certified_after_collision');
const src=fs.readFileSync('ext/mod.js','utf8'),block=src.slice(src.indexOf('const commandHistory = [];'),src.indexOf('function planAt(')),socket=src.slice(src.indexOf('function hookSocket()'),src.indexOf('function hookLoop()'));
const c=vm.createContext({Math,Number,ArrayBuffer,Uint8Array,performance:{now:()=>10000},S:{values:{V10_ON:1}},activeDecisionId:9,sent:{bucket:-1},game:{t0:9000,pk:[]},window:{slither:{ang:s.ang,md:true,wmd:true},timeObj:{now:()=>10000},last_e_mtm:9990,last_accel_mtm:9980,setAcceleration:()=>{},ws:{send:()=>42}}});
vm.runInContext(block+'\n'+socket+'\nglobalThis.api={applyCmd,hookSocket,wireSnapshot,recordWire};',c);
for(let q=0;q<251;q++){c.api.applyCmd(q*2*Math.PI/251,false,'test');const a=Math.atan2(c.window.ym,c.window.xm),norm=(a+2*Math.PI)%(2*Math.PI);assert.equal(Math.floor(norm*251/(2*Math.PI)),q);}checks.push('actuator_emits_all_simulated_buckets');
c.api.hookSocket();assert.equal(c.window.ws.send(new Uint8Array([63])),42);let snap=c.api.wireSnapshot();assert.equal(snap.wireHistory.at(-1).byte,63);assert.equal(snap.wireHistory.at(-1).t,10);assert.equal(snap.wireNow.ang,angle);assert.equal(snap.sendWaitMs,24);assert.equal(snap.boostWaitMs,31);checks.push('socket_records_successful_actual_byte_and_time');
c.window.ws.send(new Uint8Array([254]).buffer);assert.equal(c.api.wireSnapshot().wireNow.boost,false);c.window.ws.send(new Uint8Array([253]));assert.equal(c.api.wireSnapshot().wireNow.boost,true);checks.push('socket_records_both_boost_transitions');
const count=c.api.wireSnapshot().wireHistory.length;c.window.ws={send:()=>{throw Error('closed')}};c.api.hookSocket();assert.throws(()=>c.window.ws.send(new Uint8Array([3])));assert.equal(c.api.wireSnapshot().wireHistory.length,count);checks.push('failed_send_is_not_recorded');
c.game={t0:10000,pk:[]};assert.equal(c.api.wireSnapshot().wireHistory.length,0);checks.push('new_game_clears_previous_wire_history');
// Legacy inputs lack wire history: keep old root behavior. Legacy algorithms
// never pass through V10 quantization or changed prediction history.
const legacy={...s,cmdHistory:[{t:8,ang:s.cmdNow,boost:true}]};p.v10ComputeMs=3;const old=new Old(values,'safe');old.v10ComputeMs=3;assert.deepEqual(JSON.parse(JSON.stringify(p.v10Root(legacy,W,ph))),JSON.parse(JSON.stringify(old.v10Root(legacy,W,ph))));checks.push('old_record_root_fallback_preserved');
for(const name of ['v9Roll','v9Root','v8Step','v6Step']){if(name==='v9Roll')continue;if(Pilot.prototype[name])assert.equal(Pilot.prototype[name].toString(),Old.prototype[name].toString());}checks.push('legacy_root_and_step_bodies_preserved');
fs.writeFileSync(out+'/check.json',JSON.stringify({checks,halfTurn:{raw:s.cmdNow,packet:angle,beforeSign:-1,afterSign:1},limits:['251 decoder is client-encoding model; server source unavailable','send wait and future pending sends are estimates; TRACK_LAT remains user setting','legacy logs without wire history retain old approximate prefix']},null,2));console.log(checks);
