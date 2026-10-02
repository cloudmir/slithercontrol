import bisect,csv,gzip,html,json,time
from pathlib import Path
from report import ROOT,HERE,nearest

def collect():
 cases=[];series=[]
 for run in sorted((ROOT/'runs').glob('t2_*')):
  sf=run/'summary.json'
  if not sf.exists():continue
  meta=json.loads(sf.read_text())
  for g in meta.get('games',[]):
   if g['end']!='death':continue
   k=g['game'];frames=json.load(gzip.open(run/f'slp_{k:02}_box.json.gz'))['frames'];f=run/f'game_{k:02}_trace_live.jsonl';rows=[json.loads(x) for x in f.read_text().splitlines()] if f.exists() else [];ts=[r['t'] for r in rows];tail=[]
   for fr in frames:
    if fr['t']<frames[-1]['t']-2:continue
    i=bisect.bisect_right(ts,fr['t'])-1;r=rows[i] if i>=0 else {};tid=r.get('t2_target');q=nearest(fr,tid) if tid is not None else None;other=nearest(fr)
    z={'run':run.name,'game':k,'t':fr['t'],'until_last_alive_s':frames[-1]['t']-fr['t'],'target':tid,'own_r':14.5*fr['sc'],'enemy_r':q['enemy_r'] if q else None,'target_gap':q['gap'] if q else None,'nearest_gap':other['gap'] if other else None,'nearest_id':other['target'] if other else None,'speed':fr['sp'],'boost':fr.get('boost'),'heading_error':r.get('t2_heading_error'),'normal_speed':r.get('t2_lateral'),'bend':r.get('t2_bend'),'quality_reason':r.get('t2_reason')};tail.append(z);series.append(z)
   if not tail:continue
   last=tail[-1];same=[q['target_gap'] for q in tail if q['target']==last['target'] and q['target_gap'] is not None];case={**last,'build':meta.get('build'),'end_time':g['seconds'],'death_observation_delay_s':g['seconds']-last['t'],'min_target_gap_last2s':min(same) if same else None,'target_gap_span_last2s':max(same)-min(same) if same else None,'strict_stable_levels':g['levels'],'exclusions':g.get('excluded',[])};cases.append(case)
 data={'updated':time.strftime('%F %T'),'cases':cases,'series':series,'meaning':'Observed last-alive gaps; exact server collision coordinate unknown. All death cases retained regardless of strict stability.'};(HERE/'death_series.json').write_text(json.dumps(data,ensure_ascii=False))
 if series:
  with (HERE/'death_series.csv').open('w') as f:w=csv.DictWriter(f,fieldnames=series[0].keys());w.writeheader();w.writerows(series)
 lines=['# T2 생존→사망 직전 간격 비교','\n'+data['meaning'],'\n원본은 runs/t2_*/slp_*_box.json.gz 및 game_*_trace_live.jsonl. 주행 빌드는 각 사례에 저장. 안정 기준 미달도 포함하되 충돌 경계 확정과 구분.','\n|실행/판|내/적 반경|마지막 대상 간격|최근2초 최소|사망 관측 시간차|안정 단계|','|---|---|---|---|---|---|']
 for c in cases:lines.append('|'+ '|'.join(str(x) for x in [c['run']+'/'+str(c['game']),str(c['own_r'])+'/'+str(c['enemy_r']),c['target_gap'],c['min_target_gap_last2s'],round(c['death_observation_delay_s'],3),c['strict_stable_levels']])+'|')
 (HERE/'DEATH_GAPS.md').write_text('\n'.join(lines))
 rows=''.join('<tr>'+''.join('<td>'+html.escape(str(c.get(k)))+'</td>' for k in ['run','game','own_r','enemy_r','target_gap','min_target_gap_last2s','death_observation_delay_s','speed','quality_reason'])+'</tr>' for c in cases)
 (HERE/'death_gaps.html').write_text('<meta charset="utf-8"><meta http-equiv="refresh" content="15"><style>body{background:#101820;color:#eee;font:16px sans-serif}td,th{padding:8px;border-bottom:1px solid #465}table{border-collapse:collapse}</style><h2>생존→사망 직전 간격 · 전체 사례</h2><p>안정 기준 미달 포함. 마지막 생존 관측이며 정확한 서버 충돌 좌표가 아닙니다.</p><a href="report.html">누적 산점도</a> · <a href="death_series.csv">최근2초 전체 프레임 CSV</a><table><tr>'+''.join('<th>'+x+'</th>' for x in ['실행','판','내 반경','적 반경','마지막 간격','2초 최소','관측 시간차','속도','품질 사유'])+'</tr>'+rows+'</table>')
 print('cases',len(cases),'frames',len(series),flush=True)
if __name__=='__main__':
 for _ in range(370):
  try:collect()
  except Exception as e:print(repr(e),flush=True)
  time.sleep(10)
