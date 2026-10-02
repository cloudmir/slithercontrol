from pathlib import Path
import json, hashlib
out=Path('research/v101_wrap_20261001')
p=Path('ext/pilot.js').read_text()
start=p.index('    // 2.d: bodies all around?')
end=p.index('    // Coil on our own circle:',start)
block=p[start:end].replace('this.', 'K.')
helper='''// V10-1 reuses the original V1 wrap detector, opening selection and locks.
// Isolated state: neither original V1 nor V8 histories are changed.
function v101Wrap(K, s, V) {
  const S=s.segs||[],sid=Array.from(s.sid||[]),ns=S.length/5,px=s.x,py=s.y,T=s.t,
    ro=R*s.sc,P=makeParams(V,'safe'),H5=s.heads||[],nh=H5.length/5;
  const heads=[];for(let i=0;i<nh;i++){const h=Array.from(H5.slice(i*5,i*5+5));h.id=s.hid?.[i];heads.push(h);}
  const nearAll=Array.from({length:ns},(_,k)=>segDist(px,py,S,k));
  K.covHist ||= [];K.giantSince ||= new Map();
  for(const key of ['wrapTarget','giantTarget','escLock','escId'])if(K[key]===undefined)K[key]=null;
'''+block+'''
  // The old exit hold must not be inherited by a different wrapping snake.
  if(wrapEsc!==null&&K.lastId!==undefined&&K.lastId!==wrapId){K.escLock=null;K.lastId=wrapId;return v101Wrap(K,s,V);}
  K.lastId=wrapId;
  return wrapEsc===null?null:{id:wrapId,coverage:wrapCov,angle:wrapEsc,bins:wrapBins,
    raid:raidHit,early:wfHit,headSpeed:wrapHeadSp};
}
function v101Choice(K,s,V,fallback) {
  const previous=K.phase,c=fallback();
  if(!V.V101_WRAP_ON||V.V11_ON||V.V102_ON||V.V111_ON){K.wrapState=null;return c;}
  const e=v101Wrap(K.wrapState||(K.wrapState={}),s,V);
  if(e){K.phase='avoid';K.clearSince=null;}
  return {...c,phase:K.phase,switched:K.phase!==previous?1:0,reason:e?'wrap':c.reason,wrap:e};
}

'''
p=p.replace('// V11 uses physical proximity',helper+'// V11 uses physical proximity',1)
p=p.replace('v8Choice, v11Choice, v102Choice, R,','v8Choice, v11Choice, v102Choice, v101Wrap, v101Choice, R,')
p=p.replace("const c=s.v8Control||(this.values.V102_ON?v102Choice(K,s,this.values,fallback):fallback());", "const c=s.v8Control||v101Choice(K,s,this.values,()=>this.values.V102_ON?v102Choice(K,s,this.values,fallback):fallback());")
p=p.replace("if(c.switched&&c.phase==='avoid'){child.v10Held=null;", "if((c.switched||c.wrap?.id!==this.v101WrapId)&&c.phase==='avoid'){child.v10Held=null;")
p=p.replace("const result=child.step(state);this.last=child.last;", "const result=c.wrap?child.v101WrapStep({...state,wrapEscape:c.wrap}):child.step(state);this.v101WrapId=c.wrap?.id;this.last=child.last;",1)
p=p.replace('v102_on:this.values.V102_ON?1:0,','v101_wrap_on:this.values.V101_WRAP_ON?1:0,v101_wrap_active:c.wrap?1:0,v101_wrap_id:c.wrap?.id??null,v101_wrap_cov:c.wrap?.coverage??0,v101_wrap_angle:c.wrap?.angle??null,v102_on:this.values.V102_ON?1:0,',1)
# Keep the entire original V10 method byte-for-byte. Its isolated wrap variant
# uses the same continuous collision checks, with exit intent ahead of food.
a=p.index('  v10Step(s) {');b=p.index('\n  v111StaticWorld(s)',a)
method=p[a:b].replace('  v10Step(s) {','  v101WrapStep(s) {\n    const exit=s.wrapEscape.angle; s={...s,food:new Float64Array(0)};',1)
method=method.replace("let picked=this.v10Choose(valid,this.v10RouteId);", "let picked=valid.slice().sort((a,b)=>Math.cos(b.actions[0].target-exit)-Math.cos(a.actions[0].target-exit)||a.closure.risk-b.closure.risk)[0];")
method=method.replace("picked=this.v10FeedPrefix(s,PW,ph,root,picked,deadline);", "// Wrap escape keeps the checked route prefix and skips food detours.\n      ")
method=method.replace("[0,-.5,.5,-1,1,-2,2,PI]", "[wrap(exit-root.st.h),0,-.5,.5,-1,1,-2,2,PI]")
method=method.replace("Number(b.ok)-Number(a.ok)||", "Number(b.ok)-Number(a.ok)||(a.ok&&b.ok?Math.cos(b.angle-exit)-Math.cos(a.angle-exit):0)||")
# Never report safe if the delayed prefix already collides.
method=method.replace("v10_selection_reason:selectionReason", "v10_selection_reason:'wrap_exit'")
p=p[:b]+'\n'+method+p[b:]
Path('ext/pilot.js').write_text(p)
m=Path('ext/mod.js').read_text()
needle='    if (v8Control.switched) { route = null;'
extra='''    if(S.values.V101_ON&&S.values.V101_WRAP_ON&&!S.values.V11_ON&&!S.values.V102_ON&&!S.values.V111_ON){
      const segs=[],sid=[],heads=[],hid=[];
      for(const o of window.slithers){if(o===s||o.id===s.id||o.dead)continue;
        if(Number.isFinite(o.xx+o.yy)){heads.push(o.xx,o.yy,o.ang,o.sp,o.sc);hid.push(o.id);}
        let prev=null;
        for(const pt of [...(o.pts||[]),{xx:o.xx,yy:o.yy}]){
          if(pt.dying||!Number.isFinite(pt.xx+pt.yy)){prev=null;continue;}
          if(prev&&Math.min(prev.xx,pt.xx)<=s.xx+500&&Math.max(prev.xx,pt.xx)>=s.xx-500&&Math.min(prev.yy,pt.yy)<=s.yy+500&&Math.max(prev.yy,pt.yy)>=s.yy-500){segs.push(prev.xx,prev.yy,pt.xx,pt.yy,14.5*o.sc);sid.push(o.id);}prev=pt;
        }
      }
      // Baseline choice already ran; restore its prior phase for switch reporting.
      const prior=v8Control.switched?(v8Control.phase==='avoid'?'feed':'avoid'):v8Control.phase;
      v8Switch.phase=prior;
      v8Control=window.SlpPilot.v101Choice(v8Switch,{x:s.xx,y:s.yy,sc:s.sc,t:performance.now()/1000,segs,sid,heads,hid},S.values,()=>{v8Switch.phase=v8Control.phase;return v8Control;});
    }else v8Switch.wrapState=null;
'''
m=m.replace(needle,extra+needle,1)
m=m.replace("? [...(S.values.V102_ON?", "? [...(S.values.V101_ON&&!S.values.V11_ON&&!S.values.V102_ON?[sw('V101_WRAP_ON','감김 회피','기존 24방향 덮개·빈 구간 탈출. 켜면 혼잡 조건과 별도로 V10 회피 전환'),sw('WF_ON','큰 적 조기 감김 감지','기존 두께 비율·덮개 기준으로 더 일찍 탈출'),sw('WF_RATIO','감김 적 두께 비율','내 반경 대비 적 몸통 반경'),sw('WF_COV','조기 감김 덮개','24방향 중 같은 적이 덮은 비율')]:[]),...(S.values.V102_ON?",1)
m=m.replace("it[0].startsWith('V10_')||", "it[0].startsWith('V10_')||(S.values.V101_ON&&(it[0].startsWith('V101_')||it[0].startsWith('WF_')))||",1)
fields=['v101_wrap_on','v101_wrap_active','v101_wrap_id','v101_wrap_cov','v101_wrap_angle']
m=m.replace("'v111_terminal']", "'v111_terminal',"+','.join(repr(x) for x in fields)+']',1)
m=m.replace('tr.v111_terminal]);', 'tr.v111_terminal,'+','.join('tr.'+x for x in fields)+']);',1)
m=m.replace("last.trace.v8_phase === 'avoid' ?", "last.trace.v101_wrap_active?'감김 탈출':last.trace.v8_phase === 'avoid' ?",1)
m=m.replace("t.v8_phase === 'avoid' ?", "t.v101_wrap_active?'감김 탈출':t.v8_phase === 'avoid' ?",1)
Path('ext/mod.js').write_text(m)
d=json.loads(Path('params.json').read_text());d['defaults']['V101_WRAP_ON']=1
d['presets']['v101_hybrid']['values']['V101_WRAP_ON']=1
d['ui'].insert(0,{'group':'V10-1 — 감김 회피','items':[['V101_WRAP_ON','감김 회피 켜기',0,1,1,True]]})
Path('params.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
version='1001-'+hashlib.sha256(Path('ext/pilot.js').read_bytes()+Path('ext/mod.js').read_bytes()+Path('params.json').read_bytes()).hexdigest()[:8]
Path('ext/params.js').write_text('window.SLP_PARAMS = '+json.dumps({**d,'__ext_version':version},ensure_ascii=False)+';\n')
mf=json.loads(Path('ext/manifest.json').read_text());mf['version_name']=version;Path('ext/manifest.json').write_text(json.dumps(mf,ensure_ascii=False,indent=2)+'\n')
print(version)
