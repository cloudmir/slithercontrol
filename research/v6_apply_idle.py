import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9336,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=30000);ctx=b.contexts[0];pg=next((p for p in ctx.pages if 'slither' in p.url),None)
   if pg and await pg.evaluate('!!window.playing'):
    result={'applied':False,'reason':'game_in_progress','version':await pg.evaluate('window.__slp?.version')}
   else:
    ext=await ctx.new_page();await ext.goto('chrome://extensions/');await asyncio.sleep(1)
    ids=await ext.evaluate('new Promise(r=>chrome.developerPrivate.getExtensionsInfo(x=>r(x.filter(e=>e.name.includes("SLP")).map(e=>e.id))))')
    await ext.evaluate('(id)=>new Promise(r=>chrome.developerPrivate.reload(id,{failQuietly:true},r))',ids[0]);await asyncio.sleep(3);await ext.close()
    pg=pg or await ctx.new_page();await pg.goto('http://slither.io/',wait_until='domcontentloaded');await pg.wait_for_function('window.__slp',timeout=60000)
    await pg.evaluate('__slp.setBot(false)')
    result=await pg.evaluate('({applied:true,version:__slp.version,playing:!!window.playing,bot:__slp.S.bot,min:__slp.S.values.V6_REMAINS_MIN,weight:__slp.S.values.V6_FOOD_W})')
   Path('research/v6_remains_mock_20260930/windows_applied.json').write_text(json.dumps(result,ensure_ascii=False,indent=1));print(json.dumps(result,ensure_ascii=False),flush=True)
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
asyncio.run(main())
