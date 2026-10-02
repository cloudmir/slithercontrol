import asyncio,base64,contextlib,gzip,hashlib,json,os,signal,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];os.chdir(ROOT);sys.path.insert(0,str(ROOT));sys.path.insert(0,str(Path(__file__).resolve().parent));import win_chrome as w
from report import analyse,render
from run_live import nickname
from playwright.async_api import async_playwright
sys.path.insert(0,str(ROOT/'research/v10_continuation_20261001'));from camera import camera
HERE=Path(__file__).resolve().parent
out=ROOT/'runs'/('t1_'+time.strftime('%Y%m%d_%H%M%S'));out.mkdir();(out/'code').mkdir()
for name in ['pilot.js','mod.js','params.js','manifest.json']:(out/'code'/name).write_bytes((ROOT/'ext'/name).read_bytes())
(out/'code'/'params.json').write_bytes((ROOT/'params.json').read_bytes())
summary={'out':str(out.relative_to(ROOT)),'protocol':'straight_follower_v2','purpose':'T1: enemy thickness versus observed stable alive gaps and qualified last-alive death candidates','games':[],'planned_games':20,'game_cap_s':300,'batch_cap_s':3600,'camera_interval_s':.5,'started':time.strftime('%F %T'),'hashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['ext/pilot.js','ext/mod.js','params.json']},'success_criteria':'raw logs and stable alive levels across observed enemy radius bins; death candidates filtered for confounds; no universal safe-boundary assertion'}
def save(name,obj):(out/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2))
def update(state,k=0,**kw):
 progress={'out':summary['out'],'state':state,'game':k,'build':summary.get('build'),'updated':time.strftime('%F %T'),**kw};save('progress.json',progress);save('summary.json',summary);render(out,progress)
