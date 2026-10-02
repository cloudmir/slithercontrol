---
record_schema: 1
id: claim-active-survival-v5-validation-20260923
kind: claim
status: supported
as_of: 2026-09-23
checked_at: 2026-09-23
depends_on:
  - decision-active-survival-start-20260923
  - decision-active-survival-targets-20260923
evidence_refs:
  - path: .workspace/sources/active-v5-evidence-20260923.md
    hash: d87b7b08381690aed5ef72595ec90d25858811dcebbd2ef52e2cfbf9c60bb010
    locator: runs/active_final_v5_planned_summary.json 31–94행
    quote: '"mean_life_s": 280.3866666667044'
  - path: .workspace/sources/active-v5-evidence-20260923.md
    hash: d87b7b08381690aed5ef72595ec90d25858811dcebbd2ef52e2cfbf9c60bb010
    locator: active.py 47–55, 58–70, 170–224행
    quote: safe=(tc>times[-1]) & (tr>max(.8,delay+.6))
  - path: .workspace/sources/active-v5-evidence-20260923.md
    hash: d87b7b08381690aed5ef72595ec90d25858811dcebbd2ef52e2cfbf9c60bb010
    locator: sim_active.py 93–132, 264–284, 313–323행
    quote: self.pending_spawns[i]=(self.t+.5,ex.request)
  - path: .workspace/sources/active-v5-evidence-20260923.md
    hash: d87b7b08381690aed5ef72595ec90d25858811dcebbd2ef52e2cfbf9c60bb010
    locator: evaluate_chunk.py 60–74행
    quote: success=bool(population_ok and full and alive and a['activity_ok'])
  - path: .workspace/sources/active-v5-evidence-20260923.md
    hash: d87b7b08381690aed5ef72595ec90d25858811dcebbd2ef52e2cfbf9c60bb010
    locator: runs/active_tests.txt 25–27행
    quote: Ran 22 tests in 0.199s
  - path: .workspace/sources/active-v5-evidence-20260923.md
    hash: d87b7b08381690aed5ef72595ec90d25858811dcebbd2ef52e2cfbf9c60bb010
    locator: runs/active_viewer_smoke.txt 3행
    quote: "PASS: AI -> human -> respawn -> AI, 8 rendered frames"
  - path: .workspace/sources/active-v5-evidence-20260923.md
    hash: d87b7b08381690aed5ef72595ec90d25858811dcebbd2ef52e2cfbf9c60bb010
    locator: runs/active_preservation_check.json 1–22행
    quote: '"unchanged": true'
dependency_hashes:
  decision-active-survival-start-20260923: c67887358de0778f4bb009a2fd9f5e30e89ca05e0964087fa766de70ec6a5a25
  decision-active-survival-targets-20260923: 797afbfaed96e380f0e463defb3b32d4537a3c87996a1181473bf35dc5a260ac
revision: 5202e493-1855-4965-8afe-c9dacb3199b8
---
# 활동 구역 생존 제어기 v5 구현·검증 — 90% 목표 미달

기준일 2026-09-23, 최종 기록 약 21:20 KST. supported는 아래 코드 구조와 로컬 시험 출력에 한정한다. 목표 성능 달성·무한 생존·실사이트 성능을 검증했다는 뜻이 아니다.

**결과.** 미리 정한 19판을 모두 종료했고, 19판 모두 환경 유효 조건을 통과했다. 한 판은 첫 사망 또는 600초까지이며, 생존과 활동 조건 준수를 동시에 요구했다.

| 제어기 | 난이도 | 판 수 | 활동 준수 10분 완주 | 평균 생존 |
|---|---|---:|---:|---:|
| 새 active v5 | 보통 | 10 | 0/10 | 280.39초 |
| 새 active v5 | 어려움 | 3 | 0/3 | 186.12초 |
| 기존 기본 플래너 | 보통 | 3 | 0/3 | 208.40초 |
| 직진+기본 안전장치 | 보통 | 3 | 0/3 | 154.49초 |

