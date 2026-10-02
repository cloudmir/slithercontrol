"""One explicitly authorized visible live trial of the unchanged staged policy."""
import asyncio
import argparse
import base64
import fcntl
import gzip
import hashlib
import json
import pickle
import secrets
import time
from collections import deque
from pathlib import Path

import numpy as np
from playwright.async_api import async_playwright

from live import BLOCK_MOUSE_JS, CHROME, MAX_PER_DAY, STATE_JS, VIEW, games_today
from live_active import observation
from staged import make_controller
import win_chrome

CAP = float('inf')  # user 2026-09-24: no time limit, play until death (Esc still stops)
PERIOD = 2 / 30
VIEW_W, VIEW_H = 960, 600   # user: smaller test window is fine
DELAY_ASSUMPTION = .1
# Extend our existing observation adapter; no game implementation is copied.
# Geometry travels as base64 float32: the WSL<->Windows relay moves only ~2 MB/s,
# and crowded-scene JSON (~18 B/number) stalled decisions to 0.3-0.4 s.
OBSERVE_JS = """(R) => {
  const RB = R || 1150;   // body selection radius; pocket6 sends 800 most ticks
  if (window.slither && window.slither.dead) return null;  // death animation still has playing=true
  const read = (""" + STATE_JS + """);
  const d = read([null, false, """ + str(VIEW) + """]);
  if (!d) return null;
  const own = window.slither.pts.filter(p => !p.dying).flatMap(p => [p.xx, p.yy]);
  own.push(d.x, d.y);
  const pack = a => { const u = new Uint8Array(new Float32Array(a).buffer); let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s); };
  // Controllers use bodies within ~1.1k px (pocket grid +-1040, rays 650) and food
  // within ~0.8k px; heads stay at full view for the activity count.
  const near = (x, y, R) => (x - d.x) ** 2 + (y - d.y) ** 2 < R * R;
  const segs = [], food = [], sid = [];
  for (let i = 0; i < d.segs.length; i += 5)
    if (near(d.segs[i], d.segs[i + 1], RB) || near(d.segs[i + 2], d.segs[i + 3], RB)) { segs.push(...d.segs.slice(i, i + 5)); sid.push(d.sid[i / 5]); }
  for (let i = 0; i < d.food.length; i += 3) if (near(d.food[i], d.food[i + 1], 800)) food.push(d.food[i], d.food[i + 1], d.food[i + 2]);
  d.segs = segs; d.food = food; d.sid = pack(sid); d.hid = pack(d.hid);
  d.own_body = pack(own); d.segs = pack(d.segs); d.heads = pack(d.heads); d.food = pack(d.food);
  return d;
}"""


def unpack(raw):
    """Inverse of OBSERVE_JS packing (float32 -> float64 arrays)."""
    for key, width in (('own_body', 2), ('segs', 5), ('heads', 5), ('food', 3), ('sid', 1), ('hid', 1)):
        if isinstance(raw.get(key), str):
            raw[key] = np.frombuffer(base64.b64decode(raw[key]), '<f4').astype(float).reshape(-1, width)
            if width == 1: raw[key] = raw[key].ravel()
    return raw
COMMAND_JS = """([a, b]) => {
  if (!window.playing || !window.slither || window.slither.dead || window.__stagedStop) return false;
  window.__lastCmd = Date.now();
  window.xm = Math.cos(a) * 250; window.ym = Math.sin(a) * 250;
  window.setAcceleration(b ? 1 : 0);
  return true;
}"""


def contact_gap(state):
    """Model gap between our head circle and the nearest enemy body capsule/head (px).

    Uses the same radii the controllers assume (14.5*sc). Logged to check them
    against reality: a negative gap while alive means real radii are smaller;
    a positive gap at death means they are larger (or observation lag)."""
    p, r = np.array([state['x'], state['y']]), 14.5*state['sc']
    segs, heads = np.asarray(state['segs']).reshape(-1, 5), np.asarray(state['heads']).reshape(-1, 5)
    best = (np.inf, None)
    if len(segs):
        a, b = segs[:, :2], segs[:, 2:4]; ab = b-a
        t = np.clip(((p-a)*ab).sum(1)/np.maximum((ab*ab).sum(1), 1e-9), 0, 1)
        d = np.linalg.norm(p-(a+t[:, None]*ab), axis=1)-r-segs[:, 4]
        i = int(d.argmin()); best = (float(d[i]), segs[i].round(1).tolist())
    if len(heads):
        d = np.linalg.norm(heads[:, :2]-p, axis=1)-r-14.5*heads[:, 4]
        i = int(d.argmin())
        if d[i] < best[0]: best = (float(d[i]), ['head', *heads[i].round(2).tolist()])
    return best


