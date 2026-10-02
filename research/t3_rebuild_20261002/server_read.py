import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()));import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9342,w.MOD_PORT)
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.connect_over_cdp(url);pg=next(p for p in b.contexts[0].pages if 'slither' in p.url)
   result=await pg.evaluate('''({playing:!!window.playing,bot:__slp.S.bot,chosen:__slp.S.server,forcing:!!window.forcing,fobso:window.fobso?{ip:fobso.ip,po:fobso.po,sid:fobso.sid}:null,selection:(document.getElementById('server_selection')?.innerText||'').slice(0,1500),current:window.bso?{ip:bso.ip,po:bso.po,sid:bso.sid}:null,seen:__slp.S.serverSeen,servers:(window.sos||[]).map(s=>({ip:s.ip,po:s.po,ptm:s.ptm,ac:s.ac,sid:s.sid}))})''')
   Path('research/t3_rebuild_20261002/servers.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in result.items() if k not in ['servers','seen']},ensure_ascii=False))
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
