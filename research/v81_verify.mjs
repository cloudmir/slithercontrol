import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';import assert from 'node:assert/strict';
const cfg=JSON.parse(fs.readFileSync('params.json')),values={...cfg.defaults,...cfg.presets.v81_exact.values};
function module(path){let tick=0;const c=vm.createContext({performance:{now:()=>tick++*.001}});vm.runInContext(fs.readFileSync(path,'utf8'),c);return c.SlpPilot;}
const M=module('ext/pilot.js'),old=module('research/v81_before_20260930/pilot.js');
assert.equal(M.Pilot.prototype.v41Step.toString(),old.Pilot.prototype.v41Step.toString());
const hybrid=new M.Pilot(values,'aggressive'),branches={feed:new old.Pilot(hybrid.v8Values(false),'aggressive'),avoid:new old.Pilot(hybrid.v8Values(true),'aggressive'),near:new old.Pilot(hybrid.v81Values(),'aggressive')};
const frames=JSON.parse(zlib.gunzipSync(fs.readFileSync('runs/v6dual_20260930_124604/slp_01_box.json.gz'))).frames.slice(-300),counts={feed:0,near:0,avoid:0};
const arrays=['segs','sid','heads','hid','food','own'];const clone=s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,arrays.includes(k)?Float64Array.from(v):v]));
for(let i=0;i<frames.length;i++){
 const phase=['feed','near','avoid'][Math.floor(i/20)%3],f=frames[i],s=clone({...f,cmdNow:f.ang,boostNow:f.boost,v8Control:{phase,heads:phase==='avoid'?3:phase==='near'?1:0,radius:450,threshold:3,switched:i%20===0,nearHeads:phase==='near'?1:0,nearRadius:250}});
 const a=hybrid.step(s),reference=branches[phase],b=reference.step(clone(s));assert.deepEqual(Array.from(a),Array.from(b),`command frame ${i}`);assert.deepEqual(Array.from(hybrid.last.plan||[]),Array.from(reference.last.plan||[]));assert.equal(hybrid.last.trace.mode,reference.last.trace.mode);counts[phase]++;
}
const fresh=()=>({phase:'feed',clearSince:null});const select=(count,near,K=fresh(),t=0,V=values)=>M.v81Choice(K,count,near,t,V);
assert.equal(select(0,0).phase,'feed');assert.equal(select(1,1).phase,'near');assert.equal(select(1,0).phase,'feed');assert.equal(select(2,2).phase,'feed');assert.equal(select(3,1).phase,'avoid');assert.equal(select(1,1,fresh(),0,{...values,V81_HEAD_R:0}).phase,'feed');
const K=fresh();select(3,1,K);assert.equal(select(1,1,K,.1).phase,'avoid');assert.equal(select(1,1,K,1.2).phase,'near');assert.equal(select(0,0,K,1.3).switched,1);
// Standalone fallback trigger: heads only, unique ids and radius boundary included.
const f=frames[0],single=clone({...f,x:30000,y:30000,t:10,segs:[],sid:[],heads:[30250,30000,Math.PI,5.8,1],hid:[9],food:[],own:[]});
const p=new M.Pilot(values,'aggressive');p.step(single);assert.equal(p.last.trace.v8_phase,'near');
p.step(clone({...single,t:10.1,heads:[30251,30000,0,5.8,1]}));assert.equal(p.last.trace.v8_phase,'feed');
p.setParams({...values,V81_HEAD_R:500},'aggressive');p.step(clone({...single,t:10.2,heads:[30400,30000,0,5.8,1,30400,30000,0,5.8,1],hid:[9,9]}));assert.equal(p.last.trace.v8_phase,'near');assert.equal(p.last.trace.v81_heads,1);
p.step(clone({...single,t:10.3,heads:[30200,30000,0,5.8,1,30100,30000,0,5.8,1],hid:[9,10]}));assert.equal(p.last.trace.v8_phase,'feed');
const result={frames:counts,commandDifferences:0,planDifferences:0,originalV41BodyUnchanged:true,crowdPriority:true,V8ReturnDelayPreserved:true,oneHeadOnly:true,rangeBoundaryAndDedup:true,liveParams:true};fs.writeFileSync('research/v81_verify_20260930.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
