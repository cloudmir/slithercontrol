"""Food / boost parameters on the real site (user 2026-09-26: "부스터와 먹이 민감도를 올렸는데 먹이쪽으로 이동을 안하는데?"
-> "직접 테스트해봐").

Purpose: do BOOST_COST and REMAINS change the bot's behaviour live — not survival.
A = the user's current values, B = the same with only BOOST_COST -10 and REMAINS 12 (the defaults). A and B alternate
every WINDOW seconds in the same game (context spreads over both); the first SETTLE seconds of each window are dropped.
Per window: boost share, heap-boost share (chosen plan has the 'heap' term), feed-mode share, goal value, length gain/min.
Pass: B boosts more and chases heaps more than A. The user's values are restored at the end.

  .venv/bin/python research/food_param_live.py [max_seconds]
Out: runs/food_param_<ts>/ (windows.jsonl, summary.json, shot_*.jpg)
"""
import asyncio
import base64
import json
import re
import statistics
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import win_chrome as w                                   # noqa: E402
from run_live import nickname                            # noqa: E402

WINDOW, SETTLE, MAX_GAMES = 30, 3, 2
B_CHANGES = {'BOOST_COST': -10, 'REMAINS': 12}


async def start_game(pg):
    await pg.wait_for_function('!window.playing && document.getElementById("nick") && !document.getElementById("nick").disabled', timeout=60000)
    await asyncio.sleep(2)
    await pg.fill('#nick', nickname())
    await pg.press('#nick', 'Enter')
    await pg.wait_for_function('window.playing && window.slither', timeout=60000)
    await asyncio.sleep(3)


