import json,re
from pathlib import Path
root=Path('.');out=root/'research/b1_20261002'
p=(out/'before/pilot.js').read_text()
start=p.index('  t6Step(s) {');end=p.index('\n  t5Step(s)',start)
m=p[start:end].replace('t6Step(s) {','b1Control(s, intent, base) {',1)
a=m.index('    const cache=');b=m.index('    const previous=')
m=m[:a]+'''    const phase=base.trace.v8_phase||'feed',railHints=t5Contours(s,(V.T4_GAP??-5)+2);
    const quant=a=>(Math.floor(((a%TAU+TAU)%TAU)/TAU*251)+.5)*TAU/251;
    const nearRails=railHints.map(r=>({...r,d:this.t6GuideAt(r,root.st).d})).filter(r=>r.d<200).sort((a,b)=>a.d-b.d).slice(0,6);
    let points=base.draw?.chosen||[],graph={routes:[],nodes:0,rails:railHints.length,reason:'intent',ms:0};
    const goal=base.draw?.goal;
    if(phase==='feed'&&goal&&Number.isFinite(goal[0]+goal[1]))points=[s.x,s.y,goal[0],goal[1]];
    if(points.length<4||hypot(points.at(-2)-s.x,points.at(-1)-s.y)<30)points=[s.x,s.y,s.x+650*Math.cos(intent[0]),s.y+650*Math.sin(intent[0])];
    let routes=[{points,goal:{x:points.at(-2),y:points.at(-1)},angle:intent[0]}];
    // Keep V10-1's selected target. Only a missing avoid route invokes the
    // contour graph, so ordinary feeding does not become constant escape.
    if(phase==='avoid'&&!base.trace.v10_routes){
      const cache=this.b1Graph,resume=cache?.graph.work&&s.t-cache.at<.6&&hypot(s.x-cache.x,s.y-cache.y)<160;
      if(!cache||cache.graph.work||s.t-cache.at>.3||hypot(s.x-cache.x,s.y-cache.y)>80){
        graph=this.t6Graph(s,W,resume?cache.graph.work:null);this.b1Graph={graph,at:resume?cache.at:s.t,x:resume?cache.x:s.x,y:resume?cache.y:s.y};
      }else graph=cache.graph;
      if(graph.routes.length){routes=graph.routes;this.b1Recent={routes,at:s.t};}
      else if(graph.reason==='budget'&&this.b1Recent&&s.t-this.b1Recent.at<1)routes=this.b1Recent.routes;
    }else this.b1Graph=null;
    const canBoost=!!(V.V10_ESCAPE_BOOST??1)&&s.L>=(V.V2_MINL??30)&&(phase==='avoid'||intent[1]);
    const original=root.ok?this.v9Roll(s,W,ph,root.st,0,.8,root.t,quant(intent[0]),!!intent[1]):null;
    if(phase==='feed'&&original?.ok&&original.clear>=32){
      const pts=[];for(let i=0;i<original.pts.length;i+=5)pts.push(original.pts[i+1],original.pts[i+2]);
      const trace={...base.trace,b1_on:1,b1_phase:phase,b1_intervened:0,b1_reason:'open_original',b1_base_cmd:r1(deg(intent[0])),b1_base_boost:!!intent[1],b1_clear:original.clear,b1_checked_s:original.t,b1_root_safe:true,b1_safe_commands:1,b1_rail_count:railHints.length,b1_graph_routes:0,b1_ms:performance.now()-started,b1_gap:V.T4_GAP??-5};
      this.last={...base,trace,plan:null,controls:null,draw:{...base.draw,b1Path:pts,b1Guides:[],b1Unsafe:false}};this.prev=intent[0];this.prevBoost=intent[1];return intent;
    }
''' + m[b:]
m=m.replace('const previous=this.t6Goal;','const previous=this.b1Goal;')
m=m.replace('return best;\n    };','return best+Math.abs(wrap(q.cmd-intent[0]))*.015;\n    };',1)
m=m.replace('const angles=[];','const angles=[intent[0],...nearRails.map(r=>this.t6GuideAt(r,root.st,80).angle)];',1)
m=m.replace('this.t6Guide.invalid=true;','this.b1Graph=null;')
m=m.replace('this.t6Goal','this.b1Goal')
a=m.index('    const trace={mode:');b=m.index('    this.prev=',a)
m=m[:a]+'''    const changed=Math.abs(wrap(chosen.cmd-intent[0]))>TAU/251||chosen.boost!==!!intent[1];
    const trace={...base.trace,mode:unsafe?'emergency':base.trace.mode,boost:chosen.boost,cmd:r1(deg(chosen.cmd)),b1_on:1,b1_phase:phase,b1_intervened:changed?1:0,b1_reason:unsafe?'recovery':graph.routes.length?'contour_exit':'precision',b1_base_cmd:r1(deg(intent[0])),b1_base_boost:!!intent[1],b1_clear:chosen.clear,b1_checked_s:chosen.t,b1_root_safe:root.ok,b1_safe_commands:safeCount,b1_rail_count:railHints.length,b1_graph_routes:graph.routes.length,b1_ms:performance.now()-started,b1_gap:V.T4_GAP??-5};
    this.last={...base,trace,mode:trace.mode,plan:null,controls:null,draw:{...base.draw,chosen:pts,localPath:null,b1Guides:routes.map(r=>r.points),b1Unsafe:unsafe,b1Path:pts}};
''' +m[b:]
b1='''  b1Values() {return {...this.values,B1_ON:0};}
  b1Step(s) {
    if(!this.b1Base)this.b1Base=new Pilot(this.b1Values(),this.profile);
    if(!this.b1Fine)this.b1Fine=new Pilot({...this.b1Values(),T4_GAP:this.values.B1_GAP??-5},this.profile);
    const begin=performance.now(),intent=this.b1Base.step(s),result=this.b1Fine.b1Control(s,intent,this.b1Base.last);
    this.last=this.b1Fine.last;this.last.trace.b1_total_ms=performance.now()-begin;
    const active=this.b1Base[this.last.trace.v8_phase==='avoid'?'v101Avoid':'v101Feed'];
    for(const child of [this.b1Base,active])if(child){if(child.prevBoost!==result[1])child.boostSince=s.t;child.prev=result[0];child.prevBoost=result[1];}
    this.prev=result[0];this.prevBoost=result[1];return result;
  }

'''+m
p=p[:start]+b1+p[start:]
p=p.replace('setParams(values, profile) {','setParams(values, profile) { this.b1Fine=null;this.b1Base=null;',1)
p=p.replace('    if (this.values.T6_ON)', '    if (this.values.B1_ON) return this.b1Step(s);\n    if (this.values.T6_ON)',1)
(root/'ext/pilot.js').write_text(p)
D=json.loads((out/'before/params.json').read_text());D['defaults'].update(B1_ON=0,B1_GAP=-5)
for v in D['profiles'].values():v['B1_ON']=0
for v in D['presets'].values():v['values']['B1_ON']=0
from copy import deepcopy
v=deepcopy(D['presets']['v101_hybrid']);v['label']='B1 · V10-1 + 외곽선 정밀 제어';v['values'].update(B1_ON=1,B1_GAP=-5,TRACK_ON=0)
D['presets']['b1_contour']=v
D['ui'].append({'name':'B1 외곽선 정밀 제어','items':[['B1_ON','B1 외곽선 정밀 제어',0,1,1],['B1_GAP','몸통 오프셋',-20,20,1]],'sixth':True})
(root/'params.json').write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
M=(out/'before/mod.js').read_text()
keys=['b1_on','b1_phase','b1_intervened','b1_reason','b1_base_cmd','b1_base_boost','b1_clear','b1_checked_s','b1_root_safe','b1_safe_commands','b1_rail_count','b1_graph_routes','b1_ms','b1_gap','b1_total_ms']
M=M.replace("'t6_ms','t6_gap']","'t6_ms','t6_gap',"+','.join(repr(k) for k in keys)+']',1)
M=M.replace('tr.t6_ms,tr.t6_gap]);','tr.t6_ms,tr.t6_gap,'+','.join('tr.'+k for k in keys)+']);',1)
M=M.replace('draw: {t6Guides:', 'draw: {b1Path:d.b1Path,b1Guides:d.b1Guides,b1Unsafe:d.b1Unsafe,t6Guides:',1)
M=M.replace('S.values.T6_ON ||','S.values.B1_ON || S.values.T6_ON ||')
M=M.replace('S.values.T6_ON)','S.values.T6_ON || S.values.B1_ON)')
M=M.replace('(S.values.T5_ON||S.values.T6_ON)','(S.values.T5_ON||S.values.T6_ON||S.values.B1_ON)')
M=M.replace("function setValue(k, v) {",'''function setValue(k, v) {
  if(k!=='B1_ON'&&v&&(/^(VA1|V[0-9]+|T[1-6])_ON$/.test(k)||k==='PROBE_ON'))S.values.B1_ON=0;
  if(k==='B1_ON'&&v){for(const key of ['T6_ON','T5_ON','T4_ON','T3_ON','T2_ON','T1_ON','VA1_ON','V111_ON','V11_ON','V102_ON','V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;S.values.V101_ON=1;S.values.V10_ON=1;plan=null;commandHistory.length=0;v8Switch={phase:'feed',clearSince:null};}
''',1)
M=M.replace('if(v10Active() && performance.now()-obsAt>120)', 'if((v10Active()||S.values.B1_ON) && performance.now()-obsAt>120)',1)
M=M.replace('    else if(v10Active() && r.controls?.length){',"    else if(S.values.B1_ON){plan=null;applyCmd(r.cmd,r.boost,'b1_controls');}\n    else if(v10Active() && r.controls?.length){",1)
M=M.replace('    if(d.t6Path&&S.show.path){', '''    if(d.b1Path&&S.show.path){
      ctx.save();ctx.lineWidth=OVERLAY_LINE_WIDTH;ctx.strokeStyle='#ffb83d';ctx.setLineDash([5,5]);
      for(const p of d.b1Guides||[])polyline(ctx,p,X,Y);ctx.setLineDash([]);ctx.strokeStyle=d.b1Unsafe?'#ff5b6b':last.boost?'#ffd040':'#60ff60';polyline(ctx,d.b1Path,X,Y);ctx.restore();
    }
    if(d.t6Path&&S.show.path){''',1)
