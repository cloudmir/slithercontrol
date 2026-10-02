"""Headless check of the MOD on ext/test/mock.html (game globals stand-in): boots, worker decides, commands move the
snake, sliders reach the pilot, overlay draws, a game record is written at death. No network.

  .venv/bin/python ext/test/mock_check.py [chromium executable]
"""
import base64
import glob
import gzip
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
exe = sys.argv[1] if len(sys.argv) > 1 else sorted(glob.glob(str(Path.home()/'.cache/ms-playwright/chromium-*/chrome-linux64/chrome')))[-1]
errors, logs = [], []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, executable_path=exe)
    pg = b.new_page(viewport={'width': 1280, 'height': 720}, accept_downloads=True)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: logs.append(m.text) if m.type in ('error', 'warning', 'log') else None)
    pg.goto((HERE/'mock.html').as_uri())
    pg.wait_for_function('window.__slp', timeout=10000)
    st0 = pg.evaluate('({worker: __slp.worker, version: __slp.version, x: slither.xx, y: slither.yy})')
    pg.evaluate('__slp.setBot(true)')
    pg.evaluate('rank = 12; slither_count = 321')             # visited-server population should be remembered
    pg.click('#slp .tabs >> text=표시')
    pg.click('text=모두 켜기')                  # every analysis display on
    time.sleep(3)
    widgets = pg.evaluate("['slp-terms', 'slp-tl'].map(id => !!document.getElementById(id))")
    st = pg.evaluate('__slp.status()')
    moved = pg.evaluate(f'Math.hypot(slither.xx - {st0["x"]}, slither.yy - {st0["y"]})')
    cmd = pg.evaluate('[xm, ym, slither.wmd]')
    pg.evaluate("__slp.setValue('SAFE', 25)")
    time.sleep(.5)
    pg.screenshot(path=str(HERE.parent.parent/'research'/'mod_mock.png'))
    tabs = {}                                    # every tab renders; the search box filters the sliders
    for k, lab in [('home', '홈'), ('tune', '조정'), ('show', '표시'), ('preset', '보관'), ('gfx', '화면'), ('game', '게임')]:
        pg.click(f'#slp .tabs >> text={lab}')
        tabs[k] = pg.evaluate("document.querySelectorAll('#slp .body > *').length")
        pg.screenshot(path=str(HERE.parent.parent/'research'/f'mod_panel_{k}.png'), clip=dict(x=775, y=0, width=505, height=720))
    server_ui = pg.evaluate("({seen: __slp.S.serverSeen['1.2.3.4:444'], cards: document.querySelectorAll('#slp .srv').length, text: document.querySelector('#slp .srvlist').innerText})")
    assert server_ui['seen']['players'] == 321 and server_ui['cards'] >= 3 and '321' in server_ui['text'], server_ui
    pg.click('#slp .tabs >> text=조정')
    grp_rows = "[...document.querySelectorAll('#slp .grp')].find(g => g.textContent.includes('코일·루프')).querySelectorAll('.it')"
    before = pg.evaluate(f"[...{grp_rows}].filter(r => r.style.display !== 'none').length")
    pg.click('#slp .grp h4 >> text=코일·루프')                 # advanced-only group: opening it shows its items
    opened = pg.evaluate(f"[...{grp_rows}].filter(r => r.style.display !== 'none').length")
    assert before == 0 and opened == 7, (before, opened)
    pg.fill('#slp-q', '부스트')
    shown = pg.evaluate("[...document.querySelectorAll('#slp .grp .it')].filter(r => r.style.display !== 'none').map(r => r.querySelector('.lab').textContent)")
    assert all(tabs.values()) and shown and all('부스트' in t for t in shown), (tabs, shown)
    pg.fill('#slp-q', '')
    # 1~4 keys (2026-09-28): Shift+n puts the current preset on key n, n switches to it; unsaved edits block the switch
    pg.evaluate("document.activeElement.blur(); __slp.S.presets.k2 = {profile: 'safe', values: {SAFE: 33}, savedAt: 1}; __slp.S.slots['2'] = 'k2'")
    pg.keyboard.press('Shift+Digit1')
    cur = lambda: pg.evaluate('[__slp.S.preset, __slp.S.values.SAFE, __slp.S.slots["1"]]')
    base = cur()
    pg.keyboard.press('Digit2')                                  # SAFE was set to 25 above: not saved -> stays
    blocked = cur()
    pg.evaluate("__slp.setValue('SAFE', __slp.S.presets[__slp.S.preset] ? __slp.S.presets[__slp.S.preset].values.SAFE : %s)" % pg.evaluate("SLP_PARAMS.profiles[__slp.S.profile] && SLP_PARAMS.profiles[__slp.S.profile].SAFE !== undefined ? SLP_PARAMS.profiles[__slp.S.profile].SAFE : SLP_PARAMS.defaults.SAFE"))
    pg.keyboard.press('Digit2')
    switched = cur() + [pg.evaluate("(document.querySelector('#slp .top .badge.key') || {}).textContent")]
    pg.keyboard.press('Digit4')                                  # empty key: warns only
    empty = cur()
    pg.keyboard.press('h')
    mini = pg.evaluate("document.getElementById('slp-mini').textContent")
    pg.keyboard.press('h')
    pg.keyboard.press('Digit1')
    back = cur()
    toast = pg.evaluate("(e => e && [e.textContent, getComputedStyle(e).opacity, e.getBoundingClientRect().top])(document.getElementById('slp-toast'))")
    print('keys', base, blocked, switched, empty, mini, back, toast)
    assert base[2] == base[0] and blocked[:2] == base[:2], (base, blocked)
    assert switched[:2] == ['k2', 33] and switched[3] == '2' and empty[0] == 'k2' and '[2] k2' in mini and back[0] == base[0] and toast[0] == '[1] 공격형 (기본)' and toast[2] < 40, (switched, empty, mini, back, toast)
    draws = '(async () => { const n = mockDraws; await new Promise(r => setTimeout(r, 500)); return mockDraws - n; })()'   # game redraw calls in .5 s
    fps0 = pg.evaluate('fps')
    pg.evaluate('__slp.setGfx(__slp.GFX_LEVELS[0][1])')      # graphics quality 0: our lines-and-circles renderer
    time.sleep(1)
    gfx0 = dict(mock_draws=pg.evaluate(draws), fps=pg.evaluate('fps') - fps0, mww=pg.evaluate('mww'), ticks=pg.evaluate('__slp.status().ticks'))
    pg.screenshot(path=str(HERE.parent.parent/'research'/'mod_mock_gfx0.png'))
    pg.evaluate("postMessage({slpStore: 'stale'}, '*')"); pg.wait_for_timeout(200)     # store.js after an extension reload
    assert '새로고침' in pg.evaluate("document.getElementById('slp').innerText"), 'stale store notice missing'
    pg.evaluate('__slp.setGfx(__slp.GFX_LEVELS[4][1])')
    time.sleep(.5)
    gfx4 = dict(mock_draws=pg.evaluate(draws), mww=pg.evaluate('mww'))
    assert gfx0['mock_draws'] == 0 and gfx0['fps'] > 5 and gfx4['mock_draws'] > 5 and gfx0['mww'] < gfx4['mww'], (gfx0, gfx4)
    loop = {}                                   # game loop from a timer; the 30 FPS cap no longer halves a 30/s loop
    for name, hz, cap in [('raf', 0, False), ('raf_cap', 0, True), ('t120', 120, False), ('t30_cap', 30, True), ('back', 0, False)]:
        pg.evaluate(f'__slp.setGfx({{hz: {hz}, cap: {str(cap).lower()}}})')
        time.sleep(2.2)
        loop[name] = pg.evaluate('__slp.perf()')
    print('loop', json.dumps(loop))
    assert loop['raf']['loops'] > 40 and 25 <= loop['raf_cap']['fps'] <= 33 and loop['t120']['loops'] > 90, loop
    assert 25 <= loop['t30_cap']['fps'] <= 31 and loop['back']['loops'] > 40 and loop['back']['loops'] < 70, loop
    with pg.expect_download(timeout=5000) as dl:
        pg.evaluate('slither.dead = true; playing = false')
    rec_file = dl.value.suggested_filename
    rec = pg.evaluate('__slp.lastRecord()')
    pg.wait_for_function('!!window.__slpLastBox', timeout=5000)
    box64 = pg.evaluate('__slp.lastBox()')                      # black box: gzip JSON of the last 30 s
    Path('/tmp/slp_mock_death').mkdir(exist_ok=True)
    Path('/tmp/slp_mock_death/slp_mock.json').write_text(json.dumps(rec))
    Path('/tmp/slp_mock_death/slp_mock_box.json.gz').write_bytes(base64.b64decode(box64))
    box_frames = len(json.loads(gzip.decompress(base64.b64decode(box64)))['frames'])
    pg.wait_for_function('!!window.__slpLastLog', timeout=5000)
    log = json.loads(gzip.decompress(base64.b64decode(pg.evaluate("__slp.lastBox('__slpLastLog')"))))
    log_rows = len(log['log']); log_keys_ok = len(log['keys']) == len(log['log'][0]) and log['log'][0][log['keys'].index('gap_now')] is not None
    time.sleep(.5)
    widgets.append(pg.evaluate("!!document.getElementById('slp-death')"))
    pg.screenshot(path=str(HERE.parent.parent/'research'/'mod_mock_death.png'))
    b.close()