보통 새 제어기 성공률의 양측 95% 이항 신뢰구간은 0–30.85%다. 90% 목표에 미달했다. 전체 10판 평균과 대조군 3판 평균은 시드 구성이 다르므로 직접적인 우위 근거가 아니다. 같은 초기 시드 3개를 별도로 비교한 내용과 모든 시드의 결과는 ACTIVE_VALIDATION.md / ACTIVE_VALIDATION.json에 있다. 소표본으로 우위를 확정하지 않는다.

**구현.**
- active.py: 83개 복합 경로, 실제 대기 명령 반영, 짧은 부스트·회전·원형 회피·이전 계획 유지. 충돌/기동 위험과 여유를 먼저 판정하고, 활동 구역과 먹이 순이득을 비교한다. 안전 후보가 없으면 먹이를 배제한다.
- sim_active.py / geometry.py: 별도 평가 환경의 이동 구간 접촉 검사, 고정 최근접 개수로 충돌 후보를 누락하지 않는 검사, 스폰 침범 거부. 재시도에서 최초 길이·역할·성향을 유지한다. 안전한 스폰을 못 찾으면 진행 중에는 대기·재시도하며, 상대 수가 줄어 쉬워진 판은 평가기에서 부적합 처리한다.
- activity.py: 고정 혼잡도·외곽·일시 이탈 판정. 정책의 자기 선언을 긴급 회피 근거로 삼지 않는다.
- evaluate_active.py / evaluate_chunk.py / run_active_validation.py: 첫 생명 평가, 실행 코드·규칙 해시, 재개 가능한 월드/RNG/명령 큐 저장, 전체 예정 시드 및 무효·미완료 집계.
- play.py --active --ai: 직접 조종 전환, 재시작, 후보 경로와 판단 상태 관찰.
- report_active.py / replay_active.py: 비교 보고서와 실패 직전 관측 이미지 생성.

**검사.** 회귀 검사 22개 통과(충돌 기하, 명령 지연, 초기화, 스폰 재시도/대기, 안전·먹이 선택 사례, 활동 조건, 평가 인증, 재개 일치). AI→직접 조종→재시작→AI의 8프레임 화면 검사가 통과했고 headless 이미지도 열어 확인했다. 문법 검사 통과. 원래 brain.py, sim.py, compare.py, tune.py의 변경 전/후 해시가 같다. 기존 파이프라인을 중단하거나 실사이트를 실행하지 않았다.

**산출물/재현.**
- ACTIVE_README.md: 사용법과 운영 정의.
- ACTIVE_VALIDATION.md / ACTIVE_VALIDATION.json: 최종 전체 결과, 같은 시드 비교, 실패 관측.
- runs/active_final_v5_plan.json, runs/active_final_v5/: 완료한 19판과 실행 소스 동결본.
- runs/active_rules_v1.json: 최종 결과를 보고 바꾸지 않은 활동 기준.
- runs/active_tests.txt, runs/active_viewer_smoke.txt, runs/active_preservation_check.json.
- research/active_baseline_20260923/: 기존 소스 보관. 앞선 개발/중단 시험은 별도 디렉터리에 남겼고 v5에 합산하지 않았다.

**미해결.** 생존 90%→99% 목표, 장기 탈출 통로의 보존, 실제 사망 원인별 인과 기여율, 계산 지연 초과를 반영한 실시간 성능, 실사이트로의 이전 성능. 시뮬레이터의 혼잡도 정의·상대 행동·부스트 소모·연속 몸체 변형은 실사이트와 동일하다고 검증되지 않았다. 초기 길이는 100 한 구간이다. 같은 초기 시드라도 행동에 따른 상대 난수 소비가 달라 이후 사건까지 완전히 일치하지 않는다.

이번 새 제어기는 경로 예측·탐색 방식이며 새 강화학습 모델을 학습한 작업이 아니다. 사용자 질문에 따른 순수 RL 가능성 의견은 claim-pure-rl-option-20260923(draft)에 분리했다. 이 실험의 실패를 순수 RL의 실패로 해석하지 않는다.

자료 범위: 최초 주입 검색은 coverageStatus=missing이었다. 이후 지정 코드·시험 출력·결과 JSON을 원문 발췌로 보관한 뒤 read_source로 전체를 확인했다. 이 확인을 전체 프로젝트·문헌·실사이트 검증으로 확대하지 않는다.
