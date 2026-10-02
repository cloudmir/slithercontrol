import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
out=Path('research/radius_labels_20260930')
async def main():
 relay,url=await w.relay(9337,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=10000);ctx=b.contexts[0]
   pages=[x for x in ctx.pages if 'slither' in x.url]
   pg=pages[0]
   before=await pg.evaluate('({version:__slp.version,values:__slp.S.values,bot:__slp.S.bot,preset:__slp.S.preset,profile:__slp.S.profile})')
   (out/'windows_before.json').write_text(json.dumps(before,ensure_ascii=False,indent=2))
   result={'applied':False,'reason':'game_in_progress'}
   if not any([await x.evaluate('!!window.playing') for x in pages]):
    ext=await ctx.new_page()
    try:
     await ext.goto('chrome://extensions/')
     ids=await ext.evaluate('new Promise(r=>chrome.developerPrivate.getExtensionsInfo(x=>r(x.filter(e=>e.name.includes("SLP")).map(e=>e.id))))')
     assert len(ids)==1,ids
     if not any([await x.evaluate('!!window.playing') for x in pages]):
      await ext.evaluate('(id)=>new Promise(r=>chrome.developerPrivate.reload(id,{failQuietly:true},r))',ids[0])
      if not await pg.evaluate('!!window.playing'):
       await pg.reload(wait_until='domcontentloaded')
       await pg.wait_for_function('window.__slp?.version === "0930-7f368b21"',timeout=45000)
       await pg.wait_for_timeout(700)
       after=await pg.evaluate('({version:__slp.version,values:__slp.S.values,bot:__slp.S.bot,preset:__slp.S.preset,profile:__slp.S.profile,playing:!!window.playing,newPreset:!!SLP_PARAMS.presets.v81_density})')
       assert all(after['values'][k]==v for k,v in before['values'].items()),'existing parameters changed'
       assert all(after[k]==before[k] for k in ['bot','preset','profile']),'selection changed'
       assert after['newPreset'] and not after['playing']
       result={'applied':True,'version':after['version'],'existingSettingsPreserved':True,'activePreset':after['preset'],'newPresetAvailable':after['newPreset'],'playing':after['playing']}
    finally: await ext.close()
   (out/'windows_applied.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
asyncio.run(main())
