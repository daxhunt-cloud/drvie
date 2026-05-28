---
id: T-VP-SHEET
slug: routebook-vp-overlay
version: v3
title: "만들기 시트 높이 50vh → 40dvh"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
type: refactor
estimated_complexity: L1
risk_flags: [visual-regression-create-mode]
priority: P1
routing: { model: haiku, effort: low }
started_at: "2026-05-27T08:25:31Z"
completed_at: "2026-05-27T08:27:53Z"
duration_min: 2
created_at: "2026-05-27T09:00:00Z"
---

# T-VP-SHEET · 만들기 시트 높이 50vh → 40dvh

> status: done · stage: phase3_ticket_spec · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Context

`Map.tsx`의 만들기(create) 모드 바텀 시트는 현재 `height: "50vh"`로 고정되어 있다. `vh` 단위는 iOS Safari 기준으로 브라우저 chrome(주소창·하단 탐색바)이 표시된 상태에서도 기기 전체 화면 높이를 기준으로 계산되어, iPhone 15 Pro 기준 `50vh = 852 × 0.5 = 426dp`에 달한다. 이로 인해 시트 위쪽의 지도 가시 영역이 고작 **175dp(dvh 기준 26.6%)** 에 불과하다. `dvh`(dynamic viewport height)로 변경하면 실제 가시 뷰포트(657dp)를 기준으로 계산되어 `40dvh = 263dp`가 되고, 지도 가시 영역이 **338dp(51.5%)** 로 +93% 개선된다. 동일한 `"calc(50vh + 16px)"` 참조가 `selectedPlace` 카드 bottom 오프셋(line 1700)과 만들기 FAB 행 bottom 오프셋(line 2010)에도 존재하므로 3곳을 동시에 수정해야 레이아웃 정합성이 유지된다.

## Acceptance

- [ ] `src/components/Map.tsx` **line 2114**: `height: "50vh"` → `height: "40dvh"`
- [ ] `src/components/Map.tsx` **line 1700**: `"calc(50vh + 16px)"` → `"calc(40dvh + 16px)"`
- [ ] `src/components/Map.tsx` **line 2010**: `"calc(50vh + 16px)"` → `"calc(40dvh + 16px)"`
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] Visual smoke — create mode 진입 후 시트 높이가 화면 약 40%, 지도 영역 약 56% (변경 전 약 27%) 확인
- [ ] Visual smoke — 시트 내 경유지 목록 스크롤 정상 동작 (`overflowY: "auto"` line 2115 유지 확인)
- [ ] Visual smoke — `selectedPlace` 카드가 시트 위에 겹치지 않고 16dp 간격 유지

## Out of scope

- Peek 모드 / snap point 인터랙션 (tactic g — V3.1+ 실험 보류)
- 시트 열릴 때 `map.easeTo` fitBounds padding 동적 조정 (tactic h — V3.1+ 보류)
- 시트 내부 row 높이 compaction (tactic i — WCAG 44dp 터치타겟 위반으로 거부)
- BottomTab safe-area 높이 버그 수정 (T-VP-SAFEAREA — 별도 티켓, V3.1+ 보류)


## Outcome

Map.tsx 3곳 (line 1700/2010/2114) `50vh → 40dvh` 일괄 치환. `npx tsc --noEmit` 0 errors. Visual smoke은 V3 QA 단계에서 일괄 진행 예정 (실제 디바이스 확인 필요). create mode 진입 시 지도 가시 영역 175dp → 338dp (+93%) 예상.

## Persona Activity

<!-- PO appends -->
| Date | Persona | Model/Effort | Action | Note |
|---|---|---|---|---|
| 2026-05-27T09:00Z | pdt-designer | haiku/low | spec | ticket authored — V3 overlay density investigation; 50vh→40dvh 3-line change |
| 2026-05-27T08:27:53Z | pdt-developer | haiku/low | impl | 3-line vh→dvh swap; tsc clean |
