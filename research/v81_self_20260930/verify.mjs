import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const load=p=>{const c=vm.createContext({performance:{now:()=>0}});vm.runInContext(fs.readFileSync(p,'utf8'),c);return c.SlpPilot;};
const H=load('ext/pilot.js'),old=load('research/v81_self_20260930/before/pilot.js');
const line=[-500,80,500,80,45],base={x:0,y:0,segs:[]},alone={...base,ownSegs:line};
const ref=H.bodyDensity({...base,segs:line},450,2);
for(const w of [.01,.1,.37,1])assert(Math.abs(H.bodyDensity(alone,450,2,w)-ref*w)<1e-10);
assert.equal(H.bodyDensity({...alone,ownSegs:[...line,...line]},450,2,1),ref);
assert.equal(H.bodyDensity({...alone,segs:line},450,2,.1),ref);
assert.equal(H.bodyDensity(alone,450,2,0),0);
assert.equal(H.bodyDensity({...base,own:[-500,80,500,80],sc:45/14.5},450,2,1),ref);
assert.equal(H.bodyDensity({...base,own:[-500,80,500,80],ownSegs:[]},450,2,1),0);
for(let i=0;i<30;i++){const s={...base,segs:[-550,i*25-350,550,i*25-350,10+i],ownSegs:line};assert.equal(H.bodyDensity(s,450,2,0),old.bodyDensity(s,450,2));}
for(const name of ['pilotStep','v6Step','v6Route'])assert.equal(H.Pilot.prototype[name].toString(),old.Pilot.prototype[name].toString());
const cfg=JSON.parse(fs.readFileSync('params.json')),V={...cfg.defaults,...cfg.presets.v81_density.values};
// Actual observer must include our body even if the slithers array lacks us;
// it must not connect across a dying point or count an own-id duplicate as enemy.
const mod=fs.readFileSync('ext/mod.js','utf8'),src=mod.slice(mod.indexOf('function observe() {'),mod.indexOf('\nfunction snakeLen'));
const me={id:-1,xx:0,yy:0,ang:0,sp:6,sc:3,pts:[{xx:-500,yy:80},{xx:500,yy:80}]};
function obs(w,pts=me.pts,others=[]){const m={...me,pts};return vm.runInNewContext(`(${src})()`,{window:{SlpPilot:H,slither:m,slithers:others,playing:true,foods:[],foods_c:0,grd:0,flux_grd:20000},S:{values:{...V,V81_BODY_SELF_W:w}},performance:{now:()=>1000},v8Switch:{phase:'feed',clearSince:null},RADIUS:1150,FOOD_RADIUS:3000,sent:{ang:0},snakeLen:()=>100,route:null,planVer:0,planSentAt:0}).v8Control;}
const one=obs(1),tenth=obs(.1);assert(one.bodyDensity>0);assert(Math.abs(tenth.bodyDensity-one.bodyDensity*.1)<1e-10);
assert.equal(obs(.1,me.pts,[me,{...me}]).bodyDensity,tenth.bodyDensity);
assert.equal(obs(1,[{xx:-500,yy:80},{xx:500,yy:80,dying:true}]).bodyDensity,0);
const result={selfRatio01:ref*.01,selfRatio10:ref*.1,selfRatio100:ref,ownOverlapNotAdded:true,enemyOverlapNotAdded:true,zeroSelfParityScenes:30,observer:{one,tenth},dyingAndDuplicatesExcluded:true,originalControllersUnchanged:true};
fs.writeFileSync('research/v81_self_20260930/verify.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
