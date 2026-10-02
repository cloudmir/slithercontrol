---
record_schema: 1
id: fact-radius-labels-removed-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# 반경 원의 글자·수치 삭제

사용자 지시: “몸통밀도, 머리개수, 글자와 수치는 삭제해줘”. 반경 원에 붙은 이름·px 수치를 삭제하는 표시 선택으로 반영.

원문 ext/mod.js overlay의 ring에서 텍스트 출력을 제거했다. 두 반경 원·0.5px 선·표시 스위치·설정 항목은 유지. 빌드 0930-7f368b21. 기존 반경 표시 기록의 이름표 설명을 이 변경으로 대체한다.

검증 research/radius_labels_20260930/result.json: 모의 브라우저에서 두 얇은 원 유지·해당 텍스트 없음·페이지 오류 0 확인. 문법 검사 통과. 파일 해시는 result.json, 변경 전 소스는 before/mod.js에 보존.

windows_applied.json: 현재 게임 진행 중이므로 재로드하지 않았다. 게임 종료 후 확장 재로드·페이지 새로고침 필요.
