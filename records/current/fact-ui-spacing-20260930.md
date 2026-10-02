---
record_schema: 1
id: fact-ui-spacing-20260930
kind: fact
status: superseded
as_of: 2026-09-30
---

# 원래 폰트 유지·UI 간격 압축

사용자 원문: “폰트는 100% 로 다시 원복하고, UI 만 간격들을 조정해서 조금 UI를 압축하자.” 사용자 선택으로 기록한다. 직전75% 배율 선택을 대체한다.

원문 ext/mod.js Compact UI CSS·placePanel: scale 제거, 원래 font-size 선언 모두 유지. 패널 폭484→430px, 최대 높이760px(작은 화면에서는 화면 높이에 맞춤). 상단·내비게이션·카드·버튼·입력·그룹·행의 여백과 간격만 축소. VERIFIED CONTROLS 단일 열·긴 슬라이더 유지. 알림·분석창도 원래 글자 크기로 복원. 드래그 시 최대 높이760 유지. V8 알고리즘·파라미터 변경 없음.

검증 원문 research/ui_spacing_20260930/result.json·compact.png: 1440×1080 모의 화면에서 원래 패널486×1058px→432×762px, 카드 높이110→77.59px. 원래12/14/12/10/9.5px 폰트와 일치, transform:none. 슬라이더 실제 너비228→232px, 키보드 조정·저장 유지. 6개 메뉴 가로 넘침 없음, 작은420×700 화면에서 패널 화면 안, 페이지 오류0. ext/pilot.js V8 원본과 바이트 동일, 문법 검사 통과. 신규 게임 시험 없음.

실제 적용 원문 research/ui_spacing_20260930/windows_live.json·apply_live.py: 기존 페이지에 같은 CSS 적용, 봇 true·v8_exact·모든 설정값 유지 확인. 적용된 실제 패널431.14×469.84px(현재 메뉴에 따라 높이 달라짐). 게임·페이지 재시작 없음. 전체 신규 코드는 다음 페이지 로드에 사용.

빌드0930-b5b4403f. ext/mod.js SHA-256 3066678c8bb2e83bfbb6b1f08b90b7725fa9f508d73ae4adc1e01b829ad19db0.

후속 사용자 지시(폰트80%·작은 버전 버튼·조정 탭 수준의 홈 슬라이더 높이)로 fact-ui-home80-20260930이 현재 UI를 대체한다.
