"""Zero-base live runner: Windows Chrome, one game, one controller, full records.

Old runners/controllers live in legacy/ (user 2026-09-25). This file only
connects to the game, observes, sends commands and records:
- runs/live_<ts>.jsonl            summary (outcome, loop timing, controller trace)
- runs/live_<ts>/blackbox.pkl.gz  last ~30 s of observations + decisions
- runs/live_<ts>/measure.json.gz  every visible snake's deaths and motion (measure.py)
- runs/live_<ts>/last_*.jpg       screenshots of the last ~4 s

State given to a controller every tick (px, radians; r = drawn body radius 14.5*sc):
  x, y, ang, sp, sc, L, boost, t
  segs (N,5) x1 y1 x2 y2 r  with sid (N,) owner id, ordered tail -> head per snake
  heads (M,5) x y ang sp sc with hid (M,)
  food (K,3) x y size,  own (P,2) our body tail -> head,  wall (cx, cy, R)
Controller: ctrl(state) -> ((angle, boost), info); ctrl.last (dict) is logged,
ctrl.last['trace'] (dict), when present, is appended to the game's trace.
"""
import argparse
import asyncio
import os
import hashlib
import base64
import gzip
import json
import pickle
import secrets
import time
from collections import deque
from pathlib import Path

import numpy as np
from playwright.async_api import async_playwright

import win_chrome

VIEW_W, VIEW_H = 960, 600
RADIUS = 1150            # px of bodies sent each tick
FOOD_RADIUS = 3000       # px of food sent (user: far remains were never seen; the client holds what its sectors hold)
NICK_NAMES = tuple(('leo max theo hugo otto finn nico milo luca remy '
                    'ivy zoe luna nova ruby iris cleo june olive hazel '
                    'ash alex sam robin jules eden felix oscar elio noel').split())
NICK_WORDS = tuple(('fox wolf otter owl lynx panda koala gecko sparrow raven '
                    'maple cedar willow clover moss fern pebble river brook ocean '
                    'comet moon star cloud snow frost breeze dusk dawn ember '
                    'cocoa peach plum kiwi melon mango lemon berry cookie waffle').split())
NICK_MODIFIERS = tuple(('little quiet mellow sleepy sunny silver blue green amber '
                        'soft wild tiny lucky slow warm cool misty golden velvet lunar').split())
_recent_nicks = deque(maxlen=64)

