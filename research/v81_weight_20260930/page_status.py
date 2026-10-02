import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9337,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=10000)
   result=[]
   for pg in b.contexts[0].pages:
    if 'slither' in pg.url:
     result.append(await pg.evaluate('({url:location.href,version:window.__slp?.version,playing:!!window.playing,bot:window.__slp?.S.bot,preset:window.__slp?.S.preset})'))
   Path('research/v81_weight_20260930/windows_status.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
asyncio.run(main())
