import csv, gzip, html, json, math, statistics, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent

def analyse(out,k,capped):
 rec=json.loads((out/f'slp_{k:02}.json').read_text())
 data=json.load(gzip.open(out/f'slp_{k:02}_log.json.gz'))
 rows=[dict(zip(data['keys'],r)) for r in data['log']]
 target=[r for r in rows if r.get('t4_target') is not None and r.get('t4_gap') is not None]
 near_s=0;longest=0;streak=0;target_s=0;previous=None;previous_target=None;previous_near=False
 for r in rows:
  delta=r['t']-previous['t'] if previous else 0
  contiguous=bool(previous and 0<delta<=.2)
  dt=delta if contiguous else 0
  acquired=r.get('t4_target') is not None and r.get('t4_gap') is not None
  if acquired:target_s+=dt
  near=acquired and abs(r['t4_gap']-r['t4_set'])<2 and (r.get('t4_heading_error') or 0)<math.radians(15)
  if near:
   paired=previous_near and contiguous and previous_target==r['t4_target']
   near_s+=dt if paired else 0
   streak=streak+dt if paired else 0
   longest=max(longest,streak)
  else:streak=0
  previous=r;previous_target=r.get('t4_target');previous_near=near
 follow=[r for r in target if (r.get('t4_heading_error') or 0)<math.radians(15)]
 med=lambda a:statistics.median(a) if a else None
 frames=json.load(gzip.open(out/f'slp_{k:02}_box.json.gz'))['frames'];death=None
 if frames and not capped:
  fr=frames[-1];nearest=None
  for i,sid in enumerate(fr['sid']):
   ax,ay,bx,by,rt=fr['segs'][i*5:i*5+5];dx=bx-ax;dy=by-ay
   u=max(0,min(1,((fr['x']-ax)*dx+(fr['y']-ay)*dy)/max(1e-9,dx*dx+dy*dy)))
   d=math.hypot(fr['x']-ax-u*dx,fr['y']-ay-u*dy);gap=d-rt-14.5*fr['sc']
   if nearest is None or gap<nearest['gap']:nearest={'id':sid,'gap':gap,'enemy_r':rt,'own_r':14.5*fr['sc']}
  last=rows[-1] if rows else {};death={'nearest':nearest,'last_target':last.get('t4_target'),'same_target':bool(nearest and nearest['id']==last.get('t4_target')),'phase':last.get('t4_phase'),'target_gap':last.get('t4_gap'),'heading_error':last.get('t4_heading_error'),'reason':last.get('t4_reason'),'window_s':rec['seconds']-fr['t'],'speed':fr['sp'],'note':'Last recorded geometry; killer and server contact location unverified.'}
 result={'run':out.name,'game':k,'build':rec['ext'],'seconds':rec['seconds'],'end':rec.get('end_reason'),'errors':rec.get('errors',0),'source':str(out/f'slp_{k:02}_log.json.gz'),'target_ticks':len(target),'target_seconds':target_s,'near_seconds':near_s,'longest_near_seconds':longest,'parallel_median_gap':med([r['t4_gap'] for r in follow]),'parallel_median_abs_error':med([abs(r['t4_gap']-r['t4_set']) for r in follow]),'min_gap':min((r['t4_gap'] for r in target),default=None),'target_ids':len({r['t4_target'] for r in target}),'boost_ticks':sum(bool(r.get('boost')) for r in rows),'actual_boost_speed_ticks':sum((r.get('t4_speed') or 0)>8 for r in rows),'death':death}
 (out/f'analysis_{k:02}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 return result

def export_dataset(): pass

def render(out=None,progress=None):
 if out and progress is not None:(out/'progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2))
 games=[]
 for run in sorted((ROOT/'runs').glob('t4_*')):
  for p in sorted(run.glob('analysis_*.json')):games.append(json.loads(p.read_text()))
 current_build=json.loads((ROOT/'ext/manifest.json').read_text())['version_name'];current=[g for g in games if g['build']==current_build]
 data={'current_build':current_build,'current_build_games':len(current),'current_build_pass_games':sum(g['longest_near_seconds']>=3 for g in current),'updated':time.strftime('%F %T %Z'),'target_gap':-5,'gap_source':'user-selected experimental setting, not a validated safe collision threshold','near_definition':'same visible target, |gap - (-5)|<2px and heading error<15 degrees; no stable-level eligibility gate','success_criterion':'At least 2 independent games with continuous near tracking >=3 seconds and no judgement errors','games':games}
 (HERE/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
 table=''
 for g in games:
  val=lambda x:'—' if x is None else f'{x:.2f}'
  table+=f'<tr><td>{html.escape(g["run"])}/{g["game"]}<br>{html.escape(g['build'])}</td><td>{g["seconds"]:.1f}</td><td>{g["near_seconds"]:.2f}</td><td>{g["longest_near_seconds"]:.2f}</td><td>{val(g["parallel_median_gap"])}</td><td>{val(g["min_gap"])}</td><td>{g["boost_ticks"]}</td><td>{html.escape(g["end"])}</td></tr>'
 text=f'''<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="15"><title>T4 밀착 추종</title><style>body{{background:#111827;color:#e5e7eb;font:16px system-ui;padding:28px}}table{{border-collapse:collapse;width:100%}}td,th{{padding:12px;border-bottom:1px solid #374151;text-align:right}}td:first-child,th:first-child{{text-align:left}}strong{{color:#5eead4}}</style><h1>T4 · −5px 고정 밀착 추종</h1><p>사용자 지정 실험 간격. 가까이 유지: 목표 ±2px · 방향차 15° 미만. 전체 접근 기록 보존.</p><p><strong>현재 빌드 {current_build} · {len(current)}판 · 3초 연속 밀착 {sum(g['longest_near_seconds']>=3 for g in current)}판</strong><br>전체 이력 {len(games)}판 · 누적 밀착 {sum(g['near_seconds'] for g in games):.2f}초 · 3초 연속 밀착 {sum(g['longest_near_seconds']>=3 for g in games)}판</p><table><tr><th>실행/판</th><th>시간(s)</th><th>밀착(s)</th><th>최장 연속(s)</th><th>평행 gap 중앙(px)</th><th>최소 gap(px)</th><th>부스트 틱</th><th>종료</th></tr>{table}</table><p>{data['updated']} · 마지막 사망 관측은 서버 접촉 경계 확정값이 아닙니다.</p>'''
 (HERE/'report.html').write_text(text)
if __name__=='__main__':render()
