import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const cfg=JSON.parse(fs.readFileSync('params.json')),V={...cfg.defaults,...cfg.presets.v9_maze.values};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],own:[]};
const out={};
for(const boostOn of [0,1]) {
 const values={...V,V9_BOOST_ON:boostOn},pilot=new SlpPilot.Pilot(values,'safe'),planner=new SlpPilot.Pilot(values,'safe'),ph=pilot.v4Physics(2);
 let food=[30600,30000,16,30620,30000,16,30640,30000,16,30660,30000,16],st={x:30000,y:30000,h:0,v:6.12*31},route=null,lastPlan=-Infinity,cmd=0,boost=false,sent=0,sentBoost=false;
 const history=[{t:0,ang:0,boost:false}],pending=[];let eaten=0,boostTicks=0,time=0,minGap=Infinity;
 const segs=[29800,29900,32000,29900,20,29800,30100,32000,30100,20];
 for(let k=0;k<450;k++) {
  const s={...base,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:10+k*.04,segs,sid:[1,2],food,cmdNow:sent,boostNow:sentBoost,cmdHistory:history.slice()};time=k*.04;
  if(s.t-lastPlan>=.3||!route){route=planner.v9Route(s,k);lastPlan=s.t;}
  const [ang,want]=pilot.step({...s,route});sent=ang;sentBoost=want;boostTicks+=want?1:0;
  pending.push({at:s.t+values.TRACK_LAT,cmd:ang,boost:want});history.push({t:s.t,ang,boost:want});
  let tt=s.t;const W=pilot.v9World(s);
  while(tt<s.t+.04-1e-8){while(pending.length&&pending[0].at<=tt+1e-8){const q=pending.shift();cmd=q.cmd;boost=q.boost;}
   const dt=Math.min(.01,s.t+.04-tt,pending.length?pending[0].at-tt:Infinity),next=pilot.v4Adv(st,cmd,boost,dt,ph),gap=W.check(st,next,0,0,0,false);minGap=Math.min(minGap,gap);assert(gap>=0,'contact');st=next;tt+=dt;
   const remaining=[];for(let j=0;j<food.length;j+=3){if(Math.hypot(st.x-food[j],st.y-food[j+1])<32)eaten++;else remaining.push(...food.slice(j,j+3));}food=remaining;
  }
  if(!food.length)break;
 }
 assert.equal(eaten,4);assert(boostOn?boostTicks>0:boostTicks===0);
 pilot.step({...base,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:10+time+.1,segs,sid:[1,2],food:[],route});assert(!pilot.last.trace.boost);
 out[boostOn?'on':'off']={eaten,boostTicks,time,minGap};console.log(out);
}
assert(out.on.time<out.off.time);fs.writeFileSync('research/v9_food_20261001/drive_food.json',JSON.stringify(out,null,2));
