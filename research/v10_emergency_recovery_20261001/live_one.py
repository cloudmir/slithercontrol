import asyncio,base64,gzip,hashlib,json,math,sys,time,collections
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import win_chrome as w
sys.path.insert(0,str(Path.cwd()/'research/v10_continuation_20261001'))
from camera import camera
import contextlib
from run_live import nickname
from playwright.async_api import async_playwright
out=Path('runs')/('v10_recovery_live_'+time.strftime('%Y%m%d_%H%M%S'));out.mkdir()
def save(name,obj): (out/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2))
def analyse(k,rec,box,log):
 rows=[dict(zip(log['keys'],r)) for r in log['log']];fs=box['frames'];end=fs[-1]['t'];tail=[r for r in rows if r.get('t',0)>=end-3];last=[]
 for f in fs:
  if f['t']<end-1:continue
  ns=[]
  for i in range(0,len(f['segs']),5):
   x,y,bx,by,r=f['segs'][i:i+5];dx=bx-x;dy=by-y;u=max(0,min(1,((f['x']-x)*dx+(f['y']-y)*dy)/max(1e-9,dx*dx+dy*dy)))
   ns.append((math.hypot(f['x']-x-u*dx,f['y']-y-u*dy)-r,math.degrees(abs((f['ang']-math.atan2(dy,dx)+math.pi)%(2*math.pi)-math.pi)),f['sid'][i//5]))
  nearest=min(ns) if ns else None
  last.append({'t':f['t'],'desired':f['cmd'],'actual':f.get('actualCommand'),'nearest_body_center_gap_angle_id':nearest})
 def counts(key,rr):return dict(collections.Counter(str(r.get(key)) for r in rr))
 a={'game':k,'seconds':rec['seconds'],'L_max':rec['L_max'],'capped':rec.get('capped',False),'server':rec.get('server'),'players':rec.get('players'),'errors':rec['errors'],'changes':rec.get('changes'),'decide_ms':rec['decide_ms'],'obs_to_cmd_ms':rec.get('obs_to_cmd_ms'),'ticks':rec['ticks'],'modes':rec['modes'],'map_reasons':counts('cause',rows),'tracker_reasons':counts('trk_why',rows),'route_follow_frames':sum(r.get('mode')=='v10route' for r in rows),'total_frames':len(rows),'continuation_rejects':counts('v10_reject',rows),'last3s_route_follow_frames':sum(r.get('mode')=='v10route' for r in tail),'last3s_continuation_rejects':counts('v10_reject',tail),'last3s_map_reasons':counts('cause',tail),'last3s_modes':counts('mode',tail),'last3s_safe_counts':counts('n_safe',tail),'last_second':last,'last3s_trace':tail,'limitations':['Counts are decision frames, not independent searches.','Nearest body in last alive frame is not confirmed server killer.','No counterfactual survival claim.']}
 save(f'analysis_{k:02}.json',a)
 (out/f'source_{k:02}.txt').write_text('# V10 diagnostic live game '+str(k)+'\n'+json.dumps({key:v for key,v in a.items() if key!='last3s_trace'},ensure_ascii=False,indent=2)+'\nRaw hashes:\n'+json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.glob(f'slp_{k:02}*')},indent=2))
 return {key:v for key,v in a.items() if key not in ['last_second','last3s_trace','limitations','changes']}
async def main():
 relay,url=await w.relay(9337,w.MOD_PORT);summary={'purpose':'One live game: investigate emergency turn freeze after recovery fix; preserve settings','out':str(out),'games':[],'cap_s':600,'camera_interval_s':0.5,'success_criteria':'Record recovery fields, commanded/actual heading and timing; assess freeze during emergency, distinguish no exposure from success','scope':'User approved one live game and end analysis; 600-second cap is collection limit, not death'};pg=None
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.connect_over_cdp(url,timeout=15000);pg=next(p for p in b.contexts[0].pages if 'slither' in p.url)
   pg.on('pageerror',lambda e: (out/'page_errors.jsonl').open('a').write(json.dumps({'at':time.time(),'error':str(e)})+'\n'))
   pg.on('framenavigated',lambda frame: (out/'navigation.jsonl').open('a').write(json.dumps({'at':time.time(),'url':frame.url})+'\n') if frame==pg.main_frame else None)
   try:
    initial=await pg.evaluate('({version:__slp.version,values:__slp.S.values,preset:__slp.S.preset,playing:!!window.playing})');save('initial.json',initial);print('INITIAL',json.dumps({k:initial[k] for k in ['version','preset','playing']}),flush=True)
    assert initial['version']==json.loads(Path('ext/manifest.json').read_text())['version_name'],'Unexpected browser build'
    assert initial['values']['V10_ON']==1,'V10 is not selected'
    print('FOOD_RISK',initial['values'].get('V10_FOOD_RISK'),flush=True)
    summary['hashes']={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in ['ext/pilot.js','ext/mod.js','params.json']}
    while await pg.evaluate('!!window.playing'): print('WAIT_EXISTING',flush=True);await asyncio.sleep(10)
    await pg.bring_to_front();await pg.evaluate('__slp.setBot(true)')
    for k in range(1,2):
     await pg.wait_for_function('!window.playing && document.getElementById("nick") && !document.getElementById("nick").disabled',timeout=90000)
     current=await pg.evaluate('({version:__slp.version,values:__slp.S.values})')
     assert current['version']==initial['version'] and current['values']==initial['values'],'Version/settings changed; stop to avoid mixing conditions'
     await pg.evaluate('window.__slpLastRecord=null;window.__slpLastBox=null;window.__slpLastLog=null')
     await pg.fill('#nick',nickname());await pg.press('#nick','Enter');await pg.wait_for_function('window.playing && window.slither',timeout=18000)
     capped=False;started=time.monotonic();shot=0;last_trace_t=-1;print('START',k,flush=True)
     camera_task=asyncio.create_task(camera(pg,out,k,started))
     try:
      while True:
       await asyncio.sleep(.25)
       poll=await pg.evaluate('({ready:!!window.__slp,alive:!!(window.playing && window.slither && !slither.dead),trace:window.__slp?__slp.trace(120):[],url:location.href})')
       fresh=[r for r in poll['trace'] if r.get('t',-1)>last_trace_t]
       if fresh:
        with (out/f'game_{k:02}_trace_live.jsonl').open('a') as f:
         for row in fresh:f.write(json.dumps(row,separators=(',',':'))+'\n')
        last_trace_t=max(r['t'] for r in fresh)
       snap=await pg.evaluate('__slp.observationSnapshot()')
       if snap:
        with gzip.open(out/f'game_{k:02}_observations.jsonl.gz','at') as ff:ff.write(json.dumps({'elapsed':time.monotonic()-started,'state':snap})+'\n')
       alive=poll['alive']
       if not poll['ready']:
        save(f'game_{k:02}_page_loss.json',{'elapsed':time.monotonic()-started,'url':poll['url']})
        raise RuntimeError('Extension/page state lost; partial images and trace preserved')
       if not alive:
        save(f'game_{k:02}_end_detected.json',{'elapsed_s':time.monotonic()-started,'page_ms':await pg.evaluate('performance.now()')})
        await asyncio.sleep(1.5)
        break
       elapsed=time.monotonic()-started
       if elapsed>shot*30:
        shot+=1
        st=await pg.evaluate('__slp.status()');print('PROGRESS',k,round(elapsed),json.dumps(st.get('last',{})),flush=True)
       if elapsed>=600:capped=True;await pg.evaluate('window.ws && window.ws.close()');break
     finally:
      camera_task.cancel()
      with contextlib.suppress(asyncio.CancelledError):await camera_task
     await pg.wait_for_function('!!window.__slpLastRecord && !!window.__slpLastBox && !!window.__slpLastLog',timeout=18000)
     rec=await pg.evaluate('__slp.lastRecord()');rec['capped']=capped;save(f'slp_{k:02}.json',rec)
     raw={}
     for n,prop in [('box','__slpLastBox'),('log','__slpLastLog')]:
      data=base64.b64decode(await pg.evaluate('(key)=>__slp.lastBox(key)',prop));(out/f'slp_{k:02}_{n}.json.gz').write_bytes(data);raw[n]=json.loads(gzip.decompress(data))
     await pg.screenshot(path=str(out/f'game_{k:02}_end.png'))
     a=analyse(k,rec,raw['box'],raw['log']);summary['games'].append(a);save('summary.json',summary);print('DONE',json.dumps(a,ensure_ascii=False),flush=True)
     if k<1:await asyncio.sleep(15)
    await pg.evaluate('window.__slp && __slp.setBot(false)');summary['completed']=True
   finally:
    if not pg.is_closed():
     await pg.evaluate('window.__slp && __slp.setBot(false)')
 except Exception as e:
  summary['error']=repr(e);print('ERROR',repr(e),flush=True)
 finally:
  save('summary.json',summary);relay.close();await relay.wait_closed();print('OUT',out,flush=True)
asyncio.run(main())
