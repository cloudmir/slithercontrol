// Shared physics for the maze/route oracles: same formulas as ext/pilot.js (TURN_FIX table on, cruise table, ramp).
export const R = 14.5, PX = 31, BOOST_SP = 14, RAMP = .57, LAT = .1;
export const PI = Math.PI, TAU = 2 * Math.PI;
export const wrap = a => { let m = (a + PI) % TAU; if (m < 0) m += TAU; return m - PI; };
export const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export function interp(x, xs, ys) { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const f = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + f * (ys[i] - ys[i - 1]); } return ys[ys.length - 1]; }
export const cruiseSp = sc => interp(sc, [1, 1.4, 1.9, 2.6, 3.5], [5.79, 5.89, 6.12, 6.33, 6.83]);
export const turnRate = sc => interp(sc, [1, 1.5, 2, 2.5, 3, 3.5], [230, 215, 176, 147, 126, 110]) * PI / 180;   // TURN_FIX table (default on)
export const thickOff = r => interp(r, [R, 2 * R, 3.5 * R], [0, 0, 0]);       // pad handled by V2_BODY_PAD (Codex: no double correction)
// one physics step (dt s) toward cmd {ang, boost}; midpoint angle/speed integration
export function advance(s, cmd, dt, sc) {
  const w = turnRate(sc), cs = cruiseSp(sc), target = cmd.boost ? BOOST_SP : cs, dv = (BOOST_SP - cs) / RAMP;
  const da = wrap(cmd.ang - s.ang), ang = s.ang + Math.sign(da) * Math.min(Math.abs(da), w * dt);
  const sp = s.sp < target ? Math.min(target, s.sp + dv * dt) : Math.max(target, s.sp - dv * dt);
  const am = s.ang + wrap(ang - s.ang) / 2, vm = (s.sp + sp) / 2 * PX;
  return {x: s.x + vm * dt * Math.cos(am), y: s.y + vm * dt * Math.sin(am), ang, sp};
}
// min distance between segment a (p->q) and segment b (u->v)
export function segSegDist(px, py, qx, qy, ux, uy, vx, vy) {
  const d1x = qx - px, d1y = qy - py, d2x = vx - ux, d2y = vy - uy, rx = px - ux, ry = py - uy;
  const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry;
  let s = 0, t = 0;
  if (a <= 1e-9 && e <= 1e-9) return Math.hypot(rx, ry);
  if (a <= 1e-9) t = clip(f / e, 0, 1);
  else { const c = d1x * rx + d1y * ry;
    if (e <= 1e-9) s = clip(-c / a, 0, 1);
    else { const b = d1x * d2x + d1y * d2y, den = a * e - b * b; s = den !== 0 ? clip((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e; if (t < 0) { t = 0; s = clip(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clip((b - c) / a, 0, 1); } } }
  const cx = px + d1x * s - (ux + d2x * t), cy = py + d1y * s - (uy + d2y * t);
  return Math.hypot(cx, cy);
}
