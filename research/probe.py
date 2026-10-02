import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=False, executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
        pg = await b.new_page(viewport={'width':1280,'height':800})
        await pg.goto('http://slither.io/', wait_until='domcontentloaded')
        await pg.wait_for_function('typeof connect==="function" && document.getElementById("nick")', timeout=30000)
        await pg.fill('#nick', 'probe')
        info = await pg.evaluate('''()=>{const els=[...document.querySelectorAll('#playh *')].filter(e=>e.offsetParent).map(e=>e.tagName+'.'+e.className+'#'+e.id+':'+(e.innerText||'').slice(0,20));return els.slice(0,15)}''')
        print(info)
        await pg.screenshot(path='research/probe_menu.png')
        await pg.press('#nick', 'Enter')
        await pg.wait_for_function('window.playing && window.slither', timeout=30000)
        await asyncio.sleep(3)
        s = await pg.evaluate('''()=>{const s=slither;return {keys:Object.keys(s).join(','), xx:s.xx,yy:s.yy,ang:s.ang,sp:s.sp,sc:s.sc,sct:s.sct,npts:s.pts.length, pt0:JSON.stringify(s.pts[s.pts.length-1],(k,v)=>typeof v==='object'&&k?undefined:v), nsl:slithers.length, foods_c, grd, flux_grd, ww, hh, gsc}}''')
        print(json.dumps(s, indent=1))
        await pg.screenshot(path='research/probe_game.png')
        await b.close()
asyncio.run(main())
