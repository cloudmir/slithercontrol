import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/thin_lines_20260930')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 pg=b.new_page(viewport={'width':1440,'height':1080});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate('''() => {__slp.setBot(false);__slp.S.panel=true;__slp.S.tab='home';__slp.setValue('V8_ON',1);__slp.setValue('V81_BODY_ON',1);__slp.setValue('V81_BODY_R',350);__slp.setValue('V8_HEAD_R',500);__slp.S.show.path=false;
 window.ringCalls=[];const arc=CanvasRenderingContext2D.prototype.arc;CanvasRenderingContext2D.prototype.arc=function(x,y,r,...args){if(['#50e3e6','#ffcf5a'].includes(this.strokeStyle)){ringCalls.push({width:this.lineWidth,color:this.strokeStyle,r,g:gsc,x,y,expectedX:mww2+gsc*(slither.xx-view_xx),expectedY:mhh2+gsc*(slither.yy-view_yy)});if(ringCalls.length>50)ringCalls.shift()}return arc.call(this,x,y,r,...args)};}''')
 pg.wait_for_function('ringCalls.some(c=>c.color==="#50e3e6") && ringCalls.some(c=>c.color==="#ffcf5a")')
 calls=pg.evaluate('ringCalls');
 for c in calls:
  assert c['width']==.5
  assert abs(c['r']-c['g']*(350 if c['color']=='#50e3e6' else 500))<1e-7
  assert abs(c['x']-c['expectedX'])<1e-7 and abs(c['y']-c['expectedY'])<1e-7
 values=pg.evaluate('JSON.stringify(__slp.S.values)')
 body=pg.get_by_role('switch',name='몸통 밀도 반경 표시',exact=True);head=pg.get_by_role('switch',name='머리 개수 판단 반경 표시',exact=True)
 assert body.get_attribute('aria-checked')=='true';assert head.get_attribute('aria-checked')=='true'
 pg.screenshot(path=str(out/'both.png'))
 body.click();pg.evaluate('ringCalls=[]');pg.wait_for_timeout(120)
 assert pg.evaluate('ringCalls.length>0 && ringCalls.every(c=>c.color==="#ffcf5a")')
 pg.locator('#slp button[title="표시"]').click()
 showbody=pg.get_by_role('button',name='○ 몸통 밀도 반경',exact=True);showbody.click()
 assert pg.evaluate('__slp.S.show.bodyRadius') is True
 pg.get_by_role('button',name='✓ 머리 개수 판단 반경',exact=True).click()
 pg.locator('#slp button[title="홈"]').click()
 assert body.get_attribute('aria-checked')=='true' and head.get_attribute('aria-checked')=='false'
 assert pg.evaluate('JSON.stringify(__slp.S.values)')==values
 # Slider changes reflect immediately; zoom conversion uses the current world-to-canvas scale.
 pg.get_by_role('slider',name='몸통 밀도 판정 반경 슬라이더').focus();pg.get_by_role('slider',name='몸통 밀도 판정 반경 슬라이더').press('ArrowRight')
 assert pg.evaluate('__slp.S.values.V81_BODY_R')==375
 pg.evaluate('__slp.setZoom(.5);ringCalls=[]');pg.wait_for_timeout(150)
 zoom=pg.evaluate('ringCalls');assert zoom and all(abs(c['r']-375*c['g'])<1e-7 for c in zoom)
 body.click();pg.evaluate('ringCalls=[]');pg.wait_for_timeout(120);assert pg.evaluate('ringCalls.length')==0
 pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.show?.bodyRadius===false && JSON.parse(localStorage.getItem('slp.v1'))?.show?.headRadius===false")
 pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('[__slp.S.show.bodyRadius,__slp.S.show.headRadius]')==[False,False]
 assert not errors,errors
 result={'version':pg.evaluate('__slp.version'),'bothRadiiPx':[350,500],'centerAndZoomCorrect':True,'independentSwitches':True,'homeShowTabSync':True,'toggleValuesUnchanged':True,'saved':[False,False],'botAndPathOffStillDraw':True,'errors':errors}
 for f in ['pilot.js','params.json']:
  current=Path('ext/pilot.js' if f=='pilot.js' else f);assert current.read_bytes()==(out/'before'/f).read_bytes()
 result['algorithmAndParametersUnchanged']=True
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result));b.close()