NICKS = ('momo', 'toto', 'nana', 'coco', 'lulu', 'kiki', 'dodo', 'bibi', 'mimi', 'popo')


def nickname():
    # user 2026-09-25: keep the id simple (was 20 random i/l characters)
    return secrets.choice(NICKS)+str(secrets.randbelow(90)+10)


def live_controller(stage):
    if stage == 'pocket':
        from pocket import PocketController
        return PocketController()
    if stage == 'pocket2':
        from pocket2 import Pocket2Controller
        return Pocket2Controller()
    if stage == 'pocket3':
        from pocket3 import Pocket3Controller
        return Pocket3Controller()
    if stage == 'pocket4':
        from pocket4 import Pocket4Controller
        return Pocket4Controller()
    if stage == 'pocket5':
        from pocket5 import Pocket5Controller
        return Pocket5Controller()
    if stage == 'pocket6':
        from pocket6 import Pocket6Controller
        return Pocket6Controller(async_plan=True)
    if stage == 'pocket7':
        from pocket7 import Pocket7Controller
        return Pocket7Controller(async_plan=True)
    if stage == 'pocket8':
        from pocket8 import Pocket8Controller
        return Pocket8Controller(async_plan=True)
    if stage == 'pocket10':
        from pocket10 import Pocket10Controller
        return Pocket10Controller(async_plan=True)
    if stage == 'pocket11':
        from pocket11 import Pocket11Controller
        return Pocket11Controller(async_plan=True)
    if stage == 'pocket12':
        from pocket12 import Pocket12Controller
        return Pocket12Controller(async_plan=True)
    if stage == 'pocket13':
        from pocket13 import Pocket13Controller
        return Pocket13Controller()
    if stage == 'coil':
        return make_controller(stage)
    raise ValueError('unsupported live controller')


def staged_observation(raw, elapsed, delay=DELAY_ASSUMPTION):
    state = observation(raw, elapsed)
    body = np.asarray(state['own_body'], dtype=float)
    if body.ndim != 2 or body.shape[1] != 2 or not len(body) or not np.isfinite(body).all():
        raise ValueError('invalid own-body observation')
    state['own_body'] = body
    # Unknown server queue: project the observed target for an assumed 100 ms.
    # This is an adapter assumption, not the simulator's known command queue.
    state['pending'] = [(state['tgt'], bool(state['boost']))] * round(delay * 30)
    return state


