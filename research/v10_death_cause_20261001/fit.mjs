import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));const d=JSON.parse(fs.readFileSync('research/v10_death_cause_20261001/input.json')),p=new SlpPilot.Pilot(d.values,'safe'),frames=d.frames;
const pk=[];for(let i=0;i<d.packets.length;i+=2)if(d.packets[i+1]<=250)pk.push({t:d.packets[i]/1000,ang:d.packets[i+1]*2*Math.PI/251});
const cmds=frames.flatMap(f=>f.actualCommand?[{t:f.actualCommand.at,ang:f.actualCommand.ang}]:[]);
p.step(frames[0]);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function error(stream,lag,scale,subset){const errors=[];
 for(const f of subset){const end=frames.find(q=>q.t>=f.t+.13);if(!end||end.t-f.t>.20)continue;
 let st={x:f.x,y:f.y,h:f.ang,v:f.sp*31},t=f.t,ph=p.v4Physics(f.sc);ph.w*=scale;
 while(t<end.t-1e-8){let angle=f.ang;for(const q of stream){if(q.t>t-lag)break;angle=q.ang;}const dt=Math.min(.005,end.t-t);st=p.v4Adv(st,angle,true,dt,ph);t+=dt;}
 errors.push({t:f.t,end:end.t,deg:Math.abs(wrap(st.h-end.ang))*180/Math.PI,px:Math.hypot(st.x-end.x,st.y-end.y),pred:st.h,actual:end.ang});
 }return {mean:errors.reduce((s,q)=>s+q.deg,0)/errors.length,px:errors.reduce((s,q)=>s+q.px,0)/errors.length,errors};}
const train=frames.filter(f=>f.t>=101.8&&f.t<103.5),test=frames.filter(f=>f.t>=103.5&&f.t<104.3),results={};
for(const [name,stream]of [['packets',pk],['applied',cmds],['applied_quantized',cmds.map(q=>({...q,ang:Math.floor(((q.ang%(2*Math.PI)+2*Math.PI)%(2*Math.PI))*251/(2*Math.PI))*2*Math.PI/251}))]]){const fits=[];for(let lag=0;lag<=.25001;lag+=.01)for(let scale=.8;scale<=1.5001;scale+=.05){const r=error(stream,lag,scale,train);fits.push({lag:+lag.toFixed(2),scale:+scale.toFixed(2),mean:r.mean,px:r.px});}fits.sort((a,b)=>a.mean-b.mean);
 const fit=fits[0];results[name]={trainFrames:train.length,testFrames:test.length,best:fit,baselineTrain:error(stream,.06,1,train),baselineTest:error(stream,.06,1,test),fitTest:error(stream,fit.lag,fit.scale,test),top:fits.slice(0,5)};
}
fs.writeFileSync('research/v10_death_cause_20261001/fit.json',JSON.stringify(results,null,2));for(const [k,r]of Object.entries(results))console.log(k,JSON.stringify({best:r.best,baseTrain:r.baselineTrain.mean,baseTest:r.baselineTest.mean,fitTest:r.fitTest.mean,basePx:r.baselineTest.px,fitPx:r.fitTest.px}));
