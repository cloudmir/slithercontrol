import asyncio, json, time
from playwright.async_api import async_playwright
CH='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=False, executable_path=CH)
        pg = await b.new_page(viewport={'width':1280,'height':800})
        await pg.goto('http://slither.io/', wait_until='domcontentloaded')
        await pg.wait_for_function('typeof connect==="function" && document.getElementById("nick")', timeout=30000)
        await pg.fill('#nick', 'probe'); await pg.press('#nick', 'Enter')
        await pg.wait_for_function('window.playing && window.slither', timeout=30000)
        await asyncio.sleep(2)
        c = await pg.evaluate('()=>({nsp1,nsp2,nsp3,mamu,mamu2,spangdv,cst,protocol_version,mscps, sector_size, onmm: typeof window.onmousemove, onmd: typeof window.onmousedown, ommd: String(window.onmousemove).slice(0,80)})')
        print(json.dumps(c))
        # spacing of own and others' pts, food fields
        s = await pg.evaluate('''()=>{
          const sp=o=>{const p=o.pts.filter(q=>!q.dying);const d=[];for(let i=1;i<p.length;i++)d.push(Math.hypot(p[i].xx-p[i-1].xx,p[i].yy-p[i-1].yy));return d.map(x=>+x.toFixed(1)).slice(-12)};
          const others=slithers.filter(o=>o!==slither).map(o=>({id:o.id,sc:+o.sc.toFixed(2),sct:o.sct,np:o.pts.length,sp:+o.sp.toFixed(2),d:Math.round(Math.hypot(o.xx-slither.xx,o.yy-slither.yy)),spc:sp(o).slice(-5)}));
          const f=foods.slice(0,foods_c).filter(x=>x)[0];
          return {me:sp(slither), others:others.slice(0,8), nothers:others.length, totpts:others.reduce((a,o)=>a+o.np,0), food:f?Object.keys(f).join(','):null, fz:f?[f.xx,f.yy,f.sz,f.rad]:null, preys:preys.length}}''')
        print(json.dumps(s))
        t=time.time(); n=0
        while time.time()-t<3:
            await pg.evaluate('()=>{const a=[];for(const o of slithers){for(const q of o.pts)if(!q.dying)a.push(q.xx,q.yy)}return a.length}'); n+=1
        print('evals/s full pts', n/3)
        # die deliberately: steer to boundary? just wait for natural death up to 90s while circling
        await pg.evaluate('()=>{window.__t0=Date.now()}')
        for i in range(900):
            await pg.evaluate(f'()=>{{xm=Math.cos({i}*0.05)*200;ym=Math.sin({i}*0.05)*200}}')
            st = await pg.evaluate('()=>({playing, sl: !!slither, dead_mtm, conn: connected, lastscore: document.getElementById("lastscore").innerText, sc: slither? Math.floor((fpsls[slither.sct+slither.rsc]+slither.fam/fmlts[slither.sct+slither.rsc]-1)*15-5):null})')
            if not st['playing'] or not st['sl']:
                print('death state', st); break
            await asyncio.sleep(0.1)
        await asyncio.sleep(3)
        print('after', await pg.evaluate('()=>({playing, sl: !!slither, dead_mtm, conn: connected, lastscore: document.getElementById("lastscore").innerText, nickdis: document.getElementById("nick").disabled, playh: getComputedStyle(document.getElementById("playh")).opacity})'))
        await pg.screenshot(path='research/probe_dead.png')
        await b.close()
asyncio.run(main())
