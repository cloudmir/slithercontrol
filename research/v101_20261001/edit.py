from pathlib import Path
import json,shutil,hashlib
out=Path('research/v101_20261001')
for n in ['pilot.js','mod.js','params.js','manifest.json']:shutil.copy2(Path('ext')/n,out/'before'/n)
shutil.copy2('params.json',out/'before/params.json')
p=Path('ext/pilot.js');s=p.read_text();s=s.replace('    if (this.values.V10_ON) return this.v10Step(s);','    if (this.values.V101_ON) return this.v101Step(s);\n    if (this.values.V10_ON) return this.v10Step(s);')
insert='''  // V10-1 shares the exact V8-1 switch and persistent original controllers.
  v101Values(avoid) {
    return {...this.values, V101_ON:0,V10_ON:avoid?1:0,V9_ON:0,V8_ON:0,V7_ON:0,V6_ON:0,V41_ON:0,V5_ON:0,V4_ON:0,V3_ON:0,V2_ON:0,PROBE_ON:0};
  }
  v101Step(s) {
    const K=this.v101||(this.v101={phase:'feed',clearSince:null});
    const c=s.v8Control||v8Choice(K,countHeads(s,this.values.V8_HEAD_R??450),s.t,this.values,
      this.values.V81_BODY_ON?bodyDensity(s,this.values.V81_BODY_R??450,this.values.V81_BODY_NEAR_W??2,this.values.V81_BODY_SELF_W??.1):0);
    const key=c.phase==='avoid'?'v101Avoid':'v101Feed';
    if(!this[key])this[key]=new Pilot(this.v101Values(c.phase==='avoid'),this.profile);
    const child=this[key];TURN_FIX=!!child.values.TURN_FIX;
    if(c.switched&&c.phase==='avoid'){child.v10Held=null;child.v10Committed=null;child.v10Invalid=null;child.v10FeedTarget=null;}
    const state=c.phase==='avoid'?{...s,route:c.switched?null:s.route,selectedGuide:c.switched?null:s.selectedGuide}:{...s,route:null,selectedGuide:null,threat:null};
    const result=child.step(state);this.last=child.last;
    Object.assign(this.last.trace,{v101_on:1,v8_phase:c.phase,v8_heads:c.heads,v8_radius:c.radius,v8_threshold:c.threshold,v8_switched:c.switched,v81_on:this.values.V81_BODY_ON?1:0,v81_density:c.bodyDensity??0,v81_body_trigger:c.bodyTrigger??0,v81_reason:c.reason||''});
    this.prev=result[0];this.prevBoost=result[1];return result;
  }
'''
s=s.replace('  v8Values(six) {',insert+'\n  v8Values(six) {')
s=s.replace('    for (const [key, six] of [[\'v8Feed\'',"    for(const [key,avoid] of [['v101Feed',false],['v101Avoid',true]])if(this[key])this[key].setParams(this.v101Values(avoid),this.profile);\n    for (const [key, six] of [['v8Feed'")
p.write_text(s)
p=Path('ext/mod.js');s=p.read_text();s=s.replace('function observe() {',"function v10Active(){return !!S.values.V10_ON&&(!S.values.V101_ON||v8Switch.phase==='avoid');}\nfunction observe() {")
# Runtime dispatch, observation and tracker use actual branch. UI retains selected mode flags.
a=s.index('function observe()');b=s.index('function overlay');chunk=s[a:b].replace('S.values.V10_ON','v10Active()');s=s[:a]+chunk+s[b:]
s=s.replace('if (!(v10Active() || S.values.V9_ON) && S.values.V8_ON)', 'if (S.values.V101_ON || (!(v10Active() || S.values.V9_ON) && S.values.V8_ON))')
s=s.replace('if (v8Control.switched) { route = null; planVer++; planSentAt = 0; }','if (v8Control.switched) { route = null; plan = null; threat=null; threatVer++; planVer++; planSentAt = 0; }')
s=s.replace("const needPlan = v9 ? true", "const needPlan = S.values.V101_ON && st.v8Control.phase==='feed' ? false : v9 ? true")
# Settings mutations must still target flags, not helper calls.
s=s.replace('v10Active()=0','S.values.V10_ON=0')
s=s.replace("if(k==='V10_ON'&&v)","if(k==='V101_ON'&&v){S.values.V10_ON=1;for(const key of ['V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;}\n  if(k==='V10_ON'&&v)")
s=s.replace("function setValue(k, v) {", "function setValue(k, v) {\n  if(k==='V10_ON'||(v&&/^V(?:2|3|4|41|5|6|7|8|9)_ON$/.test(k)))S.values.V101_ON=0;")
s=s.replace("btn('V10', !!S.values.V10_ON", "btn('V10-1', !!S.values.V101_ON, () => applyPreset('v101_hybrid'), 'V8-1과 같은 머리·몸통 조건: V1 먹이 추종 ↔ V10 회피'),\n      btn('V10', !!S.values.V10_ON && !S.values.V101_ON")
s=s.replace("t.v81_on ? 'V8-1' : 'V8'","t.v101_on ? 'V10-1' : t.v81_on ? 'V8-1' : 'V8'").replace("t.v8_phase === 'avoid' ? 'V6'", "t.v8_phase === 'avoid' ? (t.v101_on?'V10':'V6')")
s=s.replace("last.trace.v81_on ? 'V8-1' : 'V8'","last.trace.v101_on?'V10-1':last.trace.v81_on ? 'V8-1' : 'V8'").replace("last.trace.v8_phase === 'avoid' ? 'V6'", "last.trace.v8_phase === 'avoid' ? (last.trace.v101_on?'V10':'V6')")
s=s.replace("(S.values.V10_ON ? 'V10 · 3층 회피'", "(S.values.V10_ON ? (S.values.V101_ON?'V10-1 · 먹이+조건부 V10':'V10 · 3층 회피')")
# Show original switch knobs in V10-1 alongside V10 knobs.
s=s.replace('const rows = S.values.V10_ON','const rows = S.values.V10_ON')
s=s.replace("? [sw('V10_SWITCH_RISK'", "? [...(S.values.V101_ON?['V8_HEAD_R','V8_HEAD_N','V8_CLEAR_S','V81_BODY_ON','V81_BODY_R','V81_BODY_PCT','V81_BODY_NEAR_W','V81_BODY_SELF_W','W_FOOD','W_GOAL','REMAINS','BOOST_COST'].map(k=>sw(k,({V8_HEAD_R:'머리 판단 반경',V8_HEAD_N:'회피 전환 머리 수',V8_CLEAR_S:'먹이 모드 복귀 대기',V81_BODY_ON:'몸통 밀도 회피',V81_BODY_R:'몸통 판단 반경',V81_BODY_PCT:'회피 전환 점유율',V81_BODY_NEAR_W:'몸통 근접 가중치',V81_BODY_SELF_W:'자기 몸통 가중치',W_FOOD:'V1 먹이 추종',W_GOAL:'V1 잔해 목표 추종',REMAINS:'V1 잔해 판정',BOOST_COST:'V1 부스트 비용'})[k],'V8-1과 같은 조건·원본 V1 먹이 추종 설정')):[]),sw('V10_SWITCH_RISK'")
s=s.replace("it[0].startsWith('V10_')||v10Shared.has(it[0])", "it[0].startsWith('V10_')||v10Shared.has(it[0])||(S.values.V101_ON&&(it[0].startsWith('V8_')||it[0].startsWith('V81_')))")
s=s.replace("'v10_command_id']","'v10_command_id','v101_on']").replace('tr.v10_command_id]);','tr.v10_command_id,tr.v101_on]);')
p.write_text(s)
p=Path('params.json');d=json.loads(p.read_text());d['defaults']['V101_ON']=0
for v in d['presets'].values():v['values']['V101_ON']=0
values={**d['defaults'],**d['presets']['v81_density']['values']}
values.update({k:v for k,v in d['presets']['v10_layered']['values'].items() if k.startswith('V10_') or k.startswith('V9_')})
values.update(V101_ON=1,V10_ON=1,V8_ON=0,V9_ON=0)
d['presets']['v101_hybrid']={'label':'V10-1 · V8 먹이 + 조건부 V10 회피','profile':'aggressive','values':values}
d['ui'].append({'group':'V10-1 — V8 먹이 + 조건부 V10 회피','items':[['V101_ON','V10-1 켜기',0,1,1,True]]})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
version='1001-'+hashlib.sha256(Path('ext/pilot.js').read_bytes()+Path('ext/mod.js').read_bytes()+p.read_bytes()).hexdigest()[:8]
e={**d,'__ext_version':version};Path('ext/params.js').write_text('window.SLP_PARAMS = '+json.dumps(e,ensure_ascii=False)+';\n')
p=Path('ext/manifest.json');m=json.loads(p.read_text());m['version_name']=version;p.write_text(json.dumps(m,indent=2)+'\n');print(version)
