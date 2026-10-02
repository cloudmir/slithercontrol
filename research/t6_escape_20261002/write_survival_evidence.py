import hashlib, json, sys
from pathlib import Path

run = Path(sys.argv[1])
result = json.loads((run / 'analysis.json').read_text())
summary = json.loads((run / 'summary.json').read_text())
assert result['completed'] and len(result['games']) == 5
table = ['| 판 | 실행기 기준 생존 | 브라우저 원본 시간 | 종료 직전 길이 | 최대 길이 | 종료 | 적 머리 근접 관측 비중 |',
         '|---|---:|---:|---:|---:|---|---:|']
for row in result['games']:
    duration = ('≥' if row['capped'] else '') + f"{row['runner_duration_s']:.1f}초"
    table.append(f"| {row['game']} | {duration} | {row['browser_seconds']:.1f}초 | {row['final_logged_L']} | {row['L_max']} | {'상한 종료' if row['capped'] else '사망'} | {row['time_fraction']['near_head']*100:.1f}% |")
report = f"""# T6 실게임 생존 측정 — 2026-10-02

사용자 요청: “실제 게임을 해서 얼마나 생존하는지 봐”.
테스트 설계: 5판·판당 실행기 기준600초 상한은 이번 검증의 운영 선택이다.
빌드 {result['build']}, 로그 `{run}`. 기존 Windows MOD Chrome과 T6 설정을 유지했다. 제품 코드를 수정하지 않았다.
대상 서버는 자동 선택 설정 그대로이며, 실제 접속 서버는 전 판181.41.140.178:444였다.

{chr(10).join(table)}

사망{result['deaths']}판·상한 종료{result['caps']}판. 생존 중앙값은{'최소 ' if result['median_is_lower_bound'] else ''}{result['median_s']:.1f}초다. 상한 종료한 판은 그 이후 사망 시각을 알 수 없다.
판단 오류{result['decision_errors']}·페이지 오류{len(result['page_errors'])}·판 중 파라미터 변경{sum(r['parameter_changes'] for r in result['games'])}건. 상한 종료를 위한 봇 끄기 기록은 파라미터 변경에 포함하지 않았다. 마지막에 봇을 끄고 종료했다.

4판은 실행기44.27초(브라우저48.0초)에 사망했다. 마지막 수집 판단까지 브라우저 기준22.9초 동안 출구 경로 수가0이었다. 끝에 안전한 첫 명령도0으로 긴급 회전 상태가 됐다. 이것은 플래너의 관측·판단 기록이며, 실제로 모든 탈출이 불가능했다는 증명은 아니다. 사망 직전 화면은 `game_04_second_0013_0039.621.jpg`, 원본 사망 관측은 `game_04_end_detected.json`이다.

시계 확인: Linux 실행기 약10.04초 동안 Windows 브라우저는 약11.14초 증가했다(`clock_check.json`). 원본 브라우저 시간은 그대로 보존했다. 사망 시간은 실행기의 종료 감지 경과시간, 상한 종료는600초 이상으로 표시했다. 종료 감지 간격은 목표0.35초이며 호출 지연이 포함될 수 있다. 고정 환산 비율을 적용하지 않았다.

`nh`는 주변 적 머리 관측 수로 몸통 혼잡도를 직접 측정한 값이 아니다. 촬영 목표 간격은0.5초였으나 실제 촬영은 브라우저 호출 지연에 따라 더 길어졌고 판별 촬영 시각을 별도 보존했다. 원본 판 기록·전체 판단 로그·블랙박스는5판 모두 저장했다.
5판 단독 관측 결과다. 비교군이 없으므로 기존 버전보다 생존이 개선됐다고 확정하지 않는다.

분석 원본: `analysis.json`; 재현 코드: `research/t6_escape_20261002/analyse_survival.py`.
"""
(run / 'RESULT.md').write_text(report)
inventory = {}
for pattern in ['slp_*.json*', 'game_*_end_detected.json', 'game_*_camera.jsonl', 'before.json', 'summary.json', 'analysis.json', 'clock_check.json']:
    for p in run.glob(pattern):
        inventory[str(p)] = {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}
selected = {k: v for k, v in summary.items() if k not in ['values', 'after']}
selected['T6_values'] = {k: v for k, v in summary['values'].items() if k.startswith('T6_') or k == 'T4_GAP'}
selected['final_browser'] = {k: v for k, v in summary.get('after', {}).items() if k != 'values'}
clock = json.loads((run / 'clock_check.json').read_text())
evidence = report + '\n## Original batch output\n\n```json\n' + json.dumps(selected, ensure_ascii=False, indent=2) + '\n```\n'
evidence += '\n## Reproduced analysis output\n\n```json\n' + json.dumps(result, ensure_ascii=False, indent=2) + '\n```\n'
evidence += '\n## Paired clock read\n\n```json\n' + json.dumps(clock, ensure_ascii=False, indent=2) + '\n```\n'
evidence += '\n## Original file inventory\n\n```json\n' + json.dumps(inventory, ensure_ascii=False, indent=2) + '\n```\n'
Path('research/t6_escape_20261002/live_evidence.md').write_text(evidence)
print(json.dumps({'report': str(run / 'RESULT.md'), 'evidence_chars': len(evidence)}, ensure_ascii=False))
