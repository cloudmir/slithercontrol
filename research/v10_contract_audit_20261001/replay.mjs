import fs from 'node:fs';import vm from 'node:vm';
const dir='research/v10_contract_audit_20261001',fixtures=JSON.parse(fs.readFileSync(dir+'/fixtures.json'));
function context(path){const c={performance};vm.createContext(c);vm.runInContext(fs.readFileSync(path+'/pilot.js','utf8'),c);return c;}
const old=context(dir+'/before'),fresh=context('ext');const result={};
for(const [name,c,H] of [['before',old,null],['after',fresh,null],['horizon09',fresh,.9],['horizon12',fresh,1.2]]){
 let p,tp,game=0;const rows=[];
 for(const f of fixtures){const V={...f.values};if(H)V.V10_LOCAL_H=H;
  if(f.game!==game){p=new c.SlpPilot.Pilot(V,'safe');tp=new c.SlpPilot.Pilot(V,'safe');game=f.game;}
  const hist=f.s.cmdHistory||[],last=hist.at(-1),s={...f.s,cmdNow:last?.ang??f.s.ang,boostNow:last?.boost??!!f.s.boost,inputAgeMs:5};s.threat=tp.v10Threat(s);p.step(s);
  const a=p.last.controls[0],tr=p.last.trace;
  rows.push({game:f.game,t:s.t,rootSafe:tr.v10_root_safe,safe:tr.n_safe,unsafe:p.last.draw.localUnsafe,commandEnd:a.end,expiredAt10ms:a.end<=.01+(V.TRACK_LAT??.17),ms:tr.v10_local_ms,checked:tr.v10_checked,cmd:a.target,boost:a.boost});
 }
 const times=rows.map(r=>r.ms).sort((a,b)=>a-b);result[name]={summary:{frames:rows.length,rootUnsafe:rows.filter(r=>!r.rootSafe).length,expiredFresh:rows.filter(r=>r.expiredAt10ms).length,selectedUnsafeWithSafeAvailable:rows.filter(r=>r.safe>0&&r.unsafe).length,safeFrames:rows.filter(r=>r.safe>0).length,p95_ms:times[Math.floor(times.length*.95)]},rows};console.log(name,result[name].summary);
}
result.note='Fixed observations, recorded command history, fresh threat calculation, no recorded macro route available; this is command-contract reproduction, not counterfactual survival. Horizon sweep diagnostics cannot prove benefit.';
fs.writeFileSync(dir+'/replay.json',JSON.stringify(result,null,2));