async def main(max_s=600):
    out = Path('runs')/f'food_param_{time.strftime("%Y%m%d_%H%M%S")}'
    out.mkdir(parents=True)
    built = re.search(r'"__ext_version": "([^"]+)"', Path('ext/params.js').read_text()).group(1)
    await asyncio.to_thread(w.launch, w.MOD_PROFILE, w.MOD_PORT)
    relay, url = await w.relay(9335, w.MOD_PORT)
    summary = dict(started=time.strftime('%F %T'), purpose='먹이·부스트 값이 실사이트 행동을 바꾸는지 (생존 아님)', built=built, b_changes=B_CHANGES)
    windows, errors, pg, user_vals = [], [], None, None
    async with async_playwright() as pw:
        try:
            b = await pw.chromium.connect_over_cdp(url, timeout=60000)
            ctx = b.contexts[0]
            pg = next((p for p in ctx.pages if 'slither' in p.url), None)
            if pg:                                   # the user's tab: never cut a running game
                t0 = time.monotonic()
                while await pg.evaluate('!!window.playing'):
                    await asyncio.sleep(3)
                summary['waited_for_user_game_s'] = round(time.monotonic() - t0)
            ext = await ctx.new_page()
            await ext.goto('chrome://extensions/'); await asyncio.sleep(1)
            ids = await ext.evaluate('new Promise(r => chrome.developerPrivate.getExtensionsInfo(x => r(x.filter(e => e.name.includes("SLP")).map(e => e.id))))')
            await ext.evaluate(f'new Promise(r => chrome.developerPrivate.reload("{ids[0]}", {{failQuietly: true}}, r))')
            await asyncio.sleep(2); await ext.close()
            pg = pg or await ctx.new_page()
            cdp = await ctx.new_cdp_session(pg)
            pg.on('pageerror', lambda e: errors.append(str(e)[:300]))
            await asyncio.wait_for(pg.goto('http://slither.io/', wait_until='domcontentloaded'), 60)
            await pg.wait_for_function('window.__slp && __slp.trace && typeof connect==="function" && document.getElementById("nick")', timeout=60000)
            summary['version'] = await pg.evaluate('__slp.version')
            assert summary['version'] == built, (summary['version'], built)
            user_vals = await pg.evaluate(f'Object.fromEntries({json.dumps(list(B_CHANGES))}.map(k => [k, __slp.S.values[k]]))')
            summary.update(user_values=user_vals, preset=await pg.evaluate('__slp.S.preset'), gfx=await pg.evaluate('__slp.S.gfx'))
            await pg.evaluate('__slp.setBot(true)')
            await start_game(pg); games = 1
            t_start, k, shots = time.monotonic(), 0, set()
            with open(out/'windows.jsonl', 'w') as f:
                while time.monotonic() - t_start < max_s:
                    arm = 'AB'[k % 2]
                    vals = user_vals if arm == 'A' else B_CHANGES
                    for key, v in vals.items():
                        await pg.evaluate(f'__slp.setValue({json.dumps(key)}, {v})')
                    await asyncio.sleep(SETTLE)
                    heap, samples = 0, 0
                    tw0 = await pg.evaluate('__slp.trace(1).length ? __slp.trace(1)[0].t : 0')
                    end = time.monotonic() + WINDOW - SETTLE
                    while time.monotonic() < end:
                        await asyncio.sleep(.5)
                        terms = await pg.evaluate('__slp.terms()')
                        if terms is not None:
                            samples += 1; heap += 1 if terms.get('heap', 0) > 0 else 0
                        if not await pg.evaluate('!!(window.playing && window.slither && !slither.dead)'):
                            break
                    tr = [x for x in await pg.evaluate('__slp.trace(1200)') if x['t'] >= tw0]
                    alive = await pg.evaluate('!!(window.playing && window.slither && !slither.dead)')
                    if arm not in shots:
                        img = (await cdp.send('Page.captureScreenshot', dict(format='jpeg', quality=60)))['data']
                        (out/f'shot_{arm}.jpg').write_bytes(base64.b64decode(img)); shots.add(arm)
                    if len(tr) > 60:
                        secs = tr[-1]['t'] - tr[0]['t']
                        rec = dict(arm=arm, game=games, t0=tr[0]['t'], secs=round(secs, 1), ticks=len(tr),
                                   boost=round(sum(x['boost'] for x in tr) / len(tr), 3),
                                   heap_boost=round(heap / samples, 3) if samples else None,
                                   feed=round(sum(x['mode'] == 'feed' for x in tr) / len(tr), 3),
                                   goal_med=statistics.median(x['goal'] for x in tr),
                                   gain_per_min=round((tr[-1]['L'] - tr[0]['L']) / secs * 60, 1) if secs > 0 else None,
                                   L=tr[-1]['L'], died=not alive)
                        windows.append(rec); f.write(json.dumps(rec, ensure_ascii=False)+'\n'); f.flush()
                        print(json.dumps(rec, ensure_ascii=False), flush=True)
                    k += 1
                    if not alive:
                        if games >= MAX_GAMES: break
                        await asyncio.sleep(3); await start_game(pg); games += 1
            summary['games'] = games
        finally:
            try:
                if pg and user_vals:
                    for key, v in user_vals.items():
                        await pg.evaluate(f'__slp.setValue({json.dumps(key)}, {v})')
                    await pg.evaluate('__slp.setBot(false)')
                    summary['restored'] = await pg.evaluate(f'Object.fromEntries({json.dumps(list(B_CHANGES))}.map(k => [k, __slp.S.values[k]]))')
            except Exception as e:                     # noqa: BLE001
                summary['restore_error'] = str(e)[:200]
            summary['page_errors'] = errors[:20]
            for arm in 'AB':
                xs = [x for x in windows if x['arm'] == arm and not x['died']]
                if xs:
                    med = lambda key: statistics.median(x[key] for x in xs if x[key] is not None)    # noqa: E731
                    summary[arm] = dict(windows=len(xs), boost=med('boost'), heap_boost=med('heap_boost'), feed=med('feed'),
                                        goal_med=med('goal_med'), gain_per_min=med('gain_per_min'))
            relay.close()
            (out/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
            print(json.dumps(summary, ensure_ascii=False, indent=1))
            print('out', out)


if __name__ == '__main__':
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 600))
