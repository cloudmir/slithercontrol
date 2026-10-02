---
record_schema: 1
id: fact-v8-maze-review-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v8-maze-review-source-20261001.md
    hash: 2025a2d54b74f86239e0613c6f41608bf260e338e17eba696984125da109e4e1
    locator: ext/pilot.js v8Choice·v6Route·v6Step·v8Step, ext/mod.js planner,
      probe.json·parity.json
dependency_hashes: {}
revision: 47784c00-c102-4d10-a40f-7d3b126f64c7
---
# V8 미로 연결 검토

사용자 요청: V8 미로 탈출 알고리즘 적용 검토. 제품 코드 수정·빌드·배포·새 실게임 없음.

대상: 현재 파일 및 모의 브라우저 빌드0930-9604c044. pilot.js SHA256 07054ad7fc70ec5e1356c932880aa57cd7e192d36e08fc50074b42ace95942c8, mod.js 37e53d271b351ff908cf1d1bf734ab9c2dac60c42c852ac4817df44d6985a4f2, params.json f6f42119cd14a03ca485e411a2547b7d13b995990830894e97bc85138137dc35. 이전 대화의0930-7f368b21보다 현재 파일 버전이 다르며 이번 검토에서 생성한 빌드가 아니다.

확인:
- V8 avoid → v8Route → 원본 v6Route, child.step → v6Step 연결 정상. research/v8_maze_review_20261001/parity.mjs 재생300프레임(V1 150/V6 150, 전환9회), 원본 대비 명령·계획차이0. 기존 판단 함수 본문 동일.
- worker.py → worker.json: 실제 Worker 모의 브라우저 feed→avoid→feed, route_match=1, 페이지 오류0. 호출·경로 전달을 확인한 것이며 실전 탈출 성공 검증은 아님.
- 기본 V8는 머리 수 기준으로만 V6를 켠다. V81_BODY_ON=0이면 머리가 없는 긴 적 몸통/포위/벽 자체는 전환 조건이 아니다. probe.mjs의 전방 몸통 장벽·머리0 장면은 feed/cruise. 몸통 조건을 켜고 문턱1%로 설정한 대조에서는 점유율5.49%, avoid. 문턱1%는 재현용이지 추천값이 아니다.
- avoid는 V6 선택을 뜻하며 무조건 탈출을 뜻하지 않는다. v6Route가 현재 기동1.6초 위험을 다시 검사하고 food/explore/escape를 선택한다. 머리반경2500px·뒤쪽2000px의 머리3개·앞쪽잔해 합성 장면은 avoid이면서 food, 경로실제사용1. 기본450px 장면의 일반 결과로 확대하지 않는다.
- 거시 미로 탐색은 위치 셀만 상태로 쓰고 이동시간=거리/순항속도이며 회전 상태·회전시간을 추적하지 않는다. 전방 몸통 장벽 합성 장면에서 certified=1/exit 경로가 반환됐지만 경로상 최대 방향 변화96.65도, 해당 구간 시간으로 요구되는 회전율이 모델한계의1.44배. 이는 표시 경로를 그대로 실행할 수 있다는 인증이 아님을 보여준다. 실제 명령은 별도1.1초 국지 원호 검사에서 선택하므로 이 결과만으로 충돌/사망을 단정하지 않는다.

판단: V8에 V6가 누락된 문제는 재현되지 않았다. 미로 전환의 사각지대와 거시 경로의 실행 가능성 부족이 검토에서 드러난 핵심 제한이다. 전환 조건 확장·회전 가능 경로 검증은 후속 수정 후보이며 이번에 적용하지 않았다.

한계: Windows 현재 브라우저 읽기 전용 연결이 socket hang up으로 실패하여 실제 실행 버전·사용자 설정·최근 사망 원인은 미확인. 자동 검색 후보의 coverage missing을 실전 검증 완료로 해석하지 않았다. 테스트 및 원문: research/v8_maze_review_20261001/{probe.mjs,probe.json,parity.mjs,parity.json,worker.py,worker.json,source.txt}.
