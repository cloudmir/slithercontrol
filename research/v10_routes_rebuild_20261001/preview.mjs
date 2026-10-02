import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';import crypto from 'node:crypto';
const dir='runs/v10_death_capture_20261001_114834',out='research/v10_routes_rebuild_20261001';
const read=n=>JSON.parse(n.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(dir+'/'+n)):fs.readFileSync(dir+'/'+n));
const code=fs.readFileSync(out+'/pilot_candidate.js','utf8');vm.runInThisContext(code);
const rec=read('slp_01.json'),box=read('slp_01_box.json.gz');const samples=[];
for(const t of [26,27,28,28.5,29,30]){
 const f=box.frames.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a);
 const s={...f,cmdNow:f.cmdHistory.at(-1)?.ang??f.ang,boostNow:f.cmdHistory.at(-1)?.boost??f.boost,inputAgeMs:5};
 const tp=new SlpPilot.Pilot(rec.values,'safe');for(const prior of box.frames.filter(x=>x.t>=f.t-.6&&x.t<=f.t))s.threat=tp.v10Threat(prior);
 const p=new SlpPilot.Pilot({...rec.values,V10_BUDGET:90},'safe');const r=p.v10Route(s,1);
 samples.push({t:f.t,state:f,result:r});
}
const data={draft:true,source:dir,candidate_sha256:crypto.createHash('sha256').update(code).digest('hex'),budget:90,samples};fs.writeFileSync(out+'/preview_data.json',JSON.stringify(data));console.log(samples.map(x=>({t:x.t,n:x.result.routes.length,reason:x.result.reason,ms:x.result.ms})));
