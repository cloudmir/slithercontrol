import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v101_wrap_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate("__slp.setBot(false);__slp.S.tab='home'")
 pg.get_by_role('button',name='V10-1',exact=True).click()
 assert pg.locator('#slp .seg button').all_text_contents()==['V8-1','V10-1']
 row=pg.locator('#slp .li').filter(has=pg.get_by_text('감김 회피',exact=True));assert row.count()==1
 assert pg.evaluate('__slp.S.values.V101_WRAP_ON')==1
 pg.evaluate('''() => {
 __slp.setValue('V81_BODY_ON',0);__slp.setValue('V8_HEAD_N',30);
 slither.xx=30000;slither.yy=30000;slither.ang=1.963495;slither.sc=1;slither.sp=6.12;grd=30000;flux_grd=20000;foods=[];foods_c=0;
 window.scene=setInterval(()=>{const x=slither.xx,y=slither.yy,pts=Array.from({length:16},(_,i)=>{const a=i/24*2*Math.PI-Math.PI;return {xx:x+350*Math.cos(a),yy:y+350*Math.sin(a),dying:false}});slithers=[slither,{...slither,id:7,xx:x-850,yy:y,sc:1,ang:Math.PI,sp:6.12,pts,dead:false}];},20);
 __slp.setBot(true);
 }''')
 pg.wait_for_function("__slp.trace(1)[0]?.v101_wrap_active===1&&__slp.status().last?.v8_phase==='avoid'",timeout=15000)
 active=pg.evaluate('__slp.trace(1)[0]');assert active['mode'].startswith('v10');assert active['v8_heads']==0 and active['v81_body_trigger']==0
 pg.screenshot(path=str(out/'ui.png'))
 row.locator('button.sw').click()
 pg.wait_for_function("__slp.trace(1)[0]?.v101_wrap_on===0&&__slp.status().last?.v8_phase==='feed'",timeout=15000)
 off=pg.evaluate('__slp.trace(1)[0]');assert not off['mode'].startswith('v10')
 row.locator('button.sw').click();pg.wait_for_function("__slp.trace(1)[0]?.v101_wrap_active===1",timeout=15000)
 pg.evaluate('''clearInterval(scene);slithers=[slither];''');pg.wait_for_function("__slp.trace(1)[0]?.v101_wrap_active===0&&__slp.status().last?.v8_phase==='feed'",timeout=15000)
 pg.evaluate('__slp.setBot(false)');row.locator('button.sw').click();assert pg.evaluate('__slp.S.values.V101_WRAP_ON')==0
 pg.wait_for_timeout(400);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.V101_WRAP_ON')==0
 pg.get_by_role('button',name='V8-1',exact=True).click();assert pg.evaluate('[__slp.S.values.V8_ON,__slp.S.values.V81_BODY_ON,__slp.S.values.V10_ON]')==[1,1,0]
 assert not errors,errors
 r={'workerWrapCommand':active['mode'],'coverage':active['v101_wrap_cov'],'noCrowdTrigger':True,'uiToggleWorks':True,'offMode':off['mode'],'returnToFood':True,'togglePersisted':True,'onlyTwoVersionButtons':True,'V8SelectionPreserved':True,'errors':errors,'scope':'local mock with real Workers; no live game'}
 out.joinpath('mock.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(r);b.close()
