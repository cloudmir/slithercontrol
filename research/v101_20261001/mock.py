import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/v101_20261001')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(Path('ext/test/mock.html').resolve().as_uri());pg.wait_for_function('window.__slp')
 pg.evaluate("__slp.setBot(false);__slp.S.tab='home'")
 pg.get_by_role('button',name='V10-1',exact=True).click()
 assert pg.evaluate('[__slp.S.values.V101_ON,__slp.S.values.V10_ON,__slp.S.values.V81_BODY_ON]')==[1,1,1]
 pg.evaluate('''() => {slither.xx=30000;slither.yy=30000;slither.ang=0;slither.sc=2;slither.sp=5.8;slithers=[slither];grd=30000;flux_grd=20000;foods=[];foods_c=0;__slp.setBot(true)}''')
 pg.wait_for_function("__slp.status().last?.v8_phase==='feed'")
 feed=pg.evaluate('__slp.trace(1)[0]');assert not feed['mode'].startswith('v10')
 pg.evaluate('''window.scene=setInterval(()=>{slithers=[slither,...[0,1,2].map(i=>({id:i+50,xx:slither.xx+200+i*20,yy:slither.yy+100,ang:0,sp:6,sc:1,pts:[],dead:false,sct:50,rsc:0,fam:0,cs:'#a55'}))]},20)''')
 pg.wait_for_function("__slp.status().last?.v8_phase==='avoid'")
 avoid=pg.evaluate('__slp.trace(1)[0]');assert avoid['mode'].startswith('v10'),avoid['mode']
 pg.evaluate('clearInterval(scene);slithers=[slither]')
 pg.wait_for_function("__slp.status().last?.v81_reason==='hold'")
 pg.wait_for_function("__slp.status().last?.v8_phase==='feed'")
 pg.evaluate("window.bodyScene=setInterval(()=>{slithers=[slither,...[-110,110].map((dy,i)=>({id:i+30,xx:slither.xx+2000,yy:slither.yy+dy,ang:0,sp:6,sc:3,pts:[{xx:slither.xx-2000,yy:slither.yy+dy}],dead:false,sct:100,rsc:0,fam:0,cs:'#a55'}))]},20)")
 pg.wait_for_function("__slp.status().last?.v81_reason==='body'");body=pg.evaluate('__slp.trace(1)[0]');assert body['mode'].startswith('v10') and body['v8_heads']==0
 pg.evaluate('clearInterval(bodyScene);slithers=[slither]')
 pg.wait_for_function("__slp.status().last?.v8_phase==='feed'");pg.evaluate('__slp.setBot(false)')
 pg.get_by_role('button',name='V10',exact=True).click();assert pg.evaluate('__slp.S.values.V101_ON')==0
 pg.get_by_role('button',name='V10-1',exact=True).click();pg.wait_for_timeout(400);pg.reload();pg.wait_for_function('window.__slp');assert pg.evaluate('__slp.S.values.V101_ON')==1
 assert not errors,errors
 result={'feedMode':feed['mode'],'avoidMode':avoid['mode'],'sameHeadTrigger':True,'bodyOnlyTrigger':True,'returnHold':True,'presetPersistence':True,'standaloneV10Preserved':True,'errors':errors,'scope':'local mock and real Workers; no live game'};out.joinpath('mock.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result);b.close()
