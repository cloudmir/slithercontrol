    // ---- B2: dynamic threats - the body each nearby head may LAY over the next V2_DYN_H s (Codex spec 2026-09-29) ----
    // paths per head: straight / max left / max right (shared) + a cut toward our predicted position (per candidate).
    // A laid segment kills us only after it is laid (layStep <= our step); nothing is pre-blocked.
    const ND = Math.round(V.V2_DYN_H / DTV), NDCHK = Math.min(NPT, ND + 5), leadSteps = Math.round(V.V2_CUT_LEAD / DTV);
    const dynAll = [];
    for (let m = 0; m < s.hid.length; m++) {
      const hx = s.heads[5 * m], hy = s.heads[5 * m + 1], ha = s.heads[5 * m + 2], hsp = s.heads[5 * m + 3], hsc = s.heads[5 * m + 4];
      const d = hypot(hx - px, hy - py); if (d > V.V2_DYN_R) continue;
      if (!(hsp > 8 || d <= V.V2_DYN_NEAR)) continue;
      const rh = R * hsc;
      dynAll.push({id: s.hid[m], hx, hy, ha, rh, wh: turnRate(hsc), v0: Math.max(hsp, 5.8) * PX_PER_SP, key: (d - ro - rh) / (vb + sp * PX_PER_SP)});
    }
    dynAll.sort((a, b) => a.key - b.key);
    const dyn = dynAll.slice(0, V.V2_DYN_MAX), dynExcluded = dynAll.length - dyn.length;
    const GC = 96, grid = new Map();                              // cell -> [dynIdx, kindIdx, segIdx, ...] (AABB expanded by lim)
    const cellKey = (x, y) => (Math.floor(x / GC) + 32768) * 65536 + (Math.floor(y / GC) + 32768);
    const layPath = (d, kind, goalX, goalY, pts) => {              // kind 0 straight / +1 left / -1 right / 2 cut (goal arrays)
      let x = d.hx, y = d.hy, a = d.ha, v = d.v0; pts[0] = x; pts[1] = y;
      for (let k = 1; k <= ND; k++) {
        if (kind === 2) { const g = Math.min(NPT, k + leadSteps), da = wrap(Math.atan2(goalY[g] - y, goalX[g] - x) - a); a += clip(da, -d.wh * DTV, d.wh * DTV); }
        else a += kind * d.wh * DTV;
        v = Math.min(vb, v + rate * DTV); x += v * DTV * Math.cos(a); y += v * DTV * Math.sin(a); pts[2 * k] = x; pts[2 * k + 1] = y;
      }
    };
    for (let i = 0; i < dyn.length; i++) {
      const d = dyn[i]; d.lim = ro + d.rh + P.bodyOff(d.rh) + MARGIN; d.paths = [];
      [0, 1, -1].forEach((kind, ki) => {
        const pts = new Float64Array(2 * ND + 2); layPath(d, kind, null, null, pts); d.paths.push(pts);
        for (let j = 1; j <= ND; j++) {
          const x0 = Math.min(pts[2 * j - 2], pts[2 * j]) - d.lim, x1 = Math.max(pts[2 * j - 2], pts[2 * j]) + d.lim;
          const y0 = Math.min(pts[2 * j - 1], pts[2 * j + 1]) - d.lim, y1 = Math.max(pts[2 * j - 1], pts[2 * j + 1]) + d.lim;
          for (let cx = Math.floor(x0 / GC); cx <= Math.floor(x1 / GC); cx++) for (let cy = Math.floor(y0 / GC); cy <= Math.floor(y1 / GC); cy++) {
            const key = (cx + 32768) * 65536 + (cy + 32768); let l = grid.get(key); if (!l) { l = []; grid.set(key, l); } l.push(i, ki, j);
          }
        }
      });
    }
    const segD = (p, j, x, y) => {                                 // distance from (x,y) to segment j of path p
      const x1 = p[2 * j - 2], y1 = p[2 * j - 1], dx = p[2 * j] - x1, dy = p[2 * j + 1] - y1, l2 = dx * dx + dy * dy;
      const u = l2 < 1e-9 ? 0 : clip(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1);
      return hypot(x - x1 - u * dx, y - y1 - u * dy);
    };
    const DYN_KIND = ['straight', 'left', 'right', 'cut'];
    const dynGap = (x, y, k, cuts, who) => {                      // min signed gap to bodies laid by step k (shared kinds via grid + cut paths)
      let g = Infinity;
      const l = grid.get(cellKey(x, y));
      if (l) for (let q = 0; q < l.length; q += 3) { const j = l[q + 2]; if (j > k) continue; const d = dyn[l[q]];
        const dd = segD(d.paths[l[q + 1]], j, x, y) - d.lim; if (dd < g) { g = dd; if (who) { who[0] = d.id; who[1] = l[q + 1]; } } }
      if (cuts) { const jEnd = Math.min(k, ND); for (let i = 0; i < dyn.length; i++) { const d = dyn[i], p = cuts[i];
        for (let j = 1; j <= jEnd; j++) { const dd = segD(p, j, x, y) - d.lim; if (dd < g) { g = dd; if (who) { who[0] = d.id; who[1] = 3; } } } } }
      return g;
    };
