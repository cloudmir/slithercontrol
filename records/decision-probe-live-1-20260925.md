---
record_schema: 1
id: decision-probe-live-1-20260925
kind: decision
status: adopted
as_of: 2026-09-25
dependency_hashes: {}
revision: c2c503ac-002d-448b-845a-e0268d4a84eb
---

# 탐침 실서버 1판 — 목적·기준 (사용자 "다음 진행")

목적(하나): 적 몸 옆을 따라가며 간격을 좁혀, 그 판에서 붙은 한 두께 조합(우리 r, 적 r)의 사망 drawn 간격 한 점을 확정한다.

켜는 것:
- probe.py(탐침 조종).
- run_live.py 기본 기록: 블랙박스(사망 원인 확인), 마지막 스크린샷, 탐침 추적 로그.
- --measure는 끈다.

합격 기준:
- 사망 직전 follow 상태에서 |목표 간격 − 실제 간격| ≤ 3px.
- 블랙박스상 사망 순간 가장 가까운 몸의 주인(sid)이 탐침 대상이다.
- 둘 다 만족할 때만 그 판의 사망 간격을 측정값으로 인정한다. 아니면 버리고 원인만 기록한다.

준비:
- 기존 코드 68개 파일을 legacy/로 이동(decision-legacy-cleanup-nick-20260925). 작업 폴더에는 run_live.py, probe.py, measure.py, blackbox.py, win_chrome.py만 남겼다.
- probe.py 자체 검사: 추적 오차 p90 1.7px, 20초 동안 목표 간격 +16 → −18px.
- 모의 페이지 검사: 관측·대상 선택·명령 정상.
