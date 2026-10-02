---
record_schema: 1
id: fact-t5-contours-release-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t5-contours-release-20261002.md
    hash: 20bdc639a38f19c30ceda3550bbc4b002b988cb41e1fcd5e861bd5df5909a1f1
    locator: User direct request, geometry / Worker verification, Windows release
      before / after
dependency_hashes: {}
revision: d9b46a3d-de2b-4e97-9773-2f81a7e4a7eb
---
# T5 모든 적 외곽선 표시 릴리즈

사용자 요청: 주변 모든 적에 현재 주행선과 같은 외곽선을 표시하는 기능을 T5로 개발·릴리즈.

빌드1002-9011616e. T5는 기존 T4 추종을 호출하고 관측 가능한 모든 살아 있는 적 몸통 양쪽에 안내선을 추가한다. 짧은 적·추종 미선정 적도 포함하며 자기 몸·죽은 적·관측 단절 구간은 제외한다. 기준은 적 반경+내 반경+T4_GAP(현재 사용자 선택 −5px). 실제 그림 표면이나 검증된 안전 경계라는 의미가 아니다.

표시: 두 선 0.5px, 일반 적 청록·선택 적 연두, 100ms마다 갱신. ‘표시 → T5 적 외곽선’에서 켜고 끌 수 있다. 봇 OFF 및 예측 경로 표시 OFF에도 표시된다. T4 주행·부스트·대상 선정은 유지한다.

검증: 기존 판단 메서드9개 원문 동일, 기록 관측20개 명령·부스트·선택 경로 일치. 실제 로컬 Chromium/Worker에서 짧은 적 포함2적4선·모드 전환·저장·표시 토글 확인, 페이지 오류0. 합성 곡선·단절·퇴화 입력 검사 통과. 합성 계산 시간은 실게임 FPS 측정이 아니다.

Windows MOD 대기 브라우저에 확장을 재로드하고 T5 선택 확인. 실제 로드 버전1002-9011616e, T5_ON1/T4_ON0, GAP−5/최소 몸길이600/부스트1/접근30 유지, bot false·playing false. 새 판 실행 없음. 증거·스크린샷·변경 전 소스는 research/t5_contours_20261002/에 보존.