async def trial(page, ctrl, nick, cap=CAP, controller_name='staged_coil', shot_dir=None, measure=False):
    cap = min(CAP, max(0., cap))
    await page.wait_for_function('!window.playing && !document.getElementById("nick").disabled', timeout=60000)
    if await page.locator('#nick').evaluate('(e) => e.maxLength >= 0 && e.maxLength < 20'):
        raise RuntimeError('nickname field too short')
    await page.evaluate("() => { window.__stagedStop=false; window.addEventListener('keydown', e => { if(e.key==='Escape') window.__stagedStop=true; }); }")
    # Dead-man switch: if the controller stops sending commands (process killed),
    # leave the game instead of letting the snake drive blind.
    await page.evaluate("() => setInterval(() => { if (window.playing && window.__lastCmd && Date.now()-window.__lastCmd > 1500) location.href='about:blank'; }, 250)")
    await page.fill('#nick', nick)
    if await page.input_value('#nick') != nick:
        raise RuntimeError('nickname was altered before submission')
    await page.press('#nick', 'Enter')
    await page.wait_for_function('window.playing && window.slither', timeout=60000)
    start = time.monotonic()
    meas = dict(ev=[], smp=[])
    if measure:
        from measure import MEASURE_JS
        await page.evaluate(MEASURE_JS)
    durations, mode_counts, ticks = [], {}, []
    maximum, last_length, rank, next_log = 0., 0., None, 0.
    reason, alive = 'time_cap', False
    recent, min_gap = deque(maxlen=45), (np.inf, None, None)
    defend = deque(maxlen=20000)   # every tick spent defending/coiling: enemy vs our radius, gap, ring state
    close = deque(maxlen=20000)    # every tick with a drawn gap < 30 px: calibrates the real collision reach
    blackbox = deque(maxlen=240)   # last ~8 s of full observations + decisions, saved with the game (offline replay)
    food_bins = [0, 1, 2, 3, 4, 6, 8, 10, 13, 16, 20, 30, 1e9]
    food_hist = np.zeros(len(food_bins) - 1, int)
    shots, close_saved, food_saved = deque(maxlen=8), [], []

    async def camera():
        # Background half-scale JPEGs (full-size shots stalled commands ~150 ms
        # over the Windows relay): last 4 s kept for the death moment; close
        # calls (gap < 15 px) saved at once.
        cdp = await page.context.new_cdp_session(page)
        clip = dict(x=0, y=0, width=VIEW_W, height=VIEW_H, scale=1.)   # small window, full-size capture
        while shot_dir is not None:
            await asyncio.sleep(.5)
            try:
                view = await page.evaluate('[window.gsc, window.view_xx, window.view_yy]')
                shots.append((round(time.monotonic()-start, 2), view, dict(recent[-1]) if recent else {},
                              base64.b64decode((await cdp.send('Page.captureScreenshot',
                                  dict(format='jpeg', quality=45, clip=clip)))['data'])))
            except Exception:
                return
            t, view, info, img = shots[-1]
            gap = info.get('gap')
            if gap is not None and gap < 15 and len(close_saved) < 30 and (not close_saved or t-close_saved[-1] >= 1):
                close_saved.append(t); (shot_dir / f'close_{t:07.2f}_gap{gap:.0f}.jpg').write_bytes(img)
            if info.get('mode') == 'cluster_run' and len(food_saved) < 20 and (not food_saved or t-food_saved[-1] >= 2):
                food_saved.append(t); (shot_dir / f'food_{t:07.2f}.jpg').write_bytes(img)
    print(json.dumps(dict(event='playing', nick=nick, controller=controller_name, cap_s=None if cap == float('inf') else cap)), flush=True)
    if shot_dir is not None: shot_dir.mkdir(exist_ok=True)
    cam = asyncio.create_task(camera())
    period = getattr(ctrl, 'period', PERIOD)
    view = getattr(ctrl, 'near_view', None)   # (near R, full R, full every N ticks)
    while time.monotonic() - start < cap:
        tick = time.monotonic(); ticks.append(tick)
        radius = None if view is None else (view[1] if len(ticks) % view[2] == 1 else view[0])
        if await asyncio.wait_for(page.evaluate('Boolean(window.__stagedStop)'), timeout=5):
            reason = 'user_escape'
            break
        raw = await asyncio.wait_for(page.evaluate(OBSERVE_JS, radius), timeout=5)
        if raw is None:
            reason, alive = 'death', False
            break
        alive = True
        # A slow control loop acts on older observations: grow the assumed
        # command delay by the recent loop period beyond the design period.
        lag = float(np.percentile(np.diff(ticks[-31:]), 90)) - period if len(ticks) > 5 else 0.
        raw = unpack(raw)
        state = staged_observation(raw, time.monotonic() - start, DELAY_ASSUMPTION + min(.3, max(0., lag)))
        state['sid'], state['hid'] = raw.get('sid'), raw.get('hid')
        gap, nearest = contact_gap(state)
        recent.append(dict(t=round(state['t'], 2), x=round(state['x'], 1), y=round(state['y'], 1),
                           sc=round(state['sc'], 3), gap=round(gap, 1), nearest=nearest,
                           food_n=len(state['food']), food_max=round(float(state['food'][:, 2].max()), 1) if len(state['food']) else None))
        if gap < min_gap[0]: min_gap = (gap, round(state['t'], 2), nearest)
        if gap < 30:
            close.append(dict(t=round(state['t'], 2), x=round(state['x'], 1), y=round(state['y'], 1), ang=round(state['ang'], 3),
                              gap=round(gap, 1), nearest=nearest, our_r=round(14.5 * state['sc'], 1)))
        if len(state['food']): food_hist += np.histogram(state['food'][:, 2], food_bins)[0]
        before = time.monotonic()
        cmd, _ = await asyncio.wait_for(asyncio.to_thread(ctrl, state), timeout=1.)
        durations.append(time.monotonic() - before)
        recent[-1].update(mode=ctrl.last.get('mode'), boost=bool(cmd[1]), cluster=ctrl.last.get('cluster'))
        blackbox.append(dict(state={k: (v.astype(np.float32) if isinstance(v, np.ndarray) else v) for k, v in state.items()},
                             cmd=(float(cmd[0]), bool(cmd[1])), last=dict(ctrl.last), wall_t=time.time()))
        if ctrl.last.get('defending') or str(ctrl.last.get('mode')).startswith(('coil', 'tight', 'exit', 'pocket_loop')):
            plan = getattr(ctrl, 'plan', None) or {}
            defend.append(dict(t=round(state['t'], 2), x=round(state['x'], 1), y=round(state['y'], 1), mode=ctrl.last.get('mode'),
                               boost=bool(cmd[1]), gap=round(gap, 1), near_r=nearest[4] if nearest and nearest[0] != 'head' else None,
                               our_r=round(14.5 * state['sc'], 1), thick=ctrl.last.get('thick'), thick_share=ctrl.last.get('thick_share'),
                               enemy_r=ctrl.last.get('enemy_r'), coil_gap=ctrl.last.get('coil_gap'),
                               coverage=round(plan.get('coverage', 0.), 2), enclosed=plan.get('enclosed')))
        last_length = state['L']
        maximum = max(maximum, last_length)
        if state.get('rank'):
            rank = state['rank'] if rank is None else min(rank, state['rank'])
        if time.monotonic() - start >= cap:
            break
        applied = await asyncio.wait_for(page.evaluate(COMMAND_JS, [float(cmd[0]), bool(cmd[1])]), timeout=5)
        if not applied:
            reason = 'user_escape' if await page.evaluate('Boolean(window.__stagedStop)') else 'death'
            if reason == 'death': alive = False
            break
        if measure and len(ticks) % 30 == 0:
            got = await asyncio.wait_for(page.evaluate('window.__measDrain ? window.__measDrain() : null'), timeout=5)
            if got: meas['ev'] += got['ev']; meas['smp'] += got['smp']
        mode = 'body-follow' if ctrl.last.get('loop_closed') else ctrl.last.get('mode', 'unknown')
        mode_counts[mode] = mode_counts.get(mode, 0) + 1
        elapsed = time.monotonic() - start
        if elapsed >= next_log:
            print(json.dumps(dict(event='progress', seconds=round(elapsed, 1), L=round(last_length),
                max_L=round(maximum), rank=state.get('rank'), mode=mode,
                decision_ms=round(durations[-1] * 1000, 1))), flush=True)
            next_log = elapsed + 30
        await asyncio.sleep(max(.001, min(period - (time.monotonic() - tick), cap - elapsed)))
    cam.cancel()
    if measure and shot_dir:
        try:
            got = await asyncio.wait_for(page.evaluate('window.__measDrain ? window.__measDrain() : null'), timeout=5)
            if got: meas['ev'] += got['ev']; meas['smp'] += got['smp']
        except Exception:
            pass
        with gzip.open(shot_dir / 'measure.json.gz', 'wt') as f:
            json.dump(meas, f)
    if shot_dir and blackbox:
        with gzip.open(shot_dir / 'blackbox.pkl.gz', 'wb') as f:
            pickle.dump(list(blackbox), f)
    views = {}
    for t, view, info, img in shots:
        (shot_dir / f'last_{t:07.2f}.jpg').write_bytes(img); views[f'last_{t:07.2f}.jpg'] = dict(view=view, **info)
    return dict(reason=reason, seconds=round(time.monotonic() - start, 1), screenshots=dict(dir=str(shot_dir), last=views, close=len(close_saved), food=len(food_saved)) if shot_dir else None,
                alive_at_last_observation=alive, L_max=int(maximum), L_last=int(last_length), best_rank=rank,
                decisions=len(durations), mode_counts=mode_counts,
                decision_ms_p95=round(float(np.percentile(durations, 95)) * 1000, 1) if durations else None,
                loop_ms=dict(zip(('p50', 'p95', 'max'), np.round(np.percentile(np.diff(ticks), [50, 95, 100]) * 1000, 1).tolist())) if len(ticks) > 2 else None,
                food_size_hist=dict(bins=food_bins[:-1], counts=food_hist.tolist()),
                min_gap_alive=dict(gap=min_gap[0] if np.isfinite(min_gap[0]) else None, t=min_gap[1], nearest=min_gap[2]),
                last_3s=list(recent), defend_trace=list(defend), close_trace=list(close))


