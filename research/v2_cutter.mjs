// Reactive "cutter" oracle: from LEAD s before the end of each recorded game, drive our snake with V2 against the recorded
// world PLUS a synthetic attacker that boosts (434 px/s) and steers toward a lead point ahead of our head, laying its body
// behind it. We die on its body (gap < -5); it dies on ours (its head within its radius + ro of our recent path).
//   node research/v2_cutter.mjs '{"V2_ON":1}' runs/dir ...   env LEAD=10 CUT_R=15 CUT_D=700 CUT_BEAR=45,135,225,315 CUT_LEAD=0.5 SIM=8
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm'; import path from 'node:path';
vm.runInThisContext(fs.readFileSync(process.env.PILOT || 'ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const over = JSON.parse(process.argv[2] || '{}'), LEAD = +(process.env.LEAD || 10), SIM = +(process.env.SIM || 8), R = 14.5, PX = 31, BOOST = 14, RAMP = .57;
const CUT_R = +(process.env.CUT_R || 15), CUT_D = +(process.env.CUT_D || 700), CUT_LEAD = +(process.env.CUT_LEAD || .5), CUT_LEN = +(process.env.CUT_LEN || 900);
const BEARS = (process.env.CUT_BEAR || '45,135,225,315').split(',').map(Number);
const P = {...params.defaults, ...params.profiles.aggressive, ...over};
const wrap = a => { let m = (a + Math.PI) % (2 * Math.PI); if (m < 0) m += 2 * Math.PI; return m - Math.PI; };
const turn = sc => (sc <= 1 ? 230 : sc <= 1.5 ? 230 - (sc - 1) * 30 : sc <= 2 ? 215 - (sc - 1.5) * 78 : sc <= 2.5 ? 176 - (sc - 2) * 58 : sc <= 3 ? 147 - (sc - 2.5) * 42 : Math.max(110, 126 - (sc - 3) * 32)) * Math.PI / 180;
const cruise = sc => 5.79 + Math.min(1, Math.max(0, (sc - 1) / 2.5)) * 1.04;
function segGap(x, y, s, n, ro) { let g = 1e9; for (let k = 0; k < n; k++) { const x1 = s[5*k], y1 = s[5*k+1], dx = s[5*k+2]-x1, dy = s[5*k+3]-y1, l2 = dx*dx+dy*dy;
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((x-x1)*dx+(y-y1)*dy)/l2)); const d = Math.hypot(x-x1-t*dx, y-y1-t*dy) - s[5*k+4] - ro; if (d < g) g = d; } return g; }
const results = [];
for (const d of process.argv.slice(3)) for (const f of fs.readdirSync(d).filter(x => /_box\.json\.gz$/.test(x)).sort()) {
  const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, f))).toString()).frames;
  if (fr.length < 100) continue;
  const T = fr[fr.length - 1].t; let i0 = fr.findIndex(x => T - x.t <= LEAD); if (i0 < 0) continue;
  for (const bear of BEARS) {
    const s0 = fr[i0], modes = {}; let certN = 0; let x = s0.x, y = s0.y, ang = s0.ang, v = s0.sp * PX, sc = s0.sc, ro = R * sc;
    const csc = CUT_R / R, cw = turn(csc), cv = BOOST * PX;
    let cx = x + CUT_D * Math.cos(ang + bear * Math.PI / 180), cy = y + CUT_D * Math.sin(ang + bear * Math.PI / 180), ca = Math.atan2(y - cy, x - cx), cAlive = true;
    const cpath = [cx, cy], own = [];                               // attacker's laid body (head path), our head path
    const pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive');
    let died = null, killed = null, cmdQ = [[ang, false]], minGap = 1e9, boostT = 0, t0 = s0.t, tEnd = Math.min(T, s0.t + SIM), lastT = s0.t;
    for (let i = i0; i < fr.length && fr[i].t <= tEnd + 1e-6; i++) {
      const frame = fr[i], dt = i > i0 ? frame.t - fr[i - 1].t : 0; lastT = frame.t;
      if (dt > 0) {
        const [c, b] = cmdQ.length > 3 ? cmdQ.shift() : cmdQ[0];
        const dd = wrap(c - ang); ang += Math.sign(dd) * Math.min(Math.abs(dd), turn(sc) * dt);
        const want = (b ? BOOST : cruise(sc)) * PX, rate = (BOOST - cruise(sc)) * PX / RAMP;
        v = v < want ? Math.min(want, v + rate * dt) : Math.max(want, v - rate * dt);
        x += v * dt * Math.cos(ang); y += v * dt * Math.sin(ang); if (b) boostT += dt; own.push(x, y);
        if (cAlive) {                                                // attacker: aim at our lead point, boost
          const lx = x + v * CUT_LEAD * Math.cos(ang), ly = y + v * CUT_LEAD * Math.sin(ang);
          const da = wrap(Math.atan2(ly - cy, lx - cx) - ca); ca += Math.sign(da) * Math.min(Math.abs(da), cw * dt);
          cx += cv * dt * Math.cos(ca); cy += cv * dt * Math.sin(ca); cpath.push(cx, cy);
          // it dies on our body (our head path older than 0.3 s, within its head radius + ro)
          for (let k = 0; k < own.length - 20; k += 2) if (Math.hypot(own[k] - cx, own[k + 1] - cy) < CUT_R + ro) { cAlive = false; killed = frame.t - t0; break; }
        }
        // our death: recorded bodies/wall or the attacker's body (its path, radius CUT_R, up to CUT_LEN px behind its head)
        let g = frame.wall[2] - Math.hypot(x - frame.wall[0], y - frame.wall[1]) - ro;
        g = Math.min(g, segGap(x, y, frame.segs, frame.sid.length, ro));
        if (cAlive || killed !== null) { let len = 0; for (let k = cpath.length - 2; k >= 2 && len < CUT_LEN; k -= 2) {
          const x1 = cpath[k - 2], y1 = cpath[k - 1], x2 = cpath[k], y2 = cpath[k + 1]; len += Math.hypot(x2 - x1, y2 - y1);
          const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, tt = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2));
          const dd = Math.hypot(x - x1 - tt * dx, y - y1 - tt * dy) - CUT_R - ro; if (dd < g) g = dd; } }
        if (g < minGap) minGap = g;
        if (g < -5) { died = frame.t - t0; break; }
      }
      // observation = recorded frame + attacker (head + body segments)
      const segs = Array.from(frame.segs), sid = Array.from(frame.sid), heads = Array.from(frame.heads), hid = Array.from(frame.hid);
      if (cAlive) { let len = 0; for (let k = cpath.length - 2; k >= 2 && len < CUT_LEN; k -= 2) { segs.push(cpath[k - 2], cpath[k - 1], cpath[k], cpath[k + 1], CUT_R); sid.push(999999); len += Math.hypot(cpath[k] - cpath[k - 2], cpath[k + 1] - cpath[k - 1]); }
        heads.push(cx, cy, ca, BOOST, csc); hid.push(999999); }
      const st = {x, y, ang, sp: v / PX, sc, t: frame.t, L: frame.L, wall: frame.wall, segs: Float64Array.from(segs), sid: Float64Array.from(sid),
        heads: Float64Array.from(heads), hid: Float64Array.from(hid), food: Float64Array.from(frame.food), own: Float64Array.from(frame.own)};
      const [cmd, boost] = pilot.step(st); cmdQ.push([cmd, boost]); const md = pilot.last.trace.mode; modes[md] = (modes[md] || 0) + 1; if (pilot.last.trace.v3_cert) certN++;
    }
    results.push({modes, certN, game: `${d.split('/').pop().slice(-6)}/${f.slice(0, 6)}`, bear, died, killed, minGap: +minGap.toFixed(1), simT: +(lastT - t0).toFixed(1), boost: +(boostT / Math.max(.1, lastT - t0)).toFixed(2)});
  }
}
const n = results.length, surv = results.filter(r => r.died === null).length, kills = results.filter(r => r.killed !== null && r.died === null).length;
console.log(`cutter r${CUT_R} from ${CUT_D}px bearings ${BEARS.join('/')} lead ${CUT_LEAD}s, LEAD ${LEAD}s sim ${SIM}s: scenarios ${n}, we survive ${surv}/${n} (${(surv / n * 100).toFixed(0)}%), attacker dies on our body ${results.filter(r => r.killed !== null).length}, boost share median ${results.map(r => r.boost).sort((a, b) => a - b)[n >> 1]}`);
if (process.env.VERBOSE) for (const r of results) console.log(`  ${r.game} bear ${r.bear} ${r.died === null ? 'ALIVE' : 'died +' + r.died.toFixed(1)} ${r.killed !== null ? 'attacker died +' + r.killed.toFixed(1) : ''} minGap ${r.minGap} boost ${r.boost} cert ${r.certN} modes ${JSON.stringify(r.modes)}`);
