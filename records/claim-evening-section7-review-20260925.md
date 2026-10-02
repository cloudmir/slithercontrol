---
record_schema: 1
id: claim-evening-section7-review-20260925
kind: claim
status: draft
as_of: 2026-09-25
checked_at: 2026-09-25
evidence_refs:
  - path: .workspace/sources/evening-section7-review-evidence-20260925.md
    hash: c7324b18331805656deba5ad57fa1d04428b51cefc80a6c76c15fbf0e109554b
    locator: 직접 재검사 JSON
    quote: '"recomputed_chosen_gap": -23.935331825143763'
  - path: .workspace/sources/evening-section7-review-evidence-20260925.md
    hash: c7324b18331805656deba5ad57fa1d04428b51cefc80a6c76c15fbf0e109554b
    locator: pilot.py 705–706 및 held_fail_counterexample
dependency_hashes: {}
revision: 9ac60f70-da50-467e-a5c8-2f93dcf63937
---
# 저녁 변경 7절 재검토 — 제어 수정 확인, 평가 분류 잔여 결함

대상 pilot.py 9031e582…, 보고서 research/evening_section7_review_20260925.md.
검사 research/review_evening_section7_20260925.py/json.
운영 코드·원 문서·기존 기록 수정 및 실사이트 실행 없음. draft는 권고 미채택 상태다.

직접 재검사: 부스트 끈 50ms 뒤 공격이면 부스트 회피 선택, emergency 진입 시 pending 제거 확인. oracle 관측 누락 NaN, 벽 밖 경로 -11 반환 확인. 자체 검사 exit0. 종전 6eb10d1e… 검토의 이 반례들은 새 버전에서 해결됐다.

남은 결함:
- 판단 정상(planner_ok)14 집계는 chosen_realized를 조건에 쓰지 않는다. 실제 171431판은 후보32개, 예상 선택 여유+50.1인데 선택 경로 재계산 -23.9353px. 정상 판정 근거가 부족하다. 근사 고정 미래 평가이며 실제 서버 인과 원인 확정은 아니다.
- false_alarm 중간 관측 공백은 계속 건너뛴다. 실제 루프 합성 입력에서 중간 누락 시+705.1px, 중간 접촉 관측 포함 시-2px. 59헛경보·18놓침 전체가 틀렸다는 결론은 아니며 재집계가 필요하다. 18은 유지 후보의 접촉 틱으로 실제 최종 행동 실패 또는 독립 사건 수가 아니다.
- held_fail은 조건 위반만 기록하고 필터 적용 여부를 반영하지 않는다. safe 유지 후보를 실제 출력하면서 dead-end fail=true인 반례 확인. raw_violation/applied/removed_by 구분 권고.

새 재생 txt의146.3→124.9,16.4→12.9는7절과 일치. 이번에11판 전체 또는414틱 분석을 재실행하지 않았다. 12판 중1손상은 문서 설명이며 해당 추가파일 미확인.
기록 claim-pilot-live 크기33094byte로32768한도 초과 확인. 별도기록 분리·과거수치 철회표시 권고, 원기록은 미수정.
