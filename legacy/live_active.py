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

async def trial(pg,ctrl,nick,cap=600.,clock=time.monotonic,controller_name='active_v5',decision_period=0.):
    await pg.wait_for_function('!window.playing && !document.getElementById("nick").disabled',timeout=60000)
    await pg.evaluate("() => { window.__activeStop=false; window.addEventListener('keydown', e => { if(e.key==='Escape') window.__activeStop=true; }); }")
    await pg.fill('#nick',nick);await pg.press('#nick','Enter')
    await pg.wait_for_function('window.playing && window.slither',timeout=60000)
    start=clock();cmd=None;times=[];length=0;rank=None;next_log=0.;alive=False;reason='unknown'
    print(json.dumps(dict(event='playing',nick=nick,controller=controller_name,cap_s=cap)),flush=True)
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
        await asyncio.sleep(max(.001,decision_period-(clock()-now)))
    return dict(reason=reason,seconds=round(clock()-start,1),alive_at_last_observation=alive,
        shield_interventions=int(ctrl.last.get('shield_interventions',0)),
        shield_decisions=int(ctrl.last.get('shield_decisions',0)),
        L_max=int(length),best_rank=rank,decisions=len(times),
        decision_ms_mean=round(float(np.mean(times))*1000,1) if times else None,
        decision_ms_p95=round(float(np.percentile(times,95))*1000,1) if times else None,
        latency_assumption_s=.10,server_latency_measured=False)

async def main(*,day_limit=MAX_PER_DAY,authorization=None,recovery_model=None,recovery_shield=False):
    if recovery_shield and recovery_model is None:raise ValueError('recovery shield requires a PPO model')
    ROOT.mkdir(exist_ok=True)
    # Hold this lock through browser shutdown; only this single-trial adapter uses it.
    with (ROOT/'live_active.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        used=games_today()
        if day_limit>MAX_PER_DAY and not authorization:
            raise ValueError('extra trial requires an explicit authorization record')
        if used>=day_limit:raise RuntimeError('daily live-game limit reached')
        model_info={}
        if recovery_model is not None:
            import torch
            from stable_baselines3 import PPO
            from recovery_env import RecoveryController
            torch.set_num_threads(1)
            ctrl=RecoveryController(PPO.load(recovery_model,device='cpu'))
            controller_name='recovery_ppo'
            model_info=dict(model=str(recovery_model),model_sha256=hashlib.sha256(Path(recovery_model).read_bytes()).hexdigest(),
                recovery_source_sha256=hashlib.sha256(Path('recovery_env.py').read_bytes()).hexdigest(),
                shield_interventions=0,decision_period_s=2/30,pending_commands_known=False)
            if recovery_shield:
                from live_recovery_shield import ShieldedRecoveryController
                ctrl=ShieldedRecoveryController(ctrl)
                controller_name='recovery_ppo_shield'
                model_info.update(shield_source_sha256=hashlib.sha256(Path('live_recovery_shield.py').read_bytes()).hexdigest(),
                                  shield_parameters=ctrl.pl.p,shield_headings=ctrl.pl.rel.tolist())
        else:
            ctrl=ActiveController();controller_name='active_v5'
        nick=random.choice(GREEK)+random.choice(PLANETS)
        out=ROOT/f'live_active_{time.strftime("%Y%m%d_%H%M%S")}.jsonl'
        record=dict(at=time.strftime('%F %T'),ctrl=controller_name,nick=nick,status='reserved',games=1,cap_s=600,
            **model_info,
            day_limit=day_limit,authorization=authorization,
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
                    record.update(await trial(pg,ctrl,nick,controller_name=controller_name,
                        decision_period=2/30 if recovery_model is not None else 0.));record['status']='finished';save()
                    print(json.dumps(record),flush=True)
                finally:
                    if br is not None:await br.close()
        except Exception as exc:
            record.update(status='error',error=repr(exc)[:300]);save()
            print(json.dumps(record),flush=True)
            raise

if __name__=='__main__':asyncio.run(main())
