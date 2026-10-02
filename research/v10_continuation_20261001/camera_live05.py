import asyncio,contextlib,time,re,sys,os
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
from camera import camera
out=Path('runs/v10_continuation5_20261001_113057/halfsec');out.mkdir(exist_ok=True)
async def main():
 relay,url=await w.relay(9338,w.MOD_PORT);task=None;active=None
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=15000);pg=next(x for x in b.contexts[0].pages if 'slither' in x.url)
   while True:
    log=Path('research/v10_continuation_20261001/resume3.log').read_text();starts=re.findall(r'^START (\d+)',log,re.M)
    if '\nOUT ' in log:break
    k=int(starts[-1]) if starts else None
    st=await pg.evaluate('({playing:!!window.playing,t:window.__slp?.trace(1)?.[0]?.t||0})')
    if st['playing'] and k and active!=k:
     if task:
      task.cancel()
      with contextlib.suppress(asyncio.CancelledError):await task
     active=k;task=asyncio.create_task(camera(pg,out,k,time.monotonic()-st['t']));print('CAMERA05',k,flush=True)
    if not st['playing'] and task:
     task.cancel()
     with contextlib.suppress(asyncio.CancelledError):await task
     task=None;active=None
    await asyncio.sleep(.4)
 finally:
  if task:
   task.cancel()
   with contextlib.suppress(asyncio.CancelledError):await task
  relay.close();await relay.wait_closed()
asyncio.run(main())
