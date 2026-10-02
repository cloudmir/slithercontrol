import asyncio,json,sys,base64
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
out=Path('research/v10_review_20261001')
async def main():
 relay,url=await w.relay(9337,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=10000)
   pages=[x for x in b.contexts[0].pages if 'slither' in x.url]
   for i,pg in enumerate(pages):
    state=await pg.evaluate('({url:location.href,version:window.__slp?.version,playing:!!window.playing,status:window.__slp?.status(),values:window.__slp?.S.values,preset:window.__slp?.S.preset,record:window.__slp?.lastRecord(),trace:window.__slp?.trace(100)})')
    (out/f'page_{i}.json').write_text(json.dumps(state,ensure_ascii=False,indent=2))
    for name,prop in [('box','__slpLastBox'),('log','__slpLastLog')]:
     encoded=await pg.evaluate('(key)=>window.__slp?.lastBox(key)',prop)
     if encoded:(out/f'page_{i}_{name}.json.gz').write_bytes(base64.b64decode(encoded))
    print(json.dumps({k:state.get(k) for k in ['version','playing','status','preset']},ensure_ascii=False))
    if state.get('record'):print('record', {k:state['record'].get(k) for k in ['ext','seconds','modes','errors','preset']})
 finally:relay.close();await relay.wait_closed();await asyncio.sleep(.3)
try:asyncio.run(main())
except Exception as e:print(type(e).__name__,str(e))