OBSERVE_JS = """([R, RF]) => {
  const s = window.slither;
  if (!window.playing || !s || s.dead) return null;
  const hx = s.xx, hy = s.yy, R2 = R * R, inr = (x, y) => (x-hx)*(x-hx) + (y-hy)*(y-hy) < R2,
        RF2 = RF * RF, inf = (x, y) => (x-hx)*(x-hx) + (y-hy)*(y-hy) < RF2;
  const segs = [], sid = [], heads = [], hid = [], food = [], own = [];
  for (const o of slithers) {
    if (o === s || o.dead) continue;
    const r = 14.5 * o.sc, P = o.pts;
    let px = null, py = null, pin = false;
    for (let i = 0; i <= P.length; i++) {
      let x, y;
      if (i < P.length) { if (P[i].dying) continue; x = P[i].xx; y = P[i].yy; } else { x = o.xx; y = o.yy; }
      const inn = inr(x, y);
      if (px !== null && (inn || pin)) { segs.push(px, py, x, y, r); sid.push(o.id); }
      px = x; py = y; pin = inn;
    }
    if (inf(o.xx, o.yy)) { heads.push(o.xx, o.yy, o.ang, o.sp, o.sc); hid.push(o.id); }
  }
  for (let i = 0; i < foods_c; i++) { const f = foods[i]; if (f && !f.eaten && inf(f.xx, f.yy)) food.push(f.xx, f.yy, f.sz); }
  for (const p of s.pts) if (!p.dying) own.push(p.xx, p.yy);
  own.push(hx, hy);
  const pack = a => { const u = new Uint8Array(new Float32Array(a).buffer); let t = '';
    for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(t); };
  const sct = s.sct + s.rsc;
  return {pt: performance.now(), x: hx, y: hy, ang: s.ang, sp: s.sp, sc: s.sc, boost: s.md, wall: [grd, grd, flux_grd], rank,
          L: Math.floor((fpsls[sct] + s.fam / fmlts[sct] - 1) * 15 - 5),
          segs: pack(segs), sid: pack(sid), heads: pack(heads), hid: pack(hid), food: pack(food), own: pack(own)};
}"""
COMMAND_JS = """([a, b]) => {
  if (!window.playing || !window.slither || window.slither.dead || window.__stop) return false;
  window.__lastCmd = Date.now();
  window.xm = Math.cos(a) * 250; window.ym = Math.sin(a) * 250;
  window.setAcceleration(b ? 1 : 0);
  return performance.now();            // page clock when the command took effect in the page
}"""
SETUP_JS = """() => {
  window.__stop = false;
  for (const ev of ['mousemove', 'mousedown', 'mouseup'])
    window.addEventListener(ev, e => { if (window.playing) e.stopImmediatePropagation(); }, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') window.__stop = true; });
  // Dead-man switch: no command for 1.5 s (controller gone) -> leave the game.
  setInterval(() => { if (window.playing && window.__lastCmd && Date.now() - window.__lastCmd > 1500) location.href = 'about:blank'; }, 250);
}"""
WIDTH = dict(segs=5, sid=1, heads=5, hid=1, food=3, own=2)


def unpack(raw):
    s = dict(raw)
    for k, w in WIDTH.items():
        a = np.frombuffer(base64.b64decode(raw[k]), '<f4').astype(float)
        s[k] = a if w == 1 else a.reshape(-1, w)
    s['wall'] = tuple(float(v) for v in raw['wall'])
    return s


def nickname():
    """Readable names with varied forms; avoid recent repeats in this process."""
    while True:
        style = secrets.randbelow(10)
        if style < 3:
            parts = [secrets.choice(NICK_NAMES)]
        elif style < 6:
            parts = [secrets.choice(NICK_WORDS)]
        else:
            parts = [secrets.choice(NICK_MODIFIERS), secrets.choice(NICK_WORDS)]
        if secrets.randbelow(3) == 0:
            parts = [part.capitalize() for part in parts]
        nick = secrets.choice(('', ' ', '_')).join(parts)
        if secrets.randbelow(5) == 0:
            nick += str(secrets.randbelow(secrets.choice((10, 100, 1000))))
        key = nick.casefold()
        if key not in _recent_nicks and not any(s in key for s in ('bot', 'ai')):
            _recent_nicks.append(key)
            return nick


