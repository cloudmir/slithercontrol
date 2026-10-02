from pathlib import Path
import shutil,json,hashlib
out=Path('research/v102_20261001')
for name in ['pilot.js','mod.js','params.js','manifest.json']:shutil.copy2(Path('ext')/name,out/'before'/name)
shutil.copy2('params.json',out/'before/params.json')
p=Path('ext/pilot.js');s=p.read_text();fn='''// Largest observed food cluster: sum of pellet sizes in fixed world grid cells.
function v102Choice(K,s,V,fallback) {
  const bins=new Map(),cell=Math.max(1,V.V102_HEAP_SIZE??160),radius=Math.max(0,V.V102_FOOD_R??3000);
  for(let i=0;i+2<(s.food?.length||0);i+=3){const x=s.food[i],y=s.food[i+1],m=s.food[i+2];
    if(![x,y,m].every(Number.isFinite)||m<=0||hypot(x-s.x,y-s.y)>radius)continue;
    const key=Math.floor(x/cell)+','+Math.floor(y/cell);bins.set(key,(bins.get(key)||0)+m);
  }
  let mass=0;for(const value of bins.values())mass=Math.max(mass,value);
  const threshold=Math.max(0,V.V102_FOOD_MIN??100),previous=K.phase;
  if(!V.V102_FOOD_ON){const result=fallback();return {...result,foodMass:mass,foodThreshold:threshold,foodEnabled:0};}
  K.phase=mass>=threshold?'feed':'avoid';K.clearSince=null;
  return {phase:K.phase,heads:0,radius:0,threshold:0,switched:K.phase!==previous?1:0,bodyDensity:0,bodyTrigger:0,
    reason:K.phase==='feed'?'food_enough':'food_low',foodMass:mass,foodThreshold:threshold,foodEnabled:1};
}

''';s=s.replace('class Pilot {',fn+'class Pilot {')
s=s.replace('V101_ON:0,V11_ON:0','V101_ON:0,V11_ON:0,V102_ON:0')
old="const c=s.v8Control||(this.values.V11_ON?v11Choice(K,s,this.values):v8Choice(K,countHeads(s,this.values.V8_HEAD_R??450),s.t,this.values,\n      this.values.V81_BODY_ON?bodyDensity(s,this.values.V81_BODY_R??450,this.values.V81_BODY_NEAR_W??2,this.values.V81_BODY_SELF_W??.1):0));"
new="""const fallback=()=>this.values.V11_ON?v11Choice(K,s,this.values):v8Choice(K,countHeads(s,this.values.V8_HEAD_R??450),s.t,this.values,
      this.values.V81_BODY_ON?bodyDensity(s,this.values.V81_BODY_R??450,this.values.V81_BODY_NEAR_W??2,this.values.V81_BODY_SELF_W??.1):0);
    const c=s.v8Control||(this.values.V102_ON?v102Choice(K,s,this.values,fallback):fallback());"""
assert old in s;s=s.replace(old,new)
s=s.replace('v101_on:1,v11_on:', 'v102_on:this.values.V102_ON?1:0,v102_food_mass:c.foodMass??null,v102_food_threshold:c.foodThreshold??null,v102_food_enabled:c.foodEnabled??0,v101_on:1,v11_on:')
s=s.replace('v8Choice, v11Choice, R','v8Choice, v11Choice, v102Choice, R');p.write_text(s)
p=Path('ext/mod.js');s=p.read_text();s=s.replace('S.values.V81_BODY_ON && !S.values.V11_ON','S.values.V81_BODY_ON && !S.values.V11_ON && !(S.values.V102_ON&&S.values.V102_FOOD_ON)')
old='}else v8Control = window.SlpPilot.v8Choice(v8Switch, seen.size, performance.now() / 1000, S.values, density);'
new='''}else {
      const fallback=()=>window.SlpPilot.v8Choice(v8Switch,seen.size,performance.now()/1000,S.values,density);
      if(S.values.V102_ON){
        const food=[];
        for(let i=0;i<window.foods_c;i++){const f=window.foods[i];if(f&&!f.eaten)food.push(f.xx,f.yy,f.sz);}
        v8Control=window.SlpPilot.v102Choice(v8Switch,{x:s.xx,y:s.yy,food},S.values,fallback);
      }else v8Control=fallback();
    }'''
