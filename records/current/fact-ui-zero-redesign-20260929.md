---
record_schema: 1
id: fact-ui-zero-redesign-20260929
kind: fact
status: confirmed
as_of: 2026-09-29
depends_on: []
revision: 8ebce877-66ba-4a15-a665-29c54b53b635
---

# 설정 패널 제로베이스 재설계 (2026-09-29)

사용자 지시: 긴 상세 설정 목록을 줄이고, 인터넷의 설정 UI 이미지를 참고해 직관적이고 화려한 패널로 다시 설계한다.

구현(`ext/mod.js`, 최종 빌드 `0929-ef89aaf5`):
- 고정 왼쪽 내비게이션과 6개 화면으로 재구성했다.
- 홈에는 V1/V2 선택과 검증된 핵심 제어 4개만 노출했다.
- 상세 수치는 `조정` 화면의 검색·아코디언 안에 두었다.
- 청록·파랑·보라·주황·분홍을 메뉴·상태·핵심 카드별로 구분하고 표면 밝기와 글자 대비를 높였다.
- 판단 알고리즘과 설정값 의미는 바꾸지 않았다.

시각 참고:
- Maja Ogar, *Game Settings | Daily UI Challenge*: 고정 측면 메뉴와 큰 설정 카드.
- Kaeru, *Game Settings*: 어두운 표면, 선명한 활성 상태, 간결한 설정 행.

검증:
- `node --check ext/mod.js` 통과.
- 로컬 모의 페이지에서 홈·조정·표시·보관·화면·게임 6개 화면 렌더링, 가로 넘침 없음, 페이지 오류 0.
- 홈 핵심 카드 4개 확인.
- 캡처: `research/ui_zero_home_20260929.png`, `research/ui_zero_tune_20260929.png`.
- 밝은 색상 최종 캡처: `research/ui_color_home_20260929.png`.

참고: 전체 모의 검사의 UI·프리셋 단계는 통과했으나 기존 FPS 절대값 검사는 이 실행의 헤드리스 rAF 22~27Hz 때문에 실패했다. UI 전용 검증과는 별개다.
