#!/bin/sh
# after the top-3 verification: connectome-vs-shield ablations on the same 8 held-out seeds (sim only)
cd "$(dirname "$0")"
while pgrep -f '^\.venv/bin/python compare\.py' >/dev/null; do sleep 20; done
.venv/bin/python compare.py --only straight_shield,fly_rewired_shield,fly_shield_default --minutes 3 --seeds 8 --seed0 20000 --workers 4 --out runs/ablation.json > runs/ablation.out 2>&1
./notify.sh "비교 실험(커넥톰 vs 안전장치) 완료 ($(date +%H:%M))"
