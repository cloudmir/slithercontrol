"""Join each candidate server briefly and read the HUD player count (slither_count; sos.ac is not it).
  .venv/bin/python research/server_counts.py [max_servers=25]   -> research/v2sweep/server_counts.json
Restores the server that was forced before (window.bso) at the end. Bot is left off."""
import asyncio, json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import win_chrome as w
from playwright.async_api import async_playwright
N = int(sys.argv[1]) if len(sys.argv) > 1 else 25
async def main():
    relay, url = await w.relay(9348, w.MOD_PORT)
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp(url, timeout=60000)
        pg = next(p for c in b.contexts for p in c.pages if 'slither' in p.url)
        before = await pg.evaluate('window.bso ? [bso.ip, bso.po] : null')
        sos = await pg.evaluate('(window.sos||[]).filter(o => o && o.ip && !String(o.ip).startsWith("[")).map(o => ({ip: o.ip, po: o.po, ptm: o.ptm || 9e9, ac: o.ac || 0}))')
        sos.sort(key=lambda o: (o['ptm'], -o['ac']))
        out = []
        for o in sos[:N]:
            try:
                await pg.evaluate('__slp.setBot(false)')
                await pg.wait_for_function('!window.playing && document.getElementById("nick") && !document.getElementById("nick").disabled', timeout=30000)
                await pg.evaluate(f'window.forceOnce({json.dumps(o["ip"])}, {o["po"]}); document.getElementById("playh").firstElementChild.click()')
                await pg.wait_for_function('window.playing && window.slither && window.slither_count > 0', timeout=20000)
                await asyncio.sleep(1.5)
                cnt = await pg.evaluate('({server: bso.ip + ":" + bso.po, players: window.slither_count, ping: window.lag_mult})')
                out.append(cnt); print(cnt, flush=True)
                await pg.evaluate('window.ws && ws.close()')
                await asyncio.sleep(2.5)
            except Exception as e:
                out.append({'server': f"{o['ip']}:{o['po']}", 'error': str(e)[:80]}); print('fail', o['ip'], str(e)[:80], flush=True)
                try: await pg.evaluate('window.ws && ws.close()')
                except Exception: pass
                await asyncio.sleep(2.5)
        if before: await pg.evaluate(f'window.forceOnce({json.dumps(before[0])}, {before[1]})')
        json.dump({'at': time.strftime('%Y-%m-%d %H:%M'), 'counts': out}, open('research/v2sweep/server_counts.json', 'w'), indent=1)
        ok = sorted([c for c in out if 'players' in c], key=lambda c: -c['players'])
        print('TOP:', ok[:8])
asyncio.run(main())
