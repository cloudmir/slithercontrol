---
record_schema: 1
id: fact-v10-recovery-live-death-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-recovery-live-death-20261001.md
    hash: 38b50036abfb8f4fc69e9885ccc84c8bbd38da234b08123fcfbaa9b577b7c779
    locator: observations, recovery_frames, raw_hashes
    quote: Final V10 selected at101.622s; death104.5s
dependency_hashes: {}
revision: f0814795-78b5-4e50-a3d3-736c1ed96276
---
# V10 비상 회전 수정 실게임 1판

사용자 승인 “그럼 실게임을 돌리고 끝나면 분석을 하자”. 목적 비상 회전 고정 재발 관찰. Windows 적용 확인 후1판,600초 수집 상한(미도달), 끝에 봇 끔. 연구 분석·기록 수행, 추가 게임/알고리즘 수정 없음.

기록용6필드(ext/mod.js LOG_KEYS/행) 추가 빌드1001-10f3faa7; 판단 코드1001-8ef6d22b와 동일. 기존 설정 보존, 초기V10. runs/v10_recovery_live_20261001_155641/.104.5초 사망, 최대길이179, 서버181.41.140.178:444, 기록players480, 판단오류0. 판 중V8/V10 반복전환12개 변화기록; 전체V10 성능시험 아님. 마지막101.622초V10 복귀, 이후 사망까지V10. 사용자가 사망시V10임을 지적했고 로그로 확인.

사망 직전:104.29s 부스트 경로 최소 모델여유0.358px,104.335s13.061px를 안전판정.104.396s root unsafe, 회복평가 시작.104.45s 부스트 해제 명령; 실제속도sp14 유지. 마지막관측의 적327몸통표면 거리28.269px에서 내반경15.868px을 빼면12.401px. 가장 가까운 적머리 표면간격187.269px. 마지막까지 머리방향 변함(회전정지 재발 아님). 적327몸통 충돌은 유력가설, 서버의 실제살해개체 식별 불가. 모델안전경로와 실제진행의 불일치 및 늦은비상 진입을 확인했지만 명령변경/지연/물리/몸모델의 기여 분리는 미완료.

회복평가2프레임 모두0.32초 진단, 로컬계산6.6/3.9ms. 비상적용 확인이지 생존효과 입증 아님. 전체판 p95판단44.8ms에는V8 포함. prediction_actual.json은 고정명령0.13초 대조이며 이후새명령 무시하므로 물리오차 측정으로 사용할수 없음.

원본블랙박스·전체로그·0.5초 목표카메라·변경이력 보존. analysis_01.json, death_review.json, death_review_source.md, tail_states.json. 다음후보: 좁은여유 부스트와 회전방향전환 시 실제지연·이어지는 명령열을 재생하는 검증. 전체회전정지/동조건A/B 결론 보류.
