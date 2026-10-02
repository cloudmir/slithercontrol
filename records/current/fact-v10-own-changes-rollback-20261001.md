---
record_schema: 1
id: fact-v10-own-changes-rollback-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
checked_at: 2026-10-01
dependency_hashes: {}
revision: 826b6aec-a096-49ec-bb74-90b9882b9acc
---
# 이 대화에서 추가한 V10 변경 롤백

사용자 지시: “그럼 너가 수정한 부분만 롤백해”.

파일 롤백: 비상 회전 회복 평가·6개 진단 로그 필드·전송 패킷 기반 입력/양자화/송신 게이트 예측을 제거. ext/pilot.js 및 ext/mod.js는 research/v10_emergency_recovery_20261001/before/ 원본과 바이트 동일. 현재 파일은 직전 당사 수정 버전의 해시와 일치함을 확인한 후 복구했다. 기존 비용 0 기본 부스트 및 params.json 유지. 새 식별 빌드1001-rb-cf15d281.

검증: node 문법 검사 2개 통과, 기본 부스트 회귀 5개 통과, 두 소스 원본 완전 일치. research/v10_rollback_20261001/result.json, boost_check.json. 롤백 전 전체 변경 파일은 before/ 보존. 분석 자료·실게임 기록 보존.

브라우저 적용: apply_idle.py 결과 applied:false / game_in_progress. 진행 중 게임을 중단하거나 재로드하지 않았다. 파일 롤백 완료이며 현재 브라우저 적용은 미완료. 새 게임 실행 없음.
