---
id: T-DS-02
slug: routebook-design-direction-main
version: v2
title: "Map.tsx shadow 일괄 토큰화"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-audit.md+design-direction-main.md§3
estimated_complexity: L2
risk_flags: [visual-regression]
priority: P1
started_at: "2026-05-26T07:25:38Z"
completed_at: "2026-05-26T07:28:26Z"
duration_min: 5
routing: { model: sonnet, effort: medium }
created_at: "2026-05-26T07:21:31Z"
---

# T-DS-02 · Map.tsx shadow 일괄 토큰화

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`src/components/Map.tsx` 내 184건 inline style 중 `boxShadow` 하드코딩 값을 `--shadow-*` 토큰으로 일괄 교체한다. 검색 바, 코스 카드, FAB 버튼, 드롭다운 패널 등 핵심 elevated surface가 동일 shadow 시스템을 사용하도록 통일. `docs/prd/design-direction-main.md §3` shadow 토큰 정의 기준. 선행: T-DS-01(토큰 교체) 완료 후 진행.

## Approach

`src/components/Map.tsx`에서 `boxShadow:` 패턴을 전부 grep해 목록 확보. shadow 값을 아래 3단계로 분류해 교체한다:

- `--shadow-card` (Airbnb 3-layer): 코스 목록 아이템, 드롭다운, 검색 결과 패널 등 elevated card 계열
- `--shadow-float` (1px+16px 2-layer): 선택된 코스 카드처럼 지도 위에 떠 있는 float card
- `--shadow-control` (2px 단일): 검색 바, 원형 FAB, 내 위치 버튼 등 circular/pill control 계열

`design-audit.md`에서 확인된 4건 shadow 불일치 우선 처리:
1. 검색 바: `0 2px 8px rgba(0,0,0,0.15)` → `var(--shadow-control)`
2. 선택된 코스 카드: `0 4px 20px rgba(0,0,0,0.12)` → `var(--shadow-float)`
3. FAB/원형 버튼들: 각 hardcode → `var(--shadow-control)`
4. 드롭다운/패널: 단일 레이어 shadow → `var(--shadow-card)`

인라인 `style={{ boxShadow: "..." }}` 형태이므로, CSS 변수는 `style={{ boxShadow: "var(--shadow-card)" }}` 또는 Tailwind 대신 인라인 참조 방식 유지.

## Acceptance

- [ ] `grep 'boxShadow.*rgba' src/components/Map.tsx` 결과 0건 (하드코딩 rgba shadow 없음)
- [ ] `grep 'boxShadow.*px' src/components/Map.tsx` 결과 0건
- [ ] 검색 바 shadow `var(--shadow-control)` 적용 확인
- [ ] 선택된 코스 카드 shadow `var(--shadow-float)` 적용 확인
- [ ] 시각 회귀 없음 — 교체 전/후 shadow depth 체감 동일
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- Map.tsx 외 다른 컴포넌트의 shadow 토큰화 (필요 시 별도 티켓)
- `--shadow-hover`, `--shadow-focus` 적용 (인터랙션 상태 토큰화는 별도)
- color, fontSize 등 다른 인라인 스타일 속성 토큰화 (T-DS-05에서 처리)

## Notes / risks

- `Map.tsx`는 2379줄의 대형 파일. shadow 관련 줄만 선택적으로 수정하므로 범위 최소화. grep으로 사전에 전체 목록 확보 후 수정.
- `CoursePlayer.tsx`의 dark cinematic shadow는 이 티켓 범위 외 — 의도적 분리 유지.
- 교체 후 모바일/데스크탑 양쪽에서 시각 확인 권장 (shadow는 backdrop 색상에 따라 체감이 다름).

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-audit.md+design-direction-main.md§3 |
| 2026-05-26 07:28Z | pdt-developer | sonnet/medium | impl | 18 boxShadow → tokens (card×10 control×5 float×1 panel-top×2); grep clean; tsc clean |
