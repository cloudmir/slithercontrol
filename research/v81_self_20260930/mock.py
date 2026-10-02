import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v81_self_20260930')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1440,'height':1080});errors=[]
 pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:d.accept())
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate('''() => {__slp.setBot(false);__slp.S.panel=true;__slp.S.tab='home';__slp.setValue('V8_ON',1);slither.xx=30000;slither.yy=30000;slither.sc=4;slithers=[slither];grd=30000;flux_grd=20000;foods=[];foods_c=0;}''')
 pg.locator('select[title="프리셋 고르기"]').select_option('v81_density')
 row=pg.locator('.quick-grid .li').filter(has_text='내 몸통 밀도 가중치')
 slider=row.locator('input[type="range"]');number=row.locator('input[type="number"]')
 assert [slider.get_attribute(x) for x in ['min','max','step']]==['0.01','1','0.01']
 assert number.input_value()=='0.10'
 pg.evaluate('''() => {window.selfScene=setInterval(()=>{const pts=[];for(let y=-600;y<=600;y+=30){const flip=((y+600)/30)%2;pts.push({xx:slither.xx+(flip?600:-600),yy:slither.yy+y},{xx:slither.xx+(flip?-600:600),yy:slither.yy+y})}slither.pts=pts;slithers=[slither]},20);__slp.setBot(true)}''')
 slider.focus();slider.press('Home')
 pg.wait_for_function('__slp.S.values.V81_BODY_SELF_W===.01 && __slp.status().last?.v81_density>0 && __slp.status().last.v81_density<1.01 && __slp.status().last.v8_phase==="feed"',timeout=15000)
 low=pg.evaluate('__slp.trace(1)[0]')
 slider.press('End')
 pg.wait_for_function('__slp.S.values.V81_BODY_SELF_W===1 && __slp.status().last?.v81_density>99 && __slp.status().last.v8_phase==="avoid"',timeout=15000)
 high=pg.evaluate('__slp.trace(1)[0]');assert high['v8_heads']==0 and high['v81_reason']=='body'
 number.fill('0.1');number.dispatch_event('change')
 pg.wait_for_function('__slp.status().last?.v81_density>9.9 && __slp.status().last.v81_density<10.1 && __slp.status().last.v8_phase==="feed"',timeout=15000)
 tenth=pg.evaluate('__slp.trace(1)[0]');assert slider.input_value()=='0.1'
 pg.evaluate('clearInterval(selfScene);__slp.setBot(false)')
 number.fill('0.37');number.dispatch_event('change')
 pg.screenshot(path=str(out/'controls.png'))
 pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.values?.V81_BODY_SELF_W===.37")
 pg.reload();pg.wait_for_function('window.__slp')
 assert pg.evaluate('__slp.S.values.V81_BODY_SELF_W')==.37
 assert not errors,errors
 result={'version':pg.evaluate('__slp.version'),'worker':pg.evaluate('__slp.worker'),'weights':[.01,.1,1],'densities':[low['v81_density'],tenth['v81_density'],high['v81_density']],'selfOnlyTriggersAvoid':True,'saved':.37,'errors':errors,'scope':'local browser Worker and toy scene, no survival test'}
 (out/'mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result));b.close()
