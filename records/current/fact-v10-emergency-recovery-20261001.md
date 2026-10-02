---
record_schema: 1
id: fact-v10-emergency-recovery-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-emergency-recovery-20261001.md
    hash: 0cead1023ccdb9a120047ee96022126a4f4af7bec56fa4d5dfe51c7da99473b8
    locator: manifest, check.json, structural.json, Exact code diff
    quote: V10 emergency recovery selection and diagnostic collision depth; no live
      game or browser reload
dependency_hashes: {}
revision: 06fdf852-efa9-4db5-ba9b-26f0b8d530c5
---
# V10 비상 회전 회복 평가

사용자 승인: 개선 항목 제안 후 “좋아 수정해줘”. 우선 비상 회전 중단 결함 수정과 로컬 검증 수행.

빌드1001-8ef6d22b. ext/pilot.js: 모든 근접 후보 실패 또는 지연 prefix 위험 시, 최초 침범 이후 진단 재생을 계속해 침범 깊이 적분·최소 간격·종단 간격·위험 시간으로 비상 후보 평가. 직진 방향 감점과 먹이 점수는 비상 비교에서 제거. 모든 방향을 같은 시간 구간으로 평가하며 추가 계산 목표12ms, 최대0.32초. 회차 단위 예산 확인이므로12ms 실제 상한 보장 아님. 기존 안전 검사에서 실패한 경로는 회복 진단이 좋아져도 unsafe/emergency 유지.

진단용 exhaustive 거리 검사에서 장애물 순서에 따른 첫 음수 반환 편향을 제거. 기존 일반 검사 경로는 조기 반환 유지. 종단 몸통/벽 간격에서 설정 안전 여유를 제외한 진단값을 별도 기록; 실제 서버 충돌 경계 보정은 아님.

검증: 마지막 사망 로그7개 프레임 비교 중 방향 고정 후반5개는 추가 -0.5rad 회전 선택. 여전히 모델 위험이므로 실제 생존 입증 아님. 신규 의미 검사6개, 기본 부스트5개, 구조 검사11개 통과. 미로 로그7개 모두1~3개 경로 및 v10route. 구조 검사500ms와 운영90ms 로그 재생 구분. 오래된 구조검사 '먹이 없으면 부스트 금지'는 이미 승인된 비용0 기본 부스트와 충돌하므로 신규 복사본에서 양수 비용 조건으로 변경; 원본 유지.

제약: 비상7프레임 새 로컬 계산24~76ms 대조12~57ms(별도 VM, 작은 표본, 실제 브라우저 성능 아님). 비용 증가가 있으므로 실전 지연·생존 검증 필요. 실제 두께 경계 보정·미로 예산 신뢰성 개선·실게임 먹이/부스트 및 동조건 A/B는 남음. 브라우저 적용/재로드/새 실게임 없음.

원본 before/, final.patch, manifest.json, source.md 및 검사: research/v10_emergency_recovery_20261001/.
