import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const baseDir=process.argv[2]||'ext',out=process.argv[3]||'after';
const pilotSrc=fs.readFileSync(baseDir+'/pilot.js','utf8'),modSrc=fs.readFileSync(baseDir+'/mod.js','utf8');
const ctx={performance:{now:()=>0}};vm.createContext(ctx);vm.runInContext(pilotSrc,ctx);
const V=JSON.parse(fs.readFileSync('params.json')).defaults;
const base={x:30000,y:30000,ang:0,sp:6,sc:1,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const checks={};function test(name,fn){try{fn();checks[name]={pass:true};}catch(e){checks[name]={pass:false,error:e.message};}}
// Collision during already queued controls must not move the effective time of a new command into the past.
test('queued_collision_keeps_arrival_time',()=>{const p=new ctx.SlpPilot.Pilot({...V,V10_ON:1,TRACK_LAT:.17},'safe');const root=p.v10Root(base,{check:()=>-1},p.v4Physics(1));assert(!root.ok);assert(root.t>=.17);assert(root.pts.length>=10);});
// Any fully clear rollout must outrank a colliding rollout, independent of horizon or scalar score.
test('safe_candidate_precedes_unsafe',()=>{const p=new ctx.SlpPilot.Pilot({...V,V10_ON:1,V10_LOCAL_H:1.5,V10_LOCAL_MS:1e6,V10_ESCAPE_BOOST:0},'safe');p.v10World=()=>({ro:14.5,walls:[],check:()=>1});p.v10Root=()=>({ok:true,t:.17,st:{x:30000,y:30000,h:0,v:186},pts:[0,30000,30000,0,0,.17,30030,30000,0,0]});p.v9FoodGoals=()=>[];p.v10Threat=()=>({strategy:'cruise',attack:0,coverage:0,tail:0,away:0,ms:0});p.v9Roll=(s,W,ph,st,a,h,t,target)=>({ok:Math.abs(target)>1,t:Math.abs(target)>1?1.67:1.4,st:{...st,x:30100},clear:Math.abs(target)>1?10:-1,pts:[1.4,30100,30000,0,0]});p.v10Step(base);assert(p.last.trace.n_safe>0);assert(!p.last.draw.localUnsafe);});
// Synthetic fresh emergency result: path collision time .04 s is not the command's freshness deadline.
const trackSource=modSrc.slice(modSrc.indexOf('function track() {'),modSrc.indexOf('function hookSocket()'));
function runTrack(plan,now=10){const c={game:{},S:{bot:true,values:{V10_ON:1,TRACK_LAT:.17}},plan,sent:{},performance:{now:()=>now},window:{playing:true,slither:{ang:0,dead:false}},calls:[]};c.applyCmd=(...x)=>c.calls.push(x);vm.createContext(c);vm.runInContext(trackSource,c);vm.runInContext('track()',c);return c;}
test('fresh_emergency_command_not_canceled',()=>{const c=runTrack({T0:0,tEnd:.04,n:2,pts:[0,0,0,0,0,.04,1,0,0,0],controls:[{start:.17,end:.30,target:1.2,boost:false}]},50);assert.equal(c.calls[0]?.[0],1.2);});
test('expired_command_retains_turn_and_cuts_boost',()=>{const c=runTrack({T0:0,tEnd:1,n:2,pts:[],controls:[{start:.17,end:.30,target:1.2,boost:true}]},200);assert.equal(c.calls[0]?.[0],1.2);assert.equal(c.calls[0]?.[1],false);assert.equal(c.plan,null);});
test('per_goal_timeout_is_not_no_route',()=>{const p=new ctx.SlpPilot.Pilot({...V,V10_ON:1,V10_CELL:8,V10_OBS:3000,V10_EDGE:2100,V10_BUDGET:100,V9_ROUTES:3},'safe');let clockCalls=0;ctx.performance.now=()=>++clockCalls>=4?25:0;p.v10World=()=>({obs:3000,walls:[],check:(a,b)=>Math.hypot(b.x-base.x,b.y-base.y)<=16?100:-1});p.v9FoodGoals=()=>[];p.v10Threat=()=>({heads:[],strategy:'cruise',attack:0,coverage:0,tail:0,away:0});const r=p.v10Geometry(base,1);assert.equal(r.routes.length,0);assert.equal(r.reason,'budget');ctx.performance.now=()=>0;});
fs.writeFileSync(`research/v10_continuation_20261001/contracts_${out}.json`,JSON.stringify(checks,null,2));console.log(checks);if(Object.values(checks).some(x=>!x.pass))process.exitCode=1;
