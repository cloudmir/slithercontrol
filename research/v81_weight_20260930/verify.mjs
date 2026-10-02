import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const mod=p=>{const c=vm.createContext({performance:{now:()=>0}});vm.runInContext(fs.readFileSync(p,'utf8'),c);return c.SlpPilot};
const H=mod('ext/pilot.js'),old=mod('research/v81_weight_20260930/before/pilot.js');
const s=segs=>({x:0,y:0,segs});
for(let i=0;i<30;i++){const a=s([-550,i*25-350,550,i*25-350,10+i]);assert.equal(H.bodyDensity(a,450,0),old.bodyDensity(a,450));}
const center=s([-100,0,100,0,35]),far=s([-100,300,100,300,35]);
const near=[0,2,10].map(w=>H.bodyDensity(center,450,w));const distant=[0,2,10].map(w=>H.bodyDensity(far,450,w));
assert(near[2]>near[1]&&near[1]>near[0]);assert(distant[2]<distant[1]);assert(near[1]>distant[1]);
assert.equal(H.bodyDensity(s([...center.segs,...center.segs]),450,10),near[2]);
assert.equal(H.bodyDensity(s([]),450,10),0);assert(Math.abs(H.bodyDensity(s([0,0,0,0,1000]),450,10)-100)<1e-10);
const V={V81_BODY_ON:1,V81_BODY_R:450,V81_BODY_PCT:(near[0]+near[2])/2,V8_HEAD_N:3};
assert.equal(H.v8Choice({phase:'feed',clearSince:null},0,0,V,near[0]).phase,'feed');
assert.equal(H.v8Choice({phase:'feed',clearSince:null},0,0,V,near[2]).phase,'avoid');
for(const name of ['pilotStep','v6Step','v6Route'])assert.equal(H.Pilot.prototype[name].toString(),old.Pilot.prototype[name].toString());
const result={zeroWeightParityScenes:30,weights:[0,2,10],near,distant,overlapInvariant:true,thresholdSwitch:true,originalControllersUnchanged:true};fs.writeFileSync('research/v81_weight_20260930/verify.json',JSON.stringify(result,null,2));console.log(result);
