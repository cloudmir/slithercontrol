// (2) Time occupancy of enemy bodies (Codex spec 2026-09-29): observed body capsules vanish as the tail advances
// (tOff = t0 + s/vTail when the tail is observed), enemy heads lay NEW body along a scenario set (straight, left/right
// turn held .4/1/5 s, cruise/boost = 14 scenarios). Query: blockedSeg(x1,y1,x2,y2,t0,t1,ro,pad) -> hit kind or null.
// "possible" = any scenario lays there; "core" = every scenario lays there (reported separately).
import {R, PX, BOOST_SP, RAMP, wrap, cruiseSp, turnRate, segSegDist, TAU} from './v2_phys.mjs';
export const DEF = {OCC_DT: .1, HEAD_SUBDT: .1, HEAD_TURN_HOLDS: [.4, 1, 5], HEAD_PAD: 10, TAIL_MIN_SPEED: 10, TAIL_MAX_AGE: .5, OCC_MAX_HEADS: 8, H: 5, BODY_PAD: 5, OBS: 1150, MODE: 'possible', CORE_T: .5};
const GC = 96;
export function buildOccupancy(f, prev, opt = {}) {
  const O = Object.assign({}, DEF, opt), ro = R * f.sc, caps = [];   // {x1,y1,x2,y2,r,tOn,tOff,kind,sid,scen}
  // ---- observed bodies, grouped per snake in tail->head order (observe() walks pts tail->head, head last) ----
  const bySid = new Map();
  for (let k = 0; k < f.sid.length; k++) { const id = f.sid[k]; if (!bySid.has(id)) bySid.set(id, []); bySid.get(id).push(k); }
  const tails = {};
  for (const [id, ks] of bySid) {
    const s = f.segs, first = ks[0], tx = s[5 * first], ty = s[5 * first + 1];
    const tailSeen = Math.hypot(tx - f.x, ty - f.y) < O.OBS - 60;               // the polyline starts well inside the observed disc -> real tail
    let vTail = null;
    if (tailSeen && prev && prev.tails && prev.tails[id] && f.t - prev.t > .02 && f.t - prev.t <= O.TAIL_MAX_AGE) {
      const p = prev.tails[id]; vTail = Math.hypot(tx - p[0], ty - p[1]) / (f.t - prev.t);   // tail advance along its own track ~ chord
      if (vTail < O.TAIL_MIN_SPEED) vTail = null;
    }
    tails[id] = [tx, ty];
    let sAcc = 0;
    for (const k of ks) {
      const x1 = s[5 * k], y1 = s[5 * k + 1], x2 = s[5 * k + 2], y2 = s[5 * k + 3], r = s[5 * k + 4];
      sAcc += Math.hypot(x2 - x1, y2 - y1);
      const tOff = tailSeen && vTail ? sAcc / vTail : Infinity;                 // relative to now: the head-end of the capsule clears when the tail passes it
      caps.push({x1, y1, x2, y2, r, tOn: -Infinity, tOff, kind: 'oldBody', sid: id, scen: -1, tailUnknown: !(tailSeen && vTail)});
    }
  }
  // ---- head scenarios: new body laid progressively ----
  const heads = [];
  for (let m = 0; m < f.hid.length; m++) {
    const hx = f.heads[5 * m], hy = f.heads[5 * m + 1], d = Math.hypot(hx - f.x, hy - f.y);
    heads.push({m, d, eta: Math.max(0, d - 2 * ro) / (BOOST_SP * PX)});
  }
  heads.sort((a, b) => a.eta - b.eta);
  const use = heads.filter(h => h.eta <= O.H).slice(0, O.OCC_MAX_HEADS), unknownHeads = heads.filter(h => h.eta <= O.H).length - use.length;
  let scenTotal = 0;
  for (const h of use) {
    const m = h.m, hx = f.heads[5 * m], hy = f.heads[5 * m + 1], ha = f.heads[5 * m + 2], hsp = f.heads[5 * m + 3], hsc = f.heads[5 * m + 4], rh = R * hsc;
    const w = turnRate(hsc), cs = cruiseSp(hsc), dv = (BOOST_SP - cs) / RAMP, id = f.hid[m];
    const scen = [];
    if (O.MODE === 'core') scen.push({turn: 0, hold: 0, boost: hsp > 8, core: true});   // core = what every scenario shares: the next CORE_T s straight
    else for (const boost of [false, true]) { scen.push({turn: 0, hold: 0, boost}); for (const hold of O.HEAD_TURN_HOLDS) for (const dir of [1, -1]) scen.push({turn: dir, hold, boost}); }
    scen.forEach((sc, si) => {
      const idx = scenTotal + si; let x = hx, y = hy, a = ha, sp = hsp, t = 0;   // relative time
      const tEnd = sc.core ? O.CORE_T : O.H;
      while (t < tEnd - 1e-9) {
        const dt = Math.min(O.HEAD_SUBDT, tEnd - t), turning = sc.turn !== 0 && t < sc.hold;
        const target = sc.boost ? BOOST_SP : cs; sp = sp < target ? Math.min(target, sp + dv * dt) : Math.max(target, sp - dv * dt);
        const a2 = a + (turning ? sc.turn * w * dt : 0), am = a + (a2 - a) / 2, v = sp * PX;
        const nx = x + v * dt * Math.cos(am), ny = y + v * dt * Math.sin(am);
        caps.push({x1: x, y1: y, x2: nx, y2: ny, r: rh, tOn: t, tOff: Infinity, kind: 'newBody', sid: id, scen: idx});
        caps.push({x1: nx, y1: ny, x2: nx, y2: ny, r: rh + (O.HEAD_PAD - O.BODY_PAD), tOn: t, tOff: t + dt + .05, kind: 'head', sid: id, scen: idx});
        x = nx; y = ny; a = a2; t += dt;
      }
    });
    scenTotal += scen.length;
  }
  // ---- coarse grid index (cells overlapping each capsule's box) ----
  const grid = new Map(), key = (i, j) => i * 100003 + j;
  caps.forEach((c, ci) => {
    const rr = c.r + ro + O.BODY_PAD + 1, x0 = Math.min(c.x1, c.x2) - rr, x1 = Math.max(c.x1, c.x2) + rr, y0 = Math.min(c.y1, c.y2) - rr, y1 = Math.max(c.y1, c.y2) + rr;
    for (let i = Math.floor(x0 / GC); i <= Math.floor(x1 / GC); i++) for (let j = Math.floor(y0 / GC); j <= Math.floor(y1 / GC); j++) { const k = key(i, j); let l = grid.get(k); if (!l) { l = []; grid.set(k, l); } l.push(ci); }
  });
  const scenCount = scenTotal; let maxR = 0; for (const c of caps) if (c.r > maxR) maxR = c.r;
  // our head segment (x1,y1)->(x2,y2) over [t0,t1]: returns {kind, sid, scenHits(Set)} for possible hits; core = hit by every scenario of a snake
  const blockedSeg = (x1, y1, x2, y2, t0, t1, pad = O.BODY_PAD) => {
    const seen = new Set(), hits = [];
    const RR = maxR + ro + pad + 1, i0 = Math.floor((Math.min(x1, x2) - RR) / GC), i1 = Math.floor((Math.max(x1, x2) + RR) / GC), j0 = Math.floor((Math.min(y1, y2) - RR) / GC), j1 = Math.floor((Math.max(y1, y2) + RR) / GC);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = grid.get(key(i, j)); if (!l) continue;
      for (const ci of l) { if (seen.has(ci)) continue; seen.add(ci); const c = caps[ci];
        if (t1 < c.tOn || t0 >= c.tOff) continue;
        if (segSegDist(x1, y1, x2, y2, c.x1, c.y1, c.x2, c.y2) < c.r + ro + pad) hits.push(c); } }
    if (!hits.length) return null;
    const old = hits.find(c => c.kind === 'oldBody'); if (old) return {kind: 'oldBody', sid: old.sid, tailUnknown: old.tailUnknown, core: true};
    const head = hits.find(c => c.kind === 'head');
    const bySnake = new Map(); for (const c of hits) { if (!bySnake.has(c.sid)) bySnake.set(c.sid, new Set()); bySnake.get(c.sid).add(c.scen); }
    let core = O.MODE === 'core'; for (const [, set] of bySnake) if (set.size >= 14) core = true;
    return {kind: head ? 'head' : 'newBody', sid: hits[0].sid, core, scenarios: hits.length};
  };
  return {t: f.t, caps, blockedSeg, tails, unknownHeads, scenCount, ro};
}
