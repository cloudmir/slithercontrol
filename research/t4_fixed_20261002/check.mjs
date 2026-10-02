import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const HERE='research/t4_fixed_20261002';function load(p){const c=vm.createContext({performance});vm.runInContext(fs.readFileSync(p,'utf8'),c);return c.SlpPilot;}
const {Pilot}=load('ext/pilot.js'),old=load(HERE+'/before/pilot.js'),d=JSON.parse(fs.readFileSync('params.json')),V={...d.defaults,...d.presets.t3_thickness.values};
for(const name of ['t3Step','t2Step','t1Step','probeStep','pilotStep','v10Step','v111Step','va1Step','v4Adv'])assert.equal(Pilot.prototype[name].toString(),old.Pilot.prototype[name].toString(),name);
const segs=[],sid=[];for(let x=24000;x<38000;x+=100){segs.push(x,30000,x+100,30000,20);sid.push(9);}
const base={x:30000,y:30184.5,ang:0,sp:5.8,sc:1,L:100,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs,sid,heads:[38000,30000,0,5.8,20/14.5],hid:[9],food:[30000,31000,999],own:[]};
const tests=[];
for(const normal of [0,20,-20])for(const angle of [0,Math.PI/2,Math.PI])for(const side of [1,-1]){
 const c=new Pilot({...V,T4_ON:1,T3_ON:0,T4_GAP:-5,T4_BOOST:1});
 let st={x:30000,y:30000+side*140,h:angle,v:5.8*31},ph=c.v4Physics(1),queue=[],trace=[];
 for(let i=0;i<650;i++){
  const T=10+i/30,ss=[];for(let k=0;k<segs.length;k+=5)ss.push(segs[k],segs[k+1]+normal*i/30,segs[k+2],segs[k+3]+normal*i/30,20);
  const state={...base,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:T,segs:ss,heads:[],hid:[],cmdNow:queue[0]?.cmd??st.h,boostNow:queue[0]?.boost??false};
  const [cmd,b]=c.step(state);queue.push({t:T,cmd:Math.floor(((cmd%(2*Math.PI)+2*Math.PI)%(2*Math.PI))*251/(2*Math.PI))*(2*Math.PI)/251,boost:b});
  while(queue.length>1&&queue[1].t<=T-.16)queue.shift();st=c.v4Adv(st,queue[0].cmd,queue[0].boost,1/30,ph);trace.push(c.last.trace);
 }
 const tail=trace.slice(-120),g=tail.map(t=>t.t4_gap).sort((a,b)=>a-b),err=g.map(x=>Math.abs(x+5)).sort((a,b)=>a-b),near=tail.filter(t=>Math.abs(t.t4_gap+5)<3&&t.t4_heading_error<15*Math.PI/180).length;
 const result={normal,angle,side,tailMedianGap:g[60],tailMedianError:err[60],nearTicks:near,minGap:Math.min(...trace.map(t=>t.t4_gap)),boostTicks:trace.filter(t=>t.boost).length};tests.push(result);
}
console.log(JSON.stringify(tests,null,2));fs.writeFileSync(HERE+'/check.json',JSON.stringify({tests,scope:'synthetic 251-code +160ms delay; not server boundary'},null,2));
for(const r of tests)assert(r.tailMedianError<3&&r.nearTicks>=60,JSON.stringify(r));
const lock=new Pilot({...V,T4_ON:1,T3_ON:0});lock.step(base);const first=lock.last.trace.t4_target;lock.step({...base,t:10.04,segs:[...segs,29000,30170,32000,30170,15],sid:[...sid,10]});assert.equal(lock.last.trace.t4_target,first);assert.equal(lock.last.trace.t4_set,-5);assert.equal(lock.last.trace.t4_valid,0);
console.log('T4 fixed gap and old functions preserved');
