// Closed-loop oracle: from LEAD s before each recorded death, drive our snake with V2 against the recorded world (enemies
// replay exactly as recorded, they do not react) and see whether we still hit a body by the recorded death time.
//   node research/v2_rollout.mjs '{"V2_ON":1}' runs/dirA runs/dirB ...     (env LEAD=8)
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm'; import path from 'node:path';
vm.runInThisContext(fs.readFileSync(process.env.PILOT || 'ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const over = JSON.parse(process.argv[2] || '{}'), LEAD = +(process.env.LEAD || 8), R = 14.5, PX = 31, BOOST = 14, RAMP = .57;
const P = {...params.defaults, ...params.profiles.aggressive, ...over};
const wrap = a => { let m = (a + Math.PI) % (2 * Math.PI); if (m < 0) m += 2 * Math.PI; return m - Math.PI; };
const turn = sc => (sc <= 1 ? 230 : sc <= 1.5 ? 230 - (sc - 1) * 30 : sc <= 2 ? 215 - (sc - 1.5) * 78 : sc <= 2.5 ? 176 - (sc - 2) * 58 : sc <= 3 ? 147 - (sc - 2.5) * 42 : Math.max(110, 126 - (sc - 3) * 32)) * Math.PI / 180;
const cruise = sc => 5.79 + Math.min(1, Math.max(0, (sc - 1) / 2.5)) * 1.04;
function gapTo(x, y, fr, ro) {              // drawn gap to the nearest recorded body (any snake) and the wall
  const s = fr.segs; let g = fr.wall[2] - Math.hypot(x - fr.wall[0], y - fr.wall[1]) - ro;
  for (let k = 0; k < fr.sid.length; k++) { const x1 = s[5*k], y1 = s[5*k+1], dx = s[5*k+2]-x1, dy = s[5*k+3]-y1, l2 = dx*dx+dy*dy;
    const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((x-x1)*dx+(y-y1)*dy)/l2)); const d = Math.hypot(x-x1-t*dx, y-y1-t*dy) - s[5*k+4] - ro; if (d < g) g = d; }
  return g;
}
const results = [];
for (const d of process.argv.slice(3)) for (const f of fs.readdirSync(d).filter(x => /_box\.json\.gz$/.test(x)).sort()) {
  const rec = JSON.parse(fs.readFileSync(path.join(d, f.replace('_box.json.gz', '.json')), 'utf8').replace(/\bNaN\b/g, 'null'));
  if (rec.capped) continue;
  const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, f))).toString()).frames;
  if (fr.length < 100) continue;
  const last = fr[fr.length - 1], T = last.t;
  if (gapTo(last.x, last.y, last, 14.5 * last.sc) > 60) continue;        // not a body-contact death
  let i0 = fr.findIndex(x => T - x.t <= LEAD); if (i0 < 0) continue;
  const modes = {}; const s0 = fr[i0];
  let x = s0.x, y = s0.y, ang = s0.ang, v = s0.sp * PX, sc = s0.sc, ro = R * sc;
  const pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive');
  let died = null, cmdQ = [[ang, false]], minGap = 1e9, ticks = 0, boostT = 0, farMax = 0;
  for (let i = i0; i < fr.length; i++) {
    const frame = fr[i], dt = i > i0 ? frame.t - fr[i - 1].t : 0;
    if (dt > 0) {                          // move by the command issued ~0.1 s ago
      const [c, b] = cmdQ.length > 3 ? cmdQ.shift() : cmdQ[0];
      const dd = wrap(c - ang); ang += Math.sign(dd) * Math.min(Math.abs(dd), turn(sc) * dt);
      const want = (b ? BOOST : cruise(sc)) * PX, rate = (BOOST - cruise(sc)) * PX / RAMP;
      v = v < want ? Math.min(want, v + rate * dt) : Math.max(want, v - rate * dt);
      x += v * dt * Math.cos(ang); y += v * dt * Math.sin(ang); if (b) boostT += dt;
      const g = gapTo(x, y, frame, ro); if (g < minGap) minGap = g;
      farMax = Math.max(farMax, Math.hypot(x - frame.x, y - frame.y));
      if (g < -5) { died = frame.t - s0.t; break; }
    }
    const st = {x, y, ang, sp: v / PX, sc, t: frame.t, L: frame.L, wall: frame.wall, segs: Float64Array.from(frame.segs), sid: Float64Array.from(frame.sid),
      heads: Float64Array.from(frame.heads), hid: Float64Array.from(frame.hid), food: Float64Array.from(frame.food), own: Float64Array.from(frame.own)};
    const [cmd, boost] = pilot.step(st); cmdQ.push([cmd, boost]); ticks++; const md = pilot.last.trace.mode; modes[md] = (modes[md] || 0) + 1;
  }
  results.push({modes, game: `${d.split('/').pop().slice(-6)}/${f.slice(0, 6)}`, lead: +(T - s0.t).toFixed(1), died, minGap: +minGap.toFixed(1), boostShare: +(boostT / (T - s0.t)).toFixed(2), far: Math.round(farMax)});
}
const n = results.length, surv = results.filter(r => r.died === null).length;
console.log(`LEAD ${LEAD}s deaths ${n}: V2 survives to the recorded death time ${surv}/${n} (${(surv / n * 100).toFixed(0)}%), boost share median ${results.map(r => r.boostShare).sort()[n >> 1]}, drift from recorded track median ${results.map(r => r.far).sort((a, b) => a - b)[n >> 1]} px`);
for (const r of results) console.log(`  ${r.game} lead ${r.lead} ${r.died === null ? 'ALIVE' : 'died at +' + r.died.toFixed(1) + 's'} minGap ${r.minGap} boost ${r.boostShare} drift ${r.far} modes ${JSON.stringify(r.modes)}`);
