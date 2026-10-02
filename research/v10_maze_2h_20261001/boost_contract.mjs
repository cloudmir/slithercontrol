import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync(process.argv[2],'utf8'));const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values,V10_BUDGET:500,V10_FOOD_RISK:100,V10_FOOD_W:2,V9_CENTER_W:0};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:1,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const cases=[{name:'crowded_straight_exit',s:{...base,threat:{strategy:'corridor',coverage:.6,attack:0,width:200,closing:0,heads:[]},segs:[29900,29900,32000,29900,20,29900,30100,32000,30100,20]}},{name:'straight_food',s:{...base,food:[30800,30000,40,30820,30000,40,30840,30000,40]}},{name:'empty_no_boost',s:base}];let out=[];
for(const c of cases){const p=new SlpPilot.Pilot(V,'safe'),r=p.v10Route(c.s,1);out.push({name:c.name,routes:r.routes.length,boost:r.routes[0]?.useBoost,boostActions:r.routes[0]?.actions.filter(x=>x.boost).length,food:!!r.routes[0]?.foodTarget,duration:r.routes[0]?.duration});}
console.log(JSON.stringify(out));assert(out[0].boostActions>0);assert(out[1].boostActions>0);assert(!out[2].boostActions);