async def main(stage='coil', windows=True, measure=False):
    root = Path('runs')
    root.mkdir(exist_ok=True)
    with (root / 'live_active.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        used = games_today()
        if used >= MAX_PER_DAY:
            raise RuntimeError('daily live-game limit reached')
        nick = nickname()
        ctrl = live_controller(stage)
        controller_name = stage if stage.startswith('pocket') else 'staged_coil'
        out = root / f'live_staged_{time.strftime("%Y%m%d_%H%M%S")}.jsonl'
        names = ['live_staged.py', 'staged.py', 'brain.py', 'geometry.py', 'live.py', 'live_active.py']
        if stage.startswith('pocket'): names.append('pocket.py')
        if stage in ('pocket2', 'pocket3', 'pocket4', 'pocket5', 'pocket13'): names.append('pocket2.py')
        if stage in ('pocket3', 'pocket4', 'pocket5', 'pocket13'): names.append('pocket3.py')
        if stage == 'pocket13': names.append('pocket13.py')
        if stage in ('pocket4', 'pocket5'): names.append('pocket4.py')
        if stage in ('pocket5', 'pocket6'): names.append('pocket5.py')
        if stage in ('pocket6', 'pocket7', 'pocket8', 'pocket10', 'pocket11', 'pocket12'): names += ['pocket2.py', 'pocket3.py', 'pocket4.py', 'pocket6.py']
        if stage in ('pocket7', 'pocket8', 'pocket10', 'pocket11', 'pocket12'): names += ['pocket5.py', 'pocket7.py']
        if stage in ('pocket8', 'pocket10', 'pocket11', 'pocket12'): names.append('pocket8.py')
        if stage in ('pocket11', 'pocket12'): names.append('pocket11.py')
        if stage == 'pocket12': names.append('pocket12.py')
        if stage == 'pocket10': names.append('pocket10.py')
        record = dict(at=time.strftime('%F %T'), ctrl=controller_name, nick=nick,
            status='reserved', games=1, cap_s=None if CAP == float('inf') else CAP, day_limit=None if MAX_PER_DAY == float('inf') else MAX_PER_DAY,
            authorization={'pocket': 'decision-pocket-live-20260924', 'pocket2': 'decision-pocket2-20260924', 'pocket3': 'decision-pocket3-20260924', 'pocket4': 'decision-pocket4-20260924', 'pocket5': 'decision-pocket5-20260924', 'pocket6': 'decision-pocket6-realtime-20260924', 'pocket7': 'decision-pocket7-coil-20260924', 'pocket8': 'decision-pocket8-cut-20260924', 'pocket10': 'decision-pocket10-thick-20260924', 'pocket11': 'decision-pocket11-live-data-20260924', 'pocket12': 'decision-pocket11-live-data-20260924', 'pocket13': 'decision-pocket13-turn-commit-20260925'}.get(stage, 'decision-staged-live-20260924'), browser_executable=win_chrome.WIN_CHROME if windows else CHROME,
            decision_period_s=getattr(ctrl, 'period', PERIOD), latency_assumption_s=DELAY_ASSUMPTION,
            server_latency_measured=False, pending_commands_known=False,
            hashes={name: hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in names})
        def save():
            tmp = out.with_suffix('.tmp')
            tmp.write_text(json.dumps(record) + '\n')
            tmp.replace(out)
        save()
        print(json.dumps(dict(event='reserved', nick=nick, prior_games=used, log=str(out))), flush=True)
        try:
            async with async_playwright() as pw:
                if windows:  # user's Windows Chrome, separate profile, loopback-only debug port
                    await asyncio.to_thread(win_chrome.launch)
                    relay, url = await win_chrome.relay()
                    browser = await pw.chromium.connect_over_cdp(url, timeout=60000)
                else:
                    browser = await pw.chromium.launch(headless=False, executable_path=CHROME, args=[
                        '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                        '--disable-backgrounding-occluded-windows'])
                try:
                    if windows:
                        page = await browser.contexts[0].new_page()
                        await page.set_viewport_size({'width': VIEW_W, 'height': VIEW_H})
                    else:
                        page = await browser.new_page(viewport={'width': VIEW_W, 'height': VIEW_H})
                    await page.goto('http://slither.io/', wait_until='domcontentloaded')
                    await page.wait_for_function('typeof connect==="function" && document.getElementById("nick")', timeout=60000)
                    await page.evaluate(BLOCK_MOUSE_JS)
                    record.update(await trial(page, ctrl, nick, controller_name=controller_name, shot_dir=out.with_suffix(''), measure=measure))
                    record['status'] = 'finished'
                    save()
                finally:
                    if hasattr(ctrl, 'close'): ctrl.close()
                    await browser.close()
                    if windows:
                        await asyncio.to_thread(win_chrome.close)
                        relay.close()
        except BaseException as exc:
            record.update(status='error', error=repr(exc)[:300])
            save()
            raise
        finally:
            print(json.dumps(record), flush=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage',choices=['coil','pocket','pocket2','pocket3','pocket4','pocket5','pocket6','pocket7','pocket8','pocket10','pocket11','pocket12','pocket13'],default='pocket13')
    parser.add_argument('--linux',action='store_true',help="use the WSL Playwright browser instead of Windows Chrome (default)")
    parser.add_argument('--measure',action='store_true',help='record every visible snake (deaths, speeds, turns) for calibration')
    args=parser.parse_args()
    asyncio.run(main(args.stage, not args.linux, args.measure))
