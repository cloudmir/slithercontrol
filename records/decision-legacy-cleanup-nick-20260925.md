---
record_schema: 1
id: decision-legacy-cleanup-nick-20260925
kind: decision
status: adopted
as_of: 2026-09-25
dependency_hashes: {}
revision: 68391c29-b9e4-4fe8-ba6d-ce0db510de5f
---

# 기존 로직 정리 · 닉네임 단순화 (2026-09-25)

사용자:
- "기존 로직들은 지우는것이 좋을것 같은데? 계속 뱅뱅 도는것이나 -> 쓸모 없음"
- "그리고 ID는 그냥 simple하게 만들어봐."

결정:
- 새 제로 베이스 제어기에는 원 돌기(coil)·몸 따라 돌기 같은 기존 로직을 넣지 않는다.
- 기존 제어기 파일(staged·pocket~pocket13 계열, 시뮬레이터 전용 평가 등)은 삭제하지 않고 legacy/ 폴더로 옮긴다.
  - 이유: git 저장소가 아니라 삭제하면 복구할 수 없다. 보관이 사용자 의도(작업 대상에서 제외)를 충족한다고 판단했다.
  - 시점: 진행 중인 측정 연속 실행(pocket3 운전, --measure 3판)이 끝난 뒤. pocket3이 이 파일들을 import하기 때문이다.
- 닉네임: 기존 i/l 무작위 20자를 짧은 단어 + 두 자리 숫자로 바꾼다(예: momo37). bot/ai가 들어간 이름은 금지를 유지한다.
  - live_staged.py nickname(), test_live_staged.py 반영, 테스트 통과.
  - 이미 시작된 판에는 적용되지 않는다.
