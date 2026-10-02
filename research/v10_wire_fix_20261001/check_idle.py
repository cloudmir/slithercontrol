import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9337,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=10000);pg=next(x for x in b.contexts[0].pages if 'slither' in x.url)
   result=await pg.evaluate('({version:__slp.version,playing:!!window.playing,bot:__slp.S.bot,V10:__slp.S.values.V10_ON})')
   assert result['version']==json.loads(Path('ext/manifest.json').read_text())['version_name']
   assert not result['playing'] and not result['bot']
   Path('research/v10_wire_fix_20261001/final_idle.json').write_text(json.dumps(result,indent=2));print(result)
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
