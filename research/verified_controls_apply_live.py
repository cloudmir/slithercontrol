import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9336,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=30000)
   pg=next(p for p in b.contexts[0].pages if 'slither' in p.url)
   before=await pg.evaluate('({bot:__slp.S.bot,preset:__slp.S.preset,playing:!!playing,values:__slp.S.values})')
   result=await pg.evaluate(Path('research/verified_controls_live.js').read_text(),Path('research/verified_controls_live.css').read_text())
   await pg.wait_for_timeout(300)
   after=await pg.evaluate('({bot:__slp.S.bot,preset:__slp.S.preset,playing:!!playing,values:__slp.S.values,removed:!document.querySelector("#slp select[title=\\\"프리셋 고르기\\\"] option[value=v81_exact]")})')
   assert before['bot']==after['bot']
   if not before['values'].get('V81_ON'):
    assert before['preset']==after['preset']
    assert {k:v for k,v in before['values'].items() if not k.startswith('V81_')}==after['values']
   out=Path('research/verified_controls_20260930');out.mkdir(exist_ok=True)
   (out/'windows_live.json').write_text(json.dumps({'before':before,'result':result,'after':after},ensure_ascii=False,indent=1));print(json.dumps(result,ensure_ascii=False),flush=True)
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
asyncio.run(main())
