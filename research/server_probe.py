"""Which server is crowded? Connect to each candidate (extension's server choice), play with the bot off for a few
seconds, count the snakes in view (window.slithers) — user 2026-09-27 "서버가 너무 한산해서 … 서버를 바꾸어서 진행하자".
  .venv/bin/python research/server_probe.py ip:port [ip:port ...]   -> prints {server: median snakes in view}
The page is left on the last probed server with the bot off; set the server afterwards with __slp.S.server."""
import asyncio, json, sys, statistics
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import win_chrome as w
from run_live import nickname
from playwright.async_api import async_playwright

async def main(servers):
    relay, url = await w.relay(9336, w.MOD_PORT)
    res = {}
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.connect_over_cdp(url, timeout=30000)
            pg = next(p for p in b.contexts[0].pages if 'slither' in p.url)
            for srv in servers:
                await pg.evaluate(f'__slp.S.server = {json.dumps(srv)}; __slp.setBot(false); __slp.setValue("SAFE", __slp.S.values.SAFE)')
                await pg.goto('http://slither.io/', wait_until='domcontentloaded')
                await pg.wait_for_function('window.__slp && typeof connect==="function" && document.getElementById("nick") && !document.getElementById("nick").disabled', timeout=60000)
                await asyncio.sleep(2)
                await pg.fill('#nick', nickname()); await pg.press('#nick', 'Enter')
                try: await pg.wait_for_function('window.playing && window.slither', timeout=30000)
                except Exception: res[srv] = None; continue
                await asyncio.sleep(4)
                n = []
                for _ in range(6):
                    n.append(await pg.evaluate('({cur: bso.ip+":"+bso.po, snakes: slithers.filter(o => !o.dead).length - 1, food: foods_c, alive: !slither.dead, players: window.slither_count})'))
                    await asyncio.sleep(2)
                res[srv] = dict(cur=n[-1]['cur'], players=max(x['players'] or 0 for x in n), snakes=statistics.median(x['snakes'] for x in n), food=statistics.median(x['food'] for x in n))
                print(srv, res[srv], flush=True)
            await pg.evaluate('__slp.setBot(false)')
    finally:
        relay.close()
    print(json.dumps(res))
asyncio.run(main(sys.argv[1:]))
