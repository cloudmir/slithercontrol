import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/t3_rebuild_20261002')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page(viewport={'width':1280,'height':900});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp');pg.evaluate('__slp.setBot(false)');pg.get_by_role('button',name='T3',exact=True).click()
 assert pg.evaluate('[__slp.S.values.T3_ON,__slp.S.values.VA1_ON,__slp.S.values.V10_ON]')==[1,0,0]
 pg.evaluate('''() => {slither.xx=30000;slither.yy=30074.5;slither.ang=0;slither.sc=1;slither.sp=5.8;slither.pts=[];grd=30000;flux_grd=20000;foods=[];foods_c=0;slithers=[{id:9,xx:34000,yy:30000,fx:0,fy:0,cs:'#a55',ang:0,sp:5.8,sc:20/14.5,sct:400,rsc:0,fam:0,pts:Array.from({length:31},(_,i)=>({xx:27000+i*200,yy:30000,fx:0,fy:0}))},slither];__slp.setValue("T3_SPEED",1);__slp.setBot(true)}''')
 pg.wait_for_function("__slp.status().last?.t3_phase==='follow'",timeout=20000);pg.wait_for_timeout(1300)
 tr=pg.evaluate('__slp.trace(80)');assert any(q.get('boost') for q in tr if q.get('t3_phase')=='follow');assert any(q.get('t3_enemy_r') for q in tr)
 pg.evaluate('__slp.setBot(false)');pg.screenshot(path=str(out/'ui.png'));pg.wait_for_timeout(350);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.T3_ON')==1
 pg.get_by_role('button',name='V1',exact=True).click();assert pg.evaluate('__slp.S.values.T3_ON')==0
 pg.get_by_role('button',name='T3',exact=True).click();pg.get_by_role('button',name='V10-1',exact=True).click();assert pg.evaluate('__slp.S.values.T3_ON')==0
 assert not errors,errors
 result={'realWorkerT3':True,'boostRequest':True,'modeSwitchOff':True,'persisted':True,'pageErrors':errors};out.joinpath('mock.json').write_text(json.dumps(result,indent=2));print(result);b.close()
