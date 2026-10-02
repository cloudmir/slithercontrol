"""Browser Workers, controls and persistence; synthetic scene only."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v81_mock_20260930');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1280,'height':900});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:d.accept())
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate('''() => {__slp.setBot(false);slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=2;slither.sp=5.8;slithers=[slither];grd=30000;flux_grd=20000;foods=[];foods_c=0;}''')
 pg.locator('select[title="프리셋 고르기"]').select_option('v8_exact')
 # New mode button preserves user's existing V8 tuning.
 ctl=pg.locator('.li[title^="W_GOAL ·"] input');ctl.fill('222');ctl.dispatch_event('change')
 pg.locator('#slp .seg button').filter(has_text='V8-1 · 근접 추가').click()
 assert pg.evaluate('[__slp.S.values.V81_ON,__slp.S.values.V8_ON,__slp.S.values.W_GOAL]')==[1,0,222]
 pg.evaluate('__slp.setBot(true)');pg.wait_for_function("__slp.status().last?.v8_phase==='feed'")
 feed=pg.evaluate('__slp.status()')
 pg.evaluate('''() => {window.enemies=[{id:8,xx:slither.xx-200,yy:slither.yy,ang:Math.PI,sp:5.8,sc:1,dead:false,pts:[],sct:30,rsc:0,fam:0,cs:'#a55'}];slithers=[slither,...enemies];window.follow=setInterval(()=>enemies.forEach((h,i)=>{h.xx=slither.xx-200;h.yy=slither.yy+i*30}),20)}''')
 pg.wait_for_function("__slp.status().last?.v8_phase==='near'",timeout=15000)
 near=pg.evaluate('({status:__slp.status(),trace:__slp.trace(1)[0]})');assert near['trace']['mode'].startswith('v41');assert near['trace']['v81_heads']==1
 pg.screenshot(path=str(out/'near.png'))
 pg.evaluate('''() => {enemies.push(...[9,10].map((id,i)=>({...enemies[0],id,yy:slither.yy+(i+1)*30})));slithers=[slither,...enemies]}''')
 pg.wait_for_function("__slp.status().last?.v8_phase==='avoid'",timeout=15000);crowd=pg.evaluate('__slp.status()');assert crowd['last']['mode'].startswith('v6')
 pg.evaluate('enemies.splice(1);slithers=[slither,...enemies]');pg.wait_for_timeout(200);assert pg.evaluate('__slp.status().last.v8_phase')=='avoid'
 pg.wait_for_function("__slp.status().last?.v8_phase==='near'",timeout=15000)
 # Changing near radius removes and restores V4.1 immediately without altering V8 thresholds.
 for value,phase in [(100,'feed'),(400,'near')]:
  ctl=pg.locator('.li[title^="V81_HEAD_R ·"] input');assert ctl.count()==1 and ctl.is_enabled();ctl.fill(str(value));ctl.dispatch_event('change');pg.wait_for_function(f"__slp.status().last?.v8_phase==='{phase}'",timeout=15000)
 pg.evaluate('clearInterval(follow);slithers=[slither]');pg.wait_for_function("__slp.status().last?.v8_phase==='feed'",timeout=15000)
 pg.evaluate('__slp.setBot(false)');pg.screenshot(path=str(out/'controls.png'))
 assert pg.evaluate("document.querySelector('#slp .seg').scrollWidth<=document.querySelector('#slp .seg').clientWidth+1")
 pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.values?.V81_ON===1 && JSON.parse(localStorage.getItem('slp.v1'))?.values?.V81_HEAD_R===400")
 pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('[__slp.S.values.V81_ON,__slp.S.values.V81_HEAD_R,__slp.S.values.W_GOAL]')==[1,400,222]
 pg.locator('#slp .seg button').filter(has_text='V6 · 이중층').click();assert pg.evaluate('__slp.S.values.V81_ON')==0
 assert not errors,errors
 r={'version':pg.evaluate('__slp.version'),'feed':feed,'near':near,'crowd':crowd,'keptV8Tuning':True,'rangeUpdates':True,'saved':True,'errors':errors};(out/'result.json').write_text(json.dumps(r,ensure_ascii=False,indent=1));print(json.dumps({k:v for k,v in r.items() if k not in ['feed','near','crowd']},ensure_ascii=False));b.close()
