---
record_schema: 1
id: decision-live-data-aggressive-20260925
kind: decision
status: adopted
as_of: 2026-09-25
dependency_hashes: {}
---

# 실제 브라우저로 자료 수집 — 공격형 설정 (사용자 지시 2026-09-25)

사용자:
- "시뮬레이터로 자료를 모아보자." → 이어서 "아니다 실제 브라우저로 자료를 모아보자.."
- 앞선 지시 3.a: 위험은 높이지만 정밀성 튜닝용 데이터를 모으는 쪽으로 설정한다.

실행:
- 목적: 근접(위험) 상황의 정밀 조작 데이터 수집(P10 코드, PILOT_MODE=aggressive).
  - 생존 성능 판정용이 아니다.
  - 수집 항목: trace(clear/hard/thr/curl/wrap/모드), 30초 블랙박스, 스크린샷.
- 명령: `PILOT_MODE=aggressive .venv/bin/python run_live.py pilot:Pilot --games 10`
- 조건: 브라우저 1개. 오류 시 재접속 없이 중단한다.
- 사후 판정 항목:
  - 근접 구간(실제 간격 < 30px) 틱 수와 그 안의 사망 여부.
  - 제자리 맴돎·말림(curl) 빈도.
  - 긴 지렁이 병행, 외곽 체류.
