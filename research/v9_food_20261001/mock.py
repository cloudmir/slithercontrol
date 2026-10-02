import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v9_food_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1440,'height':1080});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate("""() => {__slp.setBot(false);__slp.S.tab='home';slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sp=6.12;slither.sc=2;grd=30000;flux_grd=20000;slithers=[slither];foods=[];foods_c=0;window.boosts=[];const old=setAcceleration;window.setAcceleration=x=>{boosts.push(x);old(x)};}""")
 pg.get_by_role('button',name='V9',exact=True).click()
 for label in ['잔해 추종 가중치','잔해 탐색 범위','중앙 이동 가중치','목표 유지 시간','부스트 최소 잔해량','부스트 최소 거리']:
  assert pg.get_by_role('slider',name=label+' 슬라이더',exact=True).count()==1
 pg.evaluate("""() => {foods=[{xx:30600,yy:30000,sz:16},{xx:30612,yy:30000,sz:16},{xx:30624,yy:30000,sz:16},{xx:30636,yy:30000,sz:16}];foods_c=foods.length;__slp.setBot(true)}""")
 pg.wait_for_function("__slp.status().last?.mode==='v9food' && boosts.includes(1)",timeout=15000)
 toggle=pg.locator('.li').filter(has=pg.get_by_text('잔해 적극 부스트',exact=True)).locator('button.sw')
 toggle.click();pg.wait_for_function('!slither.wmd');pg.evaluate('boosts=[]');pg.wait_for_timeout(600);assert not pg.evaluate('boosts.includes(1)')
 slider=pg.get_by_role('slider',name='잔해 탐색 범위 슬라이더',exact=True)
 slider.fill('500');slider.dispatch_event('change');pg.evaluate('foods.forEach((f,i)=>{f.xx=slither.xx+1500+i*12;f.yy=slither.yy})');pg.wait_for_timeout(700)
 assert pg.evaluate('__slp.S.values.V9_FOOD_R')==500
 assert pg.evaluate('__slp.status().last.mode')!='v9food'
 pg.screenshot(path=str(out/'controls.png'))
 pg.evaluate('__slp.setBot(false)');pg.wait_for_timeout(350);pg.reload();pg.wait_for_function('window.__slp')
 assert pg.evaluate('__slp.S.values.V9_BOOST_ON')==0 and pg.evaluate('__slp.S.values.V9_FOOD_R')==500
 assert not errors,errors
 result={'version':pg.evaluate('__slp.version'),'workerFoodPath':True,'workerBoost':True,'switchOffStopsBoost':True,'rangeChangesTarget':True,'controlsAndPersistence':True,'errors':errors}
 (out/'mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result));b.close()
