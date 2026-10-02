// Cycle 1 "감김" analysis (records/current/decision-cycle1-wrap-20260927.md): every wrap episode in MOD recordings.
// Sources per game: the death black box (slp_k_box.json.gz, last 30 s) and, from ext 0927-d3c13245 on, the whole-game
// log with wrap clips (slp_k_log.json.gz). Geometry is recomputed from the recorded frames the way ext/pilot.js does it:
// per snake, the share of 24 bearings its body covers within 500 px of our head, and its widest open run (the exit).
// Episode: cover >= 0.3 starts it, 2 s below 0.2 ends it (escaped); a death inside it = died.
// Per episode: when the bot reacted (trace esc / unwrap), how far our heading was off the exit, how fast the exit
// narrowed, boost use, and whether ANY basic maneuver (24 headings x cruise/boost, held 2 s) would have left the ring
// against the bodies recorded later (others fixed: open loop).
//   node research/wrap_analysis.mjs <run dir> [...]
import {makeParams, paths, R, ANGLES, wrap, deg, ring, realizedPath, loadGame, games} from './wraplib.mjs';

function exitExists(F, times, k, P) {    // any of 48 basic maneuvers clear for 2 s (held) — two chained 1.2 s paths
  const f = F[k], ro = R * f.sc, prev = k ? F[k - 1].cmd[0] : f.ang, pb = k ? F[k - 1].cmd[1] : false;
  const hd = [...ANGLES.map(a => f.ang + a), ...ANGLES.map(a => f.ang + a)], bs = [...ANGLES.map(() => false), ...ANGLES.map(() => true)];
  const all = paths(P, f.x, f.y, f.ang, f.sp, f.sc, prev, hd, bs, pb), N = all.t.length;
  let ok = 0, observed = 0;
  for (let c = 0; c < hd.length; c++) {
    const g = realizedPath(F, times, k, all.pos.subarray(2 * c * N, 2 * (c + 1) * N), all.t, ro);
    if (!Number.isNaN(g)) { observed++; if (g >= 0) ok++; }
  }
  return observed ? ok : null;
}

