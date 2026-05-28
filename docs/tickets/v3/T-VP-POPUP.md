---
id: T-VP-POPUP
slug: routebook-vp-overlay
version: v3
title: "코스 팝업 컴팩트화 — 썸네일 110dp + fitBounds 동적 패딩"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
type: feature
estimated_complexity: L2
risk_flags: [popup-layout, fitbounds-padding, visual-regression]
priority: P2
routing: { model: sonnet, effort: medium }
depends_on: [T-VP-SHEET]
started_at: "2026-05-27T08:27:53Z"
completed_at: "2026-05-27T08:30:25Z"
duration_min: 3
created_at: "2026-05-27T09:00:00Z"
---

# T-VP-POPUP · 코스 팝업 컴팩트화 — 썸네일 110dp + fitBounds 동적 패딩

> status: done · stage: phase3_ticket_spec · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Context

### 썸네일 110dp — 왜 80dp가 아닌가

조사 단계에서 Designer는 최대 압축안으로 80dp를 제안했으나, 375dp 너비의 팝업 카드에서 80dp 높이 썸네일은 드라이브 코스 지형 윤곽과 경유지 마커를 식별하기 어려운 수준으로 시각 정보가 손실된다. **110dp**는 지형 패턴과 경유지 위치를 함께 읽을 수 있는 최소 안전 높이이며, 기존 160dp 대비 50dp 축소로 팝업 카드 전체 높이를 약 305dp → **~255dp** 수준으로 줄인다. 이를 통해 팝업 표시 시 지도 가시 영역이 현재 **186dp(28.3% dvh)** 에서 **~236dp(35.9% dvh, +27%)** 로 개선된다.

### fitBounds 동적 padding — 왜 필요한가

현재 탐색(explore) 모드에서 코스 핀을 탭하면 `selectedBrowseCourse` 상태가 세팅되고 팝업 카드가 하단에 등장한다. 이때 `map.easeTo` 또는 `map.fitBounds` 호출이 없어 선택된 마커가 카드 뒤에 가려질 수 있다. `selectedBrowseCourse` 변경 시 `map.easeTo({ padding: { bottom: cardHeight + bottomTabH + gap } })` 를 호출하면 지도가 자동으로 pan되어 마커가 항상 클리어 가시 영역에 위치한다. iOS Maps, Google Maps 모두 동일한 UX 패턴을 사용한다. 카드가 닫힐 때(`selectedBrowseCourse = null`)는 padding을 기본값으로 복원한다.

## Scope

### CourseCard.tsx — 썸네일 높이 변경 (line 117)

현재:

```typescript
const thumbnailHeight = variant === "feed" ? 180 : 160;
```

변경 후 — `variant === "popup"` 분기를 in-place 추가 (신규 variant key 불필요; 기존 호출처 수정 없음):

```typescript
const thumbnailHeight = variant === "feed" ? 180 : variant === "popup" ? 110 : 160;
```

> `variant: "feed" | "popup"` 타입(line 44)은 변경 없음. `else` 브랜치(160)는 도달 불가지만 TypeScript 컴파일에 영향 없음.

### Map.tsx — popup 위치 블록 (line ~1738-1770)

구조적 변경 없음. `bottom: "calc(var(--bottom-tab-h) + 16px + env(safe-area-inset-bottom, 0px))"` 오프셋 유지.

### Map.tsx — fitBounds 동적 padding

`selectedBrowseCourse` 변경을 감지하는 `useEffect` 또는 핀 클릭 핸들러에 아래 로직 추가:

**카드 등장 시 (`selectedBrowseCourse` truthy):**

```typescript
map.current?.easeTo({
  padding: {
    top: 120,    // 기존 fitBounds top 유지
    bottom: 331, // cardHeight(~255) + bottomTabH(60) + gap(16) = 331dp
    left: 60,
    right: 60,
  },
  duration: 300,
});
```

**카드 닫힐 때 (`selectedBrowseCourse = null`):**

```typescript
map.current?.easeTo({
  padding: { top: 120, bottom: 200, left: 60, right: 60 }, // 기존 default 복원
  duration: 300,
});
```

> **cardHeight 추정 근거:** 썸네일 110dp + 내부 콘텐츠(헤더 패딩·제목·거리·태그·액션 행) ~145dp ≈ **255dp**. `bottom padding = 255 + 60 + 16 = 331dp`. 하드코딩 상수로 충분하나, 정확도가 필요하면 카드 컨테이너에 `useRef` + `getBoundingClientRect()` 측정 패턴 사용 가능.

> **기존 fitBounds 패턴 참조:** Map.tsx 내 `fitBounds({ padding: { top: 120, bottom: 200, left: 60, right: 60 } })` 호출처와 일관성 유지.

## Acceptance

- [ ] `src/components/CourseCard.tsx` line 117: `variant === "popup"` 썸네일 160dp → 110dp 렌더링 확인
- [ ] `selectedBrowseCourse` 세팅 시 `map.easeTo` `padding.bottom: 331` 적용 — 선택된 핀이 카드 위 가시 영역 내에 위치
- [ ] 카드 닫을 때 (`selectedBrowseCourse = null`) padding `bottom: 200` 기본값 복원, 지도 pan 정상 복귀
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] Visual smoke: 코스 핀 탭 → 카드 등장 → 선택 마커가 카드에 가려지지 않음
- [ ] Visual smoke: 카드 닫기 → padding 복원, 지도 pan 원위치

## Out of scope

- BottomTab 숨김 + 카드 재앵커 (tactic a — V3.1+ 보류)
- Peek + expand 패턴 (tactic c — V3.1+ 실험 보류)
- 우측 플로팅 카드 레이아웃 (tactic e — portrait 375dp에서 레이아웃 붕괴, 거부)
- 썸네일 80dp 최대 압축안 (tactic b original — 시각 정보 손실 임계점, 거부)


## Outcome

`CourseCard.tsx:117` thumbnailHeight 3-항 분기 (feed=180, popup=110, default=160), `Map.tsx:466-483` 신규 useEffect — selectedBrowseCourse 변경 감지 후 `map.easeTo({padding.bottom: 331})` 적용, 카드 닫을 때 default(200)로 복원. `map.current` null-guard. `npx tsc --noEmit` 0 errors. Visual smoke은 실디바이스에서 카드 등장 시 마커 위치 확인 (V3 QA 단계 / production deploy 후).

## Persona Activity

<!-- PO appends -->
| Date | Persona | Model/Effort | Action | Note |
|---|---|---|---|---|
| 2026-05-27T09:00Z | pdt-designer | sonnet/medium | spec | ticket authored — V3 overlay density; 110dp safe thumbnail + fitBounds dynamic padding; 80dp rejected (visual info loss) |
| 2026-05-27T08:30:25Z | pdt-developer | sonnet/medium | impl | thumbnail 110 + easeTo padding effect; tsc clean |
