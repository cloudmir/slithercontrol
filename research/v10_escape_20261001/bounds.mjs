import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));const V=JSON.parse(fs.readFileSync('params.json')).defaults,p=new SlpPilot.Pilot(V,'safe');let checked=0,worst=0;
for(const sc of [1,2,4])for(const boost of [false,true])for(const target of [-Math.PI,-1,0,1,Math.PI]){
 const ph=p.v4Physics(sc),h={x:0,y:0,h:0,v:ph.vb,v0:ph.cs,rate:ph.rate,w:ph.w,r:10};let st={x:0,y:0,h:0,v:ph.cs};
 for(let k=1;k<=250;k++){st=p.v4Adv(st,k<120?target:-target,boost,.02,ph);if(k%5)continue;const lower=p.v10EarliestBlock(h,st,st),t=k*.02;assert(lower<=t+1e-6,`lower ${lower} exceeds actual arrival ${t}`);worst=Math.max(worst,lower-t);checked++;}
}
const back={id:1,x:0,y:0,h:Math.PI,v:434,v0:434,rate:450,w:2,r:25},points=[0,150,0,0,0,.15,180,0,0,0,.3,210,0,0,0,.45,240,0,0,0];const a=p.v10Closure(points,[back]),b=p.v10Closure(points,[{...back,h:0}]);assert(a.certified);assert(b.risk>a.risk);
const result={checked,worstLowerBoundExcess:worst,away:{risk:a.risk,slack:a.slack,certified:a.certified},towards:{risk:b.risk,slack:b.slack,certified:b.certified}};fs.writeFileSync('research/v10_escape_20261001/bounds.json',JSON.stringify(result,null,2));console.log(result);
