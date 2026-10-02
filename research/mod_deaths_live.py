"""Collect games with the MOD's black box and whole-game log on the real site (user 2026-09-27: "죽었을때 데이터 분석 ...
진행해", then cycle 1 "감김": the log holds every decision and the full observations of each wrap episode).

Purpose (argument): what the batch is for; the bot drives with the user's current values, nothing else changes.
The bot drives with the user's current values; nothing else changes. Per game: the MOD record + black box, saved as
slp_<k>.json / slp_<k>_box.json.gz. A game still alive at MAX_S is stopped (bot off) and not counted as a death.

  .venv/bin/python research/mod_deaths_live.py [games] [name] [purpose] [arms.json]
arms.json (optional, live A/B): {"A": {}, "B": {"WRAP_COMMIT": 1, ...}} — games alternate A, B, A, B...; each game's values
are the user's current values plus its arm's changes (set just before the game, in the record's changes); the user's
values are restored at the end. The arm is saved as slp_<k>.arm.
Out: runs/<name>_<ts>/ (slp_<k>.json, _box.json.gz, _log.json.gz) then research/mod_deaths.py on it (analysis/report.txt)
"""
import asyncio
import base64
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import win_chrome as w                                   # noqa: E402
from run_live import nickname                            # noqa: E402

import os
MAX_S = int(os.environ.get('SLP_MAX_S', 1800))       # per-game cap (s); a game alive at the cap is closed (ws.close -> the client's gameOver) and kept as 'time limit'
# the extension's settings store answers in this page (not left over from before an extension reload)
STORE_ALIVE = '''new Promise(r => { const on = e => { if (e.data && e.data.slpStore === 'load') { removeEventListener('message', on); r(true); } };
  addEventListener('message', on); postMessage({slpStore: 'get'}, '*'); setTimeout(() => r(false), 3000); })'''


