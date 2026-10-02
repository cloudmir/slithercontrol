---
record_schema: 1
id: fact-cycle6-stopped-20260928
kind: fact
status: confirmed
as_of: 2026-09-28
depends_on:
  - decision-batch-fix-then-test-20260928
dependency_hashes:
  decision-batch-fix-then-test-20260928: 06b966366401bf07ed9cb3bec0d13f117854656c74dae77301afd03b8d2ad118
revision: cff63468-7871-46db-8cc5-8308f7e8c3e6
---
# 사이클 6 실게임 A/B 중단 — 사용자 지시 "우선 테스트는 그만하자" (2026-09-28 11:0x)

사용자(2026-09-28): "우선 테스트는 그만하자."

경과:
- 사이클 6(GIANT_ESCAPE) 배치는 결함 수정 빌드 0928-dbd6dc56으로 10:45 재기동(runs/cycle6_20260928_104508), 2판(A 167초 L 346 / B 461초 L 3074)에서 중단. 판정 불가(표본 2). 이전 배치(09:54·09:58·10:32 시작)는 빈 폴더 또는 결함 빌드라 폐기.
- 중단 방법: 수집기 SIGINT → summary.json 기록됨. 그러나 브라우저가 함께 닫혀 값 복원은 실패(restore_error). 저장소에는 3판째(A) 값이 남아 있었고 이는 채택 설정과 같음(GIANT_ON 0, GUARD_ON 1 확인). summary의 user_values에 GIANT_ON 1이 있던 것은 10:32 배치를 SIGTERM으로 죽였을 때 남은 값이며 사용자가 켠 값이 아님.
- MOD 브라우저 재기동 후 봇 끔, 그래픽 L4로 복원(gfx_set.py 4). 저장된 값: 채택 설정(GIANT_ON 0).

현재 코드 상태(빌드 0928-dbd6dc56): decision-batch-fix-then-test-20260928 참조. GIANT_ON은 미채택(기본 0), 실게임 판정은 보류.
