---
record_schema: 1
id: fact-t3-gap35-progress-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-gap35-progress-20261002.md
    hash: e69793633bce6b64c68ede5a60a2d10d5791356ba73875cca37665be69c0ff20
    locator: Verified execution outputs, Raw qualified11 levels, Automatic
      continuation program
  - path: .workspace/sources/t3-rebuild-data-20261002.md
    hash: 67074b701ce3e1633dbcd0d52d837cf97e24d316381b3199cbfe26ba8fcb199d
    locator: Actual14 recorded levels
dependency_hashes: {}
revision: 2b3e54d1-5a12-4d59-b2eb-6dc090c2ef87
---
# T3 35px 추가 6판·간격 계속 좁히기

사용자: “지금 방식이 좋아 보이니 계속 간격을 줄이면서 데이터를 확보해줘”. 긍정 표현은 사용자 관찰이며 생존 효과 비교 결과가 아니다.

빌드1002-11dad5e1 유지. runs/t3_20261002_095256, 시작35px·안정 확인 후1px 감소, 6판 정상 종료(전부 사망), 오류 없음·설정 복원. 판별 생존 단계0/0/5/5/0/1, 총11단계·유효 표본 나온 독립3판. 모두 실제 순항 속도, 곡률 분류는 완만한 곡선10·직선1. 관측 최소 생존gap31.9265px. 3판에서 목표35→34→33→32px 단계 확보. 전 배치14단계와 합쳐25단계·유효 표본 나온4판이다. 서로 다른 두께·속도·곡률 조합을 독립 반복으로 합치지 않는다.

부스트 실제속도sp>8 로그 관측은4판242틱·6판507틱. 부스트 명령과 실제 속도를 구분했고 유효 부스트속도 생존 단계는0개. 사망6건은 평행 유지/최근 안정 단계/머리 간섭 등 기준 미충족으로 경계 후보 제외. 접촉 경계·공통 안전 오프셋은 여전히 미확정이다.

계속 수집 실행 선택: 같은 판단 코드, 다음 시작32px·순항 요청·안정 후1px 감소. research/t3_rebuild_20261002/continue_measure.py가 현재 배치 종료 후 실제 실행을 이어가도록 기동됐고 새 배치 수집 확인. 추가 최대4배치×6판·전체3600초 상한. 같은 내 반경2px 구간/적 반경 구간/곡률 조건에서 독립2판 이상 표본이 있으면 다음 배치 시작을1px 내림. 부족하면 같은 시작 간격 반복, 2배치 연속 독립 반복 부족·유효 단계0·사용자 STOP·코드 변경·오류 시 자동 후속 수집 종료. 이는 실험 순서이며 공통 안전값 채택이 아니다. 향후 결과는 완료 후 별도 검증한다.

research/t3_20261002/dataset.html에 현재 시작 간격·최소 실측·조건별 표·최근 판 요약 자동 누적. 원본 코드·판 로그·블랙박스·사진 보존. 진행 상태 research/t3_rebuild_20261002/continuation.json. 사용자 중지는 해당 실행의 STOP_NOW 또는 research/t3_rebuild_20261002/STOP_CONTINUATION으로 후속 수집 종료.
