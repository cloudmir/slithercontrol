// V2 oracle on recorded deaths: at lead times before each death, what would V2 have commanded, and does it point away from
// the killer's body? Also the clearance times V2 saw. node research/v2_oracle.mjs runs/dirA runs/dirB ...
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm'; import path from 'node:path';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const LEADS = [12, 8, 5, 3, 1.5];
const wrap = a => { let m = (a + Math.PI) % (2 * Math.PI); if (m < 0) m += 2 * Math.PI; return m - Math.PI; };
const rows = [];
for (const d of process.argv.slice(2)) for (const f of fs.readdirSync(d).filter(x => /_box\.json\.gz$/.test(x)).sort()) {
  const rec = JSON.parse(fs.readFileSync(path.join(d, f.replace('_box.json.gz', '.json')), 'utf8'));
  if (rec.capped) continue;
  const box = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, f))).toString());
  const fr = box.frames; if (fr.length < 100) continue;
  const last = fr[fr.length - 1], ro = 14.5 * last.sc;
  // killer: owner of the nearest body point at the last frame
  let kd = 1e9, kid = null, kx = 0, ky = 0;
  for (let k = 0; k < last.sid.length; k++) { const s = last.segs; const x1 = s[5*k], y1 = s[5*k+1], x2 = s[5*k+2], y2 = s[5*k+3]; const dx = x2-x1, dy = y2-y1, l2 = dx*dx+dy*dy;
    const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((last.x-x1)*dx+(last.y-y1)*dy)/l2)); const qx = x1+t*dx, qy = y1+t*dy; const dd = Math.hypot(last.x-qx, last.y-qy) - s[5*k+4];
    if (dd < kd) { kd = dd; kid = last.sid[k]; kx = qx; ky = qy; } }
  if (kd - ro > 60) continue;                     // not a body contact death
  const out = {game: `${d.split('/').pop().slice(-6)}/${f.slice(0, 6)}`, kid, leads: {}};
  for (const lead of LEADS) {
    const s = [...fr].reverse().find(x => last.t - x.t >= lead); if (!s) continue;
    const pilot = new globalThis.SlpPilot.Pilot({...params.defaults, ...params.profiles.aggressive, V2_ON: 1}, 'aggressive');
    const st = {...s, segs: Float64Array.from(s.segs), sid: Float64Array.from(s.sid), heads: Float64Array.from(s.heads), hid: Float64Array.from(s.hid), food: Float64Array.from(s.food), own: Float64Array.from(s.own)};
    const [cmd, boost] = pilot.step(st); const tr = pilot.last.trace;
    // killer's nearest body point at that time
    let bd = 1e9, bx = 0, by = 0;
    for (let k = 0; k < s.sid.length; k++) if (s.sid[k] === kid) { const g = s.segs; const x1 = g[5*k], y1 = g[5*k+1], x2 = g[5*k+2], y2 = g[5*k+3]; const dx = x2-x1, dy = y2-y1, l2 = dx*dx+dy*dy;
      const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((s.x-x1)*dx+(s.y-y1)*dy)/l2)); const qx = x1+t*dx, qy = y1+t*dy; const dd = Math.hypot(s.x-qx, s.y-qy); if (dd < bd) { bd = dd; bx = qx; by = qy; } }
    const away = bd < 1e9 ? Math.cos(cmd - Math.atan2(s.y - by, s.x - bx)) : null;       // +1 = straight away from the killer's body
    const actual = s.cmd ? s.cmd[0] * Math.PI / 180 : s.ang;
    const awayActual = bd < 1e9 ? Math.cos(actual - Math.atan2(s.y - by, s.x - bx)) : null;
    out.leads[lead] = {dev: Math.round(Math.abs(wrap(cmd - actual)) * 180 / Math.PI), away: away === null ? null : +away.toFixed(2), awayActual: awayActual === null ? null : +awayActual.toFixed(2),
      ttds: tr.ttds, ttdh: tr.ttdh, safe: tr.mode === 'v2' ? 1 : 0, boost: boost ? 1 : 0, killerDist: bd < 1e9 ? Math.round(bd) : null};
  }
  rows.push(out);
}
console.log(`deaths ${rows.length}`);
console.log('| lead s | n | V2 deviates >45° from actual | V2 points away from killer body (cos>0.3) | actual away | median ttdS | median ttdH | boost |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const lead of LEADS) {
  const L = rows.map(r => r.leads[lead]).filter(Boolean); if (!L.length) continue;
  const med = a => { const s = a.filter(v => v != null).sort((u, v) => u - v); return s[s.length >> 1]; };
  console.log(`| ${lead} | ${L.length} | ${(L.filter(x => x.dev > 45).length / L.length * 100).toFixed(0)}% | ${(L.filter(x => x.away > .3).length / L.length * 100).toFixed(0)}% | ${(L.filter(x => x.awayActual > .3).length / L.length * 100).toFixed(0)}% | ${med(L.map(x => x.ttds))} | ${med(L.map(x => x.ttdh))} | ${(L.filter(x => x.boost).length / L.length * 100).toFixed(0)}% |`);
}
fs.writeFileSync('research/v2_oracle.json', JSON.stringify(rows, null, 1));
