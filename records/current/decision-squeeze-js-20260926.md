---
record_schema: 1
id: decision-squeeze-js-20260926
kind: decision
status: adopted
as_of: 2026-09-26
depends_on:
  - decision-mod-extension-20260926
dependency_hashes:
  decision-mod-extension-20260926: 93be9c7e3ad454ed3b25da7d7460e86ad27eba48caeecc6b1878e8f36cbf6058
revision: 89e21f72-3655-444f-8fbb-58e8cdad86fe
---

# 좁아지는 통로 회피 + 앞으로 판단 개발은 JS(pilot.js)에서

사용자(2026-09-26): “앞에 점점 좁아져서 막히는 경우 -> 진행 방향이 돌아나올수 없는 길이 되는경우임 - 한쪽이 A 지렁이로 막혀있고, 다른 한쪽이 B 지렁이와 같은 방향으로 이동할때, B가 간격을 좁히면 죽을수 밖에 없음.. 이 시나리오를 회피하는것을 만들수 있나?”

사용자 답(ask_user):
1. “모두 만들되, 켜고 끌수 있도록 옵션으로.” → 공격형·안전형 모두, 켜기/끄기 옵션.
2. “지금 js 검증이 더 편한것 같은데, 앞으로는 js 로 해도 됨.” → 판단 로직 개발은 ext/pilot.js에서. pilot.py(run_live 수집용)는 변경하지 않는다. 이후 JS와 Python 판단은 달라질 수 있다.
3. “실 사이트에서 너가 직접 확인해봐.” → 실사이트 확인은 어시스턴트가 실행.

원인(코드 확인): 머리 예측은 이미 돌고 있을 때만 호, 아니면 직진. 3.8초 앞길 광선은 정적인 몸만 본다. W_PAR는 더 길거나 굵은 적에만, 반대쪽 막힘은 보지 않음.
