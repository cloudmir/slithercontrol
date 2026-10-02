import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const cfg=JSON.parse(fs.readFileSync('params.json'));
const before=JSON.parse(fs.readFileSync('research/v7_before_20260930/params.json'));
const saved=JSON.parse(fs.readFileSync('research/v8_settings_before_20260930.json')).presets['잔해 적극 2026-09-28'];
const six=JSON.parse(fs.readFileSync('research/v7_mock_20260930/windows_before.json')).values;
const flags={V8_ON:0,V7_ON:0,V6_ON:0,V41_ON:0,V5_ON:0,V4_ON:0,V3_ON:0,V2_ON:0,PROBE_ON:0};
const v1={...before.defaults,...before.profiles[saved.profile],...saved.values,...flags};
const v6={...six,...flags,V6_ON:1};
const hybrid={...cfg.defaults,...cfg.presets.v8_exact.values};
function module(path){let tick=0;const c=vm.createContext({performance:{now:()=>tick++*.001}});vm.runInContext(fs.readFileSync(path,'utf8'),c);return c.SlpPilot;}
const H=module('ext/pilot.js'),Original1=module('research/v7_before_20260930/pilot.js'),Original6=module('research/v7_before_20260930/pilot.js');
const p=new H.Pilot(hybrid,saved.profile),p1=new Original1.Pilot(v1,saved.profile),p6=new Original6.Pilot(v6,saved.profile);
const scalar=r=>Array.from(r),arrays=['segs','sid','heads','hid','food','own'];
const copy=s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,arrays.includes(k)?Float64Array.from(v):v]));
const frames=JSON.parse(zlib.gunzipSync(fs.readFileSync('runs/v6dual_20260930_124604/slp_01_box.json.gz'))).frames.slice(-300);
let n1=0,n6=0,switches=0;
// Alternate in sustained blocks, retaining independent histories across multiple returns.
for(let i=0;i<frames.length;i++){
 const phase=Math.floor(i/30)%2?'avoid':'feed',f=frames[i];
 const s=copy({...f,cmdNow:f.ang,boostNow:!!f.boost,v8Control:{phase,heads:phase==='avoid'?3:0,radius:450,threshold:3,switched:i%30===0?1:0}});
 const r=p.step(s),q=phase==='avoid'?p6:p1,ref=q.step(copy(s));
 assert.deepEqual(scalar(r),scalar(ref),`command parity frame ${i} ${phase}`);
 assert.deepEqual(scalar(p.last.plan||[]),scalar(q.last.plan||[]),`plan parity frame ${i}`);
 assert.equal(p.last.trace.mode,q.last.trace.mode);
 if(phase==='avoid')n6++;else n1++;if(i&&i%30===0)switches++;
}
// Entire original decision bodies are unchanged by V8.
for(const name of ['pilotStep','v6Step','v4World','v4Reach','v4Physics','v4Adv'])assert.equal(H.Pilot.prototype[name].toString(),Original1.Pilot.prototype[name].toString());
const macro=new H.Pilot(hybrid,saved.profile),originalMacro=new Original6.Pilot(v6,saved.profile);
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const routes=[];
for(const [label,patch] of [['empty',{}],['food',{food:[30408,30312,20,30410,30313,20]}],['wall',{segs:[30200,28000,30200,32000,20],sid:[8]}],['heads',{heads:[30400,30000,Math.PI,14,2],hid:[7]}]]){
 const s=copy({...base,...patch,t:base.t+routes.length*2}),a=macro.v8Route(s,routes.length),b=originalMacro.v6Route(copy(s),routes.length);
 for(const key of ['intent','pts','goal','reason','certified','exits','partial','foodValue'])assert.equal(JSON.stringify(a[key]),JSON.stringify(b[key]),`macro parity ${label} ${key}`);
 routes.push({label,intent:a.intent});
}
assert.equal(routes[0].intent,'explore');assert.equal(routes[1].intent,'food');assert.equal(routes[2].intent,'escape');
const K={phase:'feed',clearSince:null};assert.equal(H.v8Choice(K,3,0,hybrid).phase,'avoid');assert.equal(H.v8Choice(K,2,.1,hybrid).phase,'avoid');assert.equal(H.v8Choice(K,0,1.11,hybrid).phase,'feed');
// Independent trigger sees heads outside V1's observation without expanding its inputs.
const mod=fs.readFileSync('ext/mod.js','utf8'),old=fs.readFileSync('research/v7_before_20260930/mod.js','utf8');
const obs=src=>src.slice(src.indexOf('function observe() {'),src.indexOf('\nfunction snakeLen',src.indexOf('function observe() {')));
const me={xx:30000,yy:30000,ang:0,sp:6.12,sc:2,md:false,wmd:false,pts:[],sct:20,rsc:0,fam:0};
const enemies=[{id:1,xx:34000,yy:30000,ang:0,sp:6,sc:1,pts:[]},{id:2,xx:31200,yy:30000,ang:0,sp:6,sc:1,pts:[{xx:31300,yy:30000}]},{id:3,xx:30200,yy:30000,ang:0,sp:6,sc:1,pts:[{xx:30300,yy:30000}]}];
function observation(src,values,choice){const c=vm.createContext({window:{slither:me,slithers:[me,...enemies],playing:true,grd:30000,flux_grd:20000,foods:[{xx:33500,yy:30000,sz:16}],foods_c:1,SlpPilot:H},performance:{now:()=>10000},S:{values},RADIUS:1150,FOOD_RADIUS:3000,sent:{ang:0},snakeLen:()=>1000,route:null,planVer:0,planSentAt:0,v8Switch:choice||{phase:'feed',clearSince:null}});return vm.runInContext(`(${obs(src)})()`,c);}
for(const phase of ['feed','avoid']){
 const values={...hybrid,V8_HEAD_R:4500,V8_HEAD_N:phase==='feed'?4:1},a=observation(mod,values),b=observation(old,phase==='feed'?v1:v6);
 assert.equal(a.v8Control.phase,phase);assert.equal(a.v8Control.heads,3);
 for(const k of arrays)assert.deepEqual(scalar(a[k]),scalar(b[k]),`observation parity ${phase} ${k}`);
}
const result={v1Frames:n1,v6Frames:n6,commandDifferences:0,planDifferences:0,switches,unchangedDecisionBodies:true,macroParity:routes,observationParity:true,triggerIndependent:true,scope:'offline replay and synthetic; no survival result'};
fs.writeFileSync('research/v8_maze_review_20261001/parity.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
