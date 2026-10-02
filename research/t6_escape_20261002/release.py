import asyncio,json,sys,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT))
import win_chrome as w
from playwright.async_api import async_playwright
OUT=ROOT/'research/t6_escape_20261002'
async def main():
 relay,url=await w.relay(9342,w.MOD_PORT)
 try:
  async with async_playwright() as pw:
   browser=await pw.chromium.connect_over_cdp(url,timeout=15000);ctx=browser.contexts[0];pg=next(p for p in ctx.pages if 'slither' in p.url)
   before=await pg.evaluate('({version:__slp.version,bot:__slp.S.bot,playing:!!window.playing,values:{...__slp.S.values},preset:__slp.S.preset})')
   if before['playing']:raise RuntimeError('Game in progress; release deferred')
   ext=await ctx.new_page()
   try:
    await ext.goto('chrome://extensions/');ids=await ext.evaluate('new Promise(r=>chrome.developerPrivate.getExtensionsInfo(x=>r(x.filter(e=>e.name.includes("SLP")).map(e=>e.id))))');assert len(ids)==1
    await ext.evaluate('(id)=>new Promise(r=>chrome.developerPrivate.reload(id,{failQuietly:true},r))',ids[0])
   finally:await ext.close()
   await pg.reload(wait_until='domcontentloaded');build=json.loads((ROOT/'ext/manifest.json').read_text())['version_name'];await pg.wait_for_function('(v)=>window.__slp?.version===v',arg=build,timeout=45000)
   await pg.evaluate('Object.assign(__slp.S,{tab:"home",panel:true})');await pg.get_by_role('button',name='T6',exact=True).click()
   tuning={k:before['values'][k] for k in ['T4_GAP','T4_MIN_LEN','T4_BOOST','T4_APPROACH']}
   await pg.evaluate('(v)=>{for(const [k,x] of Object.entries(v))__slp.setValue(k,x);__slp.S.show.enemyContours=true}',tuning)
   await pg.evaluate('(v)=>__slp.setBot(v)',before['bot']);await pg.bring_to_front();await pg.wait_for_timeout(400)
   after=await pg.evaluate('({version:__slp.version,bot:__slp.S.bot,playing:!!window.playing,preset:__slp.S.preset,T6_ON:__slp.S.values.T6_ON,T5_ON:__slp.S.values.T5_ON,T4_ON:__slp.S.values.T4_ON,T4_GAP:__slp.S.values.T4_GAP,T4_MIN_LEN:__slp.S.values.T4_MIN_LEN,T4_BOOST:__slp.S.values.T4_BOOST,T4_APPROACH:__slp.S.values.T4_APPROACH,enemyContours:__slp.S.show.enemyContours})')
   assert after['version']==build and after['T6_ON']==1 and after['T5_ON']==0 and after['T4_ON']==0 and after['bot']==before['bot'] and not after['playing'] and after['enemyContours'],after
   assert all(after[k]==v for k,v in tuning.items())
   await pg.screenshot(path=str(OUT/'live_release.png'))
   result={'before':before,'after':after,'applied':True,'new_game_started':False,'hashes':{str(f):hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['ext/pilot.js','ext/mod.js','params.json','ext/params.js','ext/manifest.json']}}
   (OUT/'release.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(after,ensure_ascii=False))
 finally:relay.close();await relay.wait_closed()
asyncio.run(main())
