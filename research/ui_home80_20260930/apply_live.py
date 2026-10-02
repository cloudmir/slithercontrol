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
   css=Path('ext/mod.js').read_text().split('const CSS = `')[1].split('`;')[0]
   result=await pg.evaluate(r'''css=>{
    const before=JSON.stringify({bot:__slp.S.bot,preset:__slp.S.preset,values:__slp.S.values});
    document.getElementById('slp-css').textContent=css;
    for(const id of ['slp-compact-live','slp-controls-live'])document.getElementById(id)?.remove();
    const mount=()=>{
     const seg=document.querySelector('#slp .seg');
     if(seg){for(const b of seg.querySelectorAll('button')){const name=b.textContent.match(/^V\d+(?:\.\d+)?/)?.[0];if(name&&b.textContent!==name)b.textContent=name}
      const buttons=[...seg.querySelectorAll('button')],v41=buttons.find(b=>b.textContent==='V4.1'),v5=buttons.find(b=>b.textContent==='V5');if(v41&&v5&&v41.nextElementSibling!==v5)seg.insertBefore(v41,v5);}
     for(const row of document.querySelectorAll('#slp .quick-grid .li')){const desc=row.querySelector('.s')?.textContent;if(desc&&!row.title.includes(desc))row.title=desc+'\\n'+row.title;}
    };
    window.__slpHome80Observer?.disconnect();mount();
    window.__slpHome80Observer=new MutationObserver(mount);window.__slpHome80Observer.observe(document.body,{childList:true,subtree:true});
    const el=document.getElementById('slp');if(el&&__slp.S.pos){el.style.left=Math.min(Math.max(0,__slp.S.pos.x),Math.max(0,innerWidth-el.getBoundingClientRect().width-8))+'px';el.style.maxHeight=Math.min(760,Math.max(200,innerHeight-__slp.S.pos.y-8))+'px';}
    return {version:__slp.version,buttons:[...document.querySelectorAll('#slp .seg button')].map(b=>({label:b.textContent,title:b.title})),font:el?getComputedStyle(el).fontSize:null,rowHeight:document.querySelector('.quick-grid .li')?.getBoundingClientRect().height,stateUnchanged:before===JSON.stringify({bot:__slp.S.bot,preset:__slp.S.preset,values:__slp.S.values})};
   }''',css)
   assert result['stateUnchanged'];Path('research/ui_home80_20260930/windows_live.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
 finally:
  relay.close();await relay.wait_closed();await asyncio.sleep(.3)
asyncio.run(main())
