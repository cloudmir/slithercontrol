---
record_schema: 1
id: claim-improvement-plan-review-20260925
kind: claim
status: draft
as_of: 2026-09-25
checked_at: 2026-09-25
evidence_refs:
  - path: .workspace/sources/improvement-plan-20260925-review-snapshot.md
    hash: d5d1e8f5daa02d5f567957fb325395d00e00061f85f69696a1f5ffac1c43d33e
    locator: 2.2 가상 재생 / 분류표
    quote: 안전한 기동이 5개 미만. 이미 위치를 잃었다.
  - path: .workspace/sources/improvement-plan-review-evidence-20260925.md
    hash: bacfcd34d6094f7e9c74528704201b3456fb5f727e062d2f7565633ef53adf17
    locator: 직접 재검사 출력 / summary
    quote: '"no_way_with_positive_candidates": 3'
  - path: .workspace/sources/improvement-plan-review-evidence-20260925.md
    hash: bacfcd34d6094f7e9c74528704201b3456fb5f727e062d2f7565633ef53adf17
    locator: 직접 재검사 출력 / summary
    quote: '"total_skipped_steps": 10'
dependency_hashes: {}
revision: caedc2e6-cd7d-4dfb-976d-3bf5ca6ee15c
---

# IMPROVEMENT_PLAN_20260925 검토 — 평가기 보완 우선

요청: 계획 검토. 운영 코드 및 원 계획 수정·실사이트 실행 없음.
문서: research/improvement_plan_review_20260925.md.
검사: research/review_improvement_plan_checks_20260925.py/json.

확인: no_way6판은 후보<5 분류이며 3판은 실제 결과에도 후보2/4/4개가 남음. 24판 T-1.2 평가에서 3판10시점 검사 누락, 15판은 마지막 목표 시각이 마지막 관측보다 뒤로 나감. 관측이 전부 없을 때 +inf로 안전 집계되는 합성 반례, 벽 밖 경로가 안전으로 집계되는 반례 재현. 서버 사망 시점 자체를 관측한 것이 아님.

헛경보 스크립트는 거절 경로만 검사해 안전 통과 후 위험 누락을 세지 않음. pred<HARD_PHYS와 접촉 예측은 다름. 마지막414틱의 19틱 방향 변경으로 이전 기동·부스트 문제를 배제할 수 없음. 19틱 계산은 참조한 두 스크립트에 없으며 이번 리뷰에서 재현하지 못함.

현재 why는 지속 코일의 hard와 달리 일반 목표 방위 후보 i의 몸/머리 여유를 기록해 경로가 다름. 최종 safe에는 회전 방향/후속 경로 제약도 포함돼 두 여유만으로 거절 사유를 확정할 수 없음. page_ms 시작은 관측 배열 수집 뒤라 전체 관측 비용을 포함하지 않음.

판단: 속도 최적화·페이지 계측·단일 명령 작성자·실행 가능한 후속 기동은 유지할 가치가 있음. 다만 위치 선택이 주원인, 계획 변경과 헛경보는 주원인이 아니라는 결론은 보류. unknown·벽·시간 정합·동일 경로 평가와 위험 누락 포함 지표를 먼저 보완할 것을 권고. 원시 후보 개수보다 독립된 출구와 실제 통과 가능한 후속 기동을 평가할 것.

미검증: 900상태 벤치마크 재실행, 414틱 전체 분류 재실행과 재생 내부 상태 일치율, 실제 사망별 회피 가능성, 개선 효과. draft는 권고 미채택이며 직접 확인한 검사 결과까지 미실행이라는 뜻은 아님.
