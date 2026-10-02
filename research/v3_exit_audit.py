"""Summarize V3's claimed safety and actual exit availability before each death.

Usage: python research/v3_exit_audit.py runs/v3head2_20260930_054155
Only recorded decisions are classified; this does not replay alternative actions.
"""
import gzip
import json
import sys
from pathlib import Path


def audit(root: Path) -> None:
    for game_file in sorted(root.glob("slp_[0-9][0-9].json")):
        game = json.loads(game_file.read_text(), parse_constant=lambda _: None)
        log_file = game_file.with_name(game_file.stem + "_log.json.gz")
        if not log_file.exists():
            continue
        log = json.load(gzip.open(log_file))
        keys = log["keys"]
        rows = (dict(zip(keys, values)) for values in log["log"])
        end = game["seconds"]
        bins = {(60, 5): [], (5, 3): [], (3, 2): [], (2, 1): [], (1, 0): []}
        for row in rows:
            for (before, after), bucket in bins.items():
                if end - before <= row["t"] < end - after:
                    bucket.append(row)
                    break
        print(f"{game_file.stem}: {end:.1f}s L={game['L_max']}")
        for (before, after), bucket in bins.items():
            if not bucket:
                continue
            count = lambda fn: sum(bool(fn(row)) for row in bucket)
            print(f"  -{before}..-{after}s n={len(bucket)} claimed={count(lambda r: r.get('v3_cert'))} "
                  f"exit={count(lambda r: (r.get('v3_exits') or 0) > 0)} "
                  f"ring={count(lambda r: r.get('mode') == 'v3ring')} "
                  f"no_leaf={count(lambda r: (r.get('v3_leaves') or 0) == 0)} "
                  f"root_cut={count(lambda r: r.get('v3_root') == 'cut')}")


if __name__ == "__main__":
    for name in sys.argv[1:]:
        audit(Path(name))
