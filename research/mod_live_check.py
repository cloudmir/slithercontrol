"""Live games with the MOD (ext/) driving (user Q1 and 2026-09-26 "실 사이트에서 너가 직접 확인해봐").

Purpose: the extension works end to end — not survival performance.
Pass: extension loaded with a Worker; the bot drives the whole game with 0 decision errors; decision p95 < 33 ms;
panel and overlay visible (screenshots); the game record (values + trace) is saved.
The script only starts the game and watches: the pilot runs inside the page.

  .venv/bin/python research/mod_live_check.py [games] [purpose]
Out: runs/mod_live_<ts>/ (status.jsonl, shot_*.jpg, sq_*.jpg when a narrowing corridor is seen, record_<n>.json, summary.json)
"""
import asyncio
import base64
import json
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import win_chrome as w                                   # noqa: E402
from run_live import nickname                            # noqa: E402

MAX_S = 600


async def main(games=1, purpose=''):
    out = Path('runs')/f'mod_live_{time.strftime("%Y%m%d_%H%M%S")}'
    out.mkdir(parents=True)
    await asyncio.to_thread(w.launch, w.MOD_PROFILE, w.MOD_PORT)
    relay, url = await w.relay(9335, w.MOD_PORT)
    summary = dict(started=time.strftime('%F %T'), purpose=purpose, games=[])
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.connect_over_cdp(url, timeout=60000)
            ctx = b.contexts[0]
            pg = await ctx.new_page()
            cdp = await ctx.new_cdp_session(pg)
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)[:300]))
            pg.on('console', lambda m: errors.append(m.text[:300]) if m.type == 'error' and 'SLP' in m.text else None)
            await asyncio.wait_for(pg.goto('http://slither.io/', wait_until='domcontentloaded'), 60)
            await pg.wait_for_function('window.__slp && typeof connect==="function" && document.getElementById("nick")', timeout=60000)
            summary.update(url=pg.url, version=await pg.evaluate('__slp.version'), worker=await pg.evaluate('__slp.worker'))
            show_before = await pg.evaluate('__slp.S.show.squeeze')        # this check shows the corridor overlay, then restores
            await pg.evaluate('__slp.S.show.squeeze = true; __slp.setZoom(__slp.S.zoom)')
            await pg.evaluate('__slp.setBot(true)')
            for g in range(games):
                await pg.wait_for_function('!window.playing && document.getElementById("nick") && !document.getElementById("nick").disabled', timeout=60000)
                await asyncio.sleep(2)
                nick = nickname()
                await pg.fill('#nick', nick)
                await pg.press('#nick', 'Enter')
                await pg.wait_for_function('window.playing && window.slither', timeout=60000)
                t0 = time.monotonic(); k = 0; last_sq = -9
                with open(out/f'status_{g+1}.jsonl', 'w') as f:
                    while time.monotonic()-t0 < MAX_S:
                        st = await pg.evaluate('__slp.status()')
                        st['t'] = round(time.monotonic()-t0, 1)
                        f.write(json.dumps(st)+'\n'); f.flush()
                        if not st['game'] and st['t'] > 3:
                            break
                        sq = st.get('last') and st['last'].get('squeeze')
                        if (sq and st['t']-last_sq > 1.5) or k % 20 == 0:
                            img = (await cdp.send('Page.captureScreenshot', dict(format='jpeg', quality=60)))['data']
                            (out/f'{"sq" if sq else "shot"}_{g+1}_{st["t"]:06.1f}.jpg').write_bytes(base64.b64decode(img))
                            if sq: last_sq = st['t']
                        k += 1
                        await asyncio.sleep(.5)
                if await pg.evaluate('!!(window.slither && !slither.dead && window.playing)'):
                    await pg.evaluate('__slp.setBot(false)')     # time limit: hand back control
                    summary['games'].append(dict(nick=nick, stopped='time limit')); break
                await asyncio.sleep(3)
                rec = await pg.evaluate('__slp.lastRecord()')
                gs = dict(nick=nick)
                if rec:
                    (out/f'record_{g+1}.json').write_text(json.dumps(rec))
                    end = rec['seconds']
                    gs.update({k_: rec.get(k_) for k_ in ('seconds', 'L_max', 'ticks', 'errors', 'modes', 'decide_ms', 'squeeze_ticks', 'values_hash', 'preset')},
                              squeeze_near_death=[e for e in rec.get('squeeze', []) if e[0] >= end-3][-5:],
                              last_modes=[x['mode'] for x in rec['trace'][-45::5]])
                summary['games'].append(gs)
                print(json.dumps(gs, ensure_ascii=False), flush=True)
            summary['page_errors'] = errors[:20]
            await pg.evaluate('__slp.setBot(false)')
            await pg.evaluate(f'__slp.S.show.squeeze = {str(bool(show_before)).lower()}; __slp.setZoom(__slp.S.zoom)')
    finally:
        relay.close()
        (out/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
        print(json.dumps(summary, ensure_ascii=False, indent=1))
        print('out', out)


if __name__ == '__main__':
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1, sys.argv[2] if len(sys.argv) > 2 else ''))
