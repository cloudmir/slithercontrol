---
record_schema: 1
id: fact-t3-parallel-measure-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-rebuild-data-20261002.md
    hash: 67074b701ce3e1633dbcd0d52d837cf97e24d316381b3199cbfe26ba8fcb199d
    locator: Production and execution outputs, Actual14 recorded levels, Local
      verification outputs
dependency_hashes: {}
revision: 07d8a3b3-b91a-46d5-92a8-891d39ca8767
---
# T3 평행 추종 재작성·실측 시작

사용자 요청: 제대로 수정·실게임 측정. 최신 사용자 관찰·선택: “지금 방식이 좋아 보이니 계속 간격을 줄이면서 데이터를 확보해줘”. 좋은 것으로 보인다는 표현은 사용자 관찰이며 성능 우월성 검증이 아니다.

빌드1002-11dad5e1. 연결된 몸통의 접선·옆 간격으로 조종하며 진입 경로 충돌 검사, 급곡선 이탈, 대상 유지, 평행 유지와 측정 품질 분리를 반영했다. 기존8개 함수 보존·지연/251각도 모의20검사·곡선6조건·실제Worker/UI 확인 통과. 모의 결과는 서버 경계 실측이 아니다.

runs/t3_20261002_094739: 3판 종료(13.0/5.4/144.1초), 3판에서만 생존14단계. 모두 실제 순항속도·완만한 곡선 조건이며 독립14판으로 해석하지 않는다. 실제 생존 관측 최소gap35.2887px, 각 단계gap_min/max·방향·반경·속도·곡률을 보존한다. 단계 목표는40/39px, 실제gap 범위는 목표와 다를 수 있다. 이 결과는 접촉 경계 또는 공통 안전 오프셋이 아니다.

사용자 서버 변경 후 브라우저forcing/bso에서8127(181.41.140.178:444)을 읽어 반복 판의 서버를 고정했다. 초기 실행은 페이지 재읽기 시 강제 선택 유실 가능성이 있어 이후 명시적 고정·실접속 대조를 추가했다. 관측 성공 판 종료 인원411명.

계속 수집: 같은 빌드, 시작35px·안정 확인 후1px 감소, 실제 순항/부스트 조건을 분리. runs/t3_20261002_095256, 예정6판·판당300초·배치3600초. 이 기록은 수집 시작 시점이며 추가 배치 완료·성과를 확정하지 않는다.

자료: research/t3_20261002/{dataset.html,report.html,alive_levels.csv,death_cases.csv,death_frames.csv,offset_dataset.json}. 직선/완만한 곡선·빌드·내 반경·상대 반경·실제 속도로 구분. 급곡선·빠른 수직 접근·머리/몸 간섭 사망은 경계 추정에서 제외. 실측범위<3px 조건이며1px 단계가1px 측정 정확도를 뜻하지 않는다. 서버 실제 충돌 좌표 미확인. 이전 실패 실행·원본 코드는 보존했다.
