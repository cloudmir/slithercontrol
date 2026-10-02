import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...D.presets.v10_layered.values};
const F=JSON.parse(fs.readFileSync('research/v10_20261001/fixtures.json'));const rows=[];
for(const f of F){const p=new SlpPilot.Pilot(V,'safe'),s={...f.frame,cmdNow:f.frame.cmd?.[0],boostNow:f.frame.cmd?.[1]};s.threat=p.v10Threat(s);p.step(s);rows.push({...p.last.trace,source:f.source,before:f.before});}
const q=(key)=>rows.map(r=>r[key]).sort((a,b)=>a-b)[Math.floor(rows.length*.95)];console.log({local:q('v10_local_ms'),world:q('v10_world_ms')});console.log(rows.sort((a,b)=>b.v10_local_ms-a.v10_local_ms).slice(0,7).map(r=>({ms:r.v10_local_ms,world:r.v10_world_ms,safe:r.n_safe,checks:r.v10_checked,strategy:r.v10_strategy})));
fs.writeFileSync('research/v10_20261001/bench.json',JSON.stringify(rows));
