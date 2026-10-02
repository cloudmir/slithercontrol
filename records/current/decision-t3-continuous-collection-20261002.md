---
record_schema: 1
id: decision-t3-continuous-collection-20261002
kind: decision
status: adopted
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-continuous-collection-20261002.md
    hash: 8396651159d7dacfba1bb06eb9b7147f0fca6d623c6948959549f7c31c43e5a3
    locator: user_direct_instruction, runtime, checks, Exact supervisor source
dependency_hashes: {}
revision: de0b32f9-46c6-4d1d-b6a6-3a75adea3246
---
# T3 전체 조건 확보까지 계속 수집

사용자 직접 지시: “계속 모든 데이터를 얻을때까지 중지하지 말고 진행해.” 기존 최대4배치·전체3600초 및 연속 표본 부족 시 전체 종료라는 운영 선택을 이 지시로 대체한다. 과거 측정 사실과 당시 실행 상한 기록은 이력으로 보존한다.

실행: 기존 수집기1273748/runs/t3_20261002_102528 판을 유지하며, 감독 프로세스1288059/research/t3_rebuild_20261002/continuous_measure.py가 인계받은 상태 확인. 같은 제품 빌드1002-11dad5e1 및 pilot.js 해시 유지. 판단 알고리즘 변경 없이 수집 순서·오류 분류·뷰어 진행률만 변경했다.

기술적 수집 목표(사용자가 지정한 숫자가 아니라 구현 기준): 적 표시 반경5구간(<20/20–30/30–40/40–50/≥50px)×실제 순항·부스트×직선·완만한 곡선 총20조건. 각 조건에서 동일 내 반경2px 구간의 독립3판 이상 gap≤0 생존과 독립3판 이상 적격 사망 후보를 확보한다. 진행 중 잠정 표본·같은 판의 반복 단계·제외 사망·다른 빌드는 충족으로 세지 않는다. 연속적인 모든 두께나 서버의 보장된 안전 오프셋을 확보했다는 뜻은 아니다.

각 기록 배치는6판·판300초·배치3600초 이내이나, 종료 후 부족한 실제 두께/속도 조건을 공정하게 다시 요청한다. 이후 새 배치 시작16px·안정 후1px 감소. 표본0·독립 반복 부족·배치 상한으로 전체 중단하지 않는다. 실행 오류는 보존 후 지연 재시도, 코드 버전은 새 판 소스와 분리한다. 사용자 STOP 또는 수동 설정 변경은 존중한다. 전체 운영 시간·배치 수 상한 없음.

진행 research/t3_rebuild_20261002/continuation.json 및 coverage_progress.json. 전체 중지 파일 STOP_CONTINUOUS, 현재 판 즉시 종료는 해당 runs 폴더 STOP_NOW. coverage/독립성/속도·빌드 구분/조건 선택 공정성/사용자 중지와 실행 오류 구분 검사 통과. research/t3_20261002/dataset.html에20조건 부족 표본 표시.
