import base64,json,gzip,math,html,sys,subprocess,collections
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=Path('/home/datawave/Work_AI/슬리더')
def write_json(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2))
def diagram(state,actual,alt=None):
 cx,cy=state['x'],state['y'];radius=500;scale=.6
 def pt(x,y):return ((x-cx)*scale+300,(y-cy)*scale+300)
 svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img"><rect width="600" height="600" fill="#101820"/>']
 for i in range(0,len(state['segs']),5):
  ax,ay,bx,by,r=state['segs'][i:i+5]
  if min(ax,bx)>cx+radius or max(ax,bx)<cx-radius or min(ay,by)>cy+radius or max(ay,by)<cy-radius:continue
  a,b=pt(ax,ay),pt(bx,by);svg.append(f'<line x1="{a[0]:.2f}" y1="{a[1]:.2f}" x2="{b[0]:.2f}" y2="{b[1]:.2f}" stroke="#566879" stroke-width="{2*r*scale:.2f}" stroke-linecap="round"/>')
 def line(path,color):
  points=' '.join(f'{pt(q["x"],q["y"])[0]:.1f},{pt(q["x"],q["y"])[1]:.1f}' for q in path)
  return f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="4"/>'
 svg.append(line(actual,'#ff6577'))
 if alt:
  svg.append(line(alt,'#53edbf'));q=alt[0];x,y=pt(q['x'],q['y']);svg.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#53edbf"/>')
 svg.append(f'<circle cx="300" cy="300" r="{14.5*state["sc"]*scale:.1f}" fill="#fff"/><path d="M300 300 l{math.cos(state["ang"])*25:.1f} {math.sin(state["ang"])*25:.1f}" stroke="#fff" stroke-width="3"/>')
 svg.append('<text x="12" y="25" fill="#fff" font-size="16">赤: 실제 이동 · 청록: 대안 모델 경로</text></svg>')
 return ''.join(svg).replace('赤:','빨강:')
