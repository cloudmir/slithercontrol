// Narrowing-corridor scenario (user 2026-09-26), closed loop: wall A (a static body) on one side, B running alongside
// on the other, B cuts in toward our path after tCut. Our snake follows ext/pilot.js with 0.1 s command delay.
// Survival with SQUEEZE_ON 0 vs 1 over B's lead, gaps and cut timing.   node ext/test/squeeze_sim.mjs
import fs from 'node:fs'; import vm from 'node:vm';
import path from 'node:path'; import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
vm.runInThisContext(fs.readFileSync(path.join(here, '..', 'pilot.js'), 'utf8'));
const params = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'params.json'), 'utf8'));
const {Pilot} = globalThis.SlpPilot;
const R = 14.5, PX = 31, DT = 1 / 30, SC = 1.2, SCB = 1.6;
const rad = d => d * Math.PI / 180;
const turnRate = sc => rad(sc <= 2 ? 230 - 30 * (sc - 1) : 200 - 70 * (sc - 2) / 1.5);
const wrap = a => { let m = (a + Math.PI) % (2 * Math.PI); if (m < 0) m += 2 * Math.PI; return m - Math.PI; };
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / Math.max(dx * dx + dy * dy, 1e-9)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function run({lead, gapA, gapB, tCut, cutDeg, on, profile}) {
  const ro = R * SC, rA = R * 1.4, rB = R * SCB;
  // centre lines: A at +y, B at -y, drawn gaps gapA / gapB from our body at y = 0
  const yA = ro + rA + gapA, yB = -(ro + rB + gapB);
  const A = []; for (let x = -800; x <= 2400; x += 20) A.push([x, yA]);
  const B = []; for (let x = lead - 900; x <= lead; x += 20) B.push([x, yB]);      // tail -> head
  let bh = {x: lead, y: yB, ang: 0, turned: 0};
  const me = {x: 0, y: 0, ang: 0, sp: 5.8, boost: false}, own = []; for (let x = -400; x < 0; x += 20) own.push([x, 0]);
  const pilot = new Pilot({...params.defaults, ...params.profiles[profile], SQUEEZE_ON: on ? 1 : 0}, profile);
  const queue = [[0, false], [0, false], [0, false]];
  let detected = 0;
  for (let k = 0; k < 150; k++) {                       // 5 s
    const t = k * DT;
    const segs = [], sid = [];
    for (let i = 1; i < A.length; i++) { segs.push(A[i - 1][0], A[i - 1][1], A[i][0], A[i][1], rA); sid.push(1); }
    for (let i = 1; i < B.length; i++) { segs.push(B[i - 1][0], B[i - 1][1], B[i][0], B[i][1], rB); sid.push(2); }
    const s = {x: me.x, y: me.y, ang: me.ang, sp: me.sp, sc: SC, L: 400, t, boost: me.boost, wall: [0, 0, 1e5],
      segs: Float64Array.from(segs), sid: Float64Array.from(sid), heads: Float64Array.from([bh.x, bh.y, bh.ang, 5.9, SCB]),
      hid: Float64Array.from([2]), food: new Float64Array(0), own: Float64Array.from(own.flat().concat([me.x, me.y]))};
    queue.push(pilot.step(s));
    if (pilot.last.trace.squeeze) detected++;
    const [cmd, boost] = queue.shift();
    // our motion
    const w = turnRate(SC) * DT;
    me.ang = wrap(me.ang + Math.max(-w, Math.min(w, wrap(cmd - me.ang))));
    const target = boost ? 14 : 5.8, acc = (14 - 5.8) / .57 * DT;
    me.sp += Math.max(-acc, Math.min(acc, target - me.sp)); me.boost = boost;
    me.x += me.sp * PX * DT * Math.cos(me.ang); me.y += me.sp * PX * DT * Math.sin(me.ang);
    own.push([me.x, me.y]); if (own.length > 40) own.shift();
    // B: straight, then cuts in toward +y (our side) by cutDeg at full turn rate
    if (t >= tCut && bh.turned < rad(cutDeg)) { const st = Math.min(turnRate(SCB) * DT, rad(cutDeg) - bh.turned); bh.ang += st; bh.turned += st; }
    bh.x += 5.9 * PX * DT * Math.cos(bh.ang); bh.y += 5.9 * PX * DT * Math.sin(bh.ang);
    B.push([bh.x, bh.y]); B.shift();
    // contact: our head against A or B (centre distance below the two radii)
    for (const [P, r] of [[A, rA], [B, rB]])
      for (let i = 1; i < P.length; i++) if (segDist(me.x, me.y, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]) < ro + r) return {dead: true, t: +t.toFixed(2), detected};
    if (Math.hypot(me.x - bh.x, me.y - bh.y) < ro + rB) return {dead: true, t: +t.toFixed(2), detected};
  }
  return {dead: false, detected};
}

const cases = [];
for (const profile of ['aggressive', 'safe'])
  for (const lead of [-150, 50, 250])
    for (const [gapA, gapB] of [[50, 45], [100, 80]])
      for (const tCut of [.4, 1.0])
        cases.push({profile, lead, gapA, gapB, tCut, cutDeg: 55});
const tally = {off: 0, on: 0, onDetected: 0, n: cases.length}, rows = [];
for (const c of cases) {
  const off = run({...c, on: false}), on = run({...c, on: true});
  tally.off += off.dead ? 0 : 1; tally.on += on.dead ? 0 : 1; tally.onDetected += on.detected > 0 ? 1 : 0;
  if (off.dead !== on.dead) rows.push({...c, off: off.dead ? `죽음 ${off.t}s` : '생존', on: on.dead ? `죽음 ${on.t}s` : '생존'});
}
console.log(JSON.stringify(tally));
for (const r of rows) console.log(JSON.stringify(r));
