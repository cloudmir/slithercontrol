// Run V2 on one recorded blackbox frame and dump every candidate (rel heading, boost, ttdS, ttdH, obj) plus the chosen paths.
//   node research/v2_frame.mjs runs/<dir> <k> <back_s> [json_out]
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const [d, k, back, out] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const over = JSON.parse(process.env.OVER || '{}');
const P = {...params.defaults, ...params.profiles.aggressive, V2_ON: 1, ...over};
const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${d}/slp_${String(k).padStart(2, '0')}_box.json.gz`)).toString()).frames;
const T = fr[fr.length - 1].t; const f = [...fr].reverse().find(x => T - x.t >= back - 1e-6);
const st = {x: f.x, y: f.y, ang: f.ang, sp: f.sp, sc: f.sc, t: f.t, L: f.L, wall: f.wall, segs: Float64Array.from(f.segs), sid: Float64Array.from(f.sid),
  heads: Float64Array.from(f.heads), hid: Float64Array.from(f.hid), food: Float64Array.from(f.food), own: Float64Array.from(f.own)};
const pilot = new globalThis.SlpPilot.Pilot(P, 'aggressive');
const [cmd, boost] = pilot.step(st); const tr = pilot.last.trace, g = pilot.v2dbg, C = g.rel.length;
const deg = a => Math.round(a * 180 / Math.PI);
console.log(`t ${f.t.toFixed(1)} (-${(T - f.t).toFixed(1)}s) L ${f.L} sc ${f.sc.toFixed(2)} ang ${deg(f.ang)} sp ${f.sp} -> cmd rel ${deg(((cmd - f.ang + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)} boost ${boost} mode ${tr.mode} ttd ${tr.ttd} ttds ${tr.ttds} ttdh ${tr.ttdh} cause ${tr.cause} dyn ${tr.ttddyn}/${tr.dyn_kind} heads ${tr.dyn_heads} emg ${tr.emergency} unk ${tr.unknown_at} boost_reason ${tr.boost_reason} cov ${tr.cov} esc ${tr.esc}`);
const rows = [];
for (let c = 0; c < 2 * C; c++) rows.push({c, rel: deg(g.rel[c % C]), boost: c >= C ? 1 : 0, ttdS: +g.ttdS[c].toFixed(2), ttdH: +g.ttdH[c].toFixed(2), obj: +g.obj[c].toFixed(1), live: g.live ? +g.live[c].toFixed(2) : null, cause: g.cause ? g.cause[c] : null, dyn: g.dyn ? g.dyn[c] : null});
const line = b => rows.filter(r => r.boost === b).map(r => `${String(r.rel).padStart(4)}:${r.ttdS.toFixed(1)}/${r.ttdH.toFixed(1)}${r.cause ? r.cause[0] : '-'}`).join(' ');
console.log('cruise rel:ttdS/ttdH  ' + line(0)); console.log('boost  rel:ttdS/ttdH  ' + line(1));
if (out) fs.writeFileSync(out, JSON.stringify({t: f.t, x: f.x, y: f.y, ang: f.ang, cmd, boost, rows, paths: Object.fromEntries([...g.chosenPath].map(([c, p]) => [c, p]))}));
