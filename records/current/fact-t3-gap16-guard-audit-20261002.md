---
record_schema: 1
id: fact-t3-gap16-guard-audit-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-gap16-guard-audit-20261002.md
    hash: eec1263bfaded6e1675d7331fc89ef5c09705bfae8c2f2bf27176913870e0dc4
    locator: Actual code check(), Raw execution and computed trace counts
dependency_hashes: {}
revision: 592edb8f-4582-486e-8103-7c96880a370e
---
# T3 16px 회피 제한 확인

사용자 질문: 더 붙을 수 있는데 회피 알고리즘 때문에 못 붙는지 확인. 이번 작업은 코드·로그 읽기 검토이며 제품 판단 코드 변경 없음.

빌드1002-11dad5e1의 T3 자체 경로 검사: 대상의 가까운 몸통 구간은 진입 단계 예측gap8px 미만을 거절, 추종 단계는 목표gap−8px 미만을 거절한다. 다른 몸통 및 대상의 다른 구간은16px 여유, 머리·벽은25px 여유. 거절되면 조향을 교체하고 안정 기록을 초기화한다. 따라서 접근을 제한하는 회피 개입은 존재하며, 진입의8px 고정 문턱은 더 작은 시작 목표와 충돌할 수 있다(코드에서 도출). 실제 guard 플래그만으로 어느 장애물이 원인인지 구분할 수 없다.

runs/t3_20261002_101048 총6판 완료·오류 없음. 생존9단계 전부6판의 같은 대상에서 확보, 독립9판이 아니다. 목표16→8px까지 내려갔고 마지막 단계 관측gap 중앙값6.4944px·범위5.5514–8.4523px, 모두 순항. 다음 목표7px trace 확인. 6판 gap40px 미만1005틱 중 회피 개입159틱, 그중 목표±8px827틱에서는53틱. 가까운 접근 모두가 회피에 막힌다는 결론은 아니다. 공통 안전 오프셋 및 서버 접촉 경계는 미확정.

16px 시작의 다음 배치 수집은 기존 승인 범위로 진행 중. 추가 수정은 수행하지 않았다.
