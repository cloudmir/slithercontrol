// Port of pilot.py (same inputs, same decisions): research/mod_parity.py js replays live records through both.
// Browser: window.SlpPilot. Node: load with vm (ext/test/replay.mjs).
// State s: x y ang sp sc L t, segs (flat x1 y1 x2 y2 r, tail -> head per snake), sid, heads (flat x y ang sp sc), hid,
// food (flat x y size), own (flat x y, tail -> head), wall [cx, cy, R].
// A named function so ext/mod.js can start the same code in a Worker (Blob of its source).
function slpPilotModule(root) {
'use strict';
const PI = Math.PI, TAU = 2 * Math.PI;
const R = 14.5, PX_PER_SP = 31, BOOST_SP = 14, RAMP = .57, DT = .08, N = 15, CELL = 2, HALF = 560;
const LONG_HALF = 1300, LONG_CELL = 6;
const rad = d => d * (PI / 180), deg = r => r * (180 / PI);
const ANGLES = []; for (let a = -180; a < 180; a += 15) ANGLES.push(rad(a));
const LONG_FAN = []; for (let a = -90; a < 91; a += 30) LONG_FAN.push(rad(a));
const K90 = ANGLES.indexOf(rad(90)), KM90 = ANGLES.indexOf(rad(-90)), K0 = ANGLES.indexOf(0);

function interp(x, xp, fp) {
  const n = xp.length;
  if (x <= xp[0]) return fp[0];
  if (x >= xp[n - 1]) return fp[n - 1];
  let j = 0; while (x >= xp[j + 1]) j++;
  return (fp[j + 1] - fp[j]) / (xp[j + 1] - xp[j]) * (x - xp[j]) + fp[j];
}
const cruiseSp = sc => interp(sc, [1, 1.4, 1.9, 2.6, 3.5], [5.79, 5.89, 6.12, 6.33, 6.83]);
// TURN_FIX (2026-09-27 analysis): saturated turns measured from black boxes are 12-18 % slower than the model at sc >= 2.
let TURN_FIX = false;
const turnRate = sc => rad(TURN_FIX ? interp(sc, [1, 1.5, 2, 2.5, 3, 3.5], [230, 215, 176, 147, 126, 110]) : interp(sc, [1, 2, 3.5], [230, 200, 130]));
function wrap(a) { let m = (a + PI) % TAU; if (m < 0) m += TAU; return m - PI; }
const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const hypot = (x, y) => Math.hypot(x, y);
const sign = Math.sign;
function roundEven(x) {       // numpy / Python round half to even
  const f = Math.floor(x), d = x - f;
  return d > .5 ? f + 1 : d < .5 ? f : (f % 2 === 0 ? f : f + 1);
}
function argmax(a) { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return k; }
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;

function segDist(px, py, S, k) {   // centre distance from (px, py) to segment k of flat S
  const ax = S[5 * k], ay = S[5 * k + 1], bx = S[5 * k + 2] - ax, by = S[5 * k + 3] - ay;
  const apx = px - ax, apy = py - ay;
  const t = clip((apx * bx + apy * by) / Math.max(bx * bx + by * by, 1e-9), 0, 1);
  const dx = apx - t * bx, dy = apy - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}

function makeParams(values) {
  const P = Object.assign({}, values);
  P.CALM_RATE = rad(P.CALM_RATE_DEG); P.MAX_REL = rad(P.MAX_REL_DEG);
  P.thickOff = r => interp(r, [R, 2 * R, 3.5 * R], [P.THICK_OFF_THIN, P.THICK_OFF_MID, P.THICK_OFF_THICK]);
  // BOUND_CAL (probe 2026-09-28, 60 games): we die when the drawn gap head->body falls below about -5 px (shallowest
  // quartile of 24 steady deaths; small snakes usually survive deeper, to about -ro). With the calibration on, bodies are
  // treated BOUND_GAP thinner, so every gap slider (SAFE, TIGHT, SAFE_HEADS, HARD, HARD_PHYS, THICK_OFF_*) reads
  // "px beyond the measured death boundary": 0 = riding on the boundary, + = farther away. Heads keep thickOff only.
  P.bodyOff = r => P.thickOff(r) + (P.BOUND_CAL ? P.BOUND_GAP : 0);
  TURN_FIX = !!P.TURN_FIX;
  return P;
}
// SIZE_PROFILE: at sc >= SIZE_SC (blend over +-0.3) the "big" values replace the user's (deaths/10 min 4.2 at L >= 4000).
const BIG = {SAFE: 18, SAFE_HEADS: 30, W_CROWD: 0, W_HUNT: 0, W_GOAL: 60, LONG_SAFE: 28, BOOST_COST: 54};

// Distance (px) from each cell of a grid around p to the nearest body surface (pilot.body_field): bodies drawn as
// capsules the way cv2.polylines draws them (fitted: 0.8 % of edge pixels differ), then OpenCV's 5x5 chamfer transform.
const HV = 65536, DIAG = 91750, LONG = 143976, DMAX = 536870911, SCALE = Math.fround(1 / 65536);
const BUF = new Map();      // n -> {img, T}: reused every tick (a fresh 1.3 MB per tick kept the GC busy)
function bodyField(P, px, py, S, sid, keep, cell, half) {
  const n = Math.trunc(2 * half / cell), ox = px - half, oy = py - half, W = n + 4;
  if (!BUF.has(n)) BUF.set(n, {img: new Uint8Array(n * n), T: new Int32Array(W * (n + 4))});
  const {img, T} = BUF.get(n);
  img.fill(1);
  const idx = []; for (let k = 0; k < keep.length; k++) if (keep[k]) idx.push(k);
  let a = 0;
  while (a < idx.length) {
    let b = a + 1;
    while (b < idx.length) {
      const k = idx[b], k0 = idx[b - 1];
      if (sid[k] !== sid[k0] || Math.abs(S[5 * k] - S[5 * k0 + 2]) + Math.abs(S[5 * k + 1] - S[5 * k0 + 3]) > 1e-3) break;
      b++;
    }
    const r = S[5 * idx[a] + 4];
    const t = Math.max(1, Math.trunc(roundEven(2 * (r + P.bodyOff(r)) / cell)));
    const hw = (t > 1 ? (t + (t & 1)) / 2 : .5) + .5;
    const pts = [];
    for (let m = a; m < b; m++) pts.push([roundEven((S[5 * idx[m]] - ox) / cell * 4) / 4, roundEven((S[5 * idx[m] + 1] - oy) / cell * 4) / 4]);
    const e = idx[b - 1];
    pts.push([roundEven((S[5 * e + 2] - ox) / cell * 4) / 4, roundEven((S[5 * e + 3] - oy) / cell * 4) / 4]);
    for (let m = 0; m + 1 < pts.length; m++) capsule(img, n, pts[m], pts[m + 1], hw);
    a = b;
  }
  // OpenCV distanceTransform(DIST_L2, DIST_MASK_5): integer chamfer, two passes, 2-pixel DMAX border.
  T.fill(DMAX);
  for (let i = 0; i < n; i++) {
    const row = (i + 2) * W + 2;
    for (let j = 0; j < n; j++) {
      const q = row + j;
      if (!img[i * n + j]) { T[q] = 0; continue; }
      let t0 = T[q - 2 * W - 1] + LONG, v;
      if ((v = T[q - 2 * W + 1] + LONG) < t0) t0 = v;
      if ((v = T[q - W - 2] + LONG) < t0) t0 = v;
      if ((v = T[q - W - 1] + DIAG) < t0) t0 = v;
      if ((v = T[q - W] + HV) < t0) t0 = v;
      if ((v = T[q - W + 1] + DIAG) < t0) t0 = v;
      if ((v = T[q - W + 2] + LONG) < t0) t0 = v;
      if ((v = T[q - 1] + HV) < t0) t0 = v;
      T[q] = t0;
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    const row = (i + 2) * W + 2;
    for (let j = n - 1; j >= 0; j--) {
      const q = row + j;
      let t0 = T[q], v;
      if (t0 > HV) {
        if ((v = T[q + 2 * W + 1] + LONG) < t0) t0 = v;
        if ((v = T[q + 2 * W - 1] + LONG) < t0) t0 = v;
        if ((v = T[q + W + 2] + LONG) < t0) t0 = v;
        if ((v = T[q + W + 1] + DIAG) < t0) t0 = v;
        if ((v = T[q + W] + HV) < t0) t0 = v;
        if ((v = T[q + W - 1] + DIAG) < t0) t0 = v;
        if ((v = T[q + W - 2] + LONG) < t0) t0 = v;
        if ((v = T[q + 1] + HV) < t0) t0 = v;
        T[q] = t0;
      }
    }
  }
  return {T, n, W, ox, oy, cell};      // valid until the next call with this n (next tick)
}
function capsule(img, n, a, b, hw) {
  // Pixel centres within hw of segment ab. The capsule is convex, so each row is one run: the union of the two end
  // discs and the band |perpendicular| <= hw with 0 <= projection <= |ab|.
  const y0 = Math.max(0, Math.ceil(Math.min(a[1], b[1]) - hw)), y1 = Math.min(n - 1, Math.floor(Math.max(a[1], b[1]) + hw));
  const abx = b[0] - a[0], aby = b[1] - a[1], L = Math.sqrt(abx * abx + aby * aby), hw2 = hw * hw;
  const ux = L > 1e-9 ? abx / L : 1, uy = L > 1e-9 ? aby / L : 0;
  for (let y = y0; y <= y1; y++) {
    let lo = Infinity, hi = -Infinity;
    for (const c of [a, b]) {
      const dy = y - c[1];
      if (dy * dy <= hw2) { const h = Math.sqrt(hw2 - dy * dy); lo = Math.min(lo, c[0] - h); hi = Math.max(hi, c[0] + h); }
    }
    if (L > 1e-9) {
      // x-range where 0 <= (p-a).u <= L and |(p-a) x u| <= hw, for p = (x, y)
      let xl = -Infinity, xr = Infinity;
      const dy = y - a[1];
      const slab = (k, c0, lo_, hi_) => {      // lo_ <= k*x + c0 <= hi_
        if (Math.abs(k) < 1e-12) { if (c0 < lo_ || c0 > hi_) { xl = Infinity; xr = -Infinity; } return; }
        let e1 = (lo_ - c0) / k, e2 = (hi_ - c0) / k;
        if (e1 > e2) { const t = e1; e1 = e2; e2 = t; }
        xl = Math.max(xl, e1); xr = Math.min(xr, e2);
      };
      slab(ux, -a[0] * ux + dy * uy, 0, L);                  // projection
      slab(-uy, a[0] * uy + dy * ux, -hw, hw);               // cross product (x - ax)*uy' ...
      if (xl <= xr) { lo = Math.min(lo, xl); hi = Math.max(hi, xr); }
    }
    if (lo > hi) continue;
    const xa = Math.max(0, Math.ceil(lo)), xb = Math.min(n - 1, Math.floor(hi));
    if (xa <= xb) img.fill(0, y * n + xa, y * n + xb + 1);
  }
}
function fieldGap(f, x, y) {
  const j = Math.floor((x - f.ox) / f.cell), i = Math.floor((y - f.oy) / f.cell);
  if (!(i >= 0 && j >= 0 && i < f.n && j < f.n)) return 1e3;
  return Math.fround(Math.min(Math.fround(Math.min(f.T[(i + 2) * f.W + j + 2], DMAX) * SCALE), 1e4) * f.cell);
}

// Our head over the next 1.2 s for each (heading, boost): the previous command holds until LAT (pilot.paths).
function paths(P, px, py, ang, sp, sc, prev, hd, bst, prevBoost) {
  const w = turnRate(sc), cs = cruiseSp(sc), rate = (BOOST_SP - cs) / RAMP, C2 = hd.length;
  const ramp = (v0, up, dt) => up ? Math.min(BOOST_SP, v0 + rate * dt) : Math.max(cs, v0 - rate * dt);
  const hL = ang + clip(wrap(prev - ang), -w * P.LAT, w * P.LAT), spL = ramp(sp, prevBoost, P.LAT);
  const t = [], pos = new Float64Array(C2 * N * 2);
  for (let k = 0; k < N; k++) t.push((k + 1) * DT);
  for (let c = 0; c < C2; c++) {
    const d = wrap(hd[c] - hL);
    let cx = 0, cy = 0;
    for (let k = 0; k < N; k++) {
      const tm = t[k] - DT / 2, after = Math.max(tm - P.LAT, 0);
      const h = tm < P.LAT ? ang + clip(wrap(prev - ang), -w * tm, w * tm) : hL + sign(d) * Math.min(Math.abs(d), w * after);
      const v = (tm < P.LAT ? ramp(sp, prevBoost, Math.min(tm, P.LAT))
        : bst[c] ? Math.min(BOOST_SP, spL + rate * after) : Math.max(cs, spL - rate * after)) * PX_PER_SP;
      cx += v * DT * Math.cos(h); cy += v * DT * Math.sin(h);
      pos[(c * N + k) * 2] = px + cx; pos[(c * N + k) * 2 + 1] = py + cy;
    }
  }
  return {pos, t};
}
function coilPath(P, px, py, ang, sp, sc, prev, dir, prevBoost) {
  const w = turnRate(sc), cs = cruiseSp(sc), rate = (BOOST_SP - cs) / RAMP;
  const ramp = (v0, up, dt) => up ? Math.min(BOOST_SP, v0 + rate * dt) : Math.max(cs, v0 - rate * dt);
  const hL = ang + clip(wrap(prev - ang), -w * P.LAT, w * P.LAT), spL = ramp(sp, prevBoost, P.LAT);
  const pos = new Float64Array(N * 2), t = [];
  let cx = 0, cy = 0;
  for (let k = 0; k < N; k++) {
    t.push((k + 1) * DT);
    const tm = t[k] - DT / 2;
    const h = tm < P.LAT ? ang + clip(wrap(prev - ang), -w * tm, w * tm) : hL + dir * w * Math.max(tm - P.LAT, 0);
    const v = (tm < P.LAT ? ramp(sp, prevBoost, Math.min(tm, P.LAT)) : Math.max(cs, spL - rate * Math.max(tm - P.LAT, 0))) * PX_PER_SP;
    cx += v * DT * Math.cos(h); cy += v * DT * Math.sin(h);
    pos[2 * k] = px + cx; pos[2 * k + 1] = py + cy;
  }
  return {pos, t};
}
// Where a head will be over 1.2 s: its speed and a surprise boost, straight and (turning) along its arc.
function headPaths(h, omega) {
  const t = []; for (let k = 0; k < N; k++) t.push((k + 1) * DT);
  const rate = (BOOST_SP - cruiseSp(h[4])) / RAMP, tr = turnRate(h[4]);
  omega = clip(omega || 0, -tr, tr);
  const pts = [], ts = [];
  for (const w of (Math.abs(omega) > .5 ? [0, omega] : [0])) {
    for (const boost of [false, true]) {
      let cx = 0, cy = 0;
      for (let k = 0; k < N; k++) {
        const hdg = h[2] + w * (t[k] - DT / 2), v = boost ? Math.min(BOOST_SP, Math.max(h[3], 4) + rate * t[k]) : Math.max(h[3], 4);
        const st = v * PX_PER_SP * DT;
        cx += st * Math.cos(hdg); cy += st * Math.sin(hdg);
        pts.push(h[0] + cx, h[1] + cy); ts.push(t[k]);
      }
    }
  }
  return {pts, ts};
}

function uniqueSorted(vals) { return [...new Set(vals)].sort((a, b) => a - b); }

// Narrowing corridor: the nearest body within CORRIDOR_W on each side of our heading (ahead or level) belongs to two
// different snakes A and B, and B's head is within SQUEEZE_R running within 60 deg of our heading. Worst case: B cuts in
// toward our path ahead by SQUEEZE_ANGLE at its full turn rate (and by half of it), then goes straight.
function findSqueeze(P, px, py, ang, ro, S, sid, nearAll, heads) {
  const ux = Math.cos(ang), uy = Math.sin(ang), wall = new Map();
  for (let k = 0; k < sid.length; k++) {
    const g = nearAll[k] - ro;
    if (g > P.CORRIDOR_W) continue;
    const mx = (S[5 * k] + S[5 * k + 2]) / 2 - px, my = (S[5 * k + 1] + S[5 * k + 3]) / 2 - py;
    const f = mx * ux + my * uy, side = Math.sign(ux * my - uy * mx);
    if (f < -60 || f > 600 || !side) continue;
    if (!wall.has(side) || g < wall.get(side).gap) wall.set(side, {id: sid[k], gap: g, pt: [mx + px, my + py]});
  }
  if (wall.size < 2 || wall.get(1).id === wall.get(-1).id) return null;
  let best = null;
  for (const side of [1, -1]) for (const h of heads) {
    if (h.id !== wall.get(side).id) continue;
    const rx = h[0] - px, ry = h[1] - py, dist = hypot(rx, ry);
    if (dist > P.SQUEEZE_R || Math.cos(wrap(h[2] - ang)) < .5) continue;
    if (!best || dist < best.dist) best = {side, h, dist, ahead: rx * ux + ry * uy};
  }
  if (!best) return null;
  const h = best.h, tr = turnRate(h[4]), cs = cruiseSp(h[4]), v0 = Math.max(h[3], 4);
  const aim = Math.atan2(py + uy * 150 - h[1], px + ux * 150 - h[0]);
  const dir = Math.sign(wrap(aim - h[2])) || -best.side;
  const cut = (angle, secs, boost) => {
    const pts = [], ts = [];
    let x = h[0], y = h[1], hd = h[2], turned = 0;
    for (let k = 1; k <= Math.round(secs / DT); k++) {
      const step = Math.min(tr * DT, angle - turned);
      hd += dir * step; turned += step;
      const v = (boost ? Math.min(BOOST_SP, v0 + (BOOST_SP - cs) / RAMP * k * DT) : v0) * PX_PER_SP;
      x += v * DT * Math.cos(hd); y += v * DT * Math.sin(hd);
      pts.push(x, y); ts.push(k * DT);
    }
    return {pts, ts};
  };
  const A = rad(P.SQUEEZE_ANGLE), rB = R * h[4];
  const out = {short: [cut(A / 2, N * DT, false), cut(A, N * DT, false), cut(A / 2, N * DT, true), cut(A, N * DT, true)],
    long: [cut(A / 2, N * DT + P.LONG_T, false), cut(A, N * DT + P.LONG_T, false)],
    rB: rB + P.bodyOff(rB), ahead: best.ahead, h, A: wall.get(-best.side), B: wall.get(best.side), box: null};
  const m = ro + rB + P.bodyOff(rB) + 100;       // ray points farther than this from every cut-in point cannot matter
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of out.long) for (let j = 0; j < l.pts.length; j += 2) {
    x0 = Math.min(x0, l.pts[j]); x1 = Math.max(x1, l.pts[j]); y0 = Math.min(y0, l.pts[j + 1]); y1 = Math.max(y1, l.pts[j + 1]);
  }
  out.box = [x0 - m, y0 - m, x1 + m, y1 + m];
  return out;
}

// Narrow passages between two different snakes near us (pilot.find_gaps).
function findGaps(P, px, py, S, sid, nearAll, ro) {
  const gaps = [], ns = sid.length;
  if (!ns) return gaps;
  const close = nearAll.map(v => v < P.GAP_R);
  const minBy = new Map();
  for (let k = 0; k < ns; k++) minBy.set(sid[k], Math.min(minBy.has(sid[k]) ? minBy.get(sid[k]) : Infinity, nearAll[k]));
  const ids = uniqueSorted(sid.filter((_, k) => close[k])).sort((a, b) => minBy.get(a) - minBy.get(b)).slice(0, 4);
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    const A = [], B = [];
    for (let k = 0; k < ns; k++) if (close[k]) { if (sid[k] === ids[a]) A.push(k); else if (sid[k] === ids[b]) B.push(k); }
    const pa = A.map(k => [S[5 * k], S[5 * k + 1]]); const la = A[A.length - 1]; pa.push([S[5 * la + 2], S[5 * la + 3]]);
    let best = Infinity, bi = 0, bj = 0;
    for (let i = 0; i < pa.length; i++) for (let j = 0; j < B.length; j++) {
      const d = segDist(pa[i][0], pa[i][1], S, B[j]);
      if (d < best) { best = d; bi = i; bj = j; }
    }
    const q = pa[bi], k = B[bj], ax = S[5 * k], ay = S[5 * k + 1], abx = S[5 * k + 2] - ax, aby = S[5 * k + 3] - ay;
    const tt = clip(((q[0] - ax) * abx + (q[1] - ay) * aby) / Math.max(abx * abx + aby * aby, 1e-9), 0, 1);
    const sx = ax + tt * abx - q[0], sy = ay + tt * aby - q[1], dist = hypot(sx, sy);
    const rA = S[5 * A[0] + 4], rB = S[5 * B[0] + 4], ea = rA + P.bodyOff(rA), eb = rB + P.bodyOff(rB);
    const w = dist - ea - eb;
    if (!(2 * ro < w && w <= 2 * ro + P.GAP_EXTRA)) continue;
    const ux = sx / Math.max(dist, 1e-9), uy = sy / Math.max(dist, 1e-9);
    const m = [q[0] + ux * (ea + w / 2), q[1] + uy * (ea + w / 2)];
    if (hypot(m[0] - px, m[1] - py) > P.GAP_R) continue;
    let ch = [-uy, ux];
    if (ch[0] * (m[0] - px) + ch[1] * (m[1] - py) < 0) ch = [-ch[0], -ch[1]];
    gaps.push({m, ch, w, ra: rA, rb: rB, ids: [ids[a], ids[b]]});
  }
  return gaps;
}

