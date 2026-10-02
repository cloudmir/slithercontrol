"""Actual Worker/UI check on a local toy world; does not claim game physics accuracy."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v6_collection_mock_20260930');out.mkdir(exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
    pg=b.new_page(viewport={'width':1280,'height':720}); errors=[]
    pg.on('pageerror',lambda e:errors.append(str(e)))
    pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
    pg.evaluate('''() => {
      __slp.setBot(false); slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=2;slither.sp=5.8;slithers=[slither];grd=30000;flux_grd=20000;
      foods=[{xx:30408,yy:30312,rx:30408,ry:30312,sz:20,rad:1,eaten:false}];foods_c=1;
      window.testFoodMin=1e9;window.testLabels=new Set();
      const orig=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(typeof t==='string'&&(t.startsWith('미로 ·')||t.startsWith('근접 ·')))testLabels.add(t);return orig.call(this,t,...a)};
      window.testTimer=setInterval(()=>{let d=Math.hypot(slither.xx-30408,slither.yy-30312);testFoodMin=Math.min(testFoodMin,d);if(d<60)foods[0].eaten=true;},20);
      for(const k of ['V41_ON','V5_ON','V4_ON','V3_ON','V2_ON'])__slp.setValue(k,0);
      __slp.setValue('V6_ON',1);__slp.setBot(true);
    }''')
    pg.wait_for_timeout(3000)
    print(pg.evaluate('({labels:[...testLabels], status:__slp.status(), show:__slp.S.show, pos:[slither.xx,slither.yy], food:foods[0]})'),flush=True)
    pg.wait_for_function("testLabels.has('미로 · 잔해로 이동')",timeout=15000)
    pg.screenshot(path=str(out/'food.png'))
    pg.wait_for_function('testFoodMin < 60',timeout=20000)
    pg.wait_for_function("testLabels.has('미로 · 잔해 탐색')",timeout=10000)
    result=pg.evaluate('({minDistance:testFoodMin, labels:[...testLabels],status:__slp.status(), version:__slp.version,foodWeight:__slp.S.values.V6_FOOD_W,remainsMin:__slp.S.values.V6_REMAINS_MIN})')
    pg.evaluate("__slp.setValue('V6_FOOD_W',2);__slp.setValue('V6_REMAINS_MIN',14)")
    assert pg.evaluate('[__slp.S.values.V6_FOOD_W,__slp.S.values.V6_REMAINS_MIN]')==[2,14]
    assert not errors and not result['status']['errors'],(errors,result)
    assert not any('탈출' in t for t in result['labels']),result
    assert '근접 · 주행 예측' in result['labels'],result
    pg.evaluate('__slp.setBot(false);clearInterval(testTimer)')
    controls={'V6_FOOD_R':3500,'V6_HEAP_SIZE':300,'V6_GOAL_W':2,'V6_BOOST_W':200,'V6_BOOST_MIN_MASS':64,'V6_BOOST_MIN_DIST':200,'V6_CENTER_W':3}
    for key,value in controls.items():
        ctl=pg.locator(f'.li[title^="{key} ·"] input')
        assert ctl.count()==1 and ctl.is_enabled(),key
        ctl.fill(str(value));ctl.dispatch_event('change')
    result['controls']=pg.evaluate('(keys)=>Object.fromEntries(keys.map(k=>[k,__slp.S.values[k]]))',list(controls))
    assert result['controls']==controls,result['controls']
    pg.screenshot(path=str(out/'controls.png'))
    pg.reload();pg.wait_for_function('window.__slp')
    assert pg.evaluate('(keys)=>Object.fromEntries(keys.map(k=>[k,__slp.S.values[k]]))',list(controls))==controls
    assert not errors,errors
    result['persisted']=True
    result['errors']=errors; (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=1)); print(json.dumps(result,ensure_ascii=False))
    pg.evaluate('__slp.setBot(false)');b.close()
