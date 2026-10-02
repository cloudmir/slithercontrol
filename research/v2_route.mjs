// (1) Steerable time-path search (Codex spec 2026-09-29): A* over labels {x,y,ang,sp,t,queued cmd} with our real physics
// (turn rate, 0.1 s command latency, boost ramp), commands re-chosen every ROUTE_CMD_DT from {0,±1,±2,±4} direction bins
// (of 32) x {cruise, boost}; continuous head segments checked against capsule occupancy every SUBDT.
// Occupancy API: occ.blockedSeg(x1,y1,x2,y2,t0,t1) -> null | {kind,...}. Arena shrinks at wallRate px/s.
import {R, PX, BOOST_SP, wrap, clip, cruiseSp, advance, TAU, PI} from './v2_phys.mjs';
export const DEF = {ROUTE_CELL: 16, ROUTE_DT: .1, ROUTE_SUBDT: .05, ROUTE_DIRS: 32, ROUTE_CMD_DT: .3, ROUTE_KEY_T: .3, ROUTE_KEY_CELL: 48, ROUTE_KEY_DIRS: 12, ROUTE_CMD_BINS: [0, 2, -2, 4, -4], ROUTE_EDGE: 1090, ROUTE_MAX_NODES: 2000000, BODY_PAD: 5, H: 5, LAT: .1, MINL: 80, WALL_PAD: 30, WALL_RATE: 10};
export function routeSearch(f, occ, opt = {}) {
  const O = Object.assign({}, DEF, opt), sc = f.sc, ro = R * sc, [W0, W1, W2] = f.wall, canBoost = (f.L || 0) >= O.MINL;
  const prevCmd = Array.isArray(f.cmd) ? {ang: f.cmd[0], boost: !!f.cmd[1]} : {ang: f.ang, boost: !!f.boost};
  const dirBin = a => Math.floor(((wrap(a) + PI) / TAU) * O.ROUTE_DIRS) % O.ROUTE_DIRS, binAng = b => (b + .5) / O.ROUTE_DIRS * TAU - PI;
  // dominance key (coarser than the physics): 0.2 s, 2 cells, 16 directions, boosting or not - finer keys made the search
  // expand hundreds of thousands of near-duplicate labels (smoke test 2026-09-29: 40-60 s per search, mostly 'unknown')
  const keyOf = n => `${Math.round(n.t / O.ROUTE_KEY_T)}/${Math.floor((n.x - f.x) / O.ROUTE_KEY_CELL)}/${Math.floor((n.y - f.y) / O.ROUTE_KEY_CELL)}/${Math.floor(((wrap(n.ang) + PI) / TAU) * O.ROUTE_KEY_DIRS) % O.ROUTE_KEY_DIRS}/${n.sp > 9 ? 1 : 0}`;
  const wallGap = (x, y, t) => W2 - O.WALL_RATE * t - O.WALL_PAD - Math.hypot(x - W0, y - W1) - ro;
  const h = n => Math.max(0, O.ROUTE_EDGE - Math.hypot(n.x - f.x, n.y - f.y)) / (BOOST_SP * PX);
  // labels per key: keep up to 3 non-dominated (earlier t, larger minGap)
  const labels = new Map();
  const dominated = (k, n) => { const l = labels.get(k); if (!l) return false; for (const m of l) if (m.t <= n.t + 1e-9 && m.minGap >= n.minGap - 1e-9) return true; return false; };
  const addLabel = (k, n) => { let l = labels.get(k); if (!l) { l = []; labels.set(k, l); } l.push(n); if (l.length > 2) { l.sort((a, b) => a.t - b.t); l.length = 2; } };
  // heap on f = t + h
  const hk = [], hv = [];
  const push = (n) => { const v = n.t + h(n); hk.push(n); hv.push(v); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hv[p] <= hv[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]]; [hv[p], hv[c]] = [hv[c], hv[p]]; c = p; } };
  const pop = () => { const n = hk[0], ln = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = ln; hv[0] = lv; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let s = c; if (l < hk.length && hv[l] < hv[s]) s = l; if (r < hk.length && hv[r] < hv[s]) s = r; if (s === c) break; [hk[s], hk[c]] = [hk[c], hk[s]]; [hv[s], hv[c]] = [hv[c], hv[s]]; c = s; } } return n; };
  const start = {x: f.x, y: f.y, ang: f.ang, sp: f.sp, t: 0, cmdBin: dirBin(prevCmd.ang), cmdBoost: prevCmd.boost, cmdAng: prevCmd.ang, minGap: Infinity, parent: null, cmds: []};
  push(start); addLabel(keyOf(start), start);
  let expanded = 0, best = null, bestSurvive = null, status = 'noPath', cause = null;
  // simulate one command segment of ROUTE_CMD_DT (or until LAT boundary): returns new node or null (collision)
  const step = (n, cmd, dur) => {
    let s = {x: n.x, y: n.y, ang: n.ang, sp: n.sp}, t = n.t, minGap = n.minGap; const tEnd = n.t + dur;
    while (t < tEnd - 1e-9) {
      let dt = Math.min(O.ROUTE_SUBDT, tEnd - t);
      if (s.sp * PX * dt > 8) dt = 8 / (s.sp * PX);
      const s2 = advance(s, cmd, dt, sc);
      const hit = occ.blockedSeg(s.x, s.y, s2.x, s2.y, t, t + dt);
      if (hit) { cause = hit.kind; return null; }
      const g = wallGap(s2.x, s2.y, t + dt); if (g < 0) { cause = 'wall'; return null; }
      if (g < minGap) minGap = g;
      s = s2; t += dt;
    }
    return {x: s.x, y: s.y, ang: s.ang, sp: s.sp, t, cmdBin: cmd.bin, cmdBoost: cmd.boost, cmdAng: cmd.ang, minGap, parent: n, cmds: null};
  };
  while (hk.length) {
    const n = pop(); expanded++;
    if (expanded > O.ROUTE_MAX_NODES) { status = 'unknown'; break; }
    const dist = Math.hypot(n.x - f.x, n.y - f.y);
    if (dist >= O.ROUTE_EDGE) { best = n; status = 'edgeEscape'; break; }
    if (n.t >= O.H - 1e-9) { if (!bestSurvive) bestSurvive = n; continue; }
    // command options: during latency the previous command continues
    const opts = [];
    if (n.t < O.LAT - 1e-9) opts.push({ang: n.cmdAng, boost: n.cmdBoost, bin: n.cmdBin, dur: O.LAT - n.t});
    else { const cb = dirBin(n.ang); for (const db of O.ROUTE_CMD_BINS) for (const boost of (canBoost ? [false, true] : [false])) {
      const bin = ((cb + db) % O.ROUTE_DIRS + O.ROUTE_DIRS) % O.ROUTE_DIRS; opts.push({ang: binAng(bin), boost, bin, dur: Math.min(O.ROUTE_CMD_DT, O.H - n.t)}); } }
    for (const cmd of opts) {
      const m = step(n, cmd, cmd.dur); if (!m) continue;
      const k = keyOf(m); if (dominated(k, m)) continue;
      addLabel(k, m); push(m);
    }
  }
  const node = best || bestSurvive;
  if (status === 'noPath' && bestSurvive) status = 'surviveH';
  const cmds = [], traj = [];
  for (let n = node; n; n = n.parent) { traj.push([n.x, n.y, n.t]); if (n.parent) cmds.push({t: n.parent.t, ang: n.cmdAng, boost: n.cmdBoost, until: n.t}); }
  cmds.reverse(); traj.reverse();
  return {status, tReach: best ? best.t : null, cmds, traj, minGap: node ? node.minGap : null, expanded, cause};
}
// replay a command list with independent 0.1 s integration against RAW capsules (not the search's step structure)
export function replayCmds(f, occ, cmds, opt = {}) {
  const O = Object.assign({}, DEF, opt), sc = f.sc, ro = R * sc, [W0, W1, W2] = f.wall;
  let s = {x: f.x, y: f.y, ang: f.ang, sp: f.sp}, t = 0, minGap = Infinity;
  const prevCmd = Array.isArray(f.cmd) ? {ang: f.cmd[0], boost: !!f.cmd[1]} : {ang: f.ang, boost: !!f.boost};
  const cmdAt = tt => { if (tt < O.LAT - 1e-6) return prevCmd; let c = null; for (const q of cmds) if (tt >= q.t - 1e-6 && tt < q.until - 1e-6) { c = {ang: q.ang, boost: q.boost}; break; }
    if (!c && cmds.length) { const q = cmds[cmds.length - 1]; c = {ang: q.ang, boost: q.boost}; } return c || prevCmd; };
  const tEnd = cmds.length ? cmds[cmds.length - 1].until : O.H;
  while (t < tEnd - 1e-9) {
    let dt = Math.min(O.ROUTE_SUBDT, tEnd - t); if (s.sp * PX * dt > 8) dt = 8 / (s.sp * PX);   // same substep cap as the search
    const c = cmdAt(t), s2 = advance(s, c, dt, sc);
    if (occ.blockedSeg(s.x, s.y, s2.x, s2.y, t, t + dt)) return {ok: false, at: t, why: 'body'};
    const g = W2 - O.WALL_RATE * (t + dt) - O.WALL_PAD - Math.hypot(s2.x - W0, s2.y - W1) - ro; if (g < 0) return {ok: false, at: t, why: 'wall'}; if (g < minGap) minGap = g;
    s = s2; t += dt;
    if (Math.hypot(s.x - f.x, s.y - f.y) >= O.ROUTE_EDGE - O.ROUTE_CELL) return {ok: true, at: t, minGap};   // one cell of tolerance: the replay's substep grid differs from the search's
  }
  return {ok: false, at: t, why: 'short'};
}