class Pilot {
  constructor(values, profile) {
    this.values = values; this.P = makeParams(values); this.profile = profile || 'safe'; this.period = 1 / 30;
    this.sizedT = 0; this.wrapTarget = null; this.lastAway = null; this.lastWrap = null; 
    this.giantSince = new Map(); this.giantTarget = null; this.escId = null; this.v2last = null;
    this.prev = null; this.last = {}; this.turnSign = 0; this.seen = new Map(); this.prevBoost = false;
    this.wallPrev = null; this.wallRate = 0; this.v3h = new Map(); this.v3plan = null; this.v3route = null;
    this.closeHeads = new Map(); this.diedNear = 0; this.kills = 0; this.covHist = [];
    this.pending = new Map(); this.bigPrev = [];
    this.hist = []; this.wp = null; this.wpUntil = -1;
    this.coilDir = 0; this.coilLowSince = null; this.escLock = null; this.lastCoil = null;
    this.side = 0; this.sideUntil = -1; this.pend = null; this.boostSince = -1;
  }
  setParams(values, profile) { this.values = values; this.P = makeParams(values); this.sizedT = 0; this.Psized = null; if (profile) this.profile = profile; }
  sized(sc) {          // P for this size: the user's values, blended into BIG above SIZE_SC (SIZE_PROFILE)
    const V = this.values;
    if (!V.SIZE_PROFILE) return this.P;
    const t = Math.round(clip((sc - (V.SIZE_SC - .3)) / .6, 0, 1) * 20) / 20;
    if (t !== this.sizedT || !this.Psized) {
      const v = Object.assign({}, V);
      for (const k in BIG) v[k] = V[k] + (BIG[k] - V[k]) * t;
      this.Psized = makeParams(v); this.sizedT = t;
    }
    return this.Psized;
  }

  // ---------- PROBE (user 2026-09-28: "a. x 두께일 때 b. 어디까지는 죽지 않는 경계" — x·y as many as possible, by real tests) ----------
  // Rides beside another snake's laid trail (static once laid) at a set drawn gap and tightens it 1 px at a time until we die;
  // every level held steadily is an alive point, the level at death the death point for (our r, its r). Sliders are ignored
  // (PROBE_GAP0 / PROBE_JUMP / PROBE_STEP only); the normal pilot takes over for a moment when another snake gets close.
  probeStep(s) {
    const px = s.x, py = s.y, ang = s.ang, sp = s.sp, sc = s.sc, T = s.t, ro = R * sc, V = this.values;
    const S = s.segs, sid = s.sid, ns = sid.length;
    const pr = this.probe || (this.probe = {id: null, set: V.PROBE_GAP0, since: T, err: [], stable: [], phase: 'seek', lost: 0, dodgeUntil: -1});
    const done = (cmd, boost, phase, extra) => {
      const gapM = extra && extra.gap !== undefined ? extra.gap : null;
      const trace = {mode: 'probe', boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: null, threat: 0, enclosed: 0, wrap: 0, thr: null,
        eat: 0, goal: 0, thread: null, L: s.L, sc: r2(sc), died_near: this.diedNear, kills: this.kills, big: 0, curl: 0, prof: this.profile, onward: null,
        nh: s.hid.length, hold_by: null, esc: null, cov: 0, cov_id: null, cov_free: 24, sized: 0, guard: null, gforce: 0, gatk: 0, giant: 0, raid: 0,
        gap: null, squeeze: null, pph: phase === 'seek' ? 0 : phase === 'follow' ? 1 : 2, pset: phase === 'follow' ? r1(pr.set) : null,
        pgap: gapM === null ? null : r1(gapM), ptr: extra && extra.rt !== undefined ? r1(extra.rt) : null, ptid: pr.id, pstab: pr.stable.length};
      this.last = {mode: 'probe', trace, draw: {chosen: extra && extra.path ? extra.path : [], safe: [], pos: new Float64Array(0), N, C2: 0, i: 0,
        near: extra && extra.near ? extra.near : [], gaps: [], goal: null, crowdAt: null, wp: null, attacker: null, ro, analysis: null}};
      this.prev = cmd; this.prevBoost = boost;
      return [cmd, boost];
    };
    // snakes: segment index lists (observation order = tail -> head), lengths, heads
    const bySnake = new Map();
    for (let k = 0; k < ns; k++) { const id = sid[k]; if (!bySnake.has(id)) bySnake.set(id, []); bySnake.get(id).push(k); }
    const headOf = new Map();
    for (let m = 0; m < s.hid.length; m++) headOf.set(s.hid[m], [s.heads[5 * m], s.heads[5 * m + 1], s.heads[5 * m + 2], s.heads[5 * m + 3]]);
    const nearest = ks => {          // nearest point of a polyline: [dist to centre line, k, t, x, y]
      let best = [Infinity, -1, 0, 0, 0];
      for (const k of ks) {
        const ax = S[5 * k], ay = S[5 * k + 1], bx = S[5 * k + 2] - ax, by = S[5 * k + 3] - ay, l2 = bx * bx + by * by;
        const t = l2 > 1e-9 ? clip(((px - ax) * bx + (py - ay) * by) / l2, 0, 1) : 0, x = ax + t * bx, y = ay + t * by, d = hypot(px - x, py - y);
        if (d < best[0]) best = [d, k, t, x, y];
      }
      return best;
    };
    // 1. danger from anything but the target's laid trail -> the normal pilot for this tick (it avoids the trail too)
    let danger = false;
    for (const [id, h] of headOf) {
      const d = hypot(h[0] - px, h[1] - py);
      if (id === pr.id ? d < 320 : d < 300 && Math.cos(h[2] - Math.atan2(py - h[1], px - h[0])) > .3) { danger = true; break; }
    }
    if (!danger) {
      const v = Math.max(sp, 5.8) * PX_PER_SP, ax = px + .5 * v * Math.cos(ang), ay = py + .5 * v * Math.sin(ang);
      for (let k = 0; k < ns && !danger; k++) {
        if (sid[k] === pr.id) continue;
        const g0 = segDist(px, py, S, k) - S[5 * k + 4] - ro, g1 = segDist(ax, ay, S, k) - S[5 * k + 4] - ro;
        if (g0 < 45 || g1 < 25) danger = true;
      }
    }
    if (danger) pr.dodgeUntil = T + .3;
    if (T < pr.dodgeUntil) {
      const r = this.pilotStep(s);
      const tr = this.last.trace; tr.pph = 2; tr.pset = null; tr.pgap = null; tr.ptr = null; tr.ptid = pr.id; tr.pstab = pr.stable.length;
      return r;
    }
    // 2. target: the thickest snake whose visible trail is >= 800 px long, nearest trail point <= 600 px and >= 250 px from its head
    const ok = id => {
      const ks = bySnake.get(id); if (!ks || ks.length < 3) return null;
      let len = 0; for (const k of ks) len += hypot(S[5 * k + 2] - S[5 * k], S[5 * k + 3] - S[5 * k + 1]);
      if (len < 800) return null;
      const nb = nearest(ks); if (nb[0] > 600) return null;
      const h = headOf.get(id); if (h && hypot(h[0] - nb[3], h[1] - nb[4]) < 250) return null;
      // straight enough: heading change over +-150 px around the nearest point <= 40 deg (radius >= ~430 px) (coils killed us on the chord)
      const i0 = ks.indexOf(nb[1]); let turnSum = 0, dl = 0, i = i0;
      const segAng = k => Math.atan2(S[5 * k + 3] - S[5 * k + 1], S[5 * k + 2] - S[5 * k]);
      for (const dir of [1, -1]) { let dl2 = 0, j = i0; while (dl2 < 150 && j + dir >= 0 && j + dir < ks.length) { turnSum += Math.abs(wrap(segAng(ks[j + dir]) - segAng(ks[j]))); dl2 += hypot(S[5 * ks[j] + 2] - S[5 * ks[j]], S[5 * ks[j] + 3] - S[5 * ks[j] + 1]); j += dir; } }
      if (turnSum > rad(40)) return null;
      return {id, ks, r: S[5 * ks[0] + 4], nb, len};
    };
    let tg = pr.id === null ? null : ok(pr.id);
    if (tg === null) {
      if (pr.id !== null) { pr.lost++; pr.id = null; }
      let best = null;
      for (const id of bySnake.keys()) { const c = ok(id); if (c && (best === null || c.r > best.r + .5 || (Math.abs(c.r - best.r) <= .5 && c.nb[0] < best.nb[0]))) best = c; }
      if (best) { tg = best; pr.id = best.id; pr.set = V.PROBE_GAP0; pr.since = T; pr.err = []; pr.phase = 'follow'; }
    }
    if (tg === null) {           // seek: nothing to ride beside -> the normal pilot wanders (it heads for the crowd / food)
      pr.phase = 'seek';
      const r = this.pilotStep(s);
      const tr = this.last.trace; tr.pph = 0; tr.pset = null; tr.pgap = null; tr.ptr = null; tr.ptid = null; tr.pstab = pr.stable.length;
      return r;
    }
    // 3. follow: pure pursuit on the line offset D from the trail, LOOK px ahead along our travel direction
    const rt = tg.r, [dist, k0, t0, nx, ny] = tg.nb, gapM = dist - ro - rt;
    let D = ro + rt + Math.max(pr.set, gapM - 25);          // approach in 25 px steps: 7/17 deaths came while still closing in on +4
    const vLat = pr.prevGap !== undefined && T > pr.prevT ? (gapM - pr.prevGap) / (T - pr.prevT) : 0;
    pr.prevGap = gapM; pr.prevT = T;
    if (vLat < -40 && gapM < pr.set + 40) D = ro + rt + gapM;   // closing too fast near the line: run parallel first
    const tx0 = S[5 * k0 + 2] - S[5 * k0], ty0 = S[5 * k0 + 3] - S[5 * k0 + 1], tl0 = hypot(tx0, ty0) || 1;
    const side = sign((tx0 / tl0) * (py - ny) - (ty0 / tl0) * (px - nx)) || 1;          // which side of the trail we are on
    const dir = Math.cos(ang - Math.atan2(ty0, tx0)) >= 0 ? 1 : -1;                     // along the observation order or against it
    const err = gapM - pr.set, look = Math.max(80, 2.5 * Math.abs(err));
    // walk `look` px along the polyline from (k0, t0)
    let ki = tg.ks.indexOf(k0), k = k0, t = t0, left = look, qx = nx, qy = ny, tx = tx0 / tl0, ty = ty0 / tl0, ended = false, bend = 0;
    for (let guard = 0; guard < 400 && left > 0; guard++) {
      if (guard) { const a1 = Math.atan2(S[5 * k + 3] - S[5 * k + 1], S[5 * k + 2] - S[5 * k]); bend += Math.abs(wrap(a1 - Math.atan2(ty, tx))); if (bend > rad(30)) break; }
      const ax = S[5 * k], ay = S[5 * k + 1], bx = S[5 * k + 2] - ax, by = S[5 * k + 3] - ay, L = hypot(bx, by) || 1e-9;
      const room = dir > 0 ? (1 - t) * L : t * L;
      if (left <= room) { t += dir * left / L; qx = ax + t * bx; qy = ay + t * by; tx = bx / L; ty = by / L; left = 0; break; }
      left -= room; ki += dir;
      if (ki < 0 || ki >= tg.ks.length) { ended = true; break; }
      k = tg.ks[ki]; t = dir > 0 ? 0 : 1; qx = S[5 * k] + t * (S[5 * k + 2] - S[5 * k]); qy = S[5 * k + 1] + t * (S[5 * k + 3] - S[5 * k + 1]);
    }
    const h = headOf.get(tg.id);
    if (ended || (h && hypot(h[0] - qx, h[1] - qy) < 250)) {     // trail runs out ahead (tail end or the head): let it go
      pr.id = null; pr.lost++; pr.phase = 'seek';
      const r = this.pilotStep(s);
      const tr = this.last.trace; tr.pph = 0; tr.pset = null; tr.pgap = r1(gapM); tr.ptr = r1(rt); tr.ptid = null; tr.pstab = pr.stable.length;
      return r;
    }
    const ox = qx - side * ty * D, oy = qy + side * tx * D;        // the offset point on our side of the trail
    const cmd = Math.atan2(oy - py, ox - px);
    if (Math.abs(wrap(cmd - ang)) > rad(100)) { pr.id = null; pr.lost++; }   // it is behind us: drop it, next tick seeks again
    // 4. gap schedule: steady = median |error| over the last 1 s < 3 px with >= 15 samples; each level held >= 0.5 s steady
    pr.err.push([T, Math.abs(err)]); while (pr.err.length && T - pr.err[0][0] > 1) pr.err.shift();
    const es = pr.err.map(e => e[1]).sort((a, b) => a - b), steady = es.length >= 15 && es[es.length >> 1] < 3;
    if (steady && T - pr.since >= .5) {
      pr.stable.push([r1(ro), r1(rt), pr.set, r1(T)]);
      pr.set = pr.set === V.PROBE_GAP0 && V.PROBE_JUMP < V.PROBE_GAP0 ? V.PROBE_JUMP : Math.max(V.PROBE_FLOOR, pr.set - V.PROBE_STEP);
      pr.since = T; pr.err = [];
    }
    pr.phase = 'follow';
    return done(cmd, false, 'follow', {gap: gapM, rt, path: [px, py, ox, oy], near: [{id: tg.id, gap: gapM, x: nx, y: ny, r: rt}]});
  }

