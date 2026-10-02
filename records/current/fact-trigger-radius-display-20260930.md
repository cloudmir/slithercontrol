---
record_schema: 1
id: fact-trigger-radius-display-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# 몸통 밀도·머리 판단 반경 표시

사용자 지시: “몸통 밀도 가중치를 계산하는 반경, 머리 개수 판단 반경 두개를 표시에 넣고 끄고 켤수 있게 해줘. 그리고 끄고 켜는 스위치는 해당 VERIFIED CONTROLS 안에도 넣어줘”.

구현 원문 ext/mod.js BASIC·overlay·홈 sw: 몸통 반경=청록 점선, 머리 반경=노랑 실선, 내 머리 중심으로 현재 설정 반경×게임 확대율에 맞춰 표시하고 px 이름표 제공. V8/V8-1에서는 V81_BODY_R·V8_HEAD_R, V7에서는 V7_HEAD_R 표시. 몸통 판정이 꺼져 있어도 설정 반경 확인 가능하며 ‘판정 꺼짐’ 표기. 게임 중 해당 모드에서 표시하며 봇/예측 경로 표시와 독립적이다.

S.show.bodyRadius/headRadius 개별 표시 설정을 기본 켜짐으로 추가. 표시 탭과 VERIFIED CONTROLS 각 반경 슬라이더 제목 옆 ‘표시 ON/OFF’ 스위치가 동일 설정을 공유·저장한다. 판단 파라미터나 회피 조건은 바꾸지 않는다.

검증 원문 research/radius_display_20260930/check.py → result.json·both.png: 모의 브라우저에서350/500px 원의 중심·현재 gsc 배율 일치, 개별 끄기/켜기, 두 메뉴 동기화, 반경 변경 즉시 표시, 줌 변경, 모두 끈 후 저장·재로드 확인. 봇·경로 표시 꺼져도 원 표시 확인. 토글 전후 파라미터 동일, 페이지 오류0. 최초 테스트는 내비게이션 버튼의 아이콘 포함 접근성 이름을 고려하지 않아 선택자 대기 실패; 제목 선택자로 수정 후 통과. ext/pilot.js·params.json 수정 전과 바이트 동일.

빌드0930-423ad02c. ext/mod.js SHA-256 92de549b7c47eb8e829d38f66a4b496d50923218e21bb4f87d95919c4c913852. 문법 검사 통과. before/에 변경 전 보존. windows_applied.json: 현재 게임 진행 중이므로 재로드 보류, 기존 판·설정 유지. 게임 종료 후 확장 재로드+페이지 새로고침 필요. 신규 실게임 없음.
