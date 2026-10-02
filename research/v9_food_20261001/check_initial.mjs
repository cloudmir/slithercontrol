import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const c=JSON.parse(fs.readFileSync('params.json')),V={...c.defaults,...c.presets.v9_maze.values};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const heap=(x,y)=>[x,y,16,x+12,y,16,x+24,y,16,x+36,y,16];
const out={};
function run(name,patch={},values={}) {const s={...base,...patch},p=new SlpPilot.Pilot({...V,...values},'safe');let r=p.v9Route(s,1);p.step({...s,route:r});const trace=p.last.trace;out[name]={mode:trace.mode,boost:trace.boost,goal:trace.v9_goal_x,routes:r.routes.map(q=>({kind:q.kind,boost:q.actions.some(a=>a.boost),ms:r.ms})),controls:p.last.controls};return {s,p,r,trace};}
const normal=run('smallOnly',{food:[30500,30000,6,30520,30000,9]});assert.equal(normal.trace.v9_goal_mass,0);assert(!normal.trace.boost);
const food=run('remains',{food:heap(30600,30000)});assert.equal(food.trace.mode,'v9food');assert(food.trace.boost);assert(food.r.routes.some(r=>r.kind==='food'));
const off=run('boostOff',{food:heap(30600,30000)},{V9_BOOST_ON:0});assert(!off.r.routes.some(r=>r.actions.some(a=>a.boost)));assert.equal(off.trace.mode,'v9food');
assert.equal(run('outOfRange',{food:heap(31000,30000)},{V9_FOOD_R:500}).trace.v9_goal_mass,0);
assert.equal(run('foodWeightZero',{food:heap(30600,30000)},{V9_FOOD_W:0}).trace.v9_goal_mass,0);
const far=run('farRemains',{food:heap(32300,30000)});assert(far.trace.v9_goal_mass>0);assert(far.r.routes.every(r=>r.kind==='escape'));
food.p.step({...food.s,t:10.05,food:[],route:food.r});assert(!food.p.last.trace.boost);assert.notEqual(food.p.last.trace.mode,'v9food');out.disappeared={mode:food.p.last.trace.mode,boost:food.p.last.trace.boost};
const near=run('nearNoBoost',{food:heap(30100,30000)});assert(!near.trace.boost);
const closed=[30300,29700,30750,29700,20,30750,29700,30750,30300,20,30750,30300,30300,30300,20,30300,30300,30300,29700,20];
const blocked=run('foodBehindClosedWall',{food:heap(30600,30000),segs:closed,sid:[1,2,3,4]});assert(!blocked.r.routes.some(r=>r.kind==='food'));
const center=run('center',{x:34000,y:30000,ang:Math.PI/2,cmdNow:Math.PI/2},{V9_CENTER_W:10});assert(center.p.last.draw.chosen.at(-2)<34000);
const p=new SlpPilot.Pilot(V,'safe');let st={...base,food:[30500,30000,16,30512,30000,16,30000,30500,16,30000,30512,16]};const first=p.v9FoodGoals(st)[0];const retained=p.v9FoodGoals({...st,t:10.2,food:[...st.food,30000,30524,1]})[0];assert.equal(first.x,retained.x);out.retention=true;
// The replayed boost bit must be identical to the displayed trajectory's controls.
for(const result of [food,off,near,blocked,center,far]) for(const route of result.r.routes) {
 const W=result.p.v9World(result.s),ph=result.p.v4Physics(result.s.sc);let root=result.p.v9Root(result.s,W,ph);
 for(const a of route.actions){const rr=result.p.v9Roll(result.s,W,ph,root.st,a.turn,a.end-root.t,root.t,a.target,!!a.boost);assert(rr.ok);root=rr;}
}
fs.writeFileSync('research/v9_food_20261001/check.json',JSON.stringify(out,null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,{mode:v.mode,boost:v.boost}]))));
