---
record_schema: 1
id: decision-remains-preset-20260928
kind: decision
status: adopted
as_of: 2026-09-28
depends_on:
  - decision-boundary-calibration-20260928
dependency_hashes:
  decision-boundary-calibration-20260928: 132597f97b219119757a9ad1c439bec7797a75e0db2e8df1b7d061aa95d95788
revision: d79ecd40-732e-4fe0-b256-3cea92cc56b4
---
# 잔해(죽은 지렁이 먹이) 적극 섭취 프리셋 (사용자 지시 2026-09-28, 빌드 0928-56a61ab7)

사용자: "먹이(적이 죽었을때 나오는것들만)를 아주 적극적으로 먹는 셋팅을 만들어봐".

측정 사실(블랙박스 5판 먹이 크기 분포): 일반 먹이 sz 3~9(93%), 죽은 지렁이 먹이 sz 14~16(7%). 이전 사용자 값 REMAINS 20은 잔해(최대 16)를 하나도 잔해로 보지 않던 값.

구현: D1 REMAINS_ONLY(신설, 기본 0) — 켜면 먹이 무더기(goal) 계산에 sz ≥ REMAINS 먹이만 넣음(경로 위 흡입 먹이 eat는 그대로). 무더기가 없을 때의 빈 배열 보호 추가. W_GOAL 슬라이더 상한 150→300. 끄면 재생 0 diff.

프리셋 "잔해 적극 2026-09-28"(채택 2026-09-28 프리셋 위에): REMAINS_ONLY 1, REMAINS 12, W_GOAL 250, W_FOOD 3, FOOD_R 3000, RIVAL_R 0(경쟁자 감쇠 없음), HEAP_GATE 0(경쟁자·위협 있어도 잔해 부스트), SIZE_PROFILE 0(커져도 잔해 끌림·부스트 유지), BOOST_COST −35. 브라우저에 저장·선택됨. 재생(900프레임): 부스트 점유 0.59, 비상 44(기준 54~56). 실게임 미검증 — 판정 지표는 큰 무더기 놓침 비율(기준 29~35%)·잔해 구간 L/분(기준 1000~1070).