  // ================= V2 (user 2026-09-28: "안 죽는 절대 알고리즘" + "잔해를 누구보다 빨리") =================
  // One calculation for everything: every enemy head is assumed able to boost (434 px/s) at any moment; a maneuver's
  // value is its time-to-death (TTD) = the earliest moment along its path where either a body (or wall) is hit or an
  // enemy head could already be there (its shortest time to that point, turn rate included, <= our arrival time).
  // Maneuvers with TTD >= V2_TOK are "clear" and compete on food/remains; if none is clear the max-TTD maneuver wins.
  // No 1.2 s window: paths run V2_H seconds (turn at full rate toward the target heading, then straight).
  v2Step(s) {
    const V = this.values, P = this.P;
    const px = s.x, py = s.y, ang = s.ang, sp = s.sp, sc = s.sc, T = s.t, ro = R * sc;
    const S = s.segs, sid = s.sid, ns = sid.length, W0 = s.wall[0], W1 = s.wall[1], W2 = s.wall[2];
    const H = V.V2_H, DTV = .1, NPT = Math.round(H / DTV), TOK = V.V2_TOK, MARGIN = V.V2_MARGIN, LATV = P.LAT, coneR = rad(V.V2_CONE);
    const w = turnRate(sc), cs = cruiseSp(sc) * PX_PER_SP, vb = BOOST_SP * PX_PER_SP, rate = (vb - cs) / RAMP;
    // the command actually in effect (the tracker's last sent heading / boost when it runs; else our last decision)
    const prev = Number.isFinite(s.cmdNow) ? s.cmdNow : (this.prev === null ? ang : this.prev), prevBoost = typeof s.boostNow === 'boolean' ? s.boostNow : this.prevBoost;
    const canBoost = s.L >= V.V2_MINL;
    // bodies: distance fields (calibrated body radius via bodyOff inside)
    const nearAll = new Array(ns);
    for (let k = 0; k < ns; k++) nearAll[k] = segDist(px, py, S, k) - S[5 * k + 4];
    const v3 = !!V.V3_ON;                 // V3: no raster fields (10-18 ms); a 96 px capsule grid answers gapAt (calibrated radius via bodyOff)
    const field = v3 ? null : bodyField(P, px, py, S, sid, nearAll.map(v => v < P.REACH), CELL, HALF);
    const farField = v3 ? null : bodyField(P, px, py, S, sid, nearAll.map(v => v < LONG_HALF + 300), LONG_CELL, LONG_HALF);
    let bgrid = null;
    if (v3) { const GC = 96, cells = new Map(), pad = ro + V.V2_MARGIN + 12;
      for (let k = 0; k < ns; k++) { if (nearAll[k] > V.V3_OBS + 300) continue; const r = S[5 * k + 4], rr = r + P.bodyOff(r), e = rr + pad;
        for (let i = Math.floor((Math.min(S[5 * k], S[5 * k + 2]) - e) / GC); i <= Math.floor((Math.max(S[5 * k], S[5 * k + 2]) + e) / GC); i++) for (let j = Math.floor((Math.min(S[5 * k + 1], S[5 * k + 3]) - e) / GC); j <= Math.floor((Math.max(S[5 * k + 1], S[5 * k + 3]) + e) / GC); j++) {
          const key = i * 65536 + j; let l = cells.get(key); if (!l) { l = []; cells.set(key, l); } l.push(k); } }
      bgrid = (x, y) => { const l = cells.get(Math.floor(x / GC) * 65536 + Math.floor(y / GC)); if (!l) return 400;   // no capsule near: gap > MARGIN by construction
        let g = 400; for (const k of l) { const d = segDist(x, y, S, k) - S[5 * k + 4] - P.bodyOff(S[5 * k + 4]); if (d < g) g = d; } return g; };
    }
    // the arena shrinks as players leave (measured ~20 px/s; deaths 8/10 of the first V2 batch): extrapolate the boundary
    // over the horizon at the measured rate + 10 px/s and keep 30 px off it (nothing to gain by hugging the wall)
    if (this.wallPrev !== null) { const dt = T - this.wallPrev[0]; if (dt > .02 && dt < 3) this.wallRate += (clip((this.wallPrev[1] - W2) / dt, 0, 60) - this.wallRate) * .1; }
    this.wallPrev = [T, W2];
    const wallShrink = V.V2_WALLSHRINK ? this.wallRate + 10 : 0, wallPad = V.V2_WALLSHRINK ? 30 : 0;   // A2 switch
    const gapAt = (x, y, t) => {
      const d = hypot(x - px, y - py);
      const g = v3 ? bgrid(x, y) : d < HALF - 30 ? fieldGap(field, x, y) : fieldGap(farField, x, y);
      return Math.min(g, W2 - wallShrink * (t || 0) - wallPad - hypot(x - W0, y - W1)) - ro;
    };
    // enemy heads: [x, y, ang, r, omega]; every one may boost from now on (user rule)
    const heads = [];
    for (let m = 0; m < s.hid.length; m++) {
      const hx = s.heads[5 * m], hy = s.heads[5 * m + 1], hs = s.heads[5 * m + 4];
      if (hypot(hx - px, hy - py) > vb * H + 200) continue;
      heads.push([hx, hy, s.heads[5 * m + 2], R * hs, turnRate(hs), Math.max(s.heads[5 * m + 3], 5.8), s.heads[5 * m + 3] > 8]);
    }
    const reachT = (h, x, y) => {          // shortest time for head h to be at (x, y): max(travel, turn / rate)
      const d = hypot(x - h[0], y - h[1]) - ro - h[3];
      if (d <= 0) return 0;
      const turn = Math.abs(wrap(Math.atan2(y - h[1], x - h[0]) - h[2]));
      if (turn > coneR) return Infinity;      // V2_CONE: a head that must turn more than this first shows the turn (>= 0.4 s) before it can matter
      // travel: boosting heads at 434 px/s; a cruising head needs the ramp (its cruise speed for 0.3 s, then boost)
      const c0 = h[5] * PX_PER_SP * .3, travel = h[6] ? d / vb : (d <= c0 ? d / (h[5] * PX_PER_SP) : .3 + (d - c0) / vb);
      return Math.max(travel, turn / h[4]);
    };
    // chargers: a boosting head heading our way (or any head within 350 px pointing at us). Its predicted sweep - pursuit
    // of our head at boost speed, turn-limited - is laid progressively as a body: a path that crosses it AFTER the charger
    // has passed there is a death (the cut). Reachability (ttdH) cannot tell candidates apart against a fast charger; this can.
    const chargers = [];
    if (V.V2_CHG && !v3) for (let m = 0; m < s.hid.length && chargers.length < 4; m++) {   // A5 switch (no live evidence yet)
      const hx = s.heads[5 * m], hy = s.heads[5 * m + 1], ha = s.heads[5 * m + 2], hsp = s.heads[5 * m + 3], hsc = s.heads[5 * m + 4];
      const d = hypot(hx - px, hy - py); if (d > V.V2_CHGR) continue;
      const off = Math.abs(wrap(Math.atan2(py - hy, px - hx) - ha));
      if (!(hsp > 8 ? off < rad(90) : d < 350 && off < rad(30))) continue;
      const wc = turnRate(hsc), pts = new Float64Array(2 * NPT + 2);
      let cx = hx, cy = hy, ca = ha, v = Math.max(hsp, 5.8) * PX_PER_SP, k = 0, near = 0, k0 = -1;
      pts[0] = cx; pts[1] = cy;
      for (k = 1; k <= NPT; k++) {
        const da = wrap(Math.atan2(py - cy, px - cx) - ca); ca += sign(da) * Math.min(Math.abs(da), wc * DTV);
        v = Math.min(vb, v + rate * DTV); cx += v * DTV * Math.cos(ca); cy += v * DTV * Math.sin(ca); pts[2 * k] = cx; pts[2 * k + 1] = cy;
        if (hypot(cx - px, cy - py) < 900) { near = k; if (k0 < 0) k0 = k; }
        if (k > near + 10) break;                                  // past us and away: the rest cannot matter
      }
      if (k0 < 0) continue;                                        // never comes within 900 px in the horizon
      chargers.push({pts, n: Math.min(k, NPT), k0: Math.max(0, k0 - 3), lim: R * hsc + ro + MARGIN});
    }
    const chargerHit = (x, y, t) => {      // our point at time t vs the sweep laid by then (+0.2 s of head reach)
      for (const c of chargers) {
        const kEnd = Math.min(c.n, Math.round(t / DTV) + 2), p = c.pts;
        for (let k = c.k0; k < kEnd; k++) {                        // only the part of the sweep near us
          const x1 = p[2 * k], y1 = p[2 * k + 1], dx = p[2 * k + 2] - x1, dy = p[2 * k + 3] - y1, l2 = dx * dx + dy * dy;
          const u = l2 < 1e-9 ? 0 : clip(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1);
          if (hypot(x - x1 - u * dx, y - y1 - u * dy) < c.lim) return true;
        }
      }
      return false;
    };
    // food: remains heaps (250 px cells of sz >= REMAINS) and single food along the path
    const F = s.food, nf = F.length / 3, food = [], cells = new Map();
    for (let f = 0; f < nf; f++) {
      const x = F[3 * f], y = F[3 * f + 1], z = F[3 * f + 2], d = hypot(x - px, y - py);
      if (d > vb * H + 100) continue;
      food.push(x, y, z, d);
      if (z >= V.V2_REMAINS) { const key = Math.floor(x / 250) + ',' + Math.floor(y / 250); const c = cells.get(key) || [0, 0, 0]; c[0] += x * z; c[1] += y * z; c[2] += z; cells.set(key, c); }
    }
    const heaps = [...cells.values()].filter(c => c[2] >= V.V2_HEAPMIN).map(c => ({x: c[0] / c[2], y: c[1] / c[2], mass: c[2]}));
    for (const hp of heaps) {            // rival: earliest head arrival (at its current speed, at least cruise)
      let tr = Infinity;
      for (const h of heads) { const d = hypot(hp.x - h[0], hp.y - h[1]); tr = Math.min(tr, d / (Math.max(h[5], 5.8) * PX_PER_SP)); }
      hp.rival = tr;
    }
    // wrap watch (game 2 of the first V2 batch died in a slow giant wrap that V2 sat inside eating: arcs inside a loop look
    // "clear"): the snake covering most of the 24 bearings within V2_WRAPR px; at >= V2_WRAPCOV we go for the widest
    // opening, boosting, food ignored - the opening closes at the wrapper's head speed, we must reach it first
    let covMax = 0, covId = null, exitAng = null, exitWidth = 0, ringR = 0;
    if (V.V2_WRAP) {                       // A4 switch
      // cover is measured out to V2_WRAPR (the body observation radius): game 5 of the first batch was ringed at ~800 px by a
      // snake smaller than us, invisible to a 600 px / size-gated watch. A straight body covers < 180 deg from any point, so
      // V2_WRAPCOV > 0.5 means the body bends around us. The boundary counts as cover too (snake + wall pockets).
      const wallBins = new Array(24).fill(false);
      if (hypot(px - W0, py - W1) > W2 - V.V2_WRAPR) for (let b = 0; b < 24; b++) {
        const a = (b + .5) / 24 * TAU - PI;
        if (hypot(px + V.V2_WRAPR * Math.cos(a) - W0, py + V.V2_WRAPR * Math.sin(a) - W1) > W2) wallBins[b] = true;
      }
      const bySnake = new Map();
      for (let k = 0; k < ns; k++) {
        if (nearAll[k] >= V.V2_WRAPR || S[5 * k + 4] < V.V2_WRAPRATIO * ro) continue;
        const bx = (S[5 * k] + S[5 * k + 2]) / 2, by = (S[5 * k + 1] + S[5 * k + 3]) / 2;
        const bin = Math.floor((Math.atan2(by - py, bx - px) + PI) / TAU * 24) % 24;
        let e = bySnake.get(sid[k]); if (!e) { e = {bins: new Array(24).fill(false), dist: new Array(24).fill(Infinity)}; bySnake.set(sid[k], e); }
        e.bins[bin] = true; e.dist[bin] = Math.min(e.dist[bin], nearAll[k]);
      }
      for (const [id, e] of bySnake) {
        let own = 0, all = 0;
        for (let b = 0; b < 24; b++) { if (e.bins[b]) own++; if (e.bins[b] || wallBins[b]) all++; }
        if (own < 8) continue;                                   // needs a substantial body of its own around us (>= 120 deg)
        if (all / 24 > covMax) { covMax = all / 24; covId = id; }
      }
      if (covId !== null && covMax >= V.V2_WRAPCOV) {
        const e = bySnake.get(covId), bins = e.bins.map((b, i) => b || wallBins[i]), am = bins.indexOf(true);
        let run = [], cur = [];
        for (let k = 0; k < 24; k++) { const b = (k + am) % 24; if (!bins[b]) { cur.push(b); if (cur.length > run.length) run = cur.slice(); } else cur = []; }
        if (run.length) {
          exitWidth = run.length; const mid = run[run.length >> 1]; exitAng = (mid + .5) / 24 * TAU - PI;
          const ds = e.dist.filter(v => v < Infinity).sort((a, b) => a - b); ringR = ds[ds.length >> 1];
        }
      }
    }
    const wrapMode = exitAng !== null, ringClosed = covId !== null && covMax >= V.V2_WRAPCOV && !wrapMode;
    let wrapBoost = false;
    if (wrapMode) {                        // boost if the wrapper's head beats us to the exit point (just beyond its ring)
      const exD = Math.max(ringR, 300) + 150, ex = px + exD * Math.cos(exitAng), ey = py + exD * Math.sin(exitAng), tOur = exD / cs + Math.abs(wrap(exitAng - ang)) / w;
      for (let m = 0; m < s.hid.length; m++) if (s.hid[m] === covId) {   // at its current speed (a boost shows within 0.3 s)
        const hs = s.heads[5 * m + 3], hv = hs > 8 ? vb : Math.max(hs, 5.8) * PX_PER_SP;
        const th = (hypot(ex - s.heads[5 * m], ey - s.heads[5 * m + 1]) - 100) / hv;
        if (th < tOur + .5) wrapBoost = true;
      }
    }
    if (V.V3_ON) return this.v3Plan({s, px, py, ang, sp, sc, T, ro, w, cs, vb, rate, LATV, prev, prevBoost, canBoost, gapAt, food, heaps, wrapMode, exitAng, ringClosed, covMax, covId, exitWidth, wrapBoost, MARGIN});
    // candidates: 24 target headings x boost; each path turns to the target at full rate, then from t_b on continues as one of
    // three branches (straight / arc left / arc right at half rate) - the candidate's TTD is the best branch's (some way on)
    const rel = []; for (let a = -165; a <= 180; a += 15) rel.push(rad(a));
    const C = rel.length, C2 = 2 * C, ttdS = new Float64Array(C2), ttdA = new Float64Array(C2), ttdHS = new Float64Array(C2), ttdHA = new Float64Array(C2), objS = new Float64Array(C2), objA = new Float64Array(C2);
    const pathS = new Map(), pathA = new Map(), exitS = new Map(), exitA = new Map();
    const eatR = ro + P.EAT, eatR2 = eatR * eatR, foodN = food.length / 4, taken = new Uint8Array(foodN);
    const rollout = (target, boost, branch) => {
      let x = px, y = py, h = ang, v = sp * PX_PER_SP, t = 0, dead = H, deadS = H, deadH = H, got = 0;
      const pts = [], xt = [], heapHit = new Array(heaps.length).fill(Infinity), tb = clip(Math.abs(wrap(target - ang)) / w + .3, .6, 1.5);
      taken.fill(0);
      for (let k = 1; k <= NPT; k++) {
        t = k * DTV;
        const late = t > LATV, want = ((late ? boost : prevBoost) ? vb : cs);
        if (!late) { const d = wrap(prev - h); h += sign(d) * Math.min(Math.abs(d), w * DTV); }
        else if (t <= tb || branch === 0) { const d = wrap(target - h); h += sign(d) * Math.min(Math.abs(d), w * DTV); }
        else h += branch * w * .5 * DTV;
        v = v < want ? Math.min(want, v + rate * DTV) : Math.max(want, v - rate * DTV);
        x += v * DTV * Math.cos(h); y += v * DTV * Math.sin(h);
        if (k % 2 === 0) pts.push(x, y);
        if (V.V2_EXIT_ON) xt.push(x, y, t);
        if (gapAt(x, y, t) < MARGIN || (chargers.length && chargerHit(x, y, t))) { dead = t; deadS = t; break; }
        if (deadH === H) for (const hd of heads) if (reachT(hd, x, y) <= t) { deadH = t; break; }
        if (k % 2 === 0 && t <= 3) for (let f = 0; f < foodN; f++) if (!taken[f] && food[4 * f + 3] < v * t + 200) {
          const dx = food[4 * f] - x, dy = food[4 * f + 1] - y;
          if (dx * dx + dy * dy <= eatR2) { got += food[4 * f + 2] * Math.exp(-t / 4); taken[f] = 1; }
        }
        for (let j = 0; j < heaps.length; j++) if (heapHit[j] === Infinity && hypot(heaps[j].x - x, heaps[j].y - y) < 150) heapHit[j] = t;
      }
      return {dead: Math.min(deadS, deadH), deadS, deadH, got, heapHit, pts, xt, t};
    };
    // ---- (3) exit quality (Codex spec 2026-09-29): where a rollout first crosses V2_EXIT_EDGE, the clear width of the
    // cross-section at that time (static bodies + shrinking wall + head reach) and the first time it closes below
    // V2_EXIT_MIN_WIDTH -> slack = tClose - tReach. Evaluated only for the top candidates by value. ----
    const exitOf = (r) => {
      const out = {reachesEdge: false, tReach: null, widthClear: 0, tClose: null, slack: 0};
      if (!V.V2_EXIT_ON || !r.xt || r.xt.length < 6) return out;
      let k = -1; for (let i = 0; i + 2 < r.xt.length; i += 3) if (hypot(r.xt[i] - px, r.xt[i + 1] - py) >= V.V2_EXIT_EDGE) { k = i; break; }
      if (k < 0) return out;
      const ex = r.xt[k], ey = r.xt[k + 1], tR = r.xt[k + 2], pk = k >= 3 ? k - 3 : k, dirA = k >= 3 ? Math.atan2(ey - r.xt[pk + 1], ex - r.xt[pk]) : Math.atan2(ey - py, ex - px);
      const nx = -Math.sin(dirA), ny = Math.cos(dirA), SP = V.V2_EXIT_SAMPLE, SPAN = 200;
      const clearAt = (t) => {                    // contiguous clear width (px) of the section through the crossing point at time t
        // section blockers: static bodies + shrinking wall + heads that are actually boosting (the omniscient reach model of every
        // head makes any far section 'closed'; the occupancy model (V2_OCC) replaces this when validated)
        const ok = (u) => { const x = ex + u * nx, y = ey + u * ny; if (gapAt(x, y, t) < MARGIN) return false; for (const hd of heads) if (hd[6] && reachT(hd, x, y) <= t) return false; return true; };
        if (!ok(0)) return 0;
        let a = 0, b = 0; while (a < SPAN && ok(-(a + SP))) a += SP; while (b < SPAN && ok(b + SP)) b += SP;
        return a + b;
      };
      out.reachesEdge = true; out.tReach = tR; out.widthClear = clearAt(tR);
      if (out.widthClear >= V.V2_EXIT_MIN_WIDTH) { let tc = null; for (let t = tR + .25; t <= H + 1e-9; t += .25) if (clearAt(t) < V.V2_EXIT_MIN_WIDTH) { tc = t; break; }
        out.tClose = tc; out.slack = (tc === null ? H : tc) - tR; }
      return out;
    };
    const valueOf = (r, boost) => {        // path food + remains heaps (first arrival vs rivals) - boost cost
      let val = r.got;
      for (let j = 0; j < heaps.length; j++) if (r.heapHit[j] < Infinity) {
        const first = r.heapHit[j] < heaps[j].rival;
        val += V.V2_HEAPW * heaps[j].mass * (first ? 1 : .25) * Math.exp(-r.heapHit[j] / 4);
      }
      return boost ? val - V.V2_BCOST : val;
    };
    // per candidate two views, each internally consistent (clearance, head clearance, value, path from the SAME branch):
    // S = straight continuation (what we execute), A = best of the branches (arcs allowed; curved corridors, rings)
    for (let c = 0; c < C2; c++) {
      const boost = c >= C && canBoost, target = ang + rel[c % C];
      let bestB = null, rS = null;
      const consider = r => { const key = r.deadS * 10 + r.deadH;      // static clearance first (the body/corridor invariant), then head clearance
        if (bestB === null || key > bestB.key + 1e-9 || (Math.abs(key - bestB.key) < 1e-9 && r.got > bestB.got)) { bestB = r; bestB.key = key; } };
      for (const branch of [0, 1, -1]) { const r = rollout(target, boost, branch); if (branch === 0) rS = r; consider(r); }
      if (bestB.deadS < H) for (const branch of [2, -2]) consider(rollout(target, boost, branch));   // tight ring: full-rate coil (emergency only)
      ttdS[c] = rS.deadS; ttdHS[c] = rS.deadH; objS[c] = valueOf(rS, boost); pathS.set(c, rS.pts); exitS.set(c, rS);
      ttdA[c] = bestB.deadS; ttdHA[c] = bestB.deadH; objA[c] = valueOf(bestB, boost); pathA.set(c, bestB.pts); exitA.set(c, bestB);
    }
    // choose: (1) static tier - no path that hits a body sooner than the best available (up to V2_TOKS); (2) head tier -
    // within the static tier keep the maneuvers whose head clearance is within 0.5 s of the best (up to V2_TOK); (3) objective.
    // static clearance = the straight continuation (what we actually execute). "Arc later" branches only count when no
    // straight path is clear for V2_ARCMIN s (curved corridor, inside a ring): otherwise the arc is postponed every tick
    // until it is too late (wall deaths 8 and 10 of the first V2 batch)
    let sMaxS = -Infinity, sMaxA = -Infinity, hMax = -Infinity;
    for (let c = 0; c < C2; c++) { sMaxS = Math.max(sMaxS, ttdS[c]); sMaxA = Math.max(sMaxA, ttdA[c]); }
    // static tier from the straight view; head clearance / value / drawn path from the best branch (the closed-loop oracle
    // on the 10 V2 deaths: 8/10 alive vs 7/10 with the all-straight view, and larger minimum gaps)
    const useArc = !V.V2_STRAIGHT || sMaxS < V.V2_ARCMIN, tS = useArc ? ttdA : ttdS, tH = ttdHA, ob = objA, paths = useArc ? pathA : pathS, sMax = useArc ? sMaxA : sMaxS;   // A3 switch; drawn path = what we execute
    const exits = new Array(C2).fill(null), exitR = useArc ? exitA : exitS;
    this.v2dbg = {rel, ttdS: tS, ttdA, ttdH: tH, obj: ob, chosenPath: paths, gapAt, rollout};   // debug view for research/v2_frame.mjs (references only)
    const sNeed = Math.min(V.V2_TOKS, sMax - .2);
    for (let c = 0; c < C2; c++) if (tS[c] >= sNeed) hMax = Math.max(hMax, tH[c]);
    const hNeed = Math.min(TOK, hMax - .5);
    const safeNow = sMax >= V.V2_TOKS && hMax >= TOK, danger = V.V2_BOOSTFREE ? (hMax < TOK / 2 || sMaxA < 1.5) : false;   // A6 switch: free boost in danger (live evidence negative: batches 2/3 died boosting)
    let best = -1, bv = -Infinity, clearN = 0, exitWeak = false;
    if (wrapMode) {                       // leave through the opening, boosting; among those, the longest static clearance
      const inExit = c => Math.abs(wrap(ang + rel[c % C] - exitAng)) <= rad(V.V2_WRAPANG);
      let anyExit = false, hMaxW = -Infinity;
      for (let c = 0; c < C2; c++) if (inExit(c) && tS[c] >= 1) { anyExit = true; hMaxW = Math.max(hMaxW, tH[c]); }
      const hNeedW = Math.min(TOK, hMaxW - .5);        // head tier also inside the exit set (batch 2: exits taken into cutting heads)
      for (let c = 0; c < C2; c++) {
        if (anyExit && (!inExit(c) || tS[c] < 1 || tH[c] < hNeedW)) continue;
        clearN++;
        const vv = tS[c] * 10 + Math.min(tH[c], TOK) * 3 + ((c >= C && canBoost) === wrapBoost ? 20 : 0) - Math.abs(wrap(ang + rel[c % C] - exitAng)) * 4;
        if (vv > bv) { bv = vv; best = c; }
      }
    } else {
      // (3) exit eligibility inside the safety tiers: reaches the edge, wide enough, closes late enough. If any candidate is
      // open, only open ones compete; otherwise fall back to the tiers and flag exitWeak.
      const elig = []; for (let c = 0; c < C2; c++) if (tS[c] >= sNeed && tH[c] >= hNeed) elig.push(c);
      let open = [];
      if (V.V2_EXIT_ON && elig.length) {
        const top = elig.slice().sort((a, b) => ob[b] - ob[a]).slice(0, V.V2_EXIT_REFINE_TOP);
        for (const c of top) exits[c] = exitOf(exitR.get(c));
        open = top.filter(c => exits[c].reachesEdge && exits[c].widthClear >= V.V2_EXIT_MIN_WIDTH && exits[c].slack >= V.V2_EXIT_MIN_SLACK);
        exitWeak = open.length === 0;
      }
      const pool = open.length ? open : elig;
      for (const c of pool) {
        clearN++;
        const same = this.v2last !== null && Math.abs(wrap(ang + rel[c % C] - this.v2last[0])) < rad(8) && (c >= C && canBoost) === this.v2last[1];
        const ex = exits[c];
        const vv = (ringClosed ? tS[c] * 10 : ob[c] + (c >= C && danger ? V.V2_BCOST : 0)) + V.V2_WTTD * Math.min(tH[c], TOK) + (same ? V.V2_HYST : 0)
          + (ex ? V.V2_EXIT_WIDTH_W * Math.min(ex.widthClear, 200) + V.V2_EXIT_SLACK_W * Math.min(ex.slack, 2) : 0);
        if (vv > bv) { bv = vv; best = c; }
      }
    }
    const cmd = wrap(ang + rel[best % C]), boost = best >= C && canBoost;
    this.v2last = [cmd, boost]; this.prev = cmd; this.prevBoost = boost;
    const trace = {mode: wrapMode ? 'v2wrap' : ringClosed ? 'v2ring' : safeNow ? 'v2' : 'v2esc', boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: clearN, threat: 0, enclosed: 0, wrap: 0, thr: null,
      eat: r1(ob[best]), goal: heaps.length ? r1(Math.max(...heaps.map(h => h.mass))) : 0, thread: null, cov: r2(covMax), cov_id: covId, cov_free: exitWidth || 24, esc: exitAng === null ? null : r1(deg(exitAng)), L: s.L, sc: r2(sc), died_near: this.diedNear, kills: this.kills,
      big: 0, curl: 0, prof: this.profile, onward: null, nh: heads.length, hold_by: null, sized: 0,
      guard: null, gforce: 0, gatk: 0, giant: 0, wf: wrapMode ? 1 : 0, raid: 0, gap: null, squeeze: null, ttd: r1(Math.min(tS[best], tH[best])), ttds: r1(tS[best]), ttdh: r1(tH[best]), v2obj: r1(ob[best]), arc: useArc ? 1 : 0, chg: chargers.length,
      exit_width: exits[best] ? r1(exits[best].widthClear) : null, exit_reach: exits[best] && exits[best].tReach !== null ? r1(exits[best].tReach) : null, exit_close: exits[best] && exits[best].tClose !== null ? r1(exits[best].tClose) : null,
      exit_slack: exits[best] ? r1(exits[best].slack) : null, exit_unknown: V.V2_EXIT_ON ? (exits[best] ? 0 : 1) : null, exit_reason: !V.V2_EXIT_ON ? null : exitWeak ? 'weak' : exits[best] && exits[best].reachesEdge ? 'open' : 'none'};
    const v2pts = paths.get(best), v2plan = [0, px, py, ang, prevBoost ? 1 : 0];
    for (let i = 0; i + 1 < v2pts.length; i += 2) { const qx = v2pts[i], qy = v2pts[i + 1], ox = i ? v2pts[i - 2] : px, oy = i ? v2pts[i - 1] : py; v2plan.push(.2 * (i / 2 + 1), qx, qy, Math.atan2(qy - oy, qx - ox), boost ? 1 : 0); }
    this.last = {mode: trace.mode, trace, draw: {chosen: v2pts, safe: [], pos: new Float64Array(0), N, C2: 0, i: 0, near: [], gaps: [],
      goal: heaps.length ? heaps.reduce((a, b) => a.mass > b.mass ? a : b) : null, crowdAt: null, wp: null, attacker: null, ro, analysis: null}, plan: v2plan};
    return [cmd, boost];
  }

