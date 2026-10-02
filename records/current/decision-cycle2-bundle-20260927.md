---
record_schema: 1
id: decision-cycle2-bundle-20260927
kind: decision
status: adopted
as_of: 2026-09-27
depends_on:
  - fact-deep-analysis-20260927
  - decision-cycle1-wrap-20260927
dependency_hashes:
  fact-deep-analysis-20260927: 30ac004412adf9b7b228fc417edc0b981334a2242f175b1d40269877a59f55f5
  decision-cycle1-wrap-20260927: 52459c50b393c14eadcab66b3021967b041f6757c8ab3b206b9b327cb8f72657
revision: 8f3ce8cf-fe8b-4c6b-910e-3295a4874042
---

# 사이클 2 — 개선 8개 묶음 구현·실게임 A/B (ext 0927-10901a5d)

사용자(2026-09-27): "개선 포인트를 너가 직접 수정해, 모두 수정한후 실제 브라우저를 통해서 모든 항목을 한번에 체크하자". ask_user 답: 병행 세션 ext 수정 끝남 / A(현재 값, 전부 끔)·B(전부 켬) 교대 20판 OK / 큰 상태 값 제안대로 / 로컬 검사 후 바로 실브라우저.
사용자 선택: 항목별 분리 없이 묶음 효과만 판정(어느 항목이 효과를 냈는지는 분리되지 않음을 알고 진행).

구현(ext/pilot.js, 옵션 기본 모두 끔, params.json UI 그룹 "개선 2026-09-27"): TURN_FIX(회전율 실측 보간 [1,1.5,2,2.5,3,3.5]→[230,215,176,147,126,110]), RAIDER_ON(우리보다 얇고 부스트 중·900px·접근 머리를 공격자로, 기존 강도 보존), SIZE_SAFE(SAFE·SAFE_HEADS·TIGHT × max(1, sc/2)), SIZE_GATE(사냥·군중 × clip((3−sc)/1.5)), HEAD_RAYS(부스트/raider 머리의 5초 직진 점열을 앞길 광선에서 몸으로, 상자 검사), WRAP_RAID(감는 머리 부스트·400px·덮개 ≥ .35에서 탈출, raid 발동에만 대상 잠금 wrapTarget: 머리 부스트·400px·덮개 ≥ .2 유지, 0.5초 후 해제, 대상 바뀌면 escLock 초기화), WRAP_EXIT_TAIL(감는 머리가 부스트 중일 때 출구를 그 진행 반대쪽으로), MODE_DWELL(사라진 away·run·wrap 점수 항을 0.6초 선형 감쇠 유지, 모드·danger 판정은 불변), BOOST_DANGER(위험 중 부스트 비용 하한 min(BOOST_DANGER, BOOST_COST)), HEAP_GATE(공격형도 경쟁자가 부스트 중이거나 sc ≥ 2.5이면·위협 시 잔해 부스트 안 함), SIZE_PROFILE/SIZE_SC 2.3(step 안에서 sc 2.0~2.6 보간으로 BIG {SAFE 18, SAFE_HEADS 30, W_CROWD 0, W_HUNT 0, W_GOAL 60, LONG_SAFE 28, BOOST_COST 54}), RIVAL_R 700(잔해로 향하는 머리도 경쟁자). ext/mod.js: 블랙박스 60초, 로그 키 goal/nh/eat/pred(0.48초 전 선택 경로 예측 위치 오차)/sized/raid. ext/test/replay.mjs 3번째 인자 값 오버라이드.

로컬 검사: 전부 끔 재생(research/mod_parity_states.json 900틱) 변경 전과 명령·부스트·모드 완전 일치. 전부 켬 재생 오류 0, 감김풀기 165틱(기준 148; WRAP_RAID 1차 안 0.25·500px는 647로 과발동 → 0.35·400px로 조임), 회피 486(RAIDER_ON), Node p95 69 ms(병렬 실행 영향, 브라우저는 실측). mock_check MOCK OK. Codex 읽기 전용 검토 1회: 필수 2건(wrapTarget raid 한정·escLock 순서·EXIT_TAIL 부스트 조건, setParams Psized 무효화) 반영, BIG에 BOOST_COST 54 추가, HEAP_GATE를 보고서 P6 조건부로. 미구현: P5의 SIDE_HOLD 연장·flip 억제.

실행: research/mod_deaths_live.py 20 cycle2 … research/cycle2_arms.json (A 먼저 교대, setsid nohup, 로그 runs/cycle2_live.log). 팔 B = 위 옵션 전부 켬(MODE_DWELL .6, BOOST_DANGER 10, RIVAL_R 700).
판정 지표(20판은 방향 확인용): 순성장 L/분(성장 − 부스트 중 손실), 10분당 사망(방향), 감김 사망/10분(deaths.py wrapped), pred 오차 중앙값(sc ≥ 2), 판단 시간 p95(목표 35 ms), 감김풀기 시간 비율(≤ 15%), 부스트 시간. 분석: research/ab_report.mjs + research/deep_20260927/analyze.py.
