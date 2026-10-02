// Settings store for mod.js (page world): chrome.storage.local is one place for every address the game runs at
// (http/https, slither.io/slither.com), where the page's localStorage is split per origin (user 2026-09-26: no resets).
// After the extension is reloaded, a tab left open keeps this old script with chrome.* gone ("Extension context
// invalidated", 2026-09-27): tell the page (it warns: reload the tab) instead of throwing on every save.
document.documentElement.setAttribute('data-slp-cat-icon', chrome.runtime.getURL('slp-cat-knock.gif'));
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || !e.data.slpStore) return;
  try {
    if (e.data.slpStore === 'get') chrome.storage.local.get('slp', r => window.postMessage({slpStore: 'load', data: r.slp || null}, '*'));
    else if (e.data.slpStore === 'save') chrome.storage.local.set({slp: e.data.data});
  } catch (err) {
    window.postMessage({slpStore: 'stale'}, '*');
  }
});
