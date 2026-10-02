---
record_schema: 1
id: fact-verified-controls-sliders-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# VERIFIED CONTROLS 단일 열·긴 슬라이더, V8-1 삭제

사용자 지시: “각 항목의 조정 VERIFIED CONTROLS 메뉴를 한줄에 두개 -> 한줄에 한개(길게) 그리고 슬라이더로 조정하기 쉽게 변경해줘”. 추가 지시: “그리고 V8-1은 삭제. 생각보다 V4.1이 잘 죽네.” 후자의 사망 평가는 사용자 관찰로 저장하며 측정 우위·열화로 확정하지 않는다.

구현 원문: ext/mod.js의 quick-grid CSS·홈 sw 함수. 한 행에 카드 하나, 숫자 항목은 카드 너비를 쓰는 슬라이더와 오른쪽 직접 숫자 입력. 슬라이더 이동 중 숫자가 표시되고 놓으면 값 적용·기록·저장, 숫자 변경은 슬라이더와 동기화. min/max/step·비활성 규칙은 기존과 같다. 이진 옵션은 기존 토글 유지. 알고리즘 가중치·기본값을 임의 변경하지 않았다.

V8-1 제거: V81 선택 버튼·내장 프리셋·파라미터·판단 분기 삭제. 원본 V4.1 자체는 별도 기존 모드로 보존. ext/pilot.js는 research/v81_before_20260930/pilot.js(V8 원본)와 바이트 동일. 이전 저장값이 V8-1을 켜고 있으면 V8로 옮기고 조정값 유지. params.json에서 V81 관련 항목 제거. 역사 코드·시험·기록은 삭제하지 않았다.

검증 원문: research/verified_controls_20260930/result.json, controls.png. 실제 브라우저 모의 페이지에서 V8 제어9개 모두 단일 열·숫자 슬라이더9개, 슬라이더 실제 너비228px 확인. 반경 슬라이더625px→숫자 표시·설정 적용, 숫자 입력700px→슬라이더 동기화, 저장 후 재로드700px 유지. V8-1 버튼 제거·기존 저장값 V8 이전 확인, 페이지 오류0. 첫 점검의 마지막 전체 파일 동일성 검사는 여분 빈 줄 한 개 때문에 실패했고, V8 원본 파일로 정확히 복원 후 최종 점검 통과. 판단 알고리즘 변경 또는 신규 실게임 시험은 없다.

진행 중 페이지에는 research/verified_controls_live.js/.css로 같은 단일 열·슬라이더를 DOM에 적용한다. 기존 숫자 필드의 change 처리를 그대로 호출해 실제 파라미터 적용·저장을 유지한다. 패널 재렌더 때도 다시 적용되며 V8-1 메뉴·내장 항목은 제거한다. 전체 코드 빌드는 다음 페이지 로드에서 읽힌다. 게임·봇·현재 프로필을 재시작하거나 임의 전환하지 않는다(V8-1이 활성화되어 있으면 사용자의 삭제 지시에 따라 V8로 이동).

빌드 0930-26721c69. SHA-256:
- `ext/pilot.js`: `2f1fbda9ac6d5405c30a71ed0ceb450a489edcd5406d8a72bbcf36eea2f47947`
- `ext/mod.js`: `e1c60f82fad64e8fd44cd0af4e6746ed94f86888eeb947c7ca21e6a7072a8d70`
- `params.json`: `a186ff04ef35191bdedb297bcb1770eac46cfeeef72afcce65d56e472266051c`

실제 적용 완료 원문: research/verified_controls_20260930/windows_live.json. 빌드0930-26721c69, 단일 열9개·슬라이더9개, 봇 true·프리셋 v8_exact 및 조정값 유지 확인.
