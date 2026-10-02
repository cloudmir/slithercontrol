---
record_schema: 1
id: decision-loop-timer60-default-20260926
kind: decision
status: adopted
as_of: 2026-09-26
depends_on:
  - fact-gfx-bench-20260926
dependency_hashes:
  fact-gfx-bench-20260926: 5612b95d7c7b78b76a257fe823d6775dde3af70bcf87e03847fe4fc29ce2be5e
revision: cc2dfe96-570e-4359-947e-6df18d40c6c8
---

# 게임 루프 타이머 60을 기본값으로 (ext 0926-a91e61a8)

사용자(2026-09-26): "1번만 하자" — 제안 1(게임 루프 타이머 60 기본값화)만 채택. 서버 핑 측정·자동 선택(제안 2)과 화면 FPS 환경 시험(제안 3)은 하지 않음.

근거: fact-gfx-bench-20260926. 루프 25/s에서 봇 명령 전송도 25/s 이하(game.js가 조향·부스트를 oef 안에서 전송). 1단계 + 타이머 60에서 루프 62/s, Chrome CPU 변화 없음(116% vs 117%).

구현(ext/mod.js): S.gfx.hz 기본 60. 이전에 저장된 설정도 한 번만 60으로 바꿈(S.hz60 표시). 이후 사용자가 고른 값은 유지. 선택지 이름 "타이머 60/s (기본)", "화면 갱신 (게임 원래)". mock 검사 통과.
