import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/t6_escape_20261002')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page(viewport={'width':1280,'height':900});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp');pg.evaluate('__slp.setBot(false)');pg.get_by_role('button',name='T6',exact=True).click();assert pg.evaluate('[__slp.S.values.T6_ON,__slp.S.values.T5_ON,__slp.S.values.T4_ON]')==[1,0,0]
 pg.evaluate('''() => {slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=1;slither.sp=5.8;slither.pts=[];grd=30000;flux_grd=20000;foods=[];foods_c=0;
 const enemy=(id,y)=>({id,xx:31000,yy:y,ang:0,sp:5.8,sc:20/14.5,sct:100,rsc:0,fam:0,dead:false,pts:Array.from({length:40},(_,i)=>({xx:29000+i*50,yy:y}))});
 slithers=[enemy(9,29900),enemy(10,30100),slither];__slp.S.show.enemyContours=true;__slp.S.show.path=true;
 window.t6Strokes=[];const proto=CanvasRenderingContext2D.prototype,stroke=proto.stroke;proto.stroke=function(...args){if(['#56d8ff','#ffb83d','#60ff60','#ffd040','#ff5b6b'].includes(this.strokeStyle))t6Strokes.push({color:this.strokeStyle,dash:this.getLineDash(),width:this.lineWidth});return stroke.apply(this,args)};
 }''')
 pg.wait_for_function('__slp.status().t5_display.paths===4');pg.evaluate('__slp.setBot(true)');pg.wait_for_function('__slp.status().last?.t6_on===1',timeout=25000);pg.wait_for_timeout(700)
 trace=pg.evaluate('__slp.trace(100)');assert any(t.get('t6_on')==1 and t.get('t6_routes',0)>0 for t in trace);assert not pg.evaluate('__slp.status().errors')
 strokes=pg.evaluate('t6Strokes');assert any(x['color']=='#ffb83d' and x['dash'] for x in strokes);assert any(x['color'] in ['#60ff60','#ffd040'] and not x['dash'] for x in strokes)
 pg.screenshot(path=str(out/'preview.png'));pg.evaluate('__slp.setBot(false)');pg.wait_for_timeout(150)
 pg.get_by_role('button',name='T5',exact=True).click();assert pg.evaluate('[__slp.S.values.T6_ON,__slp.S.values.T5_ON]')==[0,1]
 pg.get_by_role('button',name='T6',exact=True).click();pg.get_by_role('button',name='V1',exact=True).click();assert pg.evaluate('__slp.S.values.T6_ON')==0
 pg.evaluate('__slp.setValue("T6_ON",1)');assert pg.evaluate('__slp.S.values.T5_ON')==0
 pg.get_by_role('button',name='T6',exact=True).click();pg.wait_for_timeout(350);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.T6_ON')==1
 assert not errors,errors
 result={'real_worker_T6':True,'routes_observed':max(t.get('t6_routes',0) for t in trace),'contours_in_T6':True,'geometric_guides_dashed':True,'swept_path_solid':True,'T5_and_V1_switches':True,'persisted':True,'page_errors':errors,'traces':trace[-5:]};out.joinpath('mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print({k:v for k,v in result.items() if k!='traces'});b.close()
