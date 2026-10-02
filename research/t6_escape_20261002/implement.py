import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'ext/pilot.js';text=p.read_text();assert 't6Step(s)' not in text
world=text[text.index('  v9World(s) {'):text.index('  v9Roll(s, W, ph,')]
world=world.replace('  v9World(s) {','  t6World(s) {').replace('margin = V.V9_MARGIN ?? 5, obs = V.V9_OBS ?? 1200','margin = 0, obs = Math.max(900,(V.T6_EDGE??650)+200)')
world=world.replace('// Use at least the rendered physical radius; negative calibration must not\n      // make a displayed V9 escape line cut through a visible body.\n      a[4] = Math.max(a[4], a[4] + this.P.bodyOff(a[4]));','// User-selected surface offset is explicit in T6 only.\n      a[4] = Math.max(0, a[4] + (V.T4_GAP??-5));')
world=world.replace('(V.V9_HEAD_PAD ?? 20) * Math.min(t1, 3)','12 * Math.min(t1, 3) + Math.min(60, hypot(h.vx,h.vy) * t1*t1*.15)')
methods=(root/'research/t6_escape_20261002/methods.js').read_text().replace('(s.cmdNow??s.ang):cmd','(Number.isFinite(s.cmdNow)?s.cmdNow:s.ang):cmd')
text=text.replace('  t5Step(s) {',world+methods+'\n  t5Step(s) {',1).replace('this.t4Probe=null;','this.t6Guide=null;this.t6Goal=null;this.t4Probe=null;',1)
text=text.replace('    if (this.values.T5_ON)', '    if (this.values.T6_ON) return this.t6Step(s);\n    if (this.values.T5_ON)',1);p.write_text(text)
p=root/'params.json';d=json.loads(p.read_text());d['defaults'].update(T6_ON=0,T6_EDGE=650,T6_BOOST=1)
for preset in d['presets'].values():preset['values']['T6_ON']=0
t6=json.loads(json.dumps(d['presets']['t5_contours']));t6['label']='T6 · 외곽선 탈출';t6['values'].update(T5_ON=0,T6_ON=1,T6_EDGE=650,T6_BOOST=1,TRACK_ON=0,TRACK_LAT=.10);d['presets']['t6_escape']=t6
d['ui'].append({'name':'T6 외곽선 탈출','items':[['T6_ON','T6 외곽선 탈출',0,1,1],['T6_EDGE','탈출 탐색 거리',300,1000,50],['T6_BOOST','탈출 부스트',0,1,1]],'sixth':True});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'ext/mod.js';text=p.read_text()
text=text.replace('const bodyMapped = nine || !!(', 'const bodyMapped = nine || !!(S.values.T6_ON || ')
text=text.replace('(S.values.T1_ON || S.values.T2_ON || S.values.T3_ON || S.values.T4_ON || S.values.T5_ON) ? 1800','(S.values.T6_ON || S.values.T1_ON || S.values.T2_ON || S.values.T3_ON || S.values.T4_ON || S.values.T5_ON) ? 1800')
text=text.replace('cmdHistory: nine ?','cmdHistory: (nine || S.values.T6_ON) ?')
text=text.replace("function setValue(k, v) {","function setValue(k, v) {\n  if(k!=='T6_ON'&&v&&(/^(VA1|V[0-9]+)_ON$/.test(k)||k==='PROBE_ON'||/^T[12345]_ON$/.test(k)))S.values.T6_ON=0;\n  if(k==='T6_ON'&&v){for(const key of ['T5_ON','T4_ON','T3_ON','T2_ON','T1_ON','VA1_ON','V101_ON','V111_ON','V11_ON','V102_ON','V10_ON','V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;plan=null;commandHistory.length=0;}")
text=text.replace("setValue('T5_ON',0);", "setValue('T6_ON',0); setValue('T5_ON',0);")
text=text.replace("      btn('T5',", "      btn('T6', !!S.values.T6_ON, () => applyPreset('t6_escape'), '외곽선을 연결해 관측 범위 밖으로 탈출'),\n      btn('T5',",1)
text=text.replace("btn('V1', !S.values.T5_ON", "btn('V1', !S.values.T6_ON && !S.values.T5_ON")
text=text.replace("`${S.values.T5_ON ?", "`${S.values.T6_ON ? 'T6 · 외곽선 탈출' : S.values.T5_ON ?",1)
text=text.replace("(t.t4_on ?", "(t.t6_on ? `T6 · ${{escape:'탈출',search:'출구 탐색',recovery:'긴급 회전'}[t.t6_phase]||t.t6_phase}` : t.t4_on ?",1)
text=text.replace('S.values.T5_ON&&S.show.enemyContours','(S.values.T5_ON||S.values.T6_ON)&&S.show.enemyContours')
text=text.replace('if ((v10Active() || S.values.V9_ON)) {\n    const t =','if ((v10Active() || S.values.V9_ON || S.values.T6_ON)) {\n    const t =',1)
text=text.replace('if ((v10Active() || S.values.V9_ON) && !on)', 'if ((v10Active() || S.values.V9_ON || S.values.T6_ON) && !on)',1)
fields=['t6_on','t6_phase','t6_routes','t6_nodes','t6_rails','t6_graph_reason','t6_graph_ms','t6_root_safe','t6_clear','t6_checked_s','t6_depth','t6_safe_commands','t6_goal','t6_ms','t6_gap']
text=text.replace("'t5_on'];", "'t5_on',"+','.join(repr(x) for x in fields)+'];')
text=text.replace('tr.t5_on]);','tr.t5_on,'+','.join('tr.'+x for x in fields)+']);')
text=text.replace('last: last && {t5_on:', 'last: last && {'+','.join(x+':last.trace.'+x for x in fields)+',t5_on:',1)
text=text.replace('    if (last.trace.v8_phase && S.show.path)', "    if(d.t6Path&&S.show.path){\n      ctx.save();ctx.lineWidth=OVERLAY_LINE_WIDTH;ctx.strokeStyle='#ffb83d';ctx.setLineDash([5,5]);\n      for(const p of d.t6Guides||[])polyline(ctx,p,X,Y);ctx.setLineDash([]);ctx.strokeStyle=d.t6Unsafe?'#ff5b6b':last.boost?'#ffd040':'#60ff60';polyline(ctx,d.t6Path,X,Y);ctx.restore();\n    }\n    if (last.trace.v8_phase && S.show.path)",1)
# Keep the dedicated T6 swept path colours rather than the generic renderer.
text=text.replace('} else if (S.show.path && d.chosen.length)', '} else if (!d.t6Path && S.show.path && d.chosen.length)',1)
text=text.replace("const rows = (S.values.T4_ON || S.values.T5_ON)\n", "const rows = S.values.T6_ON ? [sw('T6_BOOST','탈출 부스트','통과 경로를 검사한 부스트'),sw('T6_EDGE','탈출 탐색 거리','관측 범위 안에서 찾는 출구 거리')] : (S.values.T4_ON || S.values.T5_ON)\n",1)
p.write_text(text)
print('T6 implemented')
