---
record_schema: 1
id: fact-ui-cat-logo-20260929
kind: fact
status: confirmed
as_of: 2026-09-29
checked_at: 2026-09-29
evidence_refs:
  - path: ext/mod.js
    hash: 266be2aa63881b3d87be647c9ee95f16f68f679f63af482a5c532c4124a54d55
    locator: "CSS #slp .title .logo"
dependency_hashes: {}
revision: c352bd48-e662-4ab9-b2a6-281a82ef2741
---

# SLP MOD 고양이 애니메이션 로고

사용자 선택: 기존 왼쪽 `S` 상자를 제공 이미지와 같은 그림체·색상의 투명 고양이 아이콘으로 바꾸고, 앞발로 계속 두드리는 GIF 애니메이션을 사용한다. 20% 확대 후 다시 20% 추가 확대했다.

구현(최종 빌드 `0929-4ba5ecd2`):
- `ext/slp-cat-knock.gif`: 96×96, 투명 배경, 4프레임, 무한 반복.
- `ext/mod.js`: 표시 크기 48×48 → 58×58 → 70×70px. 로고 자리도 70×58px로 조정.
- `ext/store.js`, `ext/manifest.json`: 확장 리소스 URL 전달 및 웹 접근 허용.
- 생성 원본 스프라이트: `research/slp-cat-knock-sprite.png`.

검증:
- GIF 4프레임과 프레임 시간 480/150/110/260ms 확인.
- 최종 확대 후 `node --check ext/mod.js`, manifest JSON 검사 통과.
