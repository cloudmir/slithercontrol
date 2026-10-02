---
record_schema: 1
id: claim-project-status-2206-20260923
kind: claim
status: supported
as_of: 2026-09-23
checked_at: 2026-09-23
supersedes:
  - claim-death-recovery-progress-20260923
depends_on:
  - decision-death-recovery-training-20260923
  - decision-active-survival-targets-20260923
evidence_refs:
  - path: .workspace/sources/recovery-status-2206-20260923.md
    hash: 20b2741d3abe330b15d98a9e3f8c7007738b87e0e97dc8bc019642df0e3cbac4
    locator: runs/recovery_v1/status_snapshot.json / last_training
    quote: '"steps": 16384'
  - path: .workspace/sources/recovery-status-2206-20260923.md
    hash: 20b2741d3abe330b15d98a9e3f8c7007738b87e0e97dc8bc019642df0e3cbac4
    locator: runs/recovery_v1/validation_008192.json
    quote: '"recoveries": 2'
  - path: .workspace/sources/recovery-status-2206-20260923.md
    hash: 20b2741d3abe330b15d98a9e3f8c7007738b87e0e97dc8bc019642df0e3cbac4
    locator: runs/active_final_v5_planned_summary.json / active/normal
    quote: '"mean_life_s": 280.3866666667044'
dependency_hashes:
  decision-death-recovery-training-20260923: 32c4d151561e794509e9e295a19e6613ba7e3d9414a5536679a8488a1a32164f
  decision-active-survival-targets-20260923: 797afbfaed96e380f0e463defb3b32d4537a3c87996a1181473bf35dc5a260ac
revision: 6c9ae010-9428-48d1-b238-3022a21847a8
---
# 프로젝트 현황 정리 — 2026-09-23 22:06 KST 저장본

사용자가 "우선 지금까지 내용을 정리를 해보자"고 요청했다. 이 기록은 해당 시점의 코드·실험 출력 요약이며 학습 완료 또는 목표 달성 기록이 아니다. 중단 지시로 해석하지 않았으며 실행 중인 학습·복원 프로세스를 중단하지 않았다.

확정 목표 유지: 중간 혼잡도에서 생존 1순위, 안전한 먹이 수집 2순위. 긴급 회피 중 일시 이탈 후 복귀 허용. 보통 난이도 활동 조건 준수 10분 완주율 목표 90%→99%. 학습·검증은 로컬.

이전 active v5 검증은 계획 19판 완료. 보통 10판 모두 사망, 평균 생존 280.4초, 활동 조건 준수 10분 완주 0/10. 기존 방식만으로 목표 달성 못함을 확인했다. 다른 조건·버전의 과거 실험과 합산하지 않는다.

현재 사망 직전 회피 PPO: 원본 사망 2/4/6초 전 전체 월드에서 조향·부스트를 직접 학습한다. 학습 사건 5개/검증 사건 1개/시험 사건 3개 분리. 22:06 저장본에서 7개 사건 복원 완료, 2개 시험 사건 복원 중. 65536스텝 계획 중 16384스텝 모델 저장 완료. 훈련 에피소드 누계 427, 탐색 행동 중 회피 완료 2회. 29개 회귀 검사 통과.

별도 검증: 한 사건의 세 시작 시점에서 초기 모델 회피 0/3, 8192스텝 모델 2/3. 회피 완료 정의는 원래 사망 시각보다 6초 뒤까지 생존. 이는 서로 독립인 세 사건도, 10분 생존 성적도 아니다. 검증 모델은 결정적 행동을 사용하고 훈련은 탐색 행동을 사용하므로 훈련 성공 비율과 같은 평가가 아니다.

미완료: 16384 이후 학습, 나머지 체크포인트 검증 및 모델 선택, 미사용 시험 사건 3개 비교, 새 월드 10분 활동·생존 시험. 90% 목표와 일반적인 회피 성능 개선은 아직 검증되지 않았다. RECOVERY_REPORT.md 최종 결과는 아직 생성 전이다. 원자료를 save_source 후 read_source로 확인했으며, 자동 검색 coverageStatus=missing은 본 시점에 확인한 로컬 출력 이상의 전체 검증 완료로 바꾸지 않았다.
