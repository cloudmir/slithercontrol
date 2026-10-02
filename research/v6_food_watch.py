import asyncio,json,time,sys
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
    out=Path(sys.argv[1]); t0=time.monotonic()
    async with async_playwright() as p:
        b=await p.chromium.connect_over_cdp('http://127.0.0.1:9335')
        pg=next(p for p in b.contexts[0].pages if 'slither' in p.url)
        await pg.evaluate('''() => {window.__foodLabels=new Set();const orig=CanvasRenderingContext2D.prototype.fillText;window.__restoreFoodLabels=()=>{CanvasRenderingContext2D.prototype.fillText=orig;};CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(typeof t==='string'&&(t.startsWith('미로 ·')||t.startsWith('근접 ·')))__foodLabels.add(t);return orig.call(this,t,...a);};}''')
        try:
            for k in range(23):
                st=await pg.evaluate('''({version:__slp.version,status:__slp.status(),rank:window.rank,players:window.slither_count,playing:!!window.playing,length:window.lbf?.innerText,labels:[...__foodLabels],values:Object.fromEntries(['V6_ON','V6_FOOD_W','V6_REMAINS_W','V6_MARGIN','V6_SAFETY'].map(k=>[k,__slp.S.values[k]]))})''')
                st['watch_s']=round(time.monotonic()-t0,1)
                with (out/'watch.jsonl').open('a') as f:f.write(json.dumps(st,ensure_ascii=False)+'\n')
                print(json.dumps(st,ensure_ascii=False),flush=True)
                if not st['playing']:break
                if k in [0,2,6,12]:await pg.screenshot(path=str(out/f'display_{k:02d}.png'))
                await asyncio.sleep(30)
        finally:
            try:await pg.evaluate('window.__restoreFoodLabels?.()')
            except Exception:pass
asyncio.run(main())
