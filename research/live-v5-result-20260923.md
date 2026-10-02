# Live v5 results and offline regression evidence — 2026-09-23


## runs/live_active_20260923_221341.jsonl
SHA256 6af6b546ae291d4e044ac3a4664d443018df2b6deaa9a87b0d0f90ebf78a638c
```
{"at": "2026-09-23 22:13:41", "ctrl": "active_v5", "nick": "PoseidonUranus", "status": "finished", "games": 1, "cap_s": 600, "hashes": {"active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757", "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9", "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87", "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68", "live_active.py": "46044c65d6b77dee09a14896d1e784799a0f10ad5cae2aba3d6e448bc9e98c86"}, "reason": "death", "seconds": 17.1, "alive_at_last_observation": false, "L_max": 67, "best_rank": 280, "decisions": 70, "decision_ms_mean": 86.2, "decision_ms_p95": 156.9, "latency_assumption_s": 0.1, "server_latency_measured": false}

```


## runs/live_active_20260923_221517.jsonl
SHA256 3a8d74887dd81ee7b8738e12c76077a3631dd38d16d335bc56e1b6ca08d2798e
```
{"at": "2026-09-23 22:15:17", "ctrl": "active_v5", "nick": "EosUranus", "status": "error", "games": 1, "cap_s": 600, "hashes": {"active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757", "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9", "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87", "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68", "live_active.py": "46044c65d6b77dee09a14896d1e784799a0f10ad5cae2aba3d6e448bc9e98c86"}, "error": "UFuncTypeError(<ufunc 'add'>, 'same_kind', dtype('float64'), dtype('int64'), 2)"}

```


## runs/live_active_regression.txt
SHA256 79e648ce1700ecf1517cdd29e849c751dc81426560bbb5fb23157a7a352f1582
```
test_integer_zero_matches_float_angle (test_live_active.LiveObservationTests.test_integer_zero_matches_float_angle) ... ok
test_nonfinite_scalar_rejected (test_live_active.LiveObservationTests.test_nonfinite_scalar_rejected) ... ok

----------------------------------------------------------------------
Ran 2 tests in 0.021s

OK

```


