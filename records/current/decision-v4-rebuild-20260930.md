---
record_schema: 1
id: decision-v4-rebuild-20260930
kind: decision
status: adopted
as_of: 2026-09-30
dependency_hashes: {}
revision: 01f2f21d-fb69-4521-8dfb-d38706c0b735
---
# V4 재구현 승인

사용자 관찰: V4가 먹이를 먹지 않고, 적이 없을 때 제자리 회전하며, 적이 오면 피하기만 하고 미로 탐색 경로선도 보이지 않는다.

사용자 지시: “너가 제대로 수정해봐.. V4를 아예 새로 개발해도됨”. 이에 따라 기존 코드를 보존할 의무 없이 V4 판단·경로 탐색·표시를 직접 수정하고 오프라인 검증한다. 실사이트 실행 지시는 아니다.
