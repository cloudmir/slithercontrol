---
record_schema: 1
id: fact-mod-live-check-20260926
kind: fact
status: confirmed
as_of: 2026-09-26
depends_on:
  - decision-mod-extension-20260926
dependency_hashes:
  decision-mod-extension-20260926: 93be9c7e3ad454ed3b25da7d7460e86ad27eba48caeecc6b1878e8f36cbf6058
revision: 138f1655-b716-4d40-a6f6-334026bc9ece
---

# MOD 실사이트 1판 동작 확인 (2026-09-26 16:36, ext 0926-c22bfc56)

목적: 확장이 실제 게임에서 끝까지 동작하는지(성능 측정 아님). 기록: runs/mod_live_20260926_163618/ (summary.json, record.json, status.jsonl, 스크린샷 19장). 스크립트 research/mod_live_check.py.

측정 사실:
- 확장 로드: \\wsl.localhost\Ubuntu\...\슬리더\ext, ENABLED, 오류 0. Worker 사용. slither.io → slither.com/io 이동.
- 217초, 판단 4,999회, 판단 오류 0, 페이지 오류 0. 마지막은 emergency 모드에서 사망.
- 최대 길이 6022(화면 “Your length: 5068, rank 16 of 517” at 약 190초로 확인).
- 판단 시간 p50 20.2ms, p95 46.2ms(성공 기준 p95 < 33ms 미달). 관측→명령 p50 25.2, p95 56.3ms. 게임 FPS 약 25(화면 3842×1925).
- 모드: feed 3704, evade 932, unwrap 155, escape 111, emergency 97.
- 판 도중 사용자가 슬라이더 22회 조정(59.6~182.6초), 기록 changes에 시각과 함께 남음. 최종 차이: SAFE 10→24, REMAINS 12→20, W_FOOD 2→10, W_GOAL 40→150, BOOST_COST −10→−25, W_RUN 40→96, W_ESC 0→68, W_CUT 60→95, W_WRAP 100→169, W_BIG 0→45, W_PAR 0→21, LONG_RATIO 1.5→2.1, W_CROWD 60→90, W_HUNT 40→72, W_THREAD 40→75.
- 판 기록 자동 다운로드: Playwright 연결 중에는 저장되지 않음(가로챔). Playwright 없이 같은 방식 다운로드는 D:\slither\records에 저장됨을 확인. 이번 판 기록은 스크립트가 runs/에 저장.

해석 주의: 1판이며 설정이 판 도중 바뀌었으므로 성능 비교 근거가 아니다.
