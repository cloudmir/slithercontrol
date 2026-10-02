import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()));import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9337,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url);pg=next(x for x in b.contexts[0].pages if 'slither' in x.url)
   assert not await pg.evaluate('!!window.playing')
   before=await pg.evaluate('({...__slp.S.values})');assert before['V10_BOOST_COST']==0
   oldpanel=await pg.evaluate('__slp.S.panel');oldtab=await pg.evaluate('__slp.S.tab');await pg.evaluate("__slp.S.panel=true;__slp.S.tab='home';__slp.setValue('V10_BOOST_COST',0)")
   slider=pg.locator('input[aria-label="부스트 소모 비용 슬라이더"]');assert await slider.count()==1
   await slider.evaluate("e=>{e.value='0.4';e.dispatchEvent(new Event('change',{bubbles:true}))}")
   assert await pg.evaluate('__slp.S.values.V10_BOOST_COST')==.4
   await pg.reload(wait_until='domcontentloaded');await pg.wait_for_function('window.__slp?.S.values.V10_BOOST_COST===0.4',timeout=45000)
   await pg.evaluate("q=>{__slp.S.tab=q.tab;__slp.S.panel=q.panel;__slp.setValue('V10_BOOST_COST',0)}",{'tab':oldtab,'panel':oldpanel})
   after=await pg.evaluate('({...__slp.S.values})');assert after==before
   r={'sliderPresent':True,'domChangeApplied':.4,'reloadPersistence':True,'restoredDefault':0,'otherValuesPreserved':True,'build':await pg.evaluate('__slp.version')}
   Path('research/v10_maze_2h_20261001/cost_ui_result.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
