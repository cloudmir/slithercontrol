---
record_schema: 1
id: decision-pocket2-20260924
kind: decision
status: adopted
as_of: 2026-09-24
dependency_hashes: {}
revision: 6cdc0e42-04f1-45b5-80fa-97e78c33df45
---

# Windows Chrome 고정, 한도 10판, 적극 채집·정밀 원 포위 방어 (pocket2)

사용자 직접 지시(2026-09-24, pocket Windows 실사이트 1판 315.8초 사망 직후): “지금 windows chrome 을 사용하도록 고정해줘, 먹이 수집을 좀더 적극적으로 하고, 포위 되었을때 아주 정교하게 원을 만들면 안 죽을것 같은데, 수정해봐, 한도는 10번으로 늘릴께”

- 실사이트 실행기 기본 브라우저를 Windows Chrome(win_chrome.py 중계)으로 고정. Linux 브라우저는 명시 옵션으로만.
- 하루 실사이트 한도 5 → 10판(사용자 결정). 판당 600초, 브라우저 1개, 오류 시 재접속 없음, 사용자 지시 시에만 실행은 유지.
- 알고리즘: 기존 pocket.py는 대조군으로 보존하고 새 pocket2.py로 구현(decision-new-algorithm-20260924 원칙). 적극 채집 + 포위 시 최대 회전률의 최소 반경 원(자기 몸이 고리를 이뤄 차단).
- 이번 지시는 수정·로컬 검증이며 새 실사이트 실행 지시는 아니다.
