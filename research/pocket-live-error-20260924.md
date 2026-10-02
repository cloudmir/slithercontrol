# Pocket 실사이트 실행: 페이지 로딩 실패

2026-09-24 13:29:39 KST 시작. 아래는 실행 결과 파일 원문이다. 페이지 로딩 30초 제한 초과로 게임 시작 전 종료했다. 플레이·사망 성적이 아니다. 브라우저는 finally에서 닫혔고 자동 재시도하지 않았다. 오류 예약도 일일 횟수에 포함된다.

```json
{"at": "2026-09-24 13:29:39", "ctrl": "pocket", "nick": "illilliillliililiiii", "status": "error", "games": 1, "cap_s": 600.0, "day_limit": 5, "authorization": "decision-pocket-live-20260924", "browser_executable": "/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome", "decision_period_s": 0.06666666666666667, "latency_assumption_s": 0.1, "server_latency_measured": false, "pending_commands_known": false, "hashes": {"live_staged.py": "442e08203a2fe1d9218c1729499399cadec729efb76e593b1293d48829626827", "staged.py": "f4283060b792f66e746da412023b92f2906f4a2909962a59cefb7eb07b81c361", "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9", "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68", "live.py": "a5952e9059f0f141153b07ddf55c353e98f2aa4eb5ba72596641689d5c9e58ab", "live_active.py": "4531311ddf74238d8441bc0a2561baf23cfa6c7ee5ef53ae266781c67e41328a", "pocket.py": "d7db008a8f6069c47ba2f852afea8a1e3c02090c2adf13a91be7b6d92466093a"}, "error": "TimeoutError('Page.goto: Timeout 30000ms exceeded.\\nCall log:\\n  - navigating to \"http://slither.io/\", waiting until \"domcontentloaded\"\\n')"}
```

## 사용자 재실행 요청 후 두 번째 접속 오류

2026-09-24 13:31:35 KST. 사용자 명시 지시로 재실행했으나 Page.goto 30초 시간 초과가 반복됐다. 게임 시작 전 종료, 자동 재시도 없음. 사이트 장애인지 로컬 네트워크 문제인지는 미확인이다. 오늘 예약 기록 3회(실제 게임 1, 접속 오류 2)로 기본 한도 잔여 2회다.

```json
{"at": "2026-09-24 13:31:35", "ctrl": "pocket", "nick": "ililllillllililillll", "status": "error", "games": 1, "cap_s": 600.0, "day_limit": 5, "authorization": "decision-pocket-live-20260924", "browser_executable": "/home/datawave/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome", "decision_period_s": 0.06666666666666667, "latency_assumption_s": 0.1, "server_latency_measured": false, "pending_commands_known": false, "hashes": {"live_staged.py": "442e08203a2fe1d9218c1729499399cadec729efb76e593b1293d48829626827", "staged.py": "f4283060b792f66e746da412023b92f2906f4a2909962a59cefb7eb07b81c361", "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9", "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68", "live.py": "a5952e9059f0f141153b07ddf55c353e98f2aa4eb5ba72596641689d5c9e58ab", "live_active.py": "4531311ddf74238d8441bc0a2561baf23cfa6c7ee5ef53ae266781c67e41328a", "pocket.py": "d7db008a8f6069c47ba2f852afea8a1e3c02090c2adf13a91be7b6d92466093a"}, "error": "TimeoutError('Page.goto: Timeout 30000ms exceeded.\\nCall log:\\n  - navigating to \"http://slither.io/\", waiting until \"domcontentloaded\"\\n')"}
```
