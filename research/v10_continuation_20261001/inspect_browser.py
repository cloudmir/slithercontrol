import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9338,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=15000)
   for pg in b.contexts[0].pages:
    if 'slither' in pg.url:
     print(await pg.evaluate('({url:location.href,version:window.__slp?.version,playing:!!window.playing,dead:window.slither?.dead,status:window.__slp?.status(),record:window.__slpLastRecord,box:!!window.__slpLastBox,log:!!window.__slpLastLog})'))
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
