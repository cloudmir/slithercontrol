"""Set the MOD's graphics level in the live game tab (and save the previous gfx to restore later).
  .venv/bin/python research/gfx_set.py <level 0-4 | restore> [state file]
Cycle 4: L1 (lines/circles, 75 %) for both arms — fact-gfx-bench-20260926: with the 60/s loop timer, L1 runs the game loop
62.5/s vs 37.5/s at L4 and main thread 9.5 % vs 31 % (drawn FPS is capped by the browser either way)."""
import asyncio, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import win_chrome as w
from playwright.async_api import async_playwright
STATE = Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/slp_gfx_prev.json')
async def main(arg):
    relay, url = await w.relay(9343, w.MOD_PORT)
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.connect_over_cdp(url, timeout=30000)
            pg = next(p for p in b.contexts[0].pages if 'slither' in p.url)
            if arg == 'restore':
                prev = json.loads(STATE.read_text())
                await pg.evaluate(f'__slp.setGfx({json.dumps(prev)})')
            else:
                prev = await pg.evaluate('({...__slp.S.gfx})'); STATE.write_text(json.dumps(prev))
                await pg.evaluate(f'__slp.setGfx(__slp.GFX_LEVELS[{int(arg)}][1])')
            print(json.dumps(await pg.evaluate('({gfx: __slp.S.gfx, level: __slp.GFX_LEVELS.findIndex(([, v]) => Object.keys(v).every(k => __slp.S.gfx[k] === v[k]))})')))
    finally: relay.close()
asyncio.run(main(sys.argv[1]))
