---
id: T-DS-06
slug: routebook-design-direction-main
version: v2
title: "메인 CTA 버튼 Strava-스타일 redesign (floating pill)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-direction-main.md§1+§3 (Strava + tokens)
estimated_complexity: L1
risk_flags: [single-component,visual]
priority: P1
started_at: "2026-05-26T08:17:44Z"
completed_at: "2026-05-26T08:22:32Z"
duration_min: 6
routing: { model: sonnet, effort: medium }
created_at: "2026-05-26T08:17:44Z"
---

# T-DS-06 · 메인 CTA 버튼 Strava-스타일 redesign

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`/map` explore 모드 하단의 flat full-width 빨간 바("루트북 추가하기")를 Strava 스타일의 **Floating Action Pill**로 교체한다. 흰 배경 컨테이너를 제거하고 지도 위에 자유롭게 떠있는 pill 형태로 전환 — 지도 몰입감 유지 + brand moment 강화. 이 버튼은 `/map` explore 모드에서 사용자가 만나는 가장 두드러진 brand accent이다.

## Approach

### 현재 (변경 전)

`src/components/Map.tsx:1972-1993` 현재 구현 요약:
- 흰 배경 컨테이너 div (`background:"#fff"`, `borderTop:"1px solid #eee"`) 위에 풀-와이드 빨간 버튼
- `width:"100%"`, `borderRadius: var(--radius-md)` (12px), `padding:"14px 0"`
- icon 없음, `fontWeight:500`, `fontSize:14px`
- `position` 없음 — 컨테이너 흐름에 종속 (지도 영역 아래에 고정 배치)
- shadow 없음

결과: 지도와 버튼 사이에 흰 분리 영역이 생겨 몰입 단절. 대형 터치 영역이지만 시각적 탁월함 부족.

---

### 디자인 방향: "Floating Action Pill"

#### 핵심 속성 결정

