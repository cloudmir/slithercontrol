"""End-to-end timing on Windows Chrome with a crowded mock game state (no game server)."""
import asyncio, sys, time, json, numpy as np
sys.path.insert(0, '.')
import win_chrome
from playwright.async_api import async_playwright
from live_staged import OBSERVE_JS, COMMAND_JS, unpack, staged_observation
from pocket5 import Pocket5Controller
from pocket6 import Pocket6Controller
import base64
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'pocket5'

def mock_js():
    rng = np.random.default_rng(0)
    p = np.array([30000., 30000.])
    snakes = []
    for i in range(7):   # big coiled snakes around us, like the live death scene
        t = np.linspace(0, 10*np.pi, 600); c = p + rng.uniform(-700, 700, 2)
        pts = c + np.column_stack((np.cos(t), np.sin(t)*.6))*(250+15*t)[:, None]
        pts = pts[np.linalg.norm(pts-p, axis=1) > 150]
        snakes.append(dict(id=i+1, xx=float(pts[-1, 0]), yy=float(pts[-1, 1]), ang=1.0, sp=6.0, sc=float(rng.uniform(2, 2.7)),
                           pts=[dict(xx=float(x), yy=float(y)) for x, y in pts[:-1]]))
    own = [dict(xx=float(p[0]-i*20), yy=float(p[1])) for i in range(300, 0, -1)]
    food = [dict(xx=float(x), yy=float(y), sz=float(s), eaten=False) for x, y, s in
            np.column_stack((p+rng.uniform(-1200, 1200, (900, 2)), rng.uniform(4, 15, 900)))]
    return f"""() => {{
      window.playing = true;
      window.slither = {{xx:{p[0]}, yy:{p[1]}, ang:0, eang:0, sp:5.9, sc:2.4, sct:200, rsc:0, fam:0, md:false, dead:false, pts:{json.dumps(own)}}};
      window.slithers = [window.slither].concat({json.dumps(snakes)});
      window.foods = {json.dumps(food)}; window.foods_c = window.foods.length; window.preys = [];
      window.fpsls = new Array(1000).fill(0).map((_, i) => i*0.9); window.fmlts = new Array(1000).fill(1);
      window.grd = 21600; window.flux_grd = 21600; window.rank = 30; window.slither_count = 400;
      window.setAcceleration = b => {{ window.mockBoost = b; }};
    }}"""

async def main():
    win_chrome.launch()
    server, url = await win_chrome.relay()
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp(url, timeout=60000)
        page = await b.contexts[0].new_page()
        await page.set_viewport_size({'width': 960, 'height': 600})
        cdp = await page.context.new_cdp_session(page)
        await page.set_content('<title>mock</title>')
        await page.evaluate(mock_js())
        from live_staged import live_controller
        ctrl = Pocket5Controller() if STAGE == 'pocket5' else live_controller(STAGE)
        period = getattr(ctrl, 'period', 2/30); view = getattr(ctrl, 'near_view', None)
        async def camera():
            while True:
                await asyncio.sleep(.5)
                await cdp.send('Page.captureScreenshot', dict(format='jpeg', quality=45, clip=dict(x=0, y=0, width=960, height=600, scale=1.)))
        cam = asyncio.create_task(camera())
        obs, dec, cmd_t, size, loop = [], [], [], [], []
        last = time.perf_counter()
        for k in range(150):
            radius = None if view is None else (view[1] if k % view[2] == 0 else view[0])
            a = time.perf_counter(); loop.append((a-last)*1000); last = a
            raw = await page.evaluate(OBSERVE_JS, radius); b1 = time.perf_counter()
            size.append(sum(len(v) for v in raw.values() if isinstance(v, str)))
            raw = unpack(raw); assert len(raw['sid']) == len(raw['segs']) and len(raw['hid']) == len(raw['heads'])
            st = staged_observation(raw, k*period); st['full_view'] = view is None or radius == view[1]
            cmd, _ = ctrl(st); b2 = time.perf_counter()
            await page.evaluate(COMMAND_JS, [float(cmd[0]), bool(cmd[1])]); b3 = time.perf_counter()
            obs.append((b1-a)*1000); dec.append((b2-b1)*1000); cmd_t.append((b3-b2)*1000)
            await asyncio.sleep(max(.001, period-(time.perf_counter()-a)))
        f = lambda v: f"p50 {np.percentile(v,50):.0f} p95 {np.percentile(v,95):.0f} max {max(v):.0f} ms"
        print('segs', len(st['segs']), 'food', len(st['food']), 'payload KB', round(np.mean(size)/1024))
        print('observe+transfer', f(obs)); print(f'decide ({STAGE})', f(dec)); print('command', f(cmd_t))
        print('work per tick', f(np.array(obs)+np.array(dec)+np.array(cmd_t)), '| mode', ctrl.last.get('mode'))
        print('actual tick interval', f(loop[5:]), f'(target {period*1000:.0f} ms)')
        cam.cancel()
        if hasattr(ctrl, 'close'): ctrl.close()
        await page.close()
    server.close(); win_chrome.close()
asyncio.run(main())
