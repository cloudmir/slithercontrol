// (3)(6) Exit-quality warning validation: on recorded deaths, evaluate frames Td-10..Td-6 every 0.5 s with V2_EXIT_ON=1 and
// count deaths where at least one frame warns (exit_reason 'weak' = no open exit among the top candidates, or no candidate
// reaches the edge). Normal control: alive windows (10 s, excluding the last 15 s) of the given normal runs -> false-alarm windows.
//   node research/v2_exit_check.mjs --deaths runs/dirA ... --normal runs/dirN ...   env WARN=weak|none
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm'; import path from 'node:path';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const P = {...params.defaults, ...params.profiles.aggressive, V2_ON: 1, V2_EXIT_ON: 1, ...JSON.parse(process.env.OVER || '{}')};
const argv = process.argv.slice(2); const deaths = [], normals = []; let cur = deaths;
for (const a of argv) { if (a === '--deaths') cur = deaths; else if (a === '--normal') cur = normals; else cur.push(a); }
const isWarn = tr => tr.exit_reason === 'weak' || tr.exit_reason === 'none';
const stateOf = f => ({x: f.x, y: f.y, ang: f.ang, sp: f.sp, sc: f.sc, t: f.t, L: f.L, wall: f.wall, segs: Float64Array.from(f.segs), sid: Float64Array.from(f.sid),
  heads: Float64Array.from(f.heads), hid: Float64Array.from(f.hid), food: Float64Array.from(f.food), own: Float64Array.from(f.own)});
const load = (d) => fs.readdirSync(d).filter(x => /_box\.json\.gz$/.test(x)).sort().map(fn => ({name: `${d.split('/').pop().slice(-6)}/${fn.slice(0, 6)}`, rec: JSON.parse(fs.readFileSync(path.join(d, fn.replace('_box.json.gz', '.json')), 'utf8')), fr: JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, fn))).toString()).frames}));
let det = 0, nDeaths = 0, msAll = []; const dS = [], nS = [];   // per-frame n_safe in death windows / normal windows
for (const d of deaths) for (const g of load(d)) {
  if (g.rec.capped || g.fr.length < 100) continue; nDeaths++;
  const T = g.fr[g.fr.length - 1].t; const pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive'); let warned = false, detail = [];
  for (let back = 10; back >= 6; back -= .5) { const f = [...g.fr].reverse().find(x => T - x.t >= back - 1e-6); if (!f) continue;
    const t0 = performance.now(); pilot.step(stateOf(f)); msAll.push(performance.now() - t0); const tr = pilot.last.trace; detail.push(`${back}:${tr.exit_reason}/${tr.exit_width}/n${tr.n_safe}`); dS.push(tr.n_safe); if (isWarn(tr)) warned = true; }
  if (warned) det++; if (process.env.VERBOSE) console.log(g.name, warned ? 'WARN' : 'quiet', detail.join(' '));
}
let win = 0, fa = 0;
for (const d of normals) for (const g of load(d)) {
  if (g.fr.length < 100) continue; const T = g.fr[g.fr.length - 1].t, t0 = g.fr[0].t; const pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive');
  for (let ws = t0; ws + 10 <= T - 15; ws += 10) { win++; let w = false;
    for (let tt = ws; tt < ws + 10; tt += .5) { const f = g.fr.find(x => x.t >= tt); if (!f) break; const t1 = performance.now(); pilot.step(stateOf(f)); msAll.push(performance.now() - t1); nS.push(pilot.last.trace.n_safe); if (isWarn(pilot.last.trace)) { w = true; break; } }
    if (w) fa++; }
}
msAll.sort((a, b) => a - b);
console.log(`deaths ${nDeaths}: warned in Td-10..Td-6 = ${det} (${nDeaths ? (100 * det / nDeaths).toFixed(0) : 0}%, target >= 24/29)`);
console.log(`normal windows ${win}: false-alarm windows ${fa} (${win ? (100 * fa / win).toFixed(0) : 0}%, target <= 10%)`);
const q=(x,p)=>{const s=x.slice().sort((a,b)=>a-b);return s.length?s[Math.floor(s.length*p)]:'-'}; console.log(`n_safe p10/p50 deaths ${q(dS,.1)}/${q(dS,.5)}  normal ${q(nS,.1)}/${q(nS,.5)}`);
console.log(`decision ms p50 ${msAll.length ? msAll[msAll.length >> 1].toFixed(1) : '-'} p95 ${msAll.length ? msAll[Math.floor(msAll.length * .95)].toFixed(1) : '-'}`);
