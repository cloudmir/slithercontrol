#!/bin/sh
# after the ablations: planner retune (survival 1st, growth 2nd; validation pick) -> fly readout retune on the new
# planner senses (validation pick) -> final comparison on fresh seeds -> death analysis. Windows notice per stage. Sim only.
cd "$(dirname "$0")" && . .venv/bin/activate
while pgrep -f '^/bin/sh \./ablation\.sh' >/dev/null || pgrep -f '^\.venv/bin/python compare\.py' >/dev/null; do sleep 30; done
mv runs/tune.jsonl runs/tune_v2.jsonl 2>/dev/null
python tune.py --gens 3 --pop 8 --minutes 3 --seeds 5 --val-seeds 8 --workers 4 > runs/tune_v3.log 2>&1 || { ./notify.sh "재튜닝 실패 (runs/tune_v3.log)"; exit 1; }
./notify.sh "1/4 규칙 AI 재튜닝 완료 → 커넥톰 재튜닝 시작 ($(date +%H:%M))"
mv runs/fly_tune.jsonl runs/fly_tune_v1.jsonl 2>/dev/null
python fly.py tune --gens 3 --pop 8 --minutes 3 --seeds 3 --val-seeds 8 --workers 4 > runs/fly_tune_v2.log 2>&1 || { ./notify.sh "커넥톰 재튜닝 실패 (runs/fly_tune_v2.log)"; exit 1; }
./notify.sh "2/4 커넥톰 재튜닝 완료 → 최종 비교 시작 ($(date +%H:%M))"
python compare.py --only planner_default,planner_tuned,rl_ppo_shield,fly_shield,fly_rewired_shield,straight_shield --minutes 3 --seeds 8 --seed0 40000 --workers 4 --out runs/final.json > runs/final.out 2>&1 || { ./notify.sh "최종 비교 실패 (runs/final.out)"; exit 1; }
./notify.sh "3/4 최종 비교 완료 → 사망 원인 분류 시작 ($(date +%H:%M))"
python deaths.py --ctrl planner_default,planner_tuned,fly_shield --seeds 8 --minutes 3 > runs/deaths.out 2>&1
./notify.sh "4/4 모두 완료 ($(date +%H:%M)) — Claude에게 결과 확인을 요청하세요"
echo PIPELINE2_DONE
