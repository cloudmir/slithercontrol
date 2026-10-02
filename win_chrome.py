"""Drive the user's Windows Chrome from WSL without exposing its debug port.

Chrome listens on Windows 127.0.0.1 only; each WSL-local connection is piped
through a powershell.exe process that opens the Windows-side loopback socket.
"""
import asyncio
import json
import subprocess
import urllib.request

WIN_CHROME = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
PROFILE = r'D:\slither\chrome_data_profile'  # separate profile: never touches the user's own Chrome data (not on C:, user)
PORT = 9222
RELAY = """$c=New-Object Net.Sockets.TcpClient('127.0.0.1',%d);$c.NoDelay=$true;$s=$c.GetStream();
$i=[Console]::OpenStandardInput();$o=[Console]::OpenStandardOutput();
$a=$i.CopyToAsync($s);$b=$s.CopyToAsync($o);[void][Threading.Tasks.Task]::WaitAny($a,$b)"""
# The browser MOD (ext/) runs in its own profile and port, apart from the data-collection profile above.
MOD_PROFILE, MOD_PORT = r'D:\slither\chrome_mod_profile', 9224     # the extension itself loads from this repo's ext/


def ps(command):
    return subprocess.run(['powershell.exe', '-NoProfile', '-Command', command], cwd='/mnt/c',
                          capture_output=True, text=True, timeout=60).stdout


def launch(profile=PROFILE, port=PORT, extra=()):
    """Start a visible Windows Chrome with a loopback-only debug port (idempotent)."""
    if f'127.0.0.1:{port}' not in ps('netstat -ano | Select-String LISTENING'):
        more = ''.join(f",'{a}'" for a in extra)
        ps(f"Start-Process -FilePath '{WIN_CHROME}' -ArgumentList '--remote-debugging-port={port}',"
           f"'--user-data-dir={profile}','--no-first-run','--no-default-browser-check',"
           "'--disable-background-timer-throttling','--disable-renderer-backgrounding',"
           f"'--disable-backgrounding-occluded-windows'{more},'about:blank'; Start-Sleep 3")


def close(profile=PROFILE):
    name = profile.rsplit('\\', 1)[-1]
    ps(f"Get-CimInstance Win32_Process -Filter \"name='chrome.exe'\" | "
       f"Where-Object {{ $_.CommandLine -like '*{name}*' }} | "
       "ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }")


async def _pipe(src, dst_write, dst_close):
    try:
        while data := await src.read(65536):
            dst_write(data)
    finally:
        dst_close()


async def _handle(reader, writer, port=PORT):
    p = await asyncio.create_subprocess_exec('powershell.exe', '-NoProfile', '-Command', RELAY % port, cwd='/mnt/c',
        stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    await asyncio.gather(_pipe(reader, p.stdin.write, p.stdin.close),
                         _pipe(p.stdout, writer.write, writer.close), return_exceptions=True)
    if p.returncode is None: p.kill()


async def relay(local_port=9333, port=PORT):
    """WSL 127.0.0.1:local_port -> Windows 127.0.0.1:port. Returns the server; endpoint for connect_over_cdp."""
    server = await asyncio.start_server(lambda r, w: _handle(r, w, port), '127.0.0.1', local_port)
    return server, f'http://127.0.0.1:{local_port}'


if __name__ == '__main__':  # smoke check: Windows Chrome reachable through the relay, no game
    async def demo():
        launch()
        server, url = await relay()
        info = json.loads(await asyncio.to_thread(lambda: urllib.request.urlopen(url + '/json/version', timeout=20).read()))
        assert 'Windows' in info['User-Agent'], info
        print('ok', info['Browser'])
        server.close()
    asyncio.run(demo())