async def play(page, ctrl, out_dir, measure):
    await page.evaluate(SETUP_JS)
    nick = nickname()
    await page.fill('#nick', nick)
    await page.press('#nick', 'Enter')
    await page.wait_for_function('window.playing && window.slither', timeout=60000)
    if measure:
        from measure import MEASURE_JS
        await page.evaluate(MEASURE_JS)
    start = time.monotonic()
    period = getattr(ctrl, 'period', 1/30)
    ticks, work, trace, box, shots = [], [], [], deque(maxlen=900), deque(maxlen=8)
    stage = []                                   # per tick ms: observe, decide, command sent (2.a)
    meas = dict(ev=[], smp=[])
    modes, reason, L_max = {}, 'death', 0

    async def camera():
        cdp = await page.context.new_cdp_session(page)
        clip = dict(x=0, y=0, width=VIEW_W, height=VIEW_H, scale=1.)
        while True:
            await asyncio.sleep(.5)
            try:
                img = (await cdp.send('Page.captureScreenshot', dict(format='jpeg', quality=45, clip=clip)))['data']
                shots.append((round(time.monotonic()-start, 2), base64.b64decode(img)))
            except Exception:
                return

    async def drain():
        got = await page.evaluate('window.__measDrain ? window.__measDrain() : null')
        if got: meas['ev'].extend(got['ev']); meas['smp'].extend(got['smp'])

    cam = asyncio.create_task(camera())
    try:
        while True:
            tick = time.monotonic(); ticks.append(tick)
            raw = await asyncio.wait_for(page.evaluate(OBSERVE_JS, [RADIUS, FOOD_RADIUS]), timeout=5)
            if raw is None:
                break
            t_obs = time.monotonic()
            s = unpack(raw); s['t'] = tick-start
            L_max = max(L_max, s['L'])
            cmd, _ = await asyncio.wait_for(asyncio.to_thread(ctrl, s), timeout=1.)
            t_dec = time.monotonic()
            sent = await asyncio.wait_for(page.evaluate(COMMAND_JS, [float(cmd[0]), bool(cmd[1])]), timeout=5)
            stage.append(((t_obs-tick)*1e3, (t_dec-t_obs)*1e3, (time.monotonic()-tick)*1e3))
            work.append(time.monotonic()-tick)
            last = dict(getattr(ctrl, 'last', {}))
            modes[last.get('mode')] = modes.get(last.get('mode'), 0)+1
            # page clock: state read -> command applied, ms (the part of the latency that is ours)
            page_ms = round(sent-s['pt'], 1) if sent and 'pt' in s else None
            if 'trace' in last: trace.append(dict(t=round(s['t'], 3), page_ms=page_ms, **last['trace']))
            box.append(dict(state={k: (v.astype(np.float32) if isinstance(v, np.ndarray) else v) for k, v in s.items()},
                            cmd=(float(cmd[0]), bool(cmd[1])), last=last, page_ms=page_ms))
            if not sent:
                reason = 'user_escape' if await page.evaluate('window.__stop') else 'death'
                break
            if measure and len(ticks) % 30 == 0:
                await drain()
            if len(ticks) % 900 == 0:
                print(json.dumps(dict(event='progress', t=round(s['t']), L=s['L'], mode=last.get('mode'))), flush=True)
            await asyncio.sleep(max(.001, period-(time.monotonic()-tick)))
    finally:
        cam.cancel()
        out_dir.mkdir(exist_ok=True)
        with gzip.open(out_dir/'blackbox.pkl.gz', 'wb') as f:
            pickle.dump(list(box), f)
        if measure:
            try: await drain()
            except Exception: pass
            with gzip.open(out_dir/'measure.json.gz', 'wt') as f:
                json.dump(meas, f)
        for t, img in shots:
            (out_dir/f'last_{t:07.2f}.jpg').write_bytes(img)
    d = np.diff(ticks)*1000 if len(ticks) > 2 else np.zeros(1)
    return dict(nick=nick, reason=reason, seconds=round(time.monotonic()-start, 1), L_max=int(L_max), modes=modes,
                loop_ms=dict(p50=round(float(np.percentile(d, 50)), 1), p95=round(float(np.percentile(d, 95)), 1)),
                work_ms_p95=round(float(np.percentile(work, 95))*1000, 1) if work else None,
                stage_ms={k: [round(float(v), 1) for v in np.percentile(np.array(stage)[:, i], [50, 95])] for i, k in
                          enumerate(('observe', 'decide', 'obs_to_cmd'))} if stage else None, trace=trace)


RUNNER_SHA = hashlib.sha256(open(__file__, 'rb').read()).hexdigest()


