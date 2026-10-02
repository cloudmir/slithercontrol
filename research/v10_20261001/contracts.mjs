import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync('ext/pilot.js','utf8'),old=fs.readFileSync('research/v10_20261001/before/pilot.js','utf8');vm.runInThisContext(src);
const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values},p=new SlpPilot.Pilot(V,'safe');
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
// Preserve all original method implementations, including V9.
const methods=s=>{const matches=[...s.matchAll(/^  (\w+)\([^\n]*\) \{/gm)];return Object.fromEntries(matches.map((m,i)=>[m[1],s.slice(m.index,matches[i+1]?.index??s.length).trim()]));};
const a=methods(old),b=methods(src);const names=['v9World','v9Roll','v9Root','v9FoodGoals','v9Route','v9Step','v8Route','v8Step','v6Route','v6Step'];
for(const n of names){if(n==='v9Step'){assert(b[n].startsWith(a[n]));}else assert.equal(a[n],b[n],n+' changed');}
let s={...base,food:[30500,30000,8]};p.step(s);assert.equal(p.last.draw.goal,null);
const off=new SlpPilot.Pilot({...V,V9_BOOST_ON:0,V10_ESCAPE_BOOST:0},'safe');s={...base,heads:[30400,30000,Math.PI,6,2],hid:[1]};off.step(s);assert(!off.last.trace.boost);
const route=p.v10Route(base,1);p.step({...base,t:12,route});assert.equal(p.last.trace.v10_routes,0);
const thick=new SlpPilot.Pilot({...V,THICK_OFF_THIN:20,THICK_OFF_MID:20,THICK_OFF_THICK:20,BOUND_GAP:-20},'safe');assert.equal(thick.v10World({...base,segs:[30500,30000,30500,30600,20],sid:[1]}).walls[0][4],20);
const W=p.v10World(base,true),root=p.v10Root({...base,inputAgeMs:30,cmdHistory:[{t:9,ang:0,boost:false},{t:9.95,ang:1,boost:false}]},W,p.v4Physics(2));assert(root.t>=.2);assert(root.st.h>0);
// Grid-independent exact edge checks: a valid grid edge cannot cross a thin wall.
const narrow={...base,segs:[30300,29999,30300,30001,1],sid:[1]};const world=p.v10World(narrow);assert(world.check({x:30200,y:30000},{x:30400,y:30000},0,0,0,false)<0);
assert.equal(p.v10World({...base,viewRadius:2500}).obs,2500);
const viewportRoute=p.v10Route({...base,viewRadius:2500},2);assert(viewportRoute.routes.some(r=>Math.hypot(r.goal[0]-base.x,r.goal[1]-base.y)>=2100));
const result={fullViewportMapped:true,preserved:names,foodFilter:true,boostOff:true,staleRouteRejected:true,oldThicknessSettingsIgnored:true,queuedCommandsReplayed:true,continuousThinWall:true};fs.writeFileSync('research/v10_20261001/contracts.json',JSON.stringify(result,null,2));console.log(result);
