---
record_schema: 1
id: claim-project-code-review-20260925
kind: claim
status: draft
as_of: 2026-09-25
checked_at: 2026-09-25
evidence_refs:
  - path: .workspace/sources/project-review-evidence-20260925.md
    hash: f941fa8c0b3b4fa4fe6d890ce8f9a997cdfde8dbed092f49c23df3108b006aed
    locator: 로컬 반례 재현 출력
    quote: '"checked_heading_deg": 29.999999999999996, "emitted_heading_deg":
      2.9999999999999916'
  - path: .workspace/sources/project-review-evidence-20260925.md
    hash: f941fa8c0b3b4fa4fe6d890ce8f9a997cdfde8dbed092f49c23df3108b006aed
    locator: 로컬 반례 재현 출력 / coil_emergency_reversal
    quote: '"command_deg": -75.0, "coil_dir": 1'
  - path: .workspace/sources/project-review-evidence-20260925.md
    hash: f941fa8c0b3b4fa4fe6d890ce8f9a997cdfde8dbed092f49c23df3108b006aed
    locator: P14 배치 기존 분석기 재실행 출력
    quote: "command jumps > 90 deg: 52.4/min"
  - path: .workspace/sources/project-review-evidence-20260925.md
    hash: f941fa8c0b3b4fa4fe6d890ce8f9a997cdfde8dbed092f49c23df3108b006aed
    locator: 후속 확인 — 외부 코드 변경 후 내장 검사 및 P15 첫 판 완료
    quote: '"seconds": 96.2'
dependency_hashes: {}
revision: ccfa7931-c6d7-4a86-b89e-648bae5c5395
---

# 프로젝트·코드 리뷰 — 현 제어기의 정밀 제어와 검증 결함

사용자 요청: 프로젝트 현황·기존 테스트·진행 방향·코드를 리뷰해 잘 진행되는지 평가.
리뷰 문서: research/project_review_20260925.md.
재현 코드: research/review_checks_20260925.py.
draft는 종합 판단·개선 권고의 미채택 상태다. 아래 재현 결과까지 미실행이라는 의미는 아니다.

## 직접 확인

- pilot.py 해시 1d5615a4fcc4f51796c7c8975258d9ca942c07a7a74c9eebcdf2db4d3d07583b.
- 안전 후보 선택 후 조향 제한: 검사 30° 부스트(+63.86px) → 반환 3° 부스트(거리장 −14.5px, 선분 −30.82px). 반환 명령과 검사·trace가 불일치한다.
- 코일 방향 +1에서 비상 선택이 −75°를 반환하는 반례. hit.max를 허용 방향 필터보다 먼저 적용해 반대 방향 감점이 무력화된다.
- 코일 예측은 목표 방위 도달 후 직진, 실제 정책은 지속 회전. 같은 모델의 1.2초 끝점 차이 143.88px. 실사이트 추적 오차 측정값이 아니다.
- 5초 기능은 1.2초 기동 예측 + 3.8초 정적 지도 순항 광선 검사다. 후반 상대 기동·부스트·회전반경을 전개하지 않고, 미관측 영역을 빈 공간으로 다룰 수 있다.
- 내장 검사는 통과하지만 위 반례를 검출하지 못한다.
- P8 추가 통계 15판: 생존 중앙값 200.2초, 600초 도달 1/15.
- P14 공격형 2판: 282.3/348.6초, 부스트 66.2%, loop 모드 44.6%, 90° 초과 명령 변경 52.4/분. loop 모드와 실제 맴돎은 구분한다.
- P15는 초기 오류 이후 리뷰 중 별도 실행이 시작됐다. 첫 완료 _163248은 96.2초 사망, Lmax 568. 전체 배치 최종 통계 아님.
- batch_stats의 공격 생존은 위협 플래그 구간 뒤 1.5초 내 사망 부재이고, through-gap picks는 선택 틱 수다. 회피 성공률·완료 통과 횟수로 해석할 수 없다.
- 사망 분류는 마지막 살아 있는 관측의 가장 가까운 몸과 덮음 조건에 의한 추정이다. 확정 인과 판정 아님.
- P14의 전체 원 관측은 마지막 900틱만 있고 measure 파일은 없다. 실행 소스 해시도 기록하지 않는다.

## 판단·권고

실측 기반 전환과 공격형 근접 수집은 목적에 맞는다. 다만 생존 개선과 정밀 제어는 입증되지 않았다.
우선 최종 명령 검사/trace 일치 → 코일 방향·궤적 모델 일치 → 성공 사건 정의·원자료 기록 → 동일 조건 비교 순서를 권고한다.
최신 사용자 선택(공격형·부스트·먹이·최대 혼잡)은 임의로 되돌리지 않는다.
종전 중간 혼잡 90% 생존 목표와 현 공격형 수집의 성적을 합쳐 판정하지 않는다.

## 범위

운영 코드 수정·실사이트 시작/중단 없음. 로컬 검사와 기존 자료 분석, 리뷰 산출물만 생성.
검토 중 외부에서 pilot.py와 P15 로그가 변경됐고, 변경 후 핵심 반례를 재확인했다.
검증하지 못한 것: 결함별 과거 사망 인과, 수정 후 개선, 서버 충돌 경계, 서버 적용 지연, P15 전체 완료 성적.
검색 coverage partial/missing 및 draft/needs_review 기록의 한계를 유지하고, 소스·로그로 직접 확인한 범위만 기록한다.
권고는 새 구현 승인이나 기존 결정 대체가 아니다.