async def main(games=8, name='mod_deaths', purpose='사망 데이터 수집 (블랙박스) — 사망 유형·살 길 검사', arms=None):
    arms = json.loads(Path(arms).read_text()) if arms else None
    out = Path('runs')/f'{name}_{time.strftime("%Y%m%d_%H%M%S")}'
    out.mkdir(parents=True)
    built = re.search(r'"__ext_version": "([^"]+)"', Path('ext/params.js').read_text()).group(1)
    await asyncio.to_thread(w.launch, w.MOD_PROFILE, w.MOD_PORT)
    relay, url = await w.relay(9335, w.MOD_PORT)
    summary = dict(started=time.strftime('%F %T'), purpose=purpose, built=built, games=[], arms=arms)
    errors, pg = [], None
    async with async_playwright() as pw:
        try:
            b = await pw.chromium.connect_over_cdp(url, timeout=60000)
            ctx = b.contexts[0]
            pg = next((p for p in ctx.pages if 'slither' in p.url), None)
            if pg:                                   # the user's tab: never cut a running game
                while await pg.evaluate('!!window.playing'):
                    await asyncio.sleep(3)
            ext = await ctx.new_page()
            await ext.goto('chrome://extensions/'); await asyncio.sleep(1)
            ids = await ext.evaluate('new Promise(r => chrome.developerPrivate.getExtensionsInfo(x => r(x.filter(e => e.name.includes("SLP")).map(e => e.id))))')
            await ext.evaluate(f'new Promise(r => chrome.developerPrivate.reload("{ids[0]}", {{failQuietly: true}}, r))')
            await asyncio.sleep(2); await ext.close()
            pg = pg or await ctx.new_page()
            pg.on('pageerror', lambda e: errors.append(str(e)[:300]))
            for _ in range(3):   # the reload can finish after the page loaded; its store.js is then dead (2026-09-27)
                await asyncio.wait_for(pg.goto('http://slither.io/', wait_until='domcontentloaded'), 60)
                await pg.wait_for_function('window.__slp && __slp.lastBox && typeof connect==="function" && document.getElementById("nick")', timeout=60000)
                if await pg.evaluate(STORE_ALIVE): break
                await asyncio.sleep(3)
            else:
                raise RuntimeError('store.js dead after 3 page loads (extension context invalidated)')
            summary['version'] = await pg.evaluate('__slp.version')
            assert summary['version'] == built, (summary['version'], built)
            summary.update(preset=await pg.evaluate('__slp.S.preset'), values_hash=None)
            keys = sorted({k for a in (arms or {}).values() for k in a})
            user = await pg.evaluate(f'Object.fromEntries({json.dumps(keys)}.map(k => [k, __slp.S.values[k]]))') if arms else {}
            summary['user_values'] = user
            await pg.evaluate('__slp.setBot(true)')
            for k in range(1, games + 1):
                arm = None
                if arms:
                    arm = sorted(arms)[(k - 1) % len(arms)]
                    for key, v in {**user, **arms[arm]}.items():
                        await pg.evaluate(f'__slp.setValue({json.dumps(key)}, {json.dumps(v)})')
                await pg.wait_for_function('!window.playing && document.getElementById("nick") && !document.getElementById("nick").disabled', timeout=90000)
                await asyncio.sleep(3)
                await pg.evaluate('window.__slpLastBox = null; window.__slpLastRecord = null; window.__slpLastLog = null')
                await pg.fill('#nick', nickname()); await pg.press('#nick', 'Enter')
                await pg.wait_for_function('window.playing && window.slither', timeout=60000)
                t0 = time.monotonic(); peak = {}
                while time.monotonic() - t0 < MAX_S:
                    await asyncio.sleep(2)
                    st = await pg.evaluate('({game: __slp.status().game, box: __slp.boxSize(), heap: performance.memory && performance.memory.usedJSHeapSize})')
                    if not st['game'] and time.monotonic() - t0 > 3: break
                    if st['box']: peak = dict(frames=st['box']['frames'], floats=st['box']['floats'], heap_mb=round((st['heap'] or 0) / 2**20))
                alive = await pg.evaluate('!!(window.playing && window.slither && !slither.dead)')
                capped = False
                if alive:            # cap: close the socket -> the client runs gameOver + resetGame -> the extension ends the game
                    capped = True
                    await pg.evaluate('window.ws && window.ws.close()')
                    await asyncio.sleep(2)
                await pg.wait_for_function('!!window.__slpLastBox && !!window.__slpLastRecord', timeout=30000)
                rec = await pg.evaluate('__slp.lastRecord()')
                box = base64.b64decode(await pg.evaluate('__slp.lastBox()'))
                if capped: rec['capped'] = MAX_S
                (out/f'slp_{k:02d}.json').write_text(json.dumps(rec))
                if arm: (out/f'slp_{k:02d}.arm').write_text(arm)
                (out/f'slp_{k:02d}_box.json.gz').write_bytes(box)
                try:
                    await pg.wait_for_function('!!window.__slpLastLog', timeout=60000)
                    (out/f'slp_{k:02d}_log.json.gz').write_bytes(base64.b64decode(await pg.evaluate("__slp.lastBox('__slpLastLog')")))
                except Exception as e:                 # noqa: BLE001
                    print('log missing', k, str(e)[:100], flush=True)
                g = dict(k=k, arm=arm, seconds=rec['seconds'], L_max=rec['L_max'], errors=rec['errors'], modes=rec['modes'], hash=rec['values_hash'], capped=capped,
                         decide_p95=rec['decide_ms']['p95'], box_kb=round(len(box) / 1024), peak=peak)
                summary['games'].append(g); summary['values_hash'] = rec['values_hash']
                print(json.dumps(g, ensure_ascii=False), flush=True)
            await pg.evaluate('__slp.setBot(false)')
        finally:
            try:                                            # the user's values back
                for key, v in (summary.get('user_values') or {}).items():
                    await pg.evaluate(f'__slp.setValue({json.dumps(key)}, {json.dumps(v)})')
                if arms: summary['restored'] = await pg.evaluate(f'Object.fromEntries({json.dumps(sorted(summary["user_values"]))}.map(k => [k, __slp.S.values[k]]))')
            except Exception as e:                       # noqa: BLE001
                summary['restore_error'] = str(e)[:200]
            summary['page_errors'] = errors[:20]
            relay.close()
            (out/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print('out', out, flush=True)
    subprocess.run([sys.executable, 'research/mod_deaths.py', str(out/'analysis'), str(out)])


if __name__ == '__main__':
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 8, *sys.argv[2:5]))
