import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('research/t3_rebuild_20261002')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);pg=b.new_page(viewport={'width':1280,'height':1000});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(Path('research/t3_20261002/dataset.html').resolve().as_uri());pg.wait_for_timeout(200)
 assert '最近' not in pg.title();assert '최근 판별 요약' in pg.inner_text('body');assert '181' not in pg.inner_text('h1');assert '1002-11dad5e1' in pg.inner_text('body');assert '현재 배치' in pg.inner_text('body');assert not errors
 pg.screenshot(path=str(out/'dataset_view.png'),full_page=True);out.joinpath('view_check.json').write_text(json.dumps({'rendered':True,'latestBuildVisible':True,'perGameSummaryVisible':True,'requestedGapVisible':True,'pageErrors':errors}));print('viewer checks passed');b.close()
