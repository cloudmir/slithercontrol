---
record_schema: 1
id: fact-ui-half-size-20260930
kind: fact
status: superseded
as_of: 2026-09-30
---

# MOD UI 50% 축소

사용자 원문: “전체 UI를 좀더 작게 (폰트나, 패널 크기등)을 만들어줘. 반 정도로.. 너무 커서 화면을 많이 가려서 불편하다.” 사용자 선택으로 저장한다.

구현 원문: ext/mod.js의 Compact UI CSS와 placePanel. 설정 패널·접힌 패널·알림·점수 구성·타임라인·사망 요약을 scale(.5)로 표시하여 글자·버튼·여백·패널 가로세로를 50%로 축소. 드래그 좌표는 실제 화면 좌표로 유지하고 저장 위치는 축소된 실제 너비 기준으로 화면 안에 제한한다. 게임 캔버스 좌표·판단·파라미터 변경 없음. ext/pilot.js는 V8 원본 research/v81_before_20260930/pilot.js와 바이트 동일.

검증 원문: research/ui_half_20260930/result.json, compact.png. 1440×1080 모의 브라우저에서 패널 486×1058px→243×529px(가로·세로 각각0.5). 실제 슬라이더 키보드 조작→475px·숫자 동기화·재로드 저장 유지, 드래그100px 왼쪽/60px 아래 이동 확인. 홈·조정·표시·보관·화면·게임 6개 메뉴 가로 넘침 없음, 페이지 오류0. 420×700 화면에서도 저장된 패널 위치가 화면 안으로 제한됨. 첫 좁은 화면 확인에서 기존 저장 위치 클램프가 패널 일부를 화면 밖에 두는 문제를 발견하여 실제 너비 기준으로 수정 후 재검증 통과. 문법 검사 통과. 신규 게임·생존 성능 검증 없음.

실제 페이지 적용 원문: research/ui_half_20260930/windows_live.json, apply_live.py. 기존 빌드0930-26721c69 페이지에 축소 CSS를 주입했고 봇 true·프리셋 v8_exact·모든 값 유지 확인. 당시 패널이 접혀 있어 panel=null이며 DOM 패널 크기는 실제 페이지에서 미측정. 페이지 새로고침 없이 축소 CSS 적용; 전체 신규 코드 빌드는 다음 페이지 로드에서 사용된다. 최초 주입 시도는 JS 괄호 오타로 실행 전 실패했고 수정 후 적용 성공.

빌드0930-ca7cf3ac. SHA-256:
- ext/pilot.js: 2f1fbda9ac6d5405c30a71ed0ceb450a489edcd5406d8a72bbcf36eea2f47947
- ext/mod.js: 723145ea2577dda8e1295b2b0c2dfe4da4c16a9025fcdc1681165a3ad3fdb18b
- params.json: a186ff04ef35191bdedb297bcb1770eac46cfeeef72afcce65d56e472266051c

사용자 후속 지시 “너무 작네 75% 로..”로 50% 선택은 대체됨. 현재 구현은 fact-ui75-size-20260930 참조.
