import asyncio,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT))
import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9340,w.MOD_PORT)
 try:
  async with async_playwright() as pw:
   browser=await pw.chromium.connect_over_cdp(url,timeout=15000);ctx=browser.contexts[0];pg=next(p for p in ctx.pages if 'slither' in p.url)
   await pg.evaluate('__slp.setBot(false);if(window.playing&&window.ws)ws.close()');await pg.wait_for_function('!window.playing',timeout=15000)
   ext=await ctx.new_page()
   try:
    await ext.goto('chrome://extensions/');ids=await ext.evaluate('new Promise(r=>chrome.developerPrivate.getExtensionsInfo(x=>r(x.filter(e=>e.name.includes("SLP")).map(e=>e.id))))');assert len(ids)==1
    await ext.evaluate('(id)=>new Promise(r=>chrome.developerPrivate.reload(id,{failQuietly:true},r))',ids[0])
   finally:await ext.close()
   await pg.reload(wait_until='domcontentloaded');build=json.loads((ROOT/'ext/manifest.json').read_text())['version_name'];await pg.wait_for_function('(v)=>window.__slp?.version===v',arg=build,timeout=45000)
   await pg.evaluate('Object.assign(__slp.S,{tab:"home",panel:true});__slp.setBot(false)');await pg.get_by_role('button',name='T4',exact=True).click();await pg.evaluate('__slp.setBot(false)');await pg.bring_to_front()
   result=await pg.evaluate('({build:__slp.version,bot:__slp.S.bot,playing:!!window.playing,T4_ON:__slp.S.values.T4_ON,T4_GAP:__slp.S.values.T4_GAP,T4_MIN_LEN:__slp.S.values.T4_MIN_LEN,preset:__slp.S.preset})')
   assert result['build']==build and result['bot']==False and result['playing']==False and result['T4_GAP']==-5 and result['T4_MIN_LEN']==600,result
   (ROOT/'research/t4_fixed_20261002/rollback_browser.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result)
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
