import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync(process.argv[2],'utf8'));const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values,V10_BUDGET:90,V10_FOOD_RISK:100};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:1,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const selected={id:'kept',t0:10,path:[{x:30035,y:30000},{x:32000,y:30000}],goal:[32000,30000],length:1965,sector:4,lookScale:.65,useBoost:false,score:0};
const p=new SlpPilot.Pilot(V,'safe');for(let i=0;i<3;i++)p.v10Route(base,i);
let ring=[];for(let i=0;i<24;i++){let a=i*Math.PI/12,b=(i+1)*Math.PI/12;ring.push(32000+130*Math.cos(a),30000+130*Math.sin(a),32000+130*Math.cos(b),30000+130*Math.sin(b),15)}
const results=[];for(let i=0;i<8;i++){
 const repair=p.v10Route({...base,t:10.2,segs:[30500,29880,30500,30120,20],selectedGuide:selected},100+i);
 const sealed=p.v10Route({...base,t:10.2,segs:ring,selectedGuide:selected},200+i);
 results.push({repair:repair.routes.some(q=>q.id==='kept'),repairMs:repair.ms,repairReason:repair.reason,repairExpanded:repair.expanded,repairGeometry:repair.geometry,repairFailures:repair.failures,sealedAlternative:sealed.routes.length>0,sealedNotInvented:sealed.routes.every(q=>q.id!=='kept'),sealedMs:sealed.ms,sealedReason:sealed.reason,sealedExpanded:sealed.expanded});
}
console.log(JSON.stringify(results));assert(results.every(q=>q.sealedNotInvented));
