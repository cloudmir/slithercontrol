import json,gzip,sys,hashlib,statistics,base64
from pathlib import Path
from collections import Counter
p=Path(sys.argv[1]);r=json.loads((p/'slp_01.json').read_text());g=json.loads(gzip.decompress((p/'slp_01_log.json.gz').read_bytes()));rows=[dict(zip(g['keys'],x)) for x in g['log']]
cams=[json.loads(x) for x in (p/'game_01_camera.jsonl').read_text().splitlines()];food=[json.loads(x) for x in (p/'game_01_food_live.jsonl').read_text().splitlines()];food=[x for x in food if x.get('observation')]
def dist(a):
 a=sorted(x for x in a if isinstance(x,(float,int)));return {'p50':a[len(a)//2],'p95':a[min(len(a)-1,int(len(a)*.95))],'max':a[-1]} if a else None
routes=[x for x in rows if x.get('mode')=='v10route'];obs=[x['observation'] for x in food];windows=[]
for lo in range(0,int(r['seconds'])+1,30):
 sub=[x for x in rows if lo<=x['t']<lo+30]
 if sub:windows.append({'start_s':lo,'end_s':round(sub[-1]['t'],2),'L_start':sub[0]['L'],'L_end':sub[-1]['L'],'L_max':max(x['L'] for x in sub),'route_frames':sum(x.get('mode')=='v10route' for x in sub),'frames':len(sub),'boost_frames':sum(bool(x.get('boost')) for x in sub)})
s={'build':r['ext'],'seconds':r['seconds'],'capped':r.get('capped'), 'server':r.get('server'),'players_max_observed':r.get('players'),'L_first':rows[0]['L'],'L_last':rows[-1]['L'],'L_max':r['L_max'],'net_L_per_min':round((rows[-1]['L']-rows[0]['L'])/r['seconds']*60,2),'settings_changes':r.get('changes'),'food_risk_values':dict(Counter(x.get('v10_food_risk') for x in rows)),'modes':dict(Counter(x['mode'] for x in rows)),'route_frame_percent':round(len(routes)/len(rows)*100,1),'boost_frame_percent':round(sum(bool(x['boost']) for x in rows)/len(rows)*100,1),'food_value_on_routes':dist([x.get('v10_food_value') for x in routes]),'closure_risk_on_routes':dist([x.get('v10_closure_risk') for x in routes]),'remains_observation_samples':len(obs),'samples_with_remains':sum(x['remainsCount']>0 for x in obs),'samples_with_remains_within100px':sum(bool(x['nearest']) and x['nearest'][0]['d']<=100 for x in obs),'nearest_remains_px':dist([x['nearest'][0]['d'] for x in obs if x['nearest']]),'decision_errors':r['errors'],'page_errors':(p/'page_errors.jsonl').read_text() if (p/'page_errors.jsonl').exists() else [],'decision_ms':r['decide_ms'],'observation_to_command_ms':r.get('obs_to_cmd_ms'),'screenshots':len(cams),'capture_interval_s':dist([b['t']-a['t'] for a,b in zip(cams,cams[1:])]),'camera_error':(p/'game_01_camera_error.txt').read_text() if (p/'game_01_camera_error.txt').exists() else None,'windows':windows,'limits':['One live game at current risk setting; not a causal comparison of slider values.','Net length change includes boost loss; observed food is not proven reachable food.','Risk is a heuristic index, not calibrated death probability.','Decision-frame shares are not independent escape success rates.'],'hashes':{x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in p.glob('slp_01*')}}
segments=[]
for row in rows:
 value=row.get('v10_food_risk')
 if not segments or segments[-1]['risk_setting']!=value:segments.append({'risk_setting':value,'rows':[]})
 segments[-1]['rows'].append(row)
s['end_reason']='user_stop' if (p/'user_stop.json').exists() else ('time_cap' if r.get('capped') else 'death')
s['risk_segments']=[]
for seg in segments:
 rr=seg['rows'];t0=rr[0]['t'];t1=rr[-1]['t'];ff=[x['observation'] for x in food if x['trace_t'] is not None and t0<=x['trace_t']<=t1]
 s['risk_segments'].append({'risk_setting':seg['risk_setting'],'from_s':t0,'to_s':t1,'L_start':rr[0]['L'],'L_end':rr[-1]['L'],'L_max':max(x['L'] for x in rr),'net_L_per_min':round((rr[-1]['L']-rr[0]['L'])/max(.001,t1-t0)*60,2),'frames':len(rr),'boost_frame_percent':round(100*sum(bool(x['boost']) for x in rr)/len(rr),1),'food_value':dist([x.get('v10_food_value') for x in rr]),'remains_samples':len(ff),'samples_with_remains':sum(x['remainsCount']>0 for x in ff),'within100px':sum(bool(x['nearest']) and x['nearest'][0]['d']<=100 for x in ff)})
s['limits'][0]='One live game; any setting changes are split into observational segments, not a causal A/B comparison.'
(p/'validation.json').write_text(json.dumps(s,ensure_ascii=False,indent=2));(p/'validation_source.txt').write_text('V10 먹이 위험 감수 실게임 1판 검증 원문\n'+str(p)+'\n'+json.dumps(s,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in s.items() if k not in ['hashes','windows']},ensure_ascii=False,indent=2))
# All captures available through compact thumbnails of selected moments, inline viewer.
indices=sorted(set([0,len(cams)//4,len(cams)//2,3*len(cams)//4,*range(max(0,len(cams)-12),len(cams))]));frames=[{'t':cams[i]['t'],'image':'data:image/jpeg;base64,'+base64.b64encode((p/cams[i]['file']).read_bytes()).decode()} for i in indices]
html='''<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{background:#101722;color:#e4eaf4;font:15px system-ui;margin:16px}img{display:block;max-width:100%;max-height:80vh;margin:auto}input{width:70%}button{padding:9px}h1{font-size:22px}</style><h1>V10 먹이·RISK 실게임 수집</h1><p>SUMMARY</p><button id="prev">이전</button><input type="range" id="pos" min="0"><button id="next">다음</button><span id="stamp"></span><img id="shot"><p>촬영 기준 시각. RISK는 확률이 아닌 차단 위험지수입니다.</p><script>const f=FRAMES;const p=document.getElementById('pos');p.max=f.length-1;p.value=Math.min(2,f.length-1);function draw(){const x=f[+p.value];document.getElementById('shot').src=x.image;document.getElementById('stamp').textContent=x.t.toFixed(2)+'초'}p.oninput=draw;document.getElementById('prev').onclick=()=>{p.value=Math.max(0,+p.value-1);draw()};document.getElementById('next').onclick=()=>{p.value=Math.min(f.length-1,+p.value+1);draw()};draw();</script></html>'''
text=f"{s['build']} · {s['seconds']:.1f}초 · 길이 {s['L_first']}→{s['L_last']} (최대 {s['L_max']}) · 촬영 {len(cams)}장 · {'사용자 중단' if s['end_reason']=='user_stop' else ('상한 종료' if s['capped'] else '사망 종료')}"
(p/'viewer.html').write_text(html.replace('SUMMARY',text).replace('FRAMES',json.dumps(frames)))