def interrupt(*_):(out/'STOP_NOW').touch()
for sig in [signal.SIGINT,signal.SIGTERM]:signal.signal(sig,interrupt)
async def main():
 await asyncio.to_thread(w.launch,w.MOD_PROFILE,w.MOD_PORT);relay,url=await w.relay(9338,w.MOD_PORT);pg=None;before=None;current_values=None;batch_started=time.monotonic();errors=[]
 update('준비')
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.connect_over_cdp(url,timeout=15000);ctx=b.contexts[0];pages=[p for p in ctx.pages if 'slither' in p.url];
   if not pages:
    pg=await ctx.new_page();await pg.goto('http://slither.io/',wait_until='domcontentloaded');await pg.wait_for_function('window.__slp',timeout=45000);pages=[pg]
   pg=pages[0]
   if not await pg.evaluate('!!window.__slp'):
    await pg.goto('http://slither.io/',wait_until='domcontentloaded');await pg.wait_for_function('window.__slp',timeout=45000)
   assert not any([await p.evaluate('!!window.playing') for p in pages]),'Existing game in progress; do not interrupt'
   before=await pg.evaluate('({version:__slp.version,values:__slp.S.values,profile:__slp.S.profile,preset:__slp.S.preset,bot:__slp.S.bot})');save('before.json',before)
   await pg.evaluate('__slp.setBot(false)');await pg.wait_for_timeout(350)
   ext=await ctx.new_page()
   try:
    await ext.goto('chrome://extensions/');ids=await ext.evaluate('new Promise(r=>chrome.developerPrivate.getExtensionsInfo(x=>r(x.filter(e=>e.name.includes("SLP")).map(e=>e.id))))');assert len(ids)==1
    assert not any([await p.evaluate('!!window.playing') for p in pages]),'Game started during setup'
    await ext.evaluate('(id)=>new Promise(r=>chrome.developerPrivate.reload(id,{failQuietly:true},r))',ids[0])
   finally:await ext.close()
   await pg.reload(wait_until='domcontentloaded');built=json.loads((out/'code'/'manifest.json').read_text())['version_name'];await pg.wait_for_function('(v)=>window.__slp?.version===v',arg=built,timeout=45000);await pg.wait_for_timeout(800)
   await pg.get_by_role('button',name='T1',exact=True).click();await pg.evaluate('__slp.setBot(false)');await pg.bring_to_front()
   summary['build']=built;save('selected.json',await pg.evaluate('({version:__slp.version,values:__slp.S.values,preset:__slp.S.preset})'));pg.on('pageerror',lambda e:errors.append(str(e)))
   print('OUT',summary['out'],'BUILD',built,flush=True);update('준비 완료')
   for k in range(1,21):
    if (out/'STOP').exists() or (out/'STOP_NOW').exists() or time.monotonic()-batch_started>=3600:break
    assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in summary['hashes'].items()),'Code changed; no additional game'
    await pg.wait_for_function('!window.playing&&document.getElementById("nick")&&!document.getElementById("nick").disabled',timeout=30000)
    await pg.evaluate('(bin)=>__slp.setValue("T1_BIN",bin)',(k-1)%5);current_values=await pg.evaluate('__slp.S.values');assert current_values['T1_ON']==1
    await pg.evaluate('window.__slpLastRecord=null;window.__slpLastBox=null;window.__slpLastLog=null;__slp.setBot(true)');await pg.fill('#nick',nickname());await pg.press('#nick','Enter');await pg.wait_for_function('window.playing&&window.slither',timeout=20000)
    started=time.monotonic();reason='death';last_t=-1;live_levels=[];live_seen=set();live_samples=[];capt=asyncio.create_task(camera(pg,out,k,started));save(f'game_{k:02}_initial.json',{'values':current_values,'requested_bin':(k-1)%5,'started':time.strftime('%F %T')});update('실게임 수집 중',k);print('START',k,'BIN',(k-1)%5,flush=True);next_status=0
    try:
     while True:
      await asyncio.sleep(.35);elapsed=time.monotonic()-started
      poll=await pg.evaluate('({alive:!!(window.playing&&window.slither&&!slither.dead),version:window.__slp?.version,values:window.__slp?.S.values,trace:window.__slp?.trace(150)||[],status:window.__slp?.status()})')
      if poll['version']!=built or poll['values']!=current_values or errors:reason='interrupted_settings_or_error';await pg.evaluate('window.__slp&&__slp.setBot(false);window.ws&&window.ws.close()');break
      fresh=[r for r in poll['trace'] if r.get('t',-1)>last_t]
      if fresh:
       with (out/f'game_{k:02}_trace_live.jsonl').open('a') as f:
        for row in fresh:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
       last_t=max(q['t'] for q in fresh)
       for row in fresh:
        if row.get('t1_phase')=='follow' and row.get('t1_enemy_r') is not None:live_samples.append([row['t'],row['t1_own_r'],row['t1_enemy_r'],row['t1_gap'],row['t1_set'],row['t1_target'],row.get('t1_heading_error'),row.get('t1_lateral'),row.get('t1_bend')])
        e=row.get('t1_level')
        if e and e['serial'] not in live_seen:
         live_seen.add(e['serial']);live_levels.append({**e,'t':row['t'],'game':k,'run':out.name,'kind':'alive','source':str(out/f'game_{k:02}_trace_live.jsonl'),'provisional':True,'protocol':'straight_follower_v2','build':built})

      if not poll['alive']:save(f'game_{k:02}_end_detected.json',{'elapsed_s':elapsed,'page_ms':await pg.evaluate('performance.now()')});break
      if (out/'STOP_NOW').exists():reason='user_stop';await pg.evaluate('__slp.setBot(false);window.ws&&window.ws.close()');break
      if elapsed>=300 or time.monotonic()-batch_started>=3600:reason='cap';await pg.evaluate('__slp.setBot(false);window.ws&&window.ws.close()');break
      if elapsed>=next_status:
       next_status=elapsed+15;save('live_current.json',{'run':out.name,'game':k,'levels':live_levels,'data':live_samples});state=poll['status'].get('last',{});update('실게임 수집 중',k,elapsed_s=round(elapsed),last=state);print('PROGRESS',k,round(elapsed),json.dumps(state,ensure_ascii=False),flush=True)
    finally:
     capt.cancel()
     with contextlib.suppress(asyncio.CancelledError,Exception):await capt
    await pg.wait_for_function('window.__slpLastRecord&&window.__slpLastBox&&window.__slpLastLog',timeout=25000);await pg.evaluate('__slp.setBot(false)')
    rec=await pg.evaluate('__slp.lastRecord()');rec.update(capped=reason!='death',end_reason=reason);save(f'slp_{k:02}.json',rec)
    for label,key in [('box','__slpLastBox'),('log','__slpLastLog')]:
     data=base64.b64decode(await pg.evaluate('(key)=>__slp.lastBox(key)',key));(out/f'slp_{k:02}_{label}.json.gz').write_bytes(data)
    await pg.screenshot(path=str(out/f'game_{k:02}_end.png'));g=await asyncio.to_thread(analyse,out,k,reason!='death');summary['games'].append(g);(out/'live_current.json').unlink(missing_ok=True);update('판 분석 완료',k);print('DONE',k,'LEVELS',g['levels'],'FOLLOW',g['follow_samples'],'END',reason,flush=True)
    if reason.startswith('interrupted') or reason=='user_stop':break
    await asyncio.sleep(8)
   summary['completed']=len(summary['games'])==20;summary['page_errors']=errors;update('종료',len(summary['games']))
 except Exception as e:
  
  if pg and not pg.is_closed():
   with contextlib.suppress(Exception):await pg.evaluate('window.__slp&&__slp.setBot(false);window.ws&&window.ws.close()')
  summary['error']=repr(e);update('중단 · 오류 기록',len(summary['games']));print('ERROR',repr(e),flush=True)
 finally:
  if pg and not pg.is_closed():
   try:
    await pg.evaluate('window.__slp&&__slp.setBot(false)')
    if before and current_values and await pg.evaluate('__slp.S.values')==current_values:
     await pg.evaluate('(saved)=>{const values=Object.assign({},SLP_PARAMS.defaults,saved.values);Object.assign(__slp.S,{preset:saved.preset,profile:saved.profile,values});__slp.setValue("T1_ON",values.T1_ON||0);__slp.setBot(false)}',before);summary['settings_restored']=True
   except Exception as e:summary['restore_error']=str(e)
  summary['ended']=time.strftime('%F %T');save('summary.json',summary);render();relay.close();await relay.wait_closed();print('FINISHED',summary['out'],flush=True)
if __name__=='__main__':asyncio.run(main())
