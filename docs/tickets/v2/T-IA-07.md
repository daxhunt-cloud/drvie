---
id: T-IA-07
slug: routebook-design-direction-main
version: v2
title: "피드 이동 안내 토스트 (1회)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-ia-3tab.md§7
estimated_complexity: L1
risk_flags: [non-blocking-ux]
priority: P1
started_at: "2026-05-27T02:27:40Z"
completed_at: "2026-05-27T02:29:20Z"
duration_min: 3
routing: { model: sonnet, effort: low }
created_at: "2026-05-26T07:21:31Z"
---

# T-IA-07 · 피드 이동 안내 토스트 (1회)

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

기존 사용자가 `/map`에서 피드 카드 목록이 사라진 것을 발견하고 당황하지 않도록 1회 안내 토스트를 표시한다. `localStorage` flag `routebook_feed_tab_seen`을 기준으로 처음 `/map` 방문 시에만 노출. 명확한 CTA "피드 탭으로 이동"으로 `/feed`를 바로 안내한다. 참조: `design-ia-3tab.md §7.1`. 선행: T-IA-01(BottomTab /feed 탭), T-IA-06(Map.tsx 목록 제거).

## Approach

**1. 토스트 트리거 로직**

`src/app/(main)/map/page.tsx`의 `useEffect`에 추가 (onboarding flag 체크와 유사한 패턴):

```typescript
useEffect(() => {
  if (!localStorage.getItem("routebook_feed_tab_seen")) {
    // 1.5초 지연 후 표시 (페이지 로딩 완료 후)
    const timer = setTimeout(() => setShowFeedMigrationToast(true), 1500);
    return () => clearTimeout(timer);
  }
}, []);
```

**2. 토스트 UI**

기존 `src/components/Toast.tsx` 컴포넌트 활용. 신규 컴포넌트 생성 불필요.

토스트 내용:
- 메시지: `"코스 피드가 피드 탭으로 이동했어요 🗺️"`
- CTA 버튼: `"피드 탭으로 이동"` → `router.push("/feed")`
- auto-dismiss: 5초 (CTA 없이 그냥 닫힘)
- 위치: BottomTab 바로 위 (`bottom: calc(var(--bottom-tab-h) + 8px + env(safe-area-inset-bottom))`)

**3. localStorage flag 처리**

토스트가 표시되는 시점에 flag 설정:
```typescript
localStorage.setItem("routebook_feed_tab_seen", "1");
```
토스트 dismiss 또는 CTA 탭 시점이 아니라 *표시* 시점에 설정 — 앱 강제 종료 후 재진입 시 중복 표시 방지.

**4. Toast.tsx 인터페이스 확인**

기존 `Toast` 컴포넌트가 CTA 버튼을 지원하는지 확인. 지원하지 않으면 `actionLabel?: string`, `onAction?: () => void` prop을 추가 (최소 확장).

## Acceptance

- [ ] 최초 `/map` 방문 시 1.5초 후 토스트 표시
- [ ] 토스트에 "피드 탭으로 이동" CTA 버튼 표시
- [ ] CTA 탭 시 `/feed`로 이동
- [ ] 5초 후 자동 dismiss
- [ ] 두 번째 `/map` 방문(또는 새로고침) 시 토스트 미표시
- [ ] `localStorage.getItem("routebook_feed_tab_seen")` 값 "1" 확인
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- 기존 `routebook_onboarding_done` 플로우와 충돌 방지 (별도 key 사용으로 독립)
- 서버사이드 사용자 세그멘트 기반 토스트 (신규 vs 기존 사용자 구분 — localStorage로 충분)
- 푸시 알림 / 이메일 안내

## Notes / risks

- 토스트가 표시되는 시점: T-IA-06 완료 전(목록이 아직 있을 때) 배포하면 불필요한 토스트. T-IA-06 완료와 동시 배포 권장.
- `localStorage`는 SSR에서 접근 불가. `useEffect` 내부에서만 호출하므로 문제 없음.
- 롤백: localStorage key 삭제만으로 모든 사용자에게 재표시 가능 (긴급 재안내 필요 시 key명을 `routebook_feed_tab_seen_v2`로 변경).

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-ia-3tab.md§7 |
| 2026-05-27 02:29Z | pdt-developer | haiku/low | impl | Toast.tsx actionLabel/onAction props + map/page.tsx feed-tab-seen flag 1회 toast (1.5s delay, 5s auto-dismiss, onboarding guard); tsc clean |
