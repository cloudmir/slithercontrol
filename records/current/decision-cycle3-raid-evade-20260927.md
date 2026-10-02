---
record_schema: 1
id: decision-cycle3-raid-evade-20260927
kind: decision
status: adopted
as_of: 2026-09-27
depends_on:
  - fact-cycle2-ab-20260927
  - decision-cycle2-bundle-20260927
dependency_hashes:
  fact-cycle2-ab-20260927: 2bd93d7cb563a235da711398b324f14bbe4e97d3bc04b0596042c5beb6380533
  decision-cycle2-bundle-20260927: b7cf4786874559c96c0e0a4e7b078c5cb26f8af50b51d6cb911108af0f696155
revision: 6724b23c-4a45-4bcc-a24b-66713204b1ac
---

# 사이클 3 — raider 감지 후 회피 실행 (RAID_EVADE), 이전 튜닝 보호 (ext 0927-8394512d)

사용자(2026-09-27): "다음 개선점은?" → 제안 후 "그래 그럼 진행을 하는데, 수정으로 인하여 이전 튜닝된것들이 성능이 나빠지지 않게 진행해".

목적 선택 근거(fact-cycle2-ab-20260927 B 팔 사망 7건 분석): 5건은 사망 전 10초 안에 raider(우리보다 얇고 부스트 중인 접근 머리)를 감지(감지 비율 46~95%)하고도 죽었고 그중 4건은 마지막 2초가 비상 모드. 사용자 값에서 공격자 회피 끌림은 W_AWAY 1·W_RUN 14로 W_GOAL 133·W_CUT 59에 묻힘. 마지막 10초 예측 오차 중앙값 17~29 px(여유 SAFE 10·SAFE_HEADS 18과 같은 크기).

구현(ext/pilot.js, 옵션 기본 끔):
- RAID_EVADE/RAID_R 600/W_RAID 60: 감김 탈출 중이 아닐 때 RAID_R 안 가장 가까운 raider의 0.5초 후 위치에서 멀어지는 방향 raidDir에 W_RAID×level(거리 선형 0.3~1) 끌림, 그 방향(cos > .5) 부스트 후보에 절반 가점. 경로 먹이·잔해 목표 끌림은 (1−level)로 감쇠(0 아님, Codex), 잔해 부스트 보너스는 게이트. raider가 사라지면 MODE_DWELL 동안 감쇠 유지(경계 반전 방지). 비상 모드(안전 후보 0)의 선택식 e에는 영향 없음.
- ADAPT_SAFE/ADAPT_MAX 25(구현만, 이번 팔에서는 끔): mod.js가 0.48초 전 선택 경로의 예측 위치 오차 pred를 s.pred로 전달(명령 방향 15° 이상·부스트 상태가 바뀐 구간은 제외 → 모델 오차만), 파일럿 EMA(0.15) predErr를 여유 thr에 min(ADAPT_MAX, ADAPT_SAFE×predErr) 가산. Codex: 명령 변경 오차가 섞이면 여유↑→후보↓→비상↑ 악순환 가능 → 이번 사이클에서 분리.
- 트레이스·로그 키 adapt, revade 추가.

이전 튜닝 보호: A 팔 = 사이클 2 B(8개 옵션 켬) 그대로, B 팔 = A + RAID_EVADE만. 재생(research/mod_parity_states.json 900틱): A 팔 결과가 사이클 2 B 재생과 완전 일치(0 차이). B: 130틱 변화, revade 422틱, 오류 0, Node p95 43 ms. mock OK. Codex 읽기 전용 검토 1회: 필수 3건(ADAPT 분리·명령 변경 오차 제외, 끌림 0 대신 감쇠, 상한 900·상한 판 사망 제외·서버 확인) 반영.

실행: SLP_MAX_S=900 research/mod_deaths_live.py 14 cycle3 … research/cycle3_arms.json (A 먼저 교대, setsid nohup, 로그 runs/cycle3_live.log). 확장 서버 설정 181.41.140.170:475(접속자 ac 292); 각 판 기록의 server로 확인.
판정 지표: 주 = raider 감지 에피소드(revade 또는 raid > 0 구간) 중 10초 안 사망 건수/에피소드 수, 노출 시간당 사망률, 비상 모드 진입 비율·안전 후보 0 비율. 보호 = 시간 가중 순성장, 사망/10분(A 대비 악화 없음), 부스트 시간. 상한 도달 판은 사망이 아님(ab_report capped; mod_deaths.py 보고서는 상한 판도 death로 변환하므로 그 수는 그대로 쓰지 않음). 14판은 방향 확인용.
