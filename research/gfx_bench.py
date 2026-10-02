"""Graphics settings on the real site (user 2026-09-26: "지금 넣은 그래픽 옵션도 실제 의미가 있는지 검증해봐").

Purpose: does each graphics level / game-loop setting change the frame rate and the cost — not survival.
Measured per setting (bot driving, same game): drawn FPS, game loop/s, requestAnimationFrame/s (browser pace),
ms per frame for game step / drawing / MOD overlay, main-thread share, decision ms, and Windows CPU of the MOD
Chrome's processes (all of them: renderer, GPU, ...). Settings rotate over rounds so the game context spreads.
The user's graphics settings are restored at the end.

  .venv/bin/python research/gfx_bench.py [rounds]
Out: runs/gfx_bench_<ts>/ (samples.jsonl, shot_<setting>.jpg, summary.json)
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

SETTINGS = [('L4 원래', 4, 0), ('L3 글로우·배경 끔', 3, 0), ('L2 단순 몸 75%', 2, 0), ('L1 선·원 75%', 1, 0),
            ('L0 최소 50% 30FPS', 0, 0), ('L4 + 타이머 60', 4, 60), ('L1 + 타이머 60', 1, 60), ('L1 + 타이머 120', 1, 120)]
SETTLE, WINDOW, MAX_GAMES = 2, 6, 2
CPU_PS = ("$p=@(Get-CimInstance Win32_Process -Filter \"name='chrome.exe' AND CommandLine LIKE '%chrome_mod_profile%'\" | "
          "ForEach-Object { $_.ProcessId }); $s=(Get-Process -Id $p -ErrorAction SilentlyContinue | Measure-Object CPU -Sum).Sum; "
          "\"$s $([Environment]::ProcessorCount)\"")
RAF_ON = 'window.__rafN = 0; window.__rafOn = true; (function f() { if (!window.__rafOn) return; __rafN++; requestAnimationFrame(f); })()'


class OutOfGames(Exception):
    pass


def cpu():
    """CPU seconds used so far by all MOD Chrome processes (renderer, GPU, ...), the moment, logical cores."""
    t = time.monotonic(); out = w.ps(CPU_PS).split(); t2 = time.monotonic()
    return (float(out[0]), (t + t2) / 2, int(out[1])) if len(out) == 2 else None


async def start_game(pg):
    await pg.wait_for_function('!window.playing && document.getElementById("nick") && !document.getElementById("nick").disabled', timeout=60000)
    await asyncio.sleep(2)
    await pg.fill('#nick', nickname())
    await pg.press('#nick', 'Enter')
    await pg.wait_for_function('window.playing && window.slither', timeout=60000)
    await asyncio.sleep(3)


async def main(rounds=3):
    out = Path('runs')/f'gfx_bench_{time.strftime("%Y%m%d_%H%M%S")}'
    out.mkdir(parents=True)
    built = re.search(r'"__ext_version": "([^"]+)"', Path('ext/params.js').read_text()).group(1)
    await asyncio.to_thread(w.launch, w.MOD_PROFILE, w.MOD_PORT)
    relay, url = await w.relay(9335, w.MOD_PORT)
    summary = dict(started=time.strftime('%F %T'), purpose='그래픽 설정별 FPS·프레임 비용 (생존 아님)', built=built, games=0)
    samples, errors, pg, user_gfx = [], [], None, None
    async with async_playwright() as pw:
        try:
            b = await pw.chromium.connect_over_cdp(url, timeout=60000)
            ctx = b.contexts[0]
            # the user's slither tab (if open) is used, not a second game: wait until its game is over (never cut it)
            pg = next((p for p in ctx.pages if 'slither' in p.url), None)
            if pg:
                waited = time.monotonic()
                while await pg.evaluate('!!window.playing'):
                    await asyncio.sleep(3)
                summary['waited_for_user_game_s'] = round(time.monotonic() - waited)
                print('user game over after', summary['waited_for_user_game_s'], 's', flush=True)
            ext = await ctx.new_page()                  # load the new build: reload the unpacked extension
            await ext.goto('chrome://extensions/'); await asyncio.sleep(1)
            ids = await ext.evaluate('new Promise(r => chrome.developerPrivate.getExtensionsInfo(x => r(x.filter(e => e.name.includes("SLP")).map(e => e.id))))')
            await ext.evaluate(f'new Promise(r => chrome.developerPrivate.reload("{ids[0]}", {{failQuietly: true}}, r))')
            await asyncio.sleep(2); await ext.close()
            pg = pg or await ctx.new_page()
            cdp = await ctx.new_cdp_session(pg)
            pg.on('pageerror', lambda e: errors.append(str(e)[:300]))
            await asyncio.wait_for(pg.goto('http://slither.io/', wait_until='domcontentloaded'), 60)
            await pg.wait_for_function('window.__slp && typeof connect==="function" && document.getElementById("nick")', timeout=60000)
            summary['version'] = await pg.evaluate('__slp.version')
            assert summary['version'] == built, (summary['version'], built)
            user_gfx = await pg.evaluate('JSON.stringify(__slp.S.gfx)')
            summary['user_gfx'] = json.loads(user_gfx)
            await pg.evaluate(RAF_ON); await asyncio.sleep(3)          # browser pace with no game running
            summary['menu_raf_per_s'] = round(await pg.evaluate('__rafN') / 3, 1)
            await pg.evaluate('window.__rafOn = false; __slp.setBot(true)')
            await start_game(pg); summary['games'] = 1
            shots = set()
            with open(out/'samples.jsonl', 'w') as f:
                for rnd in range(rounds):
                    order = SETTINGS[rnd % len(SETTINGS):] + SETTINGS[:rnd % len(SETTINGS)]
                    for name, level, hz in order:
                        if not await pg.evaluate('!!(window.playing && window.slither && !slither.dead)'):
                            if summary['games'] >= MAX_GAMES: raise OutOfGames
                            await start_game(pg); summary['games'] += 1
                        await pg.evaluate(f'__slp.setGfx(Object.assign({{}}, __slp.GFX_LEVELS[{level}][1], {{hz: {hz}}}))')
                        await asyncio.sleep(SETTLE)
                        c0 = await asyncio.to_thread(cpu)
                        await pg.evaluate(RAF_ON)
                        per = []
                        for _ in range(WINDOW):
                            await asyncio.sleep(1)
                            per.append(await pg.evaluate('({p: __slp.perf(), ms: __slp.status().last && __slp.status().last.ms, '
                                                         'snakes: slithers.length, foods: foods_c, alive: !!(window.playing && slither && !slither.dead)})'))
                        raf = await pg.evaluate('window.__rafOn = false, __rafN') / WINDOW
                        c1 = await asyncio.to_thread(cpu)
                        core_pct = round((c1[0] - c0[0]) / (c1[1] - c0[1]) * 100) if c0 and c1 else None     # % of one core
                        if name not in shots:
                            img = (await cdp.send('Page.captureScreenshot', dict(format='jpeg', quality=60)))['data']
                            (out/f'shot_{SETTINGS.index((name, level, hz))}.jpg').write_bytes(base64.b64decode(img)); shots.add(name)
                        if not all(x['alive'] for x in per): continue          # window cut by a death: dropped
                        s = dict(setting=name, round=rnd, raf=round(raf, 1), chrome_cpu=core_pct, cores=c1 and c1[2],
                                 **{k: statistics.median(x['p'][k] for x in per) for k in ('fps', 'loops', 'game', 'draw', 'overlay', 'busy', 'bot', 'widgets')},
                                 decide_ms=statistics.median(x['ms'] or 0 for x in per), snakes=statistics.median(x['snakes'] for x in per),
                                 foods=statistics.median(x['foods'] for x in per))
                        samples.append(s); f.write(json.dumps(s, ensure_ascii=False)+'\n'); f.flush()
                        print(json.dumps(s, ensure_ascii=False), flush=True)
        except OutOfGames:
            summary['stopped'] = f'{MAX_GAMES} games used'
        finally:
            try:
                if pg and user_gfx: await pg.evaluate(f'__slp.setGfx({user_gfx}); __slp.setBot(false)')
                summary['restored_gfx'] = json.loads(await pg.evaluate('JSON.stringify(__slp.S.gfx)'))
            except Exception as e:                     # noqa: BLE001
                summary['restore_error'] = str(e)[:200]
            summary['page_errors'] = errors[:20]
            table = {}
            for name, _, _ in SETTINGS:
                xs = [s for s in samples if s['setting'] == name]
                if not xs: continue
                med = lambda k: round(statistics.median(x[k] for x in xs), 1)          # noqa: E731
                table[name] = dict(n=len(xs), fps=med('fps'), loops=med('loops'), raf=med('raf'), game_ms=med('game'), draw_ms=med('draw'),
                                   overlay_ms=med('overlay'), main_busy_pct=med('busy'), decide_ms=med('decide_ms'),
                                   chrome_cpu_core_pct=(lambda cp: round(statistics.median(cp)) if cp else None)([x['chrome_cpu'] for x in xs if x['chrome_cpu'] is not None]),
                                   snakes=med('snakes'), foods=med('foods'))
            summary['table'] = table
            relay.close()
            (out/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
            print(json.dumps(summary, ensure_ascii=False, indent=1))
            print('out', out)


if __name__ == '__main__':
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 3))
