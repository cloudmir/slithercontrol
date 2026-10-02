from pathlib import Path
import shutil,json,hashlib
out=Path('research/v11_20261001')
for name in ['pilot.js','mod.js','params.js','manifest.json']:shutil.copy2(Path('ext')/name,out/'before'/name)
shutil.copy2('params.json',out/'before/params.json')
p=Path('ext/pilot.js');s=p.read_text();fn='''// V11 uses physical proximity instead of a crowd count or density threshold.
function v11Choice(K, s, V) {
  let headDistance=Infinity,bodyGap=Infinity;
  for(let i=0;i<(s.heads?.length||0);i+=5)headDistance=Math.min(headDistance,hypot(s.heads[i]-s.x,s.heads[i+1]-s.y));
  for(let i=0;i<(s.segs?.length||0);i+=5){const [ax,ay,bx,by,r]=s.segs.slice(i,i+5);bodyGap=Math.min(bodyGap,pointD(s.x,s.y,ax,ay,bx,by)-r-R*s.sc);}
  const head=V.V11_HEAD_R>0&&headDistance<=V.V11_HEAD_R,body=V.V11_BODY_GAP>0&&bodyGap<=V.V11_BODY_GAP;
  const previous=K.phase;
  if(head||body){K.phase='avoid';K.clearSince=null;}
  else if(K.phase==='avoid'){if(K.clearSince===null)K.clearSince=s.t;if(s.t-K.clearSince>=(V.V11_CLEAR_S??1)){K.phase='feed';K.clearSince=null;}}
  return {phase:K.phase,heads:countHeads(s,V.V11_HEAD_R),radius:V.V11_HEAD_R,threshold:1,switched:K.phase!==previous?1:0,bodyDensity:0,bodyTrigger:body?1:0,headDistance,bodyGap,reason:head?(body?'near_head+body':'near_head'):body?'near_body':K.phase==='avoid'?'hold':'clear'};
}

'''
s=s.replace('class Pilot {',fn+'class Pilot {')
s=s.replace('V101_ON:0,V10_ON:avoid?1:0','V101_ON:0,V11_ON:0,V10_ON:avoid?1:0')
s=s.replace('const c=s.v8Control||v8Choice(K,countHeads(s,this.values.V8_HEAD_R??450),s.t,this.values,\n      this.values.V81_BODY_ON?bodyDensity(s,this.values.V81_BODY_R??450,this.values.V81_BODY_NEAR_W??2,this.values.V81_BODY_SELF_W??.1):0);', 'const c=s.v8Control||(this.values.V11_ON?v11Choice(K,s,this.values):v8Choice(K,countHeads(s,this.values.V8_HEAD_R??450),s.t,this.values,\n      this.values.V81_BODY_ON?bodyDensity(s,this.values.V81_BODY_R??450,this.values.V81_BODY_NEAR_W??2,this.values.V81_BODY_SELF_W??.1):0));')
s=s.replace('v101_on:1,v8_phase:c.phase','v101_on:1,v11_on:this.values.V11_ON?1:0,v11_head_distance:Number.isFinite(c.headDistance)?c.headDistance:null,v11_body_gap:Number.isFinite(c.bodyGap)?c.bodyGap:null,v8_phase:c.phase')
s=s.replace('bodyDensity, v8Choice, R, paths','bodyDensity, v8Choice, v11Choice, R, paths');p.write_text(s)
p=Path('ext/mod.js');s=p.read_text();old='v8Control = window.SlpPilot.v8Choice(v8Switch, seen.size, performance.now() / 1000, S.values, density);'
new='''if(S.values.V11_ON){
      const heads=[],segs=[];
      for(const o of window.slithers){if(o===s||o.id===s.id||o.dead)continue;
        if(Number.isFinite(o.xx+o.yy))heads.push(o.xx,o.yy,o.ang,o.sp,o.sc);
        let prev=null;
        for(const pt of [...(o.pts||[]),{xx:o.xx,yy:o.yy}]){
          if(pt.dying||!Number.isFinite(pt.xx+pt.yy)){prev=null;continue;}
          if(prev)segs.push(prev.xx,prev.yy,pt.xx,pt.yy,14.5*o.sc);prev=pt;
        }
      }
      v8Control=window.SlpPilot.v11Choice(v8Switch,{x:s.xx,y:s.yy,sc:s.sc,t:performance.now()/1000,heads,segs},S.values);
    }else '''+old
