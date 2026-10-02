// Run V3 on recorded blackbox frames: timing and trace per frame. node research/v3_frame.mjs runs/<dir> <k> [back_s ...]  env OVER='{}' ALL=1 (every 10th frame)
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync(process.env.PILOT || 'ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const [d, k] = [process.argv[2], +process.argv[3]], backs = process.argv.slice(4).map(Number);
const P = {...params.defaults, ...params.profiles.aggressive, V2_ON: 1, V3_ON: 1, ...JSON.parse(process.env.OVER || '{}')};
const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${d}/slp_${String(k).padStart(2, '0')}_box.json.gz`)).toString()).frames;
const T = fr[fr.length - 1].t, pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive');
const conv = f => ({x: f.x, y: f.y, ang: f.ang, sp: f.sp, sc: f.sc, t: f.t, L: f.L, wall: f.wall, segs: Float64Array.from(f.segs), sid: Float64Array.from(f.sid), heads: Float64Array.from(f.heads), hid: Float64Array.from(f.hid), food: Float64Array.from(f.food), own: Float64Array.from(f.own)});
const deg = a => Math.round(a * 180 / Math.PI);
const frames = process.env.ALL ? fr.filter((_, i) => i % 10 === 0) : backs.map(b => [...fr].reverse().find(x => T - x.t >= b - 1e-6));
const ms = [];
for (const f of frames) { const t0 = performance.now(); const [cmd, boost] = pilot.step(conv(f)); const dt = performance.now() - t0; ms.push(dt); const tr = pilot.last.trace;
  if (!process.env.ALL || process.env.VERBOSE) console.log(`t ${f.t.toFixed(1)} (-${(T - f.t).toFixed(1)}s) L ${f.L} sc ${f.sc.toFixed(2)} -> rel ${deg(((cmd - f.ang + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)} boost ${boost} ${tr.mode} ttd ${tr.ttd} minG ${tr.ttds} leaves ${tr.v3_leaves} eval ${tr.v3_eval} cert ${tr.v3_cert}/${tr.v3_ncert} exits ${tr.v3_exits} commit ${tr.v3_commit} shield ${tr.v3_shield} nh ${tr.nh} ms ${tr.v3_ms} over ${tr.v3_over} full ${tr.v3_full} hold ${tr.v3_hold} cause ${tr.cause} root ${tr.v3_root} w ${tr.exit_width} sl ${tr.exit_slack}`); }
ms.sort((a, b) => a - b); console.log(`frames ${ms.length} ms median ${ms[ms.length >> 1].toFixed(1)} p95 ${ms[Math.floor(ms.length * .95)].toFixed(1)} max ${ms[ms.length - 1].toFixed(1)}`);
