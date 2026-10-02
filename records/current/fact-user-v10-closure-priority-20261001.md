---
record_schema: 1
id: fact-user-v10-closure-priority-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-closure-priority-user-20261001.md
    hash: 6fde7d0abb5fa59f773f7c9669cae3dc6beee4880edef46e531256b91702da96
    locator: 사용자 직접 진술
dependency_hashes: {}
revision: 61b33495-e27f-412e-8bfa-ebcc01c5479b
---
# 사용자 요구 — 통과 전 통로 폐쇄 가능성 우선

사용자 선택: 단순히 넓은 공간을 선호하지 말고, 적 머리의 주행 방향과 통로를 닫을 가능성을 경로 평가의 우선 기준으로 삼는다. 좁더라도 통과할 때까지 닫히지 않는 경로를 높게 평가한다.

사용자 가설: 반대 방향 적 머리는 통로를 바꾸지 못하므로 탈출 확률 100%. 이 수치는 사용자 진술이며 검증된 물리 조건·성공률로 채택하지 않는다.

설계 검토: 내 몸 두께·회전으로 실제 통과 가능한 후보에서, 내 통과 완료 시각과 적의 방향·회전·가속·새 몸통을 반영한 가장 이른 차단 시각을 비교해야 한다. 적 방향만으로 100%를 확정하지 않는다. 행동 빈도 데이터로 보정하지 않은 점수는 확률과 구분한다. 구현 완료 기록이 아니다.
