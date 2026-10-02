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

// Density trigger counts distinct observed enemy heads; bodies do not count.
function countHeads(s, radius) {
  const seen = new Set(), r2 = radius * radius; let count = 0;
  for (let i = 0; i + 4 < s.heads.length; i += 5) {
    const dx = s.heads[i] - s.x, dy = s.heads[i + 1] - s.y, id = s.hid[i / 5] ?? i;
    if (!Number.isFinite(dx + dy) || dx * dx + dy * dy > r2 || seen.has(id)) continue;
    seen.add(id); count++;
  }
  return count;
}

// Union of observed body capsules, sampled on a fixed 40x40 disk grid.
// Sampling segments rather than counting body points avoids tessellation/overlap bias.
function bodyDensity(s, radius, nearWeight = 0, selfWeight = 0) {
  if (!(radius > 0) || !Number.isFinite(radius)) return 0;
  const n = 40, cell = 2 * radius / n, covered = new Uint8Array(n * n), weights = new Float64Array(n * n);
  const gain = Number.isFinite(nearWeight) ? Math.max(0, Math.min(10, nearWeight)) : 0;
  let total = 0, hits = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const distance = Math.hypot((x + .5) * cell - radius, (y + .5) * cell - radius);
    if (distance <= radius) {
      const k = y * n + x;
      // Normalize by the whole weighted disk: 0 restores ordinary area occupancy.
      weights[k] = 1 + gain * (1 - distance / radius) ** 2;
      covered[k] = 1; total += weights[k];
    }
  }
  const selfGain = Number.isFinite(selfWeight) ? Math.max(0, Math.min(5, selfWeight)) : 0;
  let ownSegs = s.ownSegs;
  // Offline frames have an own polyline; the browser supplies explicit segments
  // so dying/missing points never create an artificial connecting segment.
  if (!ownSegs) {
    ownSegs = [];
    if (selfGain > 0) for (let i = 2; i + 1 < (s.own?.length || 0); i += 2)
      ownSegs.push(s.own[i - 2], s.own[i - 1], s.own[i], s.own[i + 1], 14.5 * (s.sc ?? 1));
  }
  // Enemy coverage wins overlap. Own coverage is counted once at selfGain.
  for (const [segments, factor] of [[s.segs, 1], [ownSegs, selfGain]]) {
    if (!(factor > 0)) continue;
    for (let i = 0; i + 4 < segments.length; i += 5) {
      const ax = segments[i] - s.x, ay = segments[i + 1] - s.y;
      const bx = segments[i + 2] - s.x, by = segments[i + 3] - s.y, r = segments[i + 4];
      if (!Number.isFinite(ax + ay + bx + by + r) || r <= 0) continue;
      const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - r + radius) / cell));
      const x1 = Math.min(n - 1, Math.floor((Math.max(ax, bx) + r + radius) / cell));
      const y0 = Math.max(0, Math.floor((Math.min(ay, by) - r + radius) / cell));
      const y1 = Math.min(n - 1, Math.floor((Math.max(ay, by) + r + radius) / cell));
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = y * n + x; if (covered[k] !== 1) continue;
        const px = (x + .5) * cell - radius - ax, py = (y + .5) * cell - radius - ay;
        const t = len2 > 0 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
        if ((px - t * dx) ** 2 + (py - t * dy) ** 2 <= r * r) { covered[k] = 2; hits += weights[k] * factor; }
      }
    }
  }
  return total ? Math.min(100, 100 * hits / total) : 0;
}

// Only the switch is new. Child controllers keep their own normal histories.
function v8Choice(K, count, t, V, density = 0) {
  const previous = K.phase;
  const radius = V.V8_HEAD_R ?? 450, threshold = Math.max(1, Math.round(V.V8_HEAD_N ?? 3));
  const body = !!V.V81_BODY_ON && (V.V81_BODY_R ?? 450) > 0 && density >= (V.V81_BODY_PCT ?? 18);
  if (count >= threshold || body) { K.phase = 'avoid'; K.clearSince = null; }
  else if (K.phase === 'avoid') {
    if (K.clearSince === null) K.clearSince = t;
    if (t - K.clearSince >= (V.V8_CLEAR_S ?? 1)) { K.phase = 'feed'; K.clearSince = null; }
  }
  return {phase: K.phase, heads: count, radius, threshold, switched: K.phase !== previous ? 1 : 0,
    bodyDensity: density, bodyTrigger: body ? 1 : 0,
    reason: count >= threshold ? (body ? 'heads+body' : 'heads') : body ? 'body' : K.phase === 'avoid' ? 'hold' : 'clear'};
}

// V10-1 reuses the original V1 wrap detector, opening selection and locks.
// Isolated state: neither original V1 nor V8 histories are changed.
function v101Wrap(K, s, V) {
  const S=s.segs||[],sid=Array.from(s.sid||[]),ns=S.length/5,px=s.x,py=s.y,T=s.t,
    ro=R*s.sc,P=makeParams(V),H5=s.heads||[],nh=H5.length/5;
  const heads=[];for(let i=0;i<nh;i++){const h=Array.from(H5.slice(i*5,i*5+5));h.id=s.hid?.[i];if(hypot(h[0]-px,h[1]-py)<P.HEAD_R)heads.push(h);}
  const nearAll=Array.from({length:ns},(_,k)=>segDist(px,py,S,k)-S[k*5+4]);
  K.covHist ||= [];K.giantSince ||= new Map();
  for(const key of ['wrapTarget','giantTarget','escLock','escId'])if(K[key]===undefined)K[key]=null;
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
      const past = (K.covHist.find(([t0]) => T - t0 <= 1) || [0, new Map()])[1];
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
          if (cond) { if (!K.giantSince.has(i)) K.giantSince.set(i, T); giantIds.add(i); } else K.giantSince.delete(i);
          giant = cond && T - K.giantSince.get(i) >= P.GIANT_HOLD;
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
    K.covHist = K.covHist.filter(([t0]) => T - t0 <= 1.2).concat([[T, covs]]);
    // WRAP_RAID target lock: the escape from snake X stays while X's head boosts within 400 px and its cover >= 0.2
    // (released 0.5 s after that stops), so a dip of the cover does not end it (cycle 1: exits ended at cover < 0.2).
    if (P.WRAP_RAID) {
      if (wrapEsc !== null) {
        if (K.wrapTarget !== null && K.wrapTarget.id !== wrapId) K.escLock = null;   // new wrapper: no stale exit
        K.wrapTarget = raidHit ? {id: wrapId, lastOk: T} : null;      // the lock only for raid-triggered escapes
      } else if (K.wrapTarget !== null) {
        const tg = K.wrapTarget, hh = heads.find(h => h.id === tg.id), m = covs.get(tg.id) || 0;
        if (hh && m >= .2 && hh[3] > 8 && hypot(hh[0] - px, hh[1] - py) < 400) tg.lastOk = T;
        if (T - tg.lastOk >= .5 || K.escLock === null) K.wrapTarget = null;
        else { wrapEsc = K.escLock[0]; wrapCov = Math.max(m, .25); wrapId = tg.id; }
      }
    } else K.wrapTarget = null;
    // GIANT_ESCAPE hold: the escape from giant X stays until its cover is below GIANT_OFF for GIANT_KEEP s or its body is gone
    if (P.GIANT_ON) {
      for (const i of [...K.giantSince.keys()]) if (!covs.has(i)) K.giantSince.delete(i);
      if (wrapEsc !== null && giantHit) {
        if (K.giantTarget === null || K.giantTarget.id !== wrapId) { K.giantTarget = {id: wrapId, low: null}; if (K.wrapTarget === null) K.escLock = null; }
        else K.giantTarget.low = null;
      } else if (K.giantTarget !== null) {
        const tg = K.giantTarget, m = covs.get(tg.id);
        if (m === undefined) K.giantTarget = null;
        else {
          tg.low = m < P.GIANT_OFF ? (tg.low === null ? T : tg.low) : null;
          if ((tg.low !== null && T - tg.low >= P.GIANT_KEEP) || K.escLock === null) K.giantTarget = null;
          else if (wrapEsc === null) { wrapEsc = K.escLock[0]; wrapCov = Math.max(m, .3); wrapId = tg.id; giantHit = true; }
        }
      }
    } else K.giantTarget = null;
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
      if (K.escId !== null && K.escId !== wrapId) K.escLock = null;   // (0928: the cover lookup threw during a hold)
      K.escId = wrapId;
    } else if (wrapEsc === null) K.escId = null;
    if (wrapEsc !== null && K.lastId !== undefined && K.lastId !== wrapId) K.escLock = null;
    if (wrapEsc === null) K.escLock = null;
    else if (K.escLock !== null && T < K.escLock[1]) wrapEsc = K.escLock[0];
    else K.escLock = [wrapEsc, T + 1.5];

  K.lastId=wrapId;
  return wrapEsc===null?null:{id:wrapId,coverage:wrapCov,angle:wrapEsc,bins:wrapBins,
    raid:raidHit,early:wfHit,headSpeed:wrapHeadSp};
}
function v101Choice(K,s,V,fallback) {
  const previous=K.phase,c=fallback();
  if(!V.V101_WRAP_ON||V.V11_ON||V.V102_ON||V.V111_ON){K.wrapState=null;K.wrapId=null;return c;}
  const e=v101Wrap(K.wrapState||(K.wrapState={}),s,V);
  const wrapChanged=(K.wrapId??null)!==(e?.id??null);K.wrapId=e?.id??null;
  if(e){K.phase='avoid';K.clearSince=null;}
  return {...c,phase:K.phase,switched:K.phase!==previous?1:0,reason:e?'wrap':c.reason,wrap:e,wrapChanged};
}

// V11 uses physical proximity instead of a crowd count or density threshold.
function v11Choice(K, s, V) {
  let headDistance=Infinity,bodyGap=Infinity;
  for(let i=0;i<(s.heads?.length||0);i+=5)headDistance=Math.min(headDistance,hypot(s.heads[i]-s.x,s.heads[i+1]-s.y));
  for(let i=0;i<(s.segs?.length||0);i+=5){const [ax,ay,bx,by,r]=s.segs.slice(i,i+5);const dx=bx-ax,dy=by-ay,u=Math.max(0,Math.min(1,((s.x-ax)*dx+(s.y-ay)*dy)/Math.max(1e-9,dx*dx+dy*dy)));bodyGap=Math.min(bodyGap,hypot(s.x-ax-u*dx,s.y-ay-u*dy)-r-R*s.sc);}
  const head=V.V11_HEAD_R>0&&headDistance<=V.V11_HEAD_R,body=V.V11_BODY_GAP>0&&bodyGap<=V.V11_BODY_GAP;
  const previous=K.phase;
  if(head||body){K.phase='avoid';K.clearSince=null;}
  else if(K.phase==='avoid'){if(K.clearSince===null)K.clearSince=s.t;if(s.t-K.clearSince>=(V.V11_CLEAR_S??1)){K.phase='feed';K.clearSince=null;}}
  return {phase:K.phase,heads:countHeads(s,V.V11_HEAD_R),radius:V.V11_HEAD_R,threshold:1,switched:K.phase!==previous?1:0,bodyDensity:0,bodyTrigger:body?1:0,headDistance,bodyGap,reason:head?(body?'near_head+body':'near_head'):body?'near_body':K.phase==='avoid'?'hold':'clear'};
}

// Largest observed food cluster: sum of pellet sizes in fixed world grid cells.
function v102Choice(K,s,V,fallback) {
  const bins=new Map(),cell=Math.max(1,V.V102_HEAP_SIZE??160),radius=Math.max(0,V.V102_FOOD_R??3000);
  for(let i=0;i+2<(s.food?.length||0);i+=3){const x=s.food[i],y=s.food[i+1],m=s.food[i+2];
    if(![x,y,m].every(Number.isFinite)||m<=0||hypot(x-s.x,y-s.y)>radius)continue;
    const key=Math.floor(x/cell)+','+Math.floor(y/cell);bins.set(key,(bins.get(key)||0)+m);
  }
  let mass=0;for(const value of bins.values())mass=Math.max(mass,value);
  const threshold=Math.max(0,V.V102_FOOD_MIN??100),previous=K.phase;
  if(!V.V102_FOOD_ON){const result=fallback();return {...result,foodMass:mass,foodThreshold:threshold,foodEnabled:0};}
  K.phase=mass>=threshold?'feed':'avoid';K.clearSince=null;
  return {phase:K.phase,heads:0,radius:0,threshold:0,switched:K.phase!==previous?1:0,bodyDensity:0,bodyTrigger:0,
    reason:K.phase==='feed'?'food_enough':'food_low',foodMass:mass,foodThreshold:threshold,foodEnabled:1};
}

class Pilot {
  constructor(values, profile) {
    this.values = values; this.P = makeParams(values); this.profile = profile || 'safe'; this.period = 1 / 30;
    this.sizedT = 0; this.wrapTarget = null; this.lastAway = null; this.lastWrap = null; 
    this.giantSince = new Map(); this.giantTarget = null; this.escId = null; this.v2last = null;
    this.prev = null; this.last = {}; this.turnSign = 0; this.seen = new Map(); this.prevBoost = false;
    this.wallPrev = null; this.wallRate = 0; this.v3h = new Map(); this.v3plan = null; this.v4goal = null; this.v41goal = null; this.v4mem = new Map(); this.v3route = null;
    this.closeHeads = new Map(); this.diedNear = 0; this.kills = 0; this.covHist = [];
    this.pending = new Map(); this.bigPrev = [];
    this.hist = []; this.wp = null; this.wpUntil = -1;
    this.coilDir = 0; this.coilLowSince = null; this.escLock = null; this.lastCoil = null;
    this.side = 0; this.sideUntil = -1; this.pend = null; this.boostSince = -1;
  }
  setParams(values, profile) { this.t4Probe=null; this.t3Probe=null;this.t3Serial=0; this.t2Probe=null;this.t2Serial=0; this.t1Probe=null;this.t1Serial=0; this.va1Target=null;this.va1Changed=null; this.v10FeedTarget=null;this.v10Held=null;this.v10Invalid=null;this.v10RouteId = null; this.v10Committed = null; this.values = values; this.P = makeParams(values); this.sizedT = 0; this.Psized = null; if (profile) this.profile = profile;
    if(this.va1Pilot)this.va1Pilot.setParams(this.va1Values(),this.profile);
    for(const [key,avoid] of [['v101Feed',false],['v101Avoid',true]])if(this[key])this[key].setParams(this.v101Values(avoid),this.profile);
    for (const [key, six] of [['v8Feed', false], ['v8Avoid', true], ['v8Plan', true]]) {
      if (this[key]) this[key].setParams(this.v8Values(six), this.profile);
    }
    for (const [key, six] of [['v7Feed', false], ['v7Avoid', true], ['v7Plan', true]]) {
      if (this[key]) this[key].setParams(this.v7Values(six), this.profile);
    }
  }
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

