---
record_schema: 1
id: fact-v10-death-cause-replay-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-death-cause-replay-20261001.md
    hash: 4df5aa59a872e289d3bae639e95e5fbd43db01c84783bd0e0c4866bde37d2aa1
    locator: 코드 발췌 및 replay_audit_extended / replay_follow_failures
dependency_hashes: {}
revision: 2810219f-9faf-46a8-8336-8f9fd6f1944f
---
# V10 사망 원인 재현 분석

대상 빌드1001-8385d1b4, runs/v10_death_capture_20261001_114834. 저장 데이터만 분석, 운영코드 변경·새실게임 없음.

확인: 지도 예산90ms 중 남은시간55%만 정적 탐색에 전달하고 내부에서65% 초기탐색/세밀재시도로 분할. 탐색상태는 매 호출 초기화. 정적 몸통벽 경로를 만든 뒤 실제 회전·동적 충돌검증에서 거절되면 실패영역을 우회하도록 탐색에 되먹이지 않는다. 같은 안내선의 추종거리·속도만 바꿔 시도한다. 지도 실패시0.6초 근접 검사로 이동을 계속한다.

재현6스냅샷: 90ms와500ms 모두 완주 검증경로0. 500ms에서 사망5·3초 전 정적 경로는 발견됐으나 약2.3·3.1초 뒤 동적 충돌예측으로 거절. 1초전은 약0.7초 뒤 정적 몸통충돌로 거절. 1초전 기록명령1.2초 연장검사는 실패, 별도36방향순항검사4방향 통과.

판단: 시간상향만으로 해결되지 않으며 탐색·주행검증 연결과 지도실패시 행동이 구조적 개선 대상. 4방향 통과는 모델 재현 결과이지 실제 생존 보장이 아니다. Worker상태와 스케줄은 완전재현 아님. 노란색 사용자 경로의 안전성은 미검증. 원본·재현코드·결과 경로는 source에 기록.
