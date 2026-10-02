import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/two_modes_20261001')
assert Path('ext/pilot.js').read_bytes()==(out/'before/pilot.js').read_bytes()
assert Path('params.json').read_bytes()==(out/'before/params.json').read_bytes()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp');pg.evaluate("__slp.setBot(false);__slp.S.tab='home';__slp.setValue('W_FOOD',__slp.S.values.W_FOOD)")
 assert pg.locator('#slp .seg button').all_text_contents()==['V8-1','V10-1']
 keys=pg.locator('#slp select.fill option:not([disabled])').evaluate_all('(es)=>es.map(e=>e.value)');assert keys==['v81_density','v101_hybrid'],keys
 pg.get_by_role('button',name='V8-1',exact=True).click();assert pg.evaluate('[__slp.S.values.V8_ON,__slp.S.values.V81_BODY_ON,__slp.S.values.V10_ON]')==[1,1,0]
 pg.get_by_role('button',name='V10-1',exact=True).click();assert pg.evaluate('[__slp.S.values.V101_ON,__slp.S.values.V11_ON,__slp.S.values.V111_ON,__slp.S.values.V102_ON]')==[1,0,0,0]
 pg.screenshot(path=str(out/'ui.png'));assert not errors,errors
 r={'buttons':['V8-1','V10-1'],'presetOptions':keys,'bothSelectionsWork':True,'pilotUnchanged':True,'paramsUnchanged':True,'errors':errors};out.joinpath('result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(r);b.close()
