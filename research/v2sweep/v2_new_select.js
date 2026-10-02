    // ---- candidates: 24 target headings x boost; each path turns to the target at full rate, then continues as one of the
    // branches (0 straight / +-1 half-rate arc / +-2 full-rate coil). Every value of a candidate (static, head, dynamic,
    // score, drawn path) comes from ONE branch (Codex B1). ----
    const rel = []; for (let a = -165; a <= 180; a += 15) rel.push(rad(a));
    const C = rel.length, C2 = 2 * C;
    const eatR = ro + P.EAT, eatR2 = eatR * eatR, foodN = food.length / 4, taken = new Uint8Array(foodN);
    const OX = new Float64Array(NPT + 1), OY = new Float64Array(NPT + 1), OV = new Float64Array(NPT + 1);
    const cutPts = dyn.map(() => new Float64Array(2 * ND + 2));
    const who = [null, 0];
    const kinematics = (target, boost, branch) => {              // our path positions for the branch (no checks)
      let x = px, y = py, h = ang, v = sp * PX_PER_SP;
      const tb = clip(Math.abs(wrap(target - ang)) / w + .3, .6, 1.5);
      OX[0] = px; OY[0] = py; OV[0] = v;
      for (let k = 1; k <= NPT; k++) {
        const t = k * DTV, late = t > LATV, want = ((late ? boost : prevBoost) ? vb : cs);
        if (!late) { const d = wrap(prev - h); h += sign(d) * Math.min(Math.abs(d), w * DTV); }
        else if (t <= tb || branch === 0) { const d = wrap(target - h); h += sign(d) * Math.min(Math.abs(d), w * DTV); }
        else h += sign(branch) * (Math.abs(branch) === 2 ? 1 : .5) * w * DTV;
        v = v < want ? Math.min(want, v + rate * DTV) : Math.max(want, v - rate * DTV);
        x += v * DTV * Math.cos(h); y += v * DTV * Math.sin(h); OX[k] = x; OY[k] = y; OV[k] = v;
      }
    };
    const rollout = (target, boost, branch) => {
      kinematics(target, boost, branch);
      for (let i = 0; i < dyn.length; i++) layPath(dyn[i], 2, OX, OY, cutPts[i]);
      let deadS = H, headHit = null, headChecked = 0, deadDyn = null, dynId = null, dynKind = null, dynMin = Infinity, unknownAt = H, got = 0, minGap15 = Infinity;
      const pts = [], heapHit = new Array(heaps.length).fill(Infinity);
      taken.fill(0);
      for (let k = 1; k <= NPT; k++) {
        const t = k * DTV, x = OX[k], y = OY[k], v = OV[k];
        if (k % 2 === 0) pts.push(x, y);
        if (unknownAt === H && hypot(x - px, y - py) > V.V2_OBS_TRUST) unknownAt = t;    // B3: beyond the observed bodies
        const gS = gapAt(x, y, t) - MARGIN, staticHit = gS < 0;
        let gD = Infinity;
        if (dyn.length && k <= NDCHK) { gD = dynGap(x, y, k, cutPts, who); if (gD < dynMin) dynMin = gD;
          if (gD < 0 && deadDyn === null) { deadDyn = t; dynId = who[0]; dynKind = DYN_KIND[who[1]]; } }
        if (t <= V.V2_LOCAL_SAFE) { const g = Math.min(gS, gD); if (g < minGap15) minGap15 = g; }
        if (headHit === null) for (const hd of heads) if (reachT(hd, x, y) <= t) { headHit = t; break; }
        headChecked = t;
        if (staticHit) deadS = t;
        const first = Math.min(deadS, headHit === null ? H : headHit, deadDyn === null ? H : deadDyn, unknownAt);
        if (t < first) {                                         // food only before the first death / unobserved region
          if (k % 2 === 0 && t <= 3) for (let f = 0; f < foodN; f++) if (!taken[f] && food[4 * f + 3] < v * t + 200) {
            const dx = food[4 * f] - x, dy = food[4 * f + 1] - y;
            if (dx * dx + dy * dy <= eatR2) { got += food[4 * f + 2] * Math.exp(-t / 4); taken[f] = 1; }
          }
        }
        for (let j = 0; j < heaps.length; j++) if (heapHit[j] === Infinity && hypot(heaps[j].x - x, heaps[j].y - y) < 150) heapHit[j] = t;
        if (staticHit) break;
      }
      const headBound = headHit === null ? headChecked : headHit, dynT = deadDyn === null ? H : deadDyn;
      const live = Math.min(deadS, headBound, dynT), staticBound = Math.min(deadS, unknownAt);
      const cause = live >= H ? null : live === deadS ? 'static' : live === dynT ? 'dynamic' : 'head';
      return {deadS, headHit, headChecked, headBound, deadDyn, dynId, dynKind, dynMin, live, staticBound, unknownAt, threat: Math.min(headBound, dynT), got, heapHit, pts, branch, minGap15, cause};
    };
    const rivalT = (h, x, y) => {          // a rival's earliest arrival at (x, y): it may boost now, turn time included, no cone
      const d = Math.max(0, hypot(x - h[0], y - h[1]) - h[3]), turn = Math.abs(wrap(Math.atan2(y - h[1], x - h[0]) - h[2]));
      const c0 = h[5] * PX_PER_SP * .3, travel = h[6] ? d / vb : (d <= c0 ? d / (h[5] * PX_PER_SP) : .3 + (d - c0) / vb);
      return Math.max(travel, turn / h[4]);
    };
    for (const hp of heaps) { let tr = Infinity; for (const h of heads) tr = Math.min(tr, rivalT(h, hp.x, hp.y)); hp.rival = tr; }
    const valueOf = (r, boost) => {        // path food + remains heaps (verified arrival: full; beyond the verified horizon: a weak pull)
      let val = r.got; const ver = Math.min(r.live, r.unknownAt);
      for (let j = 0; j < heaps.length; j++) if (r.heapHit[j] < Infinity) {
        const first = r.heapHit[j] < heaps[j].rival - V.V2_RACE_LEAD, term = V.V2_HEAPW * heaps[j].mass * (first ? 1 : .25) * Math.exp(-r.heapHit[j] / 4);
        val += r.heapHit[j] < ver ? term : term * .1;
      }
      return boost ? val - V.V2_BCOST : val;
    };
    const cand = new Array(C2);
    for (let c = 0; c < C2; c++) {
      const boost = c >= C && canBoost, target = ang + rel[c % C];
      let bestB = null, rS = null;
      const consider = r => { if (bestB === null || r.live > bestB.live + 1e-9 || (Math.abs(r.live - bestB.live) < 1e-9 && (r.deadS > bestB.deadS + 1e-9 ||
        (Math.abs(r.deadS - bestB.deadS) < 1e-9 && (r.headBound > bestB.headBound + 1e-9 || (Math.abs(r.headBound - bestB.headBound) < 1e-9 && r.got > bestB.got)))))) bestB = r; };
      for (const branch of [0, 1, -1]) { const r = rollout(target, boost, branch); if (branch === 0) rS = r; consider(r); }
      if (bestB.live < H) for (const branch of [2, -2]) consider(rollout(target, boost, branch));   // tight ring: full-rate coil (emergency only)
      rS.val = valueOf(rS, boost); bestB.val = valueOf(bestB, boost);
      cand[c] = {S: rS, A: bestB};
    }
    // arcs count only when no straight continuation is clear for V2_ARCMIN s (curved corridor, inside a ring)
    let sMaxS = -Infinity;
    for (let c = 0; c < C2; c++) sMaxS = Math.max(sMaxS, cand[c].S.staticBound);
    const useArc = sMaxS < V.V2_ARCMIN, R_ = cand.map(q => useArc ? q.A : q.S);
    const tS = R_.map(r => r.staticBound), tHd = R_.map(r => r.threat), tLive = R_.map(r => r.live), ob = R_.map(r => r.val);
    // B2.3 boost: no 'danger' exemption. A boost in a direction is favored only as an escape (lives >= V2_ESCAPE_GAIN longer,
    // or reaches V2_LOCAL_SAFE where cruise does not) or as a remains race (verified 1.5 s, clear gap, beats cruise by
    // V2_RACE_GAIN and rivals by V2_RACE_LEAD); otherwise it pays V2_BCOST.
    const boostReason = new Array(C2).fill('none');
    for (let c = 0; c < C; c++) {
      if (!canBoost) continue;
      const cr = R_[c], br = R_[c + C]; let reason = 'normal';
      if (br.live >= cr.live + V.V2_ESCAPE_GAIN || (cr.live < V.V2_LOCAL_SAFE && br.live >= V.V2_LOCAL_SAFE)) reason = 'escape';
      else if (Math.min(br.live, br.unknownAt) >= V.V2_LOCAL_SAFE && br.minGap15 >= 0) {
        for (let j = 0; j < heaps.length; j++) if (br.heapHit[j] < Math.min(br.live, br.unknownAt) && br.heapHit[j] <= cr.heapHit[j] - V.V2_RACE_GAIN && br.heapHit[j] <= heaps[j].rival - V.V2_RACE_LEAD) { reason = 'race'; break; }
      }
      boostReason[c + C] = reason;
      if (reason === 'escape' || reason === 'race') ob[c + C] += V.V2_BCOST;   // waive the cost
    }
    this.v2dbg = {rel, ttdS: tS, ttdH: tHd, live: tLive, obj: ob, cause: R_.map(r => r.cause), dyn: R_.map(r => r.deadDyn), chosenPath: new Map(R_.map((r, c) => [c, r.pts])), gapAt, rollout, boostReason};
    let sMax = -Infinity, hMax = -Infinity, liveMax = -Infinity;
    for (let c = 0; c < C2; c++) { sMax = Math.max(sMax, tS[c]); liveMax = Math.max(liveMax, tLive[c]); }
    const sNeed = Math.min(V.V2_TOKS, sMax - .2);
    for (let c = 0; c < C2; c++) if (tS[c] >= sNeed) hMax = Math.max(hMax, tHd[c]);
    const hNeed = Math.min(TOK, hMax - .5);
    const safeNow = sMax >= V.V2_TOKS && hMax >= TOK;
    const emergency = liveMax < Math.max(V.V2_EMERG_T, LATV + 2 * DTV);
    let best = -1, bv = -Infinity, clearN = 0, emGap = null, emUnavoidable = 0;
    if (emergency) {                       // B1.3: shadow rollouts (no early stop, no score) - the largest real minimum gap after the latency
      const kEnd = Math.min(NPT, Math.round(V.V2_EMERG_LOOK / DTV)), kBeg = Math.floor(LATV / DTV) + 1;
      let sameAll = true, firstSig = null;
      for (let c = 0; c < C2; c++) {
        kinematics(ang + rel[c % C], c >= C && canBoost, 0);
        for (let i = 0; i < dyn.length; i++) layPath(dyn[i], 2, OX, OY, cutPts[i]);
        let mg = Infinity, endG = 0;
        for (let k = kBeg; k <= kEnd; k++) {
          const t = k * DTV, g = Math.min(gapAt(OX[k], OY[k], t) - MARGIN, dyn.length ? dynGap(OX[k], OY[k], k, cutPts, null) : Infinity);
          if (g < mg) mg = g; endG = g;
        }
        const sig = Math.round(mg) * 1e4 + Math.round(endG);
        if (firstSig === null) firstSig = sig; else if (sig !== firstSig) sameAll = false;
        const turn = Math.abs(rel[c % C]), vv = mg * 1e6 + endG * 1e3 - (c >= C ? 1 : 0) * 10 - turn;
        if (vv > bv) { bv = vv; best = c; emGap = mg; }
      }
      emUnavoidable = sameAll ? 1 : 0; clearN = 0;
    } else if (wrapMode) {                 // leave through the opening; among those, the longest static clearance (head tier inside)
      const inExit = c => Math.abs(wrap(ang + rel[c % C] - exitAng)) <= rad(V.V2_WRAPANG);
      let anyExit = false, hMaxW = -Infinity;
      for (let c = 0; c < C2; c++) if (inExit(c) && tS[c] >= 1) { anyExit = true; hMaxW = Math.max(hMaxW, tHd[c]); }
      const hNeedW = Math.min(TOK, hMaxW - .5);
      for (let c = 0; c < C2; c++) {
        if (anyExit && (!inExit(c) || tS[c] < 1 || tHd[c] < hNeedW)) continue;
        clearN++;
        const vv = tS[c] * 10 + Math.min(tHd[c], TOK) * 3 + ((c >= C && canBoost) === wrapBoost ? 20 : 0) - Math.abs(wrap(ang + rel[c % C] - exitAng)) * 4;
        if (vv > bv) { bv = vv; best = c; }
      }
    } else for (let c = 0; c < C2; c++) {
      if (tS[c] < sNeed || tHd[c] < hNeed) continue;
      clearN++;
      const same = this.v2last !== null && Math.abs(wrap(ang + rel[c % C] - this.v2last[0])) < rad(8) && (c >= C && canBoost) === this.v2last[1];
      // closed ring (cover past the wrap threshold, no opening): food ignored, the longest-living maneuver only
      const vv = (ringClosed ? tLive[c] * 10 : ob[c]) + V.V2_WTTD * Math.min(tHd[c], TOK) + (same ? V.V2_HYST : 0);
      if (vv > bv) { bv = vv; best = c; }
    }
    if (best < 0) { for (let c = 0; c < C2; c++) if (tLive[c] > bv) { bv = tLive[c]; best = c; } }   // never without a command
    const cmd = wrap(ang + rel[best % C]), boost = best >= C && canBoost, rb = R_[best];
    this.v2last = [cmd, boost]; this.prev = cmd; this.prevBoost = boost;
    const trace = {mode: emergency ? 'v2emg' : wrapMode ? 'v2wrap' : ringClosed ? 'v2ring' : safeNow ? 'v2' : 'v2esc', boost, cmd: r1(deg(cmd)), clear: null, hard: null, n_safe: clearN, threat: 0, enclosed: 0, wrap: 0, thr: null,
      eat: r1(rb.val), goal: heaps.length ? r1(Math.max(...heaps.map(h => h.mass))) : 0, thread: null, cov: r2(covMax), cov_id: covId, cov_free: exitWidth || 24, esc: exitAng === null ? null : r1(deg(exitAng)), L: s.L, sc: r2(sc), died_near: this.diedNear, kills: this.kills,
      big: 0, curl: 0, prof: this.profile, onward: null, nh: heads.length, hold_by: null, sized: 0,
      guard: null, gforce: 0, gatk: 0, giant: 0, wf: wrapMode ? 1 : 0, raid: 0, gap: null, squeeze: null, ttd: r1(rb.live), v2obj: r1(rb.val), arc: useArc ? 1 : 0, chg: dyn.length,
      ttds: r1(rb.staticBound), ttdh: r1(rb.headBound), branch: rb.branch, cause: rb.cause, head_hit: rb.headHit === null ? null : r1(rb.headHit), head_checked: r1(rb.headChecked),
      ttddyn: rb.deadDyn === null ? null : r1(rb.deadDyn), dyn_id: rb.dynId, dyn_kind: rb.dynKind, dyn_gap: rb.dynMin === Infinity ? null : r1(rb.dynMin), dyn_heads: dyn.length, dyn_excluded: dynExcluded,
      emergency: emergency ? 1 : 0, em_gap: emGap === null ? null : r1(emGap), em_unavoidable: emUnavoidable, unknown_at: rb.unknownAt >= H ? null : r1(rb.unknownAt), verified_s: r1(rb.staticBound), static_hit: r1(rb.deadS),
      boost_reason: boost ? boostReason[best] : 'none'};
    this.last = {mode: trace.mode, trace, draw: {chosen: rb.pts, safe: [], pos: new Float64Array(0), N, C2: 0, i: 0, near: [], gaps: [],
      goal: heaps.length ? heaps.reduce((a, b) => a.mass > b.mass ? a : b) : null, crowdAt: null, wp: null, attacker: null, ro, analysis: null}};
    return [cmd, boost];
  }

