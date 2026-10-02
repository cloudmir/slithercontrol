"""Death analysis for MOD games (user 2026-09-27 "죽었을때 데이터 분석 ... 이를 이용해서 안죽도록 분석").

Turns each MOD game record (slp_<x>.json) and its black box (slp_<x>_box.json.gz, last 30 s of observations + commands)
into run_live's layout (<out>/<x>.jsonl + <out>/<x>/blackbox.pkl.gz), then runs the existing tools on them unchanged:
- deaths.py: death category (wrapped / cut_off / trapped / sudden), killer, remains chase, boosting ...
- research/oracle_deaths_20260925.py: 1.2 / 2 / 3 s before death, which of 48 basic maneuvers would have stayed clear of
  the bodies as they really were later (others fixed: they do not react to our changed move).

  .venv/bin/python research/mod_deaths.py <out_dir> <dir or slp_*.json ...>
Out: <out_dir>/report.txt, <out_dir>/oracle.json
"""
import gzip
import json
import os
import pickle
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SHAPES = dict(segs=5, heads=5, food=3, own=2)


def pairs(args):
    for a in map(Path, args):
        for rec in (sorted(a.glob('slp_*.json')) if a.is_dir() else [a]):
            box = rec.with_name(rec.stem + '_box.json.gz')
            if box.exists():
                yield rec, box


def convert(rec_path, box_path, out):
    r = json.loads(rec_path.read_text()); b = json.load(gzip.open(box_path, 'rt'))
    by_t = {x['t']: x for x in r['trace']}
    box = []
    for f in b['frames']:
        st = {k: f[k] for k in ('x', 'y', 'ang', 'sp', 'sc', 't', 'L', 'boost', 'wall')}
        for k in ('segs', 'sid', 'heads', 'hid', 'food', 'own'):
            a = np.asarray(f[k], np.float32)
            st[k] = a.reshape(-1, SHAPES[k]) if k in SHAPES else a
        tr = by_t.get(f['t'], {})
        box.append(dict(state=st, cmd=(float(f['cmd'][0]), bool(f['cmd'][1])), last=dict(mode=tr.get('mode'), trace=tr), page_ms=tr.get('page_ms')))
    name = rec_path.stem
    (out/name).mkdir(parents=True, exist_ok=True)
    with gzip.open(out/name/'blackbox.pkl.gz', 'wb') as fh:
        pickle.dump(box, fh)
    jl = out/f'{name}.jsonl'
    jl.write_text(json.dumps(dict(status='finished', reason='death', seconds=r['seconds'], L_max=r['L_max'], trace=r['trace'],
                                  ext=r.get('ext'), values_hash=r.get('values_hash'), box_frames=len(box))))
    return jl


def main(out, args):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    games = [str(convert(rec, box, out)) for rec, box in pairs(args)]
    if not games:
        sys.exit('no record + black box pairs found')
    env = dict(os.environ, ORACLE_OUT=str(out/'oracle.json'), ORACLE_MOMENTS='3.0,2.0,1.2')
    py = sys.executable
    rep = [f'{len(games)} games: ' + ' '.join(Path(g).stem for g in games)]
    for cmd in ([py, 'deaths.py', *games], [py, 'research/oracle_deaths_20260925.py', *games]):
        p = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True)
        rep += ['', '$ ' + ' '.join(Path(c).name for c in cmd[1:2]), p.stdout.strip()] + ([p.stderr.strip()] if p.returncode else [])
    rep += ['', 'page stalls (decision gap > 300 ms) in the last 10 s — the page and the bot stop, the server keeps moving us:']
    for g in games:
        tr = json.loads(Path(g).read_text())['trace']; t = np.array([x['t'] for x in tr]); d = np.diff(t)
        stalls = [(round(float(t[-1] - t[j]), 1), int(d[j] * 1000)) for j in np.flatnonzero((d > .3) & (t[1:] > t[-1] - 10))]
        rep.append(f'  {Path(g).stem}: ' + (', '.join(f'{ms} ms starting {b} s before death' for b, ms in stalls) if stalls else 'none'))
    (out/'report.txt').write_text('\n'.join(rep) + '\n')
    print('\n'.join(rep))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
