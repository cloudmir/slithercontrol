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
   if '--wait-idle' in sys.argv and pg:
    while await pg.evaluate('!!window.playing'):
     print(json.dumps(await pg.evaluate('({waiting:true,version:__slp.version,status:__slp.status()})'),ensure_ascii=False),flush=True)
     await asyncio.sleep(15)
   if pg and await pg.evaluate('!!window.playing'):
    result={'applied':False,'reason':'game_in_progress','version':await pg.evaluate('window.__slp?.version')}
   else:
    if pg:
     before=await pg.evaluate('({profile:__slp.S.profile,preset:__slp.S.preset,values:__slp.S.values,bot:__slp.S.bot})')
     Path('research/v81_mock_20260930/windows_before.json').write_text(json.dumps(before,ensure_ascii=False,indent=1))
    ext=await ctx.new_page();await ext.goto('chrome://extensions/');await asyncio.sleep(1)
    ids=await ext.evaluate('new Promise(r=>chrome.developerPrivate.getExtensionsInfo(x=>r(x.filter(e=>e.name.includes("SLP")).map(e=>e.id))))')
    await ext.evaluate('(id)=>new Promise(r=>chrome.developerPrivate.reload(id,{failQuietly:true},r))',ids[0]);await asyncio.sleep(3);await ext.close()
    pg=pg or await ctx.new_page();await pg.goto('http://slither.io/',wait_until='domcontentloaded');await pg.wait_for_function('window.__slp',timeout=60000)
    await pg.evaluate('__slp.setBot(false)')
    pg.once('dialog',lambda d: asyncio.create_task(d.accept()))
    await pg.locator('#slp .seg button').filter(has_text='V8-1 · 근접 추가').click()
    await pg.wait_for_function("JSON.parse(localStorage.getItem('slp.v1'))?.values?.V81_ON === 1")
    await pg.evaluate('bot=>__slp.setBot(bot)',before['bot'] if pg else False)
    result=await pg.evaluate('({applied:true,version:__slp.version,playing:!!window.playing,bot:__slp.S.bot,preset:__slp.S.preset,v81:__slp.S.values.V81_ON,nearRadius:__slp.S.values.V81_HEAD_R,v8:__slp.S.values.V8_ON,radius:__slp.S.values.V8_HEAD_R,heads:__slp.S.values.V8_HEAD_N,clearSeconds:__slp.S.values.V8_CLEAR_S,foodWeight:__slp.S.values.W_GOAL})')
   Path('research/v81_mock_20260930/windows_applied.json').write_text(json.dumps(result,ensure_ascii=False,indent=1));print(json.dumps(result,ensure_ascii=False),flush=True)
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
asyncio.run(main())
