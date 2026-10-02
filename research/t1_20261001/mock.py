import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/t1_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page(viewport={'width':1280,'height':900});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp');pg.evaluate('__slp.setBot(false)');pg.get_by_role('button',name='T1',exact=True).click()
 assert pg.evaluate('[__slp.S.values.T1_ON,__slp.S.values.VA1_ON,__slp.S.values.V10_ON]')==[1,0,0]
 pg.evaluate('''() => {slither.xx=30000;slither.yy=30046.5;slither.ang=0;slither.sc=1;slither.sp=5.8;slither.pts=[];grd=30000;flux_grd=20000;foods=[];foods_c=0;slithers=[{id:9,xx:34000,yy:30000,fx:0,fy:0,cs:'#a55',ang:0,sp:5.8,sc:20/14.5,sct:400,rsc:0,fam:0,pts:Array.from({length:31},(_,i)=>({xx:27000+i*200,yy:30000,fx:0,fy:0}))},slither];__slp.setBot(true)}''')
 pg.wait_for_function("__slp.status().last?.t1_phase==='follow'",timeout=20000);pg.wait_for_timeout(1300)
 tr=pg.evaluate('__slp.trace(80)');assert all(not q['boost'] for q in tr if q.get('t1_phase')=='follow');assert any(q.get('t1_enemy_r') for q in tr)
 pg.evaluate('__slp.setBot(false)');pg.screenshot(path=str(out/'ui.png'));pg.wait_for_timeout(350);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.T1_ON')==1
 pg.get_by_role('button',name='V1',exact=True).click();assert pg.evaluate('__slp.S.values.T1_ON')==0
 pg.get_by_role('button',name='T1',exact=True).click();pg.get_by_role('button',name='V10-1',exact=True).click();assert pg.evaluate('__slp.S.values.T1_ON')==0
 pg.goto(Path('research/t1_20261001/report.html').resolve().as_uri());pg.screenshot(path=str(out/'report_preview.png'));assert pg.locator('#cards .card').count()==4;assert pg.locator('#bins tr').count()==5;pg.locator('#own').select_option('small');pg.locator('#raw').check()
 assert not errors,errors
 result={'realWorkerT1Following':True,'cruiseOnlyWhileFollowing':True,'measurementColumnsPresent':True,'T1Persistence':True,'modeSwitchOff':True,'dashboardFilters':True,'pageErrors':errors,'scope':'local synthetic browser, no live samples'};out.joinpath('mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));b.close()
