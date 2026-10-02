---
record_schema: 1
id: decision-t2-deathfocus-20261002
kind: decision
status: adopted
as_of: 2026-10-02
dependency_hashes: {}
revision: c05be69d-8d36-4b2b-82cd-72a222f43d89
---
# T2 生存→사망 간격 추가 수집

사용자: 일정 간격 유지 후 사망 직전 간격이 중요하므로 이 관점에서 더 수집할 것.

실행 선택: 기존 T2 빌드1002-c8485bf1 유지, 추가 배치 runs/t2_20261002_083430 시작. 최대20판·판당300초·배치3600초는 운영 상한. 엄격한 안정 기준 미달 사망도 버리지 않고 최근2초 전체 프레임에서 고정 대상 간격·최근접 몸 간격·두께·속도·간섭 사유·마지막 생존 관측과 사망 관측 시간차를 누적. 정확한 서버 충돌 좌표로 확정하지 않는다.

산출물 research/t2_20261002/DEATH_GAPS.md, death_gaps.html, death_series.json, death_series.csv. 누적 분석기 death_series.py, 실행 job_deathfocus.json. 제품 주행 코드 변경 없음.
