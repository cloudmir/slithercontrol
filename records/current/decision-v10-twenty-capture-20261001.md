---
record_schema: 1
id: decision-v10-twenty-capture-20261001
kind: decision
status: adopted
as_of: 2026-10-01
dependency_hashes: {}
revision: 4d861be4-e455-4d6b-860a-b647fb6c009a
---
# V10 고정 20판 수집·판별 사망 시각화

사용자: “우선 20판만해서 분석데이터를 쌓아둬 … 매 판마다 어떻게 죽었는지 / 분석내용 개선방향 그리고 죽을 때 이미지 / 개선 설명 이미지 (어떻게 움직였어야하는지) … 하나의 시각화 자료 … 실 데이터 수집및 테스트 시작”.

확정: 최신 V10 20판 실게임 수집, 매 판 분석·실제 촬영·대안 움직임 설명도·단일 HTML 누적. 이번 배치는 제품 판단 코드 수정 없이 기록한다. 실제 생존이 입증되지 않은 대안은 모델 재생으로 명시한다.

실행 선택: 기존 Windows MOD Chrome 및 사용자 설정 유지, 빌드1001-5f471fca 고정. 판당600초는 기존 수집 상한을 유지한 운영 기본값이며 사용자 지정 판당시간은 아니다. 0.5초 실제 촬영. 사망과 상한 종료를 구분. 오류·설정/버전 변경은 추가 판을 시작하지 않고 중단 기록. 최대20판. 판 사이15초 및 오프라인 분석 동안 봇 끔.

시작: runs/v10_twenty_20261001_195831/, 지속 프로세스 PID3621636. 실행기 research/v10_twenty_20261001/batch.py, 분석·HTML report.py, 반사실 replay.mjs. 제어기 원본은 배치 code/에 보존. 진행·종료 여부는 해당 summary.json/로그와 실제 프로세스로 확인하며 완료로 추정하지 않는다.

산출물: 판별 slp_XX.json·블랙박스·로그·0.5초 카메라, analysis_XX.json, counterfactual_XX.json, death_XX.jpg, death_map_XX.svg, improvement_XX.svg. 통합 runs/v10_twenty_20261001_195831/report.html(단일 HTML, 이미지·좌표 재구성 인라인). 대안은 기록된 적 움직임을 고정한 관측 구간 모델이며 상대 반응·관측 이후·실제 생존 미검증. STOP는 이번 판 종료 후 중단, STOP_NOW는 연결 종료 및 추가 판 중단을 의미한다.
