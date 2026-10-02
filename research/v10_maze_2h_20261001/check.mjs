import fs from 'node:fs';import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values,V10_BUDGET:90,V10_FOOD_RISK:100,V9_CENTER_W:10};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:1,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const states=[base,...JSON.parse(fs.readFileSync('research/v10_maze_2h_20261001/replay_states.json'))];
const results=[];for(const [i,s] of states.entries()){const p=new SlpPilot.Pilot(V,'safe'),r=p.v10Route(s,1);p.step({...s,route:r});results.push({i,t:s.t,reason:r.reason,ms:r.ms,routes:r.routes.length,geometry:r.geometry,failures:r.failures,local:p.last.trace.mode,localms:p.last.trace.v10_local_ms});}console.log(results);fs.writeFileSync('research/v10_maze_2h_20261001/check.json',JSON.stringify(results,null,2));
