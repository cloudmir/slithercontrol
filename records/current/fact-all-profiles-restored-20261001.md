---
record_schema: 1
id: fact-all-profiles-restored-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
supersedes:
  - fact-two-mode-visibility-20261001
evidence_refs:
  - path: .workspace/sources/all-profiles-restored-20261001.md
    hash: b71dedaf278281e7c2cf38b4cfc4723bbf2dd010a3b05af19d1b366a2cfcc168
    locator: implementation, manifest.json, result.json, windows_applied.json
dependency_hashes: {}
revision: 82d74232-f7fd-4c15-8cf5-2e9cbf4294f7
---
# 전체 프로필 선택 표시 복원

사용자 요청: “잠김 회피가 안되네.. 프로필을 다시 모두 보여줘”. 회피가 안 된다는 표현은 사용자 관찰이며 이번 작업에서 성능을 측정하지 않았다.

빌드1001-641f8e58. 홈의 모든 기존 버전 선택 버튼과 프리셋 드롭다운 전체 내장·사용자 프로필 표시를 복원하고 조정 탭의 버전 스위치 숨김 필터를 해제했다. 다른 세션에서 추가 중인 VA1 변경을 보존하고 VA1도 선택 가능하게 했다. VA1에서 기존 버전 버튼 전환 시 VA1_ON을 해제하는 연결을 포함한다. 이번 작업의 변경 범위는 표시·선택 복원이며 회피 알고리즘은 수정하지 않았다.

로컬 모의 브라우저: 버전 버튼17개, 현재 내장 프리셋13개 모두 표시, VA1→V1 및 V11-1/V10-1 선택 확인, 기존 감김 토글 유지, 페이지 오류0. Windows 대기 브라우저 적용 완료, activePreset ‘공격형 조정’·기존 설정·봇 상태 유지, playing false. 새 게임 없음. 소스·검증·스냅샷 research/all_profiles_20261001/에 보존.
