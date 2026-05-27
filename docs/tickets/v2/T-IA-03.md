---
id: T-IA-03
slug: routebook-design-direction-main
version: v2
title: "FeedSortToggle (인기·신규·팔로잉·내지역)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-phase2-spec.md§3
estimated_complexity: L2
risk_flags: [filter-logic]
priority: P1
started_at: "2026-05-26T11:09:51Z"
completed_at: "2026-05-26T11:16:05Z"
duration_min: 6
routing: { model: sonnet, effort: medium }
created_at: "2026-05-26T07:21:31Z"
---

# T-IA-03 · FeedSortToggle (인기·신규·팔로잉·내지역)

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`src/components/FeedSortToggle.tsx`를 신규 작성한다. 인기/신규/팔로잉/내지역 4가지 정렬 옵션을 제공하는 sticky 헤더 컴포넌트. 비로그인 시 "팔로잉" 탭은 클릭 시 `LoginModal` 트리거(탭 이동 없음). URL `?sort=` query param과 동기화한다. 전체 구현 명세: `design-phase2-spec.md §3`. 선행: T-IA-02(/feed 라우트).

## Approach

**1. 컴포넌트 구현** (`src/components/FeedSortToggle.tsx`)

`design-phase2-spec.md §3.2` Props 인터페이스:
```typescript
type FeedSortMode = "popular" | "new" | "following" | "region";
interface FeedSortToggleProps {
  active: FeedSortMode;
  onSelect: (mode: FeedSortMode) => void;
  isLoggedIn: boolean;
}
```

`SORT_TABS` 배열: `[{key:"popular",label:"인기"}, {key:"new",label:"신규"}, {key:"following",label:"팔로잉"}, {key:"region",label:"내지역"}]`

팔로잉 탭 클릭 처리:
```typescript
if (tab.key === "following" && !isLoggedIn) {
  // LoginModal 트리거 — onLoginRequired 콜백 또는 context 사용
  return;
}
onSelect(tab.key);
```

컨테이너: `position:"sticky"`, `top:0`, `zIndex:10`, `background:"var(--color-bg)"`, `borderBottom:"0.5px solid var(--color-border)"`. 스크롤 시 숨지 않음. 상세 스타일: `design-phase2-spec.md §3.4–§3.5`.

**2. URL query param 동기화**

`FeedClient.tsx`에서 Next.js `useSearchParams`, `useRouter` 사용:
- 마운트 시 `?sort=` param 읽어 `activeSortMode` 초기값 설정 (없으면 "popular" 기본)
- 탭 변경 시 `router.replace("/feed?sort={mode}")` 호출
- 이를 통해 URL 공유 및 새로고침 시 탭 상태 유지

**3. FeedClient 통합**

`FeedClient.tsx`에 `FeedSortToggle` import. `isLoggedIn`은 `useAuth()` hook의 `user !== null`로 판단. 탭 변경 시 해당 mode 기준으로 Supabase 재쿼리 (T-IA-04 무한스크롤과 연동).

## Acceptance

- [ ] 4개 정렬 탭(인기/신규/팔로잉/내지역) 가로 스크롤 형태로 렌더링
- [ ] 활성 탭: `background: var(--color-brand)`, `color: var(--color-text-inverse)` 스타일
- [ ] 탭 전환 시 `/feed?sort={mode}` URL 업데이트
- [ ] 페이지 새로고침 시 URL `?sort=` param으로 탭 복원
- [ ] 비로그인 상태에서 "팔로잉" 탭 클릭 → 탭 이동 없이 `LoginModal` 표시
- [ ] 스크롤 시 상단 고정(`position:sticky`) 동작
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- 실제 팔로잉/내지역 쿼리 구현 (T-IA-05에서 처리)
- 정렬 모드별 결과가 비어 있을 때 empty state (T-IA-04/T-IA-05에서 처리)
- "내지역" 탭의 위치 권한 요청 플로우 (T-IA-05)

## Notes / risks

- `LoginModal` 트리거 방식 확인 필요: 현재 코드베이스에서 `LoginModal`이 global context로 관리되는지, prop drilling인지 확인 후 맞는 방식으로 호출.
- `useSearchParams()`는 Next.js App Router에서 Suspense 경계 내에서만 사용 가능. `FeedClient.tsx`가 이미 클라이언트 컴포넌트이므로 문제 없으나, Suspense 외부에서 호출 시 빌드 경고 발생 가능. `<Suspense>` 경계 확인.
- 탭 전환 시 `router.replace` vs `router.push` 선택: `replace`를 사용해 브라우저 히스토리에 sort 변경이 쌓이지 않도록.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-phase2-spec.md§3 |
| 2026-05-26 11:16Z | pdt-developer | sonnet/medium | impl | FeedSortToggle.tsx 신규 94L + FeedClient refetch + page.tsx searchParams; tsc clean |
| 2026-05-27 02:35Z | pdt-developer | haiku/low | hotfix | 피드 관심/내 코스 탭 튕김 bug — page.tsx validSort 4모드 인정 + FeedClient initialSort useEffect에 liked/mine refetch 추가 |
