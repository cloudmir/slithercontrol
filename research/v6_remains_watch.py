"""Read-only live sampling of motion and observed target food sizes (4Hz)."""
import asyncio,json,time,sys
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 out=Path(sys.argv[1]);t0=time.monotonic();n=0;lastprint=-100;shots=set()
 async with async_playwright() as p:
  b=await p.chromium.connect_over_cdp('http://127.0.0.1:9335',timeout=30000);pg=next(p for p in b.contexts[0].pages if 'slither' in p.url)
  with (out/'observed.jsonl').open('a') as f:
   while time.monotonic()-t0<660:
    try:
     r=await pg.evaluate('''(foodCheck)=>{const me=window.slither,tr=__slp.trace(1)[0]||{};const r={page_s:performance.now()/1000,version:__slp.version,playing:!!window.playing,status:__slp.status(),x:me?.xx,y:me?.yy,ang:me?.ang,sp:me?.sp,L:tr.L,rank:window.rank,players:window.slither_count,intent:tr.v6_intent,goal:[tr.v6_goal_x,tr.v6_goal_y],mode:tr.mode,boost:tr.boost,cmd:tr.cmd,threshold:__slp.S.values.V6_REMAINS_MIN};
       if(foodCheck&&me){let small=0,large=0,target=[];const C=__slp.S.values.V6_CELL;for(let i=0;i<window.foods_c;i++){let q=window.foods[i];if(!q||q.eaten||Math.hypot(q.xx-me.xx,q.yy-me.yy)>__slp.S.values.V6_OBS)continue;if(q.sz>=r.threshold)large++;else small++;if(Math.abs((Math.floor(q.xx/C)+.5)*C-r.goal[0])<1&&Math.abs((Math.floor(q.yy/C)+.5)*C-r.goal[1])<1)target.push(q.sz);}r.food={small,large,target};}return r;}''',n%8==0)
    except Exception as e:
     print('watch_end',str(e)[:100],flush=True);break
    r['watch_s']=round(time.monotonic()-t0,3);f.write(json.dumps(r,ensure_ascii=False)+'\n');f.flush();n+=1
    if r['watch_s']-lastprint>=30:
     print(json.dumps({k:r.get(k) for k in ['watch_s','version','playing','L','rank','intent','mode','food','status']},ensure_ascii=False),flush=True);lastprint=r['watch_s']
    if not r['playing']:break
    label=r.get('intent')
    if label in ['food','explore','escape'] and label not in shots:
     await pg.screenshot(path=str(out/f'{label}.png'));shots.add(label)
    await asyncio.sleep(.25)
asyncio.run(main())
