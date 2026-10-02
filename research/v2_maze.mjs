// Maze oracle (user 2026-09-29): treat the recorded world as a maze. Bodies + arena = walls; each enemy head makes cells
// "time walls" (blocked from the moment the head could be there). Time-expanded BFS at our speed: does a path to the
// observation edge exist at T-k s before each recorded death? Variants of the head assumption: none / all heads may boost
// toward any cell / only heads that are boosting or aimed within 45 deg of the cell.
//   node research/v2_maze.mjs runs/dirA ...   env BACKS=2,4,6,8,10 CELL=16 SPEED=cruise|boost VERBOSE=1
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const BACKS = (process.env.BACKS || '2,4,6,8,10').split(',').map(Number), CELL = +(process.env.CELL || 16), R = 14.5, PX = 31, VB = 14 * PX, H = 5;
const turn = sc => (sc <= 1 ? 230 : sc <= 1.5 ? 230 - (sc - 1) * 30 : sc <= 2 ? 215 - (sc - 1.5) * 78 : sc <= 2.5 ? 176 - (sc - 2) * 58 : sc <= 3 ? 147 - (sc - 2.5) * 42 : Math.max(110, 126 - (sc - 3) * 32)) * Math.PI / 180;
const cruise = sc => (5.79 + Math.min(1, Math.max(0, (sc - 1) / 2.5)) * 1.04) * PX;
const wrap = a => { let m = (a + Math.PI) % (2 * Math.PI); if (m < 0) m += 2 * Math.PI; return m - Math.PI; };
const HALF = 1150, N = Math.ceil(2 * HALF / CELL), MARGIN = 10;
function solve(f, variant, useBoost) {
  const ro = R * f.sc, ox = f.x - HALF, oy = f.y - HALF, v = useBoost ? VB : cruise(f.sc), dtCell = CELL / v;
  const wall = new Uint8Array(N * N), tb = new Float32Array(N * N).fill(1e9);   // static wall, time-wall (block from tb)
  const cx = i => ox + (i + .5) * CELL, cy = j => oy + (j + .5) * CELL;
  // bodies
  const s = f.segs;
  for (let k = 0; k < f.sid.length; k++) {
    const x1 = s[5*k], y1 = s[5*k+1], x2 = s[5*k+2], y2 = s[5*k+3], rr = s[5*k+4] + ro + MARGIN;
    const i0 = Math.max(0, Math.floor((Math.min(x1, x2) - rr - ox) / CELL)), i1 = Math.min(N - 1, Math.floor((Math.max(x1, x2) + rr - ox) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(y1, y2) - rr - oy) / CELL)), j1 = Math.min(N - 1, Math.floor((Math.max(y1, y2) + rr - oy) / CELL));
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const px = cx(i), py = cy(j), t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
      if (Math.hypot(px - x1 - t * dx, py - y1 - t * dy) < rr) wall[j * N + i] = 1;
    }
  }
  // arena
  const [W0, W1, W2] = f.wall;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (Math.hypot(cx(i) - W0, cy(j) - W1) > W2 - ro - 30) wall[j * N + i] = 1;
  // time walls from heads
  if (variant !== 'none') for (let m = 0; m < f.hid.length; m++) {
    const hx = f.heads[5*m], hy = f.heads[5*m+1], ha = f.heads[5*m+2], hsp = f.heads[5*m+3], hsc = f.heads[5*m+4], rh = R * hsc, w = turn(hsc);
    const boosting = hsp > 8, vh = boosting ? VB : Math.max(hsp, 5.8) * PX;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const px = cx(i), py = cy(j), d = Math.hypot(px - hx, py - hy) - rh - ro - MARGIN; if (d > VB * H) continue;
      const ang = Math.atan2(py - hy, px - hx), off = Math.abs(wrap(ang - ha));
      if (variant === 'aimed' && !(boosting || off < Math.PI / 4)) continue;
      if (off > 2 * Math.PI / 3) continue;                                  // cone 120 deg (as V2)
      const tr = Math.max(d <= 0 ? 0 : (variant === 'aimed' && !boosting ? d / vh : (boosting ? d / VB : .3 + Math.max(0, d - hsp * PX * .3) / VB)), off / w);
      const k = j * N + i; if (tr < tb[k]) tb[k] = tr;
    }
  }
  // time-expanded BFS (earliest arrival per cell; time walls are monotone so earliest arrival dominates)
  const si = Math.floor((f.x - ox) / CELL), sj = Math.floor((f.y - oy) / CELL);
  const arr = new Float32Array(N * N).fill(1e9), done = new Uint8Array(N * N); arr[si + sj * N] = 0;
  const hk = [], ht = [];                                                 // binary min-heap on time
  const push = (k, t) => { hk.push(k); ht.push(t); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (ht[p] <= ht[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]]; [ht[p], ht[c]] = [ht[c], ht[p]]; c = p; } };
  const pop = () => { const k = hk[0], t = ht[0], lk = hk.pop(), lt = ht.pop(); if (hk.length) { hk[0] = lk; ht[0] = lt; let c = 0; for (;;) { let l = 2 * c + 1, r = l + 1, s = c; if (l < hk.length && ht[l] < ht[s]) s = l; if (r < hk.length && ht[r] < ht[s]) s = r; if (s === c) break; [hk[s], hk[c]] = [hk[c], hk[s]]; [ht[s], ht[c]] = [ht[c], ht[s]]; c = s; } } return [k, t]; };
  push(si + sj * N, 0);
  let escape = null, reach = 0;
  while (hk.length) {
    const [k, t] = pop(); if (done[k]) continue; done[k] = 1; reach++;
    const i = k % N, j = (k - i) / N;
    if (Math.hypot(cx(i) - f.x, cy(j) - f.y) > HALF - 60 || t > H) { if (escape === null) escape = t; continue; }
    for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const nk = nj * N + ni, nt = t + dtCell * (di && dj ? Math.SQRT2 : 1);
      if (wall[nk] || done[nk] || nt >= tb[nk] || arr[nk] <= nt) continue;
      arr[nk] = nt; push(nk, nt);
    }
  }
  return {escape, reach, free: reach / (N * N)};
}
const rows = [];
for (const d of process.argv.slice(2)) for (const fn of fs.readdirSync(d).filter(x => /_box\.json\.gz$/.test(x)).sort()) {
  const rec = JSON.parse(fs.readFileSync(path.join(d, fn.replace('_box.json.gz', '.json')), 'utf8')); if (rec.capped) continue;
  const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, fn))).toString()).frames; if (fr.length < 100) continue;
  const T = fr[fr.length - 1].t, out = {game: `${d.split('/').pop().slice(-6)}/${fn.slice(0, 6)}`, L: fr[fr.length - 1].L};
  for (const b of BACKS) {
    const f = [...fr].reverse().find(x => T - x.t >= b - 1e-6); if (!f) continue;
    for (const vnt of ['none', 'all', 'aimed']) { const r = solve(f, vnt, false); out[`${vnt}@${b}`] = r.escape === null ? '-' : r.escape.toFixed(1); }
    const rb = solve(f, 'aimed', true); out[`aimedB@${b}`] = rb.escape === null ? '-' : rb.escape.toFixed(1);
  }
  rows.push(out);
}
const cnt = (key) => rows.filter(r => r[key] && r[key] !== '-').length;
console.log(`deaths ${rows.length}. escape path exists (count of deaths) by head assumption and seconds before death:`);
console.log('back   none   all   aimed  aimed+boost');
for (const b of BACKS) console.log(`${String(b).padStart(3)}s   ${String(cnt(`none@${b}`)).padStart(3)}   ${String(cnt(`all@${b}`)).padStart(3)}   ${String(cnt(`aimed@${b}`)).padStart(3)}    ${String(cnt(`aimedB@${b}`)).padStart(3)}`);
if (process.env.VERBOSE) for (const r of rows) console.log(r.game, 'L', r.L, BACKS.map(b => `${b}s:${r[`none@${b}`]}/${r[`all@${b}`]}/${r[`aimed@${b}`]}/${r[`aimedB@${b}`]}`).join('  '));
