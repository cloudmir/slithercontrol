import fs from 'node:fs';import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const dir='runs/v10_recovery_live_20261001_155641',fs0=JSON.parse(fs.readFileSync(dir+'/tail_states.json')),vals=JSON.parse(fs.readFileSync(dir+'/initial.json')).values;
const output=[];const wrap=a=>(a+Math.PI)%(2*Math.PI)+(a+Math.PI<0?2*Math.PI:0)-Math.PI;
for(const s of fs0.filter(s=>s.t>=103.9&&s.t<104.4)){
 const p=new SlpPilot.Pilot(vals,'aggressive'),W=p.v10World(s,true),ph=p.v4Physics(s.sc),root=p.v10Root(s,W,ph);
 const f=fs0.reduce((a,b)=>Math.abs(a.t-(s.t+.13))<Math.abs(b.t-(s.t+.13))?a:b);
 let st={...root.st},t=root.t;while(t<f.t-s.t-1e-8){const dt=Math.min(.01,f.t-s.t-t);st=p.v4Adv(st,s.cmd[0],s.cmd[1],dt,ph);t+=dt;}
 const actualGap=p.v10World(f,true).check({x:f.x,y:f.y},{x:f.x,y:f.y},0,0,-W.margin,false,true);
 output.push({t:s.t,next:f.t,cmd:s.cmd,predictedHeading:st.h,actualHeading:f.ang,headingErrorDeg:wrap(f.ang-st.h)*180/Math.PI,positionError:Math.hypot(st.x-f.x,st.y-f.y),rootSafe:root.ok,actualBodyGap:actualGap});
}
fs.writeFileSync(dir+'/prediction_actual.json',JSON.stringify(output,null,2));console.log(output);
