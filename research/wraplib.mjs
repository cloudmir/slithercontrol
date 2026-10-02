// Shared by research/wrap_analysis.mjs and research/wrap_replay.mjs: recorded-frame geometry for wrap episodes.
import fs from 'node:fs'; import vm from 'node:vm'; import zlib from 'node:zlib'; import path from 'node:path';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
export const {Pilot, makeParams, paths, R, ANGLES} = globalThis.SlpPilot;
export const PARAMS = JSON.parse(fs.readFileSync('params.json', 'utf8'));
export const TAU = 2 * Math.PI, wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI, deg = a => Math.round(a * 180 / Math.PI);

export function segDist(x, y, S, i) {
  const ax = S[i], ay = S[i + 1], dx = S[i + 2] - ax, dy = S[i + 3] - ay, l2 = dx * dx + dy * dy;
  const u = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
  return Math.hypot(x - ax - u * dx, y - ay - u * dy);
}
export function ring(f) {                       // the snake covering most bearings within 500 px, its open run, its head
  const S = f.segs, per = new Map();
  for (let i = 0, k = 0; i < S.length; i += 5, k++) {
    if (segDist(f.x, f.y, S, i) - S[i + 4] >= 500) continue;
    const b = Math.trunc((Math.atan2((S[i + 1] + S[i + 3]) / 2 - f.y, (S[i] + S[i + 2]) / 2 - f.x) + Math.PI) / TAU * 24) % 24;
    const id = f.sid[k]; if (!per.has(id)) per.set(id, new Array(24).fill(false)); per.get(id)[b] = true;
  }
  let best = {cov: 0, id: null, free: 24, exit: null, bins: null};
  for (const [id, bins] of per) {
    const cov = bins.filter(Boolean).length / 24;
    if (cov <= best.cov) continue;
    const am = bins.indexOf(true); let run = [], cur = [];
    for (let k = 1; k <= 24; k++) { const b = (am + k) % 24; if (bins[b]) cur = []; else { cur.push(b); if (cur.length > run.length) run = cur.slice(); } }
    const mid = run.length ? run[run.length >> 1] : null;
    best = {cov, id, free: run.length, exit: mid === null ? null : (mid + .5) / 24 * TAU - Math.PI, bins};
  }
  if (best.id !== null) {
    const m = Array.from(f.hid).indexOf(best.id);
    if (m >= 0) {
      const H = f.heads, hx = H[5 * m], hy = H[5 * m + 1];
      best.head = {d: Math.round(Math.hypot(hx - f.x, hy - f.y)), sp: H[5 * m + 3], toExit: best.exit === null ? null : deg(Math.abs(wrap(Math.atan2(hy - f.y, hx - f.x) - best.exit)))};
    }
  }
  return best;
}
export function realizedPath(F, times, k, pos, t, ro) {      // min drawn gap along a path vs bodies recorded later; NaN unobserved
  let g = Infinity, j = k;
  for (let n = 0; n < t.length; n++) {
    const target = F[k].t + t[n];
    while (j + 1 < F.length && Math.abs(times[j + 1] - target) <= Math.abs(times[j] - target)) j++;
    if (Math.abs(times[j] - target) > .06) return NaN;
    const f = F[j], S = f.segs, x = pos[2 * n], y = pos[2 * n + 1];
    for (let i = 0; i < S.length; i += 5) { const d = segDist(x, y, S, i) - S[i + 4] - ro; if (d < g) g = d; }
  }
  return g;
}
// One game: record, black box, whole-game log (decision rows by t) and wrap clips; frame sequences [{frames, died}].
export function loadGame(dir, n) {
  const base = path.join(dir, n.replace(/\.json$/, '')), rec = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
  rec.values = {...PARAMS.defaults, ...(PARAMS.profiles[rec.profile] || {}), ...rec.values};   // keys added after the game
  const seqs = [];
  if (fs.existsSync(base + '_box.json.gz')) seqs.push({frames: JSON.parse(zlib.gunzipSync(fs.readFileSync(base + '_box.json.gz'))).frames, died: true});
  const traceAt = new Map(rec.trace.map(x => [x.t, x]));       // last 30 s; the whole-game log covers the rest
  if (fs.existsSync(base + '_log.json.gz')) {
    const L = JSON.parse(zlib.gunzipSync(fs.readFileSync(base + '_log.json.gz'))), ix = Object.fromEntries(L.keys.map((k, i) => [k, i]));
    for (const r of L.log) if (!traceAt.has(r[ix.t])) traceAt.set(r[ix.t], {mode: r[ix.mode], esc: r[ix.esc], boost: r[ix.boost], goal: null, L: r[ix.L]});
    for (const c of L.clips) if (c.frames.length) seqs.push({frames: c.frames, died: false});
  }
  return {rec, seqs, traceAt};
}
// ARM=A|B (env): only the games of that live A/B arm (slp_k.arm)
const armOf = (dir, n) => { const f = path.join(dir, n.replace(/\.json$/, '.arm')); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : null; };
export const games = dirs => dirs.flatMap(dir => fs.readdirSync(dir).filter(n => /^slp_\d+\.json$/.test(n)).sort().map(n => [dir, n]))
  .filter(([dir, n]) => !process.env.ARM || armOf(dir, n) === process.env.ARM);
