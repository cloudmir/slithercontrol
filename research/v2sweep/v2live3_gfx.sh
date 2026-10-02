cd /home/datawave/Work_AI/슬리더
until d=$(find runs -maxdepth 1 -type d -name 'v2live3_2026*' -newer research/v2sweep/v2live3_mark | head -1) && [ -n "$d" ]; do sleep 5; done
sleep 100; .venv/bin/python research/gfx_set.py 1 > research/v2sweep/v2live3_gfx.log 2>&1
until [ -f "$d/summary.json" ]; do sleep 30; done
.venv/bin/python research/gfx_set.py 4 >> research/v2sweep/v2live3_gfx.log 2>&1
