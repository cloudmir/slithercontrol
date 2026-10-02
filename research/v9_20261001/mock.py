import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v9_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1440,'height':1080});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate('''() => {__slp.setBot(false);__slp.S.panel=true;__slp.S.tab='home';slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sp=6.12;slither.sc=2;grd=30000;flux_grd=20000;foods=[];foods_c=0;
 slithers=[slither];window.lines=[];const P=CanvasRenderingContext2D.prototype,o=P.stroke;P.stroke=function(){if(['#45f08a','#53baff','#ffd269'].includes(this.strokeStyle))lines.push({color:this.strokeStyle,width:this.lineWidth});return o.call(this)};}''')
 pg.get_by_role('button',name='V9',exact=True).click()
 assert pg.evaluate('__slp.S.values.V9_ON')==1
 assert pg.get_by_role('slider',name='탈출 후보 수 슬라이더').count()==1
 pg.evaluate('__slp.setBot(true)')
 pg.wait_for_function('__slp.status().last?.v9_routes>=2',timeout=20000)
 pg.wait_for_function('lines.some(l=>l.color==="#53baff")')
 assert pg.evaluate('lines.every(l=>l.width===.5)')
 # Place two physical walls, including one with both ends beyond the observation radius.
 pg.evaluate('''() => {__slp.setBot(false);window.walls=[{id:901,xx:slither.xx+1800,yy:slither.yy-140,ang:0,sp:6,sc:1.5,dead:false,pts:[{xx:slither.xx-1800,yy:slither.yy-140}],sct:30,rsc:0,fam:0,cs:'#794da8'},{id:902,xx:slither.xx+1800,yy:slither.yy+140,ang:0,sp:6,sc:1.5,dead:false,pts:[{xx:slither.xx-1800,yy:slither.yy+140}],sct:30,rsc:0,fam:0,cs:'#794da8'}];slithers=[slither,...walls];__slp.setBot(true);}''')
 pg.wait_for_timeout(1500)
 assert pg.evaluate('__slp.status().last.v9_routes')>=1
 pg.screenshot(path=str(out/'v9.png'))
 # A short central body wall has distinct exits on both sides. Capture all routes.
 pg.evaluate("""() => {__slp.setBot(false);const x=slither.xx,y=slither.yy;slither.ang=0;slither.pts=[{xx:x-160,yy:y},{xx:x-80,yy:y}];slithers=[slither,{id:903,xx:x+280,yy:y+220,ang:Math.PI/2,sp:5.8,sc:1.5,dead:false,pts:[{xx:x+280,yy:y-220}],sct:30,rsc:0,fam:0,cs:'#794da8'}];__slp.setZoom(.6);__slp.setBot(true);}""")
 pg.wait_for_function('__slp.status().last?.v9_routes>=2',timeout=15000)
 pg.screenshot(path=str(out/'multiple.png'))

 before=pg.evaluate('JSON.stringify(__slp.S.values)');toggle=pg.get_by_role('switch',name='V9 탈출 후보 표시',exact=True);toggle.click()
 pg.evaluate('lines=[]');pg.wait_for_timeout(160);assert pg.evaluate('lines.length')==0
 assert pg.evaluate('JSON.stringify(__slp.S.values)')==before
 toggle.click()
 pg.get_by_role('slider',name='탈출 후보 수 슬라이더').focus();pg.get_by_role('slider',name='탈출 후보 수 슬라이더').press('ArrowLeft')
 assert pg.evaluate('__slp.S.values.V9_ROUTES')==2
 pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.values?.V9_ROUTES===2")
 pg.get_by_role('button',name='V1',exact=True).click();assert pg.evaluate('__slp.S.values.V9_ON')==0
 pg.get_by_role('button',name='V9',exact=True).click();pg.evaluate('__slp.setBot(false)')
 pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.values?.V9_ON===1 && JSON.parse(localStorage.getItem('slp.v1'))?.bot===false")
 pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.V9_ON')==1
 assert not errors,errors
 result={'version':pg.evaluate('__slp.version'),'multipleWorkerRoutes':True,'thinLines':True,'corridorRoute':True,'displayTogglePreservesValues':True,'sliderWorks':True,'v1SwitchOff':True,'saved':True,'errors':errors}
 (out/'mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result));b.close()
