// Probe the V2 static field on one recorded frame: gap along rays from our head, and the raw nearest-segment gap for comparison.
//   node research/v2_probe.mjs runs/<dir> <k> <back_s>
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const [d, k, back] = [process.argv[2], +process.argv[3], +process.argv[4]];
const P = {...params.defaults, ...params.profiles.aggressive, V2_ON: 1};
const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${d}/slp_${String(k).padStart(2, '0')}_box.json.gz`)).toString()).frames;
const T = fr[fr.length - 1].t; const f = [...fr].reverse().find(x => T - x.t >= back - 1e-6);
const st = {x: f.x, y: f.y, ang: f.ang, sp: f.sp, sc: f.sc, t: f.t, L: f.L, wall: f.wall, segs: Float64Array.from(f.segs), sid: Float64Array.from(f.sid),
  heads: Float64Array.from(f.heads), hid: Float64Array.from(f.hid), food: Float64Array.from(f.food), own: Float64Array.from(f.own)};
const pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive'); pilot.step(st); const g = pilot.v2dbg, ro = 14.5 * f.sc;
const raw = (x, y) => { let best = 1e9; const s = f.segs; for (let j = 0; j < f.sid.length; j++) { const x1 = s[5*j], y1 = s[5*j+1], dx = s[5*j+2]-x1, dy = s[5*j+3]-y1, l2 = dx*dx+dy*dy;
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((x-x1)*dx+(y-y1)*dy)/l2)); const dd = Math.hypot(x-x1-t*dx, y-y1-t*dy) - s[5*j+4] - ro; if (dd < best) best = dd; } return best; };
console.log(`t ${f.t.toFixed(1)} heading ${Math.round(f.ang*180/Math.PI)} pos ${Math.round(f.x)},${Math.round(f.y)} wall ${f.wall} ro ${ro.toFixed(1)}`);
for (let b = 0; b < 360; b += 30) {
  const a = b * Math.PI / 180; const cells = [];
  for (const dist of [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000]) { const x = f.x + dist * Math.cos(a), y = f.y + dist * Math.sin(a); cells.push(`${dist}:${g.gapAt(x, y).toFixed(0)}/${raw(x, y).toFixed(0)}`); }
  console.log(`bearing ${String(b).padStart(3)} field/raw  ` + cells.join('  '));
}
