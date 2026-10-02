// Offline check of the probe follower: a static laid trail (arc), our snake moves by the pilot's own kinematics (turn
// rate by sc, cruise speed) with a 0.1 s command delay; does the drawn gap converge to each level and step down?
//   node research/probe_sim.mjs [our_sc] [target_sc] [curvature 1/px]
import fs from 'node:fs'; import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const [, , scO = '1.5', scT = '2.5', curv = '0'] = process.argv;
const R = 14.5, sc = +scO, rt = R * (+scT), kappa = +curv;
const trail = []; let x = 0, y = 0, h = 0;                 // 3000 px arc, points every 20 px, tail -> head
for (let i = 0; i < 150; i++) { trail.push([x, y]); x += 20 * Math.cos(h); y += 20 * Math.sin(h); h += 20 * kappa; }
const segs = [], sid = [];
for (let i = 0; i + 1 < trail.length; i++) { segs.push(trail[i][0], trail[i][1], trail[i + 1][0], trail[i + 1][1], rt); sid.push(7); }
const head = trail[trail.length - 1];
const P = {...params.defaults, ...params.profiles.aggressive, PROBE_ON: 1};
const pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive');
const turn = s => (s <= 1 ? 230 : s <= 1.5 ? 230 - (s - 1) * 30 : s <= 2 ? 215 - (s - 1.5) * 78 : s <= 2.5 ? 176 - (s - 2) * 58 : 147 - (s - 2.5) * 42) * Math.PI / 180;
const v = 5.8 * 31; let px = 300, py = -160, ang = 0, T = 0; const dt = 1 / 30, q = []; let out = [];
for (let k = 0; k < 30 * 60; k++) {
  const s = {x: px, y: py, ang, sp: 5.8, sc, t: T, L: 500, wall: [0, 0, 1e6], segs: Float64Array.from(segs), sid: Float64Array.from(sid),
    heads: Float64Array.from([head[0], head[1], h, 5.8, +scT]), hid: Float64Array.from([7]), food: new Float64Array(0), own: Float64Array.from([px, py])};
  const [cmd] = pilot.step(s); const tr = pilot.last.trace;
  q.push(cmd); const c = q.length > 3 ? q.shift() : q[0];             // 0.1 s delay
  const d = Math.max(-turn(sc) * dt, Math.min(turn(sc) * dt, ((c - ang + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI));
  ang += d; px += v * dt * Math.cos(ang); py += v * dt * Math.sin(ang); T += dt;
  out.push([T.toFixed(2), tr.pph, tr.pset, tr.pgap, tr.pstab]);
  if (tr.pgap !== null && tr.pgap < -30) break;
}
const fol = out.filter(o => o[1] === 1);
const levels = [...new Set(fol.map(o => o[2]))];
console.log(`sc ${sc} rt ${rt.toFixed(1)} curv ${kappa}: ticks ${out.length}, follow ${fol.length}, phases`, out.reduce((a, o) => (a[o[1]] = (a[o[1]] || 0) + 1, a), {}), 'levels', levels.join(' '));
for (const L of levels) { const g = fol.filter(o => o[2] === L).map(o => o[3]); console.log(`  set ${L}: n ${g.length}, gap first ${g[0]} last ${g[g.length - 1]}, |err| median ${g.map(x => Math.abs(x - L)).sort((a, b) => a - b)[g.length >> 1]}`); }
