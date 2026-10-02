import asyncio,json,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
from playwright.async_api import async_playwright
async def main():
 relay,url=await w.relay(9336,w.MOD_PORT)
 try:
  async with async_playwright() as p:
   b=await p.chromium.connect_over_cdp(url,timeout=30000);pg=next(x for x in b.contexts[0].pages if 'slither' in x.url)
   css=Path('ext/mod.js').read_text().split('/* Compact UI:')[1].split('`;')[0];css='/* Compact UI:'+css+'\n#slp[style*="left:"]{transform-origin:top left}'
   result=await pg.evaluate('''css=>{const before={bot:__slp.S.bot,preset:__slp.S.preset,values:JSON.stringify(__slp.S.values)};let st=document.getElementById('slp-compact-live');if(!st){st=document.createElement('style');st.id='slp-compact-live';document.head.append(st)}st.textContent=css;const el=document.getElementById('slp');if(el&&__slp.S.pos){el.style.left=Math.min(Math.max(0,__slp.S.pos.x),Math.max(0,innerWidth-el.getBoundingClientRect().width-8))+'px'}if(el&&__slp.S.pos)el.style.maxHeight=Math.min(760,Math.max(200,innerHeight-__slp.S.pos.y-8))+'px';const r=el?.getBoundingClientRect();return {version:__slp.version,panel:r?{width:r.width,height:r.height}:null,bot:__slp.S.bot,preset:__slp.S.preset,stateUnchanged:before.bot===__slp.S.bot&&before.preset===__slp.S.preset&&before.values===JSON.stringify(__slp.S.values)}}''',css)
   assert result['stateUnchanged'];Path('research/ui_spacing_20260930/windows_live.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
asyncio.run(main())
