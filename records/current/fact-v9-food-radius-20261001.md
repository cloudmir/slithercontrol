---
record_schema: 1
id: fact-v9-food-radius-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v9-food-radius-source-20261001.md
    hash: 02e5e047769acc6b1cbc5dc69c99207d5e43f4be490033162cf09fb3d5181365
    locator: ext/mod.js BASIC·overlay·displayKey, result.json, windows_applied.json
dependency_hashes: {}
revision: e6fc9b09-7e5e-4f13-8f30-df1c24dab1d2
---
# V9 잔해 탐색 범위 원 표시

사용자 요청: “탐색범위를 원으로 표시하는 기능을 추가하고 설정에서 끄고 켜는 기능을 넣어줘”. 직전 V9 잔해 탐색 범위에 대한 표시 선택으로 구현했다.

빌드1001-09a967d3. ext/mod.js: 내 머리 중심, V9_FOOD_R×현재 게임 확대율의 주황 점선 원(0.5px, 글자·숫자 없음). V9 게임 중 표시하며 봇·경로 표시와 독립적이다. S.show.v9FoodRadius 기본ON. 홈 VERIFIED CONTROLS ‘잔해 탐색 범위’ 옆 표시 ON/OFF와 표시 탭 ‘V9 잔해 탐색 범위’가 동일 값을 공유·저장한다. 판단 코드·탐색 파라미터는 변경하지 않았다.

검증 research/v9_food_radius_20261001/result.json·ring.png: 모의 브라우저에서 반경·중심·줌 변환, 0.5px 선, 홈/표시 메뉴 동기화, 슬라이더 반영, OFF 저장·재로드, 토글 전후 파라미터 불변·오류0 확인. 문법 검사 통과. 변경 전 표시 파일 before/ 보존. ext/mod.js SHA256 5e2308591cd7adf2b392995e09e94d9a2dd3b628612c8a659a70c70e359b611a.

windows_applied.json: 게임 진행 중이라 재로드하지 않았다. 판 종료 후 확장 재로드·페이지 새로고침 필요. 신규 실게임 실행 없음.
