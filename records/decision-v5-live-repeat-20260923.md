---
record_schema: 1
id: decision-v5-live-repeat-20260923
kind: decision
status: adopted
as_of: 2026-09-23
depends_on:
  - decision-v5-live-once-20260923
dependency_hashes:
  decision-v5-live-once-20260923: b3950d2a59ec03d5f89701dbeb46b6103eff73783854105ea06b20edcded0d62
revision: c5ec2c83-77fc-4806-9d4e-4d38cb6f0386
---
# v5 실사이트 추가 1판 승인

사용자는 직전 실사이트 사망 직후 "다시 해봐"라고 지시했다. 동일 active v5와 동일 live_active.py 연결로 실사이트 추가 1판을 승인한 것으로 해석한다. 최대 600초, 화면 표시 브라우저 하나, 사망·오류·Esc·시간 제한 시 종료한다. 현 실행 로그 기준 기존 4판에 이어 5번째이자 오늘 한도의 마지막 판이다. 과거 탐색 이력이 모두 집계됐다는 뜻은 아니다. 재접속을 자동 반복하지 않는다. 직전 판 종료 후 30~90초 무작위 간격을 충족하도록 확인한 뒤 실행한다. 새 PPO 모델로 교체하거나 정책을 수정한 재시험이 아니다.
