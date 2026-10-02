"""Thickness probe on the live site (user 2026-09-28): N games with PROBE_ON, each game rides beside a laid trail and
tightens the drawn gap until death. Saves per game the whole-game log (probe columns pph/pset/pgap/ptr/ptid/pstab), the
black box and the record; PROBE_ON is put back to 0 at the end. Report: research/probe_report.py <run dir>.
  SLP_MAX_S=300 setsid nohup .venv/bin/python research/probe_live.py <games> <name> > runs/<name>_live.log 2>&1 < /dev/null &
"""
import asyncio, base64, json, os, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import win_chrome as w
from run_live import nickname
from playwright.async_api import async_playwright
MAX_S = int(os.environ.get('SLP_MAX_S', 300))
STORE_ALIVE = 'new Promise(r => { const h = e => { if (e.source === window && e.data && e.data.slpStore === "load") { window.removeEventListener("message", h); r(true); } }; window.addEventListener("message", h); window.postMessage({slpStore: "get"}, "*"); setTimeout(() => r(false), 1500); })'

async def main(games=10, name='probe'):
    out = Path('runs') / f'{name}_{time.strftime("%Y%m%d_%H%M%S")}'; out.mkdir(parents=True)
    built = re.search(r'"__ext_version": "([^"]+)"', Path('ext/params.js').read_text()).group(1)
    await asyncio.to_thread(w.launch, w.MOD_PROFILE, w.MOD_PORT)
    relay, url = await w.relay(9336, w.MOD_PORT)
    summary = dict(started=time.strftime('%F %T'), purpose='두께 탐침: 몸 옆 간격을 줄이며 사망 경계(우리 r, 상대 r, gap) 측정', built=built, games=[])
    errors, pg = [], None
    async with async_playwright() as pw:
        try:
            b = await pw.chromium.connect_over_cdp(url, timeout=60000); ctx = b.contexts[0]
            pg = next((p for p in ctx.pages if 'slither' in p.url), None)
            if pg:
                while await pg.evaluate('!!window.playing'): await asyncio.sleep(3)
            ext = await ctx.new_page(); await ext.goto('chrome://extensions/'); await asyncio.sleep(1)
            ids = await ext.evaluate('new Promise(r => chrome.developerPrivate.getExtensionsInfo(x => r(x.filter(e => e.name.includes("SLP")).map(e => e.id))))')
            await ext.evaluate(f'new Promise(r => chrome.developerPrivate.reload("{ids[0]}", {{failQuietly: true}}, r))')
            await asyncio.sleep(2); await ext.close()
            pg = pg or await ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)[:300]))
            for _ in range(3):
                await asyncio.wait_for(pg.goto('http://slither.io/', wait_until='domcontentloaded'), 60)
                await pg.wait_for_function('window.__slp && __slp.lastBox && typeof connect==="function" && document.getElementById("nick")', timeout=60000)
                if await pg.evaluate(STORE_ALIVE): break
                await asyncio.sleep(3)
            else: raise RuntimeError('store.js dead')
            summary['version'] = await pg.evaluate('__slp.version'); assert summary['version'] == built
            await pg.evaluate('__slp.setValue("PROBE_ON", 1)'); await pg.evaluate('__slp.setValue("PROBE_MIN_L", %d)' % int(os.environ.get('PROBE_MIN_L', 0))); await pg.evaluate('__slp.setBot(true)')
            for k in range(1, games + 1):
                await pg.wait_for_function('!window.playing && document.getElementById("nick") && !document.getElementById("nick").disabled', timeout=90000)
                await asyncio.sleep(3)
                await pg.evaluate('window.__slpLastBox = null; window.__slpLastRecord = null; window.__slpLastLog = null')
                await pg.fill('#nick', nickname()); await pg.press('#nick', 'Enter')
                await pg.wait_for_function('window.playing && window.slither', timeout=60000)
                t0 = time.monotonic()
                while time.monotonic() - t0 < MAX_S:
                    await asyncio.sleep(2)
                    if not (await pg.evaluate('__slp.status().game')) and time.monotonic() - t0 > 3: break
                capped = bool(await pg.evaluate('!!(window.playing && window.slither && !slither.dead)'))
                if capped: await pg.evaluate('window.ws && window.ws.close()'); await asyncio.sleep(2)
                await pg.wait_for_function('!!window.__slpLastBox && !!window.__slpLastRecord', timeout=30000)
                rec = await pg.evaluate('__slp.lastRecord()'); rec['capped'] = MAX_S if capped else None
                (out / f'slp_{k:02d}.json').write_text(json.dumps(rec))
                (out / f'slp_{k:02d}_box.json.gz').write_bytes(base64.b64decode(await pg.evaluate('__slp.lastBox()')))
                try:
                    await pg.wait_for_function('!!window.__slpLastLog', timeout=60000)
                    (out / f'slp_{k:02d}_log.json.gz').write_bytes(base64.b64decode(await pg.evaluate("__slp.lastBox('__slpLastLog')")))
                except Exception as e: print('log missing', k, str(e)[:100], flush=True)
                g = dict(k=k, seconds=rec['seconds'], L_max=rec['L_max'], errors=rec['errors'], capped=capped, players=rec.get('players'))
                summary['games'].append(g); print(json.dumps(g), flush=True)
            await pg.evaluate('__slp.setBot(false)')
        finally:
            try: await pg.evaluate('__slp.setValue("PROBE_ON", 0)'); summary['restored'] = await pg.evaluate('__slp.S.values.PROBE_ON')
            except Exception as e: summary['restore_error'] = str(e)[:200]
            summary['page_errors'] = errors[:20]; relay.close()
            (out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print('out', out, flush=True)

if __name__ == '__main__':
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 10, sys.argv[2] if len(sys.argv) > 2 else 'probe'))