assert old in s;s=s.replace(old,new).replace('if (S.values.V81_BODY_ON) {','if (S.values.V81_BODY_ON && !S.values.V11_ON) {')
s=s.replace("if(k==='V10_ON'||k==='V9_ON'||(v&&/^V(?:2|3|4|41|5|6|7|8|9)_ON$/.test(k)))S.values.V101_ON=0;", "if(k==='V10_ON'||k==='V9_ON'||(v&&/^V(?:2|3|4|41|5|6|7|8|9)_ON$/.test(k))){S.values.V101_ON=0;S.values.V11_ON=0;}")
s=s.replace("if(k==='V101_ON'&&v)", "if(k==='V11_ON'&&v){S.values.V101_ON=1;S.values.V10_ON=1;for(const key of ['V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;}\n  if(k==='V101_ON'&&v)")
s=s.replace("btn('V10-1', !!S.values.V101_ON", "btn('V11', !!S.values.V11_ON, () => applyPreset('v11_near'), '원본 V8 먹이 추종 + 머리 또는 몸통 근접 시 V10 회피'),\n      btn('V10-1', !!S.values.V101_ON && !S.values.V11_ON")
s=s.replace("t.v101_on ? 'V10-1'", "t.v11_on?'V11':t.v101_on ? 'V10-1'").replace("last.trace.v101_on?'V10-1'", "last.trace.v11_on?'V11':last.trace.v101_on?'V10-1'")
s=s.replace("S.values.V101_ON?'V10-1 · 먹이+조건부 V10'", "S.values.V11_ON?'V11 · 먹이+근접 V10':S.values.V101_ON?'V10-1 · 먹이+조건부 V10'")
s=s.replace("? [...(S.values.V101_ON?", "? [...(S.values.V11_ON?['V11_HEAD_R','V11_BODY_GAP','V11_CLEAR_S'].map(k=>sw(k,({V11_HEAD_R:'V10 전환 머리 거리',V11_BODY_GAP:'V10 전환 몸통 간격',V11_CLEAR_S:'먹이 모드 복귀 대기'})[k],'거리 기준 전환. 0이면 해당 거리 조건 끔. 몸통 간격은 표시 두께 기준이며 실측 사망 경계 아님')):[]),...(S.values.V101_ON?")
s=s.replace("['V8_HEAD_R','V8_HEAD_N','V8_CLEAR_S','V81_BODY_ON','V81_BODY_R','V81_BODY_PCT','V81_BODY_NEAR_W','V81_BODY_SELF_W','W_FOOD','W_GOAL','REMAINS','BOOST_COST'].map", "(S.values.V11_ON?['W_FOOD','W_GOAL','REMAINS','BOOST_COST']:['V8_HEAD_R','V8_HEAD_N','V8_CLEAR_S','V81_BODY_ON','V81_BODY_R','V81_BODY_PCT','V81_BODY_NEAR_W','V81_BODY_SELF_W','W_FOOD','W_GOAL','REMAINS','BOOST_COST']).map")
s=s.replace("it[0].startsWith('V10_')||", "it[0].startsWith('V10_')||it[0].startsWith('V11_')||")
s=s.replace("'v101_on']","'v101_on','v11_on','v11_head_distance','v11_body_gap']").replace('tr.v101_on]);','tr.v101_on,tr.v11_on,tr.v11_head_distance,tr.v11_body_gap]);')
s=s.replace("ring(S.values.V81_BODY_R,", "ring(S.values.V11_ON?S.values.V11_BODY_GAP+14.5*me.sc:S.values.V81_BODY_R,")
s=s.replace("ring((S.values.V101_ON || S.values.V8_ON) ? S.values.V8_HEAD_R", "ring(S.values.V11_ON?S.values.V11_HEAD_R:(S.values.V101_ON || S.values.V8_ON) ? S.values.V8_HEAD_R")
p.write_text(s)
p=Path('params.json');d=json.loads(p.read_text());d['defaults'].update(V11_ON=0,V11_HEAD_R=250,V11_BODY_GAP=80,V11_CLEAR_S=1)
for preset in d['presets'].values():preset['values']['V11_ON']=0
values={**d['defaults'],**d['presets']['v101_hybrid']['values'], 'V11_ON':1, 'V81_BODY_ON':0}
d['presets']['v11_near']={'label':'V11 · V8 먹이 + 근접 V10 회피','profile':'aggressive','values':values}
d['ui'].append({'group':'V11 — 근접 시 V10 회피','items':[['V11_ON','V11 켜기',0,1,1,True],['V11_HEAD_R','머리 중심 거리 px',0,2000,10,True],['V11_BODY_GAP','몸통 표시 두께 간격 px',0,500,5,True],['V11_CLEAR_S','안전 복귀 대기 s',0,5,.1,True]]})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
version='1001-'+hashlib.sha256(Path('ext/pilot.js').read_bytes()+Path('ext/mod.js').read_bytes()+p.read_bytes()).hexdigest()[:8]
Path('ext/params.js').write_text('window.SLP_PARAMS = '+json.dumps({**d,'__ext_version':version},ensure_ascii=False)+';\n');p=Path('ext/manifest.json');m=json.loads(p.read_text());m['version_name']=version;p.write_text(json.dumps(m,indent=2)+'\n');print(version)
