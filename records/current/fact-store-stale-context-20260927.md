---
record_schema: 1
id: fact-store-stale-context-20260927
kind: fact
status: confirmed
as_of: 2026-09-27
depends_on:
  - decision-mod-extension-20260926
dependency_hashes:
  decision-mod-extension-20260926: 93be9c7e3ad454ed3b25da7d7460e86ad27eba48caeecc6b1878e8f36cbf6058
revision: d5321f47-c032-4a66-ac47-6c1a3980dcd9
---

# 확장 오류 "Extension context invalidated" (store.js:6) — 원인·수정 (ext 0927-45e49619)

사용자(2026-09-27, chrome://extensions 오류 버튼 화면): "플러그인 오류가 나 있었네?"

확인(chrome.developerPrivate.getExtensionsInfo, 읽기만): 오류 1종, "Uncaught Error: Extension context invalidated.", store.js:6(chrome.storage.local.set), 65회, 탭 http://slither.com/io.
게임 탭은 07:06:49 KST(A/B 수집기 시작) 로드, 그 탭의 store.js가 응답 없음(설정 get 요청에 1.5초 무응답).
원인(추정, 정황): 수집기가 chrome.developerPrivate.reload 호출 → 콜백이 0.01초 만에 돌아옴(재로드 완료 전) → 2초 뒤 탭 새로고침 → 탭의 콘텐츠 스크립트가 옛 확장 것으로 붙은 뒤 확장 재로드가 끝나 무효화. 사용자의 수동 재로드 가능성은 배제 못 함.
영향: 페이지(MAIN) 스크립트(mod.js, pilot.js)는 chrome.* 를 쓰지 않아 정상. 설정은 그 주소의 localStorage에는 저장됨. chrome.storage(주소 간 공유) 동기화만 실패. A/B 판별 값은 기록 hash로 확인됨(fact-cycle1-ab-20260927).

수정:
- ext/store.js: chrome.* 호출을 try/catch, 실패 시 페이지에 {slpStore: 'stale'} 알림(예외 없음).
- ext/mod.js: 'stale' 수신 시 패널 알림 "확장이 다시 로드됨 — F5로 새로고침하세요 (그 전까지 설정은 이 주소에만 저장)".
- research/mod_deaths_live.py: 페이지 로드 뒤 store.js 응답 확인(STORE_ALIVE), 없으면 최대 3번 다시 로드, 그래도 없으면 중단.
- ext/test/mock_check.py: 'stale' 알림 확인 추가. MOCK OK.
적용: 08:5x 게임 중 아님 확인 후 확장 재로드 + 탭 새로고침(/tmp/slp_reload.py) → 첫 로드에서 store.js 응답, 버전 0927-45e49619. chrome://extensions의 기존 오류 목록은 지우지 않음(과거 기록).
