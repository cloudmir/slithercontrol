---
record_schema: 1
id: decision-balanced-remains-preset-20260929
kind: decision
status: adopted
as_of: 2026-09-29
depends_on: []
revision: 25f17642-0e71-43c9-9137-97c83fb0f777
---

# 균형 생존·잔해 프리셋

사용자 요청: 잘 피하는 `채택 2026-09-28 (경계보정)`과 먹이 효율이 높은 `잔해 적극 2026-09-28`을 적당히 섞는다.

구현: 내장 프리셋 `균형 생존·잔해 2026-09-29`을 추가했다(빌드 `0929-90ddd74a`). 채택 프리셋의 회피·경계 보정을 유지하고, 잔해만 목표로 하되 공격성은 중간으로 설정했다.

- 잔해: `REMAINS_ONLY=1`, `REMAINS=12`, `W_GOAL=130`, `W_FOOD=5`, `FOOD_R=3000`
- 위험 억제: `RIVAL_R=400`, `HEAP_GATE=1`, `SIZE_PROFILE=1`
- 부스트: `BOOST_COST=-25`
- 경계: `BOUND_CAL=1`, `BOUND_GAP=-5`

로컬 확인: 프리셋 목록 노출, 선택, 프로필·값 적용, 문법·JSON 검사 통과. 실게임 성능은 아직 측정하지 않았다.
