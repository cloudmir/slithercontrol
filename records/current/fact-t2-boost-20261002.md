---
record_schema: 1
id: fact-t2-boost-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t2-boost-measure-20261002.md
    hash: 2fd49e05791b7fb63c877c9c4abc4c900016b581957970a058c00a75ed6ba903
    locator: 구현·검증 및 Actual live restart verification
dependency_hashes: {}
revision: 0c182452-8502-4224-b6a5-1816a92eff0e
---
# T2 부스트 추격 재측정

사용자 선택: 일정 길이 이상의 가까운 적을 고정 추종하며 간격을 좁혀 두께별 접근 경계 실측. 추가 지시로 추격에 부스트 사용.

빌드1002-c8485bf1. 독립 T2는 보이는 몸길이600px 이상 대상을 선택·유지하고 머리 방향으로 추종. 떨어졌을 때 부스트 추격, 붙은 뒤 상대 속도에 맞춘 가속 조절. 안정 구간에서 목표 간격1px 감소. 곡률·다른 몸·머리 간섭은 측정 제외 기록. 기존7개 판단 함수 보존 및 합성 지연/양자화 추종·브라우저·분석기 검증 통과. 합성 결과는 실측 경계가 아니다.

실게임 runs/t2_20261002_082349 재시작, PID987484. 명령 로그 추출779틱 중 부스트370틱. 완료 판 블랙박스 실제sp>8 프레임330개, 최대sp14 확인(추출 시점별 모집단은 다름). 초기3판 안정 단계0개: 안전 경계 미확정. 최대20판·판당300초·배치3600초는 운영 상한.

누적 개발 참고 research/t2_20261002/T2_THICKNESS.md. 누적 시각화 research/t2_20261002/report.html, data.json, samples.csv. 이전 실패·제외 자료도 버전별 보존. 생존 단계와 마지막 생존 사망 후보를 구분하며 보편적 안전 두께로 확정하지 않는다.