ok = dict(worker=st0['worker'], ticks=st['ticks'] or 0, errors=st['errors'], decide_ms=st['last'] and round(st['last']['ms'], 1), server_ui=server_ui,
          moved_px=round(moved), cmd_set=cmd[0] != 0 or cmd[1] != 0, record=rec_file, rec_ticks=rec['ticks'],
          rec_trace=len(rec['trace']), rec_changes=rec['changes'], rec_hash=rec['values_hash'], page_errors=errors,
          decide_p95=rec['decide_ms']['p95'], obs_to_cmd_p95=rec['obs_to_cmd_ms']['p95'], widgets_terms_tl_death=widgets, gfx0=gfx0, gfx4=gfx4, tabs=tabs, search_boost=shown, box_frames=box_frames, log_rows=log_rows, log_keys_ok=log_keys_ok)
print(json.dumps(ok, ensure_ascii=False, indent=1))
print('console:', [l for l in logs if 'SLP' in l or 'rror' in l][:8])
assert ok['worker'] and ok['ticks'] > 30 and not ok['errors'] and ok['moved_px'] > 100 and ok['cmd_set'], ok
assert ok['box_frames'] > 30 and ok['log_rows'] >= ok['rec_ticks'] - 5 and ok['log_keys_ok'] and ok['rec_ticks'] > 30 and any('SAFE' in c for c in ok['rec_changes']) and not errors and all(widgets), ok
print('MOCK OK')