M=M.replace('S.values.T6_ON ? \'T6',"S.values.B1_ON ? 'B1 · V10-1 + 외곽선 정밀 제어' : S.values.T6_ON ? 'T6",1)
M=M.replace("(t.t6_on ?", "(t.b1_on ? `B1 · ${t.v101_wrap_active?'감김 탈출':t.b1_phase==='feed'?'먹이':'회피'}${t.b1_intervened?' · 정밀 보정':''}` : t.t6_on ?",1)
M=M.replace("      btn('T6',", "      btn('B1', !!S.values.B1_ON, () => applyPreset('b1_contour'), 'V10-1 먹이·감김 판단 + 외곽선 회전·부스트 검사'),\n      btn('T6',",1)
M=M.replace("btn('V10-1', !!S.values.V101_ON", "btn('V10-1', !S.values.B1_ON && !!S.values.V101_ON",1)
M=M.replace("const rows = S.values.T6_ON ?", "const rows = S.values.B1_ON ? [sw('B1_GAP','몸통 오프셋','머리 중심 안내 간격: 적 반경 + 내 반경 + 오프셋. −5는 사용자 선택값'),sw('V101_WRAP_ON','감김 회피','V10-1 감김 전환 유지'),sw('V10_ESCAPE_BOOST','부스트 허용','원호 검사에 통과한 가속 후보'),...['W_FOOD','W_GOAL','REMAINS','BOOST_COST'].map(k=>sw(k,({W_FOOD:'먹이 추종',W_GOAL:'잔해 목표 추종',REMAINS:'잔해 판정',BOOST_COST:'먹이 부스트 비용'})[k],'V10-1 원본 먹이 판단'))] : S.values.T6_ON ?",1)
M=M.replace("items.filter(it=>it[0].startsWith('V10_')", "items.filter(it=>(S.values.B1_ON&&it[0].startsWith('B1_'))||it[0].startsWith('V10_')",1)
M=M.replace('last: last && {t6_on:', 'last: last && {'+','.join(k+':last.trace.'+k for k in keys)+',t6_on:',1)
(root/'ext/mod.js').write_text(M)
