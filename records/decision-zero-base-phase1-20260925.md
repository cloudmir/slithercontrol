---
record_schema: 1
id: decision-zero-base-phase1-20260925
kind: decision
status: adopted
as_of: 2026-09-25
dependency_hashes: {}
revision: b051e237-3c11-4b37-b2ee-6bfb6ffdafcd
---

# 제로 베이스 재설계 착수 — 1단계 측정 (사용자 "그래 한번 진행해봐")

근거: fact-user-zero-base-plan-20260925(사용자 4축 요구). 제안한 4단계에 대한 승인이다.
- 1단계: 측정.
- 2단계: 페이지 내 제어로 지연 단축.
- 3단계: 전체 맵 판단, 공격 인지, 부스트 규칙.
- 4단계: 먹이 효율.

1단계 구현:
- measure.py: 페이지 안에 기록기(MEASURE_JS)를 넣는다. 16ms마다 모든 지렁이를 확인한다.
  - 사망 이벤트: 클라이언트가 서버의 kill 메시지를 받아 o.dead=true가 되는 순간(research/game.js의 is_kill 처리)을 잡는다.
    - 희생자 머리 위치와 사망 직전 12프레임을 기록한다.
    - 500px 안 다른 모든 지렁이에 대해 몸 폴리라인까지 거리, 머리 거리, 굵기를 기록한다.
  - 100ms마다 모든 지렁이의 위치·각도·sp·sc를 샘플링한다.
  - 분석(`measure.py main`): 굵기비별 사망 시 drawn 간격 분포, 크기별 실측 px/s·sp 필드·회전 속도.
- live_staged.py에 --measure 옵션을 추가했다. 30틱마다 수거하고, 판 끝에 shot_dir/measure.json.gz로 저장한다.
- live_batch.sh:
  - 추가 인자를 전달한다.
  - Esc로 끝난 판이면 연속 실행을 중단한다(Codex 지적 반영).
- 모의 페이지(Windows Chrome) 검사에서 사망 1건과 속도 표본 37건을 수집했다.

실행: pocket3 조종으로 실서버 3판을 측정한다(2026-09-25). 조종기는 측정용 운전이며 성능 비교 대상이 아니다.

아직 안 한 것: 우리 쪽 명령 → 서버 반영 지연 측정(2단계에서 다룸).
