---
record_schema: 1
id: claim-death-recovery-progress-20260923
kind: claim
status: draft
as_of: 2026-09-23
depends_on:
  - decision-death-recovery-training-20260923
dependency_hashes:
  decision-death-recovery-training-20260923: 32c4d151561e794509e9e295a19e6613ba7e3d9414a5536679a8488a1a32164f
revision: 56406498-86c7-4e30-8eb3-4b5e5d8c142f
---
# 사망 직전 회피 PPO — 구현 및 학습 진행 중

2026-09-23. 최종 성능 검증 전 진행 기록이다. recovery_env.py는 두 시점 관측으로 26개 조향·부스트 행동을 직접 선택하며 플래너/쉴드가 행동을 바꾸지 않는다. capture_recovery.py는 원래 v5 전체 월드를 다시 실행하여 마지막 120개 관측과 사망 시각·길이·원인을 검증한 후 사망 2/4/6초 전 전체 월드·난수·명령 큐를 저장한다.

이 기록 시점에 학습 사건 5개(56000/56001/56003/56004/56005)와 검증 사건 56006 복원이 완료되었고 시험 사건 56002/56007/56008은 복원 진행 중이다. 새 PPO 학습이 시작되어 초기 모델 ppo_000000.zip이 저장되고 512스텝 진행 출력이 확인되었다. 학습 상한 65536스텝, 검증 체크포인트 0/8192/16384/32768/65536. 회피 성공은 원래 사망 시각 이후 6초까지 생존이며, 10분 활동 조건 준수 성공과 다르다.

7개 로컬 검사와 SB3 check_env를 통과했다(runs/recovery_v1/tests.txt, gym_check.txt). 성능 개선, 최종 회피 시험, 새 월드 10분 시험은 아직 미확인이다. 최종 결과 저장 시 이 진행 기록을 대체한다. 코드/실험 안내 RECOVERY_README.md. 실사이트 호출 및 기존 파이프라인 제어는 하지 않았다.