| 속성 | 값 | 근거 |
|---|---|---|
| Geometry | pill — `borderRadius: var(--radius-full)` | Strava primary CTA + iOS HIG 권장 pill 형태 |
| Width | content-hug + `padding: 0 var(--space-8)` (= 0 32px) | full-width 탈피. 버튼이 컨텐츠를 감싸는 형태 |
| Height | `52px` | Strava primary CTA 기준. Apple HIG 44px 초과 보장 |
| Background | `var(--color-brand)` (#ff385c) | singular accent 원칙 유지 |
| Shadow (기본) | `var(--shadow-float)` | `1px outline + 16px blur` — 지도 위에 떠있는 느낌 명확화 |
| Shadow (hover) | `var(--shadow-hover)` + `translateY(-1px)` | 데스크탑 hover 시 elevation 1단계 상승 |
| Shadow (active) | `var(--shadow-card)` + `scale(0.97)` | 눌림 시 눌리는 tactile feedback (그림자 감소 + 축소) |
| Icon (leading) | `+` lucide-style SVG, 18px, `strokeWidth: 2.5`, `currentColor` | "추가" 의도 명확화. 텍스트 앞, gap 8px |
| Text | `"루트북 추가하기"` `var(--text-lg)` (15px) `var(--weight-semibold)` (600) | 현재 500 → 600. Strava식 confident weight |
| Text color | `var(--color-text-inverse)` (#ffffff) | |
| Position | `position:fixed`, `bottom:...`, `left:50%`, `transform:translateX(-50%)` | 지도 위 center-bottom floating. 흰 컨테이너 삭제 |
| Bottom offset | 아래 §포지셔닝 참조 | T-IA-01 도입 전/후 양쪽 대응 |
| Transition | `transform 150ms var(--ease-out), box-shadow 150ms var(--ease-out)` | snappy 하지만 부드러운 피드백 |
| z-index | `30` | BottomTab(50) 아래, 지도(1) 위 |

#### Plus 아이콘 SVG

```jsx
<svg
  width="18" height="18" viewBox="0 0 24 24"
  fill="none" stroke="currentColor"
  strokeWidth="2.5" strokeLinecap="round"
>
  <line x1="12" y1="5" x2="12" y2="19" />
  <line x1="5" y1="12" x2="19" y2="12" />
</svg>
```

#### 포지셔닝

**T-IA-01 도입 전 (BottomTab 2-슬롯 현재 상태):**
```css
position: fixed;
bottom: calc(var(--space-4) + env(safe-area-inset-bottom));  /* 16px + safe area */
left: 50%;
transform: translateX(-50%);
```

**T-IA-01 도입 후 (BottomTab 3-슬롯):**
```css
bottom: calc(var(--bottom-tab-h) + var(--space-4) + env(safe-area-inset-bottom));
/* = 60px + 16px + safe-area ≈ 84-92px */
```

> **Implementation note**: T-IA-01을 작업하는 시점에 이 offset을 자동으로 업데이트할 수 있도록, 지금 구현 시 `var(--bottom-tab-h)` 토큰을 사용해 두면 T-IA-01 이후 별도 수정 불필요.

#### 인터랙션 상태 전체 정리

```
기본:  background var(--color-brand) · shadow var(--shadow-float) · scale(1)
hover: shadow var(--shadow-hover) · translateY(-1px)  [데스크탑만]
active: shadow var(--shadow-card) · scale(0.97) · translateY(0)
focus: outline 2px solid var(--color-brand) · outline-offset 2px · shadow var(--shadow-focus)
```

---

### 단일 권고 — 별도 옵션 제시 없음

> **권고: "+" 아이콘 + "루트북 추가하기" pill** (위 표 그대로).
>
> 두 가지 옵션 제시를 지양한다. Strava 레퍼런스(`design-direction-main.md §1` 패턴 분석) + 사용자 피드백("Strava처럼 세련된") + 브랜드 singular accent 원칙이 하나의 방향을 가리킨다.

---

### 모드별 표시 조건

| Map 모드 / 상태 | 버튼 표시 |
|---|---|
| `explore` (코스/장소 미선택, searchMode 비진입) | ✅ **표시** |
| `selectedBrowseCourse !== null` (코스 선택됨) | ❌ 미표시 |
| `selectedPlace !== null` (장소 선택됨) | ❌ 미표시 |
| `searchMode === true` | ❌ 미표시 |
| `mode === "create"` | ❌ 미표시 (우측 FAB cluster 사용) |
| `mode === "editMode"` | ❌ 미표시 |

표시 조건 로직 (현재 `showBrowseCTA` 유사 boolean):
```typescript
const showFloatingCTA =
  mode === "explore" &&
  !selectedBrowseCourse &&
  !selectedPlace &&
  !searchMode;
```

---

### 빈 상태 통합 (권고)

현재 floating bubble("근처에 아직 등록된 코스가 없어요", `Map.tsx:1967-1969`)를 Floating Pill CTA 위에 인라인으로 통합:

```
                [근처에 아직 코스가 없어요]   ← small text, 20px gap 위
        [  +  루트북 추가하기           ]   ← Floating Pill
```

구현:
- `browseCourses.length === 0` 이고 `showFloatingCTA === true`일 때만 메시지 표시
- `position: fixed`, `bottom: calc(floating CTA bottom + 52px + 20px)` (버튼 높이 + 간격)
- `font-size: var(--text-xs)` (12px), `color: var(--color-text-tertiary)`, `text-shadow: 0 1px 3px rgba(255,255,255,0.8)` (지도 위 가독성)

기존 흰 배경 컨테이너 div 자체를 제거하면 이 메시지 위치도 함께 정리된다.

## Acceptance

- [ ] `/map` explore 모드 진입 시 하단 중앙에 Floating Pill 형태 버튼 표시 (full-width 흰 컨테이너 아님)
- [ ] 버튼 내부 leading `+` SVG 아이콘 표시 (18px, white, 텍스트와 gap 8px)
- [ ] 버튼 텍스트 "루트북 추가하기" 15px/600 흰색
- [ ] 버튼 탭 시 코스 만들기(create) flow 정상 시작 (기존 기능 회귀 없음)
- [ ] `selectedBrowseCourse`, `selectedPlace`, `searchMode`, `create` 상태에서 버튼 미표시
- [ ] `safe-area-inset-bottom` 적용 — iPhone notch 디바이스에서 버튼 잘림 없음
- [ ] `active` 탭 시 `scale(0.97)` 축소 애니메이션 확인
- [ ] 기존 흰 배경 컨테이너 div 제거 — 지도와 버튼 사이 흰 영역 없음
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- BottomTab 3-슬롯 도입 (T-IA-01) — bottom offset 토큰 활용으로 도입 시 자동 호환
- create 모드 우측 FAB cluster 디자인 — 별도 영역, 이 티켓 범위 외
- selectedCourse / selectedPlace 카드 내부 CTA 버튼 — T-DS-04 CourseCard 스펙에서 처리
- 버튼 텍스트 A/B 테스트 ("시작하기" vs "루트북 추가하기")

## Notes / risks

- **T-IA-01 offset 조율**: 이 티켓 구현 시 `bottom: calc(var(--space-4) + env(safe-area-inset-bottom))`으로 작성하면 T-IA-01 완료 후 `calc(var(--bottom-tab-h) + var(--space-4) + env(safe-area-inset-bottom))`으로 한 줄만 수정하면 됨. 토큰 사용 필수.
- `transform: translateX(-50%)` + `transform: scale(0.97)` 동시 적용 시 `transform` 값이 덮어씌워지는 문제 주의. `transform: translateX(-50%) scale(0.97)` 처럼 단일 `transform` 속성에 합산 표현.
- 기존 흰 컨테이너 제거 후 "근처 코스 없음" 메시지 표시 위치가 사라짐. §빈 상태 통합의 fixed 위치 방식으로 재배치 필요.
- iOS Safari에서 `position: fixed` + `env(safe-area-inset-bottom)` 계산이 가상 키보드 등장 시 재계산될 수 있음 — create 모드에서 버튼이 숨겨지므로 실질적 영향 없음.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 08:17Z | pdt-designer | sonnet/medium | spec | T-DS-06 body authored (Floating Action Pill spec, --shadow-float, +icon SVG, bottom-tab-h aware) |
| 2026-05-26 08:22Z | pdt-developer | sonnet/medium | impl | floating pill CTA + 빈상태 bubble repositioned (position:fixed, bottom-tab-h aware); tsc clean |
| 2026-05-27 01:12Z | pdt-developer | sonnet/medium | hotfix | Map.tsx 5 bottom-positioned UI 위치 보정 — var(--bottom-tab-h) 추가 (line 1701/1777/1937/1970/2011). T-DS-06 spec §포지셔닝 누락 부분 일괄 정합 |
