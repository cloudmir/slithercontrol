---
record_schema: 1
id: claim-pocket4-local-20260924
kind: claim
status: draft
as_of: 2026-09-24
depends_on:
  - decision-pocket4-20260924
dependency_hashes:
  decision-pocket4-20260924: bac1a8fde744e16f019be9a73a6be88273d1101b46f3f270007f273b6d7f1624
revision: 80493446-c326-4a75-9fce-eecf5c0c7752
---

# pocket4 로컬 비교 — 6시드에서 생존·성장 모두 pocket3보다 나음(소표본)

근거: runs/pocket4_normal01/summary.json (보통 난이도, 시드 77100–77105, 150초, 초기 길이 100; source 미보관이라 draft).

| | 150초 생존 | 평균 순성장 | 중앙값 |
|---|---|---|---|
| pocket3 | 2/6 | 1296 | 921 |
| pocket4 | 5/6 | 3512 | 3353 |

- 모든 시드에서 pocket4 성장이 pocket3 이상. pocket3 사망 4건(12.7초·34.8초 encircler, 44.1초 cutter, 145.5초 기타 몸), pocket4 사망 1건(117초 cutter).
- 무더기 추적 판단 비율 pocket4 약 40~50%, pocket3 약 20~40%.
- 판단 시간 p95 pocket4 30~54ms(4개 병렬 측정).
- 한계: 6판 표본. 이전 76100대 4판에서는 pocket3가 4/4 생존이어서 시드 편차가 크다. 위험 가중과 먹이 조정 중 어느 쪽 효과인지 분리하지 않았다. 실사이트 미검증.
