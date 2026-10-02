---
record_schema: 1
id: decision-staged-controller-start-20260924
kind: decision
status: adopted
as_of: 2026-09-24
checked_at: 2026-09-24
depends_on:
  - decision-new-algorithm-20260924
  - decision-active-survival-targets-20260923
dependency_hashes:
  decision-new-algorithm-20260924: aa5faea960806efdfde054b5b4e997392035cecbce32ca6296dc898ed97e10ed
  decision-active-survival-targets-20260923: 797afbfaed96e380f0e463defb3b32d4537a3c87996a1181473bf35dc5a260ac
revision: 7ddde9cc-b246-4a42-90ea-3779150188ec
---
# 공개 알고리즘 참고·단순한 단계부터 로컬 개발 승인

사용자: "그래 그럼 위의 알고리즘들에서 참고할 부분들을 참고하여 개발해보자, 우선은 가장 단순한 -> 복잡한 순으로 적용하면서 생존률을 올려보자"

공개 구현 조사에 이어 새 독립 알고리즘의 단계적 구현과 로컬 비교를 승인했다. 순서는 방향 구간별 충돌 회피·먹이 수집 → 상대 이동 예측·포위 탈출 → 자기 몸을 활용한 고리/몸체 추종이다. 단계마다 앞 단계와 비교하고 개선되지 않은 복잡성은 기본값으로 채택하지 않는다. 기존 제어기·모델·시뮬레이터 소스와 활동 평가 기준을 보존한다. 물리 상수와 관측·평가 인터페이스는 재사용한다. 실사이트 실행 및 기존 프로세스 중단은 승인 범위 밖이다.

개발 시드에서 실패를 분석하고 별도의 동결 평가에서 첫 생명 600초 생존·활동 준수·성장을 기록한다. 관측 비율과 신뢰구간을 구분하며 미달이면 미달로 보고한다. 앞선 자체 다단계 탐색 제안은 미채택 상태를 유지한다.