const rows = [];
for (const [dir, n] of games(process.argv.slice(2))) {
  {
    const {rec, seqs, traceAt} = loadGame(dir, n), P = makeParams(rec.values);
    for (const {frames: F, died} of seqs) {
      const times = F.map(f => f.t), rg = F.map(ring);
      let ep = null;
      const close = (end, outcome) => { ep.end = end; ep.outcome = outcome; rows.push(ep); ep = null; };
      for (let k = 0; k < F.length; k++) {
        const r = rg[k], f = F[k], tr = traceAt.get(f.t);
        if (!ep && r.cov >= .3) ep = {game: n.slice(0, -5), start: f.t, k0: k, id: r.id, react: null, low: null, covMax: 0, freeMin: 24,
          off0: r.exit === null ? null : deg(Math.abs(wrap(f.ang - r.exit))), head0: r.head || null, boost: 0, n: 0, aligned: null,
          mode0: tr ? tr.mode : null, goal0: tr ? tr.goal : null, exitK: [], esc: 0, flips: 0, lastEsc: null};
        if (!ep) continue;
        ep.covMax = Math.max(ep.covMax, r.cov); ep.freeMin = Math.min(ep.freeMin, r.free); ep.n++; ep.boost += f.cmd[1] ? 1 : 0;
        if (ep.react === null && tr && (tr.esc !== null || tr.mode === 'unwrap' || tr.mode === 'coil')) ep.react = {t: f.t, mode: tr.mode, cov: r.cov};
        if (tr) { const on = tr.esc !== null && tr.esc !== undefined; ep.esc += on ? 1 : 0; if (ep.lastEsc !== null && on !== ep.lastEsc) ep.flips++; ep.lastEsc = on; }
        if (ep.aligned === null && r.exit !== null && Math.abs(wrap(f.cmd[0] - r.exit)) < Math.PI / 6) ep.aligned = f.t;
        if ((f.t - ep.start) % 1 < .034 && ep.exitK.length < 30) ep.exitK.push(k);
        ep.low = r.cov < .2 ? (ep.low === null ? f.t : ep.low) : null;
        if (ep.low !== null && f.t - ep.low >= 2) close(f.t, 'escaped');
      }
      if (ep) close(times[times.length - 1], died ? 'died' : 'open');
      for (let i = rows.length - 1; i >= 0; i--)           // an episode seen in both a clip and the black box: keep the box one
        if (rows.findIndex(e => e.game === rows[i].game && Math.abs(e.start - rows[i].start) < .5) !== i) rows.splice(i, 1);
      for (const e of rows.filter(x => x.exitK && x.game === n.slice(0, -5) && !x.done)) {   // exits over time (open loop)
        e.exits = e.exitK.map(k => [Math.round((F[k].t - e.start) * 10) / 10, exitExists(F, times, k, P)]).filter(([, v]) => v !== null);
        e.done = true; delete e.exitK;
      }
    }
  }
}
const r1 = v => v === null || v === undefined ? '-' : Math.round(v * 10) / 10;
console.log('game    outcome  start   dur  covMax freeMin  off@start  react(s after, mode)  aligned(s)  boost  head@start(d,sp,toExit)  mode/goal@start  clear maneuvers by second (of 48)');
for (const e of rows) {
  const dur = e.end - e.start;
  console.log(`${e.game.padEnd(7)} ${e.outcome.padEnd(8)} ${String(r1(e.start)).padStart(6)} ${String(r1(dur)).padStart(5)}  ${e.covMax.toFixed(2)}   ${String(e.freeMin * 15).padStart(3)}°    ${String(e.off0 ?? '-').padStart(4)}°     ` +
    `${e.react ? `${r1(e.react.t - e.start)} ${e.react.mode}` : 'none'}`.padEnd(22) + `${e.aligned === null ? 'never' : r1(e.aligned - e.start)}`.padEnd(12) +
    `${Math.round(100 * e.boost / e.n)}%`.padEnd(7) + (e.head0 ? `${e.head0.d},${e.head0.sp},${e.head0.toExit}°` : '-').padEnd(24) +
    `${e.mode0}/${e.goal0 ?? '-'}`.padEnd(17) + `esc ${Math.round(100 * e.esc / e.n)}% flips ${e.flips}  ` + (e.exits || []).slice(0, 12).map(([t, v]) => `${t}:${v}`).join(' '));
}
const died = rows.filter(e => e.outcome === 'died'), esc = rows.filter(e => e.outcome === 'escaped');
const med = a => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : '-';
console.log(`\n${rows.length} episodes: died ${died.length}, escaped ${esc.length}, open ${rows.length - died.length - esc.length}`);
for (const [name, g] of [['died', died], ['escaped', esc]]) if (g.length)
  console.log(`  ${name}: heading off exit at start median ${med(g.map(e => e.off0).filter(v => v !== null))}°, reacted after ${med(g.filter(e => e.react).map(e => r1(e.react.t - e.start)))} s ` +
    `(never ${g.filter(e => !e.react).length}), aligned after ${med(g.filter(e => e.aligned !== null).map(e => r1(e.aligned - e.start)))} s (never ${g.filter(e => e.aligned === null).length}), ` +
    `narrowest exit ${med(g.map(e => e.freeMin * 15))}°, boost ${med(g.map(e => Math.round(100 * e.boost / e.n)))}%, escape mode on ${med(g.map(e => Math.round(100 * e.esc / e.n)))}% of the episode, ` +
    `escape on/off flips ${med(g.map(e => e.flips))}, duration ${med(g.map(e => r1(e.end - e.start)))} s, chasing food at start ${g.filter(e => e.mode0 === 'feed' && (e.goal0 || 0) >= 144).length}`);