  // ================= V3 — threat-conditional available-path planner (Claude+Codex agreed design 2026-09-29, decision-v3-design) =================
  // Time base: now = 0 (old bodies and body laid from now on share it). Threats:
  //  * committed attacker (boost just started or steering at us while boosting, or a close boosting head; held V3_COMMIT_HOLD s) =
  //    a closed-loop PURSUER simulated per candidate path: zero reaction delay, boost, turn-limited, aims 0.5 s ahead of our planned
  //    head; we die when its head meets ours or our path crosses its laid trail; it dies (trail stays) when it runs deep into our
  //    persisting body or the body we laid earlier on the path (own-body shield = certain first collision only).
  //    (a fixed laid trajectory let it 'pass' our old position; a 5 s reach set blocked every path - offline 2026-09-30)
  //  * other heads lay NEW body along scenarios (straight at its speed = core, blocks; straight boost / pursuit after tau_e 0.15,
  //    0.30 / turn left, right = risk, auxiliary score only).
  // Search: LAT with the previous command, then V3_STEPS x V3_DT with 3 heading controls (hold / full-rate left / right) per boost
  // family, dominance key (24 px, 15 deg, boost), beam V3_BEAM1 -> 2 -> 3. Every leaf gets a cheap straight 5 s continuation; the top
  // V3_TOP get 3 branches + exit certification at V3_EDGE (clear width across the crossing, time until it closes); nothing beyond
  // V3_OBS is certified. Real contact = gap < 0; the V2_MARGIN band is a penalty, certification needs it kept. Budget V3_BUDGET ms:
  // when exceeded before any leaf was scored, the previous verified plan's command is replayed ('v3hold').
  v3Plan(c) {
    const V = this.values, P = this.P;
    const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), T0 = nowMs();
    const {s, px, py, ang, sp, sc, T, ro, w, cs, vb, rate, LATV, prev, prevBoost, canBoost, gapAt, food, heaps, wrapMode, exitAng, ringClosed, covMax, covId, exitWidth, wrapBoost, MARGIN} = c;
    const DTF = V.V3_DT, NS = V.V3_STEPS, HC = V.V3_HC, CDT = .1, NC = Math.round(HC / CDT), EDGE = V.V3_EDGE, OBS = V.V3_OBS, HPAD = V.V3_HEADPAD, BUDGET = V.V3_BUDGET;
    const BEAM = [V.V3_BEAM1, V.V3_BEAM2, V.V3_BEAM3], foodN = food.length / 4, eatR = ro + P.EAT, eatR2 = eatR * eatR, GC = 96;
    const cellOf = (x, y) => Math.floor(x / GC) * 65536 + Math.floor(y / GC);
    const segPt = (x, y, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, u = l2 < 1e-9 ? 0 : clip(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1); return hypot(x - x1 - u * dx, y - y1 - u * dy); };
    // ---- own body (tail -> head, flat): arc length from the tail; a point persists at time t while cum > vb * t (tail speed <= boost) ----
    const own = s.own, no = own.length / 2, ownCum = new Float64Array(no), ownGrid = new Map();
    for (let k = 1; k < no; k++) ownCum[k] = ownCum[k - 1] + hypot(own[2 * k] - own[2 * k - 2], own[2 * k + 1] - own[2 * k - 1]);
    const ownLen = no ? ownCum[no - 1] : 0;
    for (let k = 0; k < no; k++) { if (ownCum[k] > ownLen - 3 * ro) break; const key = cellOf(own[2 * k], own[2 * k + 1]); let l = ownGrid.get(key); if (!l) { l = []; ownGrid.set(key, l); } l.push(k); }
    const shieldHit = (x, y, t, lim) => {
      const i0 = Math.floor(x / GC), j0 = Math.floor(y / GC);
      for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) { const l = ownGrid.get(i * 65536 + j); if (!l) continue;
        for (const k of l) if (ownCum[k] > vb * t && hypot(own[2 * k] - x, own[2 * k + 1] - y) < lim) return true; }
      return false;
    };
    // ---- threats: committed heads -> pursuers; the others -> scenario capsules (relative time, CDT steps) in a 96 px grid ----
    const threats = [], purs = [], recs = new Map(), caps = [], sgrid = new Map(); let nCommit = 0, nShield = 0;
    const addCap = (cp) => { const ci = caps.length; caps.push(cp); const e = cp.lim + HPAD + 2;
      for (let i = Math.floor((Math.min(cp.x1, cp.x2) - e) / GC); i <= Math.floor((Math.max(cp.x1, cp.x2) + e) / GC); i++) for (let j = Math.floor((Math.min(cp.y1, cp.y2) - e) / GC); j <= Math.floor((Math.max(cp.y1, cp.y2) + e) / GC); j++) {
        const key = i * 65536 + j; let l = sgrid.get(key); if (!l) { l = []; sgrid.set(key, l); } l.push(ci); } };
    for (let m = 0; m < s.hid.length; m++) {
      const id = s.hid[m], hx = s.heads[5 * m], hy = s.heads[5 * m + 1], ha = s.heads[5 * m + 2], hsp = s.heads[5 * m + 3], hsc = s.heads[5 * m + 4];
      const d = hypot(hx - px, hy - py); if (d > vb * HC + OBS + 200) continue;
      const rh = R * hsc, wc = turnRate(hsc), hcs = cruiseSp(hsc) * PX_PER_SP, hrate = (vb - hcs) / RAMP, boosting = hsp > 8;
      const off = Math.abs(wrap(Math.atan2(py - hy, px - hx) - ha));
      const rec = this.v3h.get(id) || {boostSince: -1, commitUntil: -1, off, boosting: false};
      if (boosting && !rec.boosting) rec.boostSince = T; if (!boosting) rec.boostSince = -1;
      const steering = off < rad(35) || off < rec.off - rad(1.5);
      const commitNow = (boosting && off < rad(70) && (T - rec.boostSince < .6 || steering)) || (boosting && d < V.V3_CLOSE && off < rad(90));
      if (commitNow) rec.commitUntil = T + V.V3_COMMIT_HOLD;
      const committed = T < rec.commitUntil; if (committed) nCommit++;
      rec.off = off; rec.boosting = boosting; recs.set(id, rec);
      const th = {x: hx, y: hy, rh, id, committed, nRisk: 0, ha, wc, v0: Math.max(hsp, 5.8) * PX_PER_SP, hrate};
      threats.push(th);
      if (committed) { if (d < vb * HC + 200) purs.push(th); continue; }
      const near = d < 2 * OBS, list = [{turn: 0, boost: boosting, tau: Infinity}, {turn: 0, boost: true, tau: Infinity}];
      if (near) { for (const tau of [.15, .3]) list.push({turn: 0, boost: true, tau}); list.push({turn: 1, boost: boosting, tau: Infinity}, {turn: -1, boost: boosting, tau: Infinity}); }
      const lx = px + sp * PX_PER_SP * .5 * Math.cos(ang), ly = py + sp * PX_PER_SP * .5 * Math.sin(ang), shieldOk = d < OBS + 400 && no > 4, ti = threats.length - 1, lim = rh + ro;
      list.forEach((q, qi) => {
        let x = hx, y = hy, a = ha, v = th.v0; const block = qi === 0;
        for (let k = 1; k <= NC; k++) {
          const t = k * CDT;
          if (q.turn !== 0) { if (t <= 1) a += q.turn * wc * CDT; }
          else if (t > q.tau && hypot(lx - x, ly - y) > 1.5 * ro) { const da = wrap(Math.atan2(ly - y, lx - x) - a); a += sign(da) * Math.min(Math.abs(da), wc * CDT); }
          const want = q.boost && (q.tau === Infinity || t > q.tau) ? vb : (boosting ? vb : hcs);
          v = v < want ? Math.min(want, v + hrate * CDT) : Math.max(want, v - hrate * CDT);
          const nx = x + v * CDT * Math.cos(a), ny = y + v * CDT * Math.sin(a);
          addCap({x1: x, y1: y, x2: nx, y2: ny, lim, t0: t - CDT, th: ti, q: qi, block});
          x = nx; y = ny;
          if (shieldOk && shieldHit(x, y, t, rh + ro - V.V3_SHIELD)) { nShield++; break; }   // certain first collision with our body: no more body laid
        }
      });
      th.nRisk = list.length - 1;
    }
    this.v3h = recs; const T1 = nowMs();
    // ---- hit test of our head at (x, y) at time t: old bodies + wall (gapAt) and laid new body of the scenarios (head pad while it is the head) ----
    const hitAt = (x, y, t, riskSet, hard) => {
      if (gapAt(x, y, t) < (hard ? 0 : MARGIN)) return 'body';     // hard = real contact; the margin band is a penalty (minG), not a death
      if (hard && purs.length) { const r = reachHit(x, y, t); if (r) return r; }   // fine horizon only: the 5 s coarse check uses the pursuer simulation (a 5 s reach set blocked everything: live game 1)
      const l = sgrid.get(cellOf(x, y)); if (!l) return null;
      for (const ci of l) { const cp = caps[ci]; if (t < cp.t0) continue;
        if (segPt(x, y, cp.x1, cp.y1, cp.x2, cp.y2) < cp.lim + (t < cp.t0 + 2 * CDT ? HPAD : 0)) { if (cp.block) return t < cp.t0 + 2 * CDT ? 'head' : 'new'; if (riskSet) riskSet.add(cp.th * 16 + cp.q); } }
      return null;
    };
    // ---- reach set of a committed head for the FINE horizon (worst case while its reaction is not yet observable): it can be at
    // (x, y) by t = max(travel at boost, turn / rate) + detour round our persisting body when the straight chord runs through it
    const tailIdx = t => { let lo = 0, hi = Math.max(0, no - 1); const need = vb * t; while (lo < hi) { const mid = (lo + hi) >> 1; if (ownCum[mid] > need) hi = mid; else lo = mid + 1; } return lo; };
    const headEnd = (() => { let k = no - 1; while (k > 0 && ownCum[k] > ownLen - 3 * ro) k--; return k; })();
    const detour = (h, x, y, t) => {
      if (no < 4) return 0;
      const dx = x - h.x, dy = y - h.y, L = hypot(dx, dy), lim = h.rh + ro - V.V3_SHIELD; if (L < 1) return 0;
      const nstep = Math.ceil(L / 40), need = vb * t; let blocked = false;
      for (let i = 1; i <= nstep && !blocked; i++) { const sx = h.x + dx * i / nstep, sy = h.y + dy * i / nstep, i0 = Math.floor(sx / GC), j0 = Math.floor(sy / GC);
        for (let ci = i0 - 1; ci <= i0 + 1 && !blocked; ci++) for (let cj = j0 - 1; cj <= j0 + 1 && !blocked; cj++) { const l = ownGrid.get(ci * 65536 + cj); if (!l) continue;
          for (const k of l) if (ownCum[k] > need && hypot(own[2 * k] - sx, own[2 * k + 1] - sy) < lim) { blocked = true; break; } } }
      if (!blocked) return 0;
      const kt = Math.min(tailIdx(t), headEnd), tx = own[2 * kt], ty = own[2 * kt + 1], ex = own[2 * headEnd], ey = own[2 * headEnd + 1];
      const viaTail = hypot(tx - h.x, ty - h.y) + hypot(x - tx, y - ty), viaHead = hypot(ex - h.x, ey - h.y) + hypot(x - ex, y - ey);
      return Math.max(0, Math.min(viaTail, viaHead) - L);
    };
    const reachHit = (x, y, t) => {
      for (const h of purs) {
        const d = hypot(x - h.x, y - h.y) - ro - h.rh; if (d <= 0) return 'head'; if (d > vb * t + 40) continue;
        const turn = Math.abs(wrap(Math.atan2(y - h.y, x - h.x) - h.ha));
        const c0 = h.v0 * .3, travel = h.v0 > 8 * PX_PER_SP ? d / vb : (d <= c0 ? d / h.v0 : .3 + (d - c0) / vb);
        let tr = Math.max(travel, turn / h.wc); if (tr > t) continue;
        tr += detour(h, x, y, t) / vb; if (tr <= t) return 'reach';
      }
      return null;
    };
    const riskOf = set => { const cnt = new Map(); for (const v of set) { const th = v >> 4; cnt.set(th, (cnt.get(th) || 0) + 1); } let r = 0; for (const [th, n] of cnt) if (threats[th].nRisk) r = Math.max(r, n / threats[th].nRisk); return r; };
    // ---- pursuers advanced along one candidate path: n = previous state holder {pur, trails, path}, q = our new head, dt, tNew ----
    const pur0 = purs.map(h => [h.x, h.y, h.ha, h.v0, 1]), trails0 = purs.map(() => []);
    const advPur = (n, q, dt, tNew) => {
      if (!purs.length) { q.pur = pur0; q.trails = trails0; return null; }
      const pur = new Array(purs.length), trails = new Array(purs.length), lx = q.x + q.v * .5 * Math.cos(q.h), ly = q.y + q.v * .5 * Math.sin(q.h); let cause = null;
      for (let i = 0; i < purs.length; i++) {
        const h = purs[i], p = n.pur[i], tr = n.trails[i];
        if (!p[4]) { pur[i] = p; trails[i] = tr; continue; }
        const da = wrap(Math.atan2(ly - p[1], lx - p[0]) - p[2]), a = p[2] + sign(da) * Math.min(Math.abs(da), h.wc * dt);
        const v = Math.min(vb, p[3] + h.hrate * dt), x = p[0] + v * dt * Math.cos(a), y = p[1] + v * dt * Math.sin(a), lim = h.rh + ro - V.V3_SHIELD;
        let alive = 1;
        if (shieldHit(x, y, tNew, lim)) alive = 0;
        else { const path = n.path; for (let k = 0; k + 2 < path.length; k += 3) { if (path[k + 2] > tNew - .15) break; const ddx = path[k] - q.x, ddy = path[k + 1] - q.y; if (ddx * ddx + ddy * ddy < 9 * ro * ro) continue; if (hypot(path[k] - x, path[k + 1] - y) < lim) { alive = 0; break; } } }
        if (!alive) nShield++;
        pur[i] = [x, y, a, v, alive]; trails[i] = (tr.length >= 96 ? tr.slice(4) : tr).concat([p[0], p[1], x, y]);   // last ~2.4 s of its trail (~1000 px at boost)
        if (alive && hypot(x - q.x, y - q.y) < h.rh + ro + HPAD) cause = 'cut';
      }
      if (!cause) for (let i = 0; i < purs.length && !cause; i++) { const tr = trails[i], lim = purs[i].rh + ro; for (let k = 0; k + 3 < tr.length; k += 4) if (segPt(q.x, q.y, tr[k], tr[k + 1], tr[k + 2], tr[k + 3]) < lim) { cause = 'cut'; break; } }
      q.pur = pur; q.trails = trails; return cause;
    };
    // ---- our physics: one step toward a target heading ----
    const sim = (n, target, boost, dt) => {
      const da = wrap(target - n.h), h = n.h + sign(da) * Math.min(Math.abs(da), w * dt), want = boost ? vb : cs;
      const v = n.v < want ? Math.min(want, n.v + rate * dt) : Math.max(want, n.v - rate * dt), am = n.h + wrap(h - n.h) / 2, vm = (n.v + v) / 2;
      return {x: n.x + vm * dt * Math.cos(am), y: n.y + vm * dt * Math.sin(am), h, v};
    };
    const eatAt = (n, x, y, t) => {        // food / heap value gained at a point (copy-on-write sets per node)
      let got = 0;
      for (let f = 0; f < foodN; f++) { if (food[4 * f + 3] > vb * t + 200) continue; const dx = food[4 * f] - x, dy = food[4 * f + 1] - y;
        if (dx * dx + dy * dy <= eatR2 && !(n.eaten && n.eaten.has(f))) { if (!n.eatenOwn) { n.eaten = new Set(n.eaten); n.eatenOwn = true; } n.eaten.add(f); got += food[4 * f + 2] * Math.exp(-t / 4); } }
      for (let j = 0; j < heaps.length; j++) if (!(n.heap && n.heap.has(j)) && hypot(heaps[j].x - x, heaps[j].y - y) < 150) {
        if (!n.heapOwn) { n.heap = new Set(n.heap); n.heapOwn = true; } n.heap.add(j); got += V.V2_HEAPW * heaps[j].mass * (t < heaps[j].rival ? 1 : .25) * Math.exp(-t / 4); }
      return got;
    };
    // ---- fine search: LAT (previous command), then NS steps x 3 controls per boost family ----
    const root = {x: px, y: py, h: ang, v: sp * PX_PER_SP, pur: pur0, trails: trails0, path: [px, py, 0]};
    const r0 = sim(root, prev, prevBoost, LATV); r0.path = [px, py, 0, r0.x, r0.y, LATV];
    const rootHit = advPur(root, r0, LATV, LATV) || hitAt(r0.x, r0.y, LATV, null, true);
    let layer = [], deadBest = null, over = false;
    for (const boost of (canBoost ? [false, true] : [false])) {
      const n = {x: r0.x, y: r0.y, h: r0.h, v: r0.v, t: LATV, minG: gapAt(r0.x, r0.y, LATV), val: 0, boost, par: null, step: 0, eaten: null, heap: null, path: r0.path, pur: r0.pur, trails: r0.trails};
      n.val = eatAt(n, n.x, n.y, n.t); layer.push(n);
    }
    const rank = n => Math.min(n.minG, 60) * 3 + n.val - (n.boost ? V.V2_BCOST * .3 : 0);
    let stepsDone = 0;
    for (let st = 1; st <= NS; st++) {
      if (nowMs() - T0 > BUDGET * .55) { over = true; break; }
      const byKey = new Map();
      for (const n of layer) for (const ctl of [0, 1, -1]) {
        const tm = n.t + DTF, q = sim(n, n.h + ctl * w * DTF * 1.5, n.boost, DTF);
        const hit = hitAt((n.x + q.x) / 2, (n.y + q.y) / 2, tm - DTF / 2, null, true) || hitAt(q.x, q.y, tm, null, true) || advPur(n, q, DTF, tm);
        const m = {x: q.x, y: q.y, h: q.h, v: q.v, t: tm, minG: n.minG, val: n.val, boost: n.boost, par: n, step: st, ctl, eaten: n.eaten, heap: n.heap, hit, path: purs.length ? n.path.concat([q.x, q.y, tm]) : n.path, pur: q.pur, trails: q.trails};
        if (hit) { if (deadBest === null || tm > deadBest.t + 1e-9 || (Math.abs(tm - deadBest.t) < 1e-9 && n.minG > deadBest.minG)) deadBest = m; continue; }
        m.minG = Math.min(n.minG, gapAt(q.x, q.y, tm)); m.val += eatAt(m, q.x, q.y, tm);
        const key = (Math.floor((q.x - px) / 24) * 4096 + Math.floor((q.y - py) / 24)) * 64 + (Math.floor((wrap(q.h) + PI) / TAU * 24) % 24) * 2 + (m.boost ? 1 : 0);
        const o = byKey.get(key); if (!o || rank(m) > rank(o)) byKey.set(key, m);
      }
      const next = [...byKey.values()].sort((a, b) => rank(b) - rank(a));
      const beam = BEAM[Math.min(2, Math.floor((st - 1) * 3 / NS))];   // beam per boost family: a boost family must not be pruned by its cost
      layer = next.filter(n => !n.boost).slice(0, beam).concat(next.filter(n => n.boost).slice(0, beam)); stepsDone = st;
      if (!layer.length) break;
    }
    // the previous verified plan, replayed through the same checks (time-shifted), is always a candidate: a new plan replaces it only
    // when better by V3_SWITCH (live game 3 2026-09-30: the command flipped -142 / -60 / -23 deg within 0.3 s at boost and hit a body)
    let prevLeaf = null;
    if (this.v3plan && T - this.v3plan.T < 1 && stepsDone === NS) {
      const pl = this.v3plan.nodes, dt = T - this.v3plan.T, hdg = t => { let k = 0; while (k < pl.length - 1 && pl[k][0] < t + dt) k++; return pl[k][1]; }, boost = this.v3plan.boost && canBoost;
      let n = {x: r0.x, y: r0.y, h: r0.h, v: r0.v, t: LATV, minG: gapAt(r0.x, r0.y, LATV), val: 0, boost, par: null, step: 0, eaten: null, heap: null, path: r0.path, pur: r0.pur, trails: r0.trails};
      n.val = eatAt(n, n.x, n.y, n.t);
      for (let st = 1; st <= NS && n; st++) {
        const tm = n.t + DTF, q = sim(n, hdg(tm), n.boost, DTF);
        const hit = hitAt((n.x + q.x) / 2, (n.y + q.y) / 2, tm - DTF / 2, null, true) || hitAt(q.x, q.y, tm, null, true) || advPur(n, q, DTF, tm);
        if (hit) { n = null; break; }
        const m = {x: q.x, y: q.y, h: q.h, v: q.v, t: tm, minG: Math.min(n.minG, gapAt(q.x, q.y, tm)), val: n.val, boost: n.boost, par: n, step: st, ctl: 0, eaten: n.eaten, heap: n.heap, path: purs.length ? n.path.concat([q.x, q.y, tm]) : n.path, pur: q.pur, trails: q.trails, prevPlan: true};
        m.val += eatAt(m, q.x, q.y, tm); n = m;
      }
      if (n) { prevLeaf = n; layer.push(n); }
    }
    const leaves = layer, full = stepsDone === NS && !over; const T2 = nowMs();
    // ---- coarse 5 s continuation: stage A (every leaf, straight), stage B (top V3_TOP: 3 branches, value, risk, exit certification) ----
    const rival = n => n.val - (n.boost ? V.V2_BCOST : 0);
    const cont = (n, br, rk, withVal) => {
      let q = {x: n.x, y: n.y, h: n.h, v: n.v, pur: n.pur, trails: n.trails, path: n.path}, tDead = HC, reach = null, unknown = false, cval = 0, cause = null; const pts = [], traj = [], m = {eaten: n.eaten, heap: n.heap};
      for (let k = 1; ; k++) {
        const tm = n.t + k * CDT; if (tm > HC + 1e-9) break;
        const q2 = sim(q, q.h + br * w * .5 * CDT * 1.5, n.boost, CDT); q2.path = q.path; const dist = hypot(q2.x - px, q2.y - py);
        if (dist > OBS) { unknown = true; break; }
        const hit = advPur(q, q2, CDT, tm) || hitAt(q2.x, q2.y, tm, rk, false); if (hit) { tDead = tm; cause = hit; break; }
        q2.path = purs.length ? q.path.concat([q2.x, q2.y, tm]) : q.path; q = q2;   // the path is only consumed by pursuers
        if (reach === null && dist >= EDGE) reach = {x: q.x, y: q.y, t: tm, dir: q.h};
        if (k % 2 === 0) pts.push(q.x, q.y); traj.push(q.x, q.y, tm, q.h);
        if (withVal && tm <= 3) cval += eatAt(m, q.x, q.y, tm);
      }
      return {tDead, reach, unknown, cval, pts, traj, cause, risk: 0};
    };
    // stage A over one leaf per (heading 15 deg x boost) cell, the best-ranked: direction coverage like V2's 48 candidates at a bounded cost
    const byDir = new Map(); for (const n of leaves) { const k = (Math.floor((wrap(n.h) + PI) / TAU * 24) % 24) * 2 + (n.boost ? 1 : 0); const o = byDir.get(k); if (!o || rank(n) > rank(o)) byDir.set(k, n); }
    const stageA = prevLeaf ? [prevLeaf, ...[...byDir.values()].filter(n => n !== prevLeaf)] : [...byDir.values()];
    for (const n of stageA) { if (nowMs() - T0 > BUDGET * .8) { over = true; break; } n.a = cont(n, 0, null, false); }
    const scored = leaves.filter(n => n.a), pre = n => (n.a.tDead >= HC - 1e-9 ? 100 + rival(n) : n.a.tDead * 10 + Math.min(n.minG, 60) * .2);
    const cand = scored.slice().sort((a, b) => pre(b) - pre(a)).slice(0, V.V3_TOP);
    if (prevLeaf && prevLeaf.a && !cand.includes(prevLeaf)) cand.unshift(prevLeaf);
    const widthAt = (ex, ey, dirA, t) => {   // contiguous clear width across the crossing point (8 px samples, <= 120 px each side)
      const nx = -Math.sin(dirA), ny = Math.cos(dirA), ok = u => !hitAt(ex + u * nx, ey + u * ny, t, null, false);
      if (!ok(0)) return 0; let a = 0, b = 0; while (a < 120 && ok(-(a + 8))) a += 8; while (b < 120 && ok(b + 8)) b += 8; return a + b;
    };
    let nEval = 0; const exitBins = new Set();
    for (const n of cand) {
      if (nEval && nowMs() - T0 > BUDGET * .9) { over = true; break; }
      nEval++; let bestB = null; const risk = new Set();
      for (let q = n; q; q = q.par) hitAt(q.x, q.y, q.t, risk, true);          // risk along the fine chain
      for (const br of [0, 1, -1]) {
        const rk = new Set(risk), b = cont(n, br, rk, true); b.risk = riskOf(rk);
        if (bestB === null || b.tDead > bestB.tDead + 1e-9 || (Math.abs(b.tDead - bestB.tDead) < 1e-9 && b.cval - V.V3_RISKW * b.risk > bestB.cval - V.V3_RISKW * bestB.risk)) bestB = b;
      }
      let width = null, slack = null, cert = false, certReason = 'no_edge';
      const mEff = MARGIN + .5 * LATV * (n.boost ? vb : cs);   // command latency = position uncertainty: ~32 px at boost, ~19 px at cruise
      // A five-second collision-free loop is local safety, not an exit (v3head2 game 2 circled for 56 s with zero exits).
      n.localSafe = bestB.tDead >= HC - 1e-9 && !bestB.unknown;
      if (n.minG < mEff) certReason = 'margin';
      else if (!bestB.reach) certReason = n.localSafe ? 'local_only' : bestB.unknown ? 'unknown' : 'no_edge';
      else if (bestB.tDead <= bestB.reach.t) certReason = 'blocked';
      else {                                                                            // certify the crossing itself
        const e = bestB.reach; width = widthAt(e.x, e.y, e.dir, e.t);
        if (width >= V.V3_MIN_WIDTH) { let tc = null; for (const dt of [.5, 1, 1.5]) if (e.t + dt <= HC && widthAt(e.x, e.y, e.dir, e.t + dt) < V.V3_MIN_WIDTH) { tc = e.t + dt; break; }
          slack = (tc === null ? HC : tc) - e.t; cert = slack >= V.V3_MIN_SLACK; certReason = cert ? 'exit' : 'closing'; }
        else certReason = 'narrow';
      }
      n.c = bestB; n.width = width; n.slack = slack; n.cert = cert; n.certReason = certReason;
      if (cert && bestB.reach) exitBins.add(Math.floor((wrap(Math.atan2(bestB.reach.y - py, bestB.reach.x - px)) + PI) / TAU * 12) % 12);
    }
    const evald = cand.slice(0, nEval), certs = evald.filter(n => n.cert);
    // ---- choose: certified paths compete on value - risk (+ wrap / hysteresis bias); otherwise the longest survival ----
    const route = this.v3route && T - this.v3route.T < 2 ? this.v3route : null;
    if (!route) this.v3route = null;
    const exitAngle = n => n.c && n.c.reach ? Math.atan2(n.c.reach.y - py, n.c.reach.x - px) : null;
    const exitBin = n => exitAngle(n) === null ? null : Math.floor((wrap(exitAngle(n)) + PI) / TAU * 12) % 12;
    const sameRoute = n => route && exitAngle(n) !== null && Math.abs(wrap(exitAngle(n) - route.ang)) < rad(35);
    const bias = n => (wrapMode ? -Math.abs(wrap(n.h - exitAng)) * 20 + (n.boost === wrapBoost ? 20 : 0) : 0)
      + (this.v2last !== null && Math.abs(wrap(n.h - this.v2last[0])) < rad(12) && n.boost === this.v2last[1] ? V.V2_HYST : 0);
    let best = null, mode;
    if (!leaves.length) { best = deadBest; mode = 'v3esc'; }
    else if (certs.length && !ringClosed) { mode = wrapMode ? 'v3wrap' : 'v3'; let routeBest = null;
      for (const n of certs) { n.sc = rival(n) + n.c.cval - V.V3_RISKW * n.c.risk + bias(n) + (n.width !== null ? .05 * Math.min(n.width, 200) : 0);
        if (best === null || n.sc > best.sc) best = n;
        if (sameRoute(n) && (routeBest === null || n.sc > routeBest.sc)) routeBest = n; }
      // Hold the strategic exit while local plans change. Release it immediately if no certified path reaches it.
      if (routeBest && best.sc < routeBest.sc + V.V3_SWITCH) best = routeBest;
      if (prevLeaf && prevLeaf.cert && (!routeBest || sameRoute(prevLeaf)) && best !== prevLeaf && best.sc < prevLeaf.sc + V.V3_SWITCH) best = prevLeaf; }
    else if (scored.length) { mode = ringClosed ? 'v3ring' : 'v3esc'; for (const n of scored) { const cc = n.c || n.a;
        const progress = route && cc.reach ? 4 * Math.cos(wrap(Math.atan2(cc.reach.y - py, cc.reach.x - px) - route.ang)) : 0;
        n.sc = Math.min(cc.tDead, HC) * 10 + Math.min(n.minG, 60) - 10 * cc.risk + bias(n) * .2 + progress;
        if (best === null || n.sc > best.sc) best = n; }
      if (prevLeaf && prevLeaf.a && best !== prevLeaf && best.sc < prevLeaf.sc + V.V3_SWITCH * .2) best = prevLeaf; }
    else { best = leaves[0]; mode = 'v3esc'; }
    if (best && best.cert && best.c && best.c.reach) this.v3route = {T, bin: exitBin(best), ang: exitAngle(best)};
    // ---- command: heading of the plan at step V3_CMD_STEP; hold = replay the previous verified plan when the budget ran out ----
    let cmd, boost, hold = 0, chain = [];
    for (let n = best; n; n = n.par) chain.push(n); chain.reverse();
    if ((over && !scored.length) && this.v3plan && T - this.v3plan.T < 1) {
      hold = 1; mode = 'v3hold'; const dt = T - this.v3plan.T + LATV, pl = this.v3plan.nodes;
      let k = 0; while (k < pl.length - 1 && pl[k][0] < dt) k++; cmd = pl[k][1]; boost = this.v3plan.boost;
    } else {
      const k = Math.min(chain.length - 1, V.V3_CMD_STEP); cmd = wrap(chain[k].h); boost = !!best.boost && canBoost;
      if (chain.length > 1 && chain[chain.length - 1].step >= 2) this.v3plan = {T, boost, nodes: chain.map(n => [n.t, wrap(n.h)])};
    }
    if (rootHit && !hold) mode = 'v3esc';
    this.v2last = [cmd, boost]; this.prev = cmd; this.prevBoost = boost;
    const bc = best ? (best.c || best.a || null) : null;
    const ms = nowMs() - T0, pts = []; for (const n of chain) pts.push(n.x, n.y); if (bc) for (const v of bc.pts) pts.push(v);
    const tDead = bc ? bc.tDead : (best && best.hit ? best.t : null);
    const trace = {mode, boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: leaves.length, threat: 0, enclosed: 0, wrap: 0, thr: null,
      eat: best && Number.isFinite(best.sc) ? r1(best.sc) : null,   // NaN broke the game record JSON (batch 0930) goal: heaps.length ? r1(Math.max(...heaps.map(h => h.mass))) : 0, thread: null, cov: r2(covMax), cov_id: covId, cov_free: exitWidth || 24, esc: exitAng === null ? null : r1(deg(exitAng)), L: s.L, sc: r2(sc), died_near: this.diedNear, kills: this.kills,
      big: 0, curl: 0, prof: this.profile, onward: null, nh: threats.length, hold_by: null, sized: 0, guard: null, gforce: 0, gatk: 0, giant: 0, wf: wrapMode ? 1 : 0, raid: 0, gap: null, squeeze: null,
      ttd: tDead === null ? null : r1(tDead), ttds: best ? r1(Math.min(best.minG, 999)) : null, ttdh: null, v2obj: null, arc: 0, chg: 0, cause: bc ? bc.cause : (best && best.hit) || null,
      v3_ms: r1(ms), v3_over: over ? 1 : 0, v3_full: full ? 1 : 0, v3_hold: hold, v3_leaves: leaves.length, v3_eval: nEval, v3_cert: best && best.cert ? 1 : 0, v3_ncert: certs.length, v3_exits: exitBins.size,
      v3_risk: bc ? r2(bc.risk) : null, v3_commit: nCommit, v3_shield: nShield, v3_keep: best && best.prevPlan ? 1 : 0, v3_root: rootHit || null,
      v3_local: best && best.localSafe ? 1 : 0, v3_goal: this.v3route ? this.v3route.bin : null, v3_goal_age: this.v3route ? r2(T - this.v3route.T) : null,
      v3_route_match: best && best.cert && sameRoute(best) ? 1 : 0,
      v3_cert_reason: best && best.certReason ? best.certReason : 'not_evaluated',
      exit_width: best && best.width !== null && best.width !== undefined ? r1(best.width) : null, exit_slack: best && best.slack !== null && best.slack !== undefined ? r1(best.slack) : null,
      exit_reach: bc && bc.reach ? r1(bc.reach.t) : null, exit_close: null, exit_unknown: bc ? (bc.unknown ? 1 : 0) : null,
      exit_reason: best && best.certReason ? best.certReason : 'not_evaluated'};
    // time-stamped trajectory for the main-thread tracker: [t (s from the observation), x, y, heading, boost] per point
    const plan = [0, px, py, ang, prevBoost ? 1 : 0];
    for (const n of chain) plan.push(n.t, n.x, n.y, n.h, n.boost ? 1 : 0);
    if (bc && bc.traj && !hold) for (let i = 0; i + 3 < bc.traj.length; i += 4) plan.push(bc.traj[i + 2], bc.traj[i], bc.traj[i + 1], bc.traj[i + 3], boost ? 1 : 0);
    this.last = null; this.v3plan_out = hold ? null : plan;
    this.v3dbg = {threats, purs, leaves, scored, evald, best, hitAt, caps, tms: [r1(T1 - T0), r1(T2 - T1), r1(nowMs() - T2)], stepsDone};
    this.last = {mode, trace, draw: {chosen: pts, safe: [], pos: new Float64Array(0), N, C2: 0, i: 0, near: [], gaps: [],
      goal: heaps.length ? heaps.reduce((a, b) => a.mass > b.mass ? a : b) : null, crowdAt: null, wp: null, attacker: null, ro, analysis: null}, plan: this.v3plan_out};
    return [cmd, boost];
  }

  step(s) {
    if (this.values.V2_ON) return this.v2Step(s);
    if (this.values.PROBE_ON && s.L >= (this.values.PROBE_MIN_L || 0)) return this.probeStep(s);
    return this.pilotStep(s);
  }

  pilotStep(s) {
    const aggressive = this.profile === 'aggressive';
    const px = s.x, py = s.y, ang = s.ang, sp = s.sp, sc = s.sc, T = s.t, ro = R * sc;
    const P = this.sized(sc);
    const prev = this.prev === null ? ang : this.prev;
    const S = s.segs, sid = s.sid, ns = sid.length, W0 = s.wall[0], W1 = s.wall[1], W2 = s.wall[2];
    const nearAll = new Array(ns);
    for (let k = 0; k < ns; k++) nearAll[k] = segDist(px, py, S, k) - S[5 * k + 4];
    const field = bodyField(P, px, py, S, sid, nearAll.map(v => v < P.REACH), CELL, HALF);
    const farField = bodyField(P, px, py, S, sid, nearAll.map(v => v < LONG_HALF + 300), LONG_CELL, LONG_HALF);
    const heads = [], omegas = [], seen = new Map();
    const H5 = s.heads, nh = s.hid.length;
    for (let m = 0; m < nh; m++) {
      const h = [H5[5 * m], H5[5 * m + 1], H5[5 * m + 2], H5[5 * m + 3], H5[5 * m + 4]], i = Math.trunc(s.hid[m]);
      seen.set(i, [h[2], T]);
      if (hypot(h[0] - px, h[1] - py) >= P.HEAD_R) continue;
      const o = this.seen.get(i);
      h.id = i;
      heads.push(h); omegas.push(o && .01 < T - o[1] && T - o[1] < .25 ? wrap(h[2] - o[0]) / (T - o[1]) : 0);
    }
    this.seen = seen;
    // 3.c: a head within 500 px vanishes and remains appear where it was -> it died near us (a kill if our body was there).
    const F = s.food, nf = F.length / 3, own = s.own, no = own.length / 2;
    const big = [];
    for (let f = 0; f < nf; f++) if (F[3 * f + 2] >= P.REMAINS) big.push([F[3 * f], F[3 * f + 1]]);
    const fresh = big.length && this.bigPrev.length
      ? big.filter(b => this.bigPrev.every(q => (b[0] - q[0]) ** 2 + (b[1] - q[1]) ** 2 > 9)) : big;
    for (const [i, [q, rh]] of this.closeHeads) if (!seen.has(i)) {
      let ours = false;
      for (let k = 0; k < no && !ours; k++) ours = hypot(own[2 * k] - q[0], own[2 * k + 1] - q[1]) < ro + rh + 40;
      this.pending.set(i, [q, T, ours]);
    }
    for (const [i, [q, tv, ours]] of [...this.pending]) {
      if (fresh.some(b => hypot(b[0] - q[0], b[1] - q[1]) < 200)) { this.diedNear++; this.kills += ours ? 1 : 0; this.pending.delete(i); }
      else if (T - tv > .6 || seen.has(i)) this.pending.delete(i);
    }
    this.bigPrev = big;
    this.closeHeads = new Map();
    for (let m = 0; m < nh; m++) if (hypot(H5[5 * m] - px, H5[5 * m + 1] - py) < 500)
      this.closeHeads.set(Math.trunc(s.hid[m]), [[H5[5 * m], H5[5 * m + 1]], R * H5[5 * m + 4]]);
    const relPrev = wrap(prev - ang);
    if (Math.abs(relPrev) > rad(60)) this.turnSign = sign(relPrev);
    else if (Math.abs(relPrev) < rad(20)) this.turnSign = 0;

    const gaps = findGaps(P, px, py, S, sid, nearAll, ro);
    const gapRel = [];
    for (const g of gaps) for (const a of [g.m, [g.m[0] + 80 * g.ch[0], g.m[1] + 80 * g.ch[1]]]) gapRel.push(wrap(Math.atan2(a[1] - py, a[0] - px) - ang));
    const lim = P.CALM_RATE * this.period;
    const crel = [...ANGLES, lim, -lim, ...gapRel, wrap(prev - ang)].map(r => clip(r, -P.MAX_REL, P.MAX_REL));
    const C = crel.length, C2 = 2 * C;
    const hd = [...crel.map(r => ang + r), ...crel.map(r => ang + r)];
    const bst = hd.map((_, c) => c >= C);
    const {pos, t} = paths(P, px, py, ang, sp, sc, prev, hd, bst, this.prevBoost);
    const NP = C2 * N;
    // Bodies and the wall: worst drawn gap along each path.
    const gap = new Float64Array(NP);
    for (let q = 0; q < NP; q++) {
      const x = pos[2 * q], y = pos[2 * q + 1];
      gap[q] = Math.min(fieldGap(field, x, y) - ro, W2 - hypot(x - W0, y - W1) - ro);
    }
    let threat = 0, attacker = null;
    const hpaths = [], straight = (ANGLES.length >> 1) * N;
    for (let m = 0; m < heads.length; m++) {
      const h = heads[m], hp = headPaths(h, omegas[m]), hr = R * h[4];
      hpaths.push([hp, hr + P.thickOff(hr)]);
      let hgs = Infinity;
      for (let k = 0; k < N; k++) {
        const x = pos[2 * (straight + k)], y = pos[2 * (straight + k) + 1];
        let d2m = Infinity;
        for (let j = 0; j < hp.ts.length; j++) {
          const d2 = hp.ts[j] <= t[k] + .15 ? (x - hp.pts[2 * j]) ** 2 + (y - hp.pts[2 * j + 1]) ** 2 : 1e8;
          if (d2 < d2m) d2m = d2;
        }
        hgs = Math.min(hgs, Math.sqrt(d2m) - ro - hr);
      }
      // 3.a attack: coming our way aimed at where we will be in ~0.6 s, boosting alongside to cut us off, or crossing.
      const rx = px - h[0], ry = py - h[1], dist = hypot(rx, ry);
      const ahx = px + .6 * sp * PX_PER_SP * Math.cos(ang) - h[0], ahy = py + .6 * sp * PX_PER_SP * Math.sin(ang) - h[1];
      const aimOff = Math.abs(wrap(h[2] - Math.atan2(ahy, ahx))), closing = Math.cos(h[2] - Math.atan2(ry, rx));
      const side = rx * -Math.sin(ang) + ry * Math.cos(ang), fwd = -rx * Math.cos(ang) + -ry * Math.sin(ang);
      const cutting = 0 < fwd && fwd < 350 && Math.abs(side) < 250 && Math.abs(wrap(h[2] - ang)) < rad(35) && h[3] > sp + 1;
      const crossing = hgs < 40, close = dist < 250 && h[3] >= sp - .5;
      // RAIDER_ON (2026-09-27): a thinner, boosting head coming our way within 900 px (killers: 20/24 thinner, 74 % boosting)
      const raider = !!P.RAIDER_ON && h[4] < .8 * sc && h[3] > 8 && dist < 900 && closing > 0;
      h.raider = raider;
      if ((dist < 600 && ((closing > .5 && aimOff < rad(25)) || cutting || crossing || close)) || raider) {
        const level = Math.max(dist < 600 ? (600 - dist) / 600 : 0, raider ? (900 - dist) / 900 : 0);
        if (level > threat) { threat = level; attacker = h; }
      }
    }
    // Narrowing corridor (user 2026-09-26): one side walled by A, B running our way alongside on the other. B can close
    // the gap. Its cut-in forecasts are a risk, not a hard limit (as a hard limit they left no safe way at all and the
    // emergency drove into A - ext/test/squeeze_sim.mjs): each plan pays for how close it runs to where B would lay
    // body before we get there, and the look-ahead rays below count B's cut-in as body.
    const squeeze = P.SQUEEZE_ON ? findSqueeze(P, px, py, ang, ro, S, sid, nearAll, heads) : null;
    const sqGap = squeeze ? new Float64Array(C2).fill(Infinity) : null;
    if (squeeze) for (const cp of squeeze.short) for (let j = 0; j < cp.ts.length; j++) {
      const hx = cp.pts[2 * j], hy = cp.pts[2 * j + 1], ht = cp.ts[j];
      for (let q = 0; q < NP; q++) {
        if (!(ht <= t[q % N] + .15)) continue;
        const dx = pos[2 * q] - hx, dy = pos[2 * q + 1] - hy, c = (q / N) | 0, v = Math.sqrt(dx * dx + dy * dy) - ro - squeeze.rB;
        if (v < sqGap[c]) sqGap[c] = v;
      }
    }
    // HEAD_RAYS (2026-09-27): boosting / raiding heads keep laying body for the whole look-ahead (1.2 + LONG_T s):
    // straight at their speed, counted as body in the rays below (like B's cut-in), box-tested per ray.
    const longHeads = [];
    if (P.HEAD_RAYS) for (const h of heads) {
      if (!(h.raider || h[3] > 8)) continue;
      const hr = R * h[4] + P.thickOff(R * h[4]), v = Math.max(h[3], 4) * PX_PER_SP, secs = N * DT + P.LONG_T, pts = [], ts = [];
      for (let k = 1; k <= Math.round(secs / DT); k++) { pts.push(h[0] + v * k * DT * Math.cos(h[2]), h[1] + v * k * DT * Math.sin(h[2])); ts.push(k * DT); }
      const m = ro + hr + 100;
      longHeads.push({pts, ts, r: hr, box: [Math.min(h[0], pts[pts.length - 2]) - m, Math.min(h[1], pts[pts.length - 1]) - m,
        Math.max(h[0], pts[pts.length - 2]) + m, Math.max(h[1], pts[pts.length - 1]) + m]});
    }
    // NOWRAP (user 2026-09-28: "맵에 모든 적의 위치를 아는데 미리 보면 된다"): every head of a snake at least NW_RATIO x our
    // radius can reach any point within (its speed x time) - a ray point it can reach before we get there is treated as
    // body, so the dead-end filter keeps us out of the region the bigger snakes can close within 1.2 + LONG_T s.
    const reachHeads = [];
    if (P.NOWRAP_ON) for (const h of heads) {
      if (R * h[4] < P.NW_RATIO * ro) continue;
      const v = (h[3] > 8 ? BOOST_SP : Math.max(h[3], cruiseSp(h[4]))) * PX_PER_SP * P.NW_SPEED;
      reachHeads.push({x: h[0], y: h[1], v, r: R * h[4] + P.thickOff(R * h[4])});
    }
    const gapStatic = new Float64Array(C2).fill(Infinity), gapHeads = new Float64Array(C2).fill(Infinity);
    for (let q = 0; q < NP; q++) gapStatic[(q / N) | 0] = Math.min(gapStatic[(q / N) | 0], gap[q]);
    if (hpaths.length) {
      // Heads lay body where they go: our point at time t meets forecast points laid before t (pairs within HEAD_NEAR+).
      let hrMax = 0; for (const [, hr] of hpaths) hrMax = Math.max(hrMax, hr);
      const lim2 = (P.HEAD_NEAR + ro + hrMax) ** 2;
      const hg = new Float64Array(NP).fill(Infinity);
      let reach = 0;
      for (let q = 0; q < NP; q++) reach = Math.max(reach, hypot(pos[2 * q] - px, pos[2 * q + 1] - py));
      const far2 = (reach + Math.sqrt(lim2) + 1) ** 2;
      for (const [hp, hr] of hpaths) for (let j = 0; j < hp.ts.length; j++) {
        const hx = hp.pts[2 * j], hy = hp.pts[2 * j + 1], ht = hp.ts[j];
        if ((hx - px) * (hx - px) + (hy - py) * (hy - py) > far2) continue;     // no path point can be within lim
        let k0 = 0; while (k0 < N && !(ht <= t[k0] + .15)) k0++;
        for (let c = 0; c < C2; c++) for (let k = k0; k < N; k++) {
          const q = c * N + k, dx = pos[2 * q] - hx, dy = pos[2 * q + 1] - hy, d2 = dx * dx + dy * dy;
          if (d2 <= lim2) { const v = Math.sqrt(d2) - ro - hr; if (v < hg[q]) hg[q] = v; }
        }
      }
      for (let q = 0; q < NP; q++) {
        if (hg[q] < gap[q]) gap[q] = hg[q];
        gapHeads[(q / N) | 0] = Math.min(gapHeads[(q / N) | 0], hg[q]);
      }
    }
    const clear = new Float64Array(C2).fill(Infinity), hard = new Float64Array(C2).fill(Infinity);
    for (let q = 0; q < NP; q++) {
      const c = (q / N) | 0;
      clear[c] = Math.min(clear[c], gap[q] + P.CREDIT * t[q % N]); hard[c] = Math.min(hard[c], gap[q]);
    }
    // Look-ahead: from each candidate's 1.2 s end, is there any way on for LONG_T more seconds?
    const onward = new Float64Array(C2), cs = cruiseSp(sc), rayWorst = new Float64Array(C2 * LONG_FAN.length);
    for (let c = 0; c < C2; c++) {
      const ex = pos[2 * (c * N + N - 1)], ey = pos[2 * (c * N + N - 1) + 1];
      const endH = Math.atan2(ey - pos[2 * (c * N + N - 2) + 1], ex - pos[2 * (c * N + N - 2)]);
      let best = -Infinity;
      for (let f = 0; f < LONG_FAN.length; f++) {
        const fan = LONG_FAN[f];
        let worst = Infinity;
        // B's cut-in only matters for rays that come near it (box test on the whole ray)
        const rx1 = ex + P.LONG_T * cs * PX_PER_SP * Math.cos(endH + fan), ry1 = ey + P.LONG_T * cs * PX_PER_SP * Math.sin(endH + fan);
        const nearB = squeeze && !(Math.max(ex, rx1) < squeeze.box[0] || Math.min(ex, rx1) > squeeze.box[2]
          || Math.max(ey, ry1) < squeeze.box[1] || Math.min(ey, ry1) > squeeze.box[3]);
        const nearH = longHeads.filter(l => !(Math.max(ex, rx1) < l.box[0] || Math.min(ex, rx1) > l.box[2] || Math.max(ey, ry1) < l.box[1] || Math.min(ey, ry1) > l.box[3]));
        for (let k = 1; k <= 24; k++) {
          const L = k * (P.LONG_T / 24) * cs * PX_PER_SP, x = ex + L * Math.cos(endH + fan), y = ey + L * Math.sin(endH + fan);
          let g = Math.min(fieldGap(farField, x, y) - ro, W2 - hypot(x - W0, y - W1) - ro);
          if (nearB) {               // B's cut-in body, laid before this ray point is reached
            const tr = N * DT + k * (P.LONG_T / 24);
            let d2 = Infinity;
            for (const lp of squeeze.long) for (let j = 0; j < lp.ts.length && lp.ts[j] <= tr + .15; j++) {
              const dx = x - lp.pts[2 * j], dy = y - lp.pts[2 * j + 1];
              if (dx * dx + dy * dy < d2) d2 = dx * dx + dy * dy;
            }
            g = Math.min(g, Math.sqrt(d2) - ro - squeeze.rB);
          }
          if (reachHeads.length) {
            const tr = N * DT + k * (P.LONG_T / 24) + P.LAT;
            for (const rh of reachHeads) {
              const d = hypot(x - rh.x, y - rh.y) - ro - rh.r;
              if (d <= rh.v * tr - P.NW_MARGIN) { g = Math.min(g, -1); break; }
            }
          }
          if (nearH.length) {
            const tr = N * DT + k * (P.LONG_T / 24);
            for (const lp of nearH) {
              let d2 = Infinity;
              for (let j = 0; j < lp.ts.length && lp.ts[j] <= tr + .15; j++) {
                const dx = x - lp.pts[2 * j], dy = y - lp.pts[2 * j + 1];
                if (dx * dx + dy * dy < d2) d2 = dx * dx + dy * dy;
              }
              g = Math.min(g, Math.sqrt(d2) - ro - lp.r);
            }
          }
          worst = Math.min(worst, g);
        }
        rayWorst[c * LONG_FAN.length + f] = worst;
        best = Math.max(best, worst);
      }
      onward[c] = best;
    }
    // 2.d: bodies all around? Widest opening over 24 bearings within 1000 px.
    const occ = new Array(24).fill(1000), bin = new Array(ns);
    for (let k = 0; k < ns; k++) {
      const mx = (S[5 * k] + S[5 * k + 2]) / 2 - px, my = (S[5 * k + 1] + S[5 * k + 3]) / 2 - py;
      bin[k] = Math.trunc((Math.atan2(my, mx) + PI) / (2 * PI) * 24) % 24;
      occ[bin[k]] = Math.min(occ[bin[k]], Math.min(nearAll[k], 1000));
    }
    const enclosed = occ.filter(v => v < 400).length / 24;
    const wide = occ.map((v, k) => Math.min(Math.min(v, occ[(k + 23) % 24]), occ[(k + 1) % 24]));
    const esc = (argmax(wide) + .5) / 24 * 2 * PI - PI;
    // One snake covering >= half the bearings within 500 px is wrapping us: leave through the widest run it leaves open.
    let wrapCov = 0, wrapId = null, wrapEsc = null, wrapBins = null, raidHit = false, giantHit = false, giantIds = new Set(), wfHit = false, wrapHeadSp = 0;
    const covs = new Map();
    if (ns) {
      const past = (this.covHist.find(([t0]) => T - t0 <= 1) || [0, new Map()])[1];
      for (const i of uniqueSorted(sid.filter((_, k) => nearAll[k] < 500))) {
        const cov = new Array(24).fill(false);
        for (let k = 0; k < ns; k++) if (nearAll[k] < 500 && sid[k] === i) cov[bin[k]] = true;
        const mean = cov.filter(Boolean).length / 24;
        covs.set(i, mean);
        const rising = past.has(i) && mean >= .4 && mean - past.get(i) >= .15;
        // WRAP_RAID (2026-09-27): the wrapping snake's head boosting within 400 px starts the escape at cover 0.35
        const hh = P.WRAP_RAID ? heads.find(h => h.id === i) : null;
        const raiding = !!hh && mean >= .35 && hh[3] > 8 && hypot(hh[0] - px, hh[1] - py) < 400;
        // GIANT_ESCAPE (cycle 6): a snake >= GIANT_RATIO x our radius whose body covers >= GIANT_COV of the bearings and lies
        // within GIANT_D px, for GIANT_HOLD s, starts the escape whatever its head does (slow wraps: cover >= 0.4 ten
        // seconds before 7/12 deaths beside giants; 0.3 % of survived ticks)
        let giant = false, rr = 0, dmin = Infinity;
        for (let k = 0; k < ns; k++) if (sid[k] === i) { rr = S[5 * k + 4]; if (nearAll[k] < dmin) dmin = nearAll[k]; }
        // WF (user 2026-09-28): a snake at least WF_RATIO x our radius whose body already covers WF_COV of the bearings is
        // trying to wrap us -> leave through the open side now, before its head can get around (it cannot close a loop
        // on a target that keeps moving away from its body at its own speed)
        const wf = !!P.WF_ON && rr >= P.WF_RATIO * ro && mean >= P.WF_COV;
        if (P.GIANT_ON) {
          const cond = rr >= P.GIANT_RATIO * ro && mean >= P.GIANT_COV && dmin - ro <= P.GIANT_D;
          if (cond) { if (!this.giantSince.has(i)) this.giantSince.set(i, T); giantIds.add(i); } else this.giantSince.delete(i);
          giant = cond && T - this.giantSince.get(i) >= P.GIANT_HOLD;
        }
        if (mean > wrapCov && (mean >= .5 || rising || raiding || giant || wf)) {
          wrapCov = mean; wrapId = i; wrapBins = cov.slice(); raidHit = raiding; giantHit = giant; wfHit = wf;
          { const hh2 = heads.find(h => h.id === i); wrapHeadSp = hh2 ? hh2[3] : 0; }
          const am = cov.indexOf(true), free = [];
          for (let k = 0; k < 24; k++) if (!cov[(k + am) % 24]) free.push(k);
          if (!free.length) { wrapEsc = esc; continue; }
          let run = [free[0]], cur = [free[0]];
          for (let k = 1; k < free.length; k++) {
            if (free[k] - free[k - 1] !== 1) cur = [];
            cur.push(free[k]);
            if (cur.length > run.length) run = cur;
          }
          const angOf = run.map(b => ((b + am) % 24 + .5) / 24 * 2 * PI - PI);
          const hb = [], hbh = [], hbs = [];
          for (let m = 0; m < nh; m++) if (s.hid[m] === i) { hb.push(Math.atan2(H5[5 * m + 1] - py, H5[5 * m] - px)); hbh.push(H5[5 * m + 2]); hbs.push(H5[5 * m + 3]); }
          if (hb.length && angOf.length >= 3) {
            const inner = angOf.slice(1, -1);
            // WRAP_EXIT_TAIL: the opening behind the wrapping head (opposite its heading) closes last
            wrapEsc = P.WRAP_EXIT_TAIL && hbs[0] > 8 ? inner[argmax(inner.map(a => -Math.abs(wrap(a - (hbh[0] + PI)))))]
              : inner[argmax(inner.map(a => Math.abs(wrap(a - hb[0]))))];
          } else wrapEsc = angOf[angOf.length >> 1];
        }
      }
    }
    this.covHist = this.covHist.filter(([t0]) => T - t0 <= 1.2).concat([[T, covs]]);
    // WRAP_RAID target lock: the escape from snake X stays while X's head boosts within 400 px and its cover >= 0.2
    // (released 0.5 s after that stops), so a dip of the cover does not end it (cycle 1: exits ended at cover < 0.2).
    if (P.WRAP_RAID) {
      if (wrapEsc !== null) {
        if (this.wrapTarget !== null && this.wrapTarget.id !== wrapId) this.escLock = null;   // new wrapper: no stale exit
        this.wrapTarget = raidHit ? {id: wrapId, lastOk: T} : null;      // the lock only for raid-triggered escapes
      } else if (this.wrapTarget !== null) {
        const tg = this.wrapTarget, hh = heads.find(h => h.id === tg.id), m = covs.get(tg.id) || 0;
        if (hh && m >= .2 && hh[3] > 8 && hypot(hh[0] - px, hh[1] - py) < 400) tg.lastOk = T;
        if (T - tg.lastOk >= .5 || this.escLock === null) this.wrapTarget = null;
        else { wrapEsc = this.escLock[0]; wrapCov = Math.max(m, .25); wrapId = tg.id; }
      }
    } else this.wrapTarget = null;
    // GIANT_ESCAPE hold: the escape from giant X stays until its cover is below GIANT_OFF for GIANT_KEEP s or its body is gone
    if (P.GIANT_ON) {
      for (const i of [...this.giantSince.keys()]) if (!covs.has(i)) this.giantSince.delete(i);
      if (wrapEsc !== null && giantHit) {
        if (this.giantTarget === null || this.giantTarget.id !== wrapId) { this.giantTarget = {id: wrapId, low: null}; if (this.wrapTarget === null) this.escLock = null; }
        else this.giantTarget.low = null;
      } else if (this.giantTarget !== null) {
        const tg = this.giantTarget, m = covs.get(tg.id);
        if (m === undefined) this.giantTarget = null;
        else {
          tg.low = m < P.GIANT_OFF ? (tg.low === null ? T : tg.low) : null;
          if ((tg.low !== null && T - tg.low >= P.GIANT_KEEP) || this.escLock === null) this.giantTarget = null;
          else if (wrapEsc === null) { wrapEsc = this.escLock[0]; wrapCov = Math.max(m, .3); wrapId = tg.id; giantHit = true; }
        }
      }
    } else this.giantTarget = null;
    // Wrap data (cycle 1, user 2026-09-27): the snake covering most bearings within 500 px, and its widest open run.
    let covMax = 0, covId = null, covFree = 24;
    for (const [i, m] of covs) if (m > covMax) { covMax = m; covId = i; }
    if (covId !== null) {
      const cov = new Array(24).fill(false);
      for (let k = 0; k < ns; k++) if (nearAll[k] < 500 && sid[k] === covId) cov[bin[k]] = true;
      const am = cov.indexOf(true);
      let run = 0, cur = 0;
      for (let k = 1; k <= 24; k++) { cur = cov[(am + k) % 24] ? 0 : cur + 1; run = Math.max(run, cur); }
      covFree = run;
    }
    // The escape bearing is held 1.5 s (recomputed every tick it swung with the wrapper).
    if (P.GIANT_ON && wrapEsc !== null) {          // cycle 6 (Codex): a new wrapping snake must not inherit the old exit
      if (this.escId !== null && this.escId !== wrapId) this.escLock = null;   // (0928: the cover lookup threw during a hold)
      this.escId = wrapId;
    } else if (wrapEsc === null) this.escId = null;
    if (wrapEsc === null) this.escLock = null;
    else if (this.escLock !== null && T < this.escLock[1]) wrapEsc = this.escLock[0];
    else this.escLock = [wrapEsc, T + 1.5];
    // Coil on our own circle: wrapped -> full-rate turn, one direction chosen once (the side with more room).
    if (this.coilDir === 0 && wrapCov >= P.COIL_ON) {
      this.coilDir = this.lastCoil && T - this.lastCoil[1] < 10 ? this.lastCoil[0] : clear[K90] >= clear[KM90] ? 1 : -1;
      this.coilLowSince = null;
    } else if (this.coilDir !== 0) {
      if (wrapCov < P.COIL_OFF) {
        if (this.coilLowSince === null) this.coilLowSince = T;
        if (T - this.coilLowSince >= 1) { this.lastCoil = [this.coilDir, T]; this.coilDir = 0; }
      } else this.coilLowSince = null;
    }
    const ring = this.coilDir !== 0;
    // Snakes clearly thicker than us within 600 px.
    let bigRisk = 0;
    const bigTerms = [];
    for (const i of uniqueSorted(sid.filter((_, k) => nearAll[k] < 600))) {
      const g = []; let now = Infinity;
      for (let k = 0; k < ns; k++) if (sid[k] === i) { g.push(k); now = Math.min(now, nearAll[k]); }
      const ratio = S[5 * g[0] + 4] / ro;
      if (ratio < P.BIG_RATIO) continue;
      const risk = Math.min(1, .3 + (ratio - P.BIG_RATIO) / 1 + ((covs.get(i) || 0) >= .3 ? .3 : 0));
      bigTerms.push([risk, g, now]); bigRisk = Math.max(bigRisk, risk);
    }
    // Circling in place over the last 5 s -> head for open space for 2 s.
    this.hist = this.hist.filter(([t0]) => T - t0 <= 5).concat([[T, [px, py]]]);
    if (this.hist.length > 60 && T - this.hist[0][0] > 4.5) {
      let plenH = 0;
      for (let k = 1; k < this.hist.length; k++) plenH += hypot(this.hist[k][1][0] - this.hist[k - 1][1][0], this.hist[k][1][1] - this.hist[k - 1][1][1]);
      const a0 = this.hist[0][1], a1 = this.hist[this.hist.length - 1][1];
      if (plenH > 200 && hypot(a1[0] - a0[0], a1[1] - a0[1]) / plenH < P.LOOP_STRAIGHT && T > this.wpUntil && !ring && wrapEsc === null) {
        this.wpUntil = T + 2; this.wp = [px + 600 * Math.cos(esc), py + 600 * Math.sin(esc)];
      }
    }
    // 4: food on the path (sucked in within ro+EAT) and the richest cluster.
    const eat = new Float64Array(C2);
    let goal = null, goalVal = 0, heaps = [];
    const food = [];
    for (let f = 0; f < nf; f++) {
      const d = hypot(F[3 * f] - px, F[3 * f + 1] - py);
      if (d < P.FOOD_R) food.push([F[3 * f], F[3 * f + 1], F[3 * f + 2], d]);
    }
    if (food.length) {
      const val = food.map(f => f[2] >= P.REMAINS ? 4 * f[2] : f[2]);
      const reachD = BOOST_SP * PX_PER_SP * DT * N + ro + P.EAT, er2 = (ro + P.EAT) ** 2;
      for (let f = 0; f < food.length; f++) {
        if (!(food[f][3] < reachD)) continue;
        for (let c = 0; c < C2; c++) {
          for (let k = 0; k < N; k++) {
            const q = c * N + k;
            if ((pos[2 * q] - food[f][0]) ** 2 + (pos[2 * q + 1] - food[f][1]) ** 2 <= er2) { eat[c] += val[f] * Math.exp(-t[k]); break; }
          }
        }
      }
      const cells = new Map();
      food.forEach((f, k) => {
        if (P.REMAINS_ONLY && f[2] < P.REMAINS) return;      // REMAINS_ONLY: heaps are made of dead-snake food only (sz 14-16; ambient 3-9)
        const key = Math.floor(f[0] / 250) + ',' + Math.floor(f[1] / 250);
        if (!cells.has(key)) cells.set(key, [Math.floor(f[0] / 250), Math.floor(f[1] / 250), 0]);
        cells.get(key)[2] += val[k];
      });
      const keys = [...cells.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      if (keys.length) {
      let bk = 0, bv = -Infinity;
      keys.forEach((k, j) => {
        const cx = (k[0] + .5) * 250, cy = (k[1] + .5) * 250, v = k[2] / (hypot(cx - px, cy - py) + 400);
        if (v > bv) { bv = v; bk = j; }
      });
      goal = [(keys[bk][0] + .5) * 250, (keys[bk][1] + .5) * 250]; goalVal = keys[bk][2];
      heaps = keys.map(k => {      // overlay: the richest cells, their pull and rivals
        const x = (k[0] + .5) * 250, y = (k[1] + .5) * 250;
        return {x, y, mass: k[2], value: k[2] / (hypot(x - px, y - py) + 400), rivals: heads.filter(h => hypot(h[0] - x, h[1] - y) < 350).length};
      }).sort((a, b) => b.value - a.value).slice(0, 8);
      }
    }

    // Choose.
    const nearHead = heads.some(h => hypot(h[0] - px, h[1] - py) < 400);
    const sizeK = P.SIZE_SAFE ? Math.max(1, sc / 2) : 1;         // SIZE_SAFE: the same px is thinner for a thick snake
    const safeNow = (heads.some(h => hypot(h[0] - px, h[1] - py) < 300) ? P.SAFE_HEADS : P.SAFE) * sizeK;
    const thr = Array.from(eat, e => e > 20 && !nearHead && threat === 0 ? P.TIGHT * sizeK : safeNow);
    // Threading a narrow gap: judge the pass by the gap itself (centre-line clearance minus THREAD_TOL).
    const threadI = new Array(C2).fill(false), threadBonus = new Float64Array(C2);
    let threadW = null;
    for (const g of gaps) {
      let any = false;
      const dm = new Float64Array(C2).fill(Infinity);
      for (let q = 0; q < NP; q++) dm[(q / N) | 0] = Math.min(dm[(q / N) | 0], hypot(pos[2 * q] - g.m[0], pos[2 * q + 1] - g.m[1]));
      for (let c = 0; c < C2; c++) if (dm[c] < g.w / 2) any = true;
      if (!any) continue;
      const half = g.w / 2 - ro;
      for (let c = 0; c < C2; c++) if (dm[c] < g.w / 2) {
        thr[c] = Math.min(thr[c], Math.max(P.HARD + 1, half - P.THREAD_TOL));
        threadBonus[c] += P.W_THREAD - P.W_CENTRE * Math.min(1, dm[c] / Math.max(g.w / 2, 1));
        threadI[c] = true;
      }
      if (threadW === null || g.w < threadW.w) threadW = g;
    }
    let safe = Array.from(clear, (v, c) => v >= thr[c] && hard[c] >= Math.min(thr[c], P.HARD_PHYS));
    const deadEnds = safe.some((v, c) => v && onward[c] >= P.LONG_SAFE);
    if (deadEnds) safe = safe.map((v, c) => v && onward[c] >= P.LONG_SAFE);
    const endX = c => pos[2 * (c * N + N - 1)], endY = c => pos[2 * (c * N + N - 1) + 1];
    const wFood = wrapEsc !== null ? 0 : P.W_FOOD * (threat > 0 ? .5 : 1);
    const score = new Float64Array(C2), plen = new Float64Array(C2), terms = {};
    // Score terms for the overlay: each addition goes to score exactly as before and is also kept by name.
    const term = (name, c, v) => { (terms[name] || (terms[name] = new Float64Array(C2)))[c] += v; };
    const add = (name, c, v) => { score[c] += v; term(name, c, v); };
    for (let c = 0; c < C2; c++) {
      const room = Math.min(300, fieldGap(field, endX(c), endY(c)) - ro);
      const tb = threadBonus[c];
      score[c] = wFood * eat[c] + P.W_OPEN * room - P.W_TURN * deg(Math.abs(wrap(hd[c] - prev))) + tb;
      term('food', c, wFood * eat[c]); term('open', c, P.W_OPEN * room);
      term('turn', c, -(P.W_TURN * deg(Math.abs(wrap(hd[c] - prev))))); term('thread', c, tb);
      let L = 0, x0 = px, y0 = py;
      for (let k = 0; k < N; k++) { const q = c * N + k; L += hypot(pos[2 * q] - x0, pos[2 * q + 1] - y0); x0 = pos[2 * q]; y0 = pos[2 * q + 1]; }
      plen[c] = L;
      add('prog', c, P.W_PROG * hypot(endX(c) - px, endY(c) - py) / Math.max(L, 1));
    }
    for (const [risk, g, now] of bigTerms) for (let c = 0; c < C2; c++) {
      let later = Infinity;
      for (const k of g) later = Math.min(later, segDist(endX(c), endY(c), S, k) - S[5 * k + 4]);
      add('big', c, P.W_BIG * risk * clip((later - now) / Math.max(plen[c], 1), -1, 1));
    }
    // 2.a Coiled up (own body all round our head): straighten out away from where our body is.
    let curl = 0;
    if (no > 20 && !ring) {
      const cov = new Array(24).fill(false); let sx = 0, sy = 0, cnt = 0;
      for (let k = 0; k < no - 10; k++) {
        const rx = own[2 * k] - px, ry = own[2 * k + 1] - py;
        if (hypot(rx, ry) < 300) { cov[Math.trunc((Math.atan2(ry, rx) + PI) / (2 * PI) * 24) % 24] = true; sx += rx; sy += ry; cnt++; }
      }
      if (cnt) {
        curl = cov.filter(Boolean).length / 24;
        if (curl > P.CURL_ON) {
          const away = Math.atan2(-(sy / cnt), -(sx / cnt));
          for (let c = 0; c < C2; c++) add('curl', c, P.W_CURL * Math.min(1, (curl - P.CURL_ON) / .35) * Math.cos(wrap(hd[c] - away)));
        }
      }
    }
    // 2.b Never ride alongside a longer (or clearly thicker) snake in its own direction.
    if (ns) {
      let ownLen = 0;
      for (let k = 1; k < no; k++) ownLen += hypot(own[2 * k] - own[2 * k - 2], own[2 * k + 1] - own[2 * k - 1]);
      for (const i of uniqueSorted(sid.filter((_, k) => nearAll[k] < 400))) {
        let len = 0, kb = -1;
        for (let k = 0; k < ns; k++) if (sid[k] === i) {
          len += hypot(S[5 * k + 2] - S[5 * k], S[5 * k + 3] - S[5 * k + 1]);
          if (kb < 0 || nearAll[k] < nearAll[kb]) kb = k;
        }
        const first = sid.indexOf(i);
        if (!(len >= P.LONG_RATIO * Math.max(ownLen, 1) || S[5 * first + 4] >= 1.3 * ro)) continue;
        const tang = Math.atan2(S[5 * kb + 3] - S[5 * kb + 1], S[5 * kb + 2] - S[5 * kb]);
        for (let c = 0; c < C2; c++) add('par', c, -(P.W_PAR * (1 - nearAll[kb] / 400) * Math.max(0, Math.cos(wrap(hd[c] - tang)))));
      }
    }
    // No riding the rim: beyond RIM of the map radius, pull back toward the middle.
    const dC = hypot(px - W0, py - W1);
    if (dC > P.RIM * W2) for (let c = 0; c < C2; c++)
      add('rim', c, P.W_CENTER * Math.min(1, (dC / W2 - P.RIM) / .3) * Math.cos(wrap(hd[c] - Math.atan2(W1 - py, W0 - px))));
    // Aggressive: close in on the nearest head, aiming where it will be in 0.5 s.
    const sizeGate = P.SIZE_GATE ? clip((3 - sc) / 1.5, 0, 1) : 1;   // SIZE_GATE: no hunting / crowding when big
    if (P.W_HUNT && sizeGate && heads.length && attacker === null && wrapEsc === null) {
      let hn = heads[0];
      for (const h of heads) if (hypot(h[0] - px, h[1] - py) < hypot(hn[0] - px, hn[1] - py)) hn = h;
      const ax = hn[0] + .5 * Math.max(hn[3], 4) * PX_PER_SP * Math.cos(hn[2]), ay = hn[1] + .5 * Math.max(hn[3], 4) * PX_PER_SP * Math.sin(hn[2]);
      for (let c = 0; c < C2; c++) add('hunt', c, P.W_HUNT * sizeGate * Math.cos(wrap(hd[c] - Math.atan2(ay - py, ax - px))));
    }
    // Head for the crowd (aggressive): the head with the most other heads within CROWD_R, discounted by distance.
    let crowdAt = null;
    if (P.W_CROWD && sizeGate && wrapEsc === null) {
      let pull = 1;
      if (nh) {
        const cnt = [];
        for (let a = 0; a < nh; a++) { let n = 0; for (let b = 0; b < nh; b++) if (hypot(H5[5 * a] - H5[5 * b], H5[5 * a + 1] - H5[5 * b + 1]) < P.CROWD_R) n++; cnt.push(n); }
        const k = argmax(cnt.map((n, a) => n / (hypot(H5[5 * a] - px, H5[5 * a + 1] - py) + 800)));
        let sx = 0, sy = 0, m = 0;
        for (let b = 0; b < nh; b++) if (hypot(H5[5 * b] - H5[5 * k], H5[5 * b + 1] - H5[5 * k + 1]) < P.CROWD_R) { sx += H5[5 * b]; sy += H5[5 * b + 1]; m++; }
        crowdAt = [sx / m, sy / m]; pull = Math.min(1, cnt[k] / 4);
      } else crowdAt = [W0, W1];
      if (hypot(crowdAt[0] - px, crowdAt[1] - py) > 250) for (let c = 0; c < C2; c++)
        add('crowd', c, P.W_CROWD * sizeGate * pull * Math.cos(wrap(hd[c] - Math.atan2(crowdAt[1] - py, crowdAt[0] - px))));
    }
    const eatMax = Math.max(...eat);
    const looping = T < this.wpUntil && this.wp !== null && !ring && goalVal < 20 && eatMax <= 0;
    if (looping) for (let c = 0; c < C2; c++) add('loop', c, P.W_WP * Math.cos(wrap(hd[c] - Math.atan2(this.wp[1] - py, this.wp[0] - px))));
    let heapChase = false;
    if (goal !== null && wrapEsc === null) {
      const ga = Math.atan2(goal[1] - py, goal[0] - px);
      // RIVAL_R (2026-09-27): heads within RIVAL_R heading for the heap (within 30 deg) count as rivals too
      const rivalHeads = heads.filter(h => { const d = hypot(h[0] - goal[0], h[1] - goal[1]);
        return d < 350 || (P.RIVAL_R > 0 && d < P.RIVAL_R && Math.abs(wrap(h[2] - Math.atan2(goal[1] - h[1], goal[0] - h[0]))) < rad(30)); });
      const rivals = rivalHeads.length, rivalBoost = rivalHeads.some(h => h[3] > 8);
      const pull = Math.min(1, goalVal / 40) * Math.pow(.75, rivals);
      for (let c = 0; c < C2; c++) add('goal', c, P.W_GOAL * pull * Math.cos(wrap(hd[c] - ga)));
      // HEAP_GATE: the aggressive profile skips the heap boost too when a rival is boosting for it (or we are big), or under threat
      const gated = (aggressive ? !!P.HEAP_GATE && ((rivals > 0 && (rivalBoost || sc >= 2.5)) || threat > 0) : (rivals > 0 || threat > 0));
      if (goalVal >= 4 * P.REMAINS * 2 && hypot(goal[0] - px, goal[1] - py) > 150 && s.L >= 80 && !gated) {
        const bonus = Math.max(P.BOOST_COST, 0) + 10 + Math.min(20, goalVal / 100);
        for (let c = 0; c < C2; c++) {
          const cg = Math.cos(wrap(hd[c] - ga));
          add('heap', c, (bst[c] ? bonus : 0) * (aggressive ? (1 + cg) / 2 : (cg > .9 ? 1 : 0)));
        }
        heapChase = aggressive;
      }
    }
    if (wrapEsc !== null) {
      for (let c = 0; c < C2; c++) {
        const cw = Math.cos(wrap(hd[c] - wrapEsc));
        add('wrap', c, P.W_WRAP * wrapCov * cw + (bst[c] ? P.BOOST_COST + 25 : 0) * (cw > .8 ? 1 : 0));
      }
      if (wfHit) {          // WF: only headings within WF_ANG of the exit stay eligible (if any is safe); boost matches the wrapper
        const wantBoost = wrapHeadSp > 8 || wrapCov >= P.WF_BOOST_COV;
        const inAng = hd.map(h => Math.abs(wrap(h - wrapEsc)) <= rad(P.WF_ANG));
        if (safe.some((v, c) => v && inAng[c])) for (let c = 0; c < C2; c++) if (!inAng[c]) safe[c] = false;
        for (let c = 0; c < C2; c++) add('wforce', c, (inAng[c] ? 1e4 : 0) + (bst[c] === wantBoost ? 5e3 : 0));
      }
    } else for (let c = 0; c < C2; c++) add('esc', c, P.W_ESC * Math.max(0, (enclosed - .3) / .7) * Math.cos(wrap(hd[c] - esc)));
    // MODE_DWELL (2026-09-27): a threat / wrap pull that just vanished fades out over MODE_DWELL s instead of dropping
    // to 0 (last 10 s before deaths: mode changes 2.7/s vs 1.6, commands flipping).
    if (P.MODE_DWELL > 0) {
      if (wrapEsc !== null) this.lastWrap = [wrapEsc, wrapCov, T];
      else if (this.lastWrap !== null && T - this.lastWrap[2] < P.MODE_DWELL) {
        const [e0, cov0, t0] = this.lastWrap, k = 1 - (T - t0) / P.MODE_DWELL;
        for (let c = 0; c < C2; c++) add('wrap', c, P.W_WRAP * cov0 * k * Math.cos(wrap(hd[c] - e0)));
      }
      if (attacker === null && this.lastAway !== null && T - this.lastAway[2] < P.MODE_DWELL) {
        const [a0, th0, t0] = this.lastAway, k = th0 * (1 - (T - t0) / P.MODE_DWELL);
        for (let c = 0; c < C2; c++) { const ca = Math.cos(wrap(hd[c] - a0)); add('away', c, P.W_AWAY * k * ca); add('run', c, P.W_RUN * k * ca); }
      }
    }
    let away = 0;
    if (attacker !== null) {
      away = Math.atan2(py - attacker[1], px - attacker[0]);
      this.lastAway = [away, threat, T];
      for (let c = 0; c < C2; c++) add('away', c, P.W_AWAY * threat * Math.cos(wrap(hd[c] - away)));
      for (let c = 0; c < C2; c++) {
        const ca = Math.cos(wrap(hd[c] - away));
        add('run', c, P.W_RUN * threat * ca + (bst[c] ? P.W_RUN * threat : 0) * (ca > .5 ? 1 : 0));
      }
    }
    for (const h of heads) {      // 3.c: our path crosses its straight path well before it gets there
      if (hypot(h[0] - px, h[1] - py) > 500) continue;
      const hp = headPaths(h, 0), lim2 = (ro + R * h[4] + 10) ** 2;
      for (let c = 0; c < C2; c++) {
        let cut = false;
        for (let k = 0; k < N && !cut; k++) for (let j = 0; j < N; j++) {
          if ((pos[2 * (c * N + k)] - hp.pts[2 * j]) ** 2 + (pos[2 * (c * N + k) + 1] - hp.pts[2 * j + 1]) ** 2 < lim2 && t[k] + .25 < hp.ts[j]) { cut = true; break; }
        }
        if (cut) add('cut', c, P.W_CUT);
      }
    }
    // ATTACK_GUARD (cycle 4, Claude+Codex design 2026-09-27): attackers = the 3 nearest heads within GUARD_R (boosting) /
    // 600 px (cruising) that close on us or are raiders. Each gets 3 forecast paths over GUARD_T s (straight, turning toward
    // us, turning toward where we will be), laid as body. For every safe plan, the first time (TTC) its GUARD_T path (the
    // 1.2 s plan, then straight) comes within ro+hr+SAFE of forecast body laid before then (+0.15 s). Plans with TTC below
    // GUARD_TTC are dropped, the rest pay W_GUARD scaled by earliness; if every plan is dropped the latest-TTC ones stay
    // (never falls into emergency because of a forecast). Deaths: killers within 800 px 3 s out in 14/24, boosting ones
    // cover 1,300 px in 3 s.
    let guardTTC = null, guardForced = false, guardN = 0, gpaths = null, gM = 0;
    if (P.GUARD_ON && heads.length && safe.some(Boolean)) {
      const atk = [];
      for (const h of heads) {
        const rx = h[0] - px, ry = h[1] - py, dist = hypot(rx, ry), boosting = h[3] > 8;
        if (dist > (boosting ? P.GUARD_R : 600)) continue;
        const closing = Math.cos(h[2] - Math.atan2(-ry, -rx));
        if (closing <= 0 && !h.raider) continue;
        atk.push({h, dist});
      }
      atk.sort((a, b) => a.dist - b.dist); atk.length = Math.min(atk.length, 3); guardN = atk.length;
      if (atk.length) {
        const M = Math.round(P.GUARD_T / DT), fpaths = [];
        const aheadX = px + 1.2 * sp * PX_PER_SP * Math.cos(ang), aheadY = py + 1.2 * sp * PX_PER_SP * Math.sin(ang);
        for (const {h} of atk) {
          const hr = R * h[4] + P.thickOff(R * h[4]), tr = turnRate(h[4]) * .7, v0 = Math.max(h[3], 4), rate = (BOOST_SP - cruiseSp(h[4])) / RAMP;
          const lim = ro + hr + P.SAFE, m = lim + 10;
          for (const aim of [null, Math.atan2(py - h[1], px - h[0]), Math.atan2(aheadY - h[1], aheadX - h[0])]) {
            const pts = new Float64Array(2 * M); let x = h[0], y = h[1], hd = h[2], x0 = x, y0 = y, x1 = x, y1 = y;
            for (let k = 1; k <= M; k++) {
              if (aim !== null) { const d = wrap(aim - hd); hd += sign(d) * Math.min(Math.abs(d), tr * DT); }
              const v = (h[3] > 8 ? Math.min(BOOST_SP, v0 + rate * k * DT) : v0) * PX_PER_SP;
              x += v * DT * Math.cos(hd); y += v * DT * Math.sin(hd); pts[2 * k - 2] = x; pts[2 * k - 1] = y;
              x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
            }
            fpaths.push({pts, lim2: lim * lim, box: [x0 - m, y0 - m, x1 + m, y1 + m]});
          }
        }
        guardTTC = new Float64Array(C2).fill(Infinity); gpaths = fpaths; gM = M;
        const ox = new Float64Array(M), oy = new Float64Array(M);
        for (let c = 0; c < C2; c++) {
          if (!safe[c]) continue;
          const ex = pos[2 * (c * N + N - 1)], ey = pos[2 * (c * N + N - 1) + 1];
          const endH = Math.atan2(ey - pos[2 * (c * N + N - 2) + 1], ex - pos[2 * (c * N + N - 2)]);
          const v = (bst[c] ? BOOST_SP : cruiseSp(sc)) * PX_PER_SP * DT;
          let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
          for (let k = 0; k < M; k++) {
            if (k < N) { ox[k] = pos[2 * (c * N + k)]; oy[k] = pos[2 * (c * N + k) + 1]; }
            else { ox[k] = ex + (k - N + 1) * v * Math.cos(endH); oy[k] = ey + (k - N + 1) * v * Math.sin(endH); }
            bx0 = Math.min(bx0, ox[k]); by0 = Math.min(by0, oy[k]); bx1 = Math.max(bx1, ox[k]); by1 = Math.max(by1, oy[k]);
          }
          for (const f of fpaths) {
            if (bx1 < f.box[0] || bx0 > f.box[2] || by1 < f.box[1] || by0 > f.box[3]) continue;
            let hit = Infinity;
            for (let k = 0; k < M && (k + 1) * DT < hit; k++) {
              const jmax = Math.min(M, k + 1 + 2);            // forecast points laid before our time + 0.15 s (2 steps)
              for (let j = 0; j < jmax; j++) {
                const dx = ox[k] - f.pts[2 * j], dy = oy[k] - f.pts[2 * j + 1];
                if (dx * dx + dy * dy < f.lim2) { hit = (k + 1) * DT; break; }
              }
            }
            if (hit < guardTTC[c]) guardTTC[c] = hit;
          }
        }
        let anyOk = false;
        for (let c = 0; c < C2; c++) if (safe[c] && guardTTC[c] >= P.GUARD_TTC) anyOk = true;
        if (anyOk) {
          safe = safe.map((v, c) => v && guardTTC[c] >= P.GUARD_TTC);
          for (let c = 0; c < C2; c++) if (safe[c] && guardTTC[c] < P.GUARD_T) add('guard', c, -P.W_GUARD * (P.GUARD_T - guardTTC[c]) / P.GUARD_T);
        } else {                       // every plan meets forecast body soon: keep the latest ones, the score picks among them
          guardForced = true;
          let best = -Infinity; for (let c = 0; c < C2; c++) if (safe[c]) best = Math.max(best, guardTTC[c]);
          safe = safe.map((v, c) => v && guardTTC[c] >= best - DT / 2);
        }
      }
    }
    if (P.GIANT_ON && giantHit && this.giantTarget !== null) {
      const gid = this.giantTarget.id, seg = []; let now = Infinity;
      for (let k = 0; k < ns; k++) if (sid[k] === gid) { seg.push(k); now = Math.min(now, nearAll[k]); }
      if (seg.length) {
        const keep = safe.map((v, c) => { if (!v) return false; let later = Infinity;
          for (const k of seg) later = Math.min(later, segDist(endX(c), endY(c), S, k) - S[5 * k + 4]); return later >= now; });
        if (keep.some(Boolean)) safe = keep;
      }
    }
    const anySafe = () => safe.some(Boolean);
    const danger = attacker !== null || wrapEsc !== null || !anySafe() || squeeze !== null;
    const bcost = danger ? Math.min(P.BOOST_DANGER, P.BOOST_COST) : P.BOOST_COST + (s.L < 80 && attacker === null ? 1e3 : 0);   // BOOST_DANGER 0 = free
    for (let c = C; c < C2; c++) add('boost', c, -(bcost));
    const wt = turnRate(sc), base = ang + clip(wrap(prev - ang), -wt * P.LAT, wt * P.LAT);
    const turn = hd.map(h => wrap(h - base));
    let flip = turn.map(v => sign(v) === -this.turnSign && Math.abs(v) > PI / 2);
    for (let c = 0; c < C2; c++) if (flip[c]) add('flip', c, -(50));
    if (squeeze) for (let c = 0; c < C2; c++)       // full cost when B's cut-in would touch this plan, none beyond 60 px
      add('squeeze', c, -P.W_SQUEEZE * clip(1 - sqGap[c] / 60, 0, 1));
    const kc = this.coilDir > 0 ? K90 : KM90;
    let wrong = new Array(C2).fill(false);
    if (ring) {
      wrong = turn.map(v => sign(v) === -this.coilDir && Math.abs(v) > rad(10));
      safe = safe.map((v, c) => v && !wrong[c]);
      for (let c = 0; c < C2; c++) if (wrong[c]) score[c] = -1e6;
      flip = flip.map((v, c) => v || wrong[c]);
    }
    const commit = ring ? this.coilDir : this.turnSign !== 0 ? this.turnSign : (T < this.sideUntil ? this.side : 0);
    const against = turn.map(v => commit !== 0 && sign(v) === -commit && Math.abs(v) > rad(30));
    const sided = safe.some((v, c) => v && !against[c]);
    if (sided) safe = safe.map((v, c) => v && !against[c]);
    let coilHard = Infinity, coil = null;
    if (ring) {      // judge the coil on the path it really drives (continuous full-rate turn)
      coil = coilPath(P, px, py, ang, sp, sc, prev, this.coilDir, this.prevBoost);
      let a = Infinity, b = Infinity;
      for (let k = 0; k < N; k++) {
        const x = coil.pos[2 * k], y = coil.pos[2 * k + 1];
        a = Math.min(a, fieldGap(field, x, y) - ro); b = Math.min(b, W2 - hypot(x - W0, y - W1) - ro);
      }
      coilHard = Math.min(a, b);
      for (const [hp, hr] of hpaths) {
        let d2m = Infinity;
        for (let k = 0; k < N; k++) for (let j = 0; j < hp.ts.length; j++) {
          const d2 = hp.ts[j] <= coil.t[k] + .15 ? (coil.pos[2 * k] - hp.pts[2 * j]) ** 2 + (coil.pos[2 * k + 1] - hp.pts[2 * j + 1]) ** 2 : 1e8;
          if (d2 < d2m) d2m = d2;
        }
        coilHard = Math.min(coilHard, Math.sqrt(d2m) - ro - hr);
      }
    }
    const calm = !ring && wrapEsc === null && attacker === null && bigRisk < .5 && threat === 0 && !heapChase && safe[K0];
    const held = this.prevBoost ? C2 - 1 : C - 1;
    let holdBy = null, mode, i;
    if (this.pend !== null && (T - this.pend[3] > P.PEND_GAP || !anySafe() || (ring && coilHard > P.HARD))) this.pend = null;
    if (ring && coilHard > P.HARD) { mode = 'coil'; i = kc; }
    else if (anySafe()) {
      mode = wrapEsc !== null ? 'unwrap' : looping ? 'loop' : attacker !== null ? 'evade' : enclosed > .6 ? 'escape'
        : eatMax > 0 || goalVal > 0 ? 'feed' : 'cruise';
      i = argmax(Array.from(score, (v, c) => safe[c] ? v : -Infinity));
      if (safe[held] && !danger) {
        if (i !== held && score[i] >= score[held] + P.SWITCH) {
          const same = this.pend !== null && Math.abs(wrap(hd[i] - this.pend[0])) < rad(15) && bst[i] === this.pend[1] && this.pend[4] === mode;
          this.pend = [hd[i], bst[i], same ? this.pend[2] + 1 : 1, T, mode];
          if (this.pend[2] < P.CONFIRM) { i = held; holdBy = 'confirm'; }
        } else { this.pend = null; i = held; }
      } else if (!safe[held]) this.pend = null;
      else { this.pend = null; if (score[held] >= score[i] - P.SWITCH) i = held; }
      // Boost is a speed state: in calm feeding no change back within BOOST_DWELL of the last change.
      if (bst[i] !== this.prevBoost && T - this.boostSince < P.BOOST_DWELL && !danger) {
        const j = bst[i] ? i - C : i + C;
        if (safe[j]) { i = j; holdBy = 'dwell'; }
      }
      // Calm modes turn at most CALM_RATE, through the evaluated +-lim candidate.
      if (calm && Math.abs(crel[i % C]) > lim + 1e-6) {
        const j = ANGLES.length + (crel[i % C] > 0 ? 0 : 1) + (bst[i] ? C : 0);
        if (safe[j]) i = j;
      }
    } else {
      // No margin anywhere: first avoid contact at all, else put it off as long as possible.
      mode = 'emergency';
      const hit = new Array(C2).fill(N);
      for (let c = 0; c < C2; c++) for (let k = 0; k < N; k++) if (gap[c * N + k] <= P.HARD) { hit[c] = k; break; }
      const e = new Float64Array(C2);
      for (let c = 0; c < C2; c++) {
        e[c] = Math.min(clear[c], 50) + .2 * Math.min(onward[c], 100) - 30 * flip[c] - 40 * against[c] - .3 * deg(Math.abs(wrap(hd[c] - prev)))
          - 1e6 * (ring && flip[c]);
        if (attacker !== null) e[c] = e[c] + P.W_RUN * threat * (Math.cos(wrap(hd[c] - away)) > .5) * (1 + bst[c]);
      }
      const pool = ring ? wrong.map(v => !v) : new Array(C2).fill(true);
      let hmax = -Infinity; for (let c = 0; c < C2; c++) if (pool[c]) hmax = Math.max(hmax, hit[c]);
      let cand = pool.map((v, c) => v && hit[c] === hmax);
      if (hmax < N && !cand.some((v, c) => v && !against[c]) && pool.some((v, c) => v && hit[c] >= hmax - 3 && !against[c]))
        cand = pool.map((v, c) => v && hit[c] >= hmax - 3 && !against[c]);
      i = argmax(Array.from(e, (v, c) => cand[c] ? v : -Infinity));
    }
    if (bst[i] !== this.prevBoost) this.boostSince = T;
    const cmd = wrap(hd[i]);
    if (Math.abs(wrap(cmd - ang)) > rad(30)) { this.side = sign(wrap(cmd - ang)); this.sideUntil = T + P.SIDE_HOLD; }
    this.prev = cmd; this.prevBoost = bst[i];

    // Trace (as pilot.py) and what the overlay draws.
    let thread = null, near = [];
    if (ns) {
      let f = 0; for (let k = 1; k < ns; k++) if (nearAll[k] < nearAll[f]) f = k;
      let j = -1; for (let k = 0; k < ns; k++) if (sid[k] !== sid[f] && (j < 0 || nearAll[k] < nearAll[j])) j = k;
      if (j >= 0) {
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const sd = k => sign(ux * ((S[5 * k + 1] + S[5 * k + 3]) / 2 - py) - uy * ((S[5 * k] + S[5 * k + 2]) / 2 - px));
        thread = [r1(nearAll[f] - ro), r1(nearAll[j] - ro), sd(f) !== sd(j)];
      }
      // overlay (user 2026-09-28): the 3 nearest body points, each with the drawn gap and the distance to the measured
      // death boundary (gap - BOUND_GAP when the calibration is on; 0 = we die here)
      const bySnake = new Map();
      for (let k = 0; k < ns; k++) if (nearAll[k] < 1000 && (!bySnake.has(sid[k]) || nearAll[k] < nearAll[bySnake.get(sid[k])])) bySnake.set(sid[k], k);
      const bound = P.BOUND_CAL ? P.BOUND_GAP : 0;
      for (const [id, k] of bySnake) {
        const ax = S[5 * k], ay = S[5 * k + 1], bx = S[5 * k + 2] - ax, by = S[5 * k + 3] - ay;
        const tt = clip(((px - ax) * bx + (py - ay) * by) / Math.max(bx * bx + by * by, 1e-9), 0, 1);
        near.push({id, gap: nearAll[k] - ro, dead: nearAll[k] - ro - bound, x: ax + tt * bx, y: ay + tt * by, r: S[5 * k + 4]});
      }
      near.sort((u, v) => u.gap - v.gap); near.length = Math.min(near.length, 3);
    }
    const trace = {mode, boost: bst[i], cmd: r1(deg(cmd)), clear: r1(mode === 'coil' ? coilHard : clear[i]),
      hard: r1(mode === 'coil' ? coilHard : hard[i]), n_safe: safe.filter(Boolean).length, threat: r2(threat),
      enclosed: r2(enclosed), wrap: r2(wrapCov), thr: thr[i], eat: r1(eat[i]), goal: r1(goalVal), thread, L: s.L, sc: r2(sc),
      died_near: this.diedNear, kills: this.kills, big: r2(bigRisk), curl: r2(curl), prof: this.profile, onward: r1(onward[i]),
      nh: heads.length, hold_by: holdBy, esc: wrapEsc === null ? null : r1(deg(wrapEsc)),
      cov: r2(covMax), cov_id: covId, cov_free: covFree, sized: this.sizedT, guard: guardTTC === null ? null : r1(Math.min(guardTTC[i], 9)), gforce: guardForced ? 1 : 0, gatk: guardN, giant: giantHit ? 1 : 0, wf: wfHit ? 1 : 0, raid: heads.filter(h => h.raider).length,
      gap: threadW === null ? null : [r1(threadW.w), r1(threadW.ra), r1(threadW.rb), r1(ro), threadI[i]],
      squeeze: squeeze && [r1(squeeze.A.gap), r1(squeeze.B.gap), r1(squeeze.ahead)]};
    const chosen = Array.from(pos.subarray(2 * i * N, 2 * (i + 1) * N));
    // Overlay analysis (display only): why each candidate is not safe (1 clear < thr, 2 hard < phys, 3 dead end,
    // 4 against the committed side, 5 against the coil), score terms of the chosen / runner-up / held plans, head
    // forecasts, bearings around us, the chosen plan's look-ahead rays, food heaps.
    const why = new Uint8Array(C2), ends = new Float64Array(2 * C2);
    for (let c = 0; c < C2; c++) {
      ends[2 * c] = endX(c); ends[2 * c + 1] = endY(c);
      why[c] = safe[c] ? 0 : !(clear[c] >= thr[c]) ? 1 : !(hard[c] >= Math.min(thr[c], P.HARD_PHYS)) ? 2
        : deadEnds && !(onward[c] >= P.LONG_SAFE) ? 3 : wrong[c] ? 5 : sided && against[c] ? 4 : 9;
    }
    let runner = -1;           // best other plan (safe first): another heading (> 5 deg) or the other boost state
    for (let c = 0; c < C2; c++) if (c !== i && !(bst[c] === bst[i] && Math.abs(wrap(hd[c] - hd[i])) < rad(5))
      && (runner < 0 || (safe[c] && !safe[runner]) || (safe[c] === safe[runner] && score[c] > score[runner]))) runner = c;
    const termsOf = c => {
      const o = {};
      if (c < 0) return o;
      for (const k in terms) if (terms[k][c]) o[k] = terms[k][c];
      return {terms: o, total: score[c], safe: safe[c], boost: bst[c], turn: deg(wrap(hd[c] - ang))};
    };
    const nfan = LONG_FAN.length;
    const analysis = {why, ends, i, runner, held, holdBy, SWITCH: P.SWITCH,
      plans: {chosen: termsOf(i), runner: termsOf(runner), held: termsOf(held)},
      heldPath: Array.from(pos.subarray(2 * held * N, 2 * (held + 1) * N)),
      runnerPath: runner >= 0 ? Array.from(pos.subarray(2 * runner * N, 2 * (runner + 1) * N)) : null,
      heads: hpaths.map(([hp], m) => ({pts: hp.pts, attacker: heads[m] === attacker})),
      ring: {occ, bins: wrapBins, esc, wrapEsc, wrapCov, enclosed, curl},
      rays: {x: endX(i), y: endY(i), h: Math.atan2(endY(i) - pos[2 * (i * N + N - 2) + 1], endX(i) - pos[2 * (i * N + N - 2)]),
        fan: LONG_FAN, worst: Array.from(rayWorst.subarray(i * nfan, (i + 1) * nfan)), len: P.LONG_T * cs * PX_PER_SP, need: P.LONG_SAFE},
      heaps, thr: thr[i],
      squeeze: squeeze && {long: squeeze.long.map(l => l.pts), a: squeeze.A.pt, b: [squeeze.h[0], squeeze.h[1]], ahead: squeeze.ahead,
        gapA: squeeze.A.gap, gapB: squeeze.B.gap}};
    this.last = {mode, trace, draw: {chosen: mode === 'coil' ? Array.from(coil.pos) : chosen, safe, pos, N, C2, i, near, gaps,
      goal, crowdAt, wp: looping ? this.wp : null, attacker: attacker && [attacker[0], attacker[1]], ro, analysis}};
    return [cmd, bst[i]];
  }
}

root.SlpPilot = {Pilot, makeParams, R, paths, ANGLES};        // paths/ANGLES: research/param_replay.mjs
}
slpPilotModule(typeof window !== 'undefined' ? window : globalThis);
