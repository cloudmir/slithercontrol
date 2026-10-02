from pathlib import Path
import json,shutil,hashlib
out=Path('research/v111_20261001')
for n in ['pilot.js','mod.js','params.js','manifest.json']:shutil.copy2(Path('ext')/n,out/'before'/n)
shutil.copy2('params.json',out/'before/params.json')
p=Path('ext/pilot.js');s=p.read_text()
def method(name,end):return s[s.index('  '+name+'('):s.index('  '+end+'(',s.index('  '+name+'('))]
a=method('v9World','v9Roll').replace('v9World(s)','v111StaticWorld(s)').replace('if (gap < 0) return gap;','')
b=method('v10World','v10Threat').replace('v10World(s,','v111World(s,').replace('this.v9World(','this.v111StaticWorld(').replace('if(gap<0||!dynamic)return gap;','if(!dynamic)return gap;').replace('if(gap<0)return gap;','')
# These exhaustive checks are exclusive to V11-1, preserving every original world.
fn='''  // Uniform diagnostic continuation: a predicted collision is never labelled safe.
  v111Local(s,W,ph,root,canBoost) {
    const options=[],horizon=Math.max(.6,this.values.V10_LOCAL_H??.9);
    for(const offset of [0,-.25,.25,-.5,.5,-1,1,-1.5,1.5,-2,2,PI])for(const boost of canBoost?[false,true]:[false]){
      const angle=root.st.h+offset,r=this.v9Roll(s,W,ph,root.st,0,horizon,root.t,angle,boost);
      options.push({...r,angle,boost,offset});
    }
    const safe=options.filter(r=>root.ok&&r.ok);
    // In avoidance mode clearance comes before boost economy or food value.
    if(safe.length){safe.sort((a,b)=>b.clear-a.clear||Number(a.boost)-Number(b.boost)||Math.abs(a.offset)-Math.abs(b.offset));return {...safe[0],recovery:false,evaluated:horizon};}
    const candidates=options.map(q=>({...q,st:{...root.st},t:root.t,pts:[],clear:Infinity,depth:0,terminal:0,firstHit:Infinity,unsafe:0,ok:false}));
    const limit=Math.min(.6,horizon),deadline=performance.now()+8;let elapsed=0;
    do{
      const dt=Math.min(.04,limit-elapsed);
      for(const q of candidates){
        const next=this.v4Adv(q.st,q.angle,q.boost,dt,ph),pad=Math.max(q.st.v,next.v)*dt*Math.abs(wrap(next.h-q.st.h))/8+.15;
        const gap=W.check(q.st,next,q.t,q.t+dt,pad);
        q.clear=Math.min(q.clear,gap);q.terminal=gap;q.depth+=Math.max(0,-gap)*dt;
        if(gap<0){q.firstHit=Math.min(q.firstHit,elapsed);q.unsafe+=dt;}
        q.t+=dt;q.st=next;q.pts.push(q.t,next.x,next.y,next.h,q.boost?1:0);
      }
      elapsed+=dt;
    }while(elapsed<limit-1e-8&&(elapsed<.16||performance.now()<deadline));
    candidates.sort((a,b)=>(b.firstHit-a.firstHit)||a.depth-b.depth||b.terminal-a.terminal||b.clear-a.clear||a.unsafe-b.unsafe||Number(a.boost)-Number(b.boost));
    return {...candidates[0],recovery:true,evaluated:elapsed};
  }
'''
c=method('v10Step','v101Values') # includes comment before v101Values
c=c[:c.rfind('  // V10-1')].replace('v10Step(s)','v111Step(s)').replace('this.v10World(s,true)','this.v111World(s,true)')
start=c.index('      const options=[],horizon=');end=c.index('      action={start:root.t',start)
c=c[:start]+'''      const canBoost=s.L>=(V.V2_MINL??30)&&(V.V10_ESCAPE_BOOST??1);
      const best=this.v111Local(s,W,ph,root,canBoost);checked+=12*(canBoost?2:1);
      local=best;
'''+c[end:]
c=c.replace('let action,pts,clear,safe,mode;', 'let action,pts,clear,safe,mode,local=null;')
c=c.replace('const trace={mode,','const trace={v111_on:1,v111_recovery:!!local?.recovery,v111_evaluated_s:local?.evaluated??0,v111_depth:local?.depth??null,v111_terminal:local?.terminal??null,mode,')
s=s.replace('  // V10-1 shares',a+b+fn+c+'  // V10-1 shares')
s=s.replace('V101_ON:0,V11_ON:0,V102_ON:0','V101_ON:0,V11_ON:0,V102_ON:0,V111_ON:avoid?(this.values.V111_ON??0):0')
s=s.replace('    if (this.values.V101_ON) return this.v101Step(s);','    if (this.values.V101_ON) return this.v101Step(s);\n    if (this.values.V111_ON) return this.v111Step(s);')
p.write_text(s)
p=Path('ext/mod.js');s=p.read_text().replace('S.values.V102_ON=0;}', 'S.values.V102_ON=0;S.values.V111_ON=0;}')
s=s.replace("if(k==='V11_ON'&&v){S.values.V102_ON=0;", "if(k==='V11_ON'&&v){S.values.V102_ON=0;S.values.V111_ON=0;")
s=s.replace("if(k==='V102_ON'&&v){S.values.V11_ON=0;", "if(k==='V102_ON'&&v){S.values.V11_ON=0;S.values.V111_ON=0;")
s=s.replace("if(k==='V111_ON'", "if(k==='V111_ON'")
s=s.replace("  if(k==='V11_ON'", "  if(k==='V111_ON'&&v){S.values.V11_ON=1;S.values.V102_ON=0;S.values.V101_ON=1;S.values.V10_ON=1;for(const key of ['V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;}\n  if(k==='V11_ON'")
s=s.replace("btn('V11', !!S.values.V11_ON,", "btn('V11-1', !!S.values.V111_ON, () => applyPreset('v111_near'), 'V11 먹이 유지 · 근접 회피 후보 확대와 충돌 이후 비교'),\n      btn('V11', !!S.values.V11_ON && !S.values.V111_ON,")
s=s.replace("S.values.V102_ON?'V10-2 · 먹이량 전환'", "S.values.V111_ON?'V11-1 · 근접 회피 개선':S.values.V102_ON?'V10-2 · 먹이량 전환'")
s=s.replace("t.v102_on?'V10-2'", "S.values.V111_ON?'V11-1':t.v102_on?'V10-2'").replace("last.trace.v102_on?'V10-2'", "S.values.V111_ON?'V11-1':last.trace.v102_on?'V10-2'")
s=s.replace("'v102_food_enabled']", "'v102_food_enabled','v111_on','v111_recovery','v111_evaluated_s','v111_depth','v111_terminal']").replace('tr.v102_food_enabled]);','tr.v102_food_enabled,tr.v111_on,tr.v111_recovery,tr.v111_evaluated_s,tr.v111_depth,tr.v111_terminal]);')
p.write_text(s)
p=Path('params.json');d=json.loads(p.read_text());d['defaults']['V111_ON']=0
for pr in d['presets'].values():pr['values']['V111_ON']=0
pr=json.loads(json.dumps(d['presets']['v11_near']));pr['label']='V11-1 · 먹이 유지 + 근접 회피 개선';pr['values']['V111_ON']=1;d['presets']['v111_near']=pr
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
version='1001-'+hashlib.sha256(Path('ext/pilot.js').read_bytes()+Path('ext/mod.js').read_bytes()+p.read_bytes()).hexdigest()[:8];Path('ext/params.js').write_text('window.SLP_PARAMS = '+json.dumps({**d,'__ext_version':version},ensure_ascii=False)+';\n');p=Path('ext/manifest.json');m=json.loads(p.read_text());m['version_name']=version;p.write_text(json.dumps(m,indent=2)+'\n');print(version)
