import fs from 'node:fs';import vm from 'node:vm';
const codeDir=process.argv[2]||'ext',label=process.argv[3]||'after';vm.runInThisContext(fs.readFileSync(codeDir+'/pilot.js','utf8'));
const mod=fs.readFileSync(codeDir+'/mod.js','utf8'),trackSrc=mod.slice(mod.indexOf('function track() {'),mod.indexOf('function hookSocket()'));const tracker={game:{},S:{bot:true,values:{}},window:{playing:true,slither:{}},sent:{},performance:{now:()=>tracker.now},plan:null,now:0};tracker.applyCmd=(angle,boost,why)=>{tracker.output={angle,boost,why};tracker.sent.ang=angle;};vm.createContext(tracker);vm.runInContext(trackSrc,tracker);const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const cases={};
for(const sc of [1,2,3.5])for(const offset of [0,2]){const ro=14.5*sc,width=2*(ro+20+7);cases[`gap_sc${sc}_off${offset}`]={sc,y:30000+offset,segs:[29000,30000-width/2,32000,30000-width/2,20,29000,30000+width/2,32000,30000+width/2,20],sid:[1,2]};}
cases.frontWall={segs:[30300,29300,30300,30700,20],sid:[1]};cases.u={segs:[29800,29800,30600,29800,20,30600,29800,30600,30200,20,30600,30200,29800,30200,20],sid:[1,1,1]};cases.attack={heads:[30400,30000,Math.PI,6,2],hid:[1]};cases.arena={x:49800,wall:[30000,30000,20000]};
const out={};
for(const [name,patch] of Object.entries(cases)){
 const p=new SlpPilot.Pilot(V,'safe'),planner=new SlpPilot.Pilot(V,'safe'),tp=new SlpPilot.Pilot(V,'safe');let s={...base,...patch},st={x:s.x,y:s.y,h:s.ang,v:s.sp*31},sent=s.ang,cmd=s.ang,boost=false,history=[{t:0,ang:cmd,boost:false}],pending=[],route=null,lastPlan=-Infinity,safe=true,minGap=Infinity,boostTicks=0,lastT=0;const start={...st};
 for(let k=0;k<375;k++){
  s={...s,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:10+k*.04,cmdNow:sent,boostNow:boost,cmdHistory:history.slice(-60)};lastT=k*.04;s.threat=tp.v10Threat(s);
  if(s.t-lastPlan>=.3||!route){route=planner.v10Route(s,k);lastPlan=s.t;}
  p.step({...s,route});const desired=p.last.controls[0];tracker.S.values=V;tracker.window.slither={ang:st.h,dead:false};tracker.now=s.t*1000+8;tracker.plan={T0:s.t*1000,pts:p.last.plan,n:p.last.plan.length/5,tEnd:p.last.plan.at(-5),controls:p.last.controls};vm.runInContext('track()',tracker);const action=tracker.output;sent=action.angle;pending.push({at:s.t+V.TRACK_LAT+.008,cmd:sent,boost:action.boost});history.push({t:s.t+.008,ang:sent,boost:action.boost});boostTicks+=action.boost?1:0;
  let t=s.t;while(t<s.t+.04-1e-8){while(pending.length&&pending[0].at<=t+1e-8){const a=pending.shift();cmd=a.cmd;boost=a.boost;}
   const dt=Math.min(.01,s.t+.04-t,pending.length?pending[0].at-t:Infinity),next=p.v4Adv(st,cmd,boost,dt,p.v4Physics(s.sc));
   const W=p.v10World({...s,x:st.x,y:st.y});let g=W.check(st,next,0,dt,0,false);
   if(name==='attack'){
    const elapsed=k*.04+t-s.t,ex=30400-434*elapsed;
    g=Math.min(g,Math.hypot(next.x-(ex-434*dt),next.y-30000)-29-14.5*s.sc);
    s.heads=[ex-434*dt,30000,Math.PI,14,2];
   }
   minGap=Math.min(minGap,g);if(g<0){safe=false;break;}st=next;t+=dt;
  }
  if(!safe||Math.hypot(st.x-start.x,st.y-start.y)>=1450)break;
 }
 out[name]={safe,escaped:Math.hypot(st.x-start.x,st.y-start.y)>=1450,distance:Math.hypot(st.x-start.x,st.y-start.y),elapsed:lastT,minGap,boostTicks};console.log(name,out[name]);
}
fs.writeFileSync(`research/v10_contract_audit_20261001/drive_${label}.json`,JSON.stringify(out,null,2));
if(Object.values(out).some(r=>!r.safe||!r.escaped))process.exitCode=1;
