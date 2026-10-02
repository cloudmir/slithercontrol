#!/bin/sh
# after planner tuning: RL training, fly-connectome readout tuning, then comparison of all controllers (sim only).
# Pops up a Windows notice per stage.
cd "$(dirname "$0")" && . .venv/bin/activate
while pgrep -f '^\.venv/bin/python tune\.py' >/dev/null; do sleep 30; done
[ -f runs/best_params.json ] || { ./notify.sh "튜닝이 결과 없이 끝났습니다 (runs/tune.log 확인 필요)"; exit 1; }
./notify.sh "1/4 규칙 AI 튜닝 완료 → 강화학습 시작 ($(date +%H:%M))"
python train_rl.py --params runs/best_params.json > runs/train_rl.out 2>&1 || { ./notify.sh "강화학습 실패 (runs/train_rl.out)"; exit 1; }
./notify.sh "2/4 강화학습 완료 → 초파리 커넥톰 튜닝 시작 ($(date +%H:%M))"
python fly.py tune --gens 4 --pop 10 --minutes 3 --seeds 3 --workers 4 > runs/fly_tune.log 2>&1 || { ./notify.sh "커넥톰 튜닝 실패 (runs/fly_tune.log)"; exit 1; }
./notify.sh "3/4 커넥톰 튜닝 완료 → 전체 비교 시작 ($(date +%H:%M))"
python compare.py --minutes 3 --seeds 4 --workers 4 > runs/compare.out 2>&1
./notify.sh "4/4 전체 비교 완료 ($(date +%H:%M)) — Claude에게 결과 확인을 요청하세요"
echo PIPELINE_DONE
