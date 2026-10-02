import asyncio,json,contextlib,time
from pathlib import Path
from playwright.async_api import async_playwright
from camera import camera
async def main():
 out=Path('research/v10_continuation_20261001/camera_check05');out.mkdir(exist_ok=True)
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
  pg=await b.new_page();await pg.set_content('<h1>Screenshot cadence check</h1>');t=asyncio.create_task(camera(pg,out,0,time.monotonic()));await asyncio.sleep(1.2);t.cancel()
  with contextlib.suppress(asyncio.CancelledError):await t
  await b.close()
 rows=[json.loads(l) for l in (out/'game_00_camera.jsonl').read_text().splitlines()];gaps=[b['t']-a['t'] for a,b in zip(rows,rows[1:])]
 assert len(rows)==3 and all(.4<x<.6 for x in gaps),(rows,gaps)
 result={'frames':len(rows),'intervals_s':gaps,'all_files_saved':all((out/r['file']).exists() for r in rows)};(out/'result.json').write_text(json.dumps(result));print(result)
asyncio.run(main())
