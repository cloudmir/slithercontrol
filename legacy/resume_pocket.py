"""Resume interrupted frozen pocket comparisons at completed-episode boundaries.

Run only after the prior runner has exited. Completed episode files are retained;
unfinished episodes restart from their original seed, not a partial world state.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
import fcntl
import hashlib
import json
from pathlib import Path
import sys
import time


def main(a):
    locks=[];groups={};jobs=[];source_hashes=None;first=None
    for raw in a.out:
        out=Path(raw).resolve();m=json.loads((out/'manifest.json').read_text())
        lock=(out/'.resume.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);locks.append(lock)
        snapshot=out/'sources'
        for name,h in m['hashes'].items():
            if hashlib.sha256((snapshot/name).read_bytes()).hexdigest()!=h:raise ValueError('modified frozen source: '+name)
        if source_hashes is None:source_hashes=m['hashes'];first=snapshot
        elif source_hashes!=m['hashes']:raise ValueError('combined runs must use identical frozen code')
        args=m['args'];done=[]
        for c in args['controllers'].split(','):
            for kind in args['cases'].split(','):
                for seed in range(args['seed0'],args['seed0']+args['seeds']):
                    path=out/f'{c}_{kind}_{seed}.json'
                    if path.exists():
                        r=json.loads(path.read_text())
                        if (r['controller'],r['kind'],r['seed'],r['cap_s'])!=(c,kind,seed,args['seconds']):
                            raise ValueError('episode identity mismatch')
                        done.append(r)
                    else:jobs.append((out,(c,kind,seed,args['seconds'])))
        planned=len(args['controllers'].split(','))*len(args['cases'].split(','))*args['seeds']
        groups[out]=dict(planned=planned,results=done)
    sys.path.insert(0,str(first))
    import evaluate_pocket as e
    if Path(e.__file__).resolve().parent!=first:raise ValueError('wrong evaluator import')
    for out,g in groups.items():
        e.write(out/'resume.json',dict(at=time.strftime('%FT%T%z'),workers=a.workers,
            retained=len(g['results']),pending=g['planned']-len(g['results']),
            method='completed episodes retained; unfinished episodes restarted from original seed'))
    with ProcessPoolExecutor(max_workers=a.workers) as pool:
        futures={pool.submit(e.episode,job):out for out,job in jobs}
        for future in as_completed(futures):
            out=futures[future];r=future.result();g=groups[out]
            e.write(out/f"{r['controller']}_{r['kind']}_{r['seed']}.json",r)
            g['results'].append(r)
            e.write(out/'summary.json',dict(g,completed=len(g['results'])))
            print(json.dumps(dict(run=out.name,**{k:v for k,v in r.items() if k!='trace'})),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('out',nargs='+')
    p.add_argument('--workers',type=int,default=3);main(p.parse_args())
