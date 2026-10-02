// Driver for (1)+(2): at T-k before each recorded death, build time occupancy and run the steerable route search; replay the
// command list independently. Reports status per death and the replay success rate (Codex (1)(6): >= 95% of edgeEscape).
//   node research/v2_route_oracle.mjs runs/dirA ...   env BACKS=2,4,6,8,10 OCC=possible|core|static MAXN=400000 VERBOSE=1 LIMIT=n
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
import {buildOccupancy} from './v2_occ.mjs'; import {routeSearch, replayCmds} from './v2_route.mjs';
const BACKS = (process.env.BACKS || '2,4,6,8,10').split(',').map(Number), MODE = process.env.OCC || 'core', MAXN = +(process.env.MAXN || 30000), LIMIT = +(process.env.LIMIT || 1e9);
const wrapOcc = (occ, mode) => ({blockedSeg: (a, b, c, d, t0, t1) => { const h = occ.blockedSeg(a, b, c, d, t0, t1); if (!h) return null;
  if (mode === 'static') return h.kind === 'oldBody' ? h : null; if (mode === 'core') return (h.kind === 'oldBody' || h.core) ? h : null; return h; }});
const rows = []; let n = 0;
for (const d of process.argv.slice(2)) for (const fn of fs.readdirSync(d).filter(x => /_box\.json\.gz$/.test(x)).sort()) {
  if (n >= LIMIT) break;
  const rec = JSON.parse(fs.readFileSync(path.join(d, fn.replace('_box.json.gz', '.json')), 'utf8')); if (rec.capped) continue;
  const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, fn))).toString()).frames; if (fr.length < 100) continue; n++;
  const T = fr[fr.length - 1].t, out = {game: `${d.split('/').pop().slice(-6)}/${fn.slice(0, 6)}`};
  for (const b of BACKS) {
    const i = fr.findIndex(x => T - x.t <= b + 1e-6); if (i < 1) continue;
    const f = fr[i], prev = buildOccupancy(fr[i - 1], null, {MODE: 'core'});
    const occ = buildOccupancy(f, {t: fr[i - 1].t, tails: prev.tails}, {MODE: MODE === 'possible' ? 'possible' : 'core'}), t0 = Date.now();
    const r = routeSearch(f, wrapOcc(occ, MODE), {ROUTE_MAX_NODES: MAXN});
    const rp = r.status === 'edgeEscape' ? replayCmds(f, wrapOcc(occ, MODE), r.cmds) : null;
    out[b] = {status: r.status, tReach: r.tReach, expanded: r.expanded, ms: Date.now() - t0, replay: rp ? (rp.ok ? 'ok' : rp.why) : '-', cause: r.cause, minGap: r.minGap};
  }
  rows.push(out);
  if (process.env.VERBOSE) console.log(out.game, BACKS.map(b => out[b] ? `${b}s:${out[b].status}${out[b].tReach !== null && out[b].tReach !== undefined ? '@' + out[b].tReach.toFixed(1) : ''}/${out[b].replay}/${out[b].ms}ms` : `${b}s:-`).join('  '));
}
console.log(`deaths ${rows.length}, occupancy=${MODE}`);
for (const b of BACKS) { const c = {}; let rep = 0, repOk = 0; for (const r of rows) { const o = r[b]; if (!o) continue; c[o.status] = (c[o.status] || 0) + 1; if (o.status === 'edgeEscape') { rep++; if (o.replay === 'ok') repOk++; } }
  console.log(`${String(b).padStart(3)}s  ${JSON.stringify(c)}  replay ok ${repOk}/${rep}`); }
