import csv,gzip,hashlib,html,json,math,statistics,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
BINS=['<20','20–30','30–40','40–50','≥50']
def bin_of(r):return 0 if r<20 else 1 if r<30 else 2 if r<40 else 3 if r<50 else 4
def nearest(fr,tid=None):
 best=None
 for k,id in enumerate(fr['sid']):
  if tid is not None and id!=tid:continue
  ax,ay,bx,by,r=fr['segs'][k*5:k*5+5];dx,dy=bx-ax,by-ay;u=max(0,min(1,((fr['x']-ax)*dx+(fr['y']-ay)*dy)/max(1e-9,dx*dx+dy*dy)))
  dist=math.hypot(fr['x']-ax-u*dx,fr['y']-ay-u*dy);ro=14.5*fr['sc']
  if best is None or dist-r-ro<best['gap']:best={'target':id,'enemy_r':r,'own_r':ro,'distance':dist,'gap':dist-r-ro,'angle':math.atan2(dy,dx)}
 return best
def analyse(out,k,capped):
 meta=json.loads((out/'summary.json').read_text()) if (out/'summary.json').exists() else {};protocol=meta.get('protocol','legacy_fallback');build=meta.get('build','unknown')
 rec=json.loads((out/f'slp_{k:02}.json').read_text());L=json.load(gzip.open(out/f'slp_{k:02}_log.json.gz'));rows=[dict(zip(L['keys'],r)) for r in L['log']];box=json.load(gzip.open(out/f'slp_{k:02}_box.json.gz'));frames=box['frames']
 levels=[];seen=set();samples=[]
 for row in rows:
  if row.get('t1_on')!=1:continue
  if row.get('t1_level'):
   e=dict(row['t1_level']);e['t']=row['t'];e['game']=k;e['run']=out.name;e['kind']='alive';e['protocol']=protocol;e['build']=build;e['source']=str(out/f'slp_{k:02}_log.json.gz');token=(e['serial'],e['target'])
   if token not in seen:levels.append(e);seen.add(token)
  if row.get('t1_phase')=='follow' and row.get('t1_enemy_r') is not None:
   samples.append([round(row['t'],3),row['t1_own_r'],row['t1_enemy_r'],row['t1_gap'],row['t1_set'],row['t1_target'],row.get('t1_heading_error'),row.get('t1_lateral'),row.get('t1_bend')])
 candidate=None;excluded=[]
 if not capped and rows and frames:
  row=rows[-1];fr=frames[-1];nb=nearest(fr);tid=row.get('t1_target');own=14.5*fr['sc'];same=[e for e in levels if e['target']==tid and row['t']-e['t']<2.5]
  if row.get('t1_phase')!='follow':excluded.append('사망 전 추종 중 아님')
  if not nb or nb['target']!=tid:excluded.append('최근접 몸통이 추종 대상과 다름')
  if not same:excluded.append('최근 2.5초 안정 유지 표본 없음')
  if abs(row.get('t1_lateral') or 0)>10:excluded.append('빠른 수직 접근')
  if (row.get('t1_heading_error') or 0)>math.radians(6):excluded.append('평행 주행 아님')
  if (row.get('t1_bend') or 0)>math.radians(12):excluded.append('곡선 몸통')
  interval=fr['t']-frames[-2]['t'] if len(frames)>1 else None
  if interval is None or interval>.12:excluded.append('관측 공백 큼')
  window=rec['seconds']-fr['t']
  if not 0<=window<=.25:excluded.append('사망 전 관측 시점 불확실')
  head_d=min((math.hypot(fr['heads'][i]-fr['x'],fr['heads'][i+1]-fr['y']) for i in range(0,len(fr['heads']),5)),default=1e9)
  if head_d<250:excluded.append('다른 머리 간섭 가능')
  wall=fr['wall'];wall_gap=wall[2]-math.hypot(fr['x']-wall[0],fr['y']-wall[1])-own
  if wall_gap<100:excluded.append('맵 경계 간섭 가능')
  if nb:candidate={**nb,'kind':'death_candidate' if not excluded else 'excluded_death','game':k,'run':out.name,'t':fr['t'],'set':row.get('t1_set'),'speed':fr['sp'],'gap_min':nb['gap'],'gap_max':nb['gap'],'death_window_s':window,'sample_interval_s':interval,'last_alive_gap':nb['gap'],'last_alive_distance':nb['distance'],'head_distance':head_d,'reasons':excluded,'protocol':protocol,'build':build,'source':str(out/f'slp_{k:02}_box.json.gz')}
 g={'protocol':protocol,'build':build,'game':k,'run':out.name,'seconds':rec['seconds'],'end':'cap' if capped else 'death','L_max':rec.get('L_max'),'errors':rec.get('errors'),'follow_samples':len(samples),'levels':len(levels),'candidate':candidate,'excluded':excluded,'parameters':rec.get('values')}
 a={'game':g,'levels':levels,'samples':samples};(out/f'analysis_{k:02}.json').write_text(json.dumps(a,ensure_ascii=False,indent=2));return g

