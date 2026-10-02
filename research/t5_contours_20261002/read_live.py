import asyncio,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT));import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9342,w.MOD_PORT)
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.connect_over_cdp(url,timeout=15000);pages=[p for p in b.contexts[0].pages if 'slither' in p.url]
   result=[await p.evaluate('({url:location.href,version:window.__slp?.version,playing:!!window.playing,bot:window.__slp?.S.bot,preset:window.__slp?.S.preset,T4_GAP:window.__slp?.S.values.T4_GAP})') for p in pages]
   (ROOT/'research/t5_contours_20261002/live_before.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result)
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
