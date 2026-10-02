---
record_schema: 1
id: decision-v41-keep-first-maze-20260930
kind: decision
status: adopted
as_of: 2026-09-30
---
# V4.1 — 최초 미로 풀이 코드를 "근접 회피 모드"로 보존 (사용자 2026-09-30)

사용자: "V4의 아주 처음 코드만 발라내서 V4_1 로직으로 발라낼수 있나?" → "그 로직을 근접 회피 모드로 하나 저장해 두자."

구현(빌드 0930-ed247246): research/v2sweep/pilot_v4_v1.js의 최초 v4Step(48px 격자·전방 원뿔 도달장·Dijkstra·첫 걸음 제한)을 ext/pilot.js `v41Step`으로 그대로 옮김. 파라미터 V41_* (CELL 48, CONE 150, FIRST 100, ASSUME_BOOST 0 등 14개), step 분기 최우선, 홈 버튼 "V4.1 · 근접". 현재 V4(층 구조)·V5는 그대로.
오프라인 재생(v3head2 2판, 1816프레임): 계산 p50 1.4ms·p95 2.4ms, 모드 v41esc 1698 / v41 68 / v41none 50.
백업: research/v2sweep/pilot_before_v41.js, mod_before_v41.js. 코드 검토는 사용자 직접(자동 Codex 리뷰 없음).
