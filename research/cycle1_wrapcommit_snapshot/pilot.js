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
const turnRate = sc => rad(interp(sc, [1, 2, 3.5], [230, 200, 130]));
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
  return P;
}

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
    const t = Math.max(1, Math.trunc(roundEven(2 * (r + P.thickOff(r)) / cell)));
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
    rB: rB + P.thickOff(rB), ahead: best.ahead, h, A: wall.get(-best.side), B: wall.get(best.side), box: null};
  const m = ro + rB + P.thickOff(rB) + 100;       // ray points farther than this from every cut-in point cannot matter
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
    const rA = S[5 * A[0] + 4], rB = S[5 * B[0] + 4], ea = rA + P.thickOff(rA), eb = rB + P.thickOff(rB);
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
    this.P = makeParams(values); this.profile = profile || 'safe'; this.period = 1 / 30;
    this.prev = null; this.last = {}; this.turnSign = 0; this.seen = new Map(); this.prevBoost = false;
    this.closeHeads = new Map(); this.diedNear = 0; this.kills = 0; this.covHist = [];
    this.pending = new Map(); this.bigPrev = [];
    this.hist = []; this.wp = null; this.wpUntil = -1;
    this.coilDir = 0; this.coilLowSince = null; this.escLock = null; this.lastCoil = null; this.covSince = new Map(); this.commit = null;
    this.side = 0; this.sideUntil = -1; this.pend = null; this.boostSince = -1;
  }
  setParams(values, profile) { this.P = makeParams(values); if (profile) this.profile = profile; }

  step(s) {
    const P = this.P, aggressive = this.profile === 'aggressive';
    const px = s.x, py = s.y, ang = s.ang, sp = s.sp, sc = s.sc, T = s.t, ro = R * sc;
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
      if (dist < 600 && ((closing > .5 && aimOff < rad(25)) || cutting || crossing || close)) {
        const level = (600 - dist) / 600;
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
    let wrapCov = 0, wrapEsc = null, wrapBins = null;
    const covs = new Map();
    if (ns) {
      const past = (this.covHist.find(([t0]) => T - t0 <= 1) || [0, new Map()])[1];
      for (const i of uniqueSorted(sid.filter((_, k) => nearAll[k] < 500))) {
        const cov = new Array(24).fill(false);
        for (let k = 0; k < ns; k++) if (nearAll[k] < 500 && sid[k] === i) cov[bin[k]] = true;
        const mean = cov.filter(Boolean).length / 24;
        covs.set(i, mean);
        const rising = past.has(i) && mean >= .4 && mean - past.get(i) >= .15;
        // WRAP_COMMIT (cycle 1): a cover held >= WRAP_ON for WRAP_HOLD s starts the escape too, and the escape stays on
        // for that snake until its cover is below WRAP_OFF for WRAP_KEEP s (deaths: weaving at 0.38-0.46 below 0.5).
        if (mean >= P.WRAP_ON) { if (!this.covSince.has(i)) this.covSince.set(i, T); } else this.covSince.delete(i);
        const held = P.WRAP_COMMIT && this.covSince.has(i) && T - this.covSince.get(i) >= P.WRAP_HOLD;
        const kept = P.WRAP_COMMIT && this.commit !== null && this.commit.id === i && mean >= P.WRAP_OFF;
        if (mean > wrapCov && (mean >= .5 || rising || held || kept)) {
          wrapCov = mean; wrapBins = cov.slice();
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
          const hb = [];
          for (let m = 0; m < nh; m++) if (s.hid[m] === i) hb.push(Math.atan2(H5[5 * m + 1] - py, H5[5 * m] - px));
          if (hb.length && angOf.length >= 3) {
            const inner = angOf.slice(1, -1);
            wrapEsc = inner[argmax(inner.map(a => Math.abs(wrap(a - hb[0]))))];
          } else wrapEsc = angOf[angOf.length >> 1];
        }
      }
    }
    this.covHist = this.covHist.filter(([t0]) => T - t0 <= 1.2).concat([[T, covs]]);
    for (const i of [...this.covSince.keys()]) if (!covs.has(i)) this.covSince.delete(i);
    if (P.WRAP_COMMIT) {                 // commitment: which snake we are escaping, released after WRAP_KEEP s below WRAP_OFF
      const wid = wrapBins === null ? null : [...covs].find(([, m]) => m === wrapCov)[0];
      if (wrapEsc !== null && (this.commit === null || this.commit.id !== wid)) this.commit = {id: wid, low: null};
      else if (this.commit !== null) {
        const m = covs.get(this.commit.id) || 0;
        this.commit.low = m < P.WRAP_OFF ? (this.commit.low === null ? T : this.commit.low) : null;
        if (this.commit.low !== null && T - this.commit.low >= P.WRAP_KEEP) this.commit = null;
      }
    } else this.commit = null;
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
    if (wrapEsc === null) this.escLock = null;
    else if (this.escLock !== null && T < this.escLock[1]) wrapEsc = this.escLock[0];
    else this.escLock = [wrapEsc, T + (P.WRAP_COMMIT ? P.WRAP_LOCK : 1.5)];   // committed escapes hold the exit longer
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
        const key = Math.floor(f[0] / 250) + ',' + Math.floor(f[1] / 250);
        if (!cells.has(key)) cells.set(key, [Math.floor(f[0] / 250), Math.floor(f[1] / 250), 0]);
        cells.get(key)[2] += val[k];
      });
      const keys = [...cells.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
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

    // Choose.
    const nearHead = heads.some(h => hypot(h[0] - px, h[1] - py) < 400);
    const safeNow = heads.some(h => hypot(h[0] - px, h[1] - py) < 300) ? P.SAFE_HEADS : P.SAFE;
    const thr = Array.from(eat, e => e > 20 && !nearHead && threat === 0 ? P.TIGHT : safeNow);
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
    // WRAP_COMMIT escape: the aggressive pulls (cut across, thread gaps, big arcs) stay off and the exit pull is at least
    // W_WRAP * WRAP_PULL (cycle 1 replay: in died episodes cut 59 + thread 32 + prog 36 outweighed wrap ~13).
    const escaping = P.WRAP_COMMIT && wrapEsc !== null;
    const score = new Float64Array(C2), plen = new Float64Array(C2), terms = {};
    // Score terms for the overlay: each addition goes to score exactly as before and is also kept by name.
    const term = (name, c, v) => { (terms[name] || (terms[name] = new Float64Array(C2)))[c] += v; };
    const add = (name, c, v) => { score[c] += v; term(name, c, v); };
    for (let c = 0; c < C2; c++) {
      const room = Math.min(300, fieldGap(field, endX(c), endY(c)) - ro);
      const tb = escaping ? 0 : threadBonus[c];
      score[c] = wFood * eat[c] + P.W_OPEN * room - P.W_TURN * deg(Math.abs(wrap(hd[c] - prev))) + tb;
      term('food', c, wFood * eat[c]); term('open', c, P.W_OPEN * room);
      term('turn', c, -(P.W_TURN * deg(Math.abs(wrap(hd[c] - prev))))); term('thread', c, tb);
      let L = 0, x0 = px, y0 = py;
      for (let k = 0; k < N; k++) { const q = c * N + k; L += hypot(pos[2 * q] - x0, pos[2 * q + 1] - y0); x0 = pos[2 * q]; y0 = pos[2 * q + 1]; }
      plen[c] = L;
      if (!escaping) add('prog', c, P.W_PROG * hypot(endX(c) - px, endY(c) - py) / Math.max(L, 1));
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
    if (P.W_HUNT && heads.length && attacker === null && wrapEsc === null) {
      let hn = heads[0];
      for (const h of heads) if (hypot(h[0] - px, h[1] - py) < hypot(hn[0] - px, hn[1] - py)) hn = h;
      const ax = hn[0] + .5 * Math.max(hn[3], 4) * PX_PER_SP * Math.cos(hn[2]), ay = hn[1] + .5 * Math.max(hn[3], 4) * PX_PER_SP * Math.sin(hn[2]);
      for (let c = 0; c < C2; c++) add('hunt', c, P.W_HUNT * Math.cos(wrap(hd[c] - Math.atan2(ay - py, ax - px))));
    }
    // Head for the crowd (aggressive): the head with the most other heads within CROWD_R, discounted by distance.
    let crowdAt = null;
    if (P.W_CROWD && wrapEsc === null) {
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
        add('crowd', c, P.W_CROWD * pull * Math.cos(wrap(hd[c] - Math.atan2(crowdAt[1] - py, crowdAt[0] - px))));
    }
    const eatMax = Math.max(...eat);
    const looping = T < this.wpUntil && this.wp !== null && !ring && goalVal < 20 && eatMax <= 0;
    if (looping) for (let c = 0; c < C2; c++) add('loop', c, P.W_WP * Math.cos(wrap(hd[c] - Math.atan2(this.wp[1] - py, this.wp[0] - px))));
    let heapChase = false;
    if (goal !== null && wrapEsc === null) {
      const ga = Math.atan2(goal[1] - py, goal[0] - px);
      const rivals = heads.filter(h => hypot(h[0] - goal[0], h[1] - goal[1]) < 350).length;
      const pull = Math.min(1, goalVal / 40) * Math.pow(.75, rivals);
      for (let c = 0; c < C2; c++) add('goal', c, P.W_GOAL * pull * Math.cos(wrap(hd[c] - ga)));
      const gated = !aggressive && (rivals > 0 || threat > 0);
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
        add('wrap', c, P.W_WRAP * (escaping ? Math.max(wrapCov, P.WRAP_PULL) : wrapCov) * cw + (bst[c] ? P.BOOST_COST + 25 : 0) * (cw > .8 ? 1 : 0));
      }
    } else for (let c = 0; c < C2; c++) add('esc', c, P.W_ESC * Math.max(0, (enclosed - .3) / .7) * Math.cos(wrap(hd[c] - esc)));
    let away = 0;
    if (attacker !== null) {
      away = Math.atan2(py - attacker[1], px - attacker[0]);
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
        if (cut && !escaping) add('cut', c, P.W_CUT);
      }
    }
    const anySafe = () => safe.some(Boolean);
    const danger = attacker !== null || wrapEsc !== null || !anySafe() || squeeze !== null;
    const bcost = danger ? Math.min(0, P.BOOST_COST) : P.BOOST_COST + (s.L < 80 && attacker === null ? 1e3 : 0);
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
      const bySnake = new Map();
      for (let k = 0; k < ns; k++) if (nearAll[k] < 400 && (!bySnake.has(sid[k]) || nearAll[k] < nearAll[bySnake.get(sid[k])])) bySnake.set(sid[k], k);
      for (const [id, k] of bySnake) {
        const ax = S[5 * k], ay = S[5 * k + 1], bx = S[5 * k + 2] - ax, by = S[5 * k + 3] - ay;
        const tt = clip(((px - ax) * bx + (py - ay) * by) / Math.max(bx * bx + by * by, 1e-9), 0, 1);
        near.push({id, gap: nearAll[k] - ro, x: ax + tt * bx, y: ay + tt * by, r: S[5 * k + 4]});
      }
    }
    const trace = {mode, boost: bst[i], cmd: r1(deg(cmd)), clear: r1(mode === 'coil' ? coilHard : clear[i]),
      hard: r1(mode === 'coil' ? coilHard : hard[i]), n_safe: safe.filter(Boolean).length, threat: r2(threat),
      enclosed: r2(enclosed), wrap: r2(wrapCov), thr: thr[i], eat: r1(eat[i]), goal: r1(goalVal), thread, L: s.L, sc: r2(sc),
      died_near: this.diedNear, kills: this.kills, big: r2(bigRisk), curl: r2(curl), prof: this.profile, onward: r1(onward[i]),
      nh: heads.length, hold_by: holdBy, esc: wrapEsc === null ? null : r1(deg(wrapEsc)),
      cov: r2(covMax), cov_id: covId, cov_free: covFree,
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
