---
record_schema: 1
id: decision-regular-chrome-repeat-20260923
kind: decision
status: adopted
as_of: 2026-09-23
dependency_hashes: {}
revision: e2062338-39bc-4e38-b014-d7dba27cb146
---
# 일반 Chrome 추가 1판 요청

사용자 직접 지시: "또 띄워봐."

직전 일반 Chrome 실사이트 테스트의 반복 요청으로 해석하여 동일 v5로 1판 더 실행한다. 기록상 6회 이후 추가 1회 예외로 해석하고 사용자에게 알렸다. 기본 일일 한도는 변경하지 않는다. 최대 600초, 화면 표시 브라우저 하나, 사망·오류·Esc 시 종료, 자동 재시도 없음. 직전 종료 뒤 30~90초 무작위 최소 간격을 확인한다. 별도 학습 중인 PPO로 교체하지 않는다.
