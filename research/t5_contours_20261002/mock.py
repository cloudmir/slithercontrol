import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/t5_contours_20261002')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page(viewport={'width':1280,'height':900});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp');pg.evaluate('__slp.setBot(false)');pg.get_by_role('button',name='T5',exact=True).click();assert pg.evaluate('[__slp.S.values.T5_ON,__slp.S.values.T4_ON,__slp.S.values.VA1_ON]')==[1,0,0]
 pg.evaluate('''() => {slither.xx=30000;slither.yy=30100;slither.ang=0;slither.sc=1;slither.sp=5.8;slither.pts=[];grd=30000;flux_grd=20000;foods=[];foods_c=0;
 const enemy=(id,pts,r,dead=false)=>({id,xx:pts.at(-1)[0],yy:pts.at(-1)[1],ang:0,sp:5.8,sc:r/14.5,sct:100,rsc:0,fam:0,dead,pts:pts.slice(0,-1).map(p=>({xx:p[0],yy:p[1]}))});
 slithers=[enemy(9,Array.from({length:61},(_,i)=>[28500+i*50,30000]),20),enemy(10,[[30100,30200],[30100,30280],[30100,30320]],10),enemy(11,[[30120,30220],[30190,30220]],10,true),slither];
 for(const k of Object.keys(__slp.S.show))__slp.S.show[k]=false;__slp.S.show.enemyContours=true;
 window.contourStroke=[];const proto=CanvasRenderingContext2D.prototype,stroke=proto.stroke;
 proto.stroke=function(...args){if(this.strokeStyle==='#56d8ff'||this.strokeStyle==='#70ffbd')contourStroke.push({color:this.strokeStyle,width:this.lineWidth});return stroke.apply(this,args)};
 }''')
 pg.wait_for_function('__slp.status().t5_display.enemies===2');pg.wait_for_timeout(250);display=pg.evaluate('__slp.status().t5_display');assert display['paths']==4,display
 strokes=pg.evaluate('contourStroke');assert strokes and all(x['width']==.5 for x in strokes);assert pg.evaluate('__slp.S.bot')==False
 pg.screenshot(path=str(out/'preview.png'));pg.evaluate('__slp.S.show.enemyContours=false');pg.wait_for_function('__slp.status().t5_display.paths===0');pg.evaluate('__slp.S.show.enemyContours=true');pg.wait_for_function('__slp.status().t5_display.paths===4')
 pg.evaluate('__slp.setBot(true)');pg.wait_for_function('__slp.status().last?.t5_on===1',timeout=20000);tr=pg.evaluate('__slp.trace(50)');assert any(q.get('t5_on')==1 and q.get('t4_set')==-5 for q in tr);pg.evaluate('__slp.setBot(false)');pg.wait_for_timeout(150)
 pg.get_by_role('button',name='T4',exact=True).click();assert pg.evaluate('__slp.S.values.T5_ON')==0
 pg.get_by_role('button',name='T5',exact=True).click();pg.get_by_role('button',name='V1',exact=True).click();assert pg.evaluate('__slp.S.values.T5_ON')==0
 pg.get_by_role('button',name='T5',exact=True).click();pg.wait_for_timeout(350);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.T5_ON')==1
 assert not errors,errors
 result={'realWorkerT5':True,'bot_off_and_path_off_draw':True,'two_visible_live_enemies':2,'rails':display['paths'],'short_enemy_included':True,'dead_and_own_excluded':True,'line_width_px':.5,'display_toggle':True,'T4_and_V1_switch_off':True,'persisted':True,'page_errors':errors,'display_geometry_ms':display['ms']};out.joinpath('mock.json').write_text(json.dumps(result,indent=2));print(result);b.close()
