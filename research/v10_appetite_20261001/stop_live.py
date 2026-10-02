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
   before=await pg.evaluate('({version:__slp.version,playing:!!window.playing,trace:__slp.trace(1),values:__slp.S.values})')
   (out/'user_stop.json').write_text(json.dumps({'reason':'User: 그만 관찰하자','at':time.time(),'before':before},ensure_ascii=False,indent=2))
   await pg.evaluate('__slp.setBot(false);if(window.playing && window.ws)window.ws.close()')
   print(json.dumps({'stopped':True,'was_playing':before['playing'],'version':before['version']}))
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
