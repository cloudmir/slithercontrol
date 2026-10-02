import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';vm.runInThisContext(fs.readFileSync('research/v10_escape_20261001/pilot.js','utf8'));
const d='runs/v10_death_capture_20261001_114834',read=n=>JSON.parse(n.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(d+'/'+n)):fs.readFileSync(d+'/'+n));const rec=read('slp_01.json'),box=read('slp_01_box.json.gz');
const frames=box.frames,initial=frames.reduce((a,b)=>Math.abs(b.t-27)<Math.abs(a.t-27)?b:a);const V={...rec.values,V10_LOCAL_MS:20,V10_BUDGET:90};
const p=new SlpPilot.Pilot(V,'safe'),planner=new SlpPilot.Pilot(V,'safe'),tp=new SlpPilot.Pilot(V,'safe'),ph=p.v4Physics(initial.sc);
let st={x:initial.x,y:initial.y,h:initial.ang,v:initial.sp*31},s={...initial},history=initial.cmdHistory.map(x=>({...x})),route=null,active={ang:history.at(-1).ang,boost:history.at(-1).boost},trace=[];
// Freeze measured walls/heads; update our own pose and delayed commands. This
// validates controller integration, not counterfactual survival against players.
for(let k=0;k<100;k++){
 const dt=.04,t=initial.t+k*dt;s={...initial,t,x:st.x,y:st.y,ang:st.h,sp:st.v/31,cmdNow:history.at(-1).ang,boostNow:active.boost,cmdHistory:history.filter(x=>x.t>=t-2),inputAgeMs:0};s.threat=tp.v10Threat(s);
 if(k%8===0)route=planner.v10Route(s,k);
 p.step({...s,route});const action=p.last.controls[0];history.push({t,ang:action.target,boost:action.boost});
 for(const h of history)if(h.t<=t-.17)active=h;
 const W=p.v10World(s),next=p.v4Adv(st,active.ang,active.boost,dt,ph);const gap=W.check(st,next,0,dt,1,false);
 trace.push({t,mode:p.last.trace.mode,routes:route.routes.length,localMs:p.last.trace.v10_local_ms,mapMs:route.ms,gap,x:st.x,y:st.y});if(gap<0)break;st=next;
}
const summary={frames:trace.length,routeFrames:trace.filter(x=>x.mode==='v10route').length,minGap:Math.min(...trace.map(x=>x.gap)),maxLocal:Math.max(...trace.map(x=>x.localMs)),trace};fs.writeFileSync('research/v10_escape_20261001/closed_loop.json',JSON.stringify(summary,null,2));console.log({...summary,trace:undefined});
