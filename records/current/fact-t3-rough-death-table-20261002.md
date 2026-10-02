---
record_schema: 1
id: fact-t3-rough-death-table-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-rough-death-table-20261002.md
    hash: cdba296b8dd9d07e66d324c4e32e411cdc4a0331e3610d2a7dee50b840d0094c
    locator: Raw aggregation output, Verification output, Descriptive parallel
      cases, Original inventory
dependency_hashes: {}
revision: ca5dafcd-86db-46fe-8054-36ab92bf537f
---
# T3 106사망 대략 굵기별 간격 표

사용자 요청: 기존 사망 데이터를 분석해 우선 대략적인 수치 표 작성. 2026-10-02 12:02:11 KST 경로 목록 고정, 빌드1002-11dad5e1 종료107판 중 실제 사망106판 원본 rec·log·box 재계산. 누락0. 사망 프레임 최근접 몸통 간격은 기존 파생106건과 모두 수치 일치. 당시 전부 실제 순항 속도sp5.778~5.944이며 부스트 사망0. 우리 표시 지름29~47.60px 혼재.

적 표시 굵기는 반경의 두 배이고 실제 몸길이와 다름. gap=머리 중심–몸통 중심선 거리−우리 반경−적 반경. 표는 모든 최근접 몸통을 사용한 마지막 기록 프레임 통계이며 실제 충돌 상대·서버 사망 위치·안전 오프셋이 아님. 엄격한 안정 단계/valid 플래그로 제외하지 않음.

| 적 표시 굵기 px | 사망 수 | gap 중앙값 px | 10~90백분위 px | 같은 대상·평행 수 | 해당 gap 중앙값 px |
|---|---:|---:|---|---:|---:|
| <40 | 38 | -7.32 | -15.51~-0.18 | 0 | — |
| 40~60 | 26 | -5.85 | -10.26~-0.12 | 0 | — |
| 60~80 | 19 | -6.10 | -10.90~-1.83 | 3 | -10.52 |
| 80~100 | 18 | -10.53 | -14.73~+0.14 | 2 | -12.66 |
| ≥100 | 5 | -7.36 | -12.33~-3.03 | 2 | -10.57 |

同대상·평행은 실제 phase와 무관하게 추종 대상ID=최근접 몸통ID, 마지막 선분 방향차15도 미만, 종료 시각과 마지막 프레임 차이−0.05~0.25초인 기술적 부분집합7판이다. 머리 간섭·곡률·수직 접근은 이 부분집합에서도 혼재하며 안정 평행 사망 인증이 아니다. 백분위는 신뢰구간/접촉 경계가 아니다.

산출물 research/t3_rebuild_20261002/rough_deaths/{TABLE.md,data.json,deaths.csv,bins.csv,parallel_cases.csv,check.json,source.md}. 재현 rough_death_table.py. 원본 경로·SHA256을 inventory에 보존. 제품 코드·기존 필터·수집 프로세스 변경 없음.
