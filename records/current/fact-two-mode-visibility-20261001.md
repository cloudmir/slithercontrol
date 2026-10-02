---
record_schema: 1
id: fact-two-mode-visibility-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/two-mode-visibility-20261001.md
    hash: 758a29895b6dd4bf4c7abd707bac91df04b1a2add19fb4e7628e6319c594601d
    locator: implementation, result, browser, manifest
dependency_hashes: {}
revision: b752492d-ae82-4e53-9dd9-b709d656f319
---
# V8-1·V10-1 선택 화면만 남김

사용자: “아닌것 같다. V8-1. V10-1 만 남기고 다 숨겨줘”. 성능 판정이 아닌 표시 선택.

빌드1001-0726b441. 홈 버전 버튼 V8-1/V10-1 두 개, 프리셋 드롭다운 해당 두 내장 및 해당 모드 사용자 프리셋만 표시. 조정 탭의 버전 활성 스위치는 숨김. 기존 숨긴 프리셋이 선택 중이면 비활성 현재 설정 표시를 사용하며 강제 모드 전환 없음. 저장된 단축키·이력은 보존. 알고리즘·원본·설정 값·로그 삭제 없음. ext/pilot.js 및 params.json 바이트 불변.

로컬 모의 브라우저 두 버튼/드롭다운/두 선택 동작 확인, 페이지 오류0. Windows 적용 확인, 기존 설정·bot·activePreset v101_hybrid 유지·playing false. 새 실게임 없음.

근거 research/two_modes_20261001/{before,result.json,windows_applied.json,manifest.json,ui.png,source.md}.