  t4Step(s) {
    // Fixed user-selected offset follower. Every tick is recorded; no stability gate controls approach.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,V=this.values,ro=R*sc;
    const start=V.T4_GAP??-5,bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4;
    const pr=this.t4Probe||(this.t4Probe={id:null,set:start,phase:'align',episode:0,history:[],normalVelocity:0,quantError:0,since:T,commandGap:null,lastT:T});
    const byId=new Map();for(let k=0;k<sid.length;k++){if(!byId.has(sid[k]))byId.set(sid[k],[]);byId.get(sid[k]).push(k);}
    const point=(c,a)=>{a=clip(a,0,c.len);let i=0;while(i<c.ks.length-1&&c.cum[i+1]<a)i++;const k=c.ks[i],L=c.cum[i+1]-c.cum[i],u=L?(a-c.cum[i])/L:0;return {x:S[k*5]+(S[k*5+2]-S[k*5])*u,y:S[k*5+1]+(S[k*5+3]-S[k*5+1])*u,k,a};};
    const closest=(c,x,y)=>{let q=null;for(let i=0;i<c.ks.length;i++){const k=c.ks[i],dx=S[k*5+2]-S[k*5],dy=S[k*5+3]-S[k*5+1],u=clip(((x-S[k*5])*dx+(y-S[k*5+1])*dy)/(dx*dx+dy*dy||1),0,1),qx=S[k*5]+dx*u,qy=S[k*5+1]+dy*u,d=hypot(x-qx,y-qy);if(!q||d<q.d)q={x:qx,y:qy,d,a:c.cum[i]+u*(c.cum[i+1]-c.cum[i]),i,k};}return q;};
    const tangent=(c,a)=>{const p=point(c,a-35),q=point(c,a+35);return Math.atan2(q.y-p.y,q.x-p.x);};
    const candidates=[];for(const [id,all]of byId){const total=all.reduce((n,k)=>n+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]),0);if(total<(V.T4_MIN_LEN??600))continue;
      let ks=[];const flush=()=>{if(!ks.length)return;const cum=[0];for(const k of ks)cum.push(cum.at(-1)+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]));if(cum.at(-1)<300)return;const c={id,ks:[...ks],cum,len:cum.at(-1),total,r:S[ks[0]*5+4]};c.q=closest(c,px,py);c.h=tangent(c,c.q.a);c.gap=c.q.d-ro-c.r;c.bend=Math.max(...[-100,-50,0,50,100].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;c.contactBend=Math.max(...[-ro,ro].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;candidates.push(c);};
      for(const k of all){const last=ks.at(-1);if(last!==undefined&&hypot(S[k*5]-S[last*5+2],S[k*5+1]-S[last*5+3])>2){flush();ks=[];}ks.push(k);}flush();}
    const score=c=>c.q.d+Math.min(c.bend,PI)*100-100*Math.min(c.len/2500,1);
    let tg=candidates.filter(c=>c.id===pr.id).sort((a,b)=>a.q.d-b.q.d)[0];
    if(tg&&(tg.q.d>1400||tg.bend>rad(45)||tg.contactBend>rad(10)||(pr.dir>0?tg.len-tg.q.a:tg.q.a)<220))tg=null;
    const eligible=c=>c.q.d<1400&&c.bend<rad(30)&&c.contactBend<rad(6)&&Math.max(c.len-c.q.a,c.q.a)>500;
    if(tg&&pr.phase==='align'&&T-pr.acquired>4){const best=candidates.filter(c=>eligible(c)&&c.q.d<1100).sort((a,b)=>score(a)-score(b))[0];if(best&&best.id!==tg.id&&score(best)+250<score(tg))tg=null;}
    if(!tg){tg=candidates.filter(eligible).sort((a,b)=>score(a)-score(b))[0];if(tg){pr.id=tg.id;pr.set=start;pr.commandGap=Math.max(start,tg.gap);pr.phase='align';pr.episode++;pr.history=[];pr.normalVelocity=0;pr.acquired=T;pr.since=T;delete pr.prev;
      // Pick headward travel where possible; either endpoint must have a real connected runway.
      pr.dir=tg.len-tg.q.a>500?1:tg.q.a>500?-1:1;const h=tg.h+(pr.dir<0?PI:0);pr.side=sign(Math.cos(h)*(py-tg.q.y)-Math.sin(h)*(px-tg.q.x))||1;}}
    let heading=null,lateral=null,gap=null,bend=null,remaining=null,reason='no_target',enemySpeed=null,event=null,hold=null,boost=false,desired=ang,path=[];
    const velocity=Math.max(5.5,sp)*PX_PER_SP,ph=this.v4Physics(sc),lat=.10;
    const tickDt=clip(T-pr.lastT,0,.1);pr.lastT=T;
    if(tg){gap=tg.gap;bend=tg.bend;remaining=pr.dir>0?tg.len-tg.q.a:tg.q.a;const h=tg.h+(pr.dir<0?PI:0),nx=-Math.sin(h)*pr.side,ny=Math.cos(h)*pr.side;heading=Math.abs(wrap(ang-h));
      const prev=pr.prev,dt=prev?T-prev.t:0;lateral=prev&&dt>.005&&dt<.2&&prev.id===tg.id?(gap-prev.gap)/dt:0;
      if(prev&&dt>.005&&dt<.2&&heading<rad(30)&&Math.abs(lateral)<120){const measured=velocity*(Math.cos(ang)*nx+Math.sin(ang)*ny)-lateral;pr.normalVelocity=pr.normalVelocity*.85+clip(measured,-60,60)*.15;}else pr.normalVelocity*=.95;
      pr.prev={t:T,gap,id:tg.id};if(heading<rad(25))pr.commandGap=Math.max(start,pr.commandGap-(V.T4_APPROACH??30)*tickDt);
      pr.phase=heading<rad(15)?'follow':'align';
      const predicted=gap+lat*lateral,normal=clip(pr.normalVelocity-4*(predicted-pr.commandGap),-velocity*.30,velocity*.35);
      const ahead=point(tg,tg.q.a+pr.dir*clip(velocity*.3,50,130)),future=tangent(tg,ahead.a)+(pr.dir<0?PI:0);
      desired=h+clip(wrap(future-h),-rad(30),rad(30))*.6+pr.side*Math.asin(clip(normal/velocity,-.5,.4));
      if(heading>rad(60))desired=h;
      for(let j=0;j<hid.length;j++)if(hid[j]===tg.id)enemySpeed=H[j*5+3];
      boost=!!(V.T4_BOOST??1)&&heading<rad(12)&&bend<rad(15)&&remaining>600&&(gap>80||(enemySpeed>8&&Math.abs(gap-start)<8));
      const D=ro+tg.r+pr.set;for(let a=0;a<Math.min(remaining,500);a+=40){const p=point(tg,tg.q.a+pr.dir*a),th=tangent(tg,p.a)+(pr.dir<0?PI:0);path.push(p.x-Math.sin(th)*pr.side*D,p.y+Math.cos(th)*pr.side*D);}
      reason=remaining<150?'body_endpoint':bend>rad(6)?'curve':heading>rad(8)?'align':'clean';
    }else{pr.id=null;pr.history=[];delete pr.prev;const w=s.wall||[30000,30000,20000];desired=hypot(px-w[0],py-w[1])>200?Math.atan2(w[1]-py,w[0]-px):ang;}
    const local=new Set();if(tg)for(let i=0;i<tg.ks.length;i++)if(Math.abs((tg.cum[i]+tg.cum[i+1])/2-tg.q.a)<450)local.add(tg.ks[i]);
    const keys=[];for(let k=0;k<sid.length;k++)if(segDist(px,py,S,k)-S[k*5+4]-ro<BOOST_SP*PX_PER_SP+80)keys.push(k);
    const check=(cmd,accel)=>{let st={x:px,y:py,h:ang,v:velocity},clear=Infinity,track=0;const horizon=pr.phase==='follow'?.40:.70,steps=Math.ceil(horizon/.025);
      for(let n=0;n<steps;n++){const tt=(n+1)*.025;st=this.v4Adv(st,n<4?(s.cmdNow??ang):cmd,n<4?!!s.boostNow:accel,.025,ph);
        for(const k of keys){const isTrack=tg&&sid[k]===tg.id&&local.has(k),allow=isTrack?start:8;
          const th=tg?tg.h+(pr.dir<0?PI:0):0,shift=isTrack?pr.normalVelocity*tt*pr.side:0;clear=Math.min(clear,segDist(st.x+Math.sin(th)*shift,st.y-Math.cos(th)*shift,S,k)-ro-S[k*5+4]-allow);}
        for(let j=0;j<hid.length;j++){const speed=H[j*5+3]*PX_PER_SP;clear=Math.min(clear,hypot(st.x-H[j*5]-speed*tt*Math.cos(H[j*5+2]),st.y-H[j*5+1]-speed*tt*Math.sin(H[j*5+2]))-ro-R*H[j*5+4]-25);}
        if(s.wall)clear=Math.min(clear,s.wall[2]-hypot(st.x-s.wall[0],st.y-s.wall[1])-ro-25);
      }
      if(tg){const q=closest(tg,st.x,st.y),e=q.d-ro-tg.r-pr.normalVelocity*horizon-pr.commandGap;track=(e/12)**2+Math.abs(wrap(cmd-desired))**2*3;}
      else track=Math.abs(wrap(cmd-desired))**2;return {cmd,boost:accel,clear,track,st};};
    let chosen=check(desired,boost),changed=false;
    if(chosen.clear<0){const choices=[check(desired,false),...[-.12,-.06,-.03,-.015,-.0075,0,.0075,.015,.03,.06,.12].map(d=>check(desired+d,false)),...[-PI,-PI/2,-PI/3,-PI/6,0,PI/6,PI/3,PI/2].map(d=>check(ang+d,false))],safe=choices.filter(q=>q.clear>=0);chosen=(safe.length?safe:choices).sort((a,b)=>safe.length?a.track-b.track:b.clear-a.clear)[0];changed=true;reason=safe.length?'entry_collision_turn':'entry_no_safe_turn';path=[px,py,chosen.st.x,chosen.st.y];}
    boost=chosen.boost;
    let interference=false;for(let k=0;k<sid.length;k++)if((!tg||sid[k]!==tg.id)&&segDist(px,py,S,k)-ro-S[k*5+4]<35){reason='body_interference';interference=true;break;}
    for(let j=0;j<hid.length;j++)if(hypot(H[j*5]-px,H[j*5+1]-py)<250){reason='head_interference';interference=true;break;}
    if(s.wall&&s.wall[2]-hypot(px-s.wall[0],py-s.wall[1])-ro<100){reason='wall_interference';interference=true;}
    // Quality labels never erase the raw approach or postpone the fixed gap objective.
    const valid=!!tg&&!changed&&!interference&&heading<rad(15);
    if(tg&&heading<rad(15)&&Math.abs(gap-start)<2)hold={t:T,target:tg.id,gap,heading,speed:sp,own_r:ro,enemy_r:tg.r};
    const quantum=TAU/251,code=((chosen.cmd%TAU+TAU)%TAU)/quantum,lo=Math.floor(code),fraction=code-lo;pr.quantError+=fraction;const up=pr.quantError>=1?1:0;if(up)pr.quantError-=1;const cmd=(lo+up+.15)*quantum;
    const phase=tg?(pr.phase==='follow'?'follow':'align'):'seek',trace={mode:'probe',boost,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,t4_on:1,t4_phase:phase,t4_episode:pr.episode,t4_speed:sp,t4_requested_speed:0,t4_command_gap:pr.commandGap,t4_gap_error:tg?gap-start:null,t4_own_r:ro,t4_enemy_r:tg?.r??null,t4_gap:gap,t4_set:pr.set,t4_target:tg?.id??null,t4_level:event,t4_hold:hold,t4_heading_error:heading,t4_lateral:lateral,t4_bend:bend,t4_contact_bend:tg?.contactBend??null,t4_valid:+valid,t4_reason:reason,t4_visible_length:tg?.total??0,t4_boost_reason:changed?'entry_turn_no_boost':boost?pr.phase==='follow'?'boost_measure':'catch_target':'cruise_measure',t4_enemy_speed:enemySpeed,t4_remaining:remaining,t4_boost:+boost,t4_guard_clear:chosen.clear,t4_guard_changed:+changed,pph:valid?1:phase==='seek'?0:2,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:this.t4Serial??0};
    this.last={mode:'probe',trace,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:tg?[{id:tg.id,x:tg.q.x,y:tg.q.y,r:tg.r,gap}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};this.prev=cmd;this.prevBoost=boost;return [cmd,boost];
  }

  t3Step(s) {
    // Metrology follower: continuous offset tracking and sample quality are separate states.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,V=this.values,ro=R*sc;
    const start=V.T3_GAP0??40,bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4;
    const pr=this.t3Probe||(this.t3Probe={id:null,set:start,phase:'align',episode:0,history:[],normalVelocity:0,quantError:0,since:T});
    const byId=new Map();for(let k=0;k<sid.length;k++){if(!byId.has(sid[k]))byId.set(sid[k],[]);byId.get(sid[k]).push(k);}
    const point=(c,a)=>{a=clip(a,0,c.len);let i=0;while(i<c.ks.length-1&&c.cum[i+1]<a)i++;const k=c.ks[i],L=c.cum[i+1]-c.cum[i],u=L?(a-c.cum[i])/L:0;return {x:S[k*5]+(S[k*5+2]-S[k*5])*u,y:S[k*5+1]+(S[k*5+3]-S[k*5+1])*u,k,a};};
    const closest=(c,x,y)=>{let q=null;for(let i=0;i<c.ks.length;i++){const k=c.ks[i],dx=S[k*5+2]-S[k*5],dy=S[k*5+3]-S[k*5+1],u=clip(((x-S[k*5])*dx+(y-S[k*5+1])*dy)/(dx*dx+dy*dy||1),0,1),qx=S[k*5]+dx*u,qy=S[k*5+1]+dy*u,d=hypot(x-qx,y-qy);if(!q||d<q.d)q={x:qx,y:qy,d,a:c.cum[i]+u*(c.cum[i+1]-c.cum[i]),i,k};}return q;};
    const tangent=(c,a)=>{const p=point(c,a-35),q=point(c,a+35);return Math.atan2(q.y-p.y,q.x-p.x);};
    const candidates=[];for(const [id,all]of byId){const total=all.reduce((n,k)=>n+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]),0);if(total<(V.T3_MIN_LEN??600))continue;
      let ks=[];const flush=()=>{if(!ks.length)return;const cum=[0];for(const k of ks)cum.push(cum.at(-1)+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]));if(cum.at(-1)<300)return;const c={id,ks:[...ks],cum,len:cum.at(-1),total,r:S[ks[0]*5+4]};c.q=closest(c,px,py);c.h=tangent(c,c.q.a);c.gap=c.q.d-ro-c.r;c.bend=Math.max(...[-100,-50,0,50,100].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;c.contactBend=Math.max(...[-ro,ro].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;candidates.push(c);};
      for(const k of all){const last=ks.at(-1);if(last!==undefined&&hypot(S[k*5]-S[last*5+2],S[k*5+1]-S[last*5+3])>2){flush();ks=[];}ks.push(k);}flush();}
    const score=c=>c.q.d+Math.min(c.bend,PI)*100+Math.abs(bin(c.r)-(V.T3_BIN??0))*40-100*Math.min(c.len/2500,1);
    let tg=candidates.filter(c=>c.id===pr.id).sort((a,b)=>a.q.d-b.q.d)[0];
    if(tg&&(tg.q.d>1400||tg.bend>rad(45)||tg.contactBend>rad(10)||(pr.dir>0?tg.len-tg.q.a:tg.q.a)<220))tg=null;
    const eligible=c=>c.q.d<1400&&c.bend<rad(30)&&c.contactBend<rad(6)&&Math.max(c.len-c.q.a,c.q.a)>500;
    if(tg&&pr.phase==='align'&&T-pr.acquired>4){const best=candidates.filter(c=>eligible(c)&&c.q.d<1100).sort((a,b)=>score(a)-score(b))[0];if(best&&best.id!==tg.id&&score(best)+250<score(tg))tg=null;}
    if(!tg){tg=candidates.filter(eligible).sort((a,b)=>score(a)-score(b))[0];if(tg){pr.id=tg.id;pr.set=start;pr.phase='align';pr.episode++;pr.history=[];pr.normalVelocity=0;pr.acquired=T;pr.since=T;delete pr.prev;
      // Pick headward travel where possible; either endpoint must have a real connected runway.
      pr.dir=tg.len-tg.q.a>500?1:tg.q.a>500?-1:1;const h=tg.h+(pr.dir<0?PI:0);pr.side=sign(Math.cos(h)*(py-tg.q.y)-Math.sin(h)*(px-tg.q.x))||1;}}
    let heading=null,lateral=null,gap=null,bend=null,remaining=null,reason='no_target',enemySpeed=null,event=null,hold=null,boost=false,desired=ang,path=[];
    const velocity=Math.max(5.5,sp)*PX_PER_SP,ph=this.v4Physics(sc),lat=.10;
    if(tg){gap=tg.gap;bend=tg.bend;remaining=pr.dir>0?tg.len-tg.q.a:tg.q.a;const h=tg.h+(pr.dir<0?PI:0),nx=-Math.sin(h)*pr.side,ny=Math.cos(h)*pr.side;heading=Math.abs(wrap(ang-h));
      const prev=pr.prev,dt=prev?T-prev.t:0;lateral=prev&&dt>.005&&dt<.2&&prev.id===tg.id?(gap-prev.gap)/dt:0;
      if(prev&&dt>.005&&dt<.2&&heading<rad(30)&&Math.abs(lateral)<120){const measured=velocity*(Math.cos(ang)*nx+Math.sin(ang)*ny)-lateral;pr.normalVelocity=pr.normalVelocity*.85+clip(measured,-60,60)*.15;}else pr.normalVelocity*=.95;
      pr.prev={t:T,gap,id:tg.id};const predicted=gap+lat*lateral,normal=clip(pr.normalVelocity-2.4*(predicted-pr.set),-velocity*.45,velocity*.35);
      const ahead=point(tg,tg.q.a+pr.dir*clip(velocity*.3,50,130)),future=tangent(tg,ahead.a)+(pr.dir<0?PI:0);
      desired=h+clip(wrap(future-h),-rad(30),rad(30))*.6+pr.side*Math.asin(clip(normal/velocity,-.5,.4));
      if(heading>rad(60))desired=h;
      for(let j=0;j<hid.length;j++)if(hid[j]===tg.id)enemySpeed=H[j*5+3];
      boost=!!V.T3_SPEED&&pr.phase==='follow'&&heading<rad(8)&&bend<rad(15)&&remaining>velocity*.7+100;
      if(pr.phase==='align'&&gap>250&&heading<rad(12)&&bend<rad(15)&&remaining>600)boost=true;
      const D=ro+tg.r+pr.set;for(let a=0;a<Math.min(remaining,500);a+=40){const p=point(tg,tg.q.a+pr.dir*a),th=tangent(tg,p.a)+(pr.dir<0?PI:0);path.push(p.x-Math.sin(th)*pr.side*D,p.y+Math.cos(th)*pr.side*D);}
      reason=remaining<150?'body_endpoint':bend>rad(6)?'curve':heading>rad(8)?'align':'clean';
    }else{pr.id=null;pr.history=[];delete pr.prev;const w=s.wall||[30000,30000,20000];desired=hypot(px-w[0],py-w[1])>200?Math.atan2(w[1]-py,w[0]-px):ang;}
    const local=new Set();if(tg)for(let i=0;i<tg.ks.length;i++)if(Math.abs((tg.cum[i]+tg.cum[i+1])/2-tg.q.a)<450)local.add(tg.ks[i]);
    const keys=[];for(let k=0;k<sid.length;k++)if(segDist(px,py,S,k)-S[k*5+4]-ro<BOOST_SP*PX_PER_SP+80)keys.push(k);
    const check=(cmd,accel)=>{let st={x:px,y:py,h:ang,v:velocity},clear=Infinity,track=0;const horizon=pr.phase==='follow'?.40:.70,steps=Math.ceil(horizon/.025);
      for(let n=0;n<steps;n++){const tt=(n+1)*.025;st=this.v4Adv(st,n<4?(s.cmdNow??ang):cmd,n<4?!!s.boostNow:accel,.025,ph);
        for(const k of keys){const isTrack=tg&&sid[k]===tg.id&&local.has(k),allow=isTrack?pr.phase==='follow'?pr.set-8:8:16;clear=Math.min(clear,segDist(st.x,st.y,S,k)-ro-S[k*5+4]-allow);}
        for(let j=0;j<hid.length;j++){const speed=H[j*5+3]*PX_PER_SP;clear=Math.min(clear,hypot(st.x-H[j*5]-speed*tt*Math.cos(H[j*5+2]),st.y-H[j*5+1]-speed*tt*Math.sin(H[j*5+2]))-ro-R*H[j*5+4]-25);}
        if(s.wall)clear=Math.min(clear,s.wall[2]-hypot(st.x-s.wall[0],st.y-s.wall[1])-ro-25);
      }
      if(tg){const q=closest(tg,st.x,st.y),e=q.d-ro-tg.r-pr.normalVelocity*horizon-pr.set;track=(e/35)**2*.4+Math.abs(wrap(cmd-desired))**2*3;}
      else track=Math.abs(wrap(cmd-desired))**2;return {cmd,boost:accel,clear,track,st};};
    let chosen=check(desired,boost),changed=false;
    if(chosen.clear<0){const choices=[check(desired,false),...[-PI,-PI/2,-PI/3,-PI/6,0,PI/6,PI/3,PI/2].map(d=>check(ang+d,false))],safe=choices.filter(q=>q.clear>=0);chosen=(safe.length?safe:choices).sort((a,b)=>safe.length?a.track-b.track:b.clear-a.clear)[0];changed=true;reason=safe.length?'entry_collision_turn':'entry_no_safe_turn';path=[px,py,chosen.st.x,chosen.st.y];}
    boost=chosen.boost;
    let interference=false;for(let k=0;k<sid.length;k++)if((!tg||sid[k]!==tg.id)&&segDist(px,py,S,k)-ro-S[k*5+4]<35){reason='body_interference';interference=true;break;}
    for(let j=0;j<hid.length;j++)if(hypot(H[j*5]-px,H[j*5+1]-py)<250){reason='head_interference';interference=true;break;}
    if(s.wall&&s.wall[2]-hypot(px-s.wall[0],py-s.wall[1])-ro<100){reason='wall_interference';interference=true;}
    // Parallel holding can occur on a bend; bend data is not accepted as a straight collision offset.
    if(tg&&!changed&&!interference&&remaining>150&&heading<rad(15)&&Math.abs(gap-pr.set)<8){pr.history.push({t:T,gap,err:Math.abs(gap-pr.set),ro,rt:tg.r,heading,lateral:Math.abs(lateral),speed:sp,boost:+boost,bend,contactBend:tg.contactBend});while(pr.history.length&&T-pr.history[0].t>1.5)pr.history.shift();}
    else pr.history=[];
    const a=pr.history,med=k=>a.map(q=>q[k]).sort((x,y)=>x-y)[a.length>>1],range=k=>Math.max(...a.map(q=>q[k]))-Math.min(...a.map(q=>q[k]));
    let valid=false;
    if(a.length>=15&&T-a[0].t>=.75&&T-pr.since>=1.5&&med('err')<2&&range('gap')<3&&med('heading')<rad(8)&&med('lateral')<10&&range('ro')<.3&&range('rt')<.3&&range('speed')<1&&range('boost')===0){
      pr.phase='follow';hold={t:T,target:tg.id,episode:pr.episode,set:pr.set,gap:med('gap'),duration:T-a[0].t,samples:a.length,heading:med('heading'),bend:med('bend'),speed:med('speed'),own_r:med('ro'),enemy_r:med('rt')};
      if(Math.max(...a.map(q=>q.bend))<=rad(30)&&Math.max(...a.map(q=>q.contactBend))<=rad(6)){event={...hold,geometry_class:Math.max(...a.map(q=>q.bend))<=rad(6)?'straight':'gentle_curve',bend_max:Math.max(...a.map(q=>q.bend)),contact_bend_max:Math.max(...a.map(q=>q.contactBend)),gap_range:range('gap'),heading_max:Math.max(...a.map(q=>q.heading)),serial:(this.t3Serial=(this.t3Serial??0)+1),requested_speed:V.T3_SPEED??0,gap_min:Math.min(...a.map(q=>q.gap)),gap_max:Math.max(...a.map(q=>q.gap)),lateral:med('lateral'),boost:!!med('boost'),speed_class:med('speed')>8?'boost_speed':'cruise_speed',enemy_speed:enemySpeed};pr.set=Math.max(-30,pr.set-1);pr.history=[];pr.since=T;valid=true;}
    }
    if(tg&&!changed&&!interference&&(reason==='clean'||reason==='curve'&&bend<=rad(30)&&tg.contactBend<=rad(6))&&pr.phase==='follow')valid=true;
    const quantum=TAU/251,code=((chosen.cmd%TAU+TAU)%TAU)/quantum,lo=Math.floor(code),fraction=code-lo;pr.quantError+=fraction;const up=pr.quantError>=1?1:0;if(up)pr.quantError-=1;const cmd=(lo+up+.15)*quantum;
    const phase=tg?(pr.phase==='follow'?'follow':'align'):'seek',trace={mode:'probe',boost,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,t3_on:1,t3_phase:phase,t3_episode:pr.episode,t3_speed:sp,t3_requested_speed:V.T3_SPEED??0,t3_own_r:ro,t3_enemy_r:tg?.r??null,t3_gap:gap,t3_set:pr.set,t3_target:tg?.id??null,t3_level:event,t3_hold:hold,t3_heading_error:heading,t3_lateral:lateral,t3_bend:bend,t3_contact_bend:tg?.contactBend??null,t3_valid:+valid,t3_reason:reason,t3_visible_length:tg?.total??0,t3_boost_reason:changed?'entry_turn_no_boost':boost?pr.phase==='follow'?'boost_measure':'catch_target':'cruise_measure',t3_enemy_speed:enemySpeed,t3_remaining:remaining,t3_boost:+boost,t3_guard_clear:chosen.clear,t3_guard_changed:+changed,pph:valid?1:phase==='seek'?0:2,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:this.t3Serial??0};
    this.last={mode:'probe',trace,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:tg?[{id:tg.id,x:tg.q.x,y:tg.q.y,r:tg.r,gap}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};this.prev=cmd;this.prevBoost=boost;return [cmd,boost];
  }

  t2Step(s) {
    // Dedicated target-locked follower. Interference changes sample validity, never the driving objective.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,ro=R*sc,V=this.values;
    const minLen=V.T2_MIN_LEN??600,start=V.T2_GAP0??6;
    const pr=this.t2Probe||(this.t2Probe={id:null,set:start,since:T,levels:[],samples:[],dir:1,quantError:0});
    let event=null,heading=null,lateral=null,bend=null,valid=false,reason='no_target',visibleLength=0,boost=false,boostReason='no_target',enemySpeed=null,remaining=null;
    const enemyHeads=new Map();for(let j=0;j<hid.length;j++)enemyHeads.set(hid[j],{x:H[j*5],y:H[j*5+1],sp:H[j*5+3]});
    const done=(cmd,phase,tg=null,gap=null,path=[])=>{
      const tr={mode:'probe',boost,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,
        t2_on:1,t2_phase:phase,t2_own_r:ro,t2_enemy_r:tg?.r??null,t2_gap:gap,t2_set:pr.set,t2_target:tg?.id??null,t2_level:event,
        t2_heading_error:heading,t2_lateral:lateral,t2_bend:bend,t2_valid:valid?1:0,t2_reason:reason,t2_visible_length:visibleLength,t2_boost_reason:boostReason,t2_enemy_speed:enemySpeed,t2_remaining:remaining,t2_boost:boost?1:0,
        pph:valid?1:phase==='seek'?0:2,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:pr.levels.length};
      this.last={mode:'probe',trace:tr,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:tg?[{id:tg.id,x:tg.x,y:tg.y,r:tg.r,gap}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};
      this.prev=cmd;this.prevBoost=boost;return [cmd,boost];
    };
    const snakes=new Map();for(let k=0;k<sid.length;k++){let a=snakes.get(sid[k]);if(!a){a=[];snakes.set(sid[k],a);}a.push(k);}
    const candidates=[];
    for(const [id,ks]of snakes){let len=0,best=null;
      for(let i=0;i<ks.length;i++){const k=ks[i],ax=S[k*5],ay=S[k*5+1],dx=S[k*5+2]-ax,dy=S[k*5+3]-ay,L=hypot(dx,dy);len+=L;if(L<1e-6)continue;
        const u=clip(((px-ax)*dx+(py-ay)*dy)/(L*L),0,1),x=ax+u*dx,y=ay+u*dy,d=hypot(px-x,py-y);
        if(!best||d<best.d)best={id,ks,i,k,u,x,y,d,r:S[k*5+4],h:Math.atan2(dy,dx)};}
      if(best){best.len=len;best.gap=best.d-ro-best.r;candidates.push(best);}
    }
    // Once acquired, retain this enemy through bends, head proximity, and changes in neighbouring snakes.
    let tg=candidates.find(q=>q.id===pr.id&&q.d<1800);
    if(!tg){
      tg=candidates.filter(q=>q.len>=minLen&&q.d<1000).sort((a,b)=>a.gap-b.gap)[0];
      if(tg){pr.id=tg.id;pr.set=start;pr.since=T;pr.samples=[];delete pr.prevGap;pr.dir=1;pr.quantError=0;}
      else{pr.id=null;pr.samples=[];delete pr.prevGap;
        // Approach a long nearby enemy, even when its straight portion is not yet suitable for metrology.
        const q=candidates.filter(q=>q.len>=minLen).sort((a,b)=>a.d-b.d)[0];
        if(q){const side=sign(Math.cos(q.h)*(py-q.y)-Math.sin(q.h)*(px-q.x))||1,h=q.h+(Math.cos(ang-q.h)<0?PI:0),nx=-Math.sin(q.h)*side,ny=Math.cos(q.h)*side,D=ro+q.r+30,ax=q.x+nx*D+100*Math.cos(h),ay=q.y+ny*D+100*Math.sin(h);visibleLength=q.len;reason='approach_long_enemy';boost=true;boostReason='catch_target';return done(Math.atan2(ay-py,ax-px),'seek',q,q.gap,[px,py,ax,ay]);}
        const wall=s.wall||[30000,30000,20000],cmd=hypot(px-wall[0],py-wall[1])>150?Math.atan2(wall[1]-py,wall[0]-px):ang;return done(cmd,'seek',null,null,[px,py,px+200*Math.cos(cmd),py+200*Math.sin(cmd)]);
      }
    }
    visibleLength=tg.len;enemySpeed=enemyHeads.get(tg.id)?.sp??null;
    remaining=0;for(let j=tg.i;j<tg.ks.length;j++){const k=tg.ks[j];remaining+=hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1])*(j===tg.i?1-tg.u:1);}
    const dir=pr.dir,tangent=tg.h+(dir<0?PI:0),tx=Math.cos(tangent),ty=Math.sin(tangent),side=sign(tx*(py-tg.y)-ty*(px-tg.x))||1;
    const gap=tg.gap,err=gap-pr.set,dt=T-(pr.prevT??T);heading=Math.abs(wrap(ang-tangent));
    lateral=pr.prevGap!==undefined&&dt>0&&dt<.2?(gap-pr.prevGap)/dt:0;
    if(dt>.15||Math.abs((pr.rt??tg.r)-tg.r)>.3)pr.samples=[];
    pr.prevGap=gap;pr.prevT=T;pr.rt=tg.r;
    // Curvature only labels data. It never releases the locked enemy or activates an escape controller.
    bend=0;for(const d of [-1,1]){let walked=0,i=tg.i,last=tg.h;while(walked<100&&i+d>=0&&i+d<tg.ks.length){i+=d;const k=tg.ks[i],a=Math.atan2(S[k*5+3]-S[k*5+1],S[k*5+2]-S[k*5]);bend+=Math.abs(wrap(a-last));last=a;walked+=hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]);}}
    // Advance a short distance along the actual body, then offset to the side we occupy.
    const v=Math.max(5.5,sp)*PX_PER_SP,look=clip(v*.32,55,145);let left=look,i=tg.i,u=tg.u,qx=tg.x,qy=tg.y,qh=tg.h,ended=false;
    for(let guard=0;guard<300&&left>0;guard++){const k=tg.ks[i],ax=S[k*5],ay=S[k*5+1],dx=S[k*5+2]-ax,dy=S[k*5+3]-ay,L=hypot(dx,dy)||1e-6,room=(dir>0?1-u:u)*L;
      if(left<=room){u+=dir*left/L;qx=ax+u*dx;qy=ay+u*dy;qh=Math.atan2(dy,dx);left=0;break;}
      qx=ax+(dir>0?dx:0);qy=ay+(dir>0?dy:0);qh=Math.atan2(dy,dx);left-=room;i+=dir;
      if(i<0||i>=tg.ks.length){ended=true;qx+=dir*left*Math.cos(qh);qy+=dir*left*Math.sin(qh);break;}u=dir>0?0:1;
    }
    const future=qh+(dir<0?PI:0),nx=-Math.sin(future)*side,ny=Math.cos(future)*side;
    const predicted=err+clip(lateral,-150,150)*.14,normal=clip(-predicted*1.6,-(gap>pr.set+80?v*.75:gap>pr.set+10?35:8),20);
    // Near-body steering combines tangent feedback with the actual bend ahead.
    const curve=clip(wrap(future-tangent),-rad(20),rad(20));let desired=tangent+curve*.7+side*Math.asin(clip(normal/v,-.8,.3));
    if(gap>pr.set+100){const D=ro+tg.r+pr.set+35,ax=qx+nx*D,ay=qy+ny*D;desired=Math.atan2(ay-py,ax-px);}
    // 251 heading codes: unbiased pulse-density commands overcome the floor bias and sub-code dead band.
    const quantum=TAU/251,code=((desired%TAU+TAU)%TAU)/quantum,lo=Math.floor(code),fraction=code-lo;
    pr.quantError+=fraction;const up=pr.quantError>=1?1:0;if(up)pr.quantError-=1;const cmd=(lo+up+.15)*quantum;
    const D=ro+tg.r+pr.set,ox=qx+nx*D,oy=qy+ny*D;
    // Close the longitudinal deficit with boost; once beside the target, pace its observed speed.
    const catchUp=gap>pr.set+80||remaining>550,desiredSpeed=catchUp?BOOST_SP:Math.max(cruiseSp(sc),enemySpeed??cruiseSp(sc));
    const canAccelerate=heading<rad(40)&&bend<rad(35);
    if(canAccelerate){
      boost=pr.speedBoost??false;if(sp<desiredSpeed-.35)boost=true;else if(sp>desiredSpeed+.35)boost=false;
      if(desiredSpeed>=BOOST_SP-.35)boost=true;
      boostReason=boost?(catchUp?'catch_target':'pace_target'):catchUp?'align_before_boost':'speed_matched';
    }else{boost=false;boostReason='turn_alignment';}
    pr.speedBoost=boost;
    reason='clean';
    if(ended)reason='body_endpoint';else if(bend>rad(6))reason='curve';else if(heading>rad(6)||Math.abs(err)>20)reason='align';
    for(let j=0;j<hid.length;j++)if(hypot(H[j*5]-px,H[j*5+1]-py)<250){reason='head_interference';break;}
    for(let k=0;k<sid.length;k++)if(sid[k]!==tg.id&&segDist(px,py,S,k)-S[k*5+4]-ro<35){reason='body_interference';break;}
    if(s.wall&&s.wall[2]-hypot(px-s.wall[0],py-s.wall[1])-ro<100)reason='wall_interference';
    valid=reason==='clean';
    if(!valid)pr.samples=[];
    else{const a=pr.samples;a.push({t:T,gap,err:Math.abs(err),ro,rt:tg.r,heading,lateral:Math.abs(lateral),speed:sp,boost:boost?1:0});while(a.length&&T-a[0].t>1)a.shift();
      const med=k=>a.map(q=>q[k]).sort((x,y)=>x-y)[a.length>>1],range=k=>Math.max(...a.map(q=>q[k]))-Math.min(...a.map(q=>q[k]));
      if(a.length>=15&&T-a[0].t>=.75&&T-pr.since>=1.2&&med('err')<1&&range('gap')<1.5&&med('heading')<rad(6)&&med('lateral')<8&&range('ro')<.3&&range('rt')<.3&&range('speed')<1.0&&range('boost')===0){
        event={serial:(this.t2Serial=(this.t2Serial??0)+1),t:T,target:pr.id,own_r:med('ro'),enemy_r:med('rt'),set:pr.set,gap:med('gap'),gap_min:Math.min(...a.map(q=>q.gap)),gap_max:Math.max(...a.map(q=>q.gap)),samples:a.length,duration:T-a[0].t,speed:med('speed'),heading:med('heading'),lateral:med('lateral'),bend,boost:!!med('boost'),speed_class:med('speed')>8?'boost_speed':'cruise_speed',enemy_speed:enemySpeed};
        pr.levels.push(event);pr.set=Math.max(-30,pr.set-1);pr.since=T;pr.samples=[];
      }
    }
    return done(cmd,reason==='align'?'align':'follow',tg,gap,[px,py,ox,oy]);
  }

  t1Step(s) {
    // Independent metrology driver: never delegates to food, escape, or combat controllers.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,ro=R*sc;
    const pr=this.t1Probe||(this.t1Probe={id:null,set:12,since:T,samples:[],stable:[],dir:1});
    const bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4,wanted=clip(Math.floor(this.values.T1_BIN??0),0,4);
    let level=null,heading=null,lateral=null,bend=null;
    const done=(cmd,phase,tg=null,gap=null,path=[])=>{
      const tr={mode:'probe',boost:false,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,
        pph:phase==='follow'?1:phase==='excluded'?2:0,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:pr.stable.length,
        t1_on:1,t1_phase:phase,t1_own_r:ro,t1_enemy_r:tg?.r??null,t1_gap:gap,t1_set:pr.set,t1_target:tg?.id??null,
        t1_level:level,t1_heading_error:heading,t1_lateral:lateral,t1_bend:bend,t1_bin:wanted};
      this.last={mode:'probe',trace:tr,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,
        near:tg?[{id:tg.id,gap,x:tg.x,y:tg.y,r:tg.r}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};
      this.prev=cmd;this.prevBoost=false;return [cmd,false];
    };
    const headOf=new Map();for(let i=0;i<hid.length;i++)headOf.set(hid[i],[H[i*5],H[i*5+1]]);
    // Split observed bodies into connected, nearly straight runs. Choose a run, not a generic free direction.
    const chains=new Map();for(let k=0;k<sid.length;k++){let a=chains.get(sid[k]);if(!a){a=[];chains.set(sid[k],a);}a.push(k);}
    const candidates=[];
    for(const [id,ks]of chains){
      let run=[],first=0,prev=null,turn=0,len=0;
      const flush=()=>{
        if(len<180||!run.length)return;
        let best=null,cum=0;
        for(const k of run){const ax=S[k*5],ay=S[k*5+1],dx=S[k*5+2]-ax,dy=S[k*5+3]-ay,L=hypot(dx,dy),u=clip(((px-ax)*dx+(py-ay)*dy)/(L*L||1),0,1),x=ax+u*dx,y=ay+u*dy,d=hypot(px-x,py-y);
          if(!best||d<best.d)best={id,k,x,y,d,r:S[k*5+4],h:Math.atan2(dy,dx),at:cum+u*L};cum+=L;}
        if(!best||best.d>1800)return;
        best.len=len;best.bend=turn;
        const keep=id===pr.id&&Math.abs(wrap(best.h-(pr.lineH??best.h)))<rad(25);
        best.dir=keep?pr.dir:Math.cos(ang-best.h)>=0?1:-1;
        best.room=best.dir>0?len-best.at:best.at;
        if(best.room<150){if(keep)return;best.dir*=-1;best.room=len-best.room;}
        if(best.room<150)return;
        const hp=headOf.get(id);best.headD=hp?hypot(hp[0]-best.x,hp[1]-best.y):Infinity;
        best.score=best.d+Math.abs(bin(best.r)-wanted)*180+(best.headD<250?350:0)+Math.max(0,450-best.room)*.6;
        best.keep=keep;candidates.push(best);
      };
      for(const k of ks){const dx=S[k*5+2]-S[k*5],dy=S[k*5+3]-S[k*5+1],L=hypot(dx,dy);if(L<1e-6)continue;const a=Math.atan2(dy,dx);
        const joined=prev!==null&&hypot(S[k*5]-S[prev*5+2],S[k*5+1]-S[prev*5+3])<2;
        if(run.length&&(!joined||Math.abs(wrap(a-first))>rad(12)||turn+Math.abs(wrap(a-Math.atan2(S[prev*5+3]-S[prev*5+1],S[prev*5+2]-S[prev*5])))>rad(12))){flush();run=[];len=0;turn=0;}
        if(!run.length)first=a;else turn+=Math.abs(wrap(a-Math.atan2(S[prev*5+3]-S[prev*5+1],S[prev*5+2]-S[prev*5])));
        run.push(k);len+=L;prev=k;
      }flush();
    }
    let tg=candidates.filter(q=>q.keep).sort((a,b)=>a.d-b.d)[0]||candidates.sort((a,b)=>a.score-b.score)[0];
    if(!tg){
      pr.id=null;pr.samples=[];delete pr.prevGap;
      // No long straight run yet: explicitly approach the nearest visible body's outside surface.
      let closest=null;for(let k=0;k<sid.length;k++){const ax=S[k*5],ay=S[k*5+1],dx=S[k*5+2]-ax,dy=S[k*5+3]-ay,L=hypot(dx,dy)||1,u=clip(((px-ax)*dx+(py-ay)*dy)/(L*L),0,1),x=ax+u*dx,y=ay+u*dy,d=hypot(px-x,py-y);if(!closest||d<closest.d)closest={x,y,d,h:Math.atan2(dy,dx),r:S[k*5+4]};}
      if(closest){const n=Math.atan2(py-closest.y,px-closest.x),D=ro+closest.r+60,x=closest.x+D*Math.cos(n),y=closest.y+D*Math.sin(n),h=closest.h+(Math.cos(ang-closest.h)<0?PI:0),look=140;
        const tx=x+look*Math.cos(h),ty=y+look*Math.sin(h);return done(Math.atan2(ty-py,tx-px),'seek',null,null,[px,py,tx,ty]);}
      const center=s.wall||[30000,30000,20000],d=hypot(px-center[0],py-center[1]),cmd=d>150?Math.atan2(center[1]-py,center[0]-px):ang;
      return done(cmd,'seek',null,null,[px,py,px+250*Math.cos(cmd),py+250*Math.sin(cmd)]);
    }
    const changed=pr.id!==tg.id||Math.abs(wrap(tg.h-(pr.lineH??tg.h)))>rad(25)||pr.dir!==tg.dir;
    if(changed){pr.id=tg.id;pr.dir=tg.dir;pr.set=12;pr.since=T;pr.samples=[];delete pr.prevGap;}
    pr.lineH=tg.h;
    const tangent=tg.h+(tg.dir<0?PI:0),tx=Math.cos(tangent),ty=Math.sin(tangent),side=sign(tx*(py-tg.y)-ty*(px-tg.x))||1;
    const gap=tg.d-ro-tg.r,err=gap-pr.set,dt=T-(pr.prevT??T);
    lateral=pr.prevGap!==undefined&&dt>0?(gap-pr.prevGap)/dt:0;heading=Math.abs(wrap(ang-tangent));bend=tg.bend;
    if(dt>.15||Math.abs((pr.rt??tg.r)-tg.r)>.3)pr.samples=[];
    pr.prevGap=gap;pr.prevT=T;pr.rt=tg.r;
    // Desired normal speed: acquire quickly, then close slowly. Tangential heading stays locked.
    const v=Math.max(5.5,sp)*PX_PER_SP,predicted=err+clip(lateral,-120,120)*.10;
    const vNormal=clip(-predicted*.95,-(gap<pr.set+8?8:45),20);
    const cmd=tangent+side*Math.asin(clip(vNormal/v,-.35,.35));
    const nx=-ty*side,ny=tx*side,look=Math.min(180,tg.room-40),ox=tg.x+tx*look+nx*(ro+tg.r+pr.set),oy=tg.y+ty*look+ny*(ro+tg.r+pr.set);
    let interference=false;
    for(let i=0;i<hid.length;i++)if(hypot(H[i*5]-px,H[i*5+1]-py)<250)interference=true;
    for(let k=0;k<sid.length;k++)if(sid[k]!==tg.id&&segDist(px,py,S,k)-S[k*5+4]-ro<35){interference=true;break;}
    const wall=s.wall;if(wall&&wall[2]-hypot(px-wall[0],py-wall[1])-ro<100)interference=true;
    // Interference invalidates data; it does not hand control to an avoidance algorithm.
    const phase=interference?'excluded':heading>rad(6)||Math.abs(err)>20?'align':'follow';
    if(phase!=='follow')pr.samples=[];
    else{
      const a=pr.samples;a.push({t:T,gap,err:Math.abs(err),ro,rt:tg.r,heading,lateral:Math.abs(lateral),speed:sp});while(a.length&&T-a[0].t>1)a.shift();
      const med=k=>a.map(q=>q[k]).sort((x,y)=>x-y)[a.length>>1],range=k=>Math.max(...a.map(q=>q[k]))-Math.min(...a.map(q=>q[k]));
      if(a.length>=15&&T-a[0].t>=.75&&T-pr.since>=1.2&&med('err')<1&&range('gap')<1.5&&med('heading')<rad(6)&&med('lateral')<8&&range('ro')<.3&&range('rt')<.3){
        level={serial:(this.t1Serial=(this.t1Serial??0)+1),t:T,target:pr.id,own_r:med('ro'),enemy_r:med('rt'),set:pr.set,gap:med('gap'),gap_min:Math.min(...a.map(q=>q.gap)),gap_max:Math.max(...a.map(q=>q.gap)),samples:a.length,duration:T-a[0].t,speed:med('speed'),heading:med('heading'),lateral:med('lateral')};
        pr.stable.push(level);pr.set=Math.max(-30,pr.set-1);pr.since=T;pr.samples=[];
      }
    }
    return done(cmd,phase,tg,gap,[px,py,ox,oy]);
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

  // ================= V4 — layered maze solver (decision-v4-architecture-20260930, contracts 1-12) =================
  // A world model (fixed grid, per-snake body memory with expiry)  B enemy arrival field (turn time + acceleration physics, all round)
  // C route search (separate Worker, 'plan' message: state lattice over (cell, heading, boost) with real arcs, bounded Pareto labels,
  //   time budget with certified-prefix return, versioned snapshot)  D local avoidance every tick (0.9 s candidate arcs with continuous
  //   speed; lexicographic: no contact -> no enemy-arrival violation -> follow route -> growth)  E tracker (mod.js).
  v4Physics(sc) { const cs = cruiseSp(sc) * PX_PER_SP, vb = BOOST_SP * PX_PER_SP; return {cs, vb, w: turnRate(sc), rate: (vb - cs) / RAMP}; }
  // ---- A: world model. Body memory is kept per observed segment, so seeing one part of a snake does not erase
  // a different part that just left the observation circle. Quantised keys deduplicate the rolling observations. ----
  v4World(s, buildGrid = true, remember = true) {
    const V = this.values, P = this.P, T = s.t, px = s.x, py = s.y, ro = R * s.sc, S = s.segs, ns = s.sid.length;
    const mem = this.v4mem, Q = 24;
    for (let k = 0; k < ns; k++) {
      const id = s.sid[k], x1 = S[5 * k], y1 = S[5 * k + 1], x2 = S[5 * k + 2], y2 = S[5 * k + 3], r = S[5 * k + 4];
      let m = mem.get(id); if (!m || !m.parts) { m = {parts: new Map(), t: T}; mem.set(id, m); }
      const mx = Math.round((x1 + x2) / (2 * Q)), my = Math.round((y1 + y2) / (2 * Q));
      const key = `${mx},${my}`; m.parts.set(key, [x1, y1, x2, y2, r, T]); m.t = T;
    }
    for (const [id, m] of mem) {
      if (!m.parts) { mem.delete(id); continue; }
      for (const [key, p] of m.parts) if (T - p[5] > V.V4_MEM) m.parts.delete(key);
      if (!m.parts.size) mem.delete(id);
    }
    const W0 = s.wall[0], W1 = s.wall[1], W2 = s.wall[2];
    if (this.wallPrev !== null) { const dt = T - this.wallPrev[0]; if (dt > .02 && dt < 3) this.wallRate += (clip((this.wallPrev[1] - W2) / dt, 0, 60) - this.wallRate) * .1; }
    this.wallPrev = [T, W2]; const wallShrink = this.wallRate + 10;
    const six = !!V.V6_ON, CELL = six ? V.V6_CELL : V.V4_CELL, OBS = six ? V.V6_OBS : V.V4_OBS;
    const HR = Math.ceil(OBS / CELL), N = 2 * HR + 1, NN = N * N;
    const ox = Math.floor((px - HR * CELL) / CELL) * CELL, oy = Math.floor((py - HR * CELL) / CELL) * CELL;
    const GC = 96, sidx = new Map(), segs = [], parts = [];
    const mapMargin = six ? V.V6_MARGIN : V.V4_MARGIN;
    if (remember) { for (const [, m] of mem) for (const a of m.parts.values()) parts.push(a); }
    else for (let k = 0; k < ns; k++) parts.push([S[5 * k], S[5 * k + 1], S[5 * k + 2], S[5 * k + 3], S[5 * k + 4], T]);
    for (const a of parts) { const r = a[4], e = r + P.bodyOff(r) + ro + mapMargin + CELL;
      const x0 = Math.min(a[0], a[2]) - e, x1 = Math.max(a[0], a[2]) + e, y0 = Math.min(a[1], a[3]) - e, y1 = Math.max(a[1], a[3]) + e;
      if (x1 < ox - CELL || x0 > ox + (N + 1) * CELL || y1 < oy - CELL || y0 > oy + (N + 1) * CELL) continue;
      const ci = segs.length; segs.push(a[0], a[1], a[2], a[3], r + P.bodyOff(r));
      for (let i = Math.floor(x0 / GC); i <= Math.floor(x1 / GC); i++) for (let j = Math.floor(y0 / GC); j <= Math.floor(y1 / GC); j++) { const key = i * 65536 + j; let l = sidx.get(key); if (!l) { l = []; sidx.set(key, l); } l.push(ci); } }
    const gapAt = (x, y, t = 0) => { let g = W2 - wallShrink * t - 30 - hypot(x - W0, y - W1) - ro;
      const l = sidx.get(Math.floor(x / GC) * 65536 + Math.floor(y / GC)); if (l) for (const k of l) { const x1 = segs[k], y1 = segs[k + 1], dx = segs[k + 2] - x1, dy = segs[k + 3] - y1, l2 = dx * dx + dy * dy;
        const u = l2 < 1e-9 ? 0 : clip(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1), d = hypot(x - x1 - u * dx, y - y1 - u * dy) - segs[k + 4] - ro; if (d < g) g = d; }
      return g; };
    const cellI = (x, y) => { const i = Math.floor((x - ox) / CELL), j = Math.floor((y - oy) / CELL); return i < 0 || i >= N || j < 0 || j >= N ? -1 : j * N + i; };
    const cx = i => ox + (i % N + .5) * CELL, cy = i => oy + (Math.floor(i / N) + .5) * CELL;
    const clear = buildGrid ? new Float32Array(NN) : null; if (clear) for (let i = 0; i < NN; i++) clear[i] = gapAt(cx(i), cy(i), 0);
    return {T, px, py, ro, CELL, N, NN, ox, oy, cellI, cx, cy, gapAt, clear, wallShrink};
  }
  // ---- B: enemy arrival field. Earliest time each head can be at a cell: turn toward it at its rate (all round) and travel with
  // acceleration from its current speed to boost (RAMP). No cone: behind it costs the turn time. ----
  v4Reach(s, Wd) {
    const V = this.values, six = !!V.V6_ON, vb = BOOST_SP * PX_PER_SP, ro = Wd.ro, NN = Wd.NN, tr = new Float32Array(NN).fill(1e9), heads = [];
    const headR = six ? V.V6_HEADR : V.V4_HEADR, margin = six ? V.V6_MARGIN : V.V4_MARGIN;
    for (let m = 0; m < s.hid.length; m++) {
      const hx = s.heads[5 * m], hy = s.heads[5 * m + 1], ha = s.heads[5 * m + 2], hsp = s.heads[5 * m + 3], hsc = s.heads[5 * m + 4], rh = R * hsc;
      if (hypot(hx - Wd.px, hy - Wd.py) > headR) continue;
      const wc = turnRate(hsc), v0 = Math.max(hsp, 5.8) * PX_PER_SP, a = (vb - v0) / RAMP, sRamp = v0 * RAMP + .5 * a * RAMP * RAMP;
      const travel = d => a <= 1e-6 ? d / vb : (d <= sRamp ? (-v0 + Math.sqrt(v0 * v0 + 2 * a * d)) / a : RAMP + (d - sRamp) / vb);
      heads.push({x: hx, y: hy, a: ha, rh, wc, v0, vb, rate: Math.max(0, (vb - v0) / RAMP), travel});
      for (let i = 0; i < NN; i++) { const dx = Wd.cx(i) - hx, dy = Wd.cy(i) - hy, d = hypot(dx, dy) - rh - ro - margin;
        if (d <= 0) { tr[i] = 0; continue; }
        const off = Math.abs(wrap(Math.atan2(dy, dx) - ha)), t = Math.max(travel(d), off / wc); if (t < tr[i]) tr[i] = t; }
    }
    return {tr, heads};
  }
  // ---- our physics step with continuous speed ----
  v4Adv(st, target, boost, dt, ph) { const da = wrap(target - st.h), h = st.h + sign(da) * Math.min(Math.abs(da), ph.w * dt), want = boost ? ph.vb : ph.cs;
    const v = st.v < want ? Math.min(want, st.v + ph.rate * dt) : Math.max(want, st.v - ph.rate * dt), am = st.h + wrap(h - st.h) / 2, vm = (st.v + v) / 2;
    return {x: st.x + vm * dt * Math.cos(am), y: st.y + vm * dt * Math.sin(am), h, v}; }
  // ---- C: route search (runs in the planner Worker on a snapshot). Returns {ver, t0, pts:[t,x,y,h,b...], goal, exits, ms, partial} ----
  v4Route(s, ver) {
    const V = this.values, nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), T0 = nowMs();
    const Wd = this.v4World(s), Rf = this.v4Reach(s, Wd), tr = Rf.tr, clear = Wd.clear, NN = Wd.NN, N = Wd.N, CELL = Wd.CELL;
    const ph = this.v4Physics(s.sc), ND = V.V4_DIRS, DA = TAU / ND, H = V.V4_H, MARGIN = V.V4_MARGIN, LAT = V.TRACK_LAT || .17, canBoost = s.L >= V.V2_MINL;
    const fm = new Float32Array(NN), F = s.food;
    for (let f = 0; f < F.length; f += 3) {
      const i = Wd.cellI(F[f], F[f + 1]); if (i < 0) continue;
      const mass = F[f + 2] * (F[f + 2] >= V.V2_REMAINS ? 8 : 1), ix = i % N, iy = Math.floor(i / N);
      fm[i] += mass;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && ix + dx >= 0 && ix + dx < N && iy + dy >= 0 && iy + dy < N) fm[(iy + dy) * N + ix + dx] += mass * .22;
    }
    // start after the latency (current command keeps acting)
    const prevCmd = Number.isFinite(s.cmdNow) ? s.cmdNow : s.ang, prevBoost = typeof s.boostNow === 'boolean' ? s.boostNow : false;
    let st = {x: s.x, y: s.y, h: s.ang, v: s.sp * PX_PER_SP}; for (let k = 0; k < 4; k++) st = this.v4Adv(st, prevCmd, prevBoost, LAT / 4, ph);
    const dirOf = h => ((Math.round(wrap(h) / DA) % ND) + ND) % ND, hOf = d => d * DA;
    const ARC = CELL * V.V4_ARC, KMAXL = 3;   // labels per state
    // labels: arrays of {t, g, mg (min gap), x, y, v, prev, hEnd}
    const labels = new Map(); const key = (cell, d, b) => (cell * ND + d) * 2 + b;
    const hk = [], hv = []; const push = (n, d) => { hk.push(n); hv.push(d); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hv[p] <= hv[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]]; [hv[p], hv[c]] = [hv[c], hv[p]]; c = p; } };
    const pop = () => { const n = hk[0], ln = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = ln; hv[0] = lv; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < hk.length && hv[l] < hv[m]) m = l; if (r < hk.length && hv[r] < hv[m]) m = r; if (m === c) break; [hk[m], hk[c]] = [hk[c], hk[m]]; [hv[m], hv[c]] = [hv[c], hv[m]]; c = m; } } return n; };
    const c0 = Wd.cellI(st.x, st.y); if (c0 < 0) return {ver, t0: s.t, pts: null, exits: 0, ms: nowMs() - T0, partial: false};
    const prevGoal = this.v4goal, threatened = tr[c0] < 2.3; let goalCell = -1, goalKind = 'exit', goalMass = 0, goalScore = -Infinity;
    if (!threatened) {
      for (let i = 0; i < NN; i++) if (fm[i] > 0 && clear[i] >= MARGIN) {
        const d = hypot(Wd.cx(i) - st.x, Wd.cy(i) - st.y), u = fm[i] - d * .012;
        if (u > goalScore) { goalScore = u; goalCell = i; goalMass = fm[i]; }
      }
      if (goalCell >= 0) {
        goalKind = 'food';
        if (prevGoal && prevGoal.kind === 'food') { const pi = Wd.cellI(prevGoal.x, prevGoal.y); if (pi >= 0 && fm[pi] > 0) { const pu = fm[pi] - hypot(Wd.cx(pi) - st.x, Wd.cy(pi) - st.y) * .012; if (pu + V.V4_HYST * 20 >= goalScore) { goalCell = pi; goalMass = fm[pi]; } } }
      } else {
        goalKind = 'cruise'; goalCell = Wd.cellI(st.x + Math.cos(st.h) * V.V4_EDGE, st.y + Math.sin(st.h) * V.V4_EDGE);
      }
    }
    const goalX = goalCell >= 0 ? Wd.cx(goalCell) : null, goalY = goalCell >= 0 ? Wd.cy(goalCell) : null;
    const add = (k, lab) => { let l = labels.get(k); if (!l) { l = []; labels.set(k, l); }
      for (const o of l) if (o.t <= lab.t + 1e-6 && o.g <= lab.g + 1e-6 && o.mg >= lab.mg - 1e-6) return false;   // dominated
      let keep = l.filter(o => !(lab.t <= o.t + 1e-6 && lab.g <= o.g + 1e-6 && lab.mg >= o.mg - 1e-6)); keep.push(lab);
      if (keep.length > KMAXL) {
        const chosen = [], take = o => { if (o && !chosen.includes(o)) chosen.push(o); };
        take(keep.reduce((a, b) => a.t <= b.t ? a : b)); take(keep.reduce((a, b) => a.g <= b.g ? a : b)); take(keep.reduce((a, b) => a.mg >= b.mg ? a : b));
        for (const o of keep) if (chosen.length < KMAXL) take(o); keep = chosen;
      }
      for (const o of l) if (!keep.includes(o)) o.dead = 1;
      labels.set(k, keep); return keep.includes(lab); };
    const root = {t: LAT, g: 0, mg: Wd.gapAt(st.x, st.y, LAT), x: st.x, y: st.y, v: st.v, h: st.h, b: prevBoost ? 1 : 0, prev: null, cell: c0, d: dirOf(st.h)};
    const heuristic = lab => goalCell >= 0 ? hypot(lab.x - goalX, lab.y - goalY) / ph.vb : 0;
    add(key(c0, root.d, root.b), root); push(root, heuristic(root));
    let expanded = 0, over = false, bestGoal = null, bestExit = null, bestToward = null, bestEsc = null, exits = 0;
    const isExit = c => hypot(Wd.cx(c) - Wd.px, Wd.cy(c) - Wd.py) >= V.V4_EDGE;
    while (hk.length) {
      if ((++expanded & 63) === 0 && nowMs() - T0 > V.V4_PLAN_BUDGET) { over = true; break; }
      const n = pop(); if (n.dead) continue; n.dead = 1;
      if (goalCell >= 0) {
        const gd = hypot(n.x - goalX, n.y - goalY), tv = -gd - n.g * 8 + Math.min(n.mg, 80) * .2;
        if (bestToward === null || tv > bestToward.towv) { bestToward = n; bestToward.towv = tv; }
        if (gd <= CELL * 1.15) { const gv = -n.g + Math.min(n.mg, 80) * .02; if (bestGoal === null || gv > bestGoal.goalv) { bestGoal = n; bestGoal.goalv = gv; } continue; }
      }
      if (isExit(n.cell)) { exits++; const ev = -n.g + Math.min(n.mg, 80) * .02; if (bestExit === null || ev > bestExit.exitv) { bestExit = n; bestExit.exitv = ev; } if (goalCell < 0) continue; }
      { const m = Math.min(tr[n.cell], H + 1) - n.t + Math.min(n.mg, 80) / 40; if (bestEsc === null || m > bestEsc.escv) { bestEsc = n; bestEsc.escv = m; } }
      if (n.t > H) continue;
      const fam = canBoost ? [n.b, 1 - n.b] : [0];
      for (const b of fam) {
        // arc of length ARC at the speed profile from n.v; heading change limited by the turn rate over the arc time
        const vEnd = b ? Math.min(ph.vb, n.v + ph.rate * (ARC / Math.max(n.v, 1))) : Math.max(ph.cs, n.v - ph.rate * (ARC / Math.max(n.v, 1)));
        const vm = (n.v + vEnd) / 2, dt = ARC / vm, kmax = Math.max(1, Math.min(ND >> 2, Math.floor(ph.w * dt / DA + 1e-6)));
        for (let k = -kmax; k <= kmax; k++) {
          const dth = k * DA, h0 = n.h; let ok = true, hug = 0, mg = n.mg, ex = 0, ey = 0;
          for (let q = 1; q <= 3 && ok; q++) { const f = q / 3, hh = h0 + dth * f; let qx, qy;
            if (k === 0) { qx = n.x + ARC * f * Math.cos(h0); qy = n.y + ARC * f * Math.sin(h0); } else { const Rr = ARC / dth; qx = n.x + Rr * (Math.sin(hh) - Math.sin(h0)); qy = n.y - Rr * (Math.cos(hh) - Math.cos(h0)); }
            const ci = Wd.cellI(qx, qy); if (ci < 0) { ok = false; break; }
            let gq = clear[ci]; if (gq < MARGIN + CELL) gq = Math.min(gq, Wd.gapAt(qx, qy, n.t + dt * f)); if (gq < MARGIN) { ok = false; break; }
            if (n.t + dt * f + V.V4_SAFETY >= tr[ci]) { ok = false; break; }
            if (gq < mg) mg = gq; if (gq < MARGIN + 40) hug += (MARGIN + 40 - gq) / 40 / 3; ex = qx; ey = qy; }
          if (!ok) continue;
          const nt = n.t + dt; if (nt > H) continue; const ce = Wd.cellI(ex, ey), hEnd = h0 + dth, d = dirOf(hEnd);
          const lab = {t: nt, g: n.g + dt + hug * V.V4_HUG + Math.abs(k) * V.V4_TURNW + (b !== n.b ? .1 : 0), mg, x: ex, y: ey, v: vEnd, h: hEnd, b, prev: n, cell: ce, d};
          if (add(key(ce, d, b), lab)) push(lab, lab.g + heuristic(lab));
        }
      }
    }
    const pick = bestGoal || bestExit || bestToward || bestEsc; if (!pick) return {ver, t0: s.t, pts: null, exits, ms: nowMs() - T0, partial: over, mode: 'none'};
    const chain = []; for (let q = pick; q; q = q.prev) chain.push(q); chain.reverse();
    if (chain.length < 2 || hypot(pick.x - st.x, pick.y - st.y) < CELL * .35) return {ver, t0: s.t, pts: null, exits, ms: nowMs() - T0, partial: over, mode: 'none', goal: goalCell >= 0 ? {x: goalX, y: goalY, kind: goalKind, mass: goalMass} : null};
    const pts = [0, s.x, s.y, s.ang, prevBoost ? 1 : 0]; for (const q of chain) pts.push(q.t, q.x, q.y, q.h, q.b);
    const reachedGoal = !!bestGoal, mode = reachedGoal || bestToward ? goalKind : (bestExit ? 'exit' : 'esc');
    this.v4goal = goalCell >= 0 ? {x: goalX, y: goalY, kind: goalKind, mass: goalMass} : (bestExit ? {x: pick.x, y: pick.y, kind: 'exit', mass: 0} : null);
    return {ver, t0: s.t, pts, exits, ms: nowMs() - T0, partial: over, mode, goal: this.v4goal};
  }
  // ---- D: local avoidance every tick. Candidates = turn fraction x boost, 0.9 s with continuous speed; lexicographic choice ----
  v4Step(s) {
    const V = this.values, nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), T0 = nowMs();
    const Wd = this.v4World(s), Rf = this.v4Reach(s, Wd), tr = Rf.tr, ph = this.v4Physics(s.sc), MARGIN = V.V4_MARGIN, canBoost = s.L >= V.V2_MINL;
    const px = s.x, py = s.y, ang = s.ang, LAT = V.TRACK_LAT || .17, HL = V.V4_LOCAL_H, DT = .05;
    const prevCmd = Number.isFinite(s.cmdNow) ? s.cmdNow : ang, prevBoost = typeof s.boostNow === 'boolean' ? s.boostNow : this.prevBoost;
    // route (from the planner Worker): usable if fresh and its near part is still clear
    let route = s.route && s.route.pts ? s.route : null, routeWhy = route ? 'ok' : 'none';
    if (route) { const age = s.t - route.t0; if (age > V.V4_ROUTE_AGE) { route = null; routeWhy = 'old'; }
      else { const P = route.pts; for (let i = 0; i + 4 < P.length; i += 5) { const tt = P[i] - age; if (tt < 0 || tt > 1.2) continue; if (Wd.gapAt(P[i + 1], P[i + 2], tt) < 0) { route = null; routeWhy = 'blocked'; break; } const ci = Wd.cellI(P[i + 1], P[i + 2]); if (ci >= 0 && tt + V.V4_SAFETY >= tr[ci]) { route = null; routeWhy = 'enemy'; break; } } } }
    const routeAt = tt => { const P = route.pts, a = tt + (s.t - route.t0); let i = 0; while (i + 5 < P.length && P[i + 5] < a) i += 5;
      if (i + 5 >= P.length && a > P[i]) { const dt = a - P[i], v = P[i + 4] ? ph.vb : ph.cs; return [P[i + 1] + Math.cos(P[i + 3]) * v * dt, P[i + 2] + Math.sin(P[i + 3]) * v * dt, P[i + 3]]; }
      return [P[i + 1], P[i + 2], P[i + 3]]; };
    // Immediate food target while the slow planner is starting or its route was invalidated. Grid clustering avoids
    // twitching between individual pellets; remains get a strong but still safety-constrained preference.
    let localGoal = route && route.goal ? route.goal : null;
    if (!route) {
      const bins = new Map(), G = 128, F = s.food;
      for (let i = 0; i + 2 < F.length; i += 3) { const bx = Math.floor(F[i] / G), by = Math.floor(F[i + 1] / G), key = `${bx},${by}`, w = F[i + 2] * (F[i + 2] >= V.V2_REMAINS ? 8 : 1); let q = bins.get(key); if (!q) { q = {x: 0, y: 0, mass: 0}; bins.set(key, q); } q.x += F[i] * w; q.y += F[i + 1] * w; q.mass += w; }
      let uBest = -Infinity; for (const q of bins.values()) { q.x /= q.mass; q.y /= q.mass; q.kind = 'food'; const d = hypot(q.x - px, q.y - py), u = q.mass - d * .012; if (u > uBest) { uBest = u; localGoal = q; } }
    }
    // latency segment
    let st0 = {x: px, y: py, h: ang, v: s.sp * PX_PER_SP}; for (let k = 0; k < 4; k++) st0 = this.v4Adv(st0, prevCmd, prevBoost, LAT / 4, ph);
    const fracs = [0, .33, -.33, .67, -.67, 1, -1], fams = canBoost ? [prevBoost, !prevBoost] : [false]; const cands = [];
    for (const boost of fams) for (const fr of fracs) {
      let st = {...st0}, t = LAT, contact = false, viol = 0, mg = Infinity; const samp = [];
      while (t < LAT + HL - 1e-9) { const target = st.h + fr * ph.w * DT; st = this.v4Adv(st, target, boost, DT, ph); t += DT;
        const g = Wd.gapAt(st.x, st.y, t); if (g < 0) { contact = true; break; } if (g < mg) mg = g;
        const ci = Wd.cellI(st.x, st.y); if (ci >= 0 && t + V.V4_SAFETY >= tr[ci]) viol += (t + V.V4_SAFETY - tr[ci]) * DT;
        samp.push(t, st.x, st.y, st.h); }
      if (contact) continue;
      let follow = 0; if (route) { const [rx, ry] = routeAt(t); follow = -hypot(st.x - rx, st.y - ry); }
      else if (localGoal) { const ga = Math.atan2(localGoal.y - py, localGoal.x - px); follow = -Math.abs(wrap(st.h - ga)) * 100 - hypot(st.x - localGoal.x, st.y - localGoal.y) * .1; }
      else follow = -Math.abs(fr) * 100;                                                       // empty open area: keep moving, do not circle
      const stick = this.v2last ? -Math.abs(wrap((st0.h + fr * ph.w * .3) - this.v2last[0])) * 15 : 0;
      const foodRun = localGoal && localGoal.kind === 'food' && hypot(localGoal.x - px, localGoal.y - py) > 180;
      cands.push({fr, boost, viol, mg, follow, stick, growth: boost ? (foodRun ? Math.min(12, localGoal.mass * .08) : -V.V2_BCOST * .1) : 0, samp, hEnd: st.h});
    }
    let best = null, mode;
    if (!cands.length) { mode = 'v4hard'; }
    else { const safe = cands.filter(c => c.viol === 0), pool = safe.length ? safe : cands;
      mode = safe.length ? (route ? `v4${route.mode || ''}` : (localGoal ? 'v4foodlocal' : 'v4cruise')) : 'v4esc';
      const better = (a, b) => { if (!b) return true; if (Math.abs(a.viol - b.viol) > 1e-6) return a.viol < b.viol; if (Math.abs(a.follow - b.follow) > 3) return a.follow > b.follow; if (Math.abs(a.mg - b.mg) > 2) return a.mg > b.mg; if (Math.abs(a.stick - b.stick) > .5) return a.stick > b.stick; return a.growth > b.growth; };
      for (const c of pool) { c.sc = c.follow + Math.min(c.mg, 60) * .01 + c.stick * .01 + c.growth * .01; if (better(c, best)) best = c; } }
    let cmd, boost, plan = null, pts = [];
    if (best) { boost = best.boost && canBoost; const S = best.samp; let k = 0; while (k + 4 < S.length && S[k] < LAT + .3) k += 4; cmd = Math.atan2(S[k + 2] - py, S[k + 1] - px);
      plan = [0, px, py, ang, prevBoost ? 1 : 0, LAT, st0.x, st0.y, st0.h, prevBoost ? 1 : 0]; for (let i = 0; i + 3 < S.length; i += 4) { plan.push(S[i], S[i + 1], S[i + 2], S[i + 3], boost ? 1 : 0); pts.push(S[i + 1], S[i + 2]); }
      if (route) { const age = s.t - route.t0, P = route.pts; for (let i = 0; i + 4 < P.length; i += 5) if (P[i] >= age + HL) pts.push(P[i + 1], P[i + 2]); } }
    else { cmd = this.v2last ? this.v2last[0] : ang; boost = false; }
    this.prev = cmd; this.prevBoost = boost; this.v2last = [cmd, boost];
    const c0 = Wd.cellI(px, py);
    const trace = {mode, boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: cands.filter(c => c.viol === 0).length, threat: 0, enclosed: 0, wrap: 0, thr: null, eat: best ? r1(best.sc) : null, goal: null, thread: null, cov: null, cov_id: null, cov_free: null, esc: null,
      L: s.L, sc: r2(s.sc), died_near: this.diedNear, kills: this.kills, big: 0, curl: 0, prof: this.profile, onward: null, nh: Rf.heads.length, hold_by: null, sized: 0, guard: null, gforce: 0, gatk: 0, giant: 0, wf: 0, raid: 0, gap: null, squeeze: null,
      ttd: best ? r2(best.viol) : null, ttds: c0 >= 0 ? r1(Wd.clear[c0]) : null, ttdh: best ? r1(best.mg) : null, v2obj: null, arc: 0, chg: 0, cause: routeWhy, v3_ms: r1(nowMs() - T0), v3_exits: s.route ? (s.route.exits || 0) : 0, v3_cert: route ? 1 : 0,
      v3_root: s.route ? r1(s.route.ms || 0) : null, v3_keep: s.route && s.route.partial ? 1 : 0, v3_hold: s.route ? r2(s.t - s.route.t0) : null};
    const shownGoal = localGoal ? [localGoal.x, localGoal.y] : null;
    this.last = {mode, trace, draw: {chosen: pts, safe: [], pos: new Float64Array(0), N, C2: 0, i: 0, near: [], gaps: [], goal: shownGoal, crowdAt: null, wp: null, attacker: null, ro: Wd.ro, analysis: null}, plan: plan && plan.length >= 10 ? plan : null};
    return [cmd, boost];
  }

  // ================= V6 — two independent layers =================
  // Macro layer (Worker): build a 2-D clearance maze and return a guide corridor to an observed exit.
  // Local layer (every tick): test continuous short arcs against current bodies and enemy-head motion, then follow the guide.
  // The macro route is guidance, never a direct mouse command. Only the local layer emits commands.
  v6Route(s, ver) {
    const V = this.values, clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), T0 = clock();
    const Wd = this.v4World(s), Rf = this.v4Reach(s, Wd), ph = this.v4Physics(s.sc), N = Wd.N, NN = Wd.NN;
    const M = V.V6_MARGIN, SAFE = V.V6_SAFETY, H = V.V6_H, EDGE = V.V6_EDGE, LAT = V.TRACK_LAT || .17;
    const prevCmd = Number.isFinite(s.cmdNow) ? s.cmdNow : s.ang, prevBoost = typeof s.boostNow === 'boolean' ? s.boostNow : false;
    let root = {x: s.x, y: s.y, h: s.ang, v: s.sp * PX_PER_SP};
    for (let k = 0; k < 4; k++) root = this.v4Adv(root, prevCmd, prevBoost, LAT / 4, ph);
    // The maze is a route planner, not an unconditional escape command. Test the
    // current motion first; only an impending obstruction requests escape.
    const K = this.v6nav || (this.v6nav = {dangerUntil: -Infinity, target: null, passed: []});
    K.passed = K.passed.filter(p => s.t < p.until);
    if (K.target) {
      const dx = K.target.x - s.x, dy = K.target.y - s.y, d = hypot(dx, dy);
      if (d < Math.max(Wd.ro + 20, ph.cs * .25) || (d < ph.cs * .65 && dx * Math.cos(s.ang) + dy * Math.sin(s.ang) < 0)) {
        K.passed.push({...K.target, until: s.t + 3}); K.target = null;
      }
    }
    let probe = {...root}, danger = false;
    for (let t = LAT; t < LAT + 1.6; t += .1) {
      probe = this.v4Adv(probe, prevCmd, prevBoost, .1, ph);
      const c = Wd.cellI(probe.x, probe.y);
      if (c < 0 || Wd.gapAt(probe.x, probe.y, t + .1) < M || Rf.tr[c] <= t + .1 + SAFE) { danger = true; break; }
    }
    if (danger) K.dangerUntil = s.t + .8;
    const escaping = !!s.v7Escape || s.t < K.dangerUntil, foodCells = new Map(), bins = new Map();
    const foodR = V.V6_FOOD_R ?? 3000, heapSize = Math.max(Wd.CELL, V.V6_HEAP_SIZE ?? 250);
    const goalW = V.V6_GOAL_W ?? 1.5, centerW = V.V6_CENTER_W ?? 2;
    const centerDist = hypot(s.x - s.wall[0], s.y - s.wall[1]);
    // Fade the centre bias near the centre; it is a direction preference, not a point to orbit.
    const centerGain = (x, y) => centerW * Math.min(1, centerDist / 2000) * (centerDist - hypot(x - s.wall[0], y - s.wall[1]));
    if (!escaping) for (let i = 0; i + 2 < s.food.length; i += 3) {
      if (s.food[i + 2] < (V.V6_REMAINS_MIN ?? 12)) continue;
      const x = s.food[i], y = s.food[i + 1], d = hypot(x - s.x, y - s.y), c = Wd.cellI(x, y);
      if (goalW <= 0 || d < Wd.ro + 15 || d > foodR) continue;
      if (d < ph.cs * .65 && (x - s.x) * Math.cos(s.ang) + (y - s.y) * Math.sin(s.ang) < 0) continue;
      if (K.passed.some(p => hypot(x - p.x, y - p.y) < Wd.CELL * 1.5)) continue;
      const key = Math.floor(x / heapSize) + ',' + Math.floor(y / heapSize);
      let b = bins.get(key); if (!b) { b = {mass: 0, x: 0, y: 0, members: []}; bins.set(key, b); }
      const w = s.food[i + 2]; b.mass += w; b.x += x * w; b.y += y * w; b.members.push({x, y, c, d});
    }
    const piles = [...bins.values()].map(b => {
      b.x /= b.mass; b.y /= b.mass;
      b.keep = K.target && hypot(b.x - K.target.x, b.y - K.target.y) < heapSize ? 1.25 : 1;
      b.distance = hypot(b.x - s.x, b.y - s.y); b.value = b.mass * b.keep / (400 + b.distance); return b;
    }).sort((a, b) => b.value - a.value).slice(0, 8);
    const remote = [];
    for (const b of piles) {
      let mapped = false;
      for (const f of b.members) if (f.c >= 0 && f.d <= V.V6_OBS - Wd.CELL) {
        const old = foodCells.get(f.c); if (!old || b.value > old.pile.value) foodCells.set(f.c, {pile: b, x: f.x, y: f.y}); mapped = true;
      }
      // Far food supplies a heading only. Certify only the local prefix, never the unseen rest.
      if (!mapped) remote.push(b);
    }
    const c0 = Wd.cellI(root.x, root.y); if (c0 < 0) return {algo: 'v6', ver, t0: s.t, pts: null, certified: 0, reason: 'outside', ms: clock() - T0};
    const at = new Float32Array(NN).fill(1e9), cost = new Float32Array(NN).fill(1e9), minG = new Float32Array(NN).fill(-1e9), prev = new Int32Array(NN).fill(-1), done = new Uint8Array(NN);
    const hk = [], hv = []; const push = (n, d) => { hk.push(n); hv.push(d); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hv[p] <= hv[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]]; [hv[p], hv[c]] = [hv[c], hv[p]]; c = p; } };
    const pop = () => { const n = hk[0], ln = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = ln; hv[0] = lv; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < hk.length && hv[l] < hv[m]) m = l; if (r < hk.length && hv[r] < hv[m]) m = r; if (m === c) break; [hk[m], hk[c]] = [hk[c], hk[m]]; [hv[m], hv[c]] = [hv[c], hv[m]]; c = m; } } return n; };
    const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    at[c0] = LAT; cost[c0] = 0; minG[c0] = Wd.gapAt(root.x, root.y, LAT); if (minG[c0] < M) return {algo: 'v6', ver, t0: s.t, pts: null, certified: 0, reason: 'root_blocked', ms: clock() - T0}; push(c0, 0);
    let exit = -1, partial = c0, partialV = -Infinity, foodGoal = -1, foodScore = -Infinity, selectedFood = null, exitScore = -Infinity, exits = 0, expanded = 0, over = false;
    while (hk.length) {
      if ((++expanded & 63) === 0 && clock() - T0 > V.V6_PLAN_BUDGET) { over = true; break; }
      const n = pop(); if (done[n]) continue; done[n] = 1;
      const x0 = n === c0 ? root.x : Wd.cx(n), y0 = n === c0 ? root.y : Wd.cy(n), radial = hypot(x0 - s.x, y0 - s.y), slack0 = Math.min(Rf.tr[n], H + 2) - at[n] - SAFE;
      const forward = (x0 - s.x) * Math.cos(s.ang) + (y0 - s.y) * Math.sin(s.ang);
      const pv = (escaping ? radial + Math.min(Math.max(minG[n], 0), 100) * 2 + Math.min(slack0, 3) * 60 : forward - Math.abs((x0 - s.x) * Math.sin(s.ang) - (y0 - s.y) * Math.cos(s.ang))) + centerGain(x0, y0);
      if (n !== c0 && pv > partialV) { partialV = pv; partial = n; }
      if (n !== c0 && foodCells.has(n)) {
        const f = foodCells.get(n), b = f.pile;
        const facing = 1 - .3 * Math.abs(wrap(Math.atan2(y0 - s.y, x0 - s.x) - s.ang)) / Math.PI;
        const score = b.mass * b.keep * facing / (400 + cost[n] * ph.cs);
        if (score > foodScore) { foodScore = score; foodGoal = n; selectedFood = {x: f.x, y: f.y, mass: b.mass}; }
      }
      if (n !== c0) for (const b of remote) {
        const remaining = hypot(b.x - x0, b.y - y0), progress = b.distance - remaining;
        if (progress < Wd.CELL * 2) continue;
        const score = b.mass * b.keep / (400 + cost[n] * ph.cs + remaining) * Math.min(1, progress / Math.max(EDGE, Wd.CELL));
        if (score > foodScore) { foodScore = score; foodGoal = n; selectedFood = {x: b.x, y: b.y, mass: b.mass}; }
      }
      if (escaping && radial >= EDGE && minG[n] >= M && slack0 > 0) {
        exits++; if (pv > exitScore) { exit = n; exitScore = pv; } continue;
      }
      if (!escaping && !piles.length && radial >= EDGE) continue;
      if (at[n] >= H) continue;
      const ni = n % N, nj = Math.floor(n / N);
      for (const [di, dj, w] of nb) {
        const ii = ni + di, jj = nj + dj; if (ii < 0 || ii >= N || jj < 0 || jj >= N) continue; const m = jj * N + ii; if (done[m]) continue;
        const x1 = Wd.cx(m), y1 = Wd.cy(m), dt = w * Wd.CELL / ph.cs, nt = at[n] + dt; if (nt > H) continue;
        if (hypot(x1 - s.x, y1 - s.y) > V.V6_OBS - Wd.CELL) continue;
        let ok = true, eg = minG[n], es = Infinity;
        for (let q = 1; q <= 4; q++) { const f = q / 4, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, tt = at[n] + dt * f;
          const g = Wd.gapAt(x, y, tt), ci = Wd.cellI(x, y); if (g < eg) eg = g; if (g < M || ci < 0) { ok = false; break; }
          const sl = Rf.tr[ci] - tt - SAFE; if (sl < es) es = sl; if (sl <= 0) { ok = false; break; } }
        if (!ok) continue;
        const hug = V.V6_CLEAR_W * dt * 32 / Math.max(8, eg - M), ng = cost[n] + dt + hug;
        if (ng + 1e-6 < cost[m]) { cost[m] = ng; at[m] = nt; minG[m] = eg; prev[m] = n; push(m, ng); }
      }
    }
    const intent = escaping ? 'escape' : foodGoal >= 0 ? 'food' : 'explore';
    const goal = escaping ? (exit >= 0 ? exit : partial) : foodGoal >= 0 ? foodGoal : partial;
    if (goal === c0 || prev[goal] < 0) return {algo: 'v6', ver, t0: s.t, intent, pts: null, certified: 0, reason: over ? 'budget' : 'no_path', exits, ms: clock() - T0};
    K.target = intent === 'food' ? {x: selectedFood.x, y: selectedFood.y} : null;
    const cells = []; for (let q = goal; q !== -1; q = prev[q]) cells.push(q); cells.reverse();
    // Remove only collinear grid points. Corners remain visible because they are the actual maze corridor chosen by the search.
    const line = [[root.x, root.y, c0]]; for (let k = 1; k < cells.length; k++) { const c = cells[k], p = line[line.length - 1];
      if (line.length >= 2) { const a = line[line.length - 2], dx0 = Math.sign(p[0] - a[0]), dy0 = Math.sign(p[1] - a[1]), dx1 = Math.sign(Wd.cx(c) - p[0]), dy1 = Math.sign(Wd.cy(c) - p[1]); if (dx0 === dx1 && dy0 === dy1) { line[line.length - 1] = [Wd.cx(c), Wd.cy(c), c]; continue; } }
      line.push([Wd.cx(c), Wd.cy(c), c]); }
    const pts = [0, s.x, s.y, s.ang, prevBoost ? 1 : 0, LAT, root.x, root.y, root.h, prevBoost ? 1 : 0]; let tt = LAT, last = line[0], minClear = minG[goal], minSlack = Infinity;
    for (let k = 1; k < line.length; k++) { const q = line[k], h = Math.atan2(q[1] - last[1], q[0] - last[0]); tt += hypot(q[0] - last[0], q[1] - last[1]) / ph.cs; pts.push(tt, q[0], q[1], h, 0); const sl = Rf.tr[q[2]] - tt - SAFE; if (sl < minSlack) minSlack = sl; last = q; }
    const certified = exit >= 0 && minClear >= M && minSlack > 0;
    return {algo: 'v6', ver, t0: s.t, pts, intent, certified: certified ? 1 : 0, reason: escaping ? (certified ? 'exit' : (over ? 'budget_prefix' : 'reachable_prefix')) : intent, exits,
      partial: escaping && !certified, mode: intent, foodValue: intent === 'food' ? selectedFood.mass : 0,
      goal: {x: intent === 'food' ? selectedFood.x : last[0], y: intent === 'food' ? selectedFood.y : last[1], kind: intent}, minClear, minSlack, expanded, ms: clock() - T0};
  }

  v6Step(s) {
    const V = this.values, clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), T0 = clock();
    const Wd = this.v4World(s, false, false), ph = this.v4Physics(s.sc), M = V.V6_MARGIN, SAFE = V.V6_SAFETY, LAT = V.TRACK_LAT || .17, HL = V.V6_LOCAL_H, DT = .05;
    const px = s.x, py = s.y, ang = s.ang, ro = Wd.ro, canBoost = s.L >= V.V2_MINL, vb = BOOST_SP * PX_PER_SP;
    const prevCmd = Number.isFinite(s.cmdNow) ? s.cmdNow : ang, prevBoost = typeof s.boostNow === 'boolean' ? s.boostNow : !!this.prevBoost;
    const heads = []; for (let m = 0; m < s.hid.length; m++) { const x = s.heads[5 * m], y = s.heads[5 * m + 1]; if (hypot(x - px, y - py) > V.V6_HEADR) continue;
      const a = s.heads[5 * m + 2], sp = s.heads[5 * m + 3], sc = s.heads[5 * m + 4], rh = R * sc, wc = turnRate(sc), v0 = Math.max(sp, 5.8) * PX_PER_SP, rate = Math.max(0, (vb - v0) / RAMP);
      const sRamp = v0 * RAMP + .5 * rate * RAMP * RAMP, travel = d => rate <= 1e-6 ? d / vb : (d <= sRamp ? (-v0 + Math.sqrt(v0 * v0 + 2 * rate * d)) / rate : RAMP + (d - sRamp) / vb);
      heads.push({x, y, a, rh, wc, v0, rate, travel}); }
    const headGapAt = (x, y, t) => { let best = Infinity;
      for (const h of heads) { const ta = Math.min(t, RAMP), ds = h.v0 * ta + .5 * h.rate * ta * ta + vb * Math.max(0, t - RAMP);
        for (const turn of [-1, 0, 1]) { let hx, hy; if (!turn || h.wc * t < 1e-6) { hx = h.x + ds * Math.cos(h.a); hy = h.y + ds * Math.sin(h.a); }
          else { const da = turn * h.wc * t, rr = ds / da, ha = h.a + da; hx = h.x + rr * (Math.sin(ha) - Math.sin(h.a)); hy = h.y - rr * (Math.cos(ha) - Math.cos(h.a)); }
          const g = hypot(x - hx, y - hy) - ro - h.rh - M; if (g < best) best = g; } }
      return best; };
    const headRiskAt = (x, y, t) => { let r = 0; for (const h of heads) { const dx = x - h.x, dy = y - h.y, d = hypot(dx, dy) - ro - h.rh - M;
        if (d <= 0) return 10; const ta = Math.max(h.travel(d), Math.abs(wrap(Math.atan2(dy, dx) - h.a)) / h.wc), z = t + SAFE - ta; if (z > r) r = z; } return Math.max(0, r); };
    let route = s.route && s.route.algo === 'v6' && s.route.pts ? s.route : null, routeWhy = route ? 'ok' : 'none';
    const nearestGuide = (P, x, y) => { let best = null;
      for (let i = 0; i + 9 < P.length; i += 5) { const ax = P[i + 1], ay = P[i + 2], dx = P[i + 6] - ax, dy = P[i + 7] - ay, l2 = dx * dx + dy * dy;
        const f = l2 > 1e-9 ? clip(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0, qx = ax + dx * f, qy = ay + dy * f, d2 = (x - qx) ** 2 + (y - qy) ** 2;
        if (!best || d2 < best.d2) best = {i, f, x: qx, y: qy, d2}; }
      return best; };
    const guideAhead = (P, x, y, ahead, passThrough = false) => { const q = nearestGuide(P, x, y); if (!q) return [P[P.length - 4], P[P.length - 3], P[P.length - 2]];
      let px0 = q.x, py0 = q.y, i = q.i; for (; i + 9 < P.length; i += 5) { const nx = P[i + 6], ny = P[i + 7], d = hypot(nx - px0, ny - py0);
        if (d >= ahead) { const f = ahead / Math.max(d, 1e-6); return [px0 + (nx - px0) * f, py0 + (ny - py0) * f, Math.atan2(ny - py0, nx - px0)]; }
        ahead -= d; px0 = nx; py0 = ny; }
      const h = P[Math.max(3, P.length - 2)];
      // A food target is a waypoint to pass, not a position at which a moving
      // snake can stop. The local collision checker validates this continuation.
      return passThrough ? [px0 + ahead * Math.cos(h), py0 + ahead * Math.sin(h), h] : [px0, py0, h]; };
    if (route) { const age = s.t - route.t0; if (age < 0 || age > V.V6_ROUTE_AGE) { route = null; routeWhy = 'old'; }
      else { const P = route.pts, q0 = nearestGuide(P, px, py); outer: for (let i = q0 ? q0.i : 0; i + 9 < P.length; i += 5) { const ax = q0 && i === q0.i ? q0.x : P[i + 1], ay = q0 && i === q0.i ? q0.y : P[i + 2], bx = P[i + 6], by = P[i + 7], d = hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 32));
          for (let k = 0; k <= n; k++) { const f = k / n, x = ax + (bx - ax) * f, y = ay + (by - ay) * f, dist = hypot(x - px, y - py); if (dist > 500) continue; const tt = LAT + dist / ph.cs;
            if (Wd.gapAt(x, y, tt) < M || headGapAt(x, y, tt) < 0) { route = null; routeWhy = 'changed'; break outer; } } } } }
    let st0 = {x: px, y: py, h: ang, v: s.sp * PX_PER_SP}; for (let k = 0; k < 4; k++) st0 = this.v4Adv(st0, prevCmd, prevBoost, LAT / 4, ph);
    const foods = []; for (let i = 0; i + 2 < s.food.length; i += 3) { if (s.food[i + 2] < (V.V6_REMAINS_MIN ?? 12)) continue;
      const d2 = (s.food[i] - px) ** 2 + (s.food[i + 1] - py) ** 2; if (d2 < 500000) foods.push([s.food[i], s.food[i + 1], s.food[i + 2] * 4, d2]); }
    foods.sort((a, b) => a[3] - b[3]); if (foods.length > 120) foods.length = 120;
    const fracs = [0, .33, -.33, .67, -.67, 1, -1], fams = canBoost ? [prevBoost, !prevBoost] : [false], cands = [];
    for (const boost of fams) for (const fr of fracs) { let st = {...st0}, t = LAT, hitT = Infinity, risk = 0, mg = Infinity, hm = Infinity, turn = 0, food = 0; const eaten = new Set(), samp = [];
      while (t < LAT + HL - 1e-9) { const h0 = st.h; st = this.v4Adv(st, st.h + fr * ph.w * DT, boost, DT, ph); t += DT; turn += Math.abs(wrap(st.h - h0));
        const g = Wd.gapAt(st.x, st.y, t), hg = heads.length ? headGapAt(st.x, st.y, t) : Infinity; if (g < mg) mg = g; if (hg < hm) hm = hg; samp.push(t, st.x, st.y, st.h);
        if (g < M || hg < 0) { hitT = t; break; } risk += headRiskAt(st.x, st.y, t) * DT;
        for (let j = 0; j < foods.length; j++) if (!eaten.has(j)) { const f = foods[j], rr = ro + 30; if ((f[0] - st.x) ** 2 + (f[1] - st.y) ** 2 < rr * rr) { eaten.add(j); food += f[2]; } } }
      let follow; if (route) { const q = guideAhead(route.pts, st0.x, st0.y, Math.max(140, ph.cs * HL * .8), route.intent === 'food'); follow = -hypot(st.x - q[0], st.y - q[1]) - Math.abs(wrap(st.h - q[2])) * 30; }
      else follow = -Math.abs(fr) * 80 + Math.min(mg, 80) * .15;
      const foodDriving = route && route.intent === 'food';
      let collect = 0;
      if (foodDriving) {
        follow *= V.V6_GOAL_W ?? 1.5;
        const g = route.goal, distance = g ? hypot(g.x - px, g.y - py) : 0;
        if (boost && g && distance > (V.V6_BOOST_MIN_DIST ?? 150) && route.foodValue >= (V.V6_BOOST_MIN_MASS ?? 48)) {
          const progress = distance - hypot(g.x - st.x, g.y - st.y);
          collect = (V.V6_BOOST_W ?? 80) * clip(progress / Math.max(1, ph.cs * HL), 0, 1);
        }
      } else {
        const d = hypot(px - s.wall[0], py - s.wall[1]);
        collect = (V.V6_CENTER_W ?? 2) * Math.min(1, d / 2000) * (d - hypot(st.x - s.wall[0], st.y - s.wall[1]));
      }
      cands.push({boost, fr, hitT, risk, mg, hm, follow, food, collect, turn, samp}); }
    const clean = cands.filter(c => c.hitT === Infinity), base = clean.length ? clean : cands, safe = clean.filter(c => c.risk <= 1e-8), pool = safe.length ? safe : base; let best = null;
    const foodDriving = route && route.intent === 'food';
    const better = (a, b) => { if (!b) return true; if (a.hitT !== b.hitT) return a.hitT > b.hitT; if (Math.abs(a.risk - b.risk) > 1e-6) return a.risk < b.risk;
      const af = a.follow + a.collect + (foodDriving ? a.food * (V.V6_FOOD_W ?? 1) : 0), bf = b.follow + b.collect + (foodDriving ? b.food * (V.V6_FOOD_W ?? 1) : 0);
      if (Math.abs(af - bf) > 3) return af > bf; if (Math.abs(a.hm - b.hm) > 3) return a.hm > b.hm; if (Math.abs(a.mg - b.mg) > 2) return a.mg > b.mg; return a.food * .08 - a.turn > b.food * .08 - b.turn; };
    for (const c of pool) if (better(c, best)) best = c;
    // Compare the requested route motion with the chosen safe motion, so the
    // cyan line is labelled avoidance only when a safety constraint intervened.
    const desired = cands.reduce((a, b) => !a || b.follow > a.follow ? b : a, null);
    const localAvoiding = !clean.length || !safe.length || !!(desired && (desired.hitT !== Infinity || desired.risk > 1e-8));
    let cmd = this.v2last ? this.v2last[0] : ang, boost = false, plan = null, localPts = [];
    if (best && best.samp.length) { const S = best.samp; let k = 0; while (k + 4 < S.length && S[k] < LAT + .3) k += 4; cmd = Math.atan2(S[k + 2] - py, S[k + 1] - px); boost = best.boost && canBoost;
      plan = [0, px, py, ang, prevBoost ? 1 : 0, LAT, st0.x, st0.y, st0.h, prevBoost ? 1 : 0]; for (let i = 0; i + 3 < S.length; i += 4) { plan.push(S[i], S[i + 1], S[i + 2], S[i + 3], boost ? 1 : 0); localPts.push(S[i + 1], S[i + 2]); } }
    this.prev = cmd; this.prevBoost = boost; this.v2last = [cmd, boost];
    const guidePts = []; if (route) { const P = route.pts, q = nearestGuide(P, px, py); if (q) { guidePts.push(q.x, q.y); for (let i = q.i + 5; i + 4 < P.length; i += 5) guidePts.push(P[i + 1], P[i + 2]); } }
    // Keep the two algorithms visible independently. A rejected macro route is never shown as usable.
    const localPath = plan ? [px, py, st0.x, st0.y, ...localPts] : [];
    const mode = !clean.length ? 'v6hard' : (localAvoiding ? 'v6avoid' : route ? (route.intent === 'food' ? 'v6food' : route.intent === 'explore' ? 'v6explore' : route.certified ? 'v6guide' : 'v6partial') : 'v6local');
    const trace = {mode, boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: safe.length, threat: localAvoiding ? 1 : 0, enclosed: 0, wrap: 0, thr: null, eat: best ? r1(best.food) : null, goal: route ? (route.foodValue || 0) : 0, thread: null, cov: null, cov_id: null, cov_free: null, esc: null,
      L: s.L, sc: r2(s.sc), died_near: this.diedNear, kills: this.kills, big: 0, curl: 0, prof: this.profile, onward: null, nh: heads.length, hold_by: null, sized: 0, guard: null, gforce: 0, gatk: 0, giant: 0, wf: 0, raid: 0, gap: null, squeeze: null,
      ttd: best ? r2(best.risk) : null, ttds: best ? r1(best.mg) : null, ttdh: best ? r1(Math.min(best.hm, 9999)) : null, v2obj: null, arc: 0, chg: 0, cause: routeWhy, v3_ms: r1(clock() - T0), v3_exits: s.route ? (s.route.exits || 0) : 0, v3_cert: route && route.certified ? 1 : 0,
      v3_root: s.route ? r1(s.route.ms || 0) : null, v3_keep: route && !route.certified ? 1 : 0, v3_hold: route ? r2(s.t - route.t0) : null, v3_route_match: route ? 1 : 0, v6_intent: route ? route.intent : 'none', v6_goal_x: route?.goal?.x ?? null, v6_goal_y: route?.goal?.y ?? null, v6_reason: route ? route.reason : routeWhy};
    this.last = {mode, trace, draw: {chosen: guidePts.length ? guidePts : localPts, mazePath: guidePts, localPath,
      mazeState: route ? (route.intent === 'escape' ? (route.certified ? 'exit' : 'partial') : route.intent) : routeWhy, localUnsafe: !clean.length, localAvoiding,
      guideCert: route ? (route.certified ? 1 : 0) : -1, guideWidth: route ? route.minClear : null,
      safe: [], pos: new Float64Array(0), N: Wd.N, C2: 0, i: 0, near: [], gaps: [], goal: route && route.goal ? [route.goal.x, route.goal.y] : null, crowdAt: null, wp: null, attacker: null, ro, analysis: null}, plan};
    return [cmd, boost];
  }

  // ---- V5 (2026-09-30): one-tick, two-stage sequence search, no planner Worker. Shares the V4 world map (A) and enemy reach field (B).
  // 100 sequences = 2 stages x (5 turn rates x boost on/off), each simulated with continuous speed. Hard filters: body/wall/head contact and a dead end
  // after the sequence; everything else is one score: food actually eaten on the path + progress to the goal (food cluster, else open-space heading)
  // - enemy-reach risk - turning - boost cost. Enemy risk is a cost, not a lexicographic wall, so one far-away head does not stop foraging. ----
  v5Step(s) {
    const V = this.values, nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), T0 = nowMs();
    const K = this.v5 || (this.v5 = {goal: null, dir: null});
    const Wd = this.v4World(s), Rf = this.v4Reach(s, Wd), tr = Rf.tr, ph = this.v4Physics(s.sc), ro = Wd.ro, gapAt = Wd.gapAt;
    const px = s.x, py = s.y, ang = s.ang, LAT = V.TRACK_LAT || .17, ST = V.V5_STAGE, DT = .05, canBoost = s.L >= V.V2_MINL;
    const prevCmd = Number.isFinite(s.cmdNow) ? s.cmdNow : ang, prevBoost = typeof s.boostNow === 'boolean' ? s.boostNow : !!this.prevBoost;
    let st0 = {x: px, y: py, h: ang, v: s.sp * PX_PER_SP}; for (let k = 0; k < 4; k++) st0 = this.v4Adv(st0, prevCmd, prevBoost, LAT / 4, ph);
    const val = z => z * (z >= V.V2_REMAINS ? V.V5_REMAINSX : 1);
    // food near us (eaten along a path) and clusters (goal)
    const F = s.food, foods = [], bins = new Map(), G = 128;
    for (let i = 0; i + 2 < F.length; i += 3) { const w = val(F[i + 2]), dx = F[i] - px, dy = F[i + 1] - py, d2 = dx * dx + dy * dy;
      if (d2 < 640000) foods.push([F[i], F[i + 1], w, d2]);
      const key = Math.floor(F[i] / G) * 65536 + Math.floor(F[i + 1] / G); let q = bins.get(key); if (!q) { q = {x: 0, y: 0, mass: 0}; bins.set(key, q); } q.x += F[i] * w; q.y += F[i + 1] * w; q.mass += w; }
    if (foods.length > 200) { foods.sort((a, b) => a[3] - b[3]); foods.length = 200; }
    let goal = null, uBest = -Infinity, uPrev = -Infinity, prevQ = null;
    for (const q of bins.values()) { q.x /= q.mass; q.y /= q.mass; const u = q.mass - hypot(q.x - px, q.y - py) * .012;
      if (u > uBest) { uBest = u; goal = q; } if (K.goal && hypot(q.x - K.goal.x, q.y - K.goal.y) < 200 && u > uPrev) { uPrev = u; prevQ = q; } }
    if (goal && prevQ && uPrev + V.V5_HYST >= uBest) goal = prevQ;
    let kind = 'food';
    if (!goal) {   // nothing to eat in sight: head for open space, staying away from the rim, keeping the previous heading unless it is blocked
      const W0 = s.wall[0], W1 = s.wall[1], W2 = s.wall[2], ac = Math.atan2(W1 - py, W0 - px), rim = hypot(px - W0, py - W1) / W2, base = K.dir === null ? ang : K.dir;
      let bestA = ang, bestS = -Infinity;
      for (let k = 0; k < 24; k++) { const a = k * TAU / 24; let clr = 900;
        for (let d = 100; d <= 900; d += 100) if (gapAt(px + Math.cos(a) * d, py + Math.sin(a) * d, 0) < 0) { clr = d - 100; break; }
        const sc_ = clr / 900 + .5 * Math.cos(a - ang) + .3 * Math.cos(a - base) + .8 * rim * rim * Math.cos(a - ac); if (sc_ > bestS) { bestS = sc_; bestA = a; } }
      K.dir = bestA; kind = 'explore'; goal = {x: px + Math.cos(bestA) * 700, y: py + Math.sin(bestA) * 700, mass: 0};
    } else K.dir = null;
    K.goal = kind === 'food' ? goal : null;
    // goal potential: value of the goal spread over V5_TG seconds of "time to reach it" (distance / cruise speed + time to turn toward it), so a U-turn
    // toward a pile is credited for the turning time it saves. A small pile or an empty heading has little value, so it never pays for a boost.
    const gv = Math.min(300, kind === 'food' ? goal.mass : V.V5_EXPLOREV) * V.V5_W_FOOD / V.V5_TG;
    const tgOf = (x, y, h) => hypot(goal.x - x, goal.y - y) / ph.cs + Math.abs(wrap(Math.atan2(goal.y - y, goal.x - x) - h)) / ph.w, tg0 = tgOf(st0.x, st0.y, st0.h);
    const fr5 = [-1, -.5, 0, .5, 1], fams = canBoost ? [prevBoost, !prevBoost] : [false];
    const headGapAt = (x, y, t) => { let best = Infinity;
      for (const h of Rf.heads) { const ta = Math.min(t, RAMP), ds = h.v0 * ta + .5 * h.rate * ta * ta + h.vb * Math.max(0, t - RAMP);
        for (const turn of [-1, 0, 1]) { let hx, hy;
          if (!turn || h.wc * t < 1e-6) { hx = h.x + ds * Math.cos(h.a); hy = h.y + ds * Math.sin(h.a); }
          else { const da = turn * h.wc * t, rr = ds / da, ha = h.a + da; hx = h.x + rr * (Math.sin(ha) - Math.sin(h.a)); hy = h.y - rr * (Math.cos(ha) - Math.cos(h.a)); }
          const g = hypot(x - hx, y - hy) - ro - h.rh - V.V4_MARGIN; if (g < best) best = g; } }
      return best; };
    const EATR2 = (ro + V.V5_EATR) * (ro + V.V5_EATR);
    // one stage: mutates a copy of the accumulator; returns the end state
    const runStage = (st, t, fr, boost, A) => { const end = t + ST;
      while (t < end - 1e-9 && A.hitT === Infinity) { const h0 = st.h; st = this.v4Adv(st, st.h + fr * ph.w * DT, boost, DT, ph); t += DT;
        const g = gapAt(st.x, st.y, t), hg = Rf.heads.length ? headGapAt(st.x, st.y, t) : Infinity; if (g < A.mg) A.mg = g; if (hg < A.hm) A.hm = hg;
        A.samp.push(t, st.x, st.y, st.h); A.turn += Math.abs(wrap(st.h - h0)); if (boost) A.boostT += DT;
        if (g < 0 || hg < 0) { A.hitT = t; break; }
        const ci = Wd.cellI(st.x, st.y); if (ci >= 0 && t + V.V4_SAFETY >= tr[ci]) A.viol += (t + V.V4_SAFETY - tr[ci]) * DT;
        for (let j = 0; j < foods.length; j++) { const f = foods[j]; if (A.eaten.has(j)) continue; const dx = f[0] - st.x, dy = f[1] - st.y; if (dx * dx + dy * dy < EATR2) { A.eaten.add(j); A.food += f[2]; } } }
      return {st, t}; };
    const cp = A => ({hitT: A.hitT, viol: A.viol, mg: A.mg, hm: A.hm, turn: A.turn, boostT: A.boostT, food: A.food, eaten: new Set(A.eaten), samp: A.samp.slice()});
    const cands = []; let n = 0;
    for (const b1 of fams) for (const f1 of fr5) {
      const A1 = {hitT: Infinity, viol: 0, mg: Infinity, hm: Infinity, turn: 0, boostT: 0, food: 0, eaten: new Set(), samp: []}, r1_ = runStage(st0, LAT, f1, b1, A1);
      for (const b2 of (canBoost ? [b1, !b1] : [false])) for (const f2 of fr5) {
        const A = cp(A1); let end = r1_;
        if (A.hitT === Infinity) end = runStage(r1_.st, r1_.t, f2, b2, A);
        // dead end: from the end state, is any of straight / max left / max right safe for another 0.5 s?
        let escT = .5;
        if (A.hitT === Infinity) { escT = 0; for (const fe of [-1, 0, 1]) { let s2 = end.st, t2 = end.t, tt = 0;
          while (tt < .5 - 1e-9) { s2 = this.v4Adv(s2, s2.h + fe * ph.w * DT, false, DT, ph); t2 += DT; tt += DT; if (gapAt(s2.x, s2.y, t2) < 0 || (Rf.heads.length && headGapAt(s2.x, s2.y, t2) < 0)) break; }
          if (tt > escT) escT = tt; } }
        const hitT = A.hitT !== Infinity ? A.hitT : (escT < .5 - 1e-9 ? end.t + escT : Infinity);
        const e = end.st, m1 = r1_.st, prog = tg0 - tgOf(e.x, e.y, e.h) + .5 * (tg0 - tgOf(m1.x, m1.y, m1.h));   // half-weight credit at the end of stage 1: act now, not later
        const score = V.V5_W_FOOD * A.food + gv * prog + V.V5_W_OPEN * Math.min(Math.max(A.mg, 0), 80) - V.V5_W_RISK * A.viol - V.V5_W_TURN * A.turn - V.V5_W_BOOST * A.boostT
          - (this.v2last ? Math.abs(wrap(st0.h + f1 * ph.w * .3 - this.v2last[0])) * V.V5_W_STICK : 0);
        cands.push({f1, b1, hitT, viol: A.viol, hm: A.hm, score, food: A.food, samp: A.samp}); n++; } }
    const clean = cands.filter(c => c.hitT === Infinity), pool = clean.length ? clean : cands; let best = null;
    for (const c of pool) if (best === null || (c.hitT !== best.hitT ? c.hitT > best.hitT : c.score > best.score)) best = c;
    K.best = {f1: best.f1, score: best.score, n: cands.length};
    const mode = !clean.length ? 'v5hard' : (best.viol > 1e-6 ? 'v5esc' : (kind === 'food' ? 'v5food' : 'v5explore'));
    const S = best.samp; let k = 0; while (k + 4 < S.length && S[k] < LAT + .3) k += 4;
    const cmd = S.length ? Math.atan2(S[k + 2] - py, S[k + 1] - px) : (this.v2last ? this.v2last[0] : ang), boost = best.b1 && canBoost, pts = [];
    const plan = [0, px, py, ang, prevBoost ? 1 : 0, LAT, st0.x, st0.y, st0.h, prevBoost ? 1 : 0]; for (let i = 0; i + 3 < S.length; i += 4) { plan.push(S[i], S[i + 1], S[i + 2], S[i + 3], boost ? 1 : 0); pts.push(S[i + 1], S[i + 2]); }
    this.prev = cmd; this.prevBoost = boost; this.v2last = [cmd, boost];
    const c0 = Wd.cellI(px, py);
    const trace = {mode, boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: clean.filter(c => c.viol <= 1e-6).length, threat: 0, enclosed: 0, wrap: 0, thr: null, eat: r1(best.score), goal: null, thread: null, cov: null, cov_id: null, cov_free: null, esc: null,
      L: s.L, sc: r2(s.sc), died_near: this.diedNear, kills: this.kills, big: 0, curl: 0, prof: this.profile, onward: null, nh: Rf.heads.length, hold_by: null, sized: 0, guard: null, gforce: 0, gatk: 0, giant: 0, wf: 0, raid: 0, gap: null, squeeze: null,
      ttd: r2(best.viol), ttds: c0 >= 0 ? r1(Wd.clear[c0]) : null, ttdh: r1(Math.min(best.hm, 9999)), v2obj: null, arc: 0, chg: 0, cause: kind, v3_ms: r1(nowMs() - T0), v3_exits: clean.length, v3_cert: clean.length ? 1 : 0,
      v3_root: r1(best.food), v3_keep: 0, v3_hold: 0};
    this.last = {mode, trace, draw: {chosen: pts, safe: [], pos: new Float64Array(0), N: Wd.N, C2: 0, i: 0, near: [], gaps: [], goal: [goal.x, goal.y], crowdAt: null, wp: null, attacker: null, ro, analysis: null}, plan: plan.length >= 10 ? plan : null};
    return [cmd, boost];
  }

  // ================= V4.1 — first maze solver kept as 근접 회피 mode (user 2026-09-30 "그 로직을 근접 회피 모드로 하나 저장") (user 2026-09-30): the world as a maze. Walls = bodies, arena edge, and every cell an enemy
  // head can reach before us within its forward cone (behind an enemy is open, ahead of it is a wall unless we get there first).
  // A time-consistent Dijkstra on a 48 px grid (cruise and boost speeds) finds the cheapest way to the open ring (V41_EDGE) or, if no
  // exit exists, the reachable cell with the largest time margin. The path becomes a time-stamped trajectory the main-thread
  // tracker follows; the planner is re-run every decision, keeping the previous goal while it stays reachable (hysteresis).
  v41Step(s) {
    const V = this.values, P = this.P, nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), T0 = nowMs();
    const px = s.x, py = s.y, ang = s.ang, sp = s.sp, sc = s.sc, T = s.t, ro = R * sc, S = s.segs, sid = s.sid, ns = sid.length;
    const W0 = s.wall[0], W1 = s.wall[1], W2 = s.wall[2];
    const CELL = V.V41_CELL, HR = Math.ceil(V.V41_OBS / CELL), N = 2 * HR + 1, NN = N * N, cs = cruiseSp(sc) * PX_PER_SP, vb = BOOST_SP * PX_PER_SP;
    const canBoost = s.L >= V.V2_MINL, MARGIN = V.V41_MARGIN, coneR = rad(V.V41_CONE), H = V.V41_H;
    if (this.wallPrev !== null) { const dt = T - this.wallPrev[0]; if (dt > .02 && dt < 3) this.wallRate += (clip((this.wallPrev[1] - W2) / dt, 0, 60) - this.wallRate) * .1; }
    this.wallPrev = [T, W2]; const wallShrink = this.wallRate + 10;
    const ox = px - HR * CELL, oy = py - HR * CELL, cx = i => ox + (i % N + .5) * CELL, cy = i => oy + (Math.floor(i / N) + .5) * CELL;
    // ---- static walls: 96 px segment index -> clearance per cell (calibrated body radius via bodyOff) ----
    const GC = 96, sidx = new Map();
    for (let k = 0; k < ns; k++) { const r = S[5 * k + 4], e = r + P.bodyOff(r) + ro + MARGIN + CELL;
      const x0 = Math.min(S[5 * k], S[5 * k + 2]) - e, x1 = Math.max(S[5 * k], S[5 * k + 2]) + e, y0 = Math.min(S[5 * k + 1], S[5 * k + 3]) - e, y1 = Math.max(S[5 * k + 1], S[5 * k + 3]) + e;
      if (x1 < ox || x0 > ox + N * CELL || y1 < oy || y0 > oy + N * CELL) continue;
      for (let i = Math.floor(x0 / GC); i <= Math.floor(x1 / GC); i++) for (let j = Math.floor(y0 / GC); j <= Math.floor(y1 / GC); j++) { const key = i * 65536 + j; let l = sidx.get(key); if (!l) { l = []; sidx.set(key, l); } l.push(k); } }
    const clear = new Float32Array(NN);            // gap to the nearest body / arena edge (px), < 0 = inside
    for (let i = 0; i < NN; i++) { const x = cx(i), y = cy(i); let g = W2 - wallShrink * .5 - 30 - hypot(x - W0, y - W1) - ro;
      const l = sidx.get(Math.floor(x / GC) * 65536 + Math.floor(y / GC)); if (l) for (const k of l) { const d = segDist(x, y, S, k) - S[5 * k + 4] - P.bodyOff(S[5 * k + 4]) - ro; if (d < g) g = d; }
      clear[i] = g; }
    // ---- time walls: earliest time an enemy head can be at the cell (forward cone only; behind it is open) ----
    const tr = new Float32Array(NN).fill(1e9); let nh = 0;
    for (let m = 0; m < s.hid.length; m++) {
      const hx = s.heads[5 * m], hy = s.heads[5 * m + 1], ha = s.heads[5 * m + 2], hsp = s.heads[5 * m + 3], hsc = s.heads[5 * m + 4], rh = R * hsc;
      if (hypot(hx - px, hy - py) > V.V41_OBS + vb * H) continue; nh++;
      // its speed ahead: what it does now (boosting -> 434 px/s, else its cruise); V41_ASSUME_BOOST = every head may boost from now on
      const hv = hsp > 8 || V.V41_ASSUME_BOOST ? vb : Math.max(hsp, 5.8) * PX_PER_SP;
      for (let i = 0; i < NN; i++) { const dx = cx(i) - hx, dy = cy(i) - hy, d = hypot(dx, dy) - rh - ro - MARGIN;
        if (d <= 0) { tr[i] = 0; continue; }
        const off = Math.abs(wrap(Math.atan2(dy, dx) - ha)); if (off > coneR) continue;
        const t = d / hv; if (t < tr[i]) tr[i] = t; }
    }
    // ---- food per cell (remains weigh more) ----
    const fm = new Float32Array(NN), F = s.food;
    for (let f = 0; f < F.length; f += 3) { const i = Math.floor((F[f] - ox) / CELL), j = Math.floor((F[f + 1] - oy) / CELL); if (i >= 0 && i < N && j >= 0 && j < N) fm[j * N + i] += F[f + 2] * (F[f + 2] >= V.V2_REMAINS ? 3 : 1); }
    // ---- Dijkstra (time as cost) for one speed; blocked = wall cell or arriving after the time wall (minus safety) ----
    const c0 = HR * N + HR, DIAG = Math.SQRT2, nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, DIAG], [1, -1, DIAG], [-1, 1, DIAG], [-1, -1, DIAG]];
    const run = (v) => {
      const dist = new Float32Array(NN).fill(1e9), prev = new Int32Array(NN).fill(-1), done = new Uint8Array(NN);
      const hk = [], hv = []; const push = (n, d) => { hk.push(n); hv.push(d); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hv[p] <= hv[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]]; [hv[p], hv[c]] = [hv[c], hv[p]]; c = p; } };
      const pop = () => { const n = hk[0], ln = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = ln; hv[0] = lv; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < hk.length && hv[l] < hv[m]) m = l; if (r < hk.length && hv[r] < hv[m]) m = r; if (m === c) break; [hk[m], hk[c]] = [hk[c], hk[m]]; [hv[m], hv[c]] = [hv[c], hv[m]]; c = m; } } return n; };
      dist[c0] = 0; push(c0, 0);
      while (hk.length) {
        const n = pop(); if (done[n]) continue; done[n] = 1; const t = dist[n], ni = n % N, nj = Math.floor(n / N);
        if (t > H) continue;
        for (const [di, dj, w] of nb) {
          const i = ni + di, j = nj + dj; if (i < 0 || i >= N || j < 0 || j >= N) continue; const m = j * N + i; if (done[m]) continue;
          if (n === c0) { const a = Math.atan2(dj, di); if (Math.abs(wrap(a - ang)) > rad(V.V41_FIRST)) continue; }   // the first step must be roughly ahead
          if (clear[m] < MARGIN) continue;
          const step = w * CELL / v, ta = t + step; if (ta + V.V41_SAFETY >= tr[m]) continue;           // the enemy gets there first
          const cost = ta + (clear[m] < MARGIN + 40 ? (MARGIN + 40 - clear[m]) / 40 * V.V41_HUG : 0);    // hugging walls costs time
          if (cost < dist[m]) { dist[m] = cost; prev[m] = n; push(m, cost); }
        }
      }
      return {dist, prev, v};
    };
    const R1 = run(cs), R2 = canBoost ? run(vb) : null;
    { let reach = 0, blockedC = 0, blockedT = 0; for (let i = 0; i < NN; i++) { if (R1.dist[i] < 1e9) reach++; if (clear[i] < MARGIN) blockedC++; if (tr[i] < 3) blockedT++; } this.v4dbg = {reach, blockedC, blockedT, NN, cs, vb, c0clear: clear[c0], c0tr: tr[c0]}; }
    // ---- goal: cheapest exit cell on the open ring (food along the way as a bonus); else the reachable cell with the best margin ----
    const pathOf = (Rr, g) => { const p = []; for (let n = g; n !== -1; n = Rr.prev[n]) p.push(n); return p.reverse(); };
    const score = (Rr, g) => { const p = pathOf(Rr, g); let food = 0; for (const n of p) food += fm[n]; return {p, val: food * V.V41_FOODW - Rr.dist[g] * V.V41_TIMEW - (Rr.v > cs ? V.V2_BCOST * .5 : 0)}; };
    let best = null, mode = 'v41', exits = 0;
    const consider = (Rr, g) => { const sc_ = score(Rr, g); const keep = this.v41goal !== null && g === this.v41goal.cell && Rr.v === this.v41goal.v; sc_.val += keep ? V.V41_HYST : 0; if (best === null || sc_.val > best.val) best = {cell: g, v: Rr.v, path: sc_.p, val: sc_.val, t: Rr.dist[g]}; };
    for (const Rr of [R1, R2]) if (Rr) for (let i = 0; i < NN; i++) { if (Rr.dist[i] >= 1e9) continue; if (hypot(cx(i) - px, cy(i) - py) >= V.V41_EDGE) { exits++; consider(Rr, i); } }
    if (best === null) {                        // no exit: survive - the reachable cell with the largest (time wall - arrival) margin, far from walls
      mode = 'v41esc';
      for (const Rr of [R1, R2]) if (Rr) for (let i = 0; i < NN; i++) { if (Rr.dist[i] >= 1e9 || i === c0) continue;
        const val = Math.min(tr[i], H + 1) - Rr.dist[i] + Math.min(clear[i], 80) / 40 + Rr.dist[i] * .5; if (best === null || val > best.val) best = {cell: i, v: Rr.v, path: pathOf(Rr, i), val, t: Rr.dist[i]}; }
    }
    let cmd = ang, boost = false; const plan = [0, px, py, ang, 0], pts = [];
    if (best && best.path.length > 1) {
      this.v41goal = {cell: best.cell, v: best.v}; boost = best.v > cs;
      // waypoints -> trajectory: drop collinear cells, time by cumulative distance at the run speed, heading per segment
      const wp = [[px, py]]; let lastDir = null;
      for (let k = 1; k < best.path.length; k++) { const n = best.path[k], q = best.path[k - 1], dir = (n - q); if (dir !== lastDir || k === best.path.length - 1) { wp.push([cx(n), cy(n)]); lastDir = dir; } else wp[wp.length - 1] = [cx(n), cy(n)]; }
      let t = 0, X = px, Y = py;
      for (let k = 1; k < wp.length; k++) { const [x, y] = wp[k], d = hypot(x - X, y - Y), h = Math.atan2(y - Y, x - X); t += d / best.v; plan.push(t, x, y, h, boost ? 1 : 0); pts.push(x, y); X = x; Y = y; }
      plan[3] = Math.atan2(wp[1][1] - py, wp[1][0] - px);
      cmd = wrap(plan[3]);
    } else { this.v41goal = null; mode = 'v41none'; }
    this.prev = cmd; this.prevBoost = boost; this.v2last = [cmd, boost];
    const trace = {mode, boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: exits, threat: 0, enclosed: 0, wrap: 0, thr: null, eat: best ? r1(best.val) : null, goal: null, thread: null, cov: null, cov_id: null, cov_free: null, esc: null,
      L: s.L, sc: r2(sc), died_near: this.diedNear, kills: this.kills, big: 0, curl: 0, prof: this.profile, onward: null, nh, hold_by: null, sized: 0, guard: null, gforce: 0, gatk: 0, giant: 0, wf: 0, raid: 0, gap: null, squeeze: null,
      ttd: best ? r1(best.t) : null, ttds: r1(clear[c0]), ttdh: null, v2obj: null, arc: 0, chg: 0, cause: null, v3_ms: r1(nowMs() - T0), v3_exits: exits, v3_cert: mode === 'v4' ? 1 : 0};
    this.last = {mode, trace, draw: {chosen: pts, safe: [], pos: new Float64Array(0), N, C2: 0, i: 0, near: [], gaps: [], goal: null, crowdAt: null, wp: null, attacker: null, ro, analysis: null}, plan: plan.length >= 10 ? plan : null};
    return [cmd, boost];
  }

  // V9: current observed capsule walls + heading/speed/time search. No grid
  // polyline is ever labelled an escape: only swept, drivable rollouts are drawn.
  v9World(s) {
    const V = this.values, ro = R * s.sc, margin = V.V9_MARGIN ?? 5, obs = V.V9_OBS ?? 1200;
    const walls = [], bins = new Map(), cell = 96;
    const pointD = (x, y, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay, f = clip(((x - ax) * dx + (y - ay) * dy) / Math.max(1e-12, dx * dx + dy * dy), 0, 1);
      return hypot(x - ax - f * dx, y - ay - f * dy);
    };
    const segmentD = (ax, ay, bx, by, cx, cy, dx, dy) => {
      const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy, den = ux * vy - uy * vx;
      if (Math.abs(den) > 1e-10) {
        const wx = cx - ax, wy = cy - ay, t = (wx * vy - wy * vx) / den, u = (wx * uy - wy * ux) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
      }
      return Math.min(pointD(ax, ay, cx, cy, dx, dy), pointD(bx, by, cx, cy, dx, dy), pointD(cx, cy, ax, ay, bx, by), pointD(dx, dy, ax, ay, bx, by));
    };
    for (let i = 0; i + 4 < s.segs.length; i += 5) {
      const a = Array.from(s.segs.slice(i, i + 5)); if (!a.every(Number.isFinite) || a[4] < 0) continue;
      // Use at least the rendered physical radius; negative calibration must not
      // make a displayed V9 escape line cut through a visible body.
      a[4] = Math.max(a[4], a[4] + this.P.bodyOff(a[4]));
      const pad = a[4] + ro + margin + 130, id = walls.length; walls.push(a);
      const x0 = Math.max(s.x - obs - 2, Math.min(a[0], a[2]) - pad), x1 = Math.min(s.x + obs + 2, Math.max(a[0], a[2]) + pad);
      const y0 = Math.max(s.y - obs - 2, Math.min(a[1], a[3]) - pad), y1 = Math.min(s.y + obs + 2, Math.max(a[1], a[3]) + pad);
      for (let x = Math.floor(x0 / cell); x <= Math.floor(x1 / cell); x++) for (let y = Math.floor(y0 / cell); y <= Math.floor(y1 / cell); y++) {
        const key = x + ',' + y; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(id);
      }
    }
    const heads = [];
    for (let i = 0; i + 4 < s.heads.length; i += 5) {
      const [x, y, h, sp, sc] = s.heads.slice(i, i + 5); if (![x, y, h, sp, sc].every(Number.isFinite)) continue;
      heads.push({x, y, vx: Math.cos(h) * sp * PX_PER_SP, vy: Math.sin(h) * sp * PX_PER_SP, r: R * sc});
    }
    const check = (a, b, t0 = 0, t1 = t0, pad = 0, dynamic = true) => {
      let gap = Math.min(128, obs - Math.max(hypot(a.x - s.x, a.y - s.y), hypot(b.x - s.x, b.y - s.y)) - pad);
      gap = Math.min(gap, s.wall[2] - Math.max(hypot(a.x - s.wall[0], a.y - s.wall[1]), hypot(b.x - s.wall[0], b.y - s.wall[1])) - ro - margin - pad);
      if (gap < 0) return gap;
      const seen = new Set();
      for (let x = Math.floor((Math.min(a.x, b.x) - pad) / cell); x <= Math.floor((Math.max(a.x, b.x) + pad) / cell); x++)
        for (let y = Math.floor((Math.min(a.y, b.y) - pad) / cell); y <= Math.floor((Math.max(a.y, b.y) + pad) / cell); y++)
          for (const id of bins.get(x + ',' + y) || []) if (!seen.has(id)) {
            seen.add(id); const w = walls[id];
            gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, w[0], w[1], w[2], w[3]) - w[4] - ro - margin - pad);
            if (gap < 0) return gap;
          }
      if (dynamic) for (const h of heads) {
        // Forecast only, not a guarantee of enemy intent. Rechecked every tick.
        const ax = a.x - h.x - h.vx * t0, ay = a.y - h.y - h.vy * t0, bx = b.x - h.x - h.vx * t1, by = b.y - h.y - h.vy * t1;
        const uncertainty = (V.V9_HEAD_PAD ?? 20) * Math.min(t1, 3);
        gap = Math.min(gap, pointD(0, 0, ax, ay, bx, by) - ro - h.r - margin - pad - uncertainty);
        // The moving head leaves a new body wall behind it during this forecast.
        gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, h.x, h.y, h.x + h.vx * t1, h.y + h.vy * t1) - ro - h.r - margin - pad - uncertainty);
        if (gap < 0) return gap;
      }
      return gap;
    };
    return {ro, obs, margin, walls, check};
  }
  v9Roll(s, W, ph, start, turn, duration, t0, target = null, boost = false) {
    let st = {...start}, t = t0, clear = Infinity; const pts = [], end = t0 + duration;
    while (t < end - 1e-8) {
      const dt = Math.min(.04, end - t), next = this.v4Adv(st, target === null ? st.h + turn * ph.w * dt : target, boost, dt, ph);
      const pad = Math.max(st.v, next.v) * dt * Math.abs(wrap(next.h - st.h)) / 8 + .15;
      const g = W.check(st, next, t, t + dt, pad); if (g < 0) return {ok: false, st, t, pts, clear: Math.min(clear, g)};
      clear = Math.min(clear, g); t += dt; st = next; pts.push(t, st.x, st.y, st.h, boost ? 1 : 0);
    }
    return {ok: true, st, t, pts, clear};
  }
  v9Root(s, W, ph) {
    const start = {x: s.x, y: s.y, h: s.ang, v: s.sp * PX_PER_SP};
    const lat = Math.max(0, this.values.TRACK_LAT ?? .17), cmd = Number.isFinite(s.cmdNow) ? s.cmdNow : s.ang;
    // Replay commands already in flight. Treating the last sent command as
    // active for the whole latency interval falsely promises an earlier turn.
    const history = s.cmdHistory || [], pts = [0, s.x, s.y, s.ang, s.boostNow ? 1 : 0];
    let st = start, t = 0, clear = Infinity;
    while (t < lat - 1e-8) {
      const stamp = s.t + t - lat; let active = {ang: cmd, boost: !!s.boostNow};
      if (history.length) { active = history[0]; for (const q of history) { if (q.t > stamp + 1e-8) break; active = q; } }
      const next = history.find(q => q.t > stamp + 1e-8), duration = Math.min(.04, lat - t, next ? next.t - stamp : Infinity);
      const r = this.v9Roll(s, W, ph, st, 0, duration, t, active.ang, !!active.boost);
      pts.push(...r.pts); clear = Math.min(clear, r.clear); st = r.st; t = r.t;
      if (!r.ok) return {...r, pts, clear};
    }
    return {ok: true, st, t, pts, clear};
  }
  v9FoodGoals(s, enabled = this.values.V9_FOOD_W ?? 2) {
    const V = this.values, bins = new Map(), cell = V.V9_HEAP_SIZE ?? 160;
    if (!enabled) { this.v9FoodTarget = null; return []; }
    for (let i = 0; i + 2 < (s.food || []).length; i += 3) {
      const [x,y,m] = s.food.slice(i,i+3), d = hypot(x-s.x,y-s.y);
      if (![x,y,m].every(Number.isFinite) || m < (V.V9_REMAINS_MIN ?? 12) || d > (V.V9_FOOD_R ?? 3000) || d < R*s.sc*.6) continue;
      const key = Math.floor(x/cell)+','+Math.floor(y/cell);
      if (!bins.has(key)) bins.set(key,{mass:0,points:[],sx:0,sy:0});
      const g=bins.get(key);g.mass+=m;g.sx+=x*m;g.sy+=y*m;g.points.push([x,y]);
    }
    const goals = [...bins.values()].map(g=>{
      const cx=g.sx/g.mass,cy=g.sy/g.mass;
      // Target a real pellet, not a centroid that could lie inside an enemy wall.
      g.points.sort((a,b)=>hypot(a[0]-cx,a[1]-cy)-hypot(b[0]-cx,b[1]-cy));
      const [x,y]=g.points[0],d=hypot(x-s.x,y-s.y);
      return {x,y,mass:g.mass,d,score:g.mass/(d+180)};
    }).sort((a,b)=>b.score-a.score);
    const prev=this.v9FoodTarget, old=prev && goals.find(g=>hypot(g.x-prev.x,g.y-prev.y)<cell*.8);
    if(old && s.t-prev.since<(V.V9_TARGET_HOLD ?? 1.2) && goals[0].score<old.score*1.5) {
      goals.splice(goals.indexOf(old),1);goals.unshift(old);old.since=prev.since;
    }
    if(goals.length) { goals[0].since ??= s.t;this.v9FoodTarget=goals[0]; } else this.v9FoodTarget=null;
    return goals;
  }
  v9Route(s, ver) {
    TURN_FIX = !!this.values.TURN_FIX;
    const V = this.values, now = () => performance.now(), started = now(), budget = V.V9_BUDGET ?? 90;
    const W = this.v9World(s), ph = this.v4Physics(s.sc), root = this.v9Root(s, W, ph), edge = Math.min(V.V9_EDGE ?? 900, W.obs - 80);
    const foodGoals = this.v9FoodGoals(s), foodTarget = foodGoals[0] || null;
    const routes = [], C = 32, N = 2 * Math.ceil(W.obs / C) + 1, ox = s.x - (N >> 1) * C, oy = s.y - (N >> 1) * C;
    const grid = new Uint8Array(N * N), xy = i => ({x: ox + (i % N) * C, y: oy + Math.floor(i / N) * C});
    const idx = (x, y) => { const i = Math.round((x - ox) / C), j = Math.round((y - oy) / C); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };
    const result = (reason, expanded = 0) => ({algo: 'v9', ver, t0: s.t, routes, reason, foodTarget, certified: routes.length ? 1 : 0,
      // Map belongs to this observation, never accumulated stale moving bodies.
      map: {ox, oy, cell: C, n: N, blocked: Array.from(grid)}, expanded, ms: now() - started});
    if (!root.ok) return result('latency_blocked');
    // Cell centres are for topology/heuristics only. Swept capsules below are
    // authoritative, including all segments between the displayed path points.
    for (let i = 0; i < grid.length; i++) {
      const q = xy(i); grid[i] = W.check(q, q, 0, 0, 0, false) < 0 ? 1 : 0;
      if ((i & 127) === 0 && now() - started > budget) return result('map_budget');
    }
    const neighbors = i => { const out = [], x = i % N, y = Math.floor(i / N);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= N || y + dy < 0 || y + dy >= N) continue;
        const j = i + dx + dy * N; if (grid[j] || (dx && dy && (grid[i + dx] || grid[i + dy * N]))) continue; out.push(j);
      } return out;
    };
    const startCell = idx(root.st.x, root.st.y); if (startCell < 0) return result('outside');
    // The rounded cell centre can be blocked while the exact root is free;
    // swept rollout validation decides whether the snake can leave the root.
    grid[startCell] = 0;
    const sector = q => (Math.floor((wrap(Math.atan2(q.y - s.y, q.x - s.x) - s.ang) + Math.PI / 8 + TAU) / (Math.PI / 4)) % 8);
    const goals = Array.from({length: 8}, () => []), distance = new Int32Array(grid.length).fill(-1), queue = [startCell]; distance[startCell] = 0;
    for (let qi = 0; qi < queue.length; qi++) {
      const i = queue[qi], q = xy(i), radial = hypot(q.x - s.x, q.y - s.y);
      if (radial >= edge && radial <= edge + C * 1.5) goals[sector(q)].push(i);
      for (const j of neighbors(i)) if (distance[j] < 0) { distance[j] = distance[i] + 1; queue.push(j); }
    }
    const centerDistance=hypot(s.x-s.wall[0],s.y-s.wall[1]);
    const preference = q => {
      const food = foodTarget ? (foodTarget.d-hypot(q.x-foodTarget.x,q.y-foodTarget.y))/edge : 0;
      const center = (centerDistance-hypot(q.x-s.wall[0],q.y-s.wall[1]))/edge * clip((centerDistance-2000)/2000,0,1);
      return (V.V9_FOOD_W ?? 2)*food*20+(V.V9_CENTER_W ?? 2)*center*8;
    };
    const order = goals.map((g,k)=>({k,cells:g,kind:'escape',d:g.length?Math.min(...g.map(i=>distance[i]))+Math.min(k,8-k)*2-Math.max(...g.map(i=>preference(xy(i)))):Infinity}))
      .filter(g=>Number.isFinite(g.d)).sort((a,b)=>a.d-b.d);
    // Food within the observed map gets an exact target; distant food biases
    // reachable exits only. Never certify the unobserved leg to distant food.
    const foodJobs=[];
    for(const target of foodGoals.slice(0,3)) {
      if(target.d>W.obs-80) continue;
      const cells=queue.filter(i=>hypot(xy(i).x-target.x,xy(i).y-target.y)<48);
      if(cells.length) foodJobs.push({kind:'food',target,cells,k:-1,d:-100});
    }
    order.unshift(...foodJobs.slice(0,1));
    if (!order.length) return result('closed_or_narrow');
    let expanded = 0;
    const maxRoutes = Math.round(V.V9_ROUTES ?? 3), H = V.V9_H ?? 8;
    for (const goal of order) {
      if (routes.length >= maxRoutes || now() - started > budget) break;
      const dist = new Int32Array(grid.length).fill(-1), q = [...goal.cells]; for (const i of q) dist[i] = 0;
      for (let qi = 0; qi < q.length; qi++) for (const j of neighbors(q[qi])) if (dist[j] < 0) { dist[j] = dist[q[qi]] + 1; q.push(j); }
      const deadline = Math.min(started + budget, now() + Math.max(10, (started + budget - now()) / Math.max(1, maxRoutes - routes.length)));
      const heap = [], seen = new Map();
      const push = n => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].f <= n.f) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
      const pop = () => { const n = heap[0], last = heap.pop(); if (heap.length) { let i = 0; while (2 * i + 1 < heap.length) { let c = 2 * i + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (heap[c].f >= last.f) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return n; };
      const key = n => [Math.round(n.st.x / 20), Math.round(n.st.y / 20), Math.round(wrap(n.st.h) / (TAU / 32)), Math.round(n.st.v / 30), Math.floor(n.t / .7)].join(',');
      push({st: root.st, t: root.t, parent: null, part: root.pts, action: null, f: 0, turnCost: 0, clear: root.clear});
      let found = null, count = 0;
      // Seed straightforward goals with the same swept physical model. This
      // avoids exhausting search time on equivalent states in an open field.
      const aim=goal.target || xy(goal.cells.reduce((best,i)=>{
        const q=xy(i),b=xy(best),angle=s.ang+goal.k*Math.PI/4;
        return Math.abs(wrap(Math.atan2(q.y-s.y,q.x-s.x)-angle))<Math.abs(wrap(Math.atan2(b.y-s.y,b.x-s.x)-angle))?i:best;
      },goal.cells[0]));
      for(const allowBoost of V.V9_BOOST_ON && (goal.target || foodTarget)?[true,false]:[false]) {
        if(found) break;
        let n={st:root.st,t:root.t,parent:null,part:root.pts,action:null,clear:root.clear};
        for(let k=0;k<100 && n.t<H;k++) {
          const d=hypot(n.st.x-aim.x,n.st.y-aim.y),target=Math.atan2(aim.y-n.st.y,aim.x-n.st.x);
          const reached=goal.kind==='food'?d<=Math.max(20,W.ro*.8):hypot(n.st.x-s.x,n.st.y-s.y)>=edge && sector(n.st)===goal.k;
          if(reached) {
            const tail=goal.kind==='food'?this.v9Roll(s,W,ph,n.st,0,.6,n.t,n.st.h,false):null;
            if(!tail || tail.ok) found=tail?{st:tail.st,t:tail.t,parent:n,part:tail.pts,action:{start:n.t,end:tail.t,target:n.st.h,turn:0,boost:false},clear:Math.min(n.clear,tail.clear)}:n;
            break;
          }
          const f=goal.target || foodTarget,fd=f?hypot(f.x-n.st.x,f.y-n.st.y):0;
          const boost=!!(allowBoost && f && f.mass>=(V.V9_BOOST_MIN_MASS ?? 48) && fd>=(V.V9_BOOST_MIN_DIST ?? 180) && Math.abs(wrap(target-n.st.h))<rad(65) && Math.abs(wrap(Math.atan2(f.y-n.st.y,f.x-n.st.x)-n.st.h))<rad(65));
          const duration=Math.min(.28,H-n.t,Math.max(.04,(d-W.ro*.5)/Math.max(ph.cs,n.st.v)));
          const r=this.v9Roll(s,W,ph,n.st,0,duration,n.t,target,boost);if(!r.ok) break;
          n={st:r.st,t:r.t,parent:n,part:r.pts,action:{start:n.t,end:r.t,target,turn:0,boost},clear:Math.min(n.clear,r.clear)};
        }
      }
      while (!found && heap.length && count++ < 5000) {
        if ((count & 15) === 0 && now() > deadline) break;
        const n = pop(); expanded++;
        const reached = goal.kind==='food' ? hypot(n.st.x-goal.target.x,n.st.y-goal.target.y)<=Math.max(20,W.ro*.8) : hypot(n.st.x-s.x,n.st.y-s.y)>=edge && sector(n.st)===goal.k;
        if (reached) {
          // Keep a checked coast after a food pickup; do not end on a pellet
          // with an untested wall immediately beyond it.
          const tail=goal.kind==='food'?this.v9Roll(s,W,ph,n.st,0,.6,n.t,n.st.h,false):null;
          if(!tail || tail.ok) { found=tail?{st:tail.st,t:tail.t,parent:n,part:tail.pts,action:{start:n.t,end:tail.t,target:n.st.h,turn:0,boost:false},clear:Math.min(n.clear,tail.clear)}:n;break; }
        }
        if (n.t + .28 > H) continue;
        const targetFood=goal.target || foodTarget, fd=targetFood?hypot(targetFood.x-n.st.x,targetFood.y-n.st.y):0;
        const wantsBoost=!!V.V9_BOOST_ON && targetFood && targetFood.mass>=(V.V9_BOOST_MIN_MASS ?? 48) && fd>=(V.V9_BOOST_MIN_DIST ?? 180) && Math.abs(wrap(Math.atan2(targetFood.y-n.st.y,targetFood.x-n.st.x)-n.st.h))<rad(65);
        for (const boost of wantsBoost?[true,false]:[false]) for (const turn of [0, -.5, .5, -1, 1]) {
          const target = n.st.h + turn * ph.w * .28;
          const r = this.v9Roll(s, W, ph, n.st, turn, .28, n.t, target, boost); if (!r.ok) continue;
          const cell = idx(r.st.x, r.st.y); if (cell < 0 || dist[cell] < 0) continue;
          const child = {st: r.st, t: r.t, parent: n, part: r.pts, action: {start: n.t, end: r.t, turn, target, boost}, turnCost: n.turnCost + Math.abs(turn) * .08, clear: Math.min(n.clear, r.clear)};
          const cost = r.t + child.turnCost + (H - Math.min(H, r.clear / 30)) * .01, k = key(child); if ((seen.get(k) ?? Infinity) <= cost) continue;
          seen.set(k, cost); child.f = cost + dist[cell] * C / ph.cs * 1.4; push(child);
        }
      }
      if (found) {
        const nodes = []; for (let n = found; n; n = n.parent) nodes.push(n); nodes.reverse();
        const pts = nodes.flatMap(n => n.part), actions = nodes.map(n => n.action).filter(Boolean);
        // Different exit sectors; reject almost identical exits near a sector seam.
        const endAngle = Math.atan2(found.st.y - s.y, found.st.x - s.x);
        if (goal.kind==='food' || !routes.some(r => r.kind!=='food' && Math.abs(wrap(r.angle - endAngle)) < rad(25))) routes.push({pts, actions, kind:goal.kind, target:goal.target || foodTarget, angle: endAngle, clear: found.clear, duration: found.t, goal: [found.st.x, found.st.y]});
      }
    }
    return result(routes.length ? 'observed_exit' : (now() - started >= budget ? 'search_budget' : 'no_drivable_route'), expanded);
  }
  v9Step(s) {
    TURN_FIX = !!this.values.TURN_FIX;
    const started = performance.now(), V = this.values, W = this.v9World(s), ph = this.v4Physics(s.sc), root = this.v9Root(s, W, ph);
    const source = s.route?.algo === 'v9' ? s.route : null, age = source ? s.t - source.t0 : Infinity, valid = [];
    const foods=this.v9FoodGoals(s), target=foods[0] || null;
    const hasFood=t=>t && foods.some(f=>hypot(f.x-t.x,f.y-t.y)<(V.V9_HEAP_SIZE ?? 160));
    let reason = !source ? 'none' : age < 0 || age > (V.V9_ROUTE_AGE ?? .65) ? 'old' : source.reason;
    if (root.ok && source && age >= 0 && age <= (V.V9_ROUTE_AGE ?? .65)) for (const route of source.routes || []) {
      if (route.kind==='food' && !hasFood(route.target)) continue;
      if (route.actions.some(a=>a.boost) && (!V.V9_BOOST_ON || !hasFood(route.target))) continue;
      let st = root.st, t = root.t, pts = [...root.pts], controls = [], clear = root.clear, ok = true;
      // Rebase every candidate to the current head/heading/speed and recheck its
      // ENTIRE remaining route on the fresh map, rather than snapping to old lines.
      for (const a of route.actions) {
        const until = a.end - age; if (until <= t + 1e-8) continue;
        const r = this.v9Roll(s, W, ph, st, a.turn, until - t, t, a.target, !!a.boost);
        controls.push({start: t, end: until, target: a.target, boost:!!a.boost});
        if (!r.ok) { ok = false; break; } pts.push(...r.pts); st = r.st; t = r.t; clear = Math.min(clear, r.clear);
      }
      const radial = hypot(st.x - s.x, st.y - s.y), edge = Math.min(V.V9_EDGE ?? 900, W.obs - 80);
      let foodReached=false;
      if(route.kind==='food') for(let i=0;i<pts.length;i+=5) if(hypot(pts[i+1]-route.target.x,pts[i+2]-route.target.y)<=Math.max(24,W.ro)) {foodReached=true;break;}
      if (ok && (route.kind==='food' ? foodReached : radial >= edge - ph.cs * (V.V9_ROUTE_AGE ?? .65)) && t > root.t + .1) valid.push({pts, controls, clear, end: st, duration: t, kind:route.kind || 'escape', target:route.target});
    }
    if (source?.routes?.length && !valid.length && reason !== 'old') reason = 'changed';
    const score = r => {
      let progress=0;
      if(target) { let closest=target.d;for(let i=0;i<r.pts.length;i+=5) closest=Math.min(closest,hypot(r.pts[i+1]-target.x,r.pts[i+2]-target.y));progress=(target.d-closest)/Math.max(180,target.d); }
      const centerD=hypot(s.x-s.wall[0],s.y-s.wall[1]),center=(centerD-hypot(r.end.x-s.wall[0],r.end.y-s.wall[1]))/Math.max(300,V.V9_EDGE ?? 900)*clip((centerD-2000)/2000,0,1);
      return (V.V9_FOOD_W ?? 2)*progress*10+(V.V9_CENTER_W ?? 2)*center - (target ? r.duration*.08 : 0);
    };
    valid.sort((a,b)=>score(b)-score(a));
    let selected = valid[0], unsafe = false;
    if (!selected) {
      let best = null;
      // No full exit: only short collision-checked motion, never drawn as an exit.
      for (const turn of [0, -.5, .5, -1, 1]) {
        const target = root.st.h + turn * ph.w;
        const r = root.ok ? this.v9Roll(s, W, ph, root.st, turn, 1, root.t, target) : root;
        const score = r.t * 1000 + Math.min(r.clear, 100) - Math.abs(turn) * 2;
        if (!best || score > best.score) best = {...r, score, target};
      }
      selected = {pts: root.ok ? [...root.pts, ...best.pts] : root.pts, controls: [{start: root.t, end: best.t, target: best.target}], clear: best.clear}; unsafe = !best.ok;
    }
    const P = selected.pts, plan = P.length >= 10 ? P : null;
    let k = 0; if (plan) while (k + 5 < P.length && P[k] < (V.TRACK_LAT ?? .17) + .08) k += 5;
    const cmd = selected.controls?.[0]?.target ?? (plan ? P[k + 3] : s.ang), flat = p => { const a = []; for (let i = 0; i + 4 < p.length; i += 5) a.push(p[i + 1], p[i + 2]); return a; };
    const trace = {mode: valid.length ? (selected.kind==='food'?'v9food':target?'v9seek':'v9escape') : unsafe ? 'v9blocked' : 'v9local', boost: !!selected.controls?.[0]?.boost, cmd: r1(deg(cmd)), n_safe: valid.length,
      cause: reason, v9_routes: valid.length, v9_reason: reason, v9_clear: r1(selected.clear), v9_plan_ms: source?.ms ?? 0,
      v3_route_match: valid.length ? 1 : 0, v3_cert: valid.length ? 1 : 0, v6_intent: selected.kind==='food'?'food':target?'seek':'escape', v9_goal_x:target?.x, v9_goal_y:target?.y, v9_goal_mass:target?.mass || 0, L: s.L, sc: s.sc};
    this.last = {trace, mode: trace.mode, plan, controls: selected.controls, draw: {chosen: flat(P), localPath: flat(P.slice(0, 5 * 32)), mazePath: [],
      v9FoodPath: selected.kind==='food', v9At: s.t, v9Paths: valid.map(r => flat(r.pts)), v9Walls: W.walls, v9Map: source && age <= (V.V9_ROUTE_AGE ?? .65) ? source.map : null,
      v9Reason: reason, localUnsafe: unsafe, safe: [], near: [], gaps: [], goal: target ? [target.x,target.y] : null, ro: W.ro}};
    this.prev = cmd; this.prevBoost = trace.boost; return [cmd, trace.boost];
  }

  // V10 contracts: static geometric guides != time-validated local trajectories.
  // Three independent workers; only the fast worker returns actuator commands.
  v10World(s, local = false) {
    const V=this.values, radius=local?620:Math.max(V.V10_OBS??1800,s.viewRadius??0);
    const segs=[],sid=[];
    for(let i=0;i<s.segs.length;i+=5){const a=s.segs;
      if(Math.min(a[i],a[i+2])-a[i+4]>s.x+radius || Math.max(a[i],a[i+2])+a[i+4]<s.x-radius || Math.min(a[i+1],a[i+3])-a[i+4]>s.y+radius || Math.max(a[i+1],a[i+3])+a[i+4]<s.y-radius)continue;
      segs.push(...a.slice(i,i+5));sid.push(s.sid?.[i/5]);
    }
    const saved=this.values,savedP=this.P;
    this.P={...this.P,bodyOff:()=>0};
    this.values={...V,V9_OBS:radius,V9_MARGIN:V.V10_MARGIN??3};
    // Uncertain last-alive probe points do not justify subtracting a fitted death
    // offset. Use visible radii + explicit margin; retain raw calibration data.
    let W;try{W=this.v9World({...s,segs,sid,heads:[]});}finally{this.values=saved;this.P=savedP;}
    const staticCheck=W.check,headList=[];
    for(let i=0;i<s.heads.length;i+=5){const [x,y,h,sp,sc]=s.heads.slice(i,i+5);
      if(hypot(x-s.x,y-s.y)>radius+550)continue;
      const hist=s.threat?.heads?.find(q=>q.id===s.hid?.[i/5]);
      const target=s.headTargets?.find(q=>q.id===s.hid?.[i/5]);
      headList.push({x,y,h,v:sp*PX_PER_SP,r:R*sc,w:hist?.w??0,target:Number.isFinite(target?.target)?target.target:null,rate:this.v4Physics(sc).w});
    }
    const pointD=(ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,u=clip(-(ax*dx+ay*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);return hypot(ax+u*dx,ay+u*dy);};
    const predict=(h,t,boost)=>{
      const key=Math.round(t*100000)+(boost?10000000:0);h.cache??=new Map();if(h.cache.has(key))return h.cache.get(key);
      const v=boost?Math.max(h.v,BOOST_SP*PX_PER_SP):h.v;
      // Follow the currently received target heading, then stop turning as
      // the client does. Future target changes remain unknown; retain padding.
      const delta=h.target===null?null:wrap(h.target-h.h),w=delta===null?clip(h.w,-2,2):Math.sign(delta)*h.rate;
      const turn=delta===null?t:Math.min(t,Math.abs(delta)/Math.max(1e-6,h.rate));
      const a=h.h+w*turn/2,d=Math.abs(w*turn)>1e-8?v*turn*Math.sin(w*turn/2)/(w*turn/2):v*turn;
      const tail=v*(t-turn),heading=h.h+w*turn;
      const p={x:h.x+Math.cos(a)*d+Math.cos(heading)*tail,y:h.y+Math.sin(a)*d+Math.sin(heading)*tail};h.cache.set(key,p);return p;
    };
    W.check=(a,b,t0=0,t1=t0,pad=0,dynamic=true)=>{
      let gap=staticCheck(a,b,t0,t1,pad,false);if(gap<0||!dynamic)return gap;
      for(const h of headList){
        if(hypot(a.x-h.x,a.y-h.y)>434*t1+W.ro+h.r+W.margin+pad+40+hypot(b.x-a.x,b.y-a.y))continue;
        for(const boost of [false,true]){
        const p=predict(h,t0,boost),q=predict(h,t1,boost),unc=(V.V10_HEAD_PAD??12)*Math.min(t1,1.5)+(V.V10_HEAD_UNCERT??1)*interp(Math.min(t1,.35),[0,.1,.2,.3,.4],[0,9,21,39,68]);
        // Cycle4 calibration p95 residuals, rounded upward. Only the near-term
        // command window uses this envelope; longer predictions remain provisional.
        const g=pointD(a.x-p.x,a.y-p.y,b.x-q.x,b.y-q.y)-W.ro-h.r-W.margin-pad-unc;
        gap=Math.min(gap,g);if(gap<0)return gap;
        // Newly laid body is occupied up to arrival time, never a permanent
        // whole-horizon cone. Approximate curved trail with short swept chords.
        for(let t=0;t<t1;t+=.2){const u=predict(h,t,boost),v=predict(h,Math.min(t+.2,t1),boost);
          const dx=v.x-u.x,dy=v.y-u.y;
          const near=p=>{const f=clip(((p.x-u.x)*dx+(p.y-u.y)*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);return hypot(p.x-u.x-f*dx,p.y-u.y-f*dy);};
          const ex=b.x-a.x,ey=b.y-a.y,den=ex*dy-ey*dx;
          let distance=Math.min(near(a),near(b),pointD(a.x-u.x,a.y-u.y,b.x-u.x,b.y-u.y),pointD(a.x-v.x,a.y-v.y,b.x-v.x,b.y-v.y));
          if(Math.abs(den)>1e-9){const rx=u.x-a.x,ry=u.y-a.y,ta=(rx*dy-ry*dx)/den,tb=(rx*ey-ry*ex)/den;if(ta>=0&&ta<=1&&tb>=0&&tb<=1)distance=0;}
          gap=Math.min(gap,distance-W.ro-h.r-W.margin-pad-unc-Math.max(h.v,434)*.2*Math.abs(h.w)*.2/8);
          if(gap<0)return gap;
        }
      }}return gap;
    };
    return W;
  }
  v10Threat(s,ver=0){
    const t0=performance.now(),previous=this.v10History,heads=[],sectors=new Set();let awayX=0,awayY=0,attack=0,tailX=0,tailY=0;
    for(let i=0;i<s.heads.length;i+=5){const [x,y,h,sp,sc]=s.heads.slice(i,i+5),id=s.hid?.[i/5],dx=s.x-x,dy=s.y-y,d=hypot(dx,dy),old=previous?.heads.find(q=>q.id===id),dt=previous?s.t-previous.t0:0;
      const w=old&&dt>.01&&dt<1?wrap(h-old.h)/dt:0,v=sp*PX_PER_SP;
      const toward=(dx*Math.cos(h)+dy*Math.sin(h))/Math.max(1,d),score=toward>.4?clip((700-d)/700,0,1)*toward:0;
      attack=Math.max(attack,score);awayX+=dx/Math.max(1,d)*score;awayY+=dy/Math.max(1,d)*score;
      // Prefer the direction behind a threatening head. This does not assume
      // that a truncated observed body endpoint is the actual tail.
      tailX-=Math.cos(h)*score;tailY-=Math.sin(h)*score;
      heads.push({id,x,y,h,v,w,score});
    }
    let left=Infinity,right=Infinity,minGap=Infinity,bodyAwayX=0,bodyAwayY=0;
    for(let i=0;i<s.segs.length;i+=5){const gap=segDist(s.x,s.y,s.segs,i/5)-R*s.sc-s.segs[i+4];minGap=Math.min(minGap,gap);
      if(gap>350)continue;
      const ax=s.segs[i]-s.x,ay=s.segs[i+1]-s.y,bx=s.segs[i+2]-s.x,by=s.segs[i+3]-s.y;
      for(let j=0;j<=4;j++){const a=Math.atan2(ay+(by-ay)*j/4,ax+(bx-ax)*j/4);sectors.add(Math.floor((a+PI)*24/TAU)%24);}
      const md=hypot(ax+bx,ay+by);bodyAwayX-=(ax+bx)/Math.max(1,md)/(Math.max(0,gap)+30);bodyAwayY-=(ay+by)/Math.max(1,md)/(Math.max(0,gap)+30);
      const a=wrap(Math.atan2(ay+by,ax+bx)-s.ang);if(Math.abs(a)<2.5){if(a<0)left=Math.min(left,gap);else right=Math.min(right,gap);}
    }
    const coverage=sectors.size/24,wall=s.wall[2]-hypot(s.x-s.wall[0],s.y-s.wall[1])-R*s.sc;
    const corridor=left<100&&right<100,width=left+right,closing=previous&&Number.isFinite(width)&&Number.isFinite(previous.width)&&s.t-previous.t0<1?(previous.width-width)/Math.max(.02,s.t-previous.t0):0;
    let strategy=wall<160?'arena':attack>.22?'intercept':coverage>.6?'wrap':corridor?'corridor':minGap<80?'body':'cruise';
    const threat={t0:s.t,ver,heads,attack,coverage,width,gap:minGap,closing,strategy,away:Math.atan2(awayY+bodyAwayY,awayX+bodyAwayX),tail:Math.atan2(tailY,tailX),ms:performance.now()-t0};
    this.v10History=threat;return threat;
  }
  // V10 long probes share one geometry/physics model with the actuator.
  // Risk is a reachability index, not an empirically calibrated probability.
  v10ProbeWorld(W) {
    const near = 1.2;
    return {...W, check:(a,b,t0=0,t1=t0,pad=0)=>{
      const gap=W.check(a,b,t0,t1,pad,false);
      if(gap<0||t0>=near)return gap;
      const end=Math.min(t1,near),f=t1>t0?(end-t0)/(t1-t0):1;
      return Math.min(gap,W.check(a,{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f},t0,end,pad,true));
    }};
  }
  v10Blockers(s,W) {
    const heads=[];
    for(let i=0;i<s.heads.length;i+=5){
      const [x,y,h,sp,sc]=s.heads.slice(i,i+5),ph=this.v4Physics(sc);
      if(![x,y,h,sp,sc].every(Number.isFinite))continue;
      heads.push({id:s.hid?.[i/5]??i/5,x,y,h,v:Math.max(ph.vb,sp*PX_PER_SP),v0:sp*PX_PER_SP,rate:ph.rate,w:ph.w,r:R*sc+W.ro+W.margin+(this.values.V10_HEAD_PAD??12)});
    }return heads;
  }
  v10EarliestBlock(head,a,b,pad=0) {
    // A disk encloses the entire swept chord. Maximum progress towards its
    // centre is integrated under the turn-rate bound. Instant maximum speed,
    // optional stopping, and ignored enemy obstacles enlarge the reachable set:
    // this is a LOWER bound on interception time, never a guaranteed attack.
    const x=(a.x+b.x)/2-head.x,y=(a.y+b.y)/2-head.y;
    const d=Math.max(0,hypot(x,y)-head.r-hypot(b.x-a.x,b.y-a.y)/2-pad);
    if(d===0)return 0;
    const angle=Math.abs(wrap(Math.atan2(y,x)-head.h)),w=Math.max(1e-6,head.w),v=head.v;
    const beta=Math.min(angle,PI/2),delay=Math.max(0,(angle-PI/2)/w),arc=v*Math.sin(beta)/w;
    const turnBound=d<arc?delay+(beta-Math.asin(clip(Math.sin(beta)-d*w/v,-1,1)))/w:angle/w+(d-arc)/v;
    const v0=head.v0??v,rate=Math.max(1e-6,head.rate??1),ramp=Math.max(0,(v-v0)/rate),rampDistance=(v0+v)*ramp/2;
    const speedBound=d<=rampDistance?(-v0+Math.sqrt(v0*v0+2*rate*d))/rate:ramp+(d-rampDistance)/v;
    return Math.max(turnBound,speedBound);
  }
  v10Closure(pts,heads) {
    let slack=Infinity,exposure=0,weight=0,first=Infinity,enemy=null;const segments=[];
    // Group only a few points; enclosing radius includes every curve vertex,
    // so no narrow interception between sampled endpoints is skipped.
    for(let i=0;i+5<pts.length;){
      let j=i+5;while(j+5<pts.length&&pts[j+5]-pts[i]<=.16)j+=5;
      const a={x:pts[i+1],y:pts[i+2]},b={x:pts[j+1],y:pts[j+2]},mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      let radius=hypot(b.x-a.x,b.y-a.y)/2;
      for(let k=i;k<=j;k+=5)radius=Math.max(radius,hypot(pts[k+1]-mx,pts[k+2]-my));
      const pad=radius-hypot(b.x-a.x,b.y-a.y)/2+1;let earliest=Infinity,id=null;
      for(const head of heads){const t=this.v10EarliestBlock(head,a,b,pad);if(t<earliest){earliest=t;id=head.id;}}
      const margin=earliest-pts[j]-.1,dt=pts[j]-pts[i],wt=dt/(1+pts[j]);
      if(margin<slack){slack=margin;enemy=id;}
      if(margin<=0)first=Math.min(first,pts[i]);
      exposure+=wt*clip(-margin/.6,0,1);weight+=wt;
      segments.push({t:pts[j],blockAt:Number.isFinite(earliest)?earliest:null,slack:Number.isFinite(margin)?margin:null,enemy:id});i=j;
    }
    return {risk:weight?exposure/weight:0,slack:Number.isFinite(slack)?slack:null,first:Number.isFinite(first)?first:null,enemy,certified:slack>0,scope:'observed_heads_turn_speed_bounds',segments};
  }
  // One policy for beam pruning, completed probes and current revalidation.
  // Risk and food value are bounded indices, not calibrated probabilities.
  v10FoodRewards(s,pts,foods,previous=[]) {
    return foods.map((g,k)=>{
      let best=previous[k]||0;
      for(let i=5;i<pts.length;i+=5){
        const ax=pts[i-4],ay=pts[i-3],dx=pts[i+1]-ax,dy=pts[i+2]-ay;
        const u=clip(((g.x-ax)*dx+(g.y-ay)*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);
        const gap=Math.max(0,hypot(g.x-ax-u*dx,g.y-ay-u*dy)-R*s.sc);
        const t=pts[i-5]+u*(pts[i]-pts[i-5]);
        best=Math.max(best,Math.exp(-gap/120)/(1+t/4));
      }
      return best;
    });
  }
  v10FoodValue(foods,rewards) {
    return Math.min(1,foods.reduce((sum,g,k)=>sum+(rewards[k]||0)*g.mass/(g.mass+80),0));
  }
  v10Utility(s,pts,foods,actions=[]) {
    if(pts.length<5)return {centerValue:0,approachValue:0,boostCost:0};
    const end=pts.length-5,x=pts[end+1],y=pts[end+2];
    const radius=hypot(s.x-s.wall[0],s.y-s.wall[1]);
    const centerValue=clip((radius-hypot(x-s.wall[0],y-s.wall[1]))/1500,-1,1)*Math.min(1,radius/3000);
    // Progress towards distant heaps remains valuable before contact. It is
    // measured from the current observation, never accumulated by circling.
    let approachValue=0;
    for(const g of foods){const d=hypot(g.x-s.x,g.y-s.y);let left=d;for(let i=0;i<pts.length;i+=5)left=Math.min(left,hypot(g.x-pts[i+1],g.y-pts[i+2]));
      approachValue=Math.max(approachValue,clip((d-left)/Math.max(300,d),0,1)*g.mass/(g.mass+80));}
    const boostSeconds=actions.reduce((n,a)=>n+(a.boost?Math.max(0,a.end-a.start):0),0);
    return {centerValue:centerValue*(foods.length && (this.values.V10_FOOD_W??2)>0 ? .15 : 1),approachValue,boostCost:this.v10EscapePressure(s)?0:boostSeconds*(this.values.V10_BOOST_COST??0)};
  }
  v10Compare(a,b) {
    const V=this.values,appetite=clip((V.V10_FOOD_RISK??0)/100,0,1);
    const risk=q=>q.closure?.risk??q.risk??0;
    const cost=q=>(8-7*appetite)*risk(q)-(V.V10_FOOD_W??2)*((q.foodValue??0)+.45*(q.approachValue??0))
      -(V.V9_CENTER_W??2)*.08*(q.centerValue??0)+(q.boostCost??0);
    return cost(a)-cost(b)||risk(a)-risk(b)||Number(!!b.closure?.certified)-Number(!!a.closure?.certified)||b.score-a.score;
  }
  // Topology is searched independently of food/risk ranking. A low-scoring
  // turn cannot erase the only connected passage before it has been explored.
  v10MazeGuides(s,W,root,edge,deadline,preferred=null,foodTargets=[],foodDeadline=deadline) {
    const cell=32,n=Math.ceil((edge+160)/cell)*2+1,mid=(n-1)/2,N=n*n;
    const ox=root.st.x-mid*cell,oy=root.st.y-mid*cell,blocked=new Uint8Array(N),clearance=new Float32Array(N).fill(48);
    const at=(i,j)=>j*n+i,point=k=>({x:ox+(k%n)*cell,y:oy+Math.floor(k/n)*cell});
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=ox+i*cell,y=oy+j*cell;
      if(hypot(x-s.x,y-s.y)>W.obs-2||hypot(x-s.wall[0],y-s.wall[1])>s.wall[2]-W.ro-W.margin)blocked[at(i,j)]=1;
    }
    for(const w of W.walls){
      const r=w[4]+W.ro+W.margin+1,band=r+48,dx=w[2]-w[0],dy=w[3]-w[1],ll=dx*dx+dy*dy;
      const i0=Math.max(0,Math.floor((Math.min(w[0],w[2])-band-ox)/cell)),i1=Math.min(n-1,Math.ceil((Math.max(w[0],w[2])+band-ox)/cell));
      const j0=Math.max(0,Math.floor((Math.min(w[1],w[3])-band-oy)/cell)),j1=Math.min(n-1,Math.ceil((Math.max(w[1],w[3])+band-oy)/cell));
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
        const x=ox+i*cell,y=oy+j*cell,u=clip(((x-w[0])*dx+(y-w[1])*dy)/Math.max(1,ll),0,1);
        const gap=hypot(x-w[0]-u*dx,y-w[1]-u*dy)-r;clearance[at(i,j)]=Math.min(clearance[at(i,j)],gap);if(gap<=0)blocked[at(i,j)]=1;
      }
    }
    const start=at(mid,mid),dist=new Float64Array(N).fill(Infinity),parent=new Int32Array(N).fill(-1),heap=[];
    const push=(k,d)=>{let i=heap.length;heap.push([k,d]);while(i){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[k,d];};
    const pop=()=>{const a=heap[0],b=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=b[1])break;heap[i]=heap[c];i=c;}heap[i]=b;}return a;};
    if(blocked[start])return {guides:[],expanded:0,reason:'grid_start_blocked'};
    const priority=(k,d)=>{const p=point(k);return d+.95*Math.max(0,Math.min(edge-hypot(p.x-s.x,p.y-s.y),...(preferred?[hypot(preferred[0]-p.x,preferred[1]-p.y)]:[])));};
    dist[start]=0;push(start,priority(start,0));const exits=new Map(),foodNodes=new Map();let expanded=0;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
    while(heap.length){
      if((expanded&127)===0&&performance.now()>(exits.size?deadline:foodDeadline))break;
      const [k,key]=pop(),d=dist[k];if(Math.abs(key-priority(k,d))>1e-7)continue;expanded++;
      const p=point(k),radial=hypot(p.x-s.x,p.y-s.y);
      for(let f=0;f<foodTargets.length;f++){const g=foodTargets[f];if(!foodNodes.has(f)&&hypot(p.x-g.x,p.y-g.y)<cell*1.5&&W.check(p,g,0,0,.5,false)>=0)foodNodes.set(f,k);}
      if(preferred&&!exits.has('held')&&hypot(p.x-preferred[0],p.y-preferred[1])<cell*1.5&&W.check(p,{x:preferred[0],y:preferred[1]},0,0,.5,false)>=0)exits.set('held',k);
      if(radial>=edge){const sector=Math.floor((Math.atan2(p.y-s.y,p.x-s.x)+PI)*8/TAU)%8;if(!exits.has(sector))exits.set(sector,k);if(exits.size===(preferred?9:8))break;continue;}
      const i=k%n,j=Math.floor(k/n);
      for(const [dx,dy] of dirs){const x=i+dx,y=j+dy;if(x<0||y<0||x>=n||y>=n)continue;const q=at(x,y);if(blocked[q])continue;
        if(dx&&dy&&(blocked[at(i+dx,j)]||blocked[at(i,j+dy)]))continue;
        const nd=d+cell*(dx&&dy?Math.SQRT2:1)*(1+.6*Math.max(0,(32-clearance[q])/32)**2);if(nd>=dist[q])continue;dist[q]=nd;parent[q]=k;push(q,priority(q,nd));
      }
    }
    const guides=[];
    for(const [sector,k] of exits){
      const chain=[];for(let q=k;q>=0;q=parent[q]){chain.push(point(q));if(q===start)break;}chain.reverse();if(sector==='held')chain.push({x:preferred[0],y:preferred[1]});
      // Visibility simplification checks physical capsules, never just pixels.
      const path=[chain[0]];let i=0;
      while(i<chain.length-1){let next=i+1;for(let j=Math.min(chain.length-1,i+20);j>i;j--){if(W.check(chain[i],chain[j],0,0,.5,false)>=0){next=j;break;}}
        if(W.check(chain[i],chain[next],0,0,.5,false)<0){path.length=0;break;}path.push(chain[next]);i=next;}
      if(path.length>1){let length=0;for(let i=1;i<path.length;i++)length+=hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
        const goal=sector==='held'?preferred:[point(k).x,point(k).y];guides.push({path,goal,length,kind:'escape',sector:sector==='held'?Math.floor((Math.atan2(goal[1]-s.y,goal[0]-s.x)+PI)*8/TAU)%8:sector,preferred:sector==='held',lookScale:.65,useBoost:false,score:-length});}
    }
    // A food waypoint is admissible only with a connected continuation to
    // an existing exit. It cannot replace escape search with a dead-end goal.
    const mainHadFrontier=heap.length>0,foodParents=new Map();
    // Food searches share the remaining geometry budget. They cannot consume
    // the time reserved for finding the first escape connection.
    if(guides.length)for(let f=0;f<foodTargets.length;f++){
      if(foodNodes.has(f)||performance.now()>foodDeadline-2)continue;
      const target=foodTargets[f],fd=new Float64Array(N).fill(Infinity),fp=new Int32Array(N).fill(-1);heap.length=0;
      const key=k=>{const p=point(k);return fd[k]+hypot(p.x-target.x,p.y-target.y);};fd[start]=0;push(start,key(start));let steps=0;
      while(heap.length){
        if((steps++&31)===0&&performance.now()>foodDeadline)break;
        const [k,score]=pop();if(Math.abs(score-key(k))>1e-7)continue;const p=point(k);
        if(hypot(p.x-target.x,p.y-target.y)<cell*1.5&&W.check(p,target,0,0,.5,false)>=0){foodNodes.set(f,k);foodParents.set(f,fp);break;}
        const i=k%n,j=Math.floor(k/n);for(const [dx,dy]of dirs){const x=i+dx,y=j+dy;if(x<0||y<0||x>=n||y>=n)continue;const q=at(x,y);if(blocked[q]||dx&&dy&&(blocked[at(i+dx,j)]||blocked[at(i,j+dy)]))continue;
          const nd=fd[k]+cell*(dx&&dy?Math.SQRT2:1)*(1+.6*Math.max(0,(32-clearance[q])/32)**2);if(nd>=fd[q])continue;fd[q]=nd;fp[q]=k;push(q,key(q));}
      }
    }
    const foodGuides=[];
    for(const [f,k] of foodNodes){
      const food=foodTargets[f],chain=[],parents=foodParents.get(f)||parent;for(let q=k;q>=0;q=parents[q]){chain.push(point(q));if(q===start)break;}chain.reverse();chain.push({x:food.x,y:food.y});
      const prefix=[chain[0]];let i=0;
      while(i<chain.length-1){let next=i+1;for(let j=chain.length-1;j>i;j--)if(W.check(chain[i],chain[j],0,0,.5,false)>=0){next=j;break;}if(W.check(chain[i],chain[next],0,0,.5,false)<0){prefix.length=0;break;}prefix.push(chain[next]);i=next;}
      if(prefix.length<2)continue;let best=null;
      for(const exit of guides)for(let j=1;j<exit.path.length;j++){
        if(W.check(food,exit.path[j],0,0,.5,false)<0)continue;
        const path=[...prefix,...exit.path.slice(j)];let length=0;for(let q=1;q<path.length;q++)length+=hypot(path[q].x-path[q-1].x,path[q].y-path[q-1].y);
        if(!best||length<best.length)best={...exit,path,length,kind:'food_escape',preferred:false,foodTarget:food,foodIndex:f,score:-length};
      }
      if(best)foodGuides.push(best);
    }
    guides.push(...foodGuides);
    return {guides,expanded,reason:guides.length?'maze':mainHadFrontier?'grid_budget':'grid_disconnected'};
  }
  v10Choose(routes,heldId) {
    routes.sort((a,b)=>this.v10Compare(a,b));
    const held=routes.find(r=>r.id===heldId),threshold=this.values.V10_SWITCH_RISK??.75;
    if(held){const safer=routes.filter(r=>(r.closure?.risk??1)<(held.closure?.risk??1)-.02).sort((a,b)=>a.closure.risk-b.closure.risk);
      if((held.closure?.risk??1)<=threshold||!safer.length)return held;
      return safer[0];}
    return routes[0];
  }
  v10DefaultBoost(s) { return this.values.V10_BOOST_COST===0 && !!(this.values.V10_ESCAPE_BOOST??1) && s.L>=(this.values.V2_MINL??30); }
  v10EscapePressure(s) {
    const q=s.threat;
    return !!q&&['wrap','corridor','intercept'].includes(q.strategy);
  }
  v10Route(s,ver) {
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const deadline=begin+(V.V10_BUDGET??90),edge=Math.min(Math.max(V.V10_EDGE??1450,(s.viewRadius??0)*.85),W.obs-150);
    const heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3),routes=[];let expanded=0,geometry=0;const failures={};
    const result=reason=>({algo:'v10',ver,t0:s.t,routes,certified:routes.some(r=>r.certified),reason,ms:performance.now()-begin,expanded,geometry,failures,map:{radius:W.obs,target:edge},walls:W.walls});
    if(!root.ok)return result('prefix_collision');
    const accept=(guide,id)=>{
      const boostEligible=(V.V10_ESCAPE_BOOST??1)&&s.L>=(V.V2_MINL??30)&&(this.v10EscapePressure(s)||heads.some(h=>hypot(h.x-s.x,h.y-s.y)<700)||guide.foodTarget?.mass>=(V.V9_BOOST_MIN_MASS??40));
      let r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok&&r.reason!=='budget'&&!guide.useBoost&&boostEligible&&performance.now()<deadline-4){const bg={...guide,useBoost:true},br=this.v10Follow(s,PW,ph,root,bg,deadline);if(br.ok){guide=bg;r=br;}}
      if(!r.ok){failures[r.reason]=(failures[r.reason]||0)+1;return false;}
      let closure=this.v10Closure(r.pts,heads),foodValue=this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods));
      // Speed is a control choice on the same corridor, not a new direction.

      if(!guide.useBoost&&(routes.length===0||this.v10EscapePressure(s))&&boostEligible&&performance.now()<deadline-6){
        const bg={...guide,useBoost:true},br=this.v10Follow(s,PW,ph,root,bg,deadline);
        if(br.ok){const bc=this.v10Closure(br.pts,heads),bf=this.v10FoodValue(foods,this.v10FoodRewards(s,br.pts,foods));
          const current={closure,foodValue,...this.v10Utility(s,r.pts,foods,r.actions),score:0},fast={closure:bc,foodValue:bf,...this.v10Utility(s,br.pts,foods,br.actions),score:0};
          const fasterEscape=this.v10EscapePressure(s)&&br.duration+.13<r.duration&&bc.risk<=closure.risk+.02;
          const arrival=pts=>{const f=guide.foodTarget;if(!f)return Infinity;for(let i=0;i<pts.length;i+=5)if(hypot(pts[i+1]-f.x,pts[i+2]-f.y)<80)return pts[i];return Infinity;};
          const cruiseArrival=arrival(r.pts),boostArrival=arrival(br.pts);
          const fasterFood=!!guide.foodTarget&&boostArrival+.13<cruiseArrival&&bc.risk<=closure.risk+.02&&(fast.boostCost-current.boostCost)<=Math.min(1,(cruiseArrival-boostArrival)/Math.max(.13,cruiseArrival));
          if(fasterEscape||fasterFood||this.v10Compare(fast,current)<-.03){guide=bg;r=br;closure=bc;foodValue=bf;}
        }
      }
      routes.push({...guide,id,t0:s.t,geometryOnly:false,drivable:true,certified:closure.certified,closure,foodValue,...this.v10Utility(s,r.pts,foods,r.actions),pts:r.pts,actions:r.actions,clear:r.clear,duration:r.duration,length:r.travel,score:guide.score??0});return true;
    };
    const old=s.selectedGuide===undefined?this.v10Committed:s.selectedGuide;
    if(old&&s.t>=old.t0&&s.t-old.t0<2&&hypot(old.goal[0]-s.x,old.goal[1]-s.y)>180)accept(old,old.id);
    const maze=this.v10MazeGuides(s,W,root,edge,Math.min(deadline-25,begin+(V.V10_BUDGET??90)*.55),old?.goal,(V.V10_FOOD_W??2)>0?foods:[],Math.min(deadline-20,begin+(V.V10_BUDGET??90)*.7));
    expanded=maze.expanded;geometry=maze.guides.length;
    // Independent exit sectors survive topology search; preferences rank only
    // routes that have actually been found, never eliminate search branches.
    const goals=maze.guides.sort((a,b)=>{
      const cost=g=>{const x=g.goal[0],y=g.goal[1];let food=0;for(const f of foods)food=Math.max(food,(hypot(f.x-s.x,f.y-s.y)-hypot(f.x-x,f.y-y))/Math.max(300,hypot(f.x-s.x,f.y-s.y)));
        return g.length-(V.V10_FOOD_W??2)*(food*200+(g.foodTarget?800*g.foodTarget.mass/(g.foodTarget.mass+80):0))-(V.V9_CENTER_W??2)*.05*(foods.length && (this.values.V10_FOOD_W??2)>0 ? .15 : 1)*(hypot(s.x-s.wall[0],s.y-s.wall[1])-hypot(x-s.wall[0],y-s.wall[1]));};return cost(a)-cost(b);});
    goals.sort((a,b)=>Number(b.preferred)-Number(a.preferred));
    for(const g of goals){
      if(routes.length>=Math.max(1,Math.round(V.V9_ROUTES??3))||performance.now()>deadline-2)break;
      if(routes.some(r=>r.sector===g.sector))continue;
      const id=g.preferred&&old?old.id:`${ver}:${g.kind==='food_escape'?'food'+g.foodIndex:g.sector}`;
      if(!accept(g,id)&&performance.now()<deadline-4)accept({...g,lookScale:.4},id);
      if(routes.length>=Math.max(1,Math.round(V.V9_ROUTES??3)))break;
    }
    // A geometric corridor can start behind the current turning circle.
    // Search a short collision-checked manoeuvre, then verify the resulting
    // complete guide again with the same follower used by the actuator.
    if(!routes.length&&goals.length&&performance.now()<deadline-5){
      bridge:for(const offset of [0,-.6,.6,-1.2,1.2,-2,2,Math.PI])for(const boost of [false,true]){
        if(performance.now()>deadline-5)break bridge;
        if(boost&&(!(V.V10_ESCAPE_BOOST??1)||s.L<(V.V2_MINL??30)))continue;
        const seedRoll=this.v9Roll(s,PW,ph,root.st,0,.39,root.t,root.st.h+offset,boost);
        if(!seedRoll.ok)continue;
        const seed={...seedRoll,pts:[...root.pts,...seedRoll.pts],clear:Math.min(root.clear,seedRoll.clear)};
        for(const g of goals){
          if(performance.now()>deadline-4)break bridge;
          const joined=this.v10Follow(s,PW,ph,seed,{...g,useBoost:boost},deadline);
          if(!joined.ok)continue;
          const guide={...g,useBoost:boost,kind:'maneuver_escape',entry:{until:s.t+seedRoll.t,target:root.st.h+offset,boost}};
          if(accept(guide,g.preferred&&old?old.id:`${ver}:maneuver${g.sector}`))break bridge;
        }
      }
    }
    const picked=this.v10Choose(routes,old?.id);
    if(picked){routes.splice(routes.indexOf(picked),1);routes.unshift(picked);}this.v10Committed=picked||null;
    return result(routes.length?'maze_routes':maze.reason==='maze'?'no_drivable_route':maze.reason);
  }
  // Same feedback law is used by the planner and the actuator's verifier.
  // A static polyline is only a guide; success requires reaching its goal with
  // the measured turn/speed model, queued inputs and swept collision checks.
  v10Follow(s,W,ph,root,route,deadline=Infinity,maxAhead=Infinity){
    if(!root.ok||!route.path?.length)return {ok:false,reason:'prefix'};
    const foodTarget=route.foodTarget,liveFood=foodTarget&&s.food.some((x,i)=>i%3===0&&hypot(x-foodTarget.x,s.food[i+1]-foodTarget.y)<80);
    const boostPurpose=st=>{let pressure=this.v10EscapePressure(s);for(let i=0;i<s.heads.length;i+=5)if(hypot(st.x-s.heads[i],st.y-s.heads[i+1])<700){pressure=true;break;}
      const fd=foodTarget?hypot(st.x-foodTarget.x,st.y-foodTarget.y):0,toward=foodTarget?((foodTarget.x-st.x)*Math.cos(st.h)+(foodTarget.y-st.y)*Math.sin(st.h))/Math.max(1,fd):0;
      return pressure||liveFood&&foodTarget.mass>=(this.values.V9_BOOST_MIN_MASS??40)&&fd>(this.values.V9_BOOST_MIN_DIST??180)&&toward>.7;};
    const path=route.path,goal=path[path.length-1];let st=root.st,t=root.t,clear=root.clear;
    const pts=[...root.pts],actions=[];let index=1,travel=0,reason='horizon';
    const limit=Math.min(45,Math.max(3,(route.length||2000)/Math.max(80,ph.cs)*1.8));
    for(let step=0;t-root.t<limit;step++){
      if(t-root.t>=maxAhead)return {ok:true,partial:true,pts,actions,clear,duration:t,travel};
      if((step&3)===0&&performance.now()>deadline){reason='budget';break;}
      if(route.entry&&s.t+t<route.entry.until-1e-6){
        const dt=Math.min(.13,route.entry.until-s.t-t),e=route.entry;
        const r=this.v9Roll(s,W,ph,st,0,dt,t,e.target,e.boost&&boostPurpose(st));
        clear=Math.min(clear,r.clear);if(!r.ok){reason='collision';break;}
        actions.push({start:t,end:r.t,target:e.target,boost:e.boost&&boostPurpose(st)});pts.push(...r.pts);travel+=hypot(r.st.x-st.x,r.st.y-st.y);st=r.st;t=r.t;continue;
      }
      let nearest=Infinity,projection=null;
      for(let i=index;i<(step===0?path.length:Math.min(path.length,index+25));i++){
        const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,len=hypot(dx,dy);
        const u=clip(((st.x-a.x)*dx+(st.y-a.y)*dy)/Math.max(1,len*len),0,1),d=hypot(st.x-a.x-u*dx,st.y-a.y-u*dy);
        if(d<nearest){nearest=d;projection={i,u,len};}
      }
      if(!projection){reason='empty';break;}
      index=projection.i;
      // Short lookahead tracks narrow corridors; longer lookahead is not a
      // license to cut corners: every resulting curved motion is swept below.
      let remaining=Math.max(24,st.v*.22)*(route.lookScale||1),i=index,u=projection.u,aim;
      for(;i<path.length;i++){
        const a=path[i-1],b=path[i],len=hypot(b.x-a.x,b.y-a.y),available=len*(1-u);
        if(remaining<=available||i===path.length-1){const f=Math.min(1,u+remaining/Math.max(1,len));aim={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};break;}
        remaining-=available;u=0;
      }
      const angle=Math.atan2(aim.y-st.y,aim.x-st.x),distance=hypot(goal.x-st.x,goal.y-st.y);
      let boost=this.v10DefaultBoost(s)||s.L>=(this.values.V2_MINL??30)&&boostPurpose(st) && !!route.useBoost && !!(this.values.V10_ESCAPE_BOOST??1) && Math.abs(wrap(angle-st.h))<.35 && distance>180;
      let r=this.v9Roll(s,W,ph,st,0,.13,t,angle,boost);
      if(!r.ok&&boost&&this.v10DefaultBoost(s)){const cruise=this.v9Roll(s,W,ph,st,0,.13,t,angle,false);if(cruise.ok){r=cruise;boost=false;}}
      clear=Math.min(clear,r.clear);
      if(!r.ok){reason='collision';break;}
      actions.push({start:t,end:r.t,target:angle,boost});pts.push(...r.pts);travel+=hypot(r.st.x-st.x,r.st.y-st.y);st=r.st;t=r.t;
      if(hypot(goal.x-st.x,goal.y-st.y)<Math.max(25,st.v*.14)){
        // Reject a dead end whose goal is clear but whose continuation is not.
        const tail=this.v9Roll(s,W,ph,st,0,.6,t,st.h,false);
        if(!tail.ok)return {ok:false,reason:'terminal',pts,actions,clear};
        pts.push(...tail.pts);
        return {ok:true,pts,actions,clear:Math.min(clear,tail.clear),duration:tail.t,travel,st:tail.st};
      }
    }
    return {ok:false,reason,pts,actions,clear};
  }
  v10Root(s,W,ph){
    const lag=Math.max(0,this.values.TRACK_LAT??.17),age=Math.max(0,s.inputAgeMs??0)/1000;
    const until=lag+age+Math.min(.03,(this.v10ComputeMs??3)/1000),history=s.cmdHistory||[];
    let st={x:s.x,y:s.y,h:s.ang,v:s.sp*PX_PER_SP},t=0,clear=Infinity,ok=true,hitAt=null;
    const pts=[0,s.x,s.y,s.ang,s.boostNow?1:0];
    while(t<until-1e-8){const stamp=s.t+t-lag;let active={ang:Number.isFinite(s.cmdNow)?s.cmdNow:s.ang,boost:!!s.boostNow};
      if(history.length){active=history[0];for(const q of history){if(q.t>stamp+1e-8)break;active=q;}}
      const next=history.find(q=>q.t>stamp+1e-8),dt=Math.min(.04,until-t,next?next.t-stamp:Infinity);
      const nextSt=this.v4Adv(st,active.ang,!!active.boost,dt,ph);
      const pad=Math.max(st.v,nextSt.v)*dt*Math.abs(wrap(nextSt.h-st.h))/8+.15;
      const gap=W.check(st,nextSt,t,t+dt,pad);clear=Math.min(clear,gap);
      if(gap<0){ok=false;hitAt??=t;}
      // Commands already sent cannot be replaced before their arrival time.
      // Continue the kinematic prefix even if its collision prediction fails;
      // retain that failure instead of pretending the new action starts early.
      st=nextSt;t+=dt;pts.push(t,st.x,st.y,st.h,active.boost?1:0);
    }return {ok,st,t,pts,clear,hitAt};
  }
  // V8/V1 principle: count individual pellets touched by a near-term swept
  // trajectory, not merely proximity to a distant heap centre.
  v10Pellets(s,pts,until) {
    let mass=0;const reach=14.5*s.sc+6;
    for(let f=0;f<s.food.length;f+=3){const x=s.food[f],y=s.food[f+1],size=s.food[f+2];
      if(hypot(x-s.x,y-s.y)>500)continue;
      for(let i=5;i<pts.length&&pts[i]<=until;i+=5){
        const ax=pts[i-4],ay=pts[i-3],dx=pts[i+1]-ax,dy=pts[i+2]-ay;
        const u=clip(((x-ax)*dx+(y-ay)*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);
        if(hypot(x-ax-u*dx,y-ay-u*dy)<=reach){mass+=size*(size>=(this.values.V9_REMAINS_MIN??12)?4:1)*Math.exp(-pts[i]);break;}
      }
    }return mass/(mass+80);
  }
  v10FeedPrefix(s,W,ph,root,route,deadline) {
    if(route.entry && s.t+root.t<route.entry.until)return route;
    const weight=this.values.V10_FOOD_W??2;if(weight<=0){this.v10FeedTarget=null;return route;}
    const nominal=this.v10Pellets(s,route.pts,root.t+1),targets=[],feedHeads=this.v10Blockers(s,W);
    let held=this.v10FeedTarget;
    if(held&&(held.routeId!==route.id||s.t-held.t>(this.values.V9_TARGET_HOLD??1.2)||hypot(held.x-s.x,held.y-s.y)<14.5*s.sc+6||!s.food.some((x,i)=>i%3===0&&hypot(x-held.x,s.food[i+1]-held.y)<12)))held=null;
    this.v10FeedTarget=held;
    for(let i=0;i<s.food.length;i+=3){const d=hypot(s.food[i]-s.x,s.food[i+1]-s.y);if(d>300||d<14.5*s.sc*.6)continue;
      targets.push({x:s.food[i],y:s.food[i+1],value:s.food[i+2]*(s.food[i+2]>=(this.values.V9_REMAINS_MIN??12)?4:1)/(d+30)});}
    targets.sort((a,b)=>b.value-a.value);if(held)targets.unshift({...held,held:true});let best=route,bestScore=weight*nominal;const headings=[];
    for(const g of targets){
      if(performance.now()>deadline-2||headings.length>=3)break;
      const angle=Math.atan2(g.y-root.st.y,g.x-root.st.x);if(headings.some(a=>Math.abs(wrap(a-angle))<.15))continue;headings.push(angle);
      // Aim at the pellet again after each curved step. A fixed bearing
      // misses side pellets because the head cannot turn instantaneously.
      let st=root.st,t=root.t,clear=root.clear,ok=true,reached=false;const foodPts=[...root.pts],foodActions=[];
      const reach=14.5*s.sc+6,limit=Math.min(2.4,hypot(g.x-st.x,g.y-st.y)/Math.max(80,st.v)*2+.5);
      while(t-root.t<limit){
        if(performance.now()>deadline-2){ok=false;break;}
        if(hypot(g.x-st.x,g.y-st.y)<reach){reached=true;break;}
        const target=Math.atan2(g.y-st.y,g.x-st.x);let boost=this.v10DefaultBoost(s),r=this.v9Roll(s,W,ph,st,0,.1,t,target,boost);
        if(!r.ok&&boost){r=this.v9Roll(s,W,ph,st,0,.1,t,target,false);boost=false;}
        if(!r.ok){ok=false;break;}clear=Math.min(clear,r.clear);foodPts.push(...r.pts);foodActions.push({start:t,end:r.t,target,boost});st=r.st;t=r.t;
      }
      if(!ok||!reached||!foodActions.length)continue;
      const r={ok:true,st,t,clear,pts:foodPts},joinRoot=r;
      const joined=this.v10Follow(s,W,ph,joinRoot,route,deadline,1.2);if(!joined.ok)continue;
      // The detour must reconnect near the chosen corridor, not invent a new
      // strategy. Near-term collision checking includes the return manoeuvre.
      const end=joined.pts.length-5;let gap=Infinity;
      for(const p of route.path)gap=Math.min(gap,hypot(p.x-joined.pts[end+1],p.y-joined.pts[end+2]));
      // Use segments too: visibility-simplified guides have sparse vertices.
      for(let i=1;i<route.path.length;i++){const a=route.path[i-1],b=route.path[i],dx=b.x-a.x,dy=b.y-a.y,u=clip(((joined.pts[end+1]-a.x)*dx+(joined.pts[end+2]-a.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1);gap=Math.min(gap,hypot(joined.pts[end+1]-a.x-u*dx,joined.pts[end+2]-a.y-u*dy));}
      if(gap>60)continue;
      const food=this.v10Pellets(s,joined.pts,t+1.2),feedRisk=this.v10Closure(joined.pts,feedHeads).risk;
      const baseRisk=this.v10Closure(route.pts.filter((_,i)=>route.pts[i-i%5]<=t+1.2),feedHeads).risk,riskDelta=Math.max(0,feedRisk-baseRisk);
      const appetite=clip((this.values.V10_FOOD_RISK??0)/100,0,1),score=weight*food-gap*.003-(8-7*appetite)*riskDelta;
      if(food>0&&(g.held&&riskDelta<=.02||score>bestScore+.02)){bestScore=score;best={...route,feedTarget:g,feedPrefix:joined.pts,feedValue:food,actions:[...foodActions,...joined.actions],clear:Math.min(r.clear,joined.clear)};}
      if(g.held&&best.feedPrefix)break;
    }
    if(best.feedTarget)this.v10FeedTarget={x:best.feedTarget.x,y:best.feedTarget.y,routeId:route.id,t:held&&best.feedTarget.held?held.t:s.t};
    else if(performance.now()<deadline-2)this.v10FeedTarget=null;
    if(best.feedPrefix){
      const full=[...best.feedPrefix],end=full.length-5,original=route.pts;let nearest=Infinity,idx=-1;
      for(let i=0;i<original.length;i+=5){const d=hypot(original[i+1]-full[end+1],original[i+2]-full[end+2]);if(d<nearest){nearest=d;idx=i;}}
      if(idx>=0){const shift=full[end]-original[idx];for(let i=idx+5;i<original.length;i+=5)full.push(original[i]+shift,...original.slice(i+1,i+5));}
      best={...best,pts:full,feedPrefix:full,closure:this.v10Closure(full,feedHeads)};
    }
    return best;
  }
  v10Step(s) {
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s,true),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const worldMs=performance.now()-begin,heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3);
    const source=s.route?.algo==='v10'&&s.t>=s.route.t0&&s.t-s.route.t0<(V.V10_ROUTE_AGE??.9)?s.route:null;
    const valid=[],flat=pts=>{const a=[];for(let i=0;i<pts.length;i+=5)a.push(pts[i+1],pts[i+2]);return a;};
    let reject=source?'invalid':'pending',checked=0;
    const invalid=this.v10Invalid||(this.v10Invalid=new Map());for(const [key,t] of invalid)if(s.t-t>2)invalid.delete(key);
    // Recheck full remaining probes in one model; the local layer cannot
    // silently substitute an unrelated food/centre objective for a valid route.
    const deadline=begin+Math.max(12,V.V10_LOCAL_MS??12);
    const guides=[...(source?.routes||[])];if(this.v10Held&&!guides.some(g=>g.id===this.v10Held.id)&&s.t-this.v10Held.t0<2)guides.unshift(this.v10Held);
    guides.sort((a,b)=>Number(b.id===this.v10RouteId)-Number(a.id===this.v10RouteId));
    if(root.ok)for(const guide of guides){
      if(!guide.drivable)continue;
      const key=guide.id+':'+guide.t0;if(invalid.has(key))continue;
      if(hypot(guide.goal[0]-s.x,guide.goal[1]-s.y)<150){reject='completed';continue;}
      const r=this.v10Follow(s,PW,ph,root,guide,deadline,.9);checked++;
      if(r.ok&&r.actions.length){
        // Refresh the executed prefix; the planner independently revalidates
        // the full route. Preserve its suffix as a provisional long guide.
        const original=guide.pts||[],last=r.pts.length-5;let nearest=Infinity,idx=-1;
        for(let i=0;i<original.length;i+=5){const d=hypot(original[i+1]-r.pts[last+1],original[i+2]-r.pts[last+2]);if(d<nearest){nearest=d;idx=i;}}
        if(idx>=0){const shift=r.pts[last]-original[idx];for(let i=idx+5;i<original.length;i+=5)r.pts.push(original[i]+shift,...original.slice(i+1,i+5));}
        r.duration=r.pts.length?r.pts[r.pts.length-5]:r.duration;
        const closure=this.v10Closure(r.pts,heads);valid.push({...guide,...r,closure,foodValue:this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods)),...this.v10Utility(s,r.pts,foods,r.actions),score:(guide.score??0)+(guide.id===this.v10RouteId?10:0)});}
      else {reject=r.reason;if(r.reason==='collision')invalid.set(key,s.t);}
      if(performance.now()>deadline-(this.v10FeedTarget?3:0))break;
    }
    const heldBefore=valid.find(r=>r.id===this.v10RouteId);let picked=this.v10Choose(valid,this.v10RouteId);const selectionReason=!picked?'no_valid_route':picked.id===this.v10RouteId?'held':heldBefore?'risk_threshold':this.v10RouteId?(this.v10Held&&hypot(this.v10Held.goal[0]-s.x,this.v10Held.goal[1]-s.y)<150?'goal_reached':'held_unavailable'):'initial';if(picked){valid.splice(valid.indexOf(picked),1);valid.unshift(picked);this.v10Held=picked;}let action,pts,clear,safe,mode;
    if(picked){picked=this.v10FeedPrefix(s,PW,ph,root,picked,deadline);valid[0]=picked;action=picked.actions[0];pts=picked.feedPrefix||picked.pts;clear=picked.clear;safe=true;mode='v10route';this.v10RouteId=picked.id;}
    else {
      const options=[],horizon=Math.max(.6,V.V10_LOCAL_H??.9);
      const canBoost=s.L>=(V.V2_MINL??30)&&(V.V10_ESCAPE_BOOST??1)&&(this.v10DefaultBoost(s)||foods.length>0||heads.length>0);
      for(const offset of [0,-.5,.5,-1,1,-2,2,PI])for(const boost of canBoost?[false,true]:[false]){
        const angle=root.st.h+offset,r=this.v9Roll(s,W,ph,root.st,0,horizon,root.t,angle,boost);checked++;
        const foodValue=r.ok?this.v10Pellets(s,[...root.pts,...r.pts],root.t+horizon):0;
        options.push({...r,angle,boost,score:r.t*1000+Math.min(100,r.clear)-Math.abs(offset)+(V.V10_FOOD_W??2)*200*foodValue-(boost?20:0)});
      }
      options.sort((a,b)=>Number(b.ok)-Number(a.ok)||(this.v10DefaultBoost(s)&&a.ok&&b.ok?Number(b.boost)-Number(a.boost):0)||b.score-a.score);const best=options[0];
      action={start:root.t,end:root.t+.13,target:best.angle,boost:best.boost};pts=[...root.pts,...best.pts];clear=best.clear;safe=root.ok&&best.ok;mode=safe?'v10replan':'v10emergency';
    }
    const ms=performance.now()-begin;this.v10ComputeMs=ms;
    const trace={mode,cmd:r1(deg(action.target)),boost:action.boost,n_safe:root.ok?valid.length:0,cause:source?.reason??'pending',v10_strategy:picked?'route':'replan',verified_s:picked?.partial ? .9 : 0,v10_local_ms:ms,v10_world_ms:worldMs,v10_budget_hit:ms>(deadline-begin),v10_checked:checked,v10_clear:clear,v10_root_safe:root.ok,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:valid.length,v10_geometry_only:0,v10_route_id:picked?.id??null,v10_continuation_s:picked?picked.duration-root.t:0,v10_closure_risk:picked?.closure.risk??null,v10_closure_slack:picked?.closure.slack??null,v10_closure_cert:picked?.closure.certified??false,v10_food_risk:V.V10_FOOD_RISK??0,v10_food_value:picked?.foodValue??0,v10_pellet_value:picked?.feedValue??0,v10_selection_reason:selectionReason,v10_path_kind:picked?.kind??null,v10_replan:picked?0:1,v10_reject:picked?null:reject,L:s.L,sc:s.sc};
    this.last={trace,mode,selectedGuide:picked?Object.fromEntries(['id','t0','path','goal','length','kind','sector','lookScale','useBoost','score','foodTarget','entry'].map(k=>[k,picked[k]])):null,plan:pts,controls:[{...action,end:Math.min(action.end,action.start+.13)}],draw:{v9FoodPath:picked?.kind==='food_escape',chosen:flat(pts),localPath:flat(pts.filter((_,i)=>pts[i-i%5]<=root.t+.6)),localUnsafe:!safe,v9At:s.t,v9Paths:valid.map(r=>flat(r.pts)),v10Closures:valid.map(r=>({risk:r.closure.risk,certified:r.closure.certified,slack:r.closure.slack})),v9Walls:W.walls,v9Reason:picked?'long_probe':'replan',mazePath:[],safe:[],near:[],gaps:[],goal:picked?.goal??null,ro:W.ro}};
    this.prev=action.target;this.prevBoost=action.boost;return [action.target,action.boost];
  }

  v101WrapStep(s) {
    const exit=s.wrapEscape.angle; s={...s,food:new Float64Array(0)};
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s,true),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const worldMs=performance.now()-begin,heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3);
    const source=s.route?.algo==='v10'&&s.t>=s.route.t0&&s.t-s.route.t0<(V.V10_ROUTE_AGE??.9)?s.route:null;
    const valid=[],flat=pts=>{const a=[];for(let i=0;i<pts.length;i+=5)a.push(pts[i+1],pts[i+2]);return a;};
    let reject=source?'invalid':'pending',checked=0;
    const invalid=this.v10Invalid||(this.v10Invalid=new Map());for(const [key,t] of invalid)if(s.t-t>2)invalid.delete(key);
    // Recheck full remaining probes in one model; the local layer cannot
    // silently substitute an unrelated food/centre objective for a valid route.
    const deadline=begin+Math.max(12,V.V10_LOCAL_MS??12);
    const guides=[...(source?.routes||[])];if(this.v10Held&&!guides.some(g=>g.id===this.v10Held.id)&&s.t-this.v10Held.t0<2)guides.unshift(this.v10Held);
    guides.sort((a,b)=>Number(b.id===this.v10RouteId)-Number(a.id===this.v10RouteId));
    if(root.ok)for(const guide of guides){
      if(!guide.drivable)continue;
      const key=guide.id+':'+guide.t0;if(invalid.has(key))continue;
      if(hypot(guide.goal[0]-s.x,guide.goal[1]-s.y)<150){reject='completed';continue;}
      const r=this.v10Follow(s,PW,ph,root,guide,deadline,.9);checked++;
      if(r.ok&&r.actions.length){
        // Refresh the executed prefix; the planner independently revalidates
        // the full route. Preserve its suffix as a provisional long guide.
        const original=guide.pts||[],last=r.pts.length-5;let nearest=Infinity,idx=-1;
        for(let i=0;i<original.length;i+=5){const d=hypot(original[i+1]-r.pts[last+1],original[i+2]-r.pts[last+2]);if(d<nearest){nearest=d;idx=i;}}
        if(idx>=0){const shift=r.pts[last]-original[idx];for(let i=idx+5;i<original.length;i+=5)r.pts.push(original[i]+shift,...original.slice(i+1,i+5));}
        r.duration=r.pts.length?r.pts[r.pts.length-5]:r.duration;
        const closure=this.v10Closure(r.pts,heads);valid.push({...guide,...r,closure,foodValue:this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods)),...this.v10Utility(s,r.pts,foods,r.actions),score:(guide.score??0)+(guide.id===this.v10RouteId?10:0)});}
      else {reject=r.reason;if(r.reason==='collision')invalid.set(key,s.t);}
      if(performance.now()>deadline-(this.v10FeedTarget?3:0))break;
    }
    const heldBefore=valid.find(r=>r.id===this.v10RouteId);let picked=valid.slice().sort((a,b)=>Math.cos(b.actions[0].target-exit)-Math.cos(a.actions[0].target-exit)||a.closure.risk-b.closure.risk)[0];const selectionReason=!picked?'no_valid_route':picked.id===this.v10RouteId?'held':heldBefore?'risk_threshold':this.v10RouteId?(this.v10Held&&hypot(this.v10Held.goal[0]-s.x,this.v10Held.goal[1]-s.y)<150?'goal_reached':'held_unavailable'):'initial';if(picked){valid.splice(valid.indexOf(picked),1);valid.unshift(picked);this.v10Held=picked;}let action,pts,clear,safe,mode;
    if(picked){// Wrap escape keeps the checked route prefix and skips food detours.
      valid[0]=picked;action=picked.actions[0];pts=picked.feedPrefix||picked.pts;clear=picked.clear;safe=true;mode='v10route';this.v10RouteId=picked.id;}
    else {
      const options=[],horizon=Math.max(.6,V.V10_LOCAL_H??.9);
      const canBoost=s.L>=(V.V2_MINL??30)&&(V.V10_ESCAPE_BOOST??1)&&(this.v10DefaultBoost(s)||foods.length>0||heads.length>0);
      for(const offset of [wrap(exit-root.st.h),0,-.5,.5,-1,1,-2,2,PI])for(const boost of canBoost?[false,true]:[false]){
        const angle=root.st.h+offset,r=this.v9Roll(s,W,ph,root.st,0,horizon,root.t,angle,boost);checked++;
        const foodValue=r.ok?this.v10Pellets(s,[...root.pts,...r.pts],root.t+horizon):0;
        options.push({...r,angle,boost,score:r.t*1000+Math.min(100,r.clear)-Math.abs(offset)+(V.V10_FOOD_W??2)*200*foodValue-(boost?20:0)});
      }
      options.sort((a,b)=>Number(b.ok)-Number(a.ok)||(a.ok&&b.ok?Math.cos(b.angle-exit)-Math.cos(a.angle-exit):0)||(this.v10DefaultBoost(s)&&a.ok&&b.ok?Number(b.boost)-Number(a.boost):0)||b.score-a.score);const best=options[0];
      action={start:root.t,end:root.t+.13,target:best.angle,boost:best.boost};pts=[...root.pts,...best.pts];clear=best.clear;safe=root.ok&&best.ok;mode=safe?'v10replan':'v10emergency';
    }
    const ms=performance.now()-begin;this.v10ComputeMs=ms;
    const trace={mode,cmd:r1(deg(action.target)),boost:action.boost,n_safe:root.ok?valid.length:0,cause:source?.reason??'pending',v10_strategy:picked?'route':'replan',verified_s:picked?.partial ? .9 : 0,v10_local_ms:ms,v10_world_ms:worldMs,v10_budget_hit:ms>(deadline-begin),v10_checked:checked,v10_clear:clear,v10_root_safe:root.ok,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:valid.length,v10_geometry_only:0,v10_route_id:picked?.id??null,v10_continuation_s:picked?picked.duration-root.t:0,v10_closure_risk:picked?.closure.risk??null,v10_closure_slack:picked?.closure.slack??null,v10_closure_cert:picked?.closure.certified??false,v10_food_risk:V.V10_FOOD_RISK??0,v10_food_value:picked?.foodValue??0,v10_pellet_value:picked?.feedValue??0,v10_selection_reason:'wrap_exit',v10_path_kind:picked?.kind??null,v10_replan:picked?0:1,v10_reject:picked?null:reject,L:s.L,sc:s.sc};
    this.last={trace,mode,selectedGuide:picked?Object.fromEntries(['id','t0','path','goal','length','kind','sector','lookScale','useBoost','score','foodTarget','entry'].map(k=>[k,picked[k]])):null,plan:pts,controls:[{...action,end:Math.min(action.end,action.start+.13)}],draw:{v9FoodPath:picked?.kind==='food_escape',chosen:flat(pts),localPath:flat(pts.filter((_,i)=>pts[i-i%5]<=root.t+.6)),localUnsafe:!safe,v9At:s.t,v9Paths:valid.map(r=>flat(r.pts)),v10Closures:valid.map(r=>({risk:r.closure.risk,certified:r.closure.certified,slack:r.closure.slack})),v9Walls:W.walls,v9Reason:picked?'long_probe':'replan',mazePath:[],safe:[],near:[],gaps:[],goal:picked?.goal??null,ro:W.ro}};
    this.prev=action.target;this.prevBoost=action.boost;return [action.target,action.boost];
  }

  v111StaticWorld(s) {
    const V = this.values, ro = R * s.sc, margin = V.V9_MARGIN ?? 5, obs = V.V9_OBS ?? 1200;
    const walls = [], bins = new Map(), cell = 96;
    const pointD = (x, y, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay, f = clip(((x - ax) * dx + (y - ay) * dy) / Math.max(1e-12, dx * dx + dy * dy), 0, 1);
      return hypot(x - ax - f * dx, y - ay - f * dy);
    };
    const segmentD = (ax, ay, bx, by, cx, cy, dx, dy) => {
      const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy, den = ux * vy - uy * vx;
      if (Math.abs(den) > 1e-10) {
        const wx = cx - ax, wy = cy - ay, t = (wx * vy - wy * vx) / den, u = (wx * uy - wy * ux) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
      }
      return Math.min(pointD(ax, ay, cx, cy, dx, dy), pointD(bx, by, cx, cy, dx, dy), pointD(cx, cy, ax, ay, bx, by), pointD(dx, dy, ax, ay, bx, by));
    };
    for (let i = 0; i + 4 < s.segs.length; i += 5) {
      const a = Array.from(s.segs.slice(i, i + 5)); if (!a.every(Number.isFinite) || a[4] < 0) continue;
      // Use at least the rendered physical radius; negative calibration must not
      // make a displayed V9 escape line cut through a visible body.
      a[4] = Math.max(a[4], a[4] + this.P.bodyOff(a[4]));
      const pad = a[4] + ro + margin + 130, id = walls.length; walls.push(a);
      const x0 = Math.max(s.x - obs - 2, Math.min(a[0], a[2]) - pad), x1 = Math.min(s.x + obs + 2, Math.max(a[0], a[2]) + pad);
      const y0 = Math.max(s.y - obs - 2, Math.min(a[1], a[3]) - pad), y1 = Math.min(s.y + obs + 2, Math.max(a[1], a[3]) + pad);
      for (let x = Math.floor(x0 / cell); x <= Math.floor(x1 / cell); x++) for (let y = Math.floor(y0 / cell); y <= Math.floor(y1 / cell); y++) {
        const key = x + ',' + y; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(id);
      }
    }
    const heads = [];
    for (let i = 0; i + 4 < s.heads.length; i += 5) {
      const [x, y, h, sp, sc] = s.heads.slice(i, i + 5); if (![x, y, h, sp, sc].every(Number.isFinite)) continue;
      heads.push({x, y, vx: Math.cos(h) * sp * PX_PER_SP, vy: Math.sin(h) * sp * PX_PER_SP, r: R * sc});
    }
    const check = (a, b, t0 = 0, t1 = t0, pad = 0, dynamic = true) => {
      let gap = Math.min(128, obs - Math.max(hypot(a.x - s.x, a.y - s.y), hypot(b.x - s.x, b.y - s.y)) - pad);
      gap = Math.min(gap, s.wall[2] - Math.max(hypot(a.x - s.wall[0], a.y - s.wall[1]), hypot(b.x - s.wall[0], b.y - s.wall[1])) - ro - margin - pad);
      
      const seen = new Set();
      for (let x = Math.floor((Math.min(a.x, b.x) - pad) / cell); x <= Math.floor((Math.max(a.x, b.x) + pad) / cell); x++)
        for (let y = Math.floor((Math.min(a.y, b.y) - pad) / cell); y <= Math.floor((Math.max(a.y, b.y) + pad) / cell); y++)
          for (const id of bins.get(x + ',' + y) || []) if (!seen.has(id)) {
            seen.add(id); const w = walls[id];
            gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, w[0], w[1], w[2], w[3]) - w[4] - ro - margin - pad);
            
          }
      if (dynamic) for (const h of heads) {
        // Forecast only, not a guarantee of enemy intent. Rechecked every tick.
        const ax = a.x - h.x - h.vx * t0, ay = a.y - h.y - h.vy * t0, bx = b.x - h.x - h.vx * t1, by = b.y - h.y - h.vy * t1;
        const uncertainty = (V.V9_HEAD_PAD ?? 20) * Math.min(t1, 3);
        gap = Math.min(gap, pointD(0, 0, ax, ay, bx, by) - ro - h.r - margin - pad - uncertainty);
        // The moving head leaves a new body wall behind it during this forecast.
        gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, h.x, h.y, h.x + h.vx * t1, h.y + h.vy * t1) - ro - h.r - margin - pad - uncertainty);
        
      }
      return gap;
    };
    return {ro, obs, margin, walls, check};
  }
  v111World(s, local = false) {
    const V=this.values, radius=local?620:Math.max(V.V10_OBS??1800,s.viewRadius??0);
    const segs=[],sid=[];
    for(let i=0;i<s.segs.length;i+=5){const a=s.segs;
      if(Math.min(a[i],a[i+2])-a[i+4]>s.x+radius || Math.max(a[i],a[i+2])+a[i+4]<s.x-radius || Math.min(a[i+1],a[i+3])-a[i+4]>s.y+radius || Math.max(a[i+1],a[i+3])+a[i+4]<s.y-radius)continue;
      segs.push(...a.slice(i,i+5));sid.push(s.sid?.[i/5]);
    }
    const saved=this.values,savedP=this.P;
    this.P={...this.P,bodyOff:()=>0};
    this.values={...V,V9_OBS:radius,V9_MARGIN:V.V10_MARGIN??3};
    // Uncertain last-alive probe points do not justify subtracting a fitted death
    // offset. Use visible radii + explicit margin; retain raw calibration data.
    let W;try{W=this.v111StaticWorld({...s,segs,sid,heads:[]});}finally{this.values=saved;this.P=savedP;}
    const staticCheck=W.check,headList=[];
    for(let i=0;i<s.heads.length;i+=5){const [x,y,h,sp,sc]=s.heads.slice(i,i+5);
      if(hypot(x-s.x,y-s.y)>radius+550)continue;
      const hist=s.threat?.heads?.find(q=>q.id===s.hid?.[i/5]);
      const target=s.headTargets?.find(q=>q.id===s.hid?.[i/5]);
      headList.push({x,y,h,v:sp*PX_PER_SP,r:R*sc,w:hist?.w??0,target:Number.isFinite(target?.target)?target.target:null,rate:this.v4Physics(sc).w});
    }
    const pointD=(ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,u=clip(-(ax*dx+ay*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);return hypot(ax+u*dx,ay+u*dy);};
    const predict=(h,t,boost)=>{
      const key=Math.round(t*100000)+(boost?10000000:0);h.cache??=new Map();if(h.cache.has(key))return h.cache.get(key);
      const v=boost?Math.max(h.v,BOOST_SP*PX_PER_SP):h.v;
      // Follow the currently received target heading, then stop turning as
      // the client does. Future target changes remain unknown; retain padding.
      const delta=h.target===null?null:wrap(h.target-h.h),w=delta===null?clip(h.w,-2,2):Math.sign(delta)*h.rate;
      const turn=delta===null?t:Math.min(t,Math.abs(delta)/Math.max(1e-6,h.rate));
      const a=h.h+w*turn/2,d=Math.abs(w*turn)>1e-8?v*turn*Math.sin(w*turn/2)/(w*turn/2):v*turn;
      const tail=v*(t-turn),heading=h.h+w*turn;
      const p={x:h.x+Math.cos(a)*d+Math.cos(heading)*tail,y:h.y+Math.sin(a)*d+Math.sin(heading)*tail};h.cache.set(key,p);return p;
    };
    W.check=(a,b,t0=0,t1=t0,pad=0,dynamic=true)=>{
      let gap=staticCheck(a,b,t0,t1,pad,false);if(!dynamic)return gap;
      for(const h of headList){
        if(hypot(a.x-h.x,a.y-h.y)>434*t1+W.ro+h.r+W.margin+pad+40+hypot(b.x-a.x,b.y-a.y))continue;
        for(const boost of [false,true]){
        const p=predict(h,t0,boost),q=predict(h,t1,boost),unc=(V.V10_HEAD_PAD??12)*Math.min(t1,1.5)+(V.V10_HEAD_UNCERT??1)*interp(Math.min(t1,.35),[0,.1,.2,.3,.4],[0,9,21,39,68]);
        // Cycle4 calibration p95 residuals, rounded upward. Only the near-term
        // command window uses this envelope; longer predictions remain provisional.
        const g=pointD(a.x-p.x,a.y-p.y,b.x-q.x,b.y-q.y)-W.ro-h.r-W.margin-pad-unc;
        gap=Math.min(gap,g);
        // Newly laid body is occupied up to arrival time, never a permanent
        // whole-horizon cone. Approximate curved trail with short swept chords.
        for(let t=0;t<t1;t+=.2){const u=predict(h,t,boost),v=predict(h,Math.min(t+.2,t1),boost);
          const dx=v.x-u.x,dy=v.y-u.y;
          const near=p=>{const f=clip(((p.x-u.x)*dx+(p.y-u.y)*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);return hypot(p.x-u.x-f*dx,p.y-u.y-f*dy);};
          const ex=b.x-a.x,ey=b.y-a.y,den=ex*dy-ey*dx;
          let distance=Math.min(near(a),near(b),pointD(a.x-u.x,a.y-u.y,b.x-u.x,b.y-u.y),pointD(a.x-v.x,a.y-v.y,b.x-v.x,b.y-v.y));
          if(Math.abs(den)>1e-9){const rx=u.x-a.x,ry=u.y-a.y,ta=(rx*dy-ry*dx)/den,tb=(rx*ey-ry*ex)/den;if(ta>=0&&ta<=1&&tb>=0&&tb<=1)distance=0;}
          gap=Math.min(gap,distance-W.ro-h.r-W.margin-pad-unc-Math.max(h.v,434)*.2*Math.abs(h.w)*.2/8);
          
        }
      }}return gap;
    };
    return W;
  }
  // Uniform diagnostic continuation: a predicted collision is never labelled safe.
  v111Local(s,W,ph,root,canBoost) {
    const options=[],horizon=Math.max(.6,this.values.V10_LOCAL_H??.9);
    for(const offset of [0,-.25,.25,-.5,.5,-1,1,-1.5,1.5,-2,2,PI])for(const boost of canBoost?[false,true]:[false]){
      const angle=root.st.h+offset,r=this.v9Roll(s,W,ph,root.st,0,horizon,root.t,angle,boost);
      options.push({...r,angle,boost,offset});
    }
    const safe=options.filter(r=>root.ok&&r.ok);
    // In avoidance mode clearance comes before boost economy or food value.
    if(safe.length){safe.sort((a,b)=>b.clear-a.clear||Number(a.boost)-Number(b.boost)||Math.abs(a.offset)-Math.abs(b.offset));return {...safe[0],recovery:false,evaluated:horizon};}
    W=this.v111World(s,true);
    const candidates=options.filter(q=>!q.boost).map(q=>({...q,st:{...root.st},t:root.t,pts:[],clear:Infinity,depth:0,terminal:0,firstHit:Infinity,unsafe:0,ok:false}));
    const limit=Math.min(.6,horizon),deadline=performance.now()+8;let elapsed=0;
    do{
      const dt=Math.min(.04,limit-elapsed);
      for(const q of candidates){
        const next=this.v4Adv(q.st,q.angle,q.boost,dt,ph),pad=Math.max(q.st.v,next.v)*dt*Math.abs(wrap(next.h-q.st.h))/8+.15;
        const gap=W.check(q.st,next,q.t,q.t+dt,pad);
        q.clear=Math.min(q.clear,gap);q.terminal=gap;q.depth+=Math.max(0,-gap)*dt;
        if(gap<0){q.firstHit=Math.min(q.firstHit,elapsed);q.unsafe+=dt;}
        q.t+=dt;q.st=next;q.pts.push(q.t,next.x,next.y,next.h,q.boost?1:0);
      }
      elapsed+=dt;
    }while(elapsed<limit-1e-8&&(elapsed<.08||performance.now()<deadline));
    candidates.sort((a,b)=>(b.firstHit-a.firstHit)||a.depth-b.depth||b.terminal-a.terminal||b.clear-a.clear||a.unsafe-b.unsafe||Number(a.boost)-Number(b.boost));
    return {...candidates[0],recovery:true,evaluated:elapsed};
  }
  v111Step(s) {
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s,true),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const worldMs=performance.now()-begin,heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3);
    const source=s.route?.algo==='v10'&&s.t>=s.route.t0&&s.t-s.route.t0<(V.V10_ROUTE_AGE??.9)?s.route:null;
    const valid=[],flat=pts=>{const a=[];for(let i=0;i<pts.length;i+=5)a.push(pts[i+1],pts[i+2]);return a;};
    let reject=source?'invalid':'pending',checked=0;
    const invalid=this.v10Invalid||(this.v10Invalid=new Map());for(const [key,t] of invalid)if(s.t-t>2)invalid.delete(key);
    // Recheck full remaining probes in one model; the local layer cannot
    // silently substitute an unrelated food/centre objective for a valid route.
    const deadline=begin+Math.max(12,V.V10_LOCAL_MS??12);
    const guides=[...(source?.routes||[])];if(this.v10Held&&!guides.some(g=>g.id===this.v10Held.id)&&s.t-this.v10Held.t0<2)guides.unshift(this.v10Held);
    guides.sort((a,b)=>Number(b.id===this.v10RouteId)-Number(a.id===this.v10RouteId));
    if(root.ok)for(const guide of guides){
      if(!guide.drivable)continue;
      const key=guide.id+':'+guide.t0;if(invalid.has(key))continue;
      if(hypot(guide.goal[0]-s.x,guide.goal[1]-s.y)<150){reject='completed';continue;}
      const r=this.v10Follow(s,PW,ph,root,guide,deadline,.9);checked++;
      if(r.ok&&r.actions.length){
        // Refresh the executed prefix; the planner independently revalidates
        // the full route. Preserve its suffix as a provisional long guide.
        const original=guide.pts||[],last=r.pts.length-5;let nearest=Infinity,idx=-1;
        for(let i=0;i<original.length;i+=5){const d=hypot(original[i+1]-r.pts[last+1],original[i+2]-r.pts[last+2]);if(d<nearest){nearest=d;idx=i;}}
        if(idx>=0){const shift=r.pts[last]-original[idx];for(let i=idx+5;i<original.length;i+=5)r.pts.push(original[i]+shift,...original.slice(i+1,i+5));}
        r.duration=r.pts.length?r.pts[r.pts.length-5]:r.duration;
        const closure=this.v10Closure(r.pts,heads);valid.push({...guide,...r,closure,foodValue:this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods)),...this.v10Utility(s,r.pts,foods,r.actions),score:(guide.score??0)+(guide.id===this.v10RouteId?10:0)});}
      else {reject=r.reason;if(r.reason==='collision')invalid.set(key,s.t);}
      if(performance.now()>deadline-(this.v10FeedTarget?3:0))break;
    }
    const heldBefore=valid.find(r=>r.id===this.v10RouteId);let picked=this.v10Choose(valid,this.v10RouteId);const selectionReason=!picked?'no_valid_route':picked.id===this.v10RouteId?'held':heldBefore?'risk_threshold':this.v10RouteId?(this.v10Held&&hypot(this.v10Held.goal[0]-s.x,this.v10Held.goal[1]-s.y)<150?'goal_reached':'held_unavailable'):'initial';if(picked){valid.splice(valid.indexOf(picked),1);valid.unshift(picked);this.v10Held=picked;}let action,pts,clear,safe,mode,local=null;
    if(picked){picked=this.v10FeedPrefix(s,PW,ph,root,picked,deadline);valid[0]=picked;action=picked.actions[0];pts=picked.feedPrefix||picked.pts;clear=picked.clear;safe=true;mode='v10route';this.v10RouteId=picked.id;}
    else {
      const canBoost=s.L>=(V.V2_MINL??30)&&(V.V10_ESCAPE_BOOST??1);
      const best=this.v111Local(s,W,ph,root,canBoost);checked+=12*(canBoost?2:1);
      local=best;
      action={start:root.t,end:root.t+.13,target:best.angle,boost:best.boost};pts=[...root.pts,...best.pts];clear=best.clear;safe=root.ok&&best.ok;mode=safe?'v10replan':'v10emergency';
    }
    const ms=performance.now()-begin;this.v10ComputeMs=ms;
    const trace={v111_on:1,v111_recovery:!!local?.recovery,v111_evaluated_s:local?.evaluated??0,v111_depth:local?.depth??null,v111_terminal:local?.terminal??null,mode,cmd:r1(deg(action.target)),boost:action.boost,n_safe:root.ok?valid.length:0,cause:source?.reason??'pending',v10_strategy:picked?'route':'replan',verified_s:picked?.partial ? .9 : 0,v10_local_ms:ms,v10_world_ms:worldMs,v10_budget_hit:ms>(deadline-begin),v10_checked:checked,v10_clear:clear,v10_root_safe:root.ok,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:valid.length,v10_geometry_only:0,v10_route_id:picked?.id??null,v10_continuation_s:picked?picked.duration-root.t:0,v10_closure_risk:picked?.closure.risk??null,v10_closure_slack:picked?.closure.slack??null,v10_closure_cert:picked?.closure.certified??false,v10_food_risk:V.V10_FOOD_RISK??0,v10_food_value:picked?.foodValue??0,v10_pellet_value:picked?.feedValue??0,v10_selection_reason:selectionReason,v10_path_kind:picked?.kind??null,v10_replan:picked?0:1,v10_reject:picked?null:reject,L:s.L,sc:s.sc};
    this.last={trace,mode,selectedGuide:picked?Object.fromEntries(['id','t0','path','goal','length','kind','sector','lookScale','useBoost','score','foodTarget','entry'].map(k=>[k,picked[k]])):null,plan:pts,controls:[{...action,end:Math.min(action.end,action.start+.13)}],draw:{v9FoodPath:picked?.kind==='food_escape',chosen:flat(pts),localPath:flat(pts.filter((_,i)=>pts[i-i%5]<=root.t+.6)),localUnsafe:!safe,v9At:s.t,v9Paths:valid.map(r=>flat(r.pts)),v10Closures:valid.map(r=>({risk:r.closure.risk,certified:r.closure.certified,slack:r.closure.slack})),v9Walls:W.walls,v9Reason:picked?'long_probe':'replan',mazePath:[],safe:[],near:[],gaps:[],goal:picked?.goal??null,ro:W.ro}};
    this.prev=action.target;this.prevBoost=action.boost;return [action.target,action.boost];
  }

  // VA1 uses one food/escape objective. Nearby enemies never disable food.
  va1Core() {
    if(!this.va1Pilot){
      const q=this.va1Pilot=new Pilot(this.va1Values(),this.profile);
      q.v9FoodGoals=(s,enabled=true)=>this.va1Foods(s,enabled);
      q.v10Utility=(s,pts,foods,actions)=>this.va1Utility(s,pts,foods,actions);
      q.v10Compare=(a,b)=>this.va1Compare(a,b);
      q.v10Choose=(routes,id)=>this.va1Choose(routes,id);
      q.v10Follow=q.va1Follow;
      q.v10FeedPrefix=q.va1FeedPrefix;
      q.v10World=q.v111World;
      q.v111Local=(s,W,ph,root,canBoost)=>this.va1Local(q,s,W,ph,root,canBoost);
      // Near food pursues the pellet using feedback, then rejoins a validated exit.
      q.v10DefaultBoost=s=>!!(q.values.V10_ESCAPE_BOOST??1)&&s.L>=(q.values.V2_MINL??30)&&q.values.V10_BOOST_COST===0;
    }
    return this.va1Pilot;
  }
  va1Values() {return {...this.values,VA1_ON:0,V101_ON:0,V11_ON:0,V111_ON:0,V102_ON:0,V10_ON:1,
    V10_FOOD_W:this.values.VA1_FOOD_W??6,V10_MARGIN:this.values.VA1_GAP??1.5,V9_FOOD_R:this.values.VA1_FOOD_R??3000,
    V10_BOOST_COST:this.values.VA1_BOOST_COST??0,V9_REMAINS_MIN:12,V9_CENTER_W:this.values.VA1_CENTER_W??2};}
  va1Foods(s,enabled=true) {
    if(!enabled||(this.values.VA1_FOOD_W??6)<=0)return [];
    const bins=new Map(),cell=120,radius=this.values.VA1_FOOD_R??3000;
    for(let i=0;i<s.food.length;i+=3){const [x,y,m]=s.food.slice(i,i+3),d=hypot(x-s.x,y-s.y);
      if(![x,y,m].every(Number.isFinite)||m<=0||d>radius||d<R*s.sc*.6)continue;
      const key=Math.floor(x/cell)+','+Math.floor(y/cell),g=bins.get(key)||{mass:0,x,y,d};
      g.mass+=m*(m>=12?2:1);if(d<g.d){g.x=x;g.y=y;g.d=d;}bins.set(key,g);}
    const goals=[...bins.values()].map(g=>({...g,score:g.mass/(g.d+100)})).sort((a,b)=>b.score-a.score);
    const old=this.va1Target&&goals.find(g=>hypot(g.x-this.va1Target.x,g.y-this.va1Target.y)<120);
    if(old&&s.t-this.va1Target.since<1&&goals[0].score<old.score*1.35){goals.splice(goals.indexOf(old),1);goals.unshift(old);old.since=this.va1Target.since;}
    if(goals.length){goals[0].since??=s.t;this.va1Target=goals[0];}else this.va1Target=null;
    return goals;
  }
  va1Crowd(s,x,y) {
    const radius=900,target=Math.max(1,this.values.VA1_CROWD_TARGET??4);
    if(this.va1CrowdState!==s){
      const seen=new Map(),headIds=new Set();
      for(let i=0;i<s.heads.length;i+=5){const id=s.hid?.[i/5]??('h'+i);headIds.add(id);seen.set(id,{x:s.heads[i],y:s.heads[i+1]});}
      // Count each snake once, using its head or nearest visible body point.
      for(let i=0;i<s.segs.length;i+=5){const id=s.sid?.[i/5]??('b'+i);if(headIds.has(id))continue;
        const a=s.segs,dx=a[i+2]-a[i],dy=a[i+3]-a[i+1],u=clip(((s.x-a[i])*dx+(s.y-a[i+1])*dy)/Math.max(1,dx*dx+dy*dy),0,1);
        const p={x:a[i]+u*dx,y:a[i+1]+u*dy};p.d=hypot(p.x-s.x,p.y-s.y);
        if(!seen.has(id)||p.d<seen.get(id).d)seen.set(id,p);}
      this.va1CrowdState=s;this.va1CrowdPoints=[...seen.values()];
    }
    let count=0;for(const p of this.va1CrowdPoints)count+=Math.exp(-((hypot(p.x-x,p.y-y)/radius)**2));
    return {count,value:Math.exp(-(((count-target)/target)**2))};
  }
  va1Utility(s,pts,foods,actions=[]) {
    if(pts.length<5)return {centerValue:0,crowdValue:0,approachValue:0,boostCost:0};
    const n=pts.length-5,x=pts[n+1],y=pts[n+2],travel=hypot(x-s.x,y-s.y),scale=Math.max(200,travel);
    const radius=hypot(s.x-s.wall[0],s.y-s.wall[1]);
    const centerValue=clip((radius-hypot(x-s.wall[0],y-s.wall[1]))/scale,-1,1)*Math.min(1,radius/2000);
    const crowdValue=clip((this.va1Crowd(s,x,y).value-this.va1Crowd(s,s.x,s.y).value)*4,-1,1);
    let approachValue=0;for(const g of foods){const d=hypot(g.x-s.x,g.y-s.y);let left=d;
      for(let i=0;i<pts.length;i+=5)left=Math.min(left,hypot(g.x-pts[i+1],g.y-pts[i+2]));
      approachValue=Math.max(approachValue,clip((d-left)/Math.max(200,Math.min(600,d)),0,1)*g.mass/(g.mass+40));}
    return {centerValue,crowdValue,approachValue,boostCost:actions.reduce((n,a)=>n+(a.boost?Math.max(0,a.end-a.start):0),0)*(this.values.VA1_BOOST_COST??0)};
  }
  va1Compare(a,b) {
    const cost=q=>4*(q.closure?.risk??q.risk??0)-(this.values.VA1_FOOD_W??6)*((q.foodValue??0)+(q.approachValue??0))
      -.45*(this.values.VA1_CENTER_W??2)*(q.centerValue??0)-.6*(this.values.VA1_CROWD_W??2)*(q.crowdValue??0)+(q.boostCost??0);
    return cost(a)-cost(b)||(a.duration??0)-(b.duration??0);
  }
  va1Choose(routes,id) {
    routes.sort((a,b)=>this.va1Compare(a,b));const held=routes.find(q=>q.id===id),best=routes[0];
    if(!held||!best)return best;
    if((held.closure?.risk??0)>(this.values.V10_SWITCH_RISK??.75)){const safer=routes.find(q=>(q.closure?.risk??1)<held.closure.risk-.05);if(safer)return safer;}
    // Keep a safe heading unless a material food gain justifies changing it.
    return this.va1Compare(best,held)<-1&&this.va1Now-(this.va1Changed??-Infinity)>.6?(this.va1Changed=this.va1Now,best):held;
  }
  va1Local(q,s,W,ph,root,canBoost) {
    const foods=this.va1Foods(s).slice(0,4),heads=q.v10Blockers(s,W),horizon=this.values.V10_LOCAL_H??1.05;
    const targets=foods.map(g=>({angle:Math.atan2(g.y-root.st.y,g.x-root.st.x),food:g}));
    if(Number.isFinite(s.cmdNow))targets.push({angle:s.cmdNow});
    for(const offset of [0,-.25,.25,-.5,.5,-1,1,-1.5,1.5,-2,2,PI])targets.push({angle:root.st.h+offset});
    const safe=[];
    for(const target of targets)for(const boost of canBoost?[false,true]:[false]){
      // Tight turns cruise; accelerating expands the turn radius.
      if(boost&&Math.abs(wrap(target.angle-root.st.h))>.4)continue;
      if(boost&&foods.some(g=>hypot(g.x-root.st.x,g.y-root.st.y)<Math.max(90,R*s.sc*2)&&Math.abs(wrap(target.angle-Math.atan2(g.y-root.st.y,g.x-root.st.x)))<.6))continue;
      let st=root.st,t=root.t,clear=root.clear,ok=root.ok,pts=[...root.pts],first=null;const actions=[];
      if(!ok)continue;
      while(t-root.t<horizon-1e-8){const reached=target.food&&hypot(target.food.x-st.x,target.food.y-st.y)<R*s.sc+6;
        const angle=target.food&&!reached?Math.atan2(target.food.y-st.y,target.food.x-st.x):reached?st.h:target.angle;
        const near=target.food&&hypot(target.food.x-st.x,target.food.y-st.y)<Math.max(90,R*s.sc*2);
        const useBoost=boost&&!near&&Math.abs(wrap(angle-st.h))<.4;
        first??={angle,boost:useBoost};actions.push({start:t,end:t+Math.min(.12,horizon-(t-root.t)),boost:useBoost});
        const r=q.v9Roll(s,W,ph,st,0,Math.min(.12,horizon-(t-root.t)),t,angle,useBoost);clear=Math.min(clear,r.clear);
        if(!r.ok){ok=false;break;}pts.push(...r.pts);st=r.st;t=r.t;
        if(target.food&&hypot(target.food.x-st.x,target.food.y-st.y)<R*s.sc+6){const tail=q.v9Roll(s,W,ph,st,0,.45,t,st.h,false);if(!tail.ok){ok=false;break;}pts.push(...tail.pts);clear=Math.min(clear,tail.clear);st=tail.st;t=tail.t;break;}}
      if(!ok)continue;
      const u=this.va1Utility(s,pts,foods,actions),foodValue=q.v10Pellets(s,pts,t),closure=q.v10Closure(pts,heads);
      safe.push({ok:true,st,t,pts:pts.slice(root.pts.length),clear,angle:first.angle,boost:first.boost,...u,foodValue,closure,recovery:false,evaluated:t-root.t});
    }
    safe.sort((a,b)=>this.va1Compare(a,b));
    if(safe.length){const best=safe[0];if((this.values.VA1_BOOST_COST??0)===0){const fast=safe.find(r=>r.boost&&Math.abs(wrap(r.angle-best.angle))<.1&&this.va1Compare(r,best)<.15);if(fast)return fast;}return best;}
    // All unsafe: continue all turn candidates uniformly, never mark them safe.
    return Pilot.prototype.v111Local.call(q,s,W,ph,root,canBoost);
  }
  va1Route(s,ver) {const q=this.va1Core();this.va1Now=s.t;return q.va1BuildRoute(s,ver);}
  va1Step(s) {const q=this.va1Core();this.va1Now=s.t;const result=q.v111Step(s);this.last=q.last;
    const c=this.va1Crowd(s,s.x,s.y),foods=this.va1Foods(s);
    Object.assign(this.last.trace,{va1_on:1,va1_food_mass:foods[0]?.mass??0,va1_crowd:c.count,va1_phase:q.last.trace.mode==='v10emergency'?'emergency':q.last.trace.v10_pellet_value>0||foods.length?'food':'centre'});
    this.prev=result[0];this.prevBoost=result[1];return result;
  }
  va1BuildRoute(s,ver) {
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const deadline=begin+(V.V10_BUDGET??90),edge=Math.min(Math.max(V.V10_EDGE??1450,(s.viewRadius??0)*.85),W.obs-150);
    const heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3),routes=[];let expanded=0,geometry=0;const failures={};
    const result=reason=>({algo:'v10',ver,t0:s.t,routes,certified:routes.some(r=>r.certified),reason,ms:performance.now()-begin,expanded,geometry,failures,map:{radius:W.obs,target:edge},walls:W.walls});
    if(!root.ok)return result('prefix_collision');
    const accept=(guide,id)=>{
      const boostEligible=(V.V10_ESCAPE_BOOST??1)&&s.L>=(V.V2_MINL??30)&&(this.v10EscapePressure(s)||heads.some(h=>hypot(h.x-s.x,h.y-s.y)<700)||guide.foodTarget?.mass>=(V.V9_BOOST_MIN_MASS??40));
      let r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok&&r.reason!=='budget'&&!guide.useBoost&&boostEligible&&performance.now()<deadline-4){const bg={...guide,useBoost:true},br=this.v10Follow(s,PW,ph,root,bg,deadline);if(br.ok){guide=bg;r=br;}}
      if(!r.ok){failures[r.reason]=(failures[r.reason]||0)+1;return false;}
      let closure=this.v10Closure(r.pts,heads),foodValue=this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods));
      // Speed is a control choice on the same corridor, not a new direction.

      if(!guide.useBoost&&(routes.length===0||this.v10EscapePressure(s))&&boostEligible&&performance.now()<deadline-6){
        const bg={...guide,useBoost:true},br=this.v10Follow(s,PW,ph,root,bg,deadline);
        if(br.ok){const bc=this.v10Closure(br.pts,heads),bf=this.v10FoodValue(foods,this.v10FoodRewards(s,br.pts,foods));
          const current={closure,foodValue,...this.v10Utility(s,r.pts,foods,r.actions),score:0},fast={closure:bc,foodValue:bf,...this.v10Utility(s,br.pts,foods,br.actions),score:0};
          const fasterEscape=this.v10EscapePressure(s)&&br.duration+.13<r.duration&&bc.risk<=closure.risk+.02;
          const arrival=pts=>{const f=guide.foodTarget;if(!f)return Infinity;for(let i=0;i<pts.length;i+=5)if(hypot(pts[i+1]-f.x,pts[i+2]-f.y)<80)return pts[i];return Infinity;};
          const cruiseArrival=arrival(r.pts),boostArrival=arrival(br.pts);
          const fasterFood=!!guide.foodTarget&&boostArrival+.13<cruiseArrival&&bc.risk<=closure.risk+.02&&(fast.boostCost-current.boostCost)<=Math.min(1,(cruiseArrival-boostArrival)/Math.max(.13,cruiseArrival));
          if(fasterEscape||fasterFood||this.v10Compare(fast,current)<-.03){guide=bg;r=br;closure=bc;foodValue=bf;}
        }
      }
      routes.push({...guide,id,t0:s.t,geometryOnly:false,drivable:true,certified:closure.certified,closure,foodValue,...this.v10Utility(s,r.pts,foods,r.actions),pts:r.pts,actions:r.actions,clear:r.clear,duration:r.duration,length:r.travel,score:guide.score??0});return true;
    };
    // Continuous straight corridors can fit between walls even when a 32px
    // grid has no usable centre cells. Sweep them with the same turn model.
    const direct=[],angles=[root.st.h,...foods.map(g=>Math.atan2(g.y-root.st.y,g.x-root.st.x)),Math.atan2(s.wall[1]-root.st.y,s.wall[0]-root.st.x)];
    for(const w of W.walls)if(hypot((w[0]+w[2])/2-s.x,(w[1]+w[3])/2-s.y)<900){const a=Math.atan2(w[3]-w[1],w[2]-w[0]);angles.push(a,a+PI);}
    for(let k=0;k<16;k++)angles.push(k*TAU/16);
    for(const angle of angles){if(direct.some(g=>Math.abs(wrap(g.angle-angle))<.08))continue;
      const goal=[root.st.x+edge*Math.cos(angle),root.st.y+edge*Math.sin(angle)],end={x:goal[0],y:goal[1]};
      if(W.check(root.st,end,0,0,.15,false)<0)continue;
      direct.push({angle,path:[{x:root.st.x,y:root.st.y},end],goal,length:edge,kind:'direct_escape',sector:Math.floor((wrap(angle)+PI)*8/TAU)%8,lookScale:.65,useBoost:false,score:-edge});}
    const old=s.selectedGuide===undefined?this.v10Committed:s.selectedGuide;
    if(old&&s.t>=old.t0&&s.t-old.t0<2&&hypot(old.goal[0]-s.x,old.goal[1]-s.y)>180)accept(old,old.id);
    const maze=this.v10MazeGuides(s,W,root,edge,Math.min(deadline-25,begin+(V.V10_BUDGET??90)*.55),old?.goal,(V.V10_FOOD_W??2)>0?foods:[],Math.min(deadline-20,begin+(V.V10_BUDGET??90)*.7));
    expanded=maze.expanded;geometry=maze.guides.length+direct.length;
    // Independent exit sectors survive topology search; preferences rank only
    // routes that have actually been found, never eliminate search branches.
    const goals=[...direct,...maze.guides].sort((a,b)=>{
      const value=g=>{const pts=[0,s.x,s.y,s.ang,0,2,...g.goal,s.ang,0],u=this.v10Utility(s,pts,foods,[]);
        return g.length-700*(this.values.VA1_FOOD_W??6)*(u.approachValue+(g.foodTarget?g.foodTarget.mass/(g.foodTarget.mass+80):0))
          -500*(this.values.VA1_CENTER_W??2)*u.centerValue-500*(this.values.VA1_CROWD_W??2)*u.crowdValue;};
      return value(a)-value(b);
    });
    goals.sort((a,b)=>Number(b.preferred)-Number(a.preferred));
    for(const g of goals){
      if(routes.length>=Math.max(1,Math.round(V.V9_ROUTES??3))||performance.now()>deadline-2)break;
      if(routes.some(r=>r.sector===g.sector))continue;
      const id=g.preferred&&old?old.id:`${ver}:${g.kind==='food_escape'?'food'+g.foodIndex:g.sector}`;
      if(!accept(g,id)&&performance.now()<deadline-4)accept({...g,lookScale:.4},id);
      if(routes.length>=Math.max(1,Math.round(V.V9_ROUTES??3)))break;
    }
    // A geometric corridor can start behind the current turning circle.
    // Search a short collision-checked manoeuvre, then verify the resulting
    // complete guide again with the same follower used by the actuator.
    if(!routes.length&&goals.length&&performance.now()<deadline-5){
      bridge:for(const offset of [0,-.6,.6,-1.2,1.2,-2,2,Math.PI])for(const boost of [false,true]){
        if(performance.now()>deadline-5)break bridge;
        if(boost&&(!(V.V10_ESCAPE_BOOST??1)||s.L<(V.V2_MINL??30)))continue;
        const seedRoll=this.v9Roll(s,PW,ph,root.st,0,.39,root.t,root.st.h+offset,boost);
        if(!seedRoll.ok)continue;
        const seed={...seedRoll,pts:[...root.pts,...seedRoll.pts],clear:Math.min(root.clear,seedRoll.clear)};
        for(const g of goals){
          if(performance.now()>deadline-4)break bridge;
          const joined=this.v10Follow(s,PW,ph,seed,{...g,useBoost:boost},deadline);
          if(!joined.ok)continue;
          const guide={...g,useBoost:boost,kind:'maneuver_escape',entry:{until:s.t+seedRoll.t,target:root.st.h+offset,boost}};
          if(accept(guide,g.preferred&&old?old.id:`${ver}:maneuver${g.sector}`))break bridge;
        }
      }
    }
    const picked=this.v10Choose(routes,old?.id);
    if(picked){routes.splice(routes.indexOf(picked),1);routes.unshift(picked);}this.v10Committed=picked||null;
    return result(routes.length?'maze_routes':maze.reason==='maze'?'no_drivable_route':maze.reason);
  }
  // Same feedback law is used by the planner and the actuator's verifier.
  // A static polyline is only a guide; success requires reaching its goal with
  // the measured turn/speed model, queued inputs and swept collision checks.
  va1Follow(s,W,ph,root,route,deadline=Infinity,maxAhead=Infinity){
    if(!root.ok||!route.path?.length)return {ok:false,reason:'prefix'};
    const foodTarget=route.foodTarget,liveFood=foodTarget&&s.food.some((x,i)=>i%3===0&&hypot(x-foodTarget.x,s.food[i+1]-foodTarget.y)<80);
    const boostPurpose=st=>{let pressure=this.v10EscapePressure(s);for(let i=0;i<s.heads.length;i+=5)if(hypot(st.x-s.heads[i],st.y-s.heads[i+1])<700){pressure=true;break;}
      const fd=foodTarget?hypot(st.x-foodTarget.x,st.y-foodTarget.y):0,toward=foodTarget?((foodTarget.x-st.x)*Math.cos(st.h)+(foodTarget.y-st.y)*Math.sin(st.h))/Math.max(1,fd):0;
      return pressure||liveFood&&foodTarget.mass>=(this.values.V9_BOOST_MIN_MASS??40)&&fd>(this.values.V9_BOOST_MIN_DIST??180)&&toward>.7;};
    const path=route.path,goal=path[path.length-1];let st=root.st,t=root.t,clear=root.clear;
    const pts=[...root.pts],actions=[];let index=1,travel=0,reason='horizon';
    const limit=Math.min(45,Math.max(3,(route.length||2000)/Math.max(80,ph.cs)*1.8));
    for(let step=0;t-root.t<limit;step++){
      if(t-root.t>=maxAhead)return {ok:true,partial:true,pts,actions,clear,duration:t,travel};
      if((step&3)===0&&performance.now()>deadline){reason='budget';break;}
      if(route.entry&&s.t+t<route.entry.until-1e-6){
        const dt=Math.min(.13,route.entry.until-s.t-t),e=route.entry;
        const r=this.v9Roll(s,W,ph,st,0,dt,t,e.target,e.boost&&boostPurpose(st));
        clear=Math.min(clear,r.clear);if(!r.ok){reason='collision';break;}
        actions.push({start:t,end:r.t,target:e.target,boost:e.boost&&boostPurpose(st)});pts.push(...r.pts);travel+=hypot(r.st.x-st.x,r.st.y-st.y);st=r.st;t=r.t;continue;
      }
      let nearest=Infinity,projection=null;
      for(let i=index;i<(step===0?path.length:Math.min(path.length,index+25));i++){
        const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,len=hypot(dx,dy);
        const u=clip(((st.x-a.x)*dx+(st.y-a.y)*dy)/Math.max(1,len*len),0,1),d=hypot(st.x-a.x-u*dx,st.y-a.y-u*dy);
        if(d<nearest){nearest=d;projection={i,u,len};}
      }
      if(!projection){reason='empty';break;}
      index=projection.i;
      // Short lookahead tracks narrow corridors; longer lookahead is not a
      // license to cut corners: every resulting curved motion is swept below.
      let remaining=Math.max(24,st.v*.22)*(route.lookScale||1),i=index,u=projection.u,aim;
      for(;i<path.length;i++){
        const a=path[i-1],b=path[i],len=hypot(b.x-a.x,b.y-a.y),available=len*(1-u);
        if(remaining<=available||i===path.length-1){const f=Math.min(1,u+remaining/Math.max(1,len));aim={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};break;}
        remaining-=available;u=0;
      }
      const angle=Math.atan2(aim.y-st.y,aim.x-st.x),distance=hypot(goal.x-st.x,goal.y-st.y);
      let boost=this.v10DefaultBoost(s)&&Math.abs(wrap(angle-st.h))<.3&&distance>Math.max(90,R*s.sc*2)||s.L>=(this.values.V2_MINL??30)&&boostPurpose(st) && !!route.useBoost && !!(this.values.V10_ESCAPE_BOOST??1) && Math.abs(wrap(angle-st.h))<.35 && distance>180;
      let r=this.v9Roll(s,W,ph,st,0,.13,t,angle,boost);
      if(!r.ok&&boost&&this.v10DefaultBoost(s)){const cruise=this.v9Roll(s,W,ph,st,0,.13,t,angle,false);if(cruise.ok){r=cruise;boost=false;}}
      clear=Math.min(clear,r.clear);
      if(!r.ok){reason='collision';break;}
      actions.push({start:t,end:r.t,target:angle,boost});pts.push(...r.pts);travel+=hypot(r.st.x-st.x,r.st.y-st.y);st=r.st;t=r.t;
      if(hypot(goal.x-st.x,goal.y-st.y)<Math.max(25,st.v*.14)){
        // Reject a dead end whose goal is clear but whose continuation is not.
        const tail=this.v9Roll(s,W,ph,st,0,.6,t,st.h,false);
        if(!tail.ok)return {ok:false,reason:'terminal',pts,actions,clear};
        pts.push(...tail.pts);
        return {ok:true,pts,actions,clear:Math.min(clear,tail.clear),duration:tail.t,travel,st:tail.st};
      }
    }
    return {ok:false,reason,pts,actions,clear};
  }
  va1FeedPrefix(s,W,ph,root,route,deadline) {
    if(route.entry && s.t+root.t<route.entry.until)return route;
    const weight=this.values.V10_FOOD_W??2;if(weight<=0){this.v10FeedTarget=null;return route;}
    const nominal=this.v10Pellets(s,route.pts,root.t+1),targets=[],feedHeads=this.v10Blockers(s,W);
    let held=this.v10FeedTarget;
    if(held&&(held.routeId!==route.id||s.t-held.t>(this.values.V9_TARGET_HOLD??1.2)||hypot(held.x-s.x,held.y-s.y)<14.5*s.sc+6||!s.food.some((x,i)=>i%3===0&&hypot(x-held.x,s.food[i+1]-held.y)<12)))held=null;
    this.v10FeedTarget=held;
    for(let i=0;i<s.food.length;i+=3){const d=hypot(s.food[i]-s.x,s.food[i+1]-s.y);if(d>300||d<14.5*s.sc*.6)continue;
      targets.push({x:s.food[i],y:s.food[i+1],value:s.food[i+2]*(s.food[i+2]>=(this.values.V9_REMAINS_MIN??12)?4:1)/(d+30)});}
    targets.sort((a,b)=>b.value-a.value);if(held)targets.unshift({...held,held:true});let best=route,bestScore=weight*nominal;const headings=[];
    for(const g of targets){
      if(performance.now()>deadline-2||headings.length>=3)break;
      const angle=Math.atan2(g.y-root.st.y,g.x-root.st.x);if(headings.some(a=>Math.abs(wrap(a-angle))<.15))continue;headings.push(angle);
      // Aim at the pellet again after each curved step. A fixed bearing
      // misses side pellets because the head cannot turn instantaneously.
      let st=root.st,t=root.t,clear=root.clear,ok=true,reached=false;const foodPts=[...root.pts],foodActions=[];
      const reach=14.5*s.sc+6,limit=Math.min(2.4,hypot(g.x-st.x,g.y-st.y)/Math.max(80,st.v)*2+.5);
      while(t-root.t<limit){
        if(performance.now()>deadline-2){ok=false;break;}
        if(hypot(g.x-st.x,g.y-st.y)<reach){reached=true;break;}
        const target=Math.atan2(g.y-st.y,g.x-st.x);let boost=this.v10DefaultBoost(s)&&Math.abs(wrap(target-st.h))<.35&&hypot(g.x-st.x,g.y-st.y)>Math.max(90,R*s.sc*2),r=this.v9Roll(s,W,ph,st,0,.1,t,target,boost);
        if(!r.ok&&boost){r=this.v9Roll(s,W,ph,st,0,.1,t,target,false);boost=false;}
        if(!r.ok){ok=false;break;}clear=Math.min(clear,r.clear);foodPts.push(...r.pts);foodActions.push({start:t,end:r.t,target,boost});st=r.st;t=r.t;
      }
      if(!ok||!reached||!foodActions.length)continue;
      const r={ok:true,st,t,clear,pts:foodPts},joinRoot=r;
      const joined=this.v10Follow(s,W,ph,joinRoot,route,deadline,1.2);if(!joined.ok)continue;
      // The detour must reconnect near the chosen corridor, not invent a new
      // strategy. Near-term collision checking includes the return manoeuvre.
      const end=joined.pts.length-5;let gap=Infinity;
      for(const p of route.path)gap=Math.min(gap,hypot(p.x-joined.pts[end+1],p.y-joined.pts[end+2]));
      // Use segments too: visibility-simplified guides have sparse vertices.
      for(let i=1;i<route.path.length;i++){const a=route.path[i-1],b=route.path[i],dx=b.x-a.x,dy=b.y-a.y,u=clip(((joined.pts[end+1]-a.x)*dx+(joined.pts[end+2]-a.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1);gap=Math.min(gap,hypot(joined.pts[end+1]-a.x-u*dx,joined.pts[end+2]-a.y-u*dy));}
      if(gap>60)continue;
      const food=this.v10Pellets(s,joined.pts,t+1.2),feedRisk=this.v10Closure(joined.pts,feedHeads).risk;
      const baseRisk=this.v10Closure(route.pts.filter((_,i)=>route.pts[i-i%5]<=t+1.2),feedHeads).risk,riskDelta=Math.max(0,feedRisk-baseRisk);
      const appetite=clip((this.values.V10_FOOD_RISK??0)/100,0,1),score=weight*food-gap*.003-(8-7*appetite)*riskDelta;
      if(food>0&&(g.held&&riskDelta<=.02||score>bestScore+.02)){bestScore=score;best={...route,feedTarget:g,feedPrefix:joined.pts,feedValue:food,actions:[...foodActions,...joined.actions],clear:Math.min(r.clear,joined.clear)};}
      if(g.held&&best.feedPrefix)break;
    }
    if(best.feedTarget)this.v10FeedTarget={x:best.feedTarget.x,y:best.feedTarget.y,routeId:route.id,t:held&&best.feedTarget.held?held.t:s.t};
    else if(performance.now()<deadline-2)this.v10FeedTarget=null;
    if(best.feedPrefix){
      const full=[...best.feedPrefix],end=full.length-5,original=route.pts;let nearest=Infinity,idx=-1;
      for(let i=0;i<original.length;i+=5){const d=hypot(original[i+1]-full[end+1],original[i+2]-full[end+2]);if(d<nearest){nearest=d;idx=i;}}
      if(idx>=0){const shift=full[end]-original[idx];for(let i=idx+5;i<original.length;i+=5)full.push(original[i]+shift,...original.slice(i+1,i+5));}
      best={...best,pts:full,feedPrefix:full,closure:this.v10Closure(full,feedHeads)};
    }
    return best;
  }
  // V10-1 shares the exact V8-1 switch and persistent original controllers.
  v101Values(avoid) {
    return {...this.values, V101_ON:0,V11_ON:0,V102_ON:0,V111_ON:avoid?(this.values.V111_ON??0):0,V10_ON:avoid?1:0,V9_ON:0,V8_ON:0,V7_ON:0,V6_ON:0,V41_ON:0,V5_ON:0,V4_ON:0,V3_ON:0,V2_ON:0,PROBE_ON:0};
  }
  v101Step(s) {
    const K=this.v101||(this.v101={phase:'feed',clearSince:null});
    const fallback=()=>this.values.V11_ON?v11Choice(K,s,this.values):v8Choice(K,countHeads(s,this.values.V8_HEAD_R??450),s.t,this.values,
      this.values.V81_BODY_ON?bodyDensity(s,this.values.V81_BODY_R??450,this.values.V81_BODY_NEAR_W??2,this.values.V81_BODY_SELF_W??.1):0);
    const c=s.v8Control||v101Choice(K,s,this.values,()=>this.values.V102_ON?v102Choice(K,s,this.values,fallback):fallback());
    const key=c.phase==='avoid'?'v101Avoid':'v101Feed';
    if(!this[key])this[key]=new Pilot(this.v101Values(c.phase==='avoid'),this.profile);
    const child=this[key];TURN_FIX=!!child.values.TURN_FIX;
    if((c.switched||c.wrap?.id!==this.v101WrapId)&&c.phase==='avoid'){child.v10Held=null;child.v10Committed=null;child.v10Invalid=null;child.v10FeedTarget=null;}
    const state=c.phase==='avoid'?{...s,route:(c.switched||c.wrapChanged)?null:s.route,selectedGuide:(c.switched||c.wrapChanged)?null:s.selectedGuide}:{...s,route:null,selectedGuide:null,threat:null};
    const result=c.wrap?child.v101WrapStep({...state,wrapEscape:c.wrap}):child.step(state);this.v101WrapId=c.wrap?.id;this.last=child.last;
    Object.assign(this.last.trace,{v101_wrap_on:this.values.V101_WRAP_ON?1:0,v101_wrap_active:c.wrap?1:0,v101_wrap_id:c.wrap?.id??null,v101_wrap_cov:c.wrap?.coverage??0,v101_wrap_angle:c.wrap?.angle??null,v102_on:this.values.V102_ON?1:0,v102_food_mass:c.foodMass??null,v102_food_threshold:c.foodThreshold??null,v102_food_enabled:c.foodEnabled??0,v101_on:1,v11_on:this.values.V11_ON?1:0,v11_head_distance:Number.isFinite(c.headDistance)?c.headDistance:null,v11_body_gap:Number.isFinite(c.bodyGap)?c.bodyGap:null,v8_phase:c.phase,v8_heads:c.heads,v8_radius:c.radius,v8_threshold:c.threshold,v8_switched:c.switched,v81_on:this.values.V81_BODY_ON?1:0,v81_density:c.bodyDensity??0,v81_body_trigger:c.bodyTrigger??0,v81_reason:c.reason||''});
    this.prev=result[0];this.prevBoost=result[1];return result;
  }

  v8Values(six) {
    return {...this.values, V8_ON: 0, V7_ON: 0, V6_ON: six ? 1 : 0,
      V41_ON: 0, V5_ON: 0, V4_ON: 0, V3_ON: 0, V2_ON: 0, PROBE_ON: 0};
  }
  v8Route(s, ver) {
    if (!this.v8Plan) this.v8Plan = new Pilot(this.v8Values(true), this.profile);
    TURN_FIX = !!this.v8Plan.values.TURN_FIX;
    return this.v8Plan.v6Route(s, ver);
  }
  v8Step(s) {
    const K = this.v8 || (this.v8 = {phase: 'feed', clearSince: null});
    // Browser decides before observing, so each branch receives its original observation radius.
    const c = s.v8Control || v8Choice(K, countHeads(s, this.values.V8_HEAD_R ?? 450), s.t, this.values,
      this.values.V81_BODY_ON ? bodyDensity(s, this.values.V81_BODY_R ?? 450, this.values.V81_BODY_NEAR_W ?? 2, this.values.V81_BODY_SELF_W ?? .1) : 0);
    const key = c.phase === 'avoid' ? 'v8Avoid' : 'v8Feed';
    if (!this[key]) this[key] = new Pilot(this.v8Values(c.phase === 'avoid'), this.profile);
    const child = this[key]; TURN_FIX = !!child.values.TURN_FIX;
    const result = child.step(s); this.last = child.last;
    Object.assign(this.last.trace, {v8_phase: c.phase, v8_heads: c.heads, v8_radius: c.radius,
      v8_threshold: c.threshold, v8_switched: c.switched,
      v81_on: this.values.V81_BODY_ON ? 1 : 0, v81_density: c.bodyDensity ?? 0,
      v81_body_trigger: c.bodyTrigger ?? 0, v81_reason: c.reason || ''});
    this.prev = result[0]; this.prevBoost = result[1]; return result;
  }

  // V7 switches between the unchanged V1 feed controller and V6 escape controller.
  // Each controller owns its history; no mode flag is mutated in the user's settings.
  v7Values(six) {
    return {...this.values, V7_ON: 0, V6_ON: six ? 1 : 0, V41_ON: 0, V5_ON: 0, V4_ON: 0, V3_ON: 0, V2_ON: 0, PROBE_ON: 0};
  }
  v7Route(s, ver) {
    if (!this.v7Plan) this.v7Plan = new Pilot(this.v7Values(true), this.profile);
    return this.v7Plan.v6Route({...s, v7Escape: true}, ver);
  }
  v7Step(s) {
    const V = this.values, radius = V.V7_HEAD_R ?? 450, threshold = Math.max(1, Math.round(V.V7_HEAD_N ?? 3));
    const count = countHeads(s, radius), K = this.v7 || (this.v7 = {phase: 'feed', clearSince: null});
    const previous = K.phase;
    if (count >= threshold) { K.phase = 'avoid'; K.clearSince = null; }
    else if (K.phase === 'avoid') {
      if (K.clearSince === null) K.clearSince = s.t;
      if (s.t - K.clearSince >= (V.V7_CLEAR_S ?? 1)) { K.phase = 'feed'; K.clearSince = null; }
    }
    const key = K.phase === 'avoid' ? 'v7Avoid' : 'v7Feed', changed = K.phase !== previous;
    if (!this[key] || changed) {
      this[key] = new Pilot(this.v7Values(K.phase === 'avoid'), this.profile);
      this[key].prev = Number.isFinite(s.cmdNow) ? s.cmdNow : (this.prev ?? s.ang);
      this[key].prevBoost = typeof s.boostNow === 'boolean' ? s.boostNow : this.prevBoost;
    }
    // Never consume an old food guide as an escape instruction.
    const state = K.phase === 'avoid' ? {...s, route: s.route?.intent === 'escape' ? s.route : null} : s;
    const result = this[key].step(state); this.last = this[key].last;
    Object.assign(this.last.trace, {v7_phase: K.phase, v7_heads: count, v7_radius: radius, v7_threshold: threshold, v7_switched: changed ? 1 : 0});
    this.prev = result[0]; this.prevBoost = result[1]; return result;
  }

  step(s) {
    if (this.values.T4_ON) return this.t4Step(s);
    if (this.values.T3_ON) return this.t3Step(s);
    if (this.values.T2_ON) return this.t2Step(s);
    if (this.values.T1_ON) return this.t1Step(s);
    if (this.values.VA1_ON) return this.va1Step(s);
    if (this.values.V101_ON) return this.v101Step(s);
    if (this.values.V111_ON) return this.v111Step(s);
    if (this.values.V10_ON) return this.v10Step(s);
    if (this.values.V9_ON) return this.v9Step(s);
    if (this.values.V8_ON) return this.v8Step(s);
    if (this.values.V7_ON) return this.v7Step(s);
    if (this.values.V6_ON) return this.v6Step(s);
    if (this.values.V41_ON) return this.v41Step(s);
    if (this.values.V5_ON) return this.v5Step(s);
    if (this.values.V4_ON) return this.v4Step(s);
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

root.SlpPilot = {Pilot, makeParams, countHeads, bodyDensity, v8Choice, v11Choice, v102Choice, v101Wrap, v101Choice, R, paths, ANGLES};        // paths/ANGLES: research/param_replay.mjs
}
slpPilotModule(typeof window !== 'undefined' ? window : globalThis);
