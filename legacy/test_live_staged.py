"""Local-only checks of the live adapter; no game server is contacted."""
import asyncio
import unittest
import numpy as np
from playwright.async_api import async_playwright
from live_staged import unpack, CHROME, OBSERVE_JS, COMMAND_JS, nickname, staged_observation, live_controller
from staged import make_controller


class AdapterTests(unittest.TestCase):
    def test_nickname_format(self):
        for _ in range(100):
            name = nickname()
            self.assertRegex(name, r'^[a-z]{4}[1-9][0-9]$')
            self.assertNotRegex(name.lower(), r'bot|ai')

    def test_integer_wire_state_and_assumed_queue(self):
        raw = dict(x=0, y=0, ang=0, tgt=0, sp=5.8, sc=1, L=100,
                   boost=False, wall=[0, 0, 4500], heads=[], segs=[], food=[],
                   own_body=[[-60, 0], [-30, 0], [0, 0]])
        state = staged_observation(raw, 0.)
        self.assertEqual(state['own_body'].shape, (3, 2))
        self.assertEqual(state['pending'], [(0., False)] * 3)
        for stage in ('coil','pocket','pocket2','pocket3','pocket4','pocket5','pocket6','pocket7','pocket8','pocket10','pocket11','pocket12','pocket13'):
            ctrl = live_controller(stage)
            cmd, _ = ctrl(state)
            if hasattr(ctrl, 'close'): ctrl.close()
            self.assertTrue(np.isfinite(cmd).all())
        raw['own_body'] = [[float('nan'), 0]]
        with self.assertRaisesRegex(ValueError, 'own-body'):
            staged_observation(raw, 0.)


    def test_contact_gap(self):
        from live_staged import contact_gap
        base = dict(x=0., y=0., sc=1., heads=np.empty((0, 5)))
        gap, near = contact_gap(dict(base, segs=np.array([[-50, 40, 50, 40, 14.5]])))
        self.assertAlmostEqual(gap, 40-29)
        gap, near = contact_gap(dict(base, segs=np.empty((0, 5)), heads=np.array([[30, 0, 0, 5, 2.]])))
        self.assertAlmostEqual(gap, 30-14.5-29); self.assertEqual(near[0], 'head')



class BrowserBoundaryTests(unittest.IsolatedAsyncioTestCase):
    async def test_observation_and_command_on_local_mock(self):
        async with async_playwright() as pw:
            br = await pw.chromium.launch(headless=True, executable_path=CHROME)
            try:
                page = await br.new_page()
                await page.set_content('<title>offline adapter test</title>')
                await page.evaluate('''() => {
                    window.playing=true;
                    window.slither={xx:100,yy:200,ang:0,eang:0,sp:5.8,sc:1,sct:2,rsc:0,fam:0,md:false,
                        pts:[{xx:0,yy:200,dying:true},{xx:40,yy:200},{xx:70,yy:200}]};
                    window.slithers=[window.slither,{xx:300.5,yy:210.25,ang:1,sp:5,sc:1.5,pts:[{xx:250,yy:210.25}]}];
                    window.foods_c=0;window.foods=[];window.preys=[];
                    window.fpsls=[0,0,10];window.fmlts=[1,1,1];
                    window.grd=4500;window.flux_grd=4500;window.rank=200;window.slither_count=50;
                    window.setAcceleration=b=>{window.mockBoost=b;};
                }''')
                raw = unpack(await page.evaluate(OBSERVE_JS))
                self.assertEqual(raw['own_body'].tolist(), [[40, 200], [70, 200], [100, 200]])
                self.assertEqual(raw['segs'].tolist(), [[250, 210.25, 300.5, 210.25, 14.5*1.5]])
                self.assertEqual(raw['heads'].shape, (1, 5))
                state = staged_observation(raw, 0.)
                for stage in ('coil','pocket','pocket2','pocket3','pocket4','pocket5','pocket6','pocket7','pocket8','pocket10','pocket11','pocket12','pocket13'):
                    ctrl = live_controller(stage)
                    cmd, _ = ctrl(state)
                    if hasattr(ctrl, 'close'): ctrl.close()
                    self.assertTrue(await page.evaluate(COMMAND_JS, [float(cmd[0]), bool(cmd[1])]))
                await page.evaluate("() => setInterval(() => { if (window.playing && window.__lastCmd && Date.now()-window.__lastCmd > 1500) location.href='about:blank'; }, 250)")
                await asyncio.sleep(2.2)
                self.assertEqual(page.url, 'about:blank')  # dead-man switch left the game
                await page.set_content('<title>t</title>')
                await page.evaluate("() => { window.playing=true; window.slither={}; window.setAcceleration=()=>{}; }")
                await page.evaluate('window.slither.dead=true')
                self.assertIsNone(await page.evaluate(OBSERVE_JS))
                await page.evaluate('window.slither.dead=false')
                await page.evaluate('window.__stagedStop=true')
                self.assertFalse(await page.evaluate(COMMAND_JS, [1., True]))
                await page.evaluate('window.playing=false')
                self.assertIsNone(await page.evaluate(OBSERVE_JS))
            finally:
                await br.close()


if __name__ == '__main__':
    unittest.main()
