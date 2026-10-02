from pathlib import Path
import json
p=Path('ext/pilot.js');s=p.read_text();a=s.index('  probeStep(');b=s.index('  // ================= V2',a);f=s[a:b]
f=f.replace('  probeStep(', '  t1Step(').replace('V = this.values;',"V = {...this.values,PROBE_GAP0:12,PROBE_JUMP:12,PROBE_STEP:1,PROBE_FLOOR:-30};")
f=f.replace('this.probe || (this.probe =', 'this.t1Probe || (this.t1Probe =')
f=f.replace("const done = (cmd, boost, phase, extra) => {", "let levelEvent=null, headingError=null, lateral=null, targetBend=null;\n    const decorate=tr=>Object.assign(tr,{t1_on:1,t1_phase:tr.pph===1?'follow':tr.pph===2?'excluded':'seek',t1_own_r:ro,t1_enemy_r:tr.ptr,t1_gap:tr.pgap,t1_set:pr.set,t1_target:tr.ptid,t1_level:levelEvent,t1_heading_error:headingError,t1_lateral:lateral,t1_bend:targetBend,t1_bin:Math.max(0,Math.min(4,Math.floor(this.values.T1_BIN??0)))});\n    const done = (cmd, boost, phase, extra) => {")
f=f.replace("this.last = {mode: 'probe', trace", "decorate(trace);this.last = {mode: 'probe', trace")
f=f.replace('      return r;', '      decorate(tr);return r;')
f=f.replace('tr.ptid = pr.id;', 'tr.ptid = null;')
f=f.replace('if (len < 800)', 'if (len < 600)').replace('turnSum > rad(40)', 'turnSum > rad(12)')
f=f.replace('return {id, ks, r: S[5 * ks[0] + 4], nb, len};', 'return {id, ks, r: S[5 * nb[1] + 4], nb, len, bend:turnSum};')
f=f.replace("if (best) { tg = best; pr.id = best.id; pr.set = V.PROBE_GAP0; pr.since = T; pr.err = []; pr.phase = 'follow'; }", "if (best) { tg = best; pr.id = best.id; pr.set = V.PROBE_GAP0; pr.since = T; pr.err = [];pr.samples=[];delete pr.prevGap;pr.prevT=T; pr.phase = 'follow'; }")
f=f.replace('for (const id of bySnake.keys()) { const c = ok(id); if (c && (best === null || c.r > best.r + .5 || (Math.abs(c.r - best.r) <= .5 && c.nb[0] < best.nb[0]))) best = c; }', """const bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4,wanted=this.values.T1_BIN??0;
      for (const id of bySnake.keys()) {const c=ok(id);if(!c)continue;c.priority=Math.abs(bin(c.r)-wanted)*1000+c.nb[0];if(!best||c.priority<best.priority)best=c;}
""")
f=f.replace('if (bend > rad(30))', 'if (bend > rad(8))')
f=f.replace('const cmd = Math.atan2(oy - py, ox - px);', """const tangent=Math.atan2(ty*dir,tx*dir),aim=Math.atan2(oy-py,ox-px);
    // Limit lateral closure near the target. Acquisition transients are excluded.
    const limit=gapM<pr.set+30?rad(4):rad(15),cmd=tangent+clip(wrap(aim-tangent),-limit,limit);
    headingError=Math.abs(wrap(ang-tangent));lateral=vLat;targetBend=tg.bend;
""")
a2=f.index('    // 4. gap schedule:');b2=f.index("    pr.phase = 'follow';",a2)
f=f[:a2]+"""    // Completed levels belong to the measured set, never the next commanded set.
    const samples=pr.samples||(pr.samples=[]);
    samples.push({t:T,gap:gapM,err:Math.abs(err),ro,heading:headingError,speed:sp,lateral:Math.abs(vLat)});
    while(samples.length&&T-samples[0].t>1)samples.shift();
    const med=k=>{const a=samples.map(q=>q[k]).sort((a,b)=>a-b);return a[a.length>>1];};
    const lo=Math.min(...samples.map(q=>q.gap)),hi=Math.max(...samples.map(q=>q.gap));
    const steady=samples.length>=15&&T-samples[0].t>=.75&&med('err')<1&&hi-lo<1.5&&med('heading')<rad(6)&&med('lateral')<8&&Math.max(...samples.map(q=>q.ro))-Math.min(...samples.map(q=>q.ro))<.3;
    if(steady&&T-pr.since>=1.2){
      levelEvent={serial:++this.t1Serial|| (this.t1Serial=1),t:T,target:pr.id,own_r:med('ro'),enemy_r:rt,set:pr.set,gap:med('gap'),gap_min:lo,gap_max:hi,samples:samples.length,duration:T-samples[0].t,speed:med('speed'),heading:med('heading'),lateral:med('lateral')};
      pr.stable.push(levelEvent);pr.set=Math.max(V.PROBE_FLOOR,pr.set-1);pr.since=T;pr.samples=[];
    }
"""+f[b2:]
s=s[:b]+f+s[b:];s=s.replace('    if (this.values.VA1_ON) return this.va1Step(s);','    if (this.values.T1_ON) return this.t1Step(s);\n    if (this.values.VA1_ON) return this.va1Step(s);')
s=s.replace('setParams(values, profile) {', 'setParams(values, profile) { this.t1Probe=null;this.t1Serial=0;')
p.write_text(s)
p=Path('params.json');d=json.loads(p.read_text());d['defaults'].update(T1_ON=0,T1_BIN=0)
for v in d['presets'].values():v['values']['T1_ON']=0
v={**d['defaults'],**d['profiles']['aggressive'],**d['presets']['remains_aggressive']['values']} if 'remains_aggressive' in d['presets'] else {**d['defaults'],**d['profiles']['aggressive']}
for k in ['VA1_ON','V101_ON','V111_ON','V11_ON','V102_ON','V10_ON','V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON']:v[k]=0
v.update(T1_ON=1,T1_BIN=0,BOUND_CAL=0,WF_ON=0,BOOST_COST=30,HEAP_BOOST=0)
d['presets']['t1_thickness']={'label':'T1 · 두께별 접촉 실측','profile':'aggressive','values':v}
d['ui'].append({'group':'T1 · 두께별 실측','items':[['T1_ON','T1 실측 모드',0,1,1,True],['T1_BIN','목표 상대 반경 구간',0,4,1,True]]})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=Path('ext/mod.js');s=p.read_text();s=s.replace("'va1_phase']", "'va1_phase','t1_on','t1_phase','t1_own_r','t1_enemy_r','t1_gap','t1_set','t1_target','t1_level','t1_heading_error','t1_lateral','t1_bend','t1_bin']")
s=s.replace('tr.va1_phase]);', 'tr.va1_phase,tr.t1_on,tr.t1_phase,tr.t1_own_r,tr.t1_enemy_r,tr.t1_gap,tr.t1_set,tr.t1_target,tr.t1_level,tr.t1_heading_error,tr.t1_lateral,tr.t1_bend,tr.t1_bin]);')
s=s.replace("btn('VA1',", "btn('T1', !!S.values.T1_ON, () => applyPreset('t1_thickness'), '追종 간격 단계 축소 · 두께별 생존/사망 관측'),\n      btn('VA1',")
s=s.replace("${S.values.VA1_ON ?", "${S.values.T1_ON ? 'T1 · 두께별 접촉 실측' : S.values.VA1_ON ?")
s=s.replace('    const rows = S.values.VA1_ON', "    const rows = S.values.T1_ON\n      ? [sw('T1_BIN','목표 상대 반경 구간','0 <20 / 1 20–30 / 2 30–40 / 3 40–50 / 4 ≥50px. 없으면 가까운 구간'),el('div',{class:'li'},'추종 중 부스트 끔 · 12px부터 1px씩 접근 · 안정 생존 관측만 단계 기록')]\n      : S.values.VA1_ON")
s=s.replace("  S.values[k] = v; save();", "  if(k!=='T1_ON'&&v&&(/^(VA1|V[0-9]+)_ON$/.test(k)||k==='PROBE_ON'))S.values.T1_ON=0;\n  if(k==='T1_ON'&&v){for(const key of ['VA1_ON','V101_ON','V111_ON','V11_ON','V102_ON','V10_ON','V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;plan=null;}\n  S.values[k] = v; save();")
# V1 button switches T1 off even when no Vn_ON becomes 1.
s=s.replace("setValue('VA1_ON', 0);", "setValue('T1_ON',0); setValue('VA1_ON', 0);")
s=s.replace('last: last && {va1_on:', 'last: last && {t1_on:last.trace.t1_on,t1_phase:last.trace.t1_phase,t1_gap:last.trace.t1_gap,t1_own_r:last.trace.t1_own_r,t1_enemy_r:last.trace.t1_enemy_r,t1_set:last.trace.t1_set,t1_target:last.trace.t1_target,va1_on:')
p.write_text(s)
