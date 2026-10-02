#!/bin/sh
# Sequential live games for real-data collection (user 2026-09-24: no daily cap, test on the live server).
# usage: live_batch.sh STAGE N   -- stops at the first game that does not finish cleanly (no auto-retry).
cd "$(dirname "$0")"
stage=${1:-pocket11}; n=${2:-5}; i=1; shift 2 2>/dev/null; extra="$*"   # extra args, e.g. --measure
while [ "$i" -le "$n" ]; do
  log=runs/batch_${stage}_$(date +%Y%m%d_%H%M%S).log
  .venv/bin/python live_staged.py --stage "$stage" $extra > "$log" 2>&1
  tail -1 "$log" | grep -q '"status": "finished"' || { echo "stop: game $i did not finish cleanly ($log)"; exit 1; }
  grep -q '"reason": "user_escape"' "$log" && { echo "stop: Esc pressed"; exit 0; }
  [ -f runs/stop_batch.now ] && { echo "stop requested"; exit 0; }
  i=$((i+1)); [ "$i" -le "$n" ] && sleep $(shuf -i 30-90 -n 1)
done
echo "batch done: $n games"
