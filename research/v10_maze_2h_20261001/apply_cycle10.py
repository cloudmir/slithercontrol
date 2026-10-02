import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
out=Path('research/v10_maze_2h_20261001')
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
       await pg.wait_for_function('window.__slp?.version === "1001-3cf85fbe"',timeout=45000)
       await pg.wait_for_timeout(700)
       after=await pg.evaluate('({version:__slp.version,values:__slp.S.values,bot:__slp.S.bot,preset:__slp.S.preset,profile:__slp.S.profile,playing:!!window.playing,newPreset:!!SLP_PARAMS.presets.v10_layered})')
       assert all(after['values'][k]==v for k,v in before['values'].items() if k not in ['V10_LOCAL_MS']),'existing parameters changed'
       assert all(after[k]==before[k] for k in ['bot','preset','profile']),'selection changed'
       assert after['newPreset'] and not after['playing']
       await pg.evaluate('__slp.setValue("TRACK_LAT",0.06)')
       changed=await pg.evaluate('__slp.S.values')
       assert all(changed[k]==v for k,v in after['values'].items() if k!='TRACK_LAT')
       (out/'cycle10_parameter_change.json').write_text(json.dumps({'before':after['values']['TRACK_LAT'],'after':changed['TRACK_LAT'],'parameter':'TRACK_LAT','basis':'cycle7/8 held-out actual-command kinematics; not server RTT'},indent=2))
       result={'applied':True,'version':after['version'],'existingSettingsPreserved':True,'activePreset':after['preset'],'newPresetAvailable':after['newPreset'],'playing':after['playing']}
    finally: await ext.close()
   (out/'windows_applied.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
try:
 asyncio.run(main())
except Exception as e:
 result={'applied':False,'reason':'connection_or_apply_failed','error':str(e)}
 (out/'windows_applied.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps(result,ensure_ascii=False))
