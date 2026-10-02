import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()));import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9337,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url);pg=next(x for x in b.contexts[0].pages if 'slither' in x.url)
   r=await pg.evaluate('({build:__slp.version,bot:__slp.S.bot,playing:!!window.playing,cost:__slp.S.values.V10_BOOST_COST,lat:__slp.S.values.TRACK_LAT,mode:__slp.S.preset})')
   assert r['build']=='1001-e57022de' and not r['bot'] and not r['playing'] and r['cost']==0
   Path('research/v10_maze_2h_20261001/final_status.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