def analyse(run,k,code):
 rec=json.loads((run/f'slp_{k:02}.json').read_text());box=json.loads(gzip.decompress((run/f'slp_{k:02}_box.json.gz').read_bytes()));log=json.loads(gzip.decompress((run/f'slp_{k:02}_log.json.gz').read_bytes()));fs=box['frames'];last=fs[-1];rows=[dict(zip(log['keys'],r)) for r in log['log']];tail=[q for q in rows if q.get('t',0)>=last['t']-3]
 # Only analysis subprocess; production code is never edited in this batch.
 subprocess.run(['node',str(HERE/'replay.mjs'),str(run/f'slp_{k:02}.json'),str(run/f'slp_{k:02}_box.json.gz'),str(code),str(run/f'counterfactual_{k:02}.json')],cwd=ROOT,check=True,timeout=180)
 cf=json.loads((run/f'counterfactual_{k:02}.json').read_text());best=cf['best'];nearest=[]
 for i in range(0,len(last['segs']),5):
  ax,ay,bx,by,r=last['segs'][i:i+5];dx,dy=bx-ax,by-ay;u=max(0,min(1,((last['x']-ax)*dx+(last['y']-ay)*dy)/max(1e-9,dx*dx+dy*dy)))
  nearest.append((math.hypot(last['x']-ax-u*dx,last['y']-ay-u*dy)-r-14.5*last['sc'],last['sid'][i//5]))
 gap,sid=min(nearest) if nearest else (None,None)
 if rec.get('capped'):cause='600초 수집 상한 종료 · 사망 분석 대상 아님'
 elif gap is not None and gap<0:cause=f'마지막 관측에서 몸통 {sid}의 표시 두께와 겹침({gap:.1f}px). 실제 서버 충돌 상대는 미확인.'
 else:cause=f'근처 몸통 {sid}에 접근(마지막 표시 간격 {gap:.1f}px). 관측 사이 충돌·공격·모델 오차를 추가 구분해야 함.' if gap is not None else '관측 장애물이 없어 사망 원인 미확인.'
 prefix=sum(q.get('v10_root_safe') is False for q in tail);emergency=sum(q.get('mode')=='v10emergency' for q in tail)
 direction='좌회전' if best['offset']<0 else '우회전' if 0<best['offset']<math.pi else '반대 방향 전환' if best['offset']>=math.pi else '방향 유지'
 improvement=(f'종료 {best["lead"]:.1f}초 전부터 {direction}, 부스트 '+('사용' if best['boost'] else '해제')+f'. 기록 구간 모델 최소 간격 {best["clear"]:.1f}px. ')
 improvement+=('모델상 침범 없는 후보가 있음. 판단 후보 선택·추종 지연을 점검할 필요.' if best['modelClear'] else '시험 후보 모두 모델상 위험. 더 이른 진입 회피·통로 폐쇄 예측을 우선 검토.')
 if rec.get('capped'):improvement='사망하지 않고 수집 상한으로 종료. 그림은 종료 전 구간 설명용이며 개선 필요를 입증하지 않음.'
 cameras=[json.loads(q) for q in (run/f'game_{k:02}_camera.jsonl').read_text().splitlines()];eligible=[q for q in cameras if q['t']<=last['t']];shot=(eligible[-1] if eligible else cameras[-1]) if cameras else None
 if shot:
  img=Image.open(run/shot['file']).convert('RGB');img.thumbnail((900,650));img.save(run/f'death_{k:02}.jpg',quality=62)
 actual=[{'x':f['x'],'y':f['y']} for f in fs if f['t']>=last['t']-2]
 (run/f'death_map_{k:02}.svg').write_text(diagram(last,actual));start=min(fs,key=lambda f:abs(f['t']-best['start']));(run/f'improvement_{k:02}.svg').write_text(diagram(start,actual,best['path']))
 a={'game':k,'seconds':rec['seconds'],'L_max':rec['L_max'],'capped':rec.get('capped',False),'cause':cause,'improvement':improvement,'last_gap':gap,'near_body':sid,'prefix_unsafe_last3s':prefix,'emergency_last3s':emergency,'candidate':{key:v for key,v in best.items() if key!='path'},'photo':f'death_{k:02}.jpg' if shot else None,'photo_at':shot['t'] if shot else None,'last_observation_at':last['t'],'server':rec['server'],'players':rec['players'],'errors':rec['errors'],'changes':rec['changes'],'limitations':cf['limits']}
 write_json(run/f'analysis_{k:02}.json',a);return a

def render(run):
 summary=json.loads((run/'summary.json').read_text());cards=[]
 for a in summary['games']:
  k=a['game'];esc=lambda s:html.escape(str(s));photo=''
  if a.get('photo'):photo='<img alt="종료 직전 실제 화면" src="data:image/jpeg;base64,'+base64.b64encode((run/a['photo']).read_bytes()).decode()+'">'
  cards.append(f'<article id="g{k}"><h2>{k}판 · {a["seconds"]:.1f}초 · 최대 길이 {a["L_max"]} · '+('상한 종료' if a['capped'] else '사망')+f'</h2><p>{esc(a["cause"])}</p><details open><summary>실제 마지막 화면 · 촬영 대응 게임 시각 {a.get("photo_game_at",a.get("photo_at",0)):.2f}초 / 마지막 관측 {a["last_observation_at"]:.2f}초</summary>{photo}</details><p>서버 {esc(a["server"])} · 인원 {a["players"]} · 판단 오류 {a["errors"]} · 설정 변경 {len(a["changes"] or [])}건</p><div class="pair"><div><h3>실제 이동·장애물 좌표 재구성</h3>{(run/f"death_map_{k:02}.svg").read_text()}</div><div><h3>대안 움직임 설명도 · 생존 미입증</h3>{(run/f"improvement_{k:02}.svg").read_text()}</div></div><p>{esc(a["improvement"])}</p><p class="muted">마지막 3초: prefix 위험 {a["prefix_unsafe_last3s"]} 판단 / 비상 {a["emergency_last3s"]} 판단. 회수가 곧 사건 수는 아님. 대안은 기록된 적의 미래를 고정한 모델로, 적의 반응과 기록 이후는 미검증.</p></article>')
 done=len(cards);status='20판 완료' if summary.get('completed') else '중단: '+str(summary['error']) if summary.get('error') else '수집 중';nav=' '.join(f'<a href="#g{a["game"]}">{a["game"]}판</a>' for a in summary['games'])
 h='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V10 20판 사망 분석</title><style>body{font:15px/1.6 system-ui;background:#111a23;color:#edf4fa;margin:0;padding:16px}h1{font-size:23px}article{background:#1b2937;padding:16px;margin:18px 0;border-radius:12px}h2{font-size:19px}h3{font-size:15px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}img,svg{width:100%;height:auto;display:block}a{color:#53edbf;margin-right:10px}.muted{color:#b7c9d7}p{overflow-wrap:anywhere}@media(max-width:650px){.pair{grid-template-columns:1fr}}summary{cursor:pointer}</style><h1>V10 · 20판 실게임 분석</h1>'+f'<p>{done}/20판 · {html.escape(status)} · 코드 {html.escape(summary.get("build","확인 중"))}</p><p>목적: 사망 직전의 위치·명령·충돌 경계와 대안 후보 확보. 판당 600초 상한, 코드·설정 고정. 상한 종료는 사망이 아님.</p><nav>{nav}</nav>'+''.join(cards)+f'<footer class="muted">원자료: {html.escape(str(run))} · 화면은 실제 촬영, 경로 그림은 로그 좌표 재구성. 단일 조건 수집이며 A/B·생존률 개선 입증이 아님.</footer></html>'
 (run/'report.html').write_text(h)
if __name__=='__main__':render(Path(sys.argv[1]))
