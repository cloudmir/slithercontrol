---
record_schema: 1
id: claim-regular-chrome-live-result-20260923
kind: claim
status: supported
as_of: 2026-09-23
checked_at: 2026-09-23
evidence_refs:
  - path: .workspace/sources/regular-chrome-live-20260923.md
    hash: 46adc1ad56427a105e4f7bd481903315d402adb91e312e1643735ccc06c0fe0b
    locator: chrome_stable_preflight.txt 및 live_active_20260923_222710.jsonl
dependency_hashes: {}
revision: 70beb515-62b9-477d-9a26-13efb901c3a0
---
# 정식 Chrome 첫 판 결과

2026-09-23 22:27:10 HeliosUranus, active v5: 30.9초 뒤 death 종료, 최대 길이 36, 최고 순위 327. 오류 종료가 아니며 정확한 충돌 원인은 미확인이다. 판단 평균 74.2ms, 95백분위 139.6ms. 서버 지연 0.10초는 가정이며 실측하지 않았다.

Windows 설치 Chrome은 WSL 실행 연결 오류로 이용하지 못했다. Google 공식 배포 Linux용 안정판 154.0.8037.57을 /tmp에 추출하여 별도 임시 설정으로 화면 표시 실행·제어에 성공했다. Windows 개인 Chrome 프로필에서 실행했다는 뜻은 아니다. 정수 입력 오류 수정 뒤 이 판에서는 해당 예외가 발생하지 않았으나 생존 개선을 입증하지 못했다.
