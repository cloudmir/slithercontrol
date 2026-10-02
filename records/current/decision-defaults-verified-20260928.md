---
record_schema: 1
id: decision-defaults-verified-20260928
kind: decision
status: adopted
as_of: 2026-09-28
depends_on:
  - decision-boundary-calibration-20260928
dependency_hashes:
  decision-boundary-calibration-20260928: 132597f97b219119757a9ad1c439bec7797a75e0db2e8df1b7d061aa95d95788
revision: f7a71c31-4f70-42f6-ae7f-092992b39398
---
# 내장 프리셋(안전형·공격형) 기본값을 검증된 채택 설정으로 갱신 (사용자 제안 2026-09-28, 빌드 0928-31700137)

사용자: "안정형을 검증된 내용으로 프리셋을 업데이트 하는것은 어떤가?" → 반영.

변경(params.json defaults): TURN_FIX 0→1, RAIDER_ON 0→1, SIZE_SAFE 0→1, SIZE_GATE 0→1, HEAD_RAYS 0→1, WRAP_RAID 0→1, WRAP_EXIT_TAIL 0→1, MODE_DWELL 0→0.6, BOOST_DANGER 0→10, HEAP_GATE 0→1, SIZE_PROFILE 0→1(SIZE_SC 2.3), RIVAL_R 0→700. GUARD_ON·GUARD_*·BOUND_CAL·SQUEEZE_ON은 이미 기본 켜짐. GIANT_ON은 미검증이라 0 유지.
근거: 사이클 2 묶음(fact-cycle2-ab-20260927)·ATTACK_GUARD(fact-cycle4-ab-20260927) 실게임 채택. 검증은 공격형 프로필+사용자 슬라이더에서였고, 안전형 여유값(SAFE 18·SAFE_HEADS 30·HARD_PHYS 10)과의 조합은 실게임 미검증.
확인: 채택 설정(공격형 팔 A) 재생 0 diff(기본값 변경이 채택 동작을 바꾸지 않음), 안전형 재생 900프레임 정상(비상 68, 가드 평가 760틱), mock OK. 사용자 저장 프리셋(채택 2026-09-28·잔해 적극 2026-09-28)은 전체 값을 갖고 있어 영향 없음.
