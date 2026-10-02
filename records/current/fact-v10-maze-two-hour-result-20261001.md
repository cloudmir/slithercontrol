---
record_schema: 1
id: fact-v10-maze-two-hour-result-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-maze-two-hour-result-20261001.md
    hash: d28c6cc67673c0ed06c0af4ab4d1fc7b7756a395644b60fcdddbc8a0c9167c75
    locator: Verified implementation scope, Live records, Explicit limits,
      cost_ui_result.json
dependency_hashes: {}
revision: 077cacdb-ad3d-4f1d-a521-9e4cfbdef5a1
---
# V10 두 시간 개선 — 미로·먹이·부스트

사용자 요구: 73F처럼 길이 있는데 미로 경로를 확보하지 못하는 문제 최우선, 복수 경로 표시, 위험 임계값까지 선택 경로 유지, 먹이 성장, 실게임 반복. 이어 혼잡 탈출·직선 먹이 접근의 적극 부스트와 소모 비용 조정을 요청했다. 사용자 요구 사실이며 무사망 성능이 입증됐다는 뜻이 아니다.

최종 로컬·Windows 적용 빌드 1001-e57022de. 정적 통로 탐색과 실제 회전·충돌 검증 분리, 진입 기동 연결, 경로 유지·번호별 RISK 표시, 먹이 재조준·복귀 검사, 관측 응답 지연 0.06초 교정, 적의 현재 목표 방향 예측, 혼잡 탈출·먹이 접근 부스트 선택을 구현했다. RISK는 확률이 아니다.

V10_BOOST_COST 슬라이더 0–1, 기본 0. 평상시·먹이 접근에서 높일수록 소모 감점 증가. 혼잡 탈출은 비용 감점 제외(설명 표시). 기본 0은 요청 취지에 맞춘 구현 선택이며 최적값 측정 결과가 아니다. 로컬 0/1 비교에서 먹이 접근 부스트/순항 선택 변화 확인. 실제 UI 0.4 변경·새로고침 유지·0 복원 확인, 기존 다른 값 보존.

총 14회 실게임: 1–13차 순차 개선 시험, 14차는 최종 슬라이더 연결 확인용 실시간 45초 상한. 13차는 실시간 300초 상한 종료(사망 아님), 페이지 기록328.1초, 최대 길이1604, 경로 추종96.36%, 판단 오류0. 14차는 페이지49.4초, 최대225, 오류0. 전체 원본과 빌드별 소스는 runs/v10_maze_cycle* 및 research/v10_maze_2h_20261001/cycle*_code에 보존. 모든 판은 상황·인원이 달라 통제된 A/B가 아니다.

한계: 사망이 남아 있으며 무사망 또는 생존 우위는 미입증. 원래33F/73F 전체 상태가 없어 정확한 재생은 불가. 90ms 예산에서 후보 수 감소·출구 복구 실패가 남아 있고 500ms 구조 검사와 구분한다. 시간 민감한 preferred-first 실험과 cycle9 예측 완화는 채택하지 않았다.

분석: research/v10_maze_2h_20261001/final_report.html 및 final_summary.json. 표시한 전체 타임라인: runs/v10_maze_cycle13_20261001_151511/full_timeline.html. 실게임 추가 실행은 종료하고 봇을 껐다.
