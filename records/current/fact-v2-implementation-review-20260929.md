---
record_schema: 1
id: fact-v2-implementation-review-20260929
kind: fact
status: confirmed
as_of: 2026-09-29
depends_on:
  - decision-v2-goal-20260928
dependency_hashes:
  decision-v2-goal-20260928: 1d282b51c5a8fde4364c7f1cf7164cb9e91e65e5a026b25e190d36ed41f20120
revision: 6e73ac6b-a93b-4db4-a3b4-20260929a003
evidence_refs:
  - research/V2_IMPLEMENTATION_REVIEW_20260929.md
  - ext/pilot.js
  - ext/mod.js
  - params.json
  - ext/params.js
  - runs/v2live_20260928_224851
  - runs/v2live2_20260929_074651
---
# V2 최근 구현 감사 — 목표 미충족

2026-09-29 현재 V2는 별도 `V2_ON → v2Step` 경로와 5초 TTD 후보 평가를 구현했으나 사용자 목표를 완료하지 못했다.

직접 확인된 주요 결함:
- V2가 기존 `LAT`, `REACH`, 두께·경계 보정, `REMAINS`, `EAT`, `TURN_FIX`를 읽어 “다른 파라미터 전부 무시”가 아니다.
- 관측기는 몸 좌표를 머리 반경 1150px로 잘라 긴 적의 전체 몸을 넘기지 않는다.
- 48개 정해진 기동을 평가할 뿐 여러 적의 미래 몸 점유를 재귀 탐색하지 않는다. 좁아지는 통로의 일반 해법이 아니다.
- V2 실게임 17판 모두 기존 `REMAINS=20`을 물려받아 크기 14~16 사체를 제외했다. 사체 무더기 목표 로그는 0틱이므로 사체 선점 목표는 시험조차 되지 않았다.
- 현재 `pilot.js`·`params.json`과 배포 `params.js`·manifest가 불일치한다. 현재 소스 기대 빌드는 `0929-747b3516`, 배포 표시는 `0929-0da43da4`이며 배포 파라미터에는 새 `V2_CHGR`가 없다.
- 수정 1~3 실게임은 7판 모두 사망했고 7판에서 비정상 종료됐다. 현재 추가 소스는 실게임 검증 전이다.

정량 반례와 수정 순서는 `research/V2_IMPLEMENTATION_REVIEW_20260929.md`에 기록했다. 새 실사이트 실행은 하지 않았다.
