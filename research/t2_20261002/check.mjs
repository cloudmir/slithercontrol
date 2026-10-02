import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const HERE='research/t2_20261002';function load(p){const c=vm.createContext({performance});vm.runInContext(fs.readFileSync(p,'utf8'),c);return c.SlpPilot;}
const {Pilot}=load('ext/pilot.js'),old=load(HERE+'/before/pilot.js'),d=JSON.parse(fs.readFileSync('params.json')),V={...d.defaults,...d.presets.t2_thickness.values};
for(const name of ['t1Step','probeStep','pilotStep','v10Step','v111Step','va1Step','v4Adv'])assert.equal(Pilot.prototype[name].toString(),old.Pilot.prototype[name].toString(),name);
const segs=[],sid=[];for(let x=24000;x<38000;x+=100){segs.push(x,30000,x+100,30000,20);sid.push(9);}
const base={x:30000,y:30184.5,ang:0,sp:5.8,sc:1,L:100,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs,sid,heads:[38000,30000,0,5.8,20/14.5],hid:[9],food:[30000,31000,999],own:[]};
const tests=[];
for(const angle of [0,Math.PI,.47])for(const side of [1,-1]){
 const c=new Pilot(V);for(const name of ['pilotStep','t1Step','v10Step','v111Step','va1Step'])c[name]=()=>{throw new Error('T2 delegated to '+name)};
 const a=angle===.47?.47:0,cos=Math.cos(a),sin=Math.sin(a),rotate=(x,y)=>[30000+(x-30000)*cos-(y-30000)*sin,30000+(x-30000)*sin+(y-30000)*cos],rot=[];
 for(let k=0;k<segs.length;k+=5)rot.push(...rotate(segs[k],segs[k+1]),...rotate(segs[k+2],segs[k+3]),20);
 let [x,y]=rotate(30000,30000+side*184.5),st={x,y,h:angle,v:5.8*31},ph=c.v4Physics(1),queue=[],events=[],min=Infinity,target=new Set();
 for(let i=0;i<1000;i++){const T=10+i/30,s={...base,x:st.x,y:st.y,ang:st.h,sp:st.v/31,t:T,segs:rot,heads:[],hid:[]},[cmd,b]=c.step(s);queue.push({t:T,boost:b,cmd:Math.floor(((cmd%(2*Math.PI)+2*Math.PI)%(2*Math.PI))*251/(2*Math.PI))*(2*Math.PI)/251});let effective=queue[0].cmd;while(queue.length>1&&queue[1].t<=T-.16)queue.shift();effective=queue[0].cmd;
 if(c.last.trace.t2_level)events.push(c.last.trace.t2_level);target.add(c.last.trace.t2_target);min=Math.min(min,c.last.trace.t2_gap??Infinity);st=c.v4Adv(st,effective,queue[0].boost,1/30,ph);}
 assert(events.length>=3,JSON.stringify({angle,side,events,min}));assert.equal(target.size,1);assert.equal(events[0].set,6);assert.equal(events[1].set,5);assert(events.every(e=>e.samples>=15&&e.duration>=.75&&Math.abs(e.gap-e.set)<1));tests.push({angle,side,levels:events.length,minGap:min,first:events.slice(0,3)});
}
const lock=new Pilot(V);lock.step(base);assert.equal(lock.last.trace.t2_target,9);lock.step({...base,t:10.04,segs:[...segs,29000,30170,32000,30170,15],sid:[...sid,10]});assert.equal(lock.last.trace.t2_target,9);assert.equal(lock.last.trace.t2_valid,0);assert.equal(lock.last.trace.t2_reason,'body_interference');
const length=new Pilot(V);length.step({...base,segs:[...segs,30000,30170,30100,30170,15],sid:[...sid,10]});assert.equal(length.last.trace.t2_target,9);
const pace=new Pilot(V),shortSe=segs.slice(0,segs.findIndex((_,i)=>i%5===0&&segs[i]>=30300)),shortIds=sid.slice(0,shortSe.length/5);pace.step({...base,segs:shortSe,sid:shortIds,y:30040.5,sp:5.8,heads:[30300,30000,0,14,20/14.5],hid:[9]});assert(pace.last.trace.boost);assert.equal(pace.last.trace.t2_enemy_speed,14);assert.equal(pace.last.trace.t2_boost_reason,'pace_target');
const chase=new Pilot(V);chase.step({...base,y:30400,ang:0});assert(chase.last.trace.boost);assert.equal(chase.last.trace.t2_boost_reason,'catch_target');
const inactive=new Pilot({...V,T2_ON:0}),prior=new old.Pilot({...V,T2_ON:0});assert.equal(JSON.stringify(inactive.step(base)),JSON.stringify(prior.step(base)));
fs.writeFileSync(HERE+'/check.json',JSON.stringify({tests,nearestLongTarget:true,targetRetainedDuringInterference:true,chaseBoost:true,paceFastTarget:true,independent:true,priorFunctionsPreserved:7,defaultParity:true,scope:'synthetic 251-code steering + 160ms delay, not measured live boundary'},null,2));console.log('T2 checks passed',tests.map(t=>t.levels));
