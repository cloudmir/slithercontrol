"""Real browser Workers and UI; toy motion does not validate survival performance."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v7_mock_20260930');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1280,'height':900});errors=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('dialog',lambda d:d.accept())
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate('''() => {__slp.setBot(false); slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=2;slither.sp=5.8;slithers=[slither];grd=30000;flux_grd=20000;foods=[];foods_c=0;
 window.labels=new Set();const orig=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(typeof t==='string'&&t.startsWith('V7 ·'))labels.add(t);return orig.call(this,t,...a)};}''')
 pg.locator('select[title="프리셋 고르기"]').select_option('v7_remains')
 assert pg.evaluate('__slp.S.values.V7_ON')==1
 assert pg.evaluate('__slp.S.values.W_GOAL')==250
 pg.evaluate('__slp.setBot(true)')
 pg.wait_for_function("__slp.status().last?.v7_phase === 'feed'",timeout=15000)
 feed=pg.evaluate('__slp.status()')
 pg.evaluate('''() => {window.enemies=[1,2,3].map((id,i)=>({id,xx:slither.xx-350,yy:slither.yy+(i-1)*50,ang:Math.PI,sp:5.8,sc:1,dead:false,pts:[],sct:30,rsc:0,fam:0,cs:'#a55'}));slithers=[slither,...enemies];window.followHeads=setInterval(()=>enemies.forEach((h,i)=>{h.xx=slither.xx-350;h.yy=slither.yy+(i-1)*50}),20)}''')
 pg.wait_for_function("__slp.status().last?.v7_phase === 'avoid'",timeout=15000)
 pg.wait_for_function("__slp.trace(1)[0]?.v3_route_match === 1",timeout=15000)
 avoid=pg.evaluate('({status:__slp.status(),trace:__slp.trace(1)[0]})')
 assert avoid['trace']['v6_intent']=='escape',avoid
 assert avoid['trace']['v7_heads']==3
 pg.screenshot(path=str(out/'avoid.png'))
 pg.evaluate('clearInterval(followHeads);slithers=[slither]')
 pg.wait_for_timeout(200)
 assert pg.evaluate('__slp.status().last.v7_phase')=='avoid'
 pg.wait_for_function("__slp.status().last?.v7_phase === 'feed'",timeout=10000)
 returned=pg.evaluate('__slp.status()')
 # Expanded observation: one head outside the old 1150px observation radius must still trigger V7.
 for key,value in {'V7_HEAD_R':2500,'V7_HEAD_N':1,'V7_CLEAR_S':.5}.items():
  ctl=pg.locator(f'.li[title^="{key} ·"] input');assert ctl.count()==1 and ctl.is_enabled();ctl.fill(str(value));ctl.dispatch_event('change')
 pg.evaluate('''() => {slithers=[slither,{id:99,xx:slither.xx+2000,yy:slither.yy,ang:0,sp:5.8,sc:1,dead:false,pts:[],sct:30,rsc:0,fam:0,cs:'#a55'}]}''')
 pg.wait_for_function("__slp.status().last?.v7_phase === 'avoid'",timeout=15000)
 far=pg.evaluate('__slp.status()');assert far['last']['v7_heads']==1
 pg.evaluate('__slp.setBot(false)')
 assert pg.evaluate("document.querySelector('#slp .seg').scrollWidth <= document.querySelector('#slp .seg').clientWidth + 1")
 pg.screenshot(path=str(out/'controls.png'))
 pg.locator('#slp .seg button').filter(has_text='V6 · 이중층').click();assert pg.evaluate('__slp.S.values.V7_ON')==0
 pg.locator('#slp .seg button').filter(has_text='V7 · 자동 전환').click();assert pg.evaluate('__slp.S.values.V7_ON')==1
 pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.values?.V7_ON === 1 && JSON.parse(localStorage.getItem('slp.v1'))?.values?.V7_HEAD_R === 2500")
 pg.reload();pg.wait_for_function('window.__slp')
 stored=pg.evaluate('[__slp.S.values.V7_ON,__slp.S.values.V7_HEAD_R,__slp.S.values.V7_HEAD_N,__slp.S.values.V7_CLEAR_S]');assert stored==[1,2500,1,.5],stored
 result={'version':pg.evaluate('__slp.version'),'feed':feed,'avoid':avoid,'returned':returned,'far':far,'errors':errors,'saved':True}
 assert not errors,errors
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=1));print(json.dumps({k:v for k,v in result.items() if k!='avoid'},ensure_ascii=False))
 b.close()
