---
record_schema: 1
id: claim-latency-physics-review-20260925
kind: claim
status: draft
as_of: 2026-09-25
checked_at: 2026-09-25
evidence_refs:
  - path: .workspace/sources/latency-review-evidence-20260925.md
    hash: d6a9634d7227da64401810d1d63681ba74bad2a0f1a33f6136d62c728c64845a
    locator: 재계산 JSON / toy_wall_geometry
    quote: '"required_gap_at_latency_100ms": 62.8401752711079'
  - path: .workspace/sources/latency-review-evidence-20260925.md
    hash: d6a9634d7227da64401810d1d63681ba74bad2a0f1a33f6136d62c728c64845a
    locator: run_live.py 136–152
    quote: s = unpack(raw); s['t'] = tick-start
  - path: .workspace/sources/latency-review-evidence-20260925.md
    hash: d6a9634d7227da64401810d1d63681ba74bad2a0f1a33f6136d62c728c64845a
    locator: pilot.py 178–190
    quote: "for w in ((0., omega) if abs(omega) > .5 else (0.,)):"
dependency_hashes: {}
revision: 5cbf95e6-7903-49de-87eb-99e1bc69b489
---

# P18 설명 검증 — 지연 추정·물리적 회피·페이지 제어

사용자 요청: 붙여준 Claude 설명과 수치·새 설계에 대한 검토 의견.
보고서: research/claude_latency_review_20260925.md.
재현: research/verify_latency_claims_20260925.py 및 같은 이름 JSON.
draft는 종합 권고 미채택을 뜻한다. 아래 재계산을 미실행했다는 의미는 아니다.

## 직접 확인

- 읽을 수 있는 P18 8판에 원래 방향 일치율 방법을 적용하면 평균 최고점 90ms(94.24%), 다음 60ms(94.02%). 판별 최고점은 6판 90ms, 2판 60ms. 173418은 EOFError로 제외.
- 상태 t는 관측 요청 전 루프 시작 시각. 실제 명령 작성·전송 시각과 다르다. 지속 회전의 상관과 60ms 차분 구간이 포함되므로 이 최고점을 명령 적용 지연의 직접 측정값 또는 서버 지연으로 단정할 수 없다.
- 8판 obs_to_cmd의 판별 p50 범위 33.7~46.5ms, p95 54.6~102ms. 전체 틱을 합친 분위수가 아니다.
- 단순 정면 정지 벽 모델(v=180px/s, ω=230°/s)에서 필요한 여유 vτ+v/ω는 τ100ms에 62.84px, τ70ms에 57.44px. 여유60px이면 30ms 단축으로 충돌 여부가 바뀐다. 실전 사망 구제 증명은 아니다.
- P18은 현재 회전+부스트 경로를 포함하며, 안전 후보를 거른 뒤 먹이 등 점수로 고르는 구조도 이미 있다. 빠진 미래 회전 변화와 모델 오차를 구분해야 한다.
- P18b 183915는 마지막 emergency 연속 구간 약0.116초지만 2초 전부터 evade/threat0.71 기록. 마지막 비상 구간을 최초 위험 인지 시점으로 간주하면 안 된다.
- 이전 버전의 명령 검사·코일 모델 수정은 P18에 반영돼 있다. 이전 보고서를 현 버전의 미수정 결함 목록으로 쓰지 않는다.

## 의견 — 미채택

브라우저 안의 제어와 상대 미래 기동 고려는 유효한 방향이다. 5ms 보장·모든 지연 튐 제거·수십 ms는 무의미·50px면 무조건 회피 불가라는 단정은 근거가 부족하다. 같은 시간 기준의 계측과 단일 최종 명령 작성자를 우선하고, 로컬에서 지연 효과와 정책 효과를 분리해 검증할 것을 권고한다.

운영 코드 수정·실사이트 시작/중단 없음. 실제 서버 적용 지연, 정확한 사망 원인 및 회피 불가능 시점, JavaScript 구현의 성능, Codex 취소 원인은 미확인이다.
