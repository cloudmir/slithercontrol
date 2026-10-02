---
record_schema: 1
id: fact-v10-continuation-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-continuation-20261001.md
    hash: c9192e9593f358be84447432fbb59102e1940a3bfe5d7868f8d1ebafed7d93b7
    locator: summary 및 코드 diff
dependency_hashes: {}
revision: d6976340-afdf-44e1-95f9-82388a1c285e
---
# V10 출구까지 실제 주행 검증·추종 연결 — 로컬 구현

사용자 요청: 실시간 탈출 경로를 미리 찾고 그 범위에서 움직일 것. 추가 질문: “미구현 부분도 중요한 부분 아냐? 왜 안만든거지?” 사용자 요구와 질문으로 기록한다.

빌드 1001-8385d1b4. ext/pilot.js v10Geometry의 정적 지도 안내선에 v10Follow를 연결했다. 명령 지연 후 위치부터 실제 회전·속도·부스트 변화 및 몸통/예측 머리 충돌을 검사하여 목표 도달과 이후 0.6초 진행을 통과한 경로만 반환한다. planner와 fast controller가 같은 추종 함수를 사용하며, fast controller는 현재 관측으로 남은 경로를 재검증한 뒤 그 첫 명령을 실행한다. 유효한 출구는 유지하고 신규 장애물·기한 초과·목표 완료 시 재탐색한다. 실패한 장기 경로는 검증 경로로 표시하지 않으며 기존 단기 비상 회피로 내려간다. params.json 조정 없음, 이전 제어기 함수 불변 검사 통과.

검증 원문: research/v10_continuation_20261001/summary.json 및 changes.diff. 신규 계약 검사 8/8, 기존 계약 5/5. 실제 tracker를 넣은 지연 포함 모의 주행 10/10에서 충돌 없이 시작점 기준 1450px 도달(두께별 좁은 틈 6, 정면 벽, U자, 기습 머리, 맵 경계). 이는 합성 모델 결과이다. 실제 3 Worker 모의 브라우저에서 오류 0, 모드 전환·저장·만료 부스트 해제 확인. 단순 먹이 장면 30표본 경로 추종 30, local p95 0.4ms이며 혼잡 실게임 3ms 충족 근거는 아니다.

실게임 원본 runs/v10_diagnostic5_20261001_110437/의 마지막 5초에서 추출한 191프레임 재생: 장기 경로 추종 21, queued prefix 위험 14, 신규 명령 즉시 만료 0, local p95 4.13ms. 고정 관측·기록 명령에 새 거시 계획을 동기 계산한 재생으로 실제 생존 개선은 입증하지 않는다. 1·4판 재생에서는 장기 경로 미확보. 출구 탐색 충분성 및 혼잡 성능은 미해결이다.

이번 변경의 실게임 추가 실행 0, 실제 게임 브라우저 배포 안 함. 실전 합격/완료 선언 아님. 원본 보존 research/v10_continuation_20261001/before/. 코드 해시와 검증 출력은 summary.json. 관측 범위와 적 이동 예측 모델에 한정된 검증이며 상대 의도 변화에 대한 보장은 아니다.
