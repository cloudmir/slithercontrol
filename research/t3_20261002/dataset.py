import bisect,collections,csv,gzip,html,json,math,time
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
def csv_out(name,rows):
 keys=list(dict.fromkeys(k for r in rows for k in r)) or ['run','game','build','own_r','enemy_r','gap','speed_class'];f=(HERE/name).open('w');w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in r.items()} for r in rows);f.close()
def export_dataset():
 from report import nearest,bin_of,BINS
 if not (HERE/'data.json').exists():return
 data=json.loads((HERE/'data.json').read_text());levels=data['levels'];deaths=data['deaths'];frames_out=[]
 for r in levels+deaths:r.setdefault('geometry_class','straight')
 for g in data['games']:
  if g['end']!='death':continue
  run=ROOT/'runs'/g['run'];k=g['game'];ff=run/f'death_frames_{k:02}.json'
  if ff.exists():frames_out+=json.loads(ff.read_text());continue
  box=json.load(gzip.open(run/f'slp_{k:02}_box.json.gz'));frs=box['frames'];ll=json.load(gzip.open(run/f'slp_{k:02}_log.json.gz'));rr=[dict(zip(ll['keys'],r)) for r in ll['log']];ts=[r['t'] for r in rr];out=[]
  for fr in frs:
   if fr['t']<frs[-1]['t']-2:continue
   i=bisect.bisect_right(ts,fr['t'])-1;r=rr[i] if i>=0 else {};tid=r.get('t3_target');q=nearest(fr,tid) if tid is not None else None;n=nearest(fr)
   out.append({'run':g['run'],'game':k,'build':g['build'],'t':fr['t'],'until_death_observation_s':g['seconds']-fr['t'],'own_r':14.5*fr['sc'],'enemy_r':q['enemy_r'] if q else None,'target':tid,'episode':r.get('t3_episode'),'target_gap':q['gap'] if q else None,'nearest_gap':n['gap'] if n else None,'nearest_target':n['target'] if n else None,'speed':fr['sp'],'speed_class':'boost_speed' if fr['sp']>8 else 'cruise_speed','boost_command':r.get('boost'),'heading_error':r.get('t3_heading_error'),'normal_speed':r.get('t3_lateral'),'bend':r.get('t3_bend'),'quality_reason':r.get('t3_reason')})
  ff.write_text(json.dumps(out,ensure_ascii=False));frames_out+=out
 csv_out('alive_levels.csv',levels);csv_out('death_cases.csv',deaths);csv_out('death_frames.csv',frames_out)
 bins=[]
 for build in sorted({g['build'] for g in data['games']}):
  for enemy_bin in range(5):
   for speed in ['cruise_speed','boost_speed']:
    aa=[r for r in levels if r['build']==build and bin_of(r['enemy_r'])==enemy_bin and r['speed_class']==speed and not r.get('provisional')];group=collections.defaultdict(list)
    for r in aa:group[(r['run'],r['game'],math.floor(r['own_r']/2)*2,r['geometry_class'])].append(r)
    for ownbin,geometry in sorted({(k[2],k[3]) for k in group} or {(-1,'straight')}):
     members=[(k,v) for k,v in group.items() if k[2]==ownbin and k[3]==geometry];ds=[r for r in deaths if r['build']==build and r['kind']=='death_candidate' and bin_of(r['enemy_r'])==enemy_bin and r['speed_class']==speed and r['geometry_class']==geometry and (ownbin<0 or math.floor(r['own_r']/2)*2==ownbin)];mins=[min(r['gap_min'] for r in v) for _,v in members]
     bins.append({'build':build,'geometry_class':geometry,'own_radius_bin':None if ownbin<0 else [ownbin,ownbin+2],'enemy_radius_bin':BINS[enemy_bin],'actual_speed_class':speed,'independent_games':len(members),'stable_levels':sum(len(v) for _,v in members),'qualified_deaths':len(ds),'closest_alive_per_game':mins,'reference_gap':max(mins)+1.5 if len(members)>=3 and geometry=='straight' and ds and max(mins)<=0 else None,'status':'candidate_reference_requires_validation' if len(members)>=3 and geometry=='straight' and ds and max(mins)<=0 else 'observed_alive_only' if members else 'unmeasured','note':'Observed live reference only; not a guaranteed safe server collision offset. No automatic production calibration.'})
 a={'updated':time.strftime('%F %T'),'builds':sorted({g['build'] for g in data['games']}),'games':len(data['games']),'bins':bins,'death_frame_count':len(frames_out),'units':'world px; gap = centreline distance - own radius - enemy radius'};(HERE/'offset_dataset.json').write_text(json.dumps(a,ensure_ascii=False,indent=2))
 csv_out('offset_bins.csv',bins)
 current=data.get('states',[])[-1] if data.get('states') else {};current_build=current.get('build') or a['builds'][-1];current_levels=[l for l in levels if l['build']==current_build];current_games=[g for g in data['games'] if g['build']==current_build];current_deaths=[d for d in deaths if d['build']==current_build];measured=[r for r in bins if r['build']==current_build and (r['stable_levels'] or r['qualified_deaths'])]
 labels={'cruise_speed':'순항','boost_speed':'부스트','straight':'직선','gentle_curve':'완만한 곡선'}
 def table_rows(items):return ''.join('<tr>'+''.join('<td>'+html.escape('—' if r[k] is None else labels.get(str(r[k]),str(r[k])))+'</td>' for k in ['build','geometry_class','own_radius_bin','enemy_radius_bin','actual_speed_class','independent_games','stable_levels','qualified_deaths','reference_gap'])+'</tr>' for r in items)
 rows=table_rows(measured) or '<tr><td colspan="9">아직 완료된 유효 측정 없음 · 실제 수집 상태를 확인 중</td></tr>'
 history=table_rows([r for r in bins if r['build']!=current_build and (r['stable_levels'] or r['qualified_deaths'])]) or '<tr><td colspan="9">이전 빌드: 유효 측정 없음. 원자료는 보존됩니다.</td></tr>'
 closest=min((r['gap_min'] for r in current_levels),default=None)
 status=html.escape(str(current.get('state','')))+' · 판 '+str(current.get('game',0))+' · '+html.escape(str(current.get('updated','')))
 independent=len({(l['run'],l['game']) for l in current_levels if not l.get('provisional')})
 start_summary=ROOT/current.get('out','')/'summary.json';start_gap=json.loads(start_summary.read_text()).get('gap_start_px',40) if start_summary.is_file() else 40
 game_rows=''
 for g in current_games[-12:]:
  gl=[l for l in current_levels if l['run']==g['run'] and l['game']==g['game']];gm=min((l['gap_min'] for l in gl),default=None);speeds=' / '.join(labels.get(x,x) for x in sorted({l['speed_class'] for l in gl})) or '미측정';ending='사망' if g['end']=='death' else '상한·중단';gid=g['run'][-6:]+' / '+str(g['game']);game_rows+=f'<tr><td>{gid}</td><td>{g["seconds"]:.1f}초</td><td>{g["levels"]}</td><td>{"—" if gm is None else f"{gm:.2f}px"}</td><td>{speeds}</td><td>{ending}</td></tr>'

 coverage_section=''
 coverage_path=ROOT/'research/t3_rebuild_20261002/coverage_progress.json'
 if coverage_path.exists():
  coverage=json.loads(coverage_path.read_text())
  if coverage.get('build')==current_build:
   coverage_rows=''
   for c in coverage.get('cells',[]):
    groups=c['groups'];best=max(groups,key=lambda g:min(g['near_boundary_alive_games'],3)+min(g['qualified_death_games'],3),default={})
    coverage_rows+=f'<tr><td>{html.escape(c["enemy_radius_bin"])}</td><td>{labels[c["actual_speed_class"]]}</td><td>{labels[c["geometry_class"]]}</td><td>{best.get("own_radius_bin","—")}</td><td>{best.get("near_boundary_alive_games",0)} / 3</td><td>{best.get("qualified_death_games",0)} / 3</td><td>{"수집 조건 충족" if c["complete"] else "추가 수집"}</td></tr>'
   coverage_section=f'<h2>계속 수집 · 조건 충족 {coverage["completed_conditions"]} / {coverage["total_conditions"]}</h2><p class="note">배치가 끝나도 부족한 조건을 이어서 측정합니다. 각 조건에서 같은 내 반경 구간의 독립 3판 이상 근접 생존(gap ≤0)과 독립 3판 이상 사망 후보를 확보하는 수집 목표입니다. 연속적인 모든 두께를 측정했다거나 공통 안전값을 확정했다는 뜻은 아닙니다.</p><div style="overflow:auto"><table><tr><th>적 반경</th><th>실제 속도</th><th>곡률</th><th>내 반경</th><th>근접 생존 판</th><th>사망 후보 판</th><th>상태</th></tr>{coverage_rows}</table></div>'

 page=f'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="refresh" content="15"><meta name="viewport" content="width=device-width"><title>T3 오프셋 데이터셋</title><style>body{{background:#101824;color:#eee;font:16px/1.6 system-ui;padding:24px;max-width:1200px;margin:auto}}h1{{font-size:28px}}.cards{{display:flex;gap:16px;flex-wrap:wrap}}.card{{background:#203049;padding:18px;border-radius:14px;min-width:150px}}strong{{display:block;font-size:30px}}td,th{{padding:10px;border-bottom:1px solid #384b65;text-align:left}}a{{color:#8bc6ff}}.note{{background:#253b3a;padding:20px;border-radius:14px}}table{{border-collapse:collapse;width:100%;font-size:13px}}</style><h1>T3 · 평행 주행 실측</h1><p>현재 빌드 <b>{current_build}</b> · {status}</p><p class="note">현재 배치: {start_gap:g}px에서 평행 유지 확인 → 1px씩 좁히기. 직선·완만한 곡선은 별도 조건으로 집계하며 급곡선·간섭은 제외. 순항·부스트는 <b>실제 속도</b>로 분류합니다. 같은 판의 연속 단계는 독립 반복으로 세지 않습니다. 빌드가 다른 결과도 분리합니다.</p><div class="cards"><div class="card"><strong>{len(current_games)}</strong>현재 빌드 종료 판</div><div class="card"><strong>{len(current_levels)}</strong>실측 생존 단계 · 진행 중 포함</div><div class="card"><strong>{sum(d['kind']=='death_candidate' for d in current_deaths)}</strong>조건 통과 사망 후보</div><div class="card"><strong>{independent}</strong>유효 표본이 나온 독립 판</div></div><p>가장 가까운 생존 관측 간격: <b>{"—" if closest is None else f"{closest:.2f}px"}</b>. 참고 간격은 같은 두께·속도의 직선 조건에서 독립 3판 이상 반복하고, 음수 간격 생존과 사망 후보를 함께 확보했을 때만 표시합니다. 실제 서버 안전을 보장하는 값은 아닙니다.</p><div style="overflow:auto"><table><tr><th>빌드</th><th>곡률 조건</th><th>내 반경</th><th>적 반경</th><th>실제 속도</th><th>독립 판</th><th>생존 단계</th><th>사망 후보</th><th>참고 간격</th></tr>{rows}</table></div><h2>최근 판별 요약</h2><div style="overflow:auto"><table><tr><th>실행시각 / 판</th><th>시간</th><th>생존 단계</th><th>최소 실측 gap</th><th>실제 속도</th><th>종료</th></tr>{game_rows}</table></div><details><summary>이전 빌드 측정 이력</summary><table>{history}</table></details><p><a href="report.html">간격 산점도·판별 기록</a> · <a href="T3_OFFSETS.md">개발 참고 MD</a> · <a href="offset_dataset.json">데이터셋 JSON</a> · <a href="alive_levels.csv">생존 CSV</a> · <a href="death_cases.csv">사망 CSV</a> · <a href="death_frames.csv">직전2초 CSV</a></p><p>갱신 {a['updated']} · 단위 world px · 데이터가 없는 조합은 미측정입니다.</p></html>'''
 (HERE/'dataset.html').write_text(page)
 if coverage_section:(HERE/'dataset.html').write_text(page.replace('<h2>최근 판별 요약</h2>',coverage_section+'<h2>최근 판별 요약</h2>'))
if __name__=='__main__':export_dataset()