## live_active.py
SHA256 2bfea6c640f39f36c0b6712ed64d3cfcb714c6fed20a7430fbd5b1c3ea8a7ef8
```
"""One explicitly requested, visible v5 live trial. No reconnect or state recording."""
import asyncio,fcntl,hashlib,json,random,time
from pathlib import Path
import numpy as np
from playwright.async_api import async_playwright
from active import ActiveController
from live import open_game,to_state,STATE_JS,VIEW,GREEK,PLANETS,games_today,MAX_PER_DAY

ROOT=Path('runs')

def observation(d,elapsed):
    S=to_state(d)
    S['t']=elapsed
    # Server command delay is unknown. Preserve the controller's 0.10 s assumption;
    # do not invent the simulator's exact command queue for the real server.
    S['delay']=.10
    for k in ('x','y','ang','tgt','sp','sc','L'):
        if not np.isfinite(S[k]):raise ValueError('invalid live observation: '+k)
        # JSON represents exact zero as an integer; the planner integrates angles
        # in-place and requires floating-point state even for integral values.
        S[k]=float(S[k])
    if len(S['wall'])!=3 or not np.isfinite(S['wall']).all() or S['wall'][2]<=0:
        raise ValueError('invalid wall observation')
    for k in ('heads','segs','food'):
        if not np.isfinite(S[k]).all():raise ValueError('invalid geometry: '+k)
    return S

async def trial(pg,ctrl,nick,cap=600.,clock=time.monotonic):
    await pg.wait_for_function('!window.playing && !document.getElementById("nick").disabled',timeout=60000)
    await pg.evaluate("() => { window.__activeStop=false; window.addEventListener('keydown', e => { if(e.key==='Escape') window.__activeStop=true; }); }")
    await pg.fill('#nick',nick);await pg.press('#nick','Enter')
    await pg.wait_for_function('window.playing && window.slither',timeout=60000)
    start=clock();cmd=None;times=[];length=0;rank=None;next_log=0.;alive=False;reason='unknown'
    print(json.dumps(dict(event='playing',nick=nick,controller='active_v5',cap_s=cap)),flush=True)
    while True:
        now=clock()
        if now-start>=cap:reason='time_cap';break
        if await pg.evaluate('Boolean(window.__activeStop)'):reason='user_escape';break
        d=await pg.evaluate(STATE_JS,[None if cmd is None else float(cmd[0]),bool(cmd and cmd[1]),VIEW])
        if d is None:alive=False;reason='death';break
        alive=True
        S=observation(d,clock()-start)
        # CPU planner work is timed separately; a stalled decision ends the trial.
        before=clock();cmd,_=ctrl(S);duration=clock()-before;times.append(duration)
        if duration>1.:raise RuntimeError('controller decision exceeded one second')
        length=max(length,S['L'])
        if S.get('rank'):rank=S['rank'] if rank is None else min(rank,S['rank'])
        elapsed=clock()-start
        if elapsed>=next_log:
            print(json.dumps(dict(event='progress',seconds=round(elapsed,1),L=S['L'],max_L=length,
                rank=S.get('rank'),decision_ms=round(duration*1000,1),mode=ctrl.last.get('mode'))),flush=True)
            next_log=elapsed+30
        await asyncio.sleep(.001)
    return dict(reason=reason,seconds=round(clock()-start,1),alive_at_last_observation=alive,
        L_max=int(length),best_rank=rank,decisions=len(times),
        decision_ms_mean=round(float(np.mean(times))*1000,1) if times else None,
        decision_ms_p95=round(float(np.percentile(times,95))*1000,1) if times else None,
        latency_assumption_s=.10,server_latency_measured=False)

async def main():
    ROOT.mkdir(exist_ok=True)
    # Hold this lock through browser shutdown; only this single-trial adapter uses it.
    with (ROOT/'live_active.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        used=games_today()
        if used>=MAX_PER_DAY:raise RuntimeError('daily live-game limit reached')
        nick=random.choice(GREEK)+random.choice(PLANETS)
        out=ROOT/f'live_active_{time.strftime("%Y%m%d_%H%M%S")}.jsonl'
        record=dict(at=time.strftime('%F %T'),ctrl='active_v5',nick=nick,status='reserved',games=1,cap_s=600,
            hashes={n:hashlib.sha256(Path(n).read_bytes()).hexdigest() for n in ['active.py','brain.py','activity.py','geometry.py','live_active.py']})
        def save():
            tmp=out.with_suffix('.tmp');tmp.write_text(json.dumps(record)+'\n');tmp.replace(out)
        save() # An interrupted/error attempt also consumes one slot, never two.
        print(json.dumps(dict(event='reserved',nick=nick,prior_games=used,log=str(out))),flush=True)
        br=None
        try:
            async with async_playwright() as pw:
                try:
                    br,pg=await open_game(pw,headless=False)
                    record.update(await trial(pg,ActiveController(),nick));record['status']='finished';save()
                    print(json.dumps(record),flush=True)
                finally:
                    if br is not None:await br.close()
        except Exception as exc:
            record.update(status='error',error=repr(exc)[:300]);save()
            print(json.dumps(record),flush=True)
            raise

if __name__=='__main__':asyncio.run(main())

```


## test_live_active.py
SHA256 13d91c2411e41cc976682ec24254bb99415bb8c970fc6838ae94b74d4df726ca
```
"""Offline regression for the live JSON-to-controller boundary."""
import unittest
import numpy as np
from active import ActiveController
from live_active import observation


def wire(angle=0):
    return dict(x=0,y=0,ang=angle,tgt=0,sp=5.8,sc=1,L=100,
                boost=False,wall=[0,0,4500],heads=[],segs=[],food=[])


class LiveObservationTests(unittest.TestCase):
    def test_integer_zero_matches_float_angle(self):
        integer_state=observation(wire(0),0.)
        float_state=observation(wire(0.),0.)
        self.assertIs(type(integer_state['ang']),float)
        integer_cmd,_=ActiveController()(integer_state)
        float_cmd,_=ActiveController()(float_state)
        np.testing.assert_allclose(integer_cmd,float_cmd)
        self.assertTrue(np.isfinite(integer_cmd).all())

    def test_nonfinite_scalar_rejected(self):
        with self.assertRaisesRegex(ValueError,'ang'):
            observation(wire(float('nan')),0.)


if __name__=='__main__':unittest.main()

```


## Offline reproduction without scalar normalization
UFuncTypeError(<ufunc 'add'>, 'same_kind', dtype('float64'), dtype('int64'), 2)


## Frozen active.py SHA256
5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757