def render(out=None,progress=None):
 if out and progress is not None:(out/'progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2))
 runs=sorted((ROOT/'runs').glob('t1_*'));games=[];levels=[];samples=[];states=[]
 for run in runs:
  if not run.is_dir():continue
  if (run/'progress.json').exists():states.append(json.loads((run/'progress.json').read_text()))
  if (run/'live_current.json').exists():
   live=json.loads((run/'live_current.json').read_text());levels+=live['levels'];samples.append({k:live[k] for k in ['run','game','data']})
  for f in sorted(run.glob('analysis_*.json')):
   a=json.loads(f.read_text());games.append(a['game']);levels+=a['levels'];samples+=[{'run':run.name,'game':a['game']['game'],'protocol':a['game'].get('protocol','legacy_fallback'),'build':a['game'].get('build','unknown'),'data':a['samples']}]
 deaths=[g['candidate'] for g in games if g.get('candidate')];valid=[q for q in deaths if q['kind']=='death_candidate']
 data={'updated':time.strftime('%F %T %Z'),'states':states,'games':games,'levels':levels,'deaths':deaths,'samples':samples,'scope':'실사이트 T1. 생존 간격은 해당 조건에서 관측됨. 사망 후보 값은 마지막 생존 관측이며 서버 충돌 경계 확정값이 아님.'}
 (HERE/'data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
 with (HERE/'samples.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['run','game','t','own_r','enemy_r','gap','commanded_gap','target','heading_error_rad','normal_speed','bend_rad'])
  for block in samples:
   for row in block['data']:w.writerow([block['run'],block['game'],*row])
 text=['# T1 두께별 근접 주행 실측',f'갱신: {data["updated"]}', '\n사용자 목표: 적 몸통을 따라가며 두께별 생존 간격·사망 전 접근 수치를 조사해 정밀 제어 개발에 사용한다.', '\n## 정의와 실험', '- v2 전용 주행: 직선 몸통 탐색 → 평행 정렬 → 간격 축소. 대상이 없을 때도 적 몸통으로 접근하며 일반 회피·먹이 로직으로 전환하지 않는다. 곡선/다른 몸/머리 간섭 구간은 측정에서 제외한다.', '- 첫 시험(1001-85c553bf, legacy_fallback)은 안정 단계 0개. 이전 회피 전환 동작을 보존한 개발 자료이며 새 v2 보정 근거와 구분한다.', '- 게임 세계 좌표 px. 표시 반경 `r = 14.5 × sc`, 표시 두께 `2r`. 중심선 거리 `d`, 표시 표면 간격 `gap = d − r_우리 − r_상대`.', '- 목표 상대 반경 구간: <20 / 20–30 / 30–40 / 40–50 / ≥50px. 실제 관측 반경으로 집계하며 목표 구간과 다를 수 있다.', '- 추종은 순항. 표시 간격 +12px부터 1px씩 줄임. 0.75초 이상·15관측 이상, 설정 오차 중앙값 <1px, gap 범위 <1.5px, 평행 오차 <6°, 수직 속도 중앙값 <8px/s, 우리 반경 변화 <0.3px인 안정 구간만 생존 단계 기록.', '- 사망 후보는 추종 대상=최근접 몸통, 최근 안정 단계, 평행·낮은 수직 속도, 머리/경계 간섭 없음, 관측 간격 ≤0.12초, 사망과 마지막 관측 차이 ≤0.25초를 충족한 사례. 다른 사망은 제외 이유를 보존.', '- 사망 직전 마지막 살아 있는 위치는 실제 서버 충돌 좌표가 아님. 최소 생존 간격은 영구적으로 안전하다는 보장이 아니며 사망 후보도 확정 접촉 반경으로 사용하지 않는다.', f'\n## 누적 현황\n완료 {len(games)}판 · 안정 생존 단계 {len(levels)}건 · 조건 통과 사망 후보 {len(valid)}건 · 추종 관측 {sum(len(s["data"]) for s in samples)}개.', '\n| 상대 표시 반경/두께(px) | 생존 단계 수 | 관측 최소 생존 gap | 생존 gap 중앙값 | 사망 후보 수 | 마지막 생존 gap 범위 |','|---|---:|---:|---:|---:|---|']
 for b,label in enumerate(BINS):
  a=[q for q in levels if bin_of(q['enemy_r'])==b];ds=[q for q in valid if bin_of(q['enemy_r'])==b]
  fmt=lambda xs:'—' if not xs else f'{min(xs):.2f} ~ {max(xs):.2f}'
  text.append(f'| r {label} / 두께 2r | {len(a)} | {min(q["gap_min"] for q in a):.2f}' if a else f'| r {label} / 두께 2r | 0 | —')
  text[-1]+=f' | {statistics.median(q["gap"] for q in a):.2f}' if a else ' | —'
  text[-1]+=f' | {len(ds)} | {fmt([q["gap"] for q in ds])} |'
 text+=['\n## 개발 적용', '- 현 단계에서는 충분한 표본이 없는 두께 구간의 보정값을 확정하지 않는다. 각 점의 우리 반경·속도·관측 지연을 함께 사용한다.', '- 통로 조건은 양쪽 적 반경과 우리 두께, 양쪽 추가 여유를 합산해 평가한다. 이번 단일 몸통 평행 추종만으로 두 몸통 사이 통과 성공률을 확정하지 않는다.', '- 부스트·급회전·높은 곡률은 별도 조건이다. 순항 평행 추종값을 그대로 확장하지 않는다.', '\n## 판별 결과','| 실행/판/주행 버전 | 종료 | 시간(s) | 생존 단계 | 추종 관측 | 사망 후보/제외 |','|---|---|---:|---:|---:|---|']
 for g in games:text.append(f'| {g["run"]}/{g["game"]} / {g.get("protocol","legacy_fallback")} / {g.get("build","unknown")} | {g["end"]} | {g["seconds"]:.1f} | {g["levels"]} | {g["follow_samples"]} | {"조건 통과 후보" if g.get("candidate",{} ) and g["candidate"]["kind"]=="death_candidate" else "; ".join(g["excluded"]) or "상한 종료"} |')
 text+=['\n## 실행 상태']+[f'- `{q.get("out","")}`: {q.get("state")} / 판 {q.get("game",0)} / {q.get("build","")}' for q in states]
 text+=['\n## 원자료와 버전', '- 각 `runs/t1_*/code/`에 실행 소스·파라미터 동결. `summary.json`의 SHA-256으로 연결.', '- `slp_XX.json`, `slp_XX_box.json.gz`, `slp_XX_log.json.gz`는 원자료. `analysis_XX.json`은 원자료에서 재현한 파생 자료. 사진·실시간 JSONL도 같은 실행 폴더.', '- 누적 데이터: `research/t1_20261001/data.json`, 추종 관측 전체 `samples.csv`, 대화용 시각화 `report.html`.', '- 기존 2026-09-28 탐침 자료는 연구 이력이며 T1 조건과 혼합하지 않는다. 과거 참고: `research/probe_boundary.md`, `probe_table.md` (기존 마지막 생존 프레임과 사망 경계 해석 재검증 필요).']
 (HERE/'T1_THICKNESS.md').write_text('\n'.join(text)+'\n')
 template=(HERE/'template.html').read_text();(HERE/'report.html').write_text(template.replace('__DATA__',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')))
if __name__=='__main__':render()
