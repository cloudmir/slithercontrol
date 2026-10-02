import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v10_appetite_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1440,'height':1080});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.add_init_script("""{const f=CanvasRenderingContext2D.prototype.fillText;window.riskLabels=[];CanvasRenderingContext2D.prototype.fillText=function(t,x,y,...a){if(String(t).startsWith('RISK ')){riskLabels.push({text:t,x,y});if(riskLabels.length>100)riskLabels.shift()}return f.call(this,t,x,y,...a)}}""")
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate("""() => {__slp.setBot(false);slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sp=6.12;slither.sc=2;grd=30000;flux_grd=20000;slithers=[slither];foods=[];foods_c=0;}""")
 pg.get_by_role('button',name='V10',exact=True).click()
 risk=pg.get_by_role('slider',name='먹이 위험 감수 슬라이더',exact=True);assert risk.count()==1
 assert risk.input_value()=='0'
 for label in ['잔해 추종 가중치','근접 계산 목표 ms']:assert pg.get_by_role('slider',name=label+' 슬라이더',exact=True).count()==0
 risk.fill('75');risk.dispatch_event('change');assert pg.evaluate('__slp.S.values.V10_FOOD_RISK')==75
 pg.wait_for_timeout(700);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.V10_FOOD_RISK')==75
 pg.evaluate("""() => {__slp.setBot(false);slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sp=6.12;slither.sc=2;grd=30000;flux_grd=20000;slithers=[slither];foods=[{xx:30600,yy:30200,sz:40},{xx:30610,yy:30200,sz:40}];foods_c=foods.length;__slp.setBot(true)}""")
 pg.wait_for_function("__slp.status().last?.mode==='v10route'",timeout=20000)
 pg.wait_for_function('riskLabels.length>2',timeout=10000)
 pg.wait_for_timeout(500)
 trace=pg.evaluate('__slp.trace(1)[0]');assert trace['v10_food_risk']==75
 labels=pg.evaluate('riskLabels');assert all(0<=float(x['text'].split()[1])<=1 for x in labels)
 pg.screenshot(path=str(out/'risk_lines.png'))
 pg.evaluate('__slp.setBot(false)')
 pg.get_by_role('button',name='조정',exact=False).click()
 assert pg.locator('input#slp-q').count()==1
 # Search uses DOM text for technical keys; unused controls are absent entirely.
 body=pg.locator('#slp-panel').text_content() if pg.locator('#slp-panel').count() else pg.locator('body').text_content()
 assert '근접 계산 목표 ms' not in body
 assert '잔해 추종 가중치' not in body
 assert '먹이 위험 감수' in body
 pg.get_by_role('button',name='홈',exact=False).click()
 pg.get_by_role('button',name='V9',exact=True).click()
 assert pg.get_by_role('slider',name='잔해 추종 가중치 슬라이더',exact=True).count()==1
 assert pg.get_by_role('slider',name='먹이 위험 감수 슬라이더',exact=True).count()==0
 assert not errors,errors
 r={'build':pg.evaluate('__slp.version'),'riskSliderSaved':75,'unusedV10ControlsRemoved':True,'V9ControlsPreserved':True,'labels':labels[-6:],'trace':{k:trace.get(k) for k in ['mode','v10_food_risk','v10_food_value','v10_closure_risk','v10_local_ms','v10_map_ms','v10_routes']},'errors':errors}
 (out/'mock.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False));b.close()
