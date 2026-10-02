import asyncio,json,sys,time
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
out=Path('runs/v10_appetite_live_20261001_125506')
async def main():
 relay,url=await w.relay(9338,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=10000);pg=next(x for x in b.contexts[0].pages if 'slither' in x.url)
   state=await pg.evaluate('({playing:!!window.playing,ws:window.ws?.readyState,bot:__slp.S.bot})')
   assert not state['bot'] and state['ws'] in [2,3],state
   await pg.evaluate('window.playing=false')
   (out/'manual_disconnect_finalize.json').write_text(json.dumps(state))
   print('Finalized user-stopped disconnected session; not a death')

 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
