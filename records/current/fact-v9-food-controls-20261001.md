---
record_schema: 1
id: fact-v9-food-controls-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v9-food-source-20261001.md
    hash: 5c95133d2fa3f5d22d29d00d179e69f036a302c2f3b53cbfb3f09d1ae67118b7
    locator: V9 parameters, v9FoodGoals·v9Route·v9Step,
      drive_food.json·drive_escape.json·mock.json·windows_applied.json
dependency_hashes: {}
revision: 90f85092-eaeb-466d-8a3b-266fc6c186d4
---
# V9 잔해 추종·부스트·중앙 가중치

사용자 요청: 평상시 사체 먹이 추종, 탐색 범위, 적극 부스트 여부, 중앙 이동 가중치와 필요한 추가 항목 구현. 사용자 선택이다.

빌드 `1001-53d17b0e`. 이전 비부스트 탈출 전용 V9에 잔해 목표 경로를 추가했다. ext/pilot.js v9FoodGoals/Route/Step, ext/mod.js 관측·조향·홈·로그, params.json 및 생성 파일 수정. 변경 전 파일 research/v9_food_20261001/before/ 보존.

홈 VERIFIED CONTROLS 및 조정 탭:
- V9_FOOD_W 잔해 추종 가중치 기본2, 0–10 (0이면 목표 해제).
- V9_FOOD_R 탐색 범위3000px, 500–5000. 서버에서 실제 관측된 먹이만 사용.
- V9_BOOST_ON 적극 부스트 기본ON.
- V9_CENTER_W 중앙 이동 가중치2, 0–10. 중심4000px 이상에서는 전체 가중치, 2000–4000px는 점진 감소, 2000px 안에서는 해제.
- 추가: V9_REMAINS_MIN 크기 기준12(10–30), V9_HEAP_SIZE 묶음160px(80–400), V9_BOOST_MIN_MASS 부스트 최소 크기 합48(0–500), V9_BOOST_MIN_DIST 최소 거리180px(50–800), V9_TARGET_HOLD 목표 유지1.2초(0–5).
기본값은 구현 선택이며 실전 최적값이 아니다.

사체 구분은 먹이 크기 문턱에 의한 추정이다. 사망 개체와 생성 먹이를 직접 연결한 확정 분류가 아니다. 일반 작은 먹이는 목표에서 제외한다. 목표는 질량/(거리+180)로 묶음을 고른 뒤 실제 먹이 좌표로 지정한다. 비슷한 목표는 설정 시간 유지하되 사라지면 바로 해제하고, 1.5배 이상 좋은 목표는 바꿀 수 있다.

관측 지도 안 먹이는 실제 회전·속도 기동으로 직접 접근, 획득 후0.6초 감속 주행까지 충돌 검사한다. 지도 밖 잔해는 가까운 검증된 출구 방향만 유도하며 먼 미관측 구간까지 안전 경로라고 표시하지 않는다. 부스트 기동도 가속·감속·몸·머리·벽·명령 지연 검사를 통과해야 한다. 목표 소멸 또는 부스트OFF 시 기존 부스트 후보는 폐기한다. 표시와 실제 조향은 같은 목표각·부스트 명령을 사용한다. 먹이 경로는 “잔해 경로”로 구분하며 전체 미로 탈출을 뜻하지 않는다.

검증: research/v9_food_20261001/
- check.mjs → check.json: 작은 먹이 제외, 잔해 목표, 부스트OFF, 반경 밖 제외, 가중치0, 먼 잔해 방향 유도, 소멸 목표 해제, 근거리 부스트 억제, 폐쇄 벽 안 먹이 직접 경로 배제, 중앙 방향 및 목표 유지, 기동 재생 충돌 검사 통과.
- drive_food.mjs → drive_food.json: 기본100ms 계획 예산, 명령 지연 포함 좁은 통로의 잔해4개 모의 수집. OFF3.28초/ON1.76초, 양쪽4개 수집·몸 여유46px·접촉0. 동일 물리 모델의 합성 장면이며 실게임 성능 향상 근거가 아니다.
- drive_escape.mjs → drive_escape.json: 기존 좁은 통로·정면 장벽·U자 모두 접촉 없이900px 탈출(4.72/5.40/6.24초). 초기 중앙 가중치가 중심 근처에서 되돌아오게 만드는 현상을 확인해 중심2000px 이내 해제로 수정 후 통과.
- edge_cases.json: 너무 좁은 통로·낡은 경로·새 벽·가로지르는 선분·미래 적 몸통 거절, 현재 머리 재기준화, 기존 V1/V6/V8 함수 본문 불변 통과.
- mock.py → mock.json/controls.png: 실제 브라우저 Worker 먹이 경로·부스트, 스위치OFF, 반경 변경, 저장·재로드, 오류0. 최초 반경 테스트는 모의 지렁이가 이미 먹이에 가까워져 실패하여 먹이를 현재 머리 기준1500px 밖으로 옮긴 후 범위 변경 검증. 문법 검사 통과.

배포: windows_applied.json에서 Windows Chrome에 최신 빌드 로드 확인. 게임 대기 중(playing=false)에 확장·페이지 재로드, 기존 값·선택 유지, activePreset=v8_exact. V9 버튼 선택 필요. 신규 실게임 자동 실행 없음.

코드 해시: ext/pilot.js `6e66f409110712e1e8d1cd411451d63e05b897400f0bb8bb1de9ee4b06d091f0`, ext/mod.js `fd181c31714ff3fa1ad6b21248c277a785b3c137fb906291c70c29add9eff211`, params.json `4e02e3cbea7eb0b59ba6237ab6ba37124afdb80822b79171699c4239ca549eed`; 전체 hashes.json.
