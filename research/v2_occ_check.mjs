// (2)(6) Occupancy vs. record: predict from frame t, compare with actual bodies at t+1..5 s on a 16 px grid within 1100 px,
// in the band near any actual/predicted body. miss(possible) = actual occupied but predicted free; false-wall(core) =
// predicted by every scenario but actually free. Tail-vanish timing error where the tail was observed.
//   node research/v2_occ_check.mjs runs/dirA ...   env STEP=5 LIMIT=n
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
import {buildOccupancy} from './v2_occ.mjs'; import {R} from './v2_phys.mjs';
const STEP = +(process.env.STEP || 5), LIMIT = +(process.env.LIMIT || 1e9), CELL = 16, HALF = 1100, N = Math.ceil(2 * HALF / CELL);
const acc = {}; for (const h of [1, 2, 3, 4, 5]) acc[h] = {missP: 0, occA: 0, fwC: 0, fwP: 0, freeA: 0};
const tailErr = []; let games = 0;
function actualGrid(f, ox, oy, ro) {
  const g = new Uint8Array(N * N), s = f.segs;
  for (let k = 0; k < f.sid.length; k++) { const x1 = s[5*k], y1 = s[5*k+1], x2 = s[5*k+2], y2 = s[5*k+3], rr = s[5*k+4] + ro + 5;
    const i0 = Math.max(0, Math.floor((Math.min(x1, x2) - rr - ox) / CELL)), i1 = Math.min(N - 1, Math.floor((Math.max(x1, x2) + rr - ox) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(y1, y2) - rr - oy) / CELL)), j1 = Math.min(N - 1, Math.floor((Math.max(y1, y2) + rr - oy) / CELL));
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const px = ox + (i + .5) * CELL, py = oy + (j + .5) * CELL, t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
      if (Math.hypot(px - x1 - t * dx, py - y1 - t * dy) < rr) g[j * N + i] = 1; } }
  return g;
}
for (const d of process.argv.slice(2)) for (const fn of fs.readdirSync(d).filter(x => /_box\.json\.gz$/.test(x)).sort()) {
  if (games >= LIMIT) break;
  const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, fn))).toString()).frames; if (fr.length < 100) continue; games++;
  let nextT = fr[0].t + 1;
  for (let i = 1; i < fr.length; i++) {
    const f = fr[i]; if (f.t < nextT) continue; nextT = f.t + STEP;
    const prev = buildOccupancy(fr[i - 1], null, {}), occ = buildOccupancy(f, {t: fr[i - 1].t, tails: prev.tails}, {});
    const ro = R * f.sc, ox = f.x - HALF, oy = f.y - HALF;
    for (const h of [1, 2, 3, 4, 5]) {
      const g = fr.find(x => x.t >= f.t + h - .02); if (!g || g.t > f.t + h + .2) continue;
      const A = actualGrid(g, ox, oy, ro);
      for (let i2 = 0; i2 < N; i2++) for (let j = 0; j < N; j++) {
        const px = ox + (i2 + .5) * CELL, py = oy + (j + .5) * CELL;
        if (Math.hypot(px - f.x, py - f.y) > HALF - 50 || Math.hypot(px - g.x, py - g.y) > HALF - 50) continue;
        const act = !!A[j * N + i2];
        let band = act;
        if (!band) for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2],[3,0],[-3,0],[0,3],[0,-3]]) { const ii = i2 + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && A[jj * N + ii]) { band = true; break; } }
        const hit = occ.blockedSeg(px, py, px, py, h - .05, h + .05, 5);
        const predP = !!hit, predC = !!(hit && (hit.kind === 'oldBody' || hit.core));
        if (!band && !predP) continue;
        const a = acc[h]; if (act) { a.occA++; if (!predP) a.missP++; } else { a.freeA++; if (predC) a.fwC++; if (predP) a.fwP++; }
      }
    }
    for (const c of occ.caps) { if (!(c.kind === 'oldBody' && !c.tailUnknown && c.tOff < 5)) continue;
      const mx = (c.x1 + c.x2) / 2, my = (c.y1 + c.y2) / 2; let tFree = null;
      for (let k = i + 1; k < fr.length && fr[k].t <= f.t + 5.5; k++) { const g = fr[k]; let occd = false; const s = g.segs;
        for (let q = 0; q < g.sid.length; q++) { if (g.sid[q] !== c.sid) continue; const x1 = s[5*q], y1 = s[5*q+1], x2 = s[5*q+2], y2 = s[5*q+3], dx = x2 - x1, dy = y2 - y1, l2 = dx*dx+dy*dy, t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((mx-x1)*dx+(my-y1)*dy)/l2)); if (Math.hypot(mx-x1-t*dx, my-y1-t*dy) < s[5*q+4]) { occd = true; break; } }
        if (!occd) { tFree = g.t; break; } }
      if (tFree !== null && tailErr.length < 3000) tailErr.push(Math.abs((tFree - f.t) - c.tOff));
    }
  }
}
console.log(`games ${games}, samples every ${STEP}s (band cells near actual bodies + predicted cells)`);
for (const h of [1, 2, 3, 4, 5]) { const a = acc[h]; console.log(`+${h}s  miss(possible) ${(100 * a.missP / Math.max(1, a.occA)).toFixed(1)}% (${a.missP}/${a.occA})   false-wall(core) ${(100 * a.fwC / Math.max(1, a.freeA)).toFixed(1)}%   false-wall(possible) ${(100 * a.fwP / Math.max(1, a.freeA)).toFixed(1)}% (of ${a.freeA} free cells)`); }
tailErr.sort((a, b) => a - b); console.log(`tail vanish timing |err| median ${tailErr.length ? tailErr[tailErr.length >> 1].toFixed(2) : '-'}s (n=${tailErr.length})`);