assert old in s;s=s.replace(old,new)
s=s.replace('S.values.V101_ON=0;S.values.V11_ON=0;', 'S.values.V101_ON=0;S.values.V11_ON=0;S.values.V102_ON=0;')
s=s.replace("if(k==='V11_ON'&&v){", "if(k==='V11_ON'&&v){S.values.V102_ON=0;")
s=s.replace("if(k==='V101_ON'&&v){", "if(k==='V102_ON'&&v){S.values.V11_ON=0;S.values.V101_ON=1;S.values.V10_ON=1;for(const key of ['V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;}\n  if(k==='V101_ON'&&v){")
s=s.replace("btn('V11',", "btn('V10-2', !!S.values.V102_ON, () => applyPreset('v102_food'), '군집 먹이량 기준: V8 먹이 추종 ↔ V10 회피'),\n      btn('V11',")
s=s.replace("!!S.values.V101_ON && !S.values.V11_ON,", "!!S.values.V101_ON && !S.values.V11_ON && !S.values.V102_ON,")
s=s.replace("S.values.V11_ON?'V11 · 먹이+근접 V10'", "S.values.V102_ON?'V10-2 · 먹이량 전환':S.values.V11_ON?'V11 · 먹이+근접 V10'")
s=s.replace("t.v11_on?'V11'", "t.v102_on?'V10-2':t.v11_on?'V11'").replace("last.trace.v11_on?'V11'", "last.trace.v102_on?'V10-2':last.trace.v11_on?'V11'")
s=s.replace("? [...(S.values.V11_ON?", "? [...(S.values.V102_ON?['V102_FOOD_ON','V102_FOOD_MIN','V102_FOOD_R','V102_HEAP_SIZE'].map(k=>sw(k,({V102_FOOD_ON:'먹이량 전환 켜기',V102_FOOD_MIN:'먹이 추종 최소 군집량',V102_FOOD_R:'먹이량 탐색 반경',V102_HEAP_SIZE:'군집 격자 크기'})[k],'최대 군집의 먹이 크기 합계 ≥ 기준: 먹이 추종. 미만: 회피. 끄면 V10-1 조건 사용. 모든 크기의 관측 먹이 포함')):[]),...(S.values.V11_ON?")
s=s.replace("it[0].startsWith('V11_')||", "it[0].startsWith('V11_')||it[0].startsWith('V102_')||")
s=s.replace("'v11_body_gap']", "'v11_body_gap','v102_on','v102_food_mass','v102_food_threshold','v102_food_enabled']").replace('tr.v11_body_gap]);','tr.v11_body_gap,tr.v102_on,tr.v102_food_mass,tr.v102_food_threshold,tr.v102_food_enabled]);')
needle="  // Food search radius is a display-only ring, independent of bot/path visibility."
color='''  // Mode head tint remains visible even when path overlays are disabled.
  if(window.playing&&!me.dead&&S.bot&&S.values.V102_ON){
    ctx.save();ctx.fillStyle=v8Switch.phase==='feed'?'#ff3030':'#3080ff';ctx.globalAlpha=.85;
    ctx.beginPath();ctx.arc(X(me.xx+(me.fx||0)),Y(me.yy+(me.fy||0)),Math.max(2,14.5*me.sc*g),0,2*Math.PI);ctx.fill();ctx.restore();
  }
'''
assert needle in s;s=s.replace(needle,color+needle)
p.write_text(s)
p=Path('params.json');d=json.loads(p.read_text());d['defaults'].update(V102_ON=0,V102_FOOD_ON=1,V102_FOOD_MIN=100,V102_FOOD_R=3000,V102_HEAP_SIZE=160)
for preset in d['presets'].values():preset['values']['V102_ON']=0
values={**d['defaults'],**d['presets']['v101_hybrid']['values'],'V102_ON':1,'V11_ON':0}
d['presets']['v102_food']={'label':'V10-2 · 군집 먹이량 전환','profile':'aggressive','values':values}
d['ui'].append({'group':'V10-2 — 군집 먹이량 전환','items':[['V102_ON','V10-2 켜기',0,1,1,True],['V102_FOOD_ON','먹이량 전환 켜기',0,1,1,True],['V102_FOOD_MIN','먹이 추종 최소 군집량 · 크기 합계',0,5000,10,True],['V102_FOOD_R','먹이량 탐색 반경 px',100,6000,100,True],['V102_HEAP_SIZE','군집 격자 크기 px',40,600,20,True]]})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
version='1001-'+hashlib.sha256(Path('ext/pilot.js').read_bytes()+Path('ext/mod.js').read_bytes()+p.read_bytes()).hexdigest()[:8]
Path('ext/params.js').write_text('window.SLP_PARAMS = '+json.dumps({**d,'__ext_version':version},ensure_ascii=False)+';\n');p=Path('ext/manifest.json');m=json.loads(p.read_text());m['version_name']=version;p.write_text(json.dumps(m,indent=2)+'\n');print(version)
