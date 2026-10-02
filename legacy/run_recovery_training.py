"""One resumable training chunk and any due validation; test cases never select weights."""
import json,subprocess,sys,hashlib
from pathlib import Path
ROOT=Path('runs/recovery_v1')
CHECKS=(0,8192,16384,32768,65536)

def main():
    train=[56000,56001,56003,56004,56005]
    if not all((ROOT/f'{s}.case.json').exists() for s in train):
        print(json.dumps(dict(waiting='training snapshots')));return
    envs=4 if all((ROOT/f'{s}.case.json').exists() for s in [56002,56007,56008]) else 2
    latest=sorted((ROOT/'models').glob('ppo_*.zip'))
    before=int(latest[-1].stem.split('_')[1]) if latest else 0
    with (ROOT/'execution.jsonl').open('a') as f:
        f.write(json.dumps(dict(before_steps=before,envs=envs,chunk=2048))+'\n')
    subprocess.run([sys.executable,'train_recovery.py','--chunk','2048','--total','65536','--envs',str(envs)],check=True)
    if not (ROOT/'56006.case.json').exists():return
    for k in CHECKS:
        model=ROOT/'models'/f'ppo_{k:06d}.zip';out=ROOT/f'validation_{k:06d}.json'
        if model.exists() and not out.exists():
            subprocess.run([sys.executable,'evaluate_recovery.py','--model',str(model),'--split','validation','--out',str(out)],check=True)
    if all((ROOT/f'validation_{k:06d}.json').exists() for k in CHECKS):
        rows=[json.loads((ROOT/f'validation_{k:06d}.json').read_text()) for k in CHECKS]
        best=max(zip(CHECKS,rows),key=lambda kr:(kr[1]['recoveries'],kr[1]['mean_survival_fraction'],-kr[0]))
        path=best[1]['model']
        result=dict(selected_steps=best[0],model=path,sha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),
            selection='validation only: recoveries, survival fraction, earlier checkpoint',
            candidates=[dict(steps=k,recoveries=r['recoveries'],windows=r['windows'],fraction=r['mean_survival_fraction']) for k,r in zip(CHECKS,rows)])
        dest=ROOT/'selection.json'
        if dest.exists():assert json.loads(dest.read_text())==result
        else:dest.write_text(json.dumps(result,indent=2))
        print(json.dumps(result),flush=True)

if __name__=='__main__':main()
