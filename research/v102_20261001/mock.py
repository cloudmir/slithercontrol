import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v102_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate("__slp.setBot(false);__slp.S.tab='home'")
 pg.get_by_role('button',name='V10-2',exact=True).click()
 assert pg.evaluate('[__slp.S.values.V102_ON,__slp.S.values.V10_ON,__slp.S.values.V101_ON,__slp.S.values.V11_ON]')==[1,1,1,0]
 pg.evaluate('''() => {window.tints=[];const fill=CanvasRenderingContext2D.prototype.fill;CanvasRenderingContext2D.prototype.fill=function(...args){if(this.fillStyle==='#ff3030'||this.fillStyle==='#3080ff')tints.push(this.fillStyle);return fill.apply(this,args)};slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=2;slither.sp=5.8;slithers=[slither];grd=30000;flux_grd=20000;foods=[];foods_c=0;__slp.setBot(true)}''')
 pg.wait_for_function("__slp.status().last?.v8_phase==='avoid'&&tints.includes('#3080ff')")
 avoid=pg.evaluate('__slp.trace(1)[0]');assert avoid['mode'].startswith('v10')
 pg.evaluate('''window.foodScene=setInterval(()=>{foods=[0,1,2,3].map(i=>({xx:slither.xx+250+i,yy:slither.yy+100,sz:40,eaten:false,rad:1,rx:slither.xx+250+i,ry:slither.yy+100,cv:0}));foods_c=foods.length},20)''')
 pg.wait_for_function("__slp.status().last?.v8_phase==='feed'&&tints.includes('#ff3030')")
 feed=pg.evaluate('__slp.trace(1)[0]');assert not feed['mode'].startswith('v10')
 pg.evaluate("__slp.setValue('V102_FOOD_MIN',200)");pg.wait_for_function("__slp.status().last?.v8_phase==='avoid'")
 pg.evaluate("__slp.setValue('V102_FOOD_MIN',100)");pg.wait_for_function("__slp.status().last?.v8_phase==='feed'")
 pg.evaluate("clearInterval(foodScene);foods=[];foods_c=0;__slp.setValue('V102_FOOD_ON',0)");pg.wait_for_function("__slp.status().last?.v8_phase==='feed'&&__slp.trace(1)[0]?.v102_food_enabled===0")
 pg.evaluate("__slp.setValue('V102_FOOD_ON',1)");pg.wait_for_function("__slp.status().last?.v8_phase==='avoid'")
 pg.evaluate('__slp.setBot(false)');pg.screenshot(path=str(out/'ui.png'))
 pg.wait_for_timeout(300);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.V102_ON')==1
 pg.get_by_role('button',name='V11',exact=True).click();assert pg.evaluate('__slp.S.values.V102_ON')==0
 pg.get_by_role('button',name='V10-1',exact=True).click();assert pg.evaluate('__slp.S.values.V102_ON')==0
 assert not errors,errors
 result={'feedMode':feed['mode'],'avoidMode':avoid['mode'],'thresholdSliderChangesPhase':True,'toggleOffUsesOriginalCondition':True,'toggleOnLowFoodAvoids':True,'headColors':['#ff3030','#3080ff'],'presetPersistence':True,'otherModesPreserved':True,'errors':errors,'scope':'local mock, real Workers; no live games'};out.joinpath('mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result);b.close()
