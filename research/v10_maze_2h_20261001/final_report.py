from pathlib import Path
import json,hashlib,html,base64,sys
P=Path('research/v10_maze_2h_20261001');rows=[]
for n in range(1,30):
 pp=sorted(Path('runs').glob(f'v10_maze_cycle{n}_*'))
 if not pp:continue
 p=pp[-1]
 if not (p/'summary.json').exists():continue
 s=json.load(open(p/'summary.json'));games=s.get('games',[])
 if not games:continue
 g=games[0];rec=json.load(open(p/'slp_01.json'))
 rows.append({'cycle':n,'purpose':'slider_smoke_45s' if n==14 else 'live_iteration','run':str(p),'build':rec['ext'],'seconds':g['seconds'],'capped':g['capped'],'L_max':g['L_max'],'route_pct':round(g['route_follow_frames']/g['total_frames']*100,2),'decision_p95':g['decide_ms'],'errors':g['errors'],'server':g['server'],'players':g.get('players'),'raw_hashes':{f.name:hashlib.sha256(f.read_bytes()).hexdigest()for f in p.glob('slp_01*')}})
notes=['14차가 있으면 최종 슬라이더 연결 확인용 45초 판이며 생존 성능 평가가 아닙니다.','부스트 소모 비용 슬라이더: 0은 평상시 소모 감점 없음, 높을수록 절약. 혼잡 탈출은 비용 감점 제외. 기본 0은 사용자 요청 취지에 맞춘 선택이며 최적값 측정 결과는 아닙니다.','73F 관련: 정적 통로 탐색과 실제 회전·충돌 검증을 분리하고, 진입 기동 후 탈출 경로 연결을 추가했습니다. 원래 33F/73F 관측 원본이 없어 해당 장면의 정확한 재생 검증은 하지 못했습니다.','선택한 경로는 RISK 임계값 아래에서 유지합니다. 경로가 실제로 무효해지면 즉시 재탐색합니다. RISK는 확률이 아닌 위험지수입니다.','먹이까지 매 단계 조준 방향을 갱신하고 선택 경로로 돌아올 수 있는지 검사합니다. 중앙 선호는 먹이가 있을 때 낮추며, 목적 없는 부스트를 제한합니다.','지연 0.17→0.06초는 두 판의 명령·위치 재생으로 교정했습니다. 서버 RTT 측정값은 아닙니다.','판별 서버 인원·상황이 다르고 버전도 순차 변경했습니다. 통제된 A/B 또는 무사망 증명이 아닙니다.','시간 상한 판은 사망 판이 아닙니다. 기록 초와 실시간 상한은 브라우저 시간축 차이로 다릅니다.','90ms 계산 예산에서는 후보 수·같은 출구 복구 검사가 간헐적으로 실패했습니다. 500ms 구조 검사 통과와 실시간 성능은 구분합니다.']
data={'status':'complete' if '--complete' in sys.argv else 'in_progress','deadline':'2026-10-01 15:26:44 KST','build':json.load(open('ext/manifest.json'))['version_name'],'runs':rows,'notes':notes}
(P/'final_summary.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
trs=''.join(f"<tr><td>{r['cycle']}</td><td>{r['seconds']}</td><td>{'상한 종료' if r['capped'] else '사망'}</td><td>{r['L_max']}</td><td>{r['route_pct']}%</td><td>{r['errors']}</td><td>{html.escape(r['build'])}</td></tr>"for r in rows)
shots=[]
for path,caption in [('runs/v10_maze_cycle11_20261001_150146/game_01_second_0225_0112.513.jpg','11차 실제 화면: 선택 #1 RISK 0.65 유지, #4·#5는 0.61. 후보 5개 표시.')]:
 p=Path(path)
 if p.exists():shots.append('<figure><img src="data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode()+'"><figcaption>'+caption+'</figcaption></figure>')
doc='''<!doctype html><html lang="ko"><meta charset="utf-8"><title>V10 2시간 개선 검증</title><style>body{max-width:1180px;margin:24px auto;padding:0 18px;background:#101722;color:#e7edf6;font:15px system-ui}h1{font-size:24px}table{border-collapse:collapse;width:100%}td,th{padding:9px;border-bottom:1px solid #334357;text-align:left}img{width:100%}figure{margin:24px 0}li{margin:10px 0}small,figcaption{color:#afc0d4}.bar{height:12px;background:#6cdda7}a{color:#87c9ff}</style><h1>V10 · 미로 탈출·먹이 추종 개선</h1><p>순차 실게임 기록 — 통제된 A/B가 아닙니다. 사망이 남아 있어 생존 문제 해결 완료로 판단하지 않습니다.</p><table><tr><th>판</th><th>기록 초</th><th>종료</th><th>최대 길이</th><th>경로 추종 틱</th><th>오류</th><th>빌드</th></tr>ROWS</table>SHOTS<h2>변경과 검증 범위</h2><ul>NOTES</ul><p>원본·판별 로그·스크린샷: research/v10_maze_2h_20261001/final_summary.json의 run 경로</p></html>'''
(P/'final_report.html').write_text(doc.replace('ROWS',trs).replace('SHOTS',''.join(shots)).replace('NOTES',''.join('<li>'+html.escape(n)+'</li>'for n in notes)))
print(json.dumps({'games':len(rows),'build':data['build']},ensure_ascii=False))
