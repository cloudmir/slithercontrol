---
record_schema: 1
id: fact-server-menu-last-count-20260929
kind: fact
status: confirmed
as_of: 2026-09-29
checked_at: 2026-09-29
depends_on:
  - fact-server-prejoin-count-20260929
evidence_refs:
  - path: ext/mod.js
    hash: 3e3992fc14cf5a77ad319ad5198d48af4c92d483d1fa3baa159b83591699f60a
    locator: normalize serverSeen, rememberServerPlayers, game-tab server cards
  - path: ext/test/mock_check.py
    hash: 4cebec17260c0d01581a90ce3edcdcc2cb28f8729270ca9af8a6931a1800ce0d
    locator: visited-server population UI assertion
dependency_hashes:
  fact-server-prejoin-count-20260929: 5d2f1d4c064a4a61e7b6e0d118d1a1a139f9e2f0dc9898fcc1ae012bb24a1e40
revision: 50b9a7e3-2d9c-48dc-aa4d-cd052f130563
---

# 서버 선택 메뉴 — 방문 서버 마지막 인원만 표시

사용자 결정: 비공식 사전 탐침은 사용하지 않고, 실제로 들어갔다 나온 서버의 마지막 접속자 수만 기록한다.

구현(빌드 `0929-196493be`):
- 게임 탭 서버 선택을 카드형 목록으로 변경.
- 핑을 휴대전화 신호 막대와 초록·하늘·노랑·빨강으로 표시.
- 실제 방문 중 받은 `slither_count`를 서버별 마지막 값·측정 시각으로 저장.
- 마지막 인원을 숫자와 600명 상한 막대그래프로 표시. 미방문 서버는 `기록 없음`으로 명확히 구분.
- 자동 선택과 수동 서버 선택은 다음 판부터 적용하는 기존 동작 유지.

검증:
- `node --check ext/mod.js`, manifest JSON 검사 통과.
- 모의 페이지에서 321명 기록 저장, 서버 카드 3개, 숫자·그래프 렌더링 확인.
- 전체 mock은 새 기능 검사를 통과한 뒤 기존 화면 FPS 기준(요구 >40, 측정 36)에서 실패했다. 기능 오류·페이지 오류는 확인되지 않았다.
- 캡처: `research/mod_panel_game.png`.
