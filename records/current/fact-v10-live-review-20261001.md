---
record_schema: 1
id: fact-v10-live-review-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-live-review-source-20261001.md
    hash: d9ebbc0b25693be514aec3fa5ed74d911cefffdcb6db67c045eb3b90dddb1a69
    locator: Derived log observations; ext/mod.js 636–640; ext/pilot.js 2153–2163, 2231
dependency_hashes: {}
revision: 75b720ec-686c-437a-a546-1c1e39f28508
---
# V10 최근 실게임 — 근접 명령 만료와 탐색 시간 초과

사용자 관찰: “직각으로 그냥 박아서 죽는 경우가 많은데” 및 근접 회피·탈출로 탐색 동작에 의문. 빈도가 많다는 진술을 전체 실험 결과로 확정하지 않는다.

읽기 전용으로 기존 브라우저의 마지막 완료 판을 확보. 빌드1001-9654ed9d, 58.9초, 1539판단, 오류0. 판단시간 p95 3.3ms, 관측→명령 p95 14.1ms. 원본 및 재현 분석: research/v10_review_20261001/page_0.json, page_0_box.json.gz, page_0_log.json.gz, review.py, analysis.json. 코드·로그 해시는 연결 원문에 보존.

확인:
- 마지막 프레임들(58.547–58.809초)에서 실제 명령 why=v10_expired가 반복된다. 58.582초 희망 회피각3.65537rad 대신 실제4.03371rad(현재 머리 방향)가 적용된다. ext/mod.js track은 만료 시 applyCmd(s.ang,false)를 호출한다. 충돌을 예측해 짧아진 계획이 만료되면 현재 방향 유지로 되돌아가는 결함이다.
- 마지막 살아 있는 프레임의 머리 방향과 가장 가까운 적 몸통 선분 각도 차이는91.112도다. 서버 충돌 순간 좌표나 다른 명령을 냈다면 생존했을지는 미확인.
- 탐색 결과 reason=budget인 판단 프레임291/1539(18.9%). 같은 Worker 결과를 재사용한 프레임을 포함하며 독립 탐색291회라는 뜻이 아니다. 탐색 시간 초과는 실제 출구 부재의 증거가 아니다.

이번 작업은 진단 및 근거 보존이다. 제품 코드 수정·새 빌드·배포·새 실게임은 수행하지 않았다. 전체 사망 원인 및 생존 개선은 이번 한 판으로 확정하지 않는다.
