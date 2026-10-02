from pathlib import Path
import json,copy
root=Path.cwd();p=root/'ext/pilot.js';s=p.read_text()
helper='''// T5 display-only rails at the same head-centre offset as T4's chosen path.
function t5Contours(s, gap=-5) {
  const S=s.segs, ids=s.sid, ro=R*s.sc, groups=new Map(), result=[];
  for(let k=0;k<ids.length;k++){if(!groups.has(ids[k]))groups.set(ids[k],[]);groups.get(ids[k]).push(k);}
  for(const [id,keys]of groups){let points=[],cum=[];
    const flush=()=>{if(points.length<2){points=[];cum=[];return;}
      const end=cum[cum.length-1],at=a=>{a=clip(a,0,end);let lo=0,hi=points.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(cum[m]<=a)lo=m;else hi=m;}const u=(a-cum[lo])/(cum[hi]-cum[lo]||1),p=points[lo],q=points[hi];return [p[0]+u*(q[0]-p[0]),p[1]+u*(q[1]-p[1])];};
      const rails=[[],[]];for(let j=0;j<points.length;j++){const p=points[j],a=at(cum[j]-35),b=at(cum[j]+35),dx=b[0]-a[0],dy=b[1]-a[1],n=hypot(dx,dy);if(n<1e-7)continue;const D=Math.max(0,ro+p[2]+gap),nx=-dy/n,ny=dx/n;rails[0].push(p[0]+nx*D,p[1]+ny*D);rails[1].push(p[0]-nx*D,p[1]-ny*D);}
      for(let j=0;j<2;j++)if(rails[j].length>=4)result.push({id,side:j? -1:1,points:rails[j]});points=[];cum=[];
    };
    for(const k of keys){const [ax,ay,bx,by,r]=S.slice(k*5,k*5+5);if(!Number.isFinite(ax+ay+bx+by+r)||r<0){flush();continue;}if(hypot(bx-ax,by-ay)<1e-7)continue;
      const last=points[points.length-1];if(last&&hypot(ax-last[0],ay-last[1])>2)flush();
      if(!points.length){points.push([ax,ay,r]);cum.push(0);}const prev=points[points.length-1];points.push([bx,by,r]);cum.push(cum[cum.length-1]+hypot(bx-prev[0],by-prev[1]));
    }flush();
  }return result;
}

'''
assert 'function t5Contours' not in s;s=s.replace('class Pilot {',helper+'class Pilot {',1)
s=s.replace('  t4Step(s) {',"  t5Step(s) {\n    const command=this.t4Step(s);this.last.trace.t5_on=1;return command;\n  }\n\n  t4Step(s) {",1)
s=s.replace('    if (this.values.T4_ON) return this.t4Step(s);','    if (this.values.T5_ON) return this.t5Step(s);\n    if (this.values.T4_ON) return this.t4Step(s);',1)
s=s.replace('root.SlpPilot = {Pilot,','root.SlpPilot = {Pilot, t5Contours,',1);p.write_text(s)
p=root/'params.json';d=json.loads(p.read_text());d['defaults']['T5_ON']=0
for v in d['presets'].values():v['values']['T5_ON']=0
t=copy.deepcopy(d['presets']['t4_close']);t['label']='T5 · 모든 적 외곽선 + 밀착 추종';t['values']['T4_ON']=0;t['values']['T5_ON']=1;d['presets']['t5_contours']=t
d['groups'].append({'group':'T5 모든 적 외곽선','items':[['T5_ON','T5 외곽선·추종',0,1,1,False]],'sixth':True}) if 'groups' in d else None
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'ext/mod.js';s=p.read_text();s=s.replace("const BASIC = [", "const BASIC = [['enemyContours', 'T5 적 외곽선'], ",1)
s=s.replace('S.values.T3_ON || S.values.T4_ON','S.values.T3_ON || S.values.T4_ON || S.values.T5_ON')
insert="""  if(k!=='T5_ON'&&v&&(/^(VA1|V[0-9]+)_ON$/.test(k)||k==='PROBE_ON'||/^T[1234]_ON$/.test(k)))S.values.T5_ON=0;
  if(k==='T5_ON'&&v){for(const key of ['T4_ON','T3_ON','T2_ON','T1_ON','VA1_ON','V101_ON','V111_ON','V11_ON','V102_ON','V10_ON','V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;plan=null;}
"""
s=s.replace('function setValue(k, v) {','function setValue(k, v) {\n'+insert,1)
s=s.replace("      btn('T4',", "      btn('T5', !!S.values.T5_ON, () => applyPreset('t5_contours'), '모든 적의 양쪽 외곽선 · T4 밀착 추종'),\n      btn('T4',",1)
s=s.replace("btn('V1', !S.values.T4_ON", "btn('V1', !S.values.T5_ON && !S.values.T4_ON",1)
s=s.replace("() => { setValue('T4_ON',0);", "() => { setValue('T5_ON',0); setValue('T4_ON',0);")
s=s.replace("${S.values.T4_ON ? 'T4", "${S.values.T5_ON ? 'T5 · 모든 적 외곽선 + 밀착 추종' : S.values.T4_ON ? 'T4",1)
s=s.replace("(t.t4_on ? `T4 ·", "(t.t4_on ? `${t.t5_on?'T5':'T4'} ·",1)
s=s.replace('const rows = S.values.T4_ON','const rows = (S.values.T4_ON || S.values.T5_ON)',1)
s=s.replace("'t4_gap_error','t4_hold']", "'t4_gap_error','t4_hold','t5_on']",1)
s=s.replace('tr.t4_gap_error,tr.t4_hold]);','tr.t4_gap_error,tr.t4_hold,tr.t5_on]);',1)
s=s.replace('last: last && {t4_on:', 't5_display:{enemies:new Set(t5Display.paths.map(p=>p.id)).size,paths:t5Display.paths.length,points:t5Display.paths.reduce((n,p)=>n+p.points.length/2,0),ms:t5Display.ms,at:t5Display.at},last: last && {t5_on:last.trace.t5_on,t4_on:',1)
overlay='''// T5 overlays refresh independently of the controller so short/unselected enemies and bot-OFF work.
let t5Display={at:-Infinity,paths:[],ms:0,sc:null,gap:null};
function t5DisplayPaths(me, g, vx, vy, cx, cy) {
  const now=performance.now(),gap=S.values.T4_GAP??-5;
  if(now-t5Display.at<100&&t5Display.sc===me.sc&&t5Display.gap===gap)return t5Display.paths;
  const start=performance.now(),segs=[],sid=[],halfX=cx/Math.max(.02,g),halfY=cy/Math.max(.02,g);
  for(const o of window.slithers){if(o===me||o.id===me.id||o.dead)continue;const r=14.5*o.sc,margin=Math.max(0,14.5*me.sc+r+gap);let prev=null;
    for(let j=0;j<=(o.pts||[]).length;j++){const p=j<(o.pts||[]).length?o.pts[j]:o;if(p.dying||!Number.isFinite(p.xx+p.yy)){prev=null;continue;}
      if(prev&&Math.min(prev.xx,p.xx)-margin<=vx+halfX&&Math.max(prev.xx,p.xx)+margin>=vx-halfX&&Math.min(prev.yy,p.yy)-margin<=vy+halfY&&Math.max(prev.yy,p.yy)+margin>=vy-halfY){segs.push(prev.xx,prev.yy,p.xx,p.yy,r);sid.push(o.id);}prev=p;
    }
  }
  const paths=window.SlpPilot.t5Contours({segs,sid,sc:me.sc},gap);
  t5Display={at:now,paths,ms:performance.now()-start,sc:me.sc,gap};return paths;
}
'''
s=s.replace('function overlay() {',overlay+'function overlay() {',1)
s=s.replace('  const d = last && game && S.bot ? last.draw : null;', '''  if(window.playing&&!me.dead&&S.values.T5_ON&&S.show.enemyContours){
    ctx.save();ctx.lineWidth=OVERLAY_LINE_WIDTH;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([]);
    const selected=S.bot?last?.trace?.t4_target:null;
    for(const p of t5DisplayPaths(me,g,vx,vy,cx,cy)){ctx.strokeStyle=p.id===selected?'#70ffbd':'#56d8ff';polyline(ctx,p.points,X,Y);}
    ctx.restore();
  }else if(t5Display.paths.length)t5Display={at:-Infinity,paths:[],ms:0,sc:null,gap:null};
  const d = last && game && S.bot ? last.draw : null;''',1)
p.write_text(s)
