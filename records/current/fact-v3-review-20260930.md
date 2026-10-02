---
record_schema: 1
id: fact-v3-review-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
dependency_hashes: {}
revision: 4ff17159-0412-46cb-8814-6023647e9144
---
# V3 현재 구현 검토

대상: `ext/pilot.js` 빌드 `0930-52463df5`, `params.json`, `runs/observe_20260930_074500`.

- 이전의 안전한 고리 경로를 출구로 오인한 결함은 수정됐다. 현재는 단기 안전(`v3_local`)과 900px 경계 통과 출구 인증(`v3_cert`)을 구분한다.
- 최신 1판 3,299틱에서 출구 인증은 39틱(1.2%), `local_only`는 3,137틱(95.1%)이었다. 현재 V3는 대부분 국지 회피로 작동하며 다중 회전 미로를 푸는 연결 공간 탐색기는 아니다. 정밀 탐색은 0.9초이고 이후는 직진·좌/우 일정 곡률 3개 경로만 5초 평가한다.
- 예산 초과이면서 탐색 미완료인 31틱 중 직전 검증 명령 유지(`v3hold`)는 1틱뿐이었다. 코드가 점수 후보가 하나도 없을 때만 유지하므로, 설계의 “예산 초과 시 직전 검증 명령 유지”와 다르다.
- V3 trace 생성부의 `eat` 뒤 한 줄 주석 때문에 `goal`, `thread`, `cov`, `esc`, `L`, `sc`, `died_near`, `kills` 필드가 실제 객체에서 빠져 있다.
- 최신 실게임 표본은 1판(194.7초, 최대 L 129)뿐이므로 성능 우위는 판단할 수 없다. 판단시간 p95는 약 23ms로 25ms 목표 안이다.

검증: `node --check ext/pilot.js`, `node --check ext/mod.js`, `python3 -m json.tool params.json` 통과. `research/v3_frame.mjs`로 최신 로그 4프레임 재생 완료.
