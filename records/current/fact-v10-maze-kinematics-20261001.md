---
record_schema: 1
id: fact-v10-maze-kinematics-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-maze-2h-kinematics-20261001.md
    hash: 6733cca1e722d617050da2df4146fba118cd1b3752753820f2756e06abb4bf06
    locator: changes_after_cycle4, kinematics, synthetic_food, limits
dependency_hashes: {}
revision: 97b4cb6b-63d1-4336-ac78-33b4e32c478b
---
# V10 2시간 개선 중간 — 관측 회전 지연 교정

사용자의 2시간 실테스트→수정 반복 지시에 따른 진행 중 기록이다. 완료 보고가 아니다.

실측 기록 기반 모델 검사: cycle7·8의 실제 명령 이력과 머리 회전을 앞 절반으로 맞추고 뒤 절반으로 검증했다. 회전 응답 지연은 두 판 모두 약 0.06초가 0.17초보다 오차가 작았다. 회전율 배율은 변경하지 않았다. 실제 명령으로 구동한 0.25초 위치 재생 p95 오차는 cycle7 24.00→8.95px(281개), cycle8 18.28→9.09px(274개). 표본은 겹치는 시계열이며 독립 시행이 아니다. 서버 RTT나 보편적 지연을 측정한 결과가 아니며, 오프라인 검증에서만 이후 실제 명령을 사용한다.

빌드 1001-3cf85fbe: V10 프리셋 TRACK_LAT와 현재 V10 설정을 0.17→0.06으로 조정하여 10차 실게임 검증 중. 다른 현재 조정값은 보존. Cycle9의 장기 머리 예측 강제 차단 구간 단축 실험은 채택 보류하고 cycle8의 1.2초 검사를 복원했다.

먹이 접근: 곡선 이동 중 먹이 방향을 재계산하고 선택한 통로로 복귀하는 경로를 검사한다. 새 먹이를 추가하는 동일 모의 3장면은 기존 0/3개, 수정 3/3개 섭취·충돌 없음. 실게임 성공률이나 생존 보장이 아니다.

원본과 버전: research/v10_maze_2h_20261001/cycle7_code, cycle8_code, cycle9_code, cycle10_code 및 원문에 기재한 runs/와 해시. 실게임은 순차·서로 다른 상황으로 인과 A/B 결과로 해석하지 않는다.
