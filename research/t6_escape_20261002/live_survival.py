import asyncio, base64, contextlib, hashlib, json, signal, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'research/v10_continuation_20261001'))
import win_chrome as w
from camera import camera
from run_live import nickname
from playwright.async_api import async_playwright

OUT = ROOT / 'runs' / ('t6_survival_' + time.strftime('%Y%m%d_%H%M%S'))
OUT.mkdir()
(OUT / 'code').mkdir()
FILES = ['ext/pilot.js', 'ext/mod.js', 'ext/params.js', 'ext/manifest.json', 'params.json']
HASHES = {}
for name in FILES:
    data = (ROOT / name).read_bytes()
    (OUT / 'code' / Path(name).name).write_bytes(data)
    HASHES[name] = hashlib.sha256(data).hexdigest()
BUILD = json.loads((ROOT / 'ext/manifest.json').read_text())['version_name']
summary = dict(out=str(OUT.relative_to(ROOT)), build=BUILD, hashes=HASHES,
               purpose='Fixed T6 live survival duration; deaths and 600s caps separated',
               success_criteria='Five recorded games with original record, box, log and durations',
               planned_games=5, game_cap_s=600, camera_interval_s=.5, games=[],
               started=time.strftime('%F %T'), page_errors=[])

def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2))

def progress(state, **kw):
    save('summary.json', summary)
    save('progress.json', dict(state=state, updated=time.strftime('%F %T'), **kw))

def stop(*_):
    (OUT / 'STOP_NOW').touch()

for sig in [signal.SIGINT, signal.SIGTERM]:
    signal.signal(sig, stop)

async def main():
    relay, url = await w.relay(9342, w.MOD_PORT)
    pg = None
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.connect_over_cdp(url, timeout=15000)
            pages = [p for p in browser.contexts[0].pages if 'slither' in p.url]
            assert pages and not any([await p.evaluate('!!window.playing') for p in pages]), 'Existing game in progress'
            pg = pages[0]
            before = await pg.evaluate('({version:__slp.version,values:{...__slp.S.values},preset:__slp.S.preset,bot:__slp.S.bot,server:__slp.S.server,gfx:__slp.S.gfx})')
            save('before.json', before)
            assert before['version'] == BUILD and before['values']['T6_ON'] == 1, before
            values = before['values']
            summary['values'] = values
            summary['server_selection'] = before['server'] or 'automatic'
            pg.on('pageerror', lambda e: summary['page_errors'].append(str(e)))
            await pg.bring_to_front()
            print('OUT', summary['out'], 'BUILD', BUILD, flush=True)
            for k in range(1, 6):
                if (OUT / 'STOP_NOW').exists() or (OUT / 'STOP').exists():
                    break
                assert all(hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == h for p, h in HASHES.items()), 'Code changed'
                await pg.wait_for_function('!window.playing&&document.getElementById("nick")&&!document.getElementById("nick").disabled', timeout=30000)
                assert await pg.evaluate('__slp.S.values') == values, 'Settings changed'
                await pg.evaluate('window.__slpLastRecord=null;window.__slpLastBox=null;window.__slpLastLog=null;__slp.setBot(true)')
                await pg.fill('#nick', nickname())
                await pg.press('#nick', 'Enter')
                await pg.wait_for_function('window.playing&&window.slither', timeout=25000)
                started = time.monotonic()
                reason, last_t, next_status = 'death', -1, 0
                capt = asyncio.create_task(camera(pg, OUT, k, started))
                print('START', k, flush=True)
                progress('playing', game=k, elapsed_s=0)
                try:
                    while True:
                        await asyncio.sleep(.35)
                        elapsed = time.monotonic() - started
                        poll = await pg.evaluate('({alive:!!(window.playing&&window.slither&&!slither.dead),version:__slp.version,values:__slp.S.values,bot:__slp.S.bot,trace:__slp.trace(150),status:__slp.status()})')
                        fresh = [r for r in poll['trace'] if r.get('t', -1) > last_t]
                        if fresh:
                            with (OUT / f'game_{k:02}_trace_live.jsonl').open('a') as f:
                                for row in fresh:
                                    f.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')
                            last_t = max(r['t'] for r in fresh)
                        if not poll['alive']:
                            save(f'game_{k:02}_end_detected.json', dict(elapsed_s=elapsed, status=poll['status']))
                            break
                        if (OUT / 'STOP_NOW').exists():
                            reason = 'user_stop'
                        elif poll['version'] != BUILD or poll['values'] != values or not poll['bot'] or summary['page_errors'] or poll['status'].get('errors'):
                            reason = 'settings_or_error'
                        elif elapsed >= 600:
                            reason = 'cap'
                        if reason != 'death':
                            await pg.evaluate('__slp.setBot(false);window.ws&&window.ws.close()')
                            break
                        if elapsed >= next_status:
                            next_status = elapsed + 15
                            progress('playing', game=k, elapsed_s=round(elapsed, 1), status=poll['status'])
                            print('PROGRESS', k, round(elapsed), json.dumps(poll['status'], ensure_ascii=False), flush=True)
                finally:
                    capt.cancel()
                    with contextlib.suppress(asyncio.CancelledError, Exception):
                        await capt
                await pg.wait_for_function('window.__slpLastRecord&&window.__slpLastBox&&window.__slpLastLog', timeout=30000)
                await pg.evaluate('__slp.setBot(false)')
                rec = await pg.evaluate('__slp.lastRecord()')
                rec.update(end_reason=reason, capped=reason == 'cap', interrupted=reason not in ['death', 'cap'])
                save(f'slp_{k:02}.json', rec)
                for label, key in [('box', '__slpLastBox'), ('log', '__slpLastLog')]:
                    data = base64.b64decode(await pg.evaluate('(key)=>__slp.lastBox(key)', key))
                    (OUT / f'slp_{k:02}_{label}.json.gz').write_bytes(data)
                await pg.screenshot(path=str(OUT / f'game_{k:02}_end.png'))
                item = {key: rec.get(key) for key in ['seconds', 'L_max', 'ticks', 'server', 'players', 'errors', 'best_rank', 'changes', 'end_reason', 'capped', 'interrupted']}
                item['game'] = k
                summary['games'].append(item)
                progress('game_finished', game=k)
                print('DONE', json.dumps(item, ensure_ascii=False), flush=True)
                if reason not in ['death', 'cap']:
                    break
                if k < 5:
                    await asyncio.sleep(8)
            summary['completed'] = len(summary['games']) == 5 and all(not g['interrupted'] for g in summary['games'])
    except Exception as e:
        summary['error'] = repr(e)
        print('ERROR', repr(e), flush=True)
        if pg and not pg.is_closed():
            with contextlib.suppress(Exception):
                await pg.evaluate('__slp.setBot(false);if(window.playing&&window.ws)ws.close()')
    finally:
        if pg and not pg.is_closed():
            with contextlib.suppress(Exception):
                await pg.evaluate('__slp.setBot(false)')
                summary['after'] = await pg.evaluate('({bot:__slp.S.bot,playing:!!window.playing,version:__slp.version,values:__slp.S.values})')
        summary['ended'] = time.strftime('%F %T')
        progress('finished')
        relay.close()
        await relay.wait_closed()
        print('FINISHED', summary['out'], flush=True)

if __name__ == '__main__':
    asyncio.run(main())
