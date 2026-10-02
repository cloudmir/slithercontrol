import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));const cfg=JSON.parse(fs.readFileSync('params.json')),V={...cfg.defaults,...cfg.presets.v9_maze.values};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const cases={corridor:[29000,29940,32000,29940,20,29000,30060,32000,30060,20],frontWall:[30200,29300,30200,30700,20],uTurn:[29800,29800,30400,29800,20,30400,29800,30400,30200,20,30400,30200,29800,30200,20]};
const out={};
for(const [name,segs] of Object.entries(cases)){
 const pilot=new SlpPilot.Pilot(V,'safe'),planner=new SlpPilot.Pilot(V,'safe'),ph=pilot.v4Physics(2);let s={...base,segs,sid:Array.from({length:segs.length/5},(_,i)=>i)},st={x:s.x,y:s.y,h:0,v:s.sp*31},route=null,lastPlan=-Infinity,cmd=0,sent=0,history=[{t:0,ang:0,boost:false}],pending=[],safe=true,used=0,elapsed=0;const path=[];
 const fixed=pilot.v9World(s);let minGap=Infinity;
 for(let k=0;k<500;k++){
  s={...s,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:10+k*.04,cmdNow:sent,cmdHistory:history.slice()};elapsed=k*.04;
  if(s.t-lastPlan>=.3||!route){route=planner.v9Route(s,k);lastPlan=s.t;}
  pilot.step({...s,route});used+=pilot.last.trace.v9_routes>0?1:0;
  const desired=pilot.last.controls?.[0]?.target??st.h;
  sent=desired;pending.push({at:s.t+V.TRACK_LAT,cmd:desired});history.push({t:s.t,ang:desired,boost:false});
  let tt=s.t;while(tt<s.t+.04-1e-8){while(pending.length&&pending[0].at<=tt+1e-8)cmd=pending.shift().cmd;
   const dt=Math.min(.01,s.t+.04-tt,pending.length?pending[0].at-tt:Infinity),next=pilot.v4Adv(st,cmd,false,dt,ph),g=fixed.check(st,next,0,0,0,false);minGap=Math.min(minGap,g);if(g<0){safe=false;break;}st=next;tt+=dt;}
  if(!safe)break;path.push(st.x,st.y);
  if(Math.hypot(st.x-base.x,st.y-base.y)>=900)break;
 }
 const distance=Math.hypot(st.x-base.x,st.y-base.y);out[name]={safe,escaped:distance>=900,distance,elapsed,minGap,routeTicks:used};console.log(name,out[name]);
 assert(safe&&distance>=900,`${name} closed-loop escape failed`);
}
fs.writeFileSync('research/v9_20261001/drive.json',JSON.stringify(out,null,2));
