// Offline check of a pilot option on the death black boxes (cycle 4, Codex criterion): replay each box through two pilots
// (A: base values, B: base + overrides) in lockstep and, for the last WIN s, score each pilot's chosen 1.2 s plan against
// the bodies as they really were later (the recorded frames at t + k*DT): realized clearance = min over the plan points of
// (distance to the nearest body segment at that time - r - ro). Counts frames where A's plan was clear (>= 5 px) but B's
// touched (< 0) = HARM, the reverse = HELP, n_safe = 0 frames, command flips, decision time. Open loop: the bodies do not
// react to B's different plan, so this is "not harmful" evidence, not survival evidence.
//   node research/guard_replay.mjs '{"GUARD_ON":1}' runs/<dir>/slp_XX_box.json.gz ...   (base values: research/cycle4_arms.json A)
import fs from 'node:fs'; import zlib from 'node:zlib'; import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const params = JSON.parse(fs.readFileSync('params.json', 'utf8')), armsA = JSON.parse(fs.readFileSync('research/cycle4_arms.json', 'utf8')).A;
// base values: VALUES=<slp_XX.json> takes that game's recorded values (the user's real sliders; Codex 2026-09-27: the
// defaults differ a lot from them), else params defaults + aggressive + ARMS A.
const base = process.env.VALUES ? {...params.defaults, ...JSON.parse(fs.readFileSync(process.env.VALUES, 'utf8')).values}   // defaults fill params newer than the record
  : {...params.defaults, ...params.profiles.aggressive, ...JSON.parse(fs.readFileSync(process.env.ARMS || "research/cycle4_arms.json", "utf8")).A};
const [, , overJson, ...files] = process.argv; const over = JSON.parse(overJson);
const WIN = Number(process.env.WIN || 15), WARM = 5, DT = .08, N = 15;
const F = a => Float64Array.from(a);
const segDist = (x, y, S, k) => { const ax = S[5*k], ay = S[5*k+1], bx = S[5*k+2]-ax, by = S[5*k+3]-ay, l2 = bx*bx+by*by;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x-ax)*bx+(y-ay)*by)/l2)) : 0; return Math.hypot(x-ax-t*bx, y-ay-t*by) - S[5*k+4]; };
const FLAG = process.env.FLAG || null;
const tot = {flagFrames: 0, flagFirst: [], frames: 0, harm: 0, help: 0, bothTouch: 0, nsafe0A: 0, nsafe0B: 0, flipA: 0, flipB: 0, diff: 0, msA: 0, msB: 0, gforce: 0, guardOn: 0, harmCases: []};
for (const file of files) {
  const fr = JSON.parse(zlib.gunzipSync(fs.readFileSync(file))).frames, T = fr[fr.length-1].t;
  const start = fr.findIndex(f => T - f.t <= WIN + WARM); if (start < 0) continue;
  const mk = v => new globalThis.SlpPilot.Pilot(v, 'aggressive'); const A = mk(base), B = mk({...base, ...over});
  let prevA = null, prevB = null, firstOn = null; const per = {harm: 0, help: 0, frames: 0};
  for (let i = start; i < fr.length; i++) {
    const f = fr[i], s = {x: f.x, y: f.y, ang: f.ang, sp: f.sp, sc: f.sc, L: f.L, t: f.t, wall: f.wall, segs: F(f.segs), sid: F(f.sid), heads: F(f.heads), hid: F(f.hid), food: F(f.food), own: F(f.own), pred: -1};
    const s2 = {...s, segs: F(f.segs), sid: F(f.sid), heads: F(f.heads), hid: F(f.hid), food: F(f.food), own: F(f.own)};
    let t0 = performance.now(); const [cA, bA] = A.step(s); const msA = performance.now() - t0; t0 = performance.now(); const [cB, bB] = B.step(s2); const msB = performance.now() - t0;
    if (T - f.t > WIN) { prevA = cA; prevB = cB; continue; }
    const realized = pil => { const pts = pil.last.draw.chosen; let worst = Infinity;
      for (let k = 0; k < N; k++) { const tk = f.t + (k+1)*DT; let j = i; while (j+1 < fr.length && fr[j+1].t <= tk) j++; if (Math.abs(fr[j].t - tk) > .1) continue;
        const S = fr[j].segs, ro = 14.5 * fr[j].sc; let d = 1e9; for (let q = 0; q < S.length/5; q++) d = Math.min(d, segDist(pts[2*k], pts[2*k+1], S, q));
        worst = Math.min(worst, d - ro); }
      return worst; };
    const rA = realized(A), rB = realized(B), tA = A.last.trace, tB = B.last.trace;
    tot.frames++; per.frames++; tot.msA += msA; tot.msB += msB;
    if (rA >= 5 && rB < 0) { tot.harm++; per.harm++; if (tot.harmCases.length < 12) tot.harmCases.push({file: file.split('/').slice(-2).join('/'), before: +(T - f.t).toFixed(2), rA: +rA.toFixed(1), rB: +rB.toFixed(1), modeB: tB.mode, guard: tB.guard, gforce: tB.gforce}); }
    if (rB >= 5 && rA < 0) { tot.help++; per.help++; }
    if (rA < 0 && rB < 0) tot.bothTouch++;
    if (tA.n_safe === 0) tot.nsafe0A++; if (tB.n_safe === 0) tot.nsafe0B++;
    const wrap = a => Math.abs(((a + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI);
    if (prevA !== null && wrap(cA - prevA) > Math.PI/2) tot.flipA++; if (prevB !== null && wrap(cB - prevB) > Math.PI/2) tot.flipB++;
    if (wrap(cA - cB) > Math.PI/36 || bA !== bB) tot.diff++;
    if (tB.gforce) tot.gforce++; if (tB.guard !== null && tB.guard !== undefined) tot.guardOn++;
    if (FLAG && tB[FLAG]) { tot.flagFrames++; if (firstOn === null) firstOn = +(T - f.t).toFixed(1); }
    prevA = cA; prevB = cB;
  }
  if (FLAG) tot.flagFirst.push({file: file.split('/').slice(-2).join('/'), first: firstOn});
  console.error(file.split('/').slice(-2).join('/'), per, FLAG ? {firstOn} : '');
}
tot.msA = +(tot.msA / tot.frames).toFixed(1); tot.msB = +(tot.msB / tot.frames).toFixed(1);
console.log(JSON.stringify(tot, null, 1));
