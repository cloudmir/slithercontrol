---
record_schema: 1
id: decision-death-stats-20-20260925
kind: decision
status: adopted
as_of: 2026-09-25
dependency_hashes: {}
---

# 사망 사례 통계용 실서버 20판 (사용자 지시 2026-09-25)

사용자: "좀더 돌려보고 데이터를 수집해서 분석하자 20판만 돌려보고 죽는 케이스를 통계를 내고 분석해서 해를 찾아"

- 목적: 사망 원인 분류 통계 하나. 해법은 통계의 최다 원인부터 찾는다.
- 제어기: pilot.py P8 버전 그대로. 20판 동안 코드를 바꾸지 않는다(표본이 섞이지 않게).
- 기록: 블랙박스(마지막 30초로 늘림: 감기기 시작 시점 분석용. 첫 시작분 1판은 8초 상자라 중단·제외), 판 trace, 스크린샷. --measure는 쓰지 않는다.
- 명령: `.venv/bin/python run_live.py pilot:Pilot --games 20` (오류가 나면 중단, 재접속 없음)
- 분류기: deaths.py(판 기록 → 사망 원인 범주). 판이 도는 동안 만들고, P1~P8 기존 판으로 먼저 검증한다.
