---
record_schema: 1
id: claim-staged-controller-validation-20260924
kind: claim
status: supported
as_of: 2026-09-24
checked_at: 2026-09-24
depends_on:
  - decision-staged-controller-start-20260924
  - decision-active-survival-targets-20260923
evidence_refs:
  - path: .workspace/sources/staged-verification-20260924.md
    hash: 64826ce3ff82b25e11a1a74f30d6dc57491c58d9db4ddb34c34596c16f7d096a
    locator: 본문 비교표 및 시드별 원본 결과
    quote: "독립 비교: 24/24판 완료, 환경 유효 24/24판."
  - path: .workspace/sources/staged-verification-20260924.md
    hash: 64826ce3ff82b25e11a1a74f30d6dc57491c58d9db4ddb34c34596c16f7d096a
    locator: 시험 출력·복원 시험·기존 소스 보존
    quote: 9개 기존 소스 SHA-256 일치.
dependency_hashes:
  decision-staged-controller-start-20260924: 9db1394cc6e054fb522bf187bae95c45217b912092997ca7182407fcef098b9c
  decision-active-survival-targets-20260923: 797afbfaed96e380f0e463defb3b32d4537a3c87996a1181473bf35dc5a260ac
revision: 3ddb355d-988a-4fef-801a-9870f9013027
---

# 새 독립 제어기 구현·24판 비교 — 몸체 추종 3/4 완주, 90% 목표 미달

기준일 2026-09-24 11:26 KST. supported는 소스·시험 출력·해당 시드의 로컬 결과 확인에 한정한다. 성공률 90% 인증이나 실사이트 성능 입증이 아니다.

사용자가 승인한 단순→복잡 단계로 독립 구현했다. 기존 제어기·모델을 수정하지 않았고 기존 핵심 소스 9개 해시가 동일하다. 새 파일은 staged.py, staged_reference.py, play_staged.py, evaluate_staged.py, test_staged.py. 결과·실행 문서는 STAGED_RESULTS.md, STAGED_README.md다.

## 완료한 독립 비교

보통 난이도, 개발과 분리한 시드 62000–62003, 방식당 4판, 시작 길이 100, 상대 50마리, 기존 활동 규칙 v1, 첫 사망/600초. 24판 모두 완료하고 환경 유효 조건 통과. 성장량은 종료 시점 길이 순증이며 생존 평균은 600초 상한이다.

| 방식 | 활동 준수 600초 완주 | 평균 생존 | 평균 순성장 |
|---|---:|---:|---:|
| 기존 active v5 | 0/4 | 302.0초 | 13120 |
| 단순 방향 회피 gap | 0/4 | 101.8초 | 1533 |
| 이동 예측·비상 부스트 predict | 0/4 | 228.6초 | 9073 |
| 초기 고정 원형 circle_v0 | 1/4 | 350.4초 | 2801 |
| 후속 고정 원형 circle | 0/4 | 312.3초 | 3402 |
| 자기 몸 경로 추종 coil | 3/4 | 464.3초 | 4363 |

기본 실행값은 관측 성적이 가장 좋은 coil로 잠정 선택했다(어시스턴트의 승인 범위 내 구현 선택). 작을 때 회피·먹이 수집, 충분히 자라면 고리 형성, 한 바퀴 후 실제 자기 몸 경로를 따라간다. 일반적으로 최고인 알고리즘이라는 결론은 아니다. 비교를 보고 선택했으므로 다음 확인은 새 시드로 해야 한다.

coil은 62000/62002/62003에서 600초 생존과 활동 조건을 함께 통과했다. 62001은 57초, 길이 약234에서 고리 진입 전에 사망했다. 초기 성장 구간 회피가 다음 개선 우선 대상이라는 판단이다. 관측 75%, 이항 95% 신뢰구간 19.4–99.4%; 목표 90%는 미달이다.

## 검증한 것과 미검증

기능·기존 물리 시험 35개 통과. 새 뷰어의 더미 화면 렌더링·자동 플레이 시작을 확인했다. 중단/재개와 연속 실행을 비교해 660개 명령 전체, 최종 지렁이·먹이·큐·난수 상태 및 성적이 일치했다. 저장 관측 68개에서 기본 제어기 계산 시간 wall p95=33.2ms, max=43.8ms(물리·그리기·입출력 제외).

학습·실사이트 실행은 하지 않았다. 어려운 난이도, 사용자 데스크톱 장시간 관찰, 큰 새 시드 집합, 실제 시간 제약 아래의 생존률은 미검증이다. 배치 시뮬레이션은 판단을 기다린다. 같은 초기 시드라도 정책에 따라 상대 반응과 이후 난수 소비가 달라진다.

자료 후보의 최초 coverageStatus=missing을 성능 근거로 쓰지 않고 실제 코드·실험 결과를 별도로 보관하여 read_source로 확인했다. 이번 확정 범위는 로컬 보통 난이도다.

## 재현 및 이력

기본 실행: OPENBLAS_NUM_THREADS=1 .venv/bin/python play_staged.py
명시적인 완주 사례 재현: 위 명령에 --stage coil --seed 62000 추가. 성공 사례를 골랐다는 점을 문서에 명시했다.

통합 원본: runs/staged_comparison_20260924.json. 동결 원본: runs/staged_holdout_normal, runs/staged_circle_holdout, runs/staged_circle_v0_holdout.

개발 결과는 위 24판에 합산하지 않았다. staged_dev01 6판, staged_dev02 9판, staged_circle_dev 3판은 완료. staged_dev03은 종료 신호로 결과 없이 중단했고 staged_dev04는 최적화 전 느린 실행을 5/6판에서 중단해 부분 결과로 보존했다. 독립 시험은 저장된 월드·난수·명령 큐에서 같은 동결 코드로 재개하여 모두 종료했다. 현재 남겨 둔 실행 중인 새 시험은 없다.
