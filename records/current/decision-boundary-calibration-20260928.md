---
record_schema: 1
id: decision-boundary-calibration-20260928
kind: decision
status: adopted
as_of: 2026-09-28
depends_on:
  - fact-probe-boundary-20260928
dependency_hashes:
  fact-probe-boundary-20260928: 2becadb84306cc2210f502c9a6a943d7e83f33242fb274ed240bf26de6e57d9f
revision: b489747d-96dd-4da4-9145-6284c572c340
---
# 간격 슬라이더 보정 — 0 = 실측 사망 경계에 닿음, + = 더 멀리 (사용자 지시 2026-09-28, 빌드 0928-cbfeb782)

사용자: "슬라이더 값들을 보정해줘. 0으로 하면 딱 붙어 가는것으로 하고 + 로 할수록 멀어지는 gap을 두는것으로".

구현(ext/pilot.js makeParams): P.bodyOff(r) = thickOff(r) + (BOUND_CAL ? BOUND_GAP : 0). 몸 거리장(bodyField)·좁은 틈(findGaps)·통로 압박(findSqueeze)의 몸 반지름에 적용. 머리 예측 반지름은 thickOff만(머리 경계는 미측정).
- BOUND_GAP 기본 −5px: 정상 추종 중 사망 24건의 얕은 사분위(어느 크기에서든 −4~−6에서 죽은 사례가 있음). 작은 뱀(ro 15)은 보통 −13까지 살지만 보수적으로 −5를 경계로 둠. 확정값 아님(fact-probe-boundary-20260928).
- 효과: 모든 간격 슬라이더(SAFE, TIGHT, SAFE_HEADS, HARD, HARD_PHYS, THICK_OFF_*)가 "경계에서 얼마나 더 떨어질지(px)"가 됨. 그려진 몸 사이 간격으로는 값 −5만큼 더 가까이 감.
- BOUND_CAL 0이면 이전과 동일(재생 0 diff 확인). 켜면 같은 900프레임에서 명령 284/900 변화, 안전 후보 중앙값 8→9, 비상 56→54.
- 사용자 저장값 변경: THICK_OFF_THIN/MID/THICK 0/1/4 → 0/0/0 (경계 위 추가 여유이므로 0). SAFE 2·TIGHT 2·SAFE_HEADS 12·HARD 0·HARD_PHYS 5는 그대로(의미만 경계 기준으로 바뀜). 로그 gap_now와 탐침 gap은 여전히 그려진 간격(측정 기준 유지).
- 실게임 검증 전. 다음 5판 반복의 첫 변경 항목(Codex 권고: 크기별 하한만 먼저).
