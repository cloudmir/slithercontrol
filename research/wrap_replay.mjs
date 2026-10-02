// Cycle 1 replay check of WRAP_COMMIT (records/current/decision-cycle1-wrap-20260927.md): the recorded wrap episodes
// (black boxes and wrap clips) are run through ext/pilot.js with the played values (A) and with WRAP_COMMIT on (B,
// thresholds from the command line). Open loop: our recorded path and the others are fixed; only the decisions differ.
// Per decision inside an episode (a snake covers >= 0.3 of the bearings within 500 px): command within 30 deg of the
// open run's middle (the exit), escape on, boost, and whether the decision's 1.2 s path touches the recorded bodies.
//   node research/wrap_replay.mjs <run dir> [...] [--ON=0.4 --HOLD=1 --OFF=0.2 --KEEP=2 --LOCK=2.5] [--out=file.jsonl]
// Results go per game to --out (default /tmp/wrap_replay.jsonl) as they finish; a rerun skips games already there.
import fs from 'node:fs';
import {Pilot, makeParams, paths, R, wrap, ring, realizedPath, loadGame, games} from './wraplib.mjs';

const opt = Object.fromEntries(process.argv.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')).map(([k, v]) => [k, k === 'out' ? v : +v]));
const OUT = opt.out || '/tmp/wrap_replay.jsonl';
const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).key) : []);
const dirs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const B = {WRAP_COMMIT: 1, WRAP_ON: opt.ON ?? .4, WRAP_HOLD: opt.HOLD ?? 1, WRAP_OFF: opt.OFF ?? .2, WRAP_KEEP: opt.KEEP ?? 2, WRAP_LOCK: opt.LOCK ?? 2.5};
const state = f => ({x: f.x, y: f.y, ang: f.ang, sp: f.sp, sc: f.sc, L: f.L, t: f.t, boost: f.boost, wall: f.wall,
  segs: Float64Array.from(f.segs), sid: Float64Array.from(f.sid), heads: Float64Array.from(f.heads), hid: Float64Array.from(f.hid),
  food: Float64Array.from(f.food), own: Float64Array.from(f.own)});
const zero = () => ({n: 0, aligned: 0, esc: 0, boost: 0, touch: 0, scored: 0, flips: 0});
for (const [dir, n] of games(dirs)) {
  const key = `${dir}/${n}|${JSON.stringify(B)}`;
  if (done.has(key)) continue;
  const res = {A: {died: zero(), escaped: zero(), calm: zero()}, B: {died: zero(), escaped: zero(), calm: zero()}}, match = [0, 0];
  const {rec, seqs} = loadGame(dir, n);
  for (const {frames: F, died} of seqs) {
    const times = F.map(f => f.t), rg = F.map(ring);
    // episode label per frame: died / escaped / calm (outside any episode), same rule as wrap_analysis
    const label = new Array(F.length).fill('calm');
    let s0 = null, low = null;
    for (let k = 0; k <= F.length; k++) {
      const r = rg[k];
      if (k < F.length && s0 === null && r.cov >= .3) { s0 = k; low = null; }
      if (s0 === null) continue;
      const end = k === F.length;
      if (!end) low = r.cov < .2 ? (low === null ? F[k].t : low) : null;
      if (end || (low !== null && F[k].t - low >= 2)) {
        for (let j = s0; j < (end ? F.length : k); j++) label[j] = end && died ? 'died' : 'escaped';
        s0 = null;
      }
    }
    for (const [arm, vals] of [['A', rec.values], ['B', {...rec.values, ...B}]]) {
      const pilot = new Pilot(vals, rec.profile), P = makeParams(vals);
      let lastEsc = null;
      for (let k = 0; k < F.length; k++) {
        const f = F[k], [cmd, boost] = pilot.step(state(f)), tr = pilot.last.trace, r = res[arm][label[k]];
        if (arm === 'A') { match[1]++; if (Math.abs(wrap(cmd - f.cmd[0])) < .09 && boost === f.cmd[1]) match[0]++; }
        const escOn = tr.esc !== null;
        r.n++; r.esc += escOn; r.boost += boost;
        if (label[k] !== 'calm' && lastEsc !== null && escOn !== lastEsc) r.flips++;
        lastEsc = escOn;
        if (rg[k].exit !== null && Math.abs(wrap(cmd - rg[k].exit)) < Math.PI / 6) r.aligned++;
        if (k % 3 === 0 && label[k] !== 'calm') {
          const prev = k ? F[k - 1].cmd[0] : f.ang, pb = k ? F[k - 1].cmd[1] : false;
          const {pos, t} = paths(P, f.x, f.y, f.ang, f.sp, f.sc, prev, [cmd], [boost], pb);
          const g = realizedPath(F, times, k, pos, t, R * f.sc);
          if (!Number.isNaN(g)) { r.scored++; r.touch += g < 0; }
        }
      }
    }
  }
  fs.appendFileSync(OUT, JSON.stringify({key, res, match}) + '\n');
  console.error('done', n);
}
const rows = fs.readFileSync(OUT, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(r => r.key.endsWith(`|${JSON.stringify(B)}`));
const res = {A: {died: zero(), escaped: zero(), calm: zero()}, B: {died: zero(), escaped: zero(), calm: zero()}}, match = [0, 0];
for (const r of rows) {
  match[0] += r.match[0]; match[1] += r.match[1];
  for (const arm of ['A', 'B']) for (const lab of ['died', 'escaped', 'calm']) for (const k in r.res[arm][lab]) res[arm][lab][k] += r.res[arm][lab][k];
}
const pc = (a, b) => b ? `${Math.round(100 * a / b)}%` : '-';
console.log(`${rows.length} games; B = played values + ${JSON.stringify(B)}; replay with played values = recorded command: ${pc(match[0], match[1])} of ${match[1]}`);
console.log('frames in            arm | decisions | toward exit (±30°) | escape on | boost | 1.2 s path touches | escape on/off flips');
for (const lab of ['died', 'escaped', 'calm']) for (const arm of ['A', 'B']) {
  const r = res[arm][lab];
  console.log(`${lab.padEnd(8)} episodes   ${arm}   | ${String(r.n).padStart(9)} | ${pc(r.aligned, r.n).padStart(18)} | ${pc(r.esc, r.n).padStart(9)} | ${pc(r.boost, r.n).padStart(5)} | ${`${pc(r.touch, r.scored)} of ${r.scored}`.padStart(18)} | ${lab === 'calm' ? '-' : r.flips}`);
}
