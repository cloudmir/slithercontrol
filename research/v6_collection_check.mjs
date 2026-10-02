import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const cfg=JSON.parse(fs.readFileSync('params.json','utf8'));
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,segs:[],sid:[],heads:[],hid:[],food:[],own:[],wall:[30000,30000,20000],cmdNow:0,boostNow:false};
const values={...cfg.defaults,V6_ON:1,V6_PLAN_BUDGET:1000};
function run(change={},obs={}) {
 const v={...values,...change},s={...base,...obs};
 for(const k of ['segs','sid','heads','hid','food','own'])s[k]=Float64Array.from(s[k]);
 const planner=new SlpPilot.Pilot(v,'safe'),local=new SlpPilot.Pilot(v,'safe');
 s.route=planner.v6Route(s,1);const [cmd,boost]=local.step(s);
 return {intent:s.route.intent,goal:s.route.goal,food:s.route.foodValue,cmd,boost,mode:local.last.trace.mode,safe:local.last.trace.n_safe,clear:local.last.trace.ttds,routeEnd:s.route.pts?.slice(-5),route_ms:s.route.ms};
}
const out={};
out.range={short:run({V6_FOOD_R:1000},{food:[32000,30000,16,32020,30000,16,32040,30000,16]}),long:run({V6_FOOD_R:3000},{food:[32000,30000,16,32020,30000,16,32040,30000,16]})};
assert.equal(out.range.short.intent,'explore');assert.equal(out.range.long.intent,'food');assert(out.range.long.goal.x>31900);assert(out.range.long.routeEnd[1]<31400);
const group={food:[30400,30000,16,30610,30260,16,30680,30260,16,30740,30260,16]};
out.group={small:run({V6_HEAP_SIZE:48},group),large:run({V6_HEAP_SIZE:250},group)};
assert(out.group.small.goal.y<30100);assert(out.group.large.goal.y>30200);assert.equal(out.group.large.food,48);
out.center={off:run({V6_CENTER_W:0},{x:35000}),on:run({V6_CENTER_W:2},{x:35000})};
assert(out.center.off.routeEnd[1]>35000);assert(out.center.on.routeEnd[1]<35000);assert(Math.abs(out.center.on.cmd)>.1);
const food={food:[30800,30100,16,30810,30100,16,30820,30100,16,30830,30100,16]};
out.boost={off:run({V6_BOOST_W:0},food),on:run({V6_BOOST_W:300},food),massGated:run({V6_BOOST_W:300,V6_BOOST_MIN_MASS:100},food),distanceGated:run({V6_BOOST_W:300,V6_BOOST_MIN_DIST:1000},food)};
assert.equal(out.boost.off.boost,false);assert.equal(out.boost.on.boost,true);assert.equal(out.boost.massGated.boost,false);assert.equal(out.boost.distanceGated.boost,false);
out.goalOff=run({V6_GOAL_W:0},food);assert.equal(out.goalOff.intent,'explore');
out.wall=run({V6_GOAL_W:5,V6_BOOST_W:300,V6_CENTER_W:5},{x:49800,wall:[30000,30000,20000],food:[49990,30000,100]});assert.equal(out.wall.intent,'escape');assert(Math.abs(out.wall.cmd)>.1);
out.small=run({}, {food:[30300,30000,5,30400,30000,11]});assert.equal(out.small.intent,'explore');
fs.writeFileSync('research/v6_collection_controls_20260930.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
