# 대화 탭 제거·포커스 제목 배경 변경 — 적용 대기

기준일 2026-09-24. 대상: /home/datawave/Work_AI/codeworks_rework1.
현재 세션 쓰기 범위는 슬리더 작업 폴더와 /tmp뿐이므로 앱 원본은 변경하지 않았다.
임시 사본: /tmp/codeworks-tab-focus-2berv7zo.

변경: MultiConversationView의 대화 제목 탭 행 제거, 각 제목줄에 포커스 강조색 배경과 키보드 포커스 표시, 닫기 버튼을 제목줄로 이동. 기존 상위 Chat/Project 등의 앱 메뉴는 유지한다.
검증: 임시 사본 npm run typecheck 종료 0; npm test 441/441 통과; npm run build 종료 0(500 kB 청크 크기 경고).
Playwright에서 desktop 및 mobile-lan-api 통과: 지연 복원, 대화 전환, 새로고침, 닫기, 데스크톱 크기 조정. 데스크톱 제목 배경의 포커스 전환과 탭 DOM 제거 확인, 모바일 대화 목록 전환 확인. API는 모의 응답으로 격리했다.
패치는 현재 원본에 git apply --check 통과. 실행 앱 적용·실제 사용자 대화 검증은 하지 않았다.

앱 폴더 쓰기 권한이 있는 세션에서 현재 파일에 충돌이 없는지 다시 확인 후 적용:

```sh
cd /home/datawave/Work_AI/codeworks_rework1
git apply --check '/home/datawave/Work_AI/슬리더/research/ui-tab-focus-20260924.patch'
git apply '/home/datawave/Work_AI/슬리더/research/ui-tab-focus-20260924.patch'
```

렌더러만 변경하므로 적용 후 새로고침으로 확인 가능하며 백엔드 재시작은 필요 없다.
