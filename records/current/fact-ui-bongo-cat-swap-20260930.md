---
record_schema: 1
id: fact-ui-bongo-cat-swap-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
checked_at: 2026-09-30
evidence_refs:
  - path: ext/slp-cat-knock.gif
    hash: 78681cab068552db513c47d9deccc7244ac90041107de4da8aa5fdcde43f2ae5
    locator: current 4-frame looping mascot
  - path: ext/backups/slp-cat-knock-legacy-20260929.gif
    hash: cba06adb561ffc1705d13c75bbdfa811a909d87e23922585db68cadb7e1c7f57
    locator: previous mascot backup
  - path: ext/mod.js
    hash: 37e53d271b351ff908cf1d1bf734ab9c2dac60c42c852ac4817df44d6985a4f2
    locator: title logo dimensions
dependency_hashes: {}
revision: 19352b9a-41b8-46da-bbbf-fa022e62cad3
---

# 고양이 로고를 클래식 Bongo Cat 키보드 애니메이션으로 교체

사용자 지시: 첨부 이미지의 고양이 애니메이션을 찾아 기존 고양이를 백업하고 교체한다.

확인: 첨부 캐릭터는 Bongo Cat Mver의 클래식 마우스·키보드 모델과 일치한다. 공개 모델 미리보기를 참고하고 첨부 이미지를 외형 기준으로 삼아, 기본 imagegen 도구로 오른발이 키보드를 두드리는 4프레임 투명 스프라이트를 생성했다.

구현(빌드 `0930-9604c044`):
- 이전 `ext/slp-cat-knock.gif`를 `ext/backups/slp-cat-knock-legacy-20260929.gif`로 보존.
- 새 300×188, 4프레임 무한 반복 GIF로 `ext/slp-cat-knock.gif` 교체.
- 가로형 캐릭터에 맞춰 헤더 표시를 72×46px로 조정.
- 생성 원본은 `research/bongo-cat-classic-sprite.png`, UI 확인 캡처는 `research/bongo-cat-header-check.png`.

검증:
- GIF 4프레임·200ms 간격·투명 팔레트 확인.
- 헤더 로드 300×188, 표시 72×46px, 두 시점 캡처 해시가 달라 반복 애니메이션 확인.
- `node --check ext/mod.js`, manifest JSON 검사 통과.
- 전체 mock은 기능 검사 이후 기존 FPS 환경 기준에서 실패(raf 16, 기준 >40). 고양이 로드·표시 오류와 무관하다.

출처: https://github.com/MMmmmoko/Bongo-Cat-Mver (공개 모델), https://github.com/ayangweb/Awesome-BongoCat (Classic Mini Keyboard 미리보기).