async def main(controller, measure, games):
    import importlib
    module, _, cls = controller.partition(':')
    async with async_playwright() as pw:
        await asyncio.to_thread(win_chrome.launch)
        relay, url = await win_chrome.relay()
        browser = await pw.chromium.connect_over_cdp(url, timeout=60000)
        browser.on('disconnected', lambda *_: print(json.dumps(dict(event='browser_disconnected', at=time.strftime('%T'))), flush=True))
        try:
            page = None
            # Codex review 2: identify the code actually imported (hashed once, at batch start) and its profile.
            mod = importlib.import_module(module)
            ident = dict(code_sha256=hashlib.sha256(Path(mod.__file__).read_bytes()).hexdigest(),
                         runner_sha256=RUNNER_SHA, profile=getattr(mod, 'PROFILE', None))
            for g in range(games):
                # A fresh tab per game: twice (P9, P10) the old tab was already closed when game 2 began.
                # Open the new tab before closing the old: closing the last tab took the window (and the new tab
                # opened right after it) down with it - P12 game 8, P13 game 4 TargetClosedError in goto.
                # P14 game 3: the context itself was gone (IndexError) - same browser, a fresh context.
                ctx = browser.contexts[0] if browser.contexts else await browser.new_context()
                old, page = page, await ctx.new_page()
                # Why do pages vanish (P9-P16, 7 stops)? Log crash / close / disconnect with a timestamp.
                page.on('crash', lambda *_, g_=g+1: print(json.dumps(dict(event='page_crash', game=g_, at=time.strftime('%T'))), flush=True))
                page.on('close', lambda *_, g_=g+1: print(json.dumps(dict(event='page_close', game=g_, at=time.strftime('%T'))), flush=True))
                if old is not None and not old.is_closed():
                    print(json.dumps(dict(event='closing_old_page', game=g, at=time.strftime('%T'))), flush=True)   # intended
                    await old.close()
                await page.set_viewport_size({'width': VIEW_W, 'height': VIEW_H})
                # Fresh page per game: after a death the dead-man switch may already have left for about:blank.
                # Whole setup bounded: 2026-09-25 14:22 the runner hung here for 30 min between games.
                await asyncio.wait_for(page.goto('http://slither.io/', wait_until='domcontentloaded'), timeout=60)
                await page.wait_for_function('typeof connect==="function" && document.getElementById("nick")', timeout=60000)
                ctrl = getattr(importlib.import_module(module), cls or 'Controller')()
                out = Path('runs')/f'live_{time.strftime("%Y%m%d_%H%M%S")}'
                # Codex 2026-09-25: which code and settings produced this game.
                record = dict(at=time.strftime('%F %T'), controller=controller, game=g+1, status='started', **ident)
                save = lambda: out.with_suffix('.jsonl').write_text(json.dumps(record)+'\n')
                save()
                print(json.dumps(dict(event='start', game=g+1, log=str(out.with_suffix('.jsonl')))), flush=True)
                try:
                    # Back on the menu after a death; one browser, no reconnect on errors.
                    await page.wait_for_function('!window.playing && !document.getElementById("nick").disabled', timeout=60000)
                    record.update(await play(page, ctrl, out, measure), status='finished')
                except BaseException as exc:
                    record.update(status='error', error=repr(exc)[:300])
                    raise
                finally:
                    save()
                    print(json.dumps({k: v for k, v in record.items() if k != 'trace'}), flush=True)
                if record['reason'] == 'user_escape':
                    break
                await asyncio.sleep(3)
        finally:
            print(json.dumps(dict(event='closing_browser', at=time.strftime('%T'))), flush=True)   # intended
            await browser.close()
            await asyncio.to_thread(win_chrome.close)
            relay.close()


if __name__ == '__main__':
    import signal     # background jobs ignore SIGINT; SIGINT/SIGTERM -> KeyboardInterrupt so the game's records get saved
    signal.signal(signal.SIGINT, signal.default_int_handler); signal.signal(signal.SIGTERM, signal.default_int_handler)
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('controller', help='module[:Class], e.g. probe:Probe')
    p.add_argument('--measure', action='store_true')
    p.add_argument('--games', type=int, default=1, help='games in a row in one browser (stops on error or Esc)')
    a = p.parse_args()
    asyncio.run(main(a.controller, a.measure, a.games))
