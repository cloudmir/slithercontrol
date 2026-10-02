(css) => {
  window.__slpControlsObserver?.disconnect();
  let style=document.getElementById('slp-controls-live');
  if(!style){style=document.createElement('style');style.id='slp-controls-live';document.head.append(style);}style.textContent=css;
  const d=window.SLP_PARAMS;
  delete d.defaults.V81_ON;delete d.defaults.V81_HEAD_R;delete d.presets.v81_exact;
  d.ui=d.ui.filter(g=>!g.items.some(i=>i[0].startsWith('V81_')));
  const oldMode=__slp.S.values.V81_ON||__slp.S.preset==='v81_exact';
  if(oldMode){__slp.S.preset='v8_exact';__slp.setValue('V81_ON',0);__slp.setValue('V8_ON',1);}
  delete __slp.S.values.V81_ON;delete __slp.S.values.V81_HEAD_R;
  function mount(){
    for(const button of document.querySelectorAll('#slp .seg button'))if(button.textContent.startsWith('V8-1'))button.remove();
    for(const option of document.querySelectorAll('#slp select[title="프리셋 고르기"] option'))if(option.value==='v81_exact')option.remove();
    for(const row of document.querySelectorAll('#slp .quick-grid .li')){
      const num=row.querySelector('input[type=number]');
      if(!num || row.querySelector('input[type=range]'))continue;
      const wrap=document.createElement('div');wrap.className='quick-control';
      const slider=document.createElement('input');slider.type='range';
      for(const k of ['min','max','step'])slider[k]=num[k];slider.value=num.value;slider.disabled=num.disabled;
      slider.setAttribute('aria-label',(row.querySelector('.t')?.textContent||row.title)+' 슬라이더');
      slider.oninput=()=>{num.value=slider.value;};
      slider.onchange=()=>{num.value=slider.value;num.dispatchEvent(new Event('change',{bubbles:true}));};
      num.before(wrap);wrap.append(slider,num);
    }
  }
  mount();
  const observer=new MutationObserver(ms=>{if(ms.some(m=>Array.from(m.addedNodes).some(n=>n.nodeType===1&&(n.id==='slp'||n.closest?.('#slp')))))mount();});
  observer.observe(document.body,{childList:true,subtree:true});window.__slpControlsObserver=observer;
  return {patched:true,rows:document.querySelectorAll('#slp .quick-grid .li').length,sliders:document.querySelectorAll('#slp .quick-grid input[type=range]').length,version:__slp.version,playing:!!playing,bot:__slp.S.bot,preset:__slp.S.preset};
}
