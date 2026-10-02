import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v10_contract_audit_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1440,'height':1080});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));workers=[];pg.on('worker',lambda w:workers.append(w))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate("""() => {__slp.setBot(false);__slp.S.tab='home';slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sp=6.12;slither.sc=2;grd=30000;flux_grd=20000;slithers=[slither];foods=[];foods_c=0;}""")
 pg.get_by_role('button',name='V10',exact=True).click()
 assert pg.evaluate('__slp.S.values.V10_ON===1 && __slp.S.values.V9_ON===0')
 for label in ['잔해 추종 가중치','잔해 탐색 범위','중앙 이동 가중치','몸통·벽 여유','지도 목표 거리','근접 계산 목표 ms']:
  assert pg.get_by_role('slider',name=label+' 슬라이더',exact=True).count()==1,label
 pg.evaluate("""() => {foods=[{xx:30600,yy:30000,sz:16},{xx:30612,yy:30000,sz:16},{xx:30624,yy:30000,sz:16},{xx:30636,yy:30000,sz:16}];foods_c=foods.length;__slp.setBot(true)}""")
 pg.wait_for_function("__slp.status().last?.mode?.startsWith('v10')",timeout=15000);pg.wait_for_timeout(1200)
 status=pg.evaluate('__slp.status()');assert len(workers)==3,len(workers)
 pg.evaluate("foods.forEach((f,i)=>{f.xx=slither.xx+600+i*12;f.yy=slither.yy});__slp.setValue('V9_BOOST_ON',1)")
 pg.wait_for_function('!!slither.wmd',timeout=10000)
 pg.evaluate("() => {const post=Worker.prototype.postMessage;Worker.prototype.postMessage=function(m,...rest){if(m.type==='step')return;return post.call(this,m,...rest)}}")
 pg.wait_for_timeout(450);assert not pg.evaluate('!!slither.wmd'),'expired local command kept boost on'

 pg.screenshot(path=str(out/'v10.png'))
 pg.evaluate('__slp.setBot(false)');pg.get_by_role('button',name='V9',exact=True).click();assert pg.evaluate('__slp.S.values.V10_ON===0 && __slp.S.values.V9_ON===1')
 pg.get_by_role('button',name='V10',exact=True).click();pg.get_by_role('button',name='V1',exact=True).click();assert not pg.evaluate('__slp.S.values.V10_ON')
 pg.get_by_role('button',name='V10',exact=True).click();pg.wait_for_timeout(400);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.V10_ON')==1
 assert not errors,errors
 result={'version':pg.evaluate('__slp.version'),'workers':len(workers)//2,'expiredCommandDisablesBoost':True,'modeSwitch':True,'controlsAndPersistence':True,'status':status,'errors':errors}
 (out/'mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result));b.close()
