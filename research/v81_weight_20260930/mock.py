import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v81_weight_20260930')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1440,'height':1080});errors=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('dialog',lambda d:d.accept())
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate('''() => {__slp.setBot(false);__slp.S.panel=true;__slp.S.tab='home';__slp.setValue('V8_ON',1);slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=2;slither.sp=5.8;slithers=[slither];grd=30000;flux_grd=20000;foods=[];foods_c=0;}''')
 pg.locator('select[title="프리셋 고르기"]').select_option('v8_exact')
 pg.evaluate('__slp.setValue("V8_HEAD_R",475)')
 pg.get_by_role('button',name='V8-1',exact=True).click()
 assert pg.evaluate('[__slp.S.values.V8_ON,__slp.S.values.V81_BODY_ON,__slp.S.values.V8_HEAD_R]')==[1,1,475]
 assert '몸통' in pg.get_by_role('button',name='V8-1',exact=True).get_attribute('title')
 pg.evaluate('__slp.setBot(true)')
 pg.wait_for_function("__slp.status().last?.v8_phase === 'feed'",timeout=15000)
 # Follow the toy snake with two thick parallel bodies. Heads remain far outside the head threshold.
 pg.evaluate('''() => {window.bodyScene=setInterval(()=>{slithers=[slither,...[-110,110].map((dy,i)=>({id:i+30,xx:slither.xx+2000,yy:slither.yy+dy,ang:0,sp:6,sc:3,pts:[{xx:slither.xx-2000,yy:slither.yy+dy}],dead:false,sct:100,rsc:0,fam:0,cs:'#a55'}))]},20)}''')
 pg.wait_for_function("__slp.status().last?.v81_reason === 'body'",timeout=15000)
 body=pg.evaluate('({status:__slp.status(),trace:__slp.trace(1)[0]})')
 assert body['trace']['v8_phase']=='avoid' and body['trace']['v8_heads']==0
 assert body['trace']['v81_density']>=18 and body['trace']['v81_body_trigger']==1
 # Weight slider actually changes the observed density in the page -> Worker pipeline.
 wrow=pg.locator('.quick-grid .li').filter(has_text='몸통 근접 가중치')
 wslider=wrow.locator('input[type="range"]');wslider.focus();wslider.press('Home')
 pg.wait_for_function('__slp.S.values.V81_BODY_NEAR_W===0');pg.wait_for_timeout(500)
 unweighted=pg.evaluate('__slp.status().last.v81_density')
 wslider.press('End');pg.wait_for_function('__slp.S.values.V81_BODY_NEAR_W===10')
 pg.wait_for_function('(raw)=>__slp.status().last.v81_density>raw*1.1',arg=unweighted)
 weighted=pg.evaluate('__slp.status().last.v81_density')
 assert wrow.locator('input[type="number"]').input_value()=='10.0'
 # Higher threshold releases despite the same bodies; change it through the actual home control.
 row=pg.locator('.quick-grid .li').filter(has=pg.locator('input[type="number"]')).filter(has_text='회피 전환 점유율 (%)')
 field=row.locator('input[type="number"]');field.fill('60');field.dispatch_event('change')
 pg.wait_for_function("__slp.status().last?.v8_phase === 'feed'",timeout=15000)
 assert row.locator('input[type="range"]').input_value()=='60'
 slider=row.locator('input[type="range"]');slider.focus();slider.press('Home');slider.press('ArrowRight')
 pg.wait_for_function('__slp.S.values.V81_BODY_PCT===2')
 pg.wait_for_function("__slp.status().last?.v81_reason === 'body'",timeout=15000)
 pg.evaluate('clearInterval(bodyScene);slithers=[slither]')
 pg.wait_for_function("__slp.status().last?.v81_reason === 'hold'",timeout=15000)
 pg.wait_for_function("__slp.status().last?.v8_phase === 'feed'",timeout=15000)
 pg.evaluate('__slp.setBot(false)')
 pg.screenshot(path=str(out/'controls.png'))
 pg.get_by_role('button',name='V8',exact=True).click()
 assert pg.evaluate('__slp.S.values.V81_BODY_ON')==0
 pg.locator('select[title="프리셋 고르기"]').select_option('v81_density')
 assert pg.evaluate('__slp.S.values.V81_BODY_ON')==1
 pg.evaluate('__slp.setValue("V81_BODY_R",700);__slp.setValue("V81_BODY_PCT",23);__slp.setValue("V81_BODY_NEAR_W",6.5)')
 pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.values?.V81_BODY_R===700 && JSON.parse(localStorage.getItem('slp.v1'))?.values?.V81_BODY_PCT===23 && JSON.parse(localStorage.getItem('slp.v1'))?.values?.V81_BODY_NEAR_W===6.5")
 pg.reload();pg.wait_for_function('window.__slp')
 stored=pg.evaluate('[__slp.S.values.V8_ON,__slp.S.values.V81_BODY_ON,__slp.S.values.V81_BODY_R,__slp.S.values.V81_BODY_PCT,__slp.S.values.V81_BODY_NEAR_W]');assert stored==[1,1,700,23,6.5],stored
 assert not errors,errors
 assert pg.evaluate('document.querySelector("#slp .seg").scrollWidth <= document.querySelector("#slp .seg").clientWidth+1')
 result={'version':pg.evaluate('__slp.version'),'weightChangedDensity':[unweighted,weighted],'worker':pg.evaluate('__slp.worker'),'body':body,'thresholdSliderAndClearReturn':True,'v8ButtonDisablesDensity':True,'saved':stored,'errors':errors,'scope':'local browser and real Workers; toy world, no survival test'}
 (out/'mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'version':result['version'],'density':body['trace']['v81_density'],'heads':body['trace']['v8_heads'],'saved':stored,'errors':errors}))
 b.close()
