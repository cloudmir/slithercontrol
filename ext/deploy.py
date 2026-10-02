r"""Build ext/params.js from params.json (the extension reads params.js; params.json stays the one source).

  python3 ext/deploy.py
Install once in Chrome: chrome://extensions -> Developer mode -> Load unpacked ->
  \\wsl.localhost\Ubuntu\home\datawave\Work_AI\슬리더\ext   (this folder; user 2026-09-26: nothing on C:)
After a build or a code change, press the extension's reload button and reload slither.io.
"""
import hashlib
import json
import time
from pathlib import Path

EXT = Path(__file__).resolve().parent
ROOT = EXT.parent


def build():
    params = json.loads((ROOT/'params.json').read_text(encoding='utf-8'))
    h = hashlib.sha256()
    for f in ('pilot.js', 'mod.js'):
        h.update((EXT/f).read_bytes())
    h.update((ROOT/'params.json').read_bytes())
    params['__ext_version'] = time.strftime('%m%d') + '-' + h.hexdigest()[:8]
    (EXT/'params.js').write_text('window.SLP_PARAMS = ' + json.dumps(params, ensure_ascii=False) + ';\n', encoding='utf-8')
    # chrome://extensions shows version_name: the same build id as the panel title
    man = json.loads((EXT/'manifest.json').read_text(encoding='utf-8'))
    man['version_name'] = params['__ext_version']
    (EXT/'manifest.json').write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return params['__ext_version']


if __name__ == '__main__':
    print('built', build(), '->', EXT/'params.js')
