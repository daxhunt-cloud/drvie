---
id: T-IA-01
slug: routebook-design-direction-main
version: v2
title: "BottomTab 3슬롯 재구성"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-phase2-spec.md§2
estimated_complexity: L2
risk_flags: [navigation,ux-change]
priority: P1
started_at: "2026-05-26T08:31:33Z"
completed_at: "2026-05-26T08:33:00Z"
duration_min: 4
routing: { model: sonnet, effort: medium }
created_at: "2026-05-26T07:21:31Z"
---

# T-IA-01 · BottomTab 3슬롯 재구성

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`src/components/BottomTab.tsx`를 2슬롯(지도/설정)에서 3슬롯(지도/피드/설정)으로 변경한다. 중간에 "피드" 탭(경로 `/feed`, Compass 아이콘)을 추가. 스타일 토큰 업데이트도 이 티켓에서 함께 처리한다. 전체 구현 명세: `design-phase2-spec.md §2`. 선행: T-DS-01(토큰). T-IA-02(/feed 라우트)와 병행 작업 가능 — BottomTab이 먼저 완료되어야 /feed 탭이 정상 동작한다.

## Approach

**1. TABS 배열 수정** (`src/components/BottomTab.tsx`)

```typescript
// 변경 전
const TABS = [
  { label: "지도", path: "/map", icon: ... },
  { label: "설정", path: "/settings", icon: ... },
]

// 변경 후
const TABS = [
  { label: "지도",  path: "/map",      icon: MapIcon },
  { label: "피드",  path: "/feed",     icon: CompassIcon },  // 신규
  { label: "설정",  path: "/settings", icon: GearIcon },
]
```

**2. CompassIcon 인라인 SVG**

`design-phase2-spec.md §2.3` 명세 그대로:
```jsx
const CompassIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke={active ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
             fill={active ? "var(--color-text-primary)" : "none"}
             stroke={active ? "var(--color-text-primary)" : "var(--color-text-tertiary)"} />
  </svg>
)
```

기존 MapIcon, GearIcon도 동일하게 하드코딩 색상 → CSS 변수 참조로 교체.

**3. 스타일 토큰 업데이트** (`design-phase2-spec.md §2.4`)

- `color: active ? "#1A1A1A" : "#999999"` → `var(--color-text-primary)` / `var(--color-text-tertiary)`
- `fontSize: 10` → `fontSize: "var(--text-nano)"`
- `height: 60` → `height: "var(--bottom-tab-h)"`
- `borderTop: "0.5px solid #E0E0E0"` → `"0.5px solid var(--color-border)"`

**4. isActive 로직 확인**

기존 `pathname.startsWith(path)` 로직이 `/feed`를 올바르게 처리함 — 변경 불필요. `/course/[id]` 예외 `return null` 유지.

## Acceptance

- [ ] 바텀 탭에 지도/피드/설정 3개 아이콘+라벨 렌더링
- [ ] `/feed` 탭 탭 시 `/feed`로 라우트 이동
- [ ] 각 탭 활성/비활성 색 분기 정상 동작 (CSS 변수 참조)
- [ ] Compass SVG 아이콘이 활성 시 needle fill, 비활성 시 outline만 표시
- [ ] `safe-area-inset-bottom` 처리 유지 (iOS 노치 대응)
- [ ] `/course/[id]` 경로에서 탭바 미표시 유지
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- `/feed` 라우트 실제 구현 (T-IA-02)
- 탭 전환 페이지 애니메이션 (Next.js 기본 전환 사용)
- 탭 배지/알림 카운터 UI

## Notes / risks

- `/feed` 경로가 존재하지 않은 상태에서 탭을 추가하면 클릭 시 404. T-IA-02와 동시 작업 또는 T-IA-02 직후 배포 권장.
- 기존 `fontWeight: active ? 500 : 400` — CSS 변수 참조로 교체 시 `var(--weight-medium)` / `var(--weight-regular)` 사용. `style={{ fontWeight }}` prop에서 CSS 변수 문자열은 직접 작동하지 않을 수 있음 → 숫자 상수(500/400) 유지 허용.
- 3탭으로 변경 시 각 탭 너비가 약 33%로 줄어듦 (현재 50%) — 탭 라벨이 잘리지 않는지 확인.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-phase2-spec.md§2 |
| 2026-05-26 08:33Z | pdt-developer | sonnet/medium | impl | BottomTab 2→3 슬롯 (지도/피드/설정), Compass SVG 신규, color tokens, --bottom-tab-h ; tsc clean |
| 2026-05-27 00:45Z | pdt-developer | haiku/low | hotfix | mount issue: BottomTab은 컴포넌트 정의만 있고 layout에 import 안돼있던 상태 — (main)/layout.tsx 두 분기 모두 mount 추가 |
| 2026-05-27 01:14Z | pdt-developer | haiku/low | adjust | BottomTab 3→2 슬롯 (설정 제거) — Map.tsx 메뉴 중복 제거 |
| 2026-05-27 02:06Z | pdt-developer | sonnet/medium | adjust | D2 적용 — create-mode-active body class CSS-only로 BottomTab hide |
