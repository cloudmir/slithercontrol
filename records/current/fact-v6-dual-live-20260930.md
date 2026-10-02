---
record_schema: 1
id: fact-v6-dual-live-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---
# V6 분리 표시 실게임 1판 — 시간 상한 종료

사용자 지시: “테스트 1판 돌려봐”. 원본 runs/v6dual_20260930_124604/summary.json, slp_01.json, slp_01_log.json.gz, slp_01_box.json.gz. 빌드 0930-984f4809 (코드는 research/v6_food_before_20260930/에 보존).

측정: 기록 길이 628.8초, 600초 수집 상한 종료(capped=true), 사망 판 아님. 최대 길이 977, 최고 순위 50. 판단 오류 0, 페이지 오류 0, 판단 p95 1.9ms, 관측→명령 p95 3.6ms. 모드 guide 7911 / partial 10710 / avoid 355 / local 16틱. 설정 모드 복원 완료. 서버 15.204.213.229:444.

실제 표시 확인: watch.jsonl과 display_00/02/06/12.png. 미로 점선과 근접 실선 동시 표시. 사용자 관찰: 적이 없는데 부분/출구 및 회피 표시가 반복됨. 코드 확인(ext/pilot.js v6Route, ext/mod.js overlay): 위협 유무와 관계없이 1000px 도달을 출구로 분류했고, 근접선은 항상 회피로 이름 붙임. 사용자 관찰은 별도의 진술이며 실제 적 부재 전체 구간을 검증한 것은 아님.

추종: tracking.txt, +0.25초 위치 오차 p50 4.5 / p95 10.1px, 방향 오차 p95 6.7°. 1판이며 생존 개선 증명 아님. 자동 사망 분석은 기존 V6 goal=null과 호환되지 않으며, 상한 종료를 사망으로 해석하지 않는다.
