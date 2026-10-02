"""Real browser Workers and UI; toy motion does not validate survival performance."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v8_maze_review_20261001');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1280,'height':900});errors=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('dialog',lambda d:d.accept())
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate('''() => {__slp.setBot(false); slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=2;slither.sp=5.8;slithers=[slither];grd=30000;flux_grd=20000;foods=[];foods_c=0;
 window.labels=new Set();const orig=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(typeof t==='string'&&t.startsWith('V8 ·'))labels.add(t);return orig.call(this,t,...a)};}''')
 pg.locator('select[title="프리셋 고르기"]').select_option('v8_exact')
 assert pg.evaluate('__slp.S.values.V8_ON')==1
 assert pg.evaluate('__slp.S.values.W_GOAL')==300
 assert pg.evaluate('[__slp.S.values.BOOST_COST,__slp.S.values.HEAP_GATE,__slp.S.values.SIZE_PROFILE,__slp.S.values.V6_MARGIN,__slp.S.values.V6_FOOD_R]')==[15,0,0,1,5000]
 pg.evaluate('__slp.setBot(true)')
 pg.wait_for_function("__slp.status().last?.v8_phase === 'feed'",timeout=15000)
 feed=pg.evaluate('__slp.status()')
 pg.evaluate('''() => {window.enemies=[1,2,3].map((id,i)=>({id,xx:slither.xx-350,yy:slither.yy+(i-1)*50,ang:Math.PI,sp:5.8,sc:1,dead:false,pts:[],sct:30,rsc:0,fam:0,cs:'#a55'}));slithers=[slither,...enemies];window.followHeads=setInterval(()=>enemies.forEach((h,i)=>{h.xx=slither.xx-350;h.yy=slither.yy+(i-1)*50}),20)}''')
 pg.wait_for_function("__slp.status().last?.v8_phase === 'avoid'",timeout=15000)
 pg.wait_for_function("__slp.trace(1)[0]?.v3_route_match === 1",timeout=15000)
 avoid=pg.evaluate('({status:__slp.status(),trace:__slp.trace(1)[0]})')
 assert avoid['trace']['v6_intent'] in ['escape','explore','food'],avoid
 assert avoid['trace']['v8_heads']==3
 pg.screenshot(path=str(out/'avoid.png'))
 pg.evaluate('clearInterval(followHeads);slithers=[slither]')
 pg.wait_for_timeout(200)
 assert pg.evaluate('__slp.status().last.v8_phase')=='avoid'
 pg.wait_for_function("__slp.status().last?.v8_phase === 'feed'",timeout=10000)
 returned=pg.evaluate('__slp.status()')

 result={"version":pg.evaluate("__slp.version"),"feed":feed,"avoid":avoid,"returned":returned,"errors":errors}
 assert not errors,errors
 (out/"worker.json").write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({"feed":feed["last"]["v8_phase"],"avoid":avoid["trace"]["v8_phase"],"routeUsed":avoid["trace"]["v3_route_match"],"returned":returned["last"]["v8_phase"],"errors":errors}));b.close()
