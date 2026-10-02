---
record_schema: 1
id: fact-t3-measurement-gates-audit-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-measure-failure-audit-20261002.md
    hash: a4bb926ee3166e8e05fbcfcf2dd5a710f819560a8ba60b6bf1d524670d21c90f
    locator: Raw audit output, Production guard and stability window, Classifier
      input and death gates
dependency_hashes: {}
revision: 8e58534a-1799-4c50-8b5b-af9086fd453f
---
# T3 측정 판정과 실패 점검

빌드1002-11dad5e1의 코드·11:47:40 KST 고정 모집단94판(사망93·중단1)을 읽기 전용 점검. 원본 로그 목록은 t3-results-1147 근거에 있고 이번 집계 research/t3_rebuild_20261002/failure_audit.json. 이후 수집분은 포함하지 않음.

평행 유지 판정: 최근1.5초 이내 창에서15표본 이상·연속 관측跨度0.75초 이상이며, 대상 획득/직전 단계 변경 이후1.5초 이상. 창의 목표 간격 절대오차 중앙값2px 미만, 간격 최대−최소3px 미만, 방향차 중앙값8도 미만, 수직속도 절댓값 중앙값10px/s 미만, 우리·적 반경 변동 각각0.3px 미만, 게임 속도값 변동1 미만, 부스트 명령 변경0. 창 편입은 각 틱 방향차15도 미만·목표 오차8px 미만·남은 대상 몸통150px 초과·회피 개입/간섭 없음이어야 함. 이 조건이 깨지면 창을 비움. 따라서1.5초 전체를 유지해야 한다는 뜻은 아니며, 단계 변경마다1.5초 대기와 최소0.75초 관측 창을 별도로 요구함.

사망 최종 phase: align56·seek28·follow9. 전93건 guard_changed1·t3_valid0. 분석기는 측정 유효 플래그를 실제 추종phase처럼 사용해 '사망 전 추종 중 아님'으로 표시함. 그 게이트만 제거해도 다른 제외 조건 때문에 적격 사망0으로 동일함. 실제 부스트 속도 follow1291틱·valid995틱이 있으나 완료된 적격 부스트 단계0. 근사 창 검사에서 최장 부스트 창의 오차 중앙값2.84px·간격 변동4.31px로 위 안정 조건에 미달. 겹치는 창은 독립 표본 아님.

해석: 단순 판 수 부족보다 대상 진입·안정 간격 제어 및 실제 추종과 측정 적격성의 구분이 문제다. 각 회피의 인과 기여율이나 서버 접촉 경계를 입증한 결과가 아님. 코드·필터·운영 수집은 이번 점검에서 수정하지 않음.
