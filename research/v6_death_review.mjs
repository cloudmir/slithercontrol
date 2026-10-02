// Reconstructed local candidates; macro route and input commands are approximations, not original worker state.
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';
const dir = process.argv[2];
let code = fs.readFileSync('ext/pilot.js', 'utf8');
const marker = '    for (const c of pool) if (better(c, best)) best = c;';
if (!code.includes(marker)) throw Error('instrumentation marker missing');
code = code.replace(marker, marker + '\n    this.reviewCandidates = cands; this.reviewBest = best;');
vm.runInThisContext(code);
const rec = JSON.parse(fs.readFileSync(`${dir}/slp_01.json`));
const frames = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${dir}/slp_01_box.json.gz`))).frames;
const logs = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${dir}/slp_01_log.json.gz`)));
const rows = logs.log.map(r => Object.fromEntries(logs.keys.map((k,i)=>[k,r[i]])));
const T = frames.at(-1).t, out = [];
for (const back of [3, 2, 1.2, .9, .6, .3, .15, 0]) {
  const f = frames.reduce((a,b)=>Math.abs(a.t-(T-back))<Math.abs(b.t-(T-back))?a:b);
  const row = rows.reduce((a,b)=>Math.abs(a.t-f.t)<Math.abs(b.t-f.t)?a:b);
  const s = {...f, cmdNow:row.trk_cmd*Math.PI/180, boostNow:!!f.boost};
  for (const k of ['segs','sid','heads','hid','food','own']) s[k]=Float64Array.from(f[k]);
  const planner = new SlpPilot.Pilot(rec.values,rec.profile), local = new SlpPilot.Pilot(rec.values,rec.profile);
  s.route = planner.v6Route(s,1); local.step(s);
  out.push({back:T-f.t,frame:f,logged:row,reconstructed:local.last.trace,
    plan:local.last.plan,guide:s.route.pts,candidates:local.reviewCandidates.map(c=>({...c,selected:c===local.reviewBest}))});
}
fs.writeFileSync(`${dir}/death_review.json`,JSON.stringify({note:'Fresh reconstructed macro route; cmdNow approximated by logged trk_cmd. Not exact live replay.',snapshots:out}));
for(const q of out) console.log(JSON.stringify({back:+q.back.toFixed(3),logged:q.logged.mode,reconstructed:q.reconstructed.mode,loggedGap:q.logged.ttds,
  candidates:q.candidates.map(c=>({fr:c.fr,boost:c.boost,hit:c.hitT,risk:+c.risk.toFixed(3),gap:+c.mg.toFixed(1),selected:c.selected}))}));
