---
id: T-IA-02
slug: routebook-design-direction-main
version: v2
title: "/feed 라우트 신규 (SSR)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-ia-3tab.md§4
estimated_complexity: L3
risk_flags: [new-route,ssr]
priority: P1
started_at: "2026-05-26T08:33:00Z"
completed_at: "2026-05-26T08:36:36Z"
duration_min: 7
routing: { model: sonnet, effort: high }
created_at: "2026-05-26T07:21:31Z"
---

# T-IA-02 · `/feed` 라우트 신규 생성 + SSR 첫 페이지

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`src/app/(main)/feed/page.tsx`를 신규 생성한다. 공개 코스 피드(기본 인기순) SSR로 첫 20개를 서버에서 prefetch해 OG 메타데이터와 함께 HTML에 포함한다. 게스트 접근 허용(middleware 변경 불필요). `FeedSortToggle`(T-IA-03), `CourseCard`(T-DS-04)와 연동된다. 전체 라우트 명세: `design-ia-3tab.md §4`. 선행: T-IA-01(BottomTab /feed 탭 추가).

## Approach

**1. 페이지 구조**

서버 컴포넌트 `page.tsx`가 첫 데이터를 fetch하고, 클라이언트 컴포넌트 `FeedClient.tsx`(신규, 같은 폴더)에 initialCourses를 prop으로 전달하는 구조.

`src/app/(main)/feed/page.tsx` (서버 컴포넌트):
- Supabase server client(`@/lib/supabase/server`)로 `from("courses").select("id,title,description,distance_km,like_count,tags,region_tags,photos,user_id,created_at,profiles(id,nickname,avatar_url)").eq("visibility","public").order("like_count",{ascending:false}).range(0,19)` 실행
- `export const metadata` 설정: `title:"루트북 인기 코스 피드 — Routebook"`, `description:"드라이버들이 공유한 인기 드라이브 코스를 만나보세요"`
- Suspense 경계로 `<FeedClient initialCourses={...}>` 감싸기

`src/app/(main)/feed/FeedClient.tsx` (클라이언트 컴포넌트):
- `"use client"` 선언
- `FeedSortToggle` + 코스 목록(CourseCard feed variant) 렌더링
- cursor pagination state 관리 (T-IA-04에서 확장)
- `/feed` 레이아웃은 `(main)/layout.tsx`의 "기타" 경로(max-width:600px, scrollable) 자동 적용
- 하단 padding: `paddingBottom: "calc(var(--bottom-tab-h) + env(safe-area-inset-bottom))"` 적용

**2. 게스트 접근**

middleware.ts 변경 불필요. `/feed`는 보호 라우트 목록에 추가하지 않는다.
비로그인 상태에서 좋아요 버튼 탭 시 `LoginModal` 트리거.

**3. Sitemap 추가**

`src/app/sitemap.ts`에 `/feed` static URL 추가.

## Acceptance

- [ ] `/feed` 200 OK, 게스트 접근 가능
- [ ] 서버 렌더링 HTML에 코스 카드 데이터 포함 (View Source 확인)
- [ ] OG `title: "루트북 인기 코스 피드 — Routebook"` 메타 태그 포함
- [ ] FeedSortToggle 컴포넌트 상단 고정 표시 (T-IA-03 완료 후 동작)
- [ ] 인기순 CourseCard 리스트 표시 (T-DS-04 완료 후 풀 카드)
- [ ] 페이지 하단에 BottomTab이 콘텐츠를 가리지 않는 padding 존재
- [ ] `src/app/sitemap.ts`에 `/feed` URL 포함
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- FeedSortToggle 실제 정렬 쿼리 연결 (T-IA-03)
- 무한 스크롤 (T-IA-04)
- 팔로잉/내지역 쿼리 (T-IA-05)
- /feed 전용 OG 이미지 (현재 `/icon-512.png` 유지)

## Notes / risks

- `(main)/layout.tsx`가 `/feed`를 "기타" 경로로 자동 처리하는지 확인: `isMapPage` 조건이 `/map` 계열만 true이므로 자동으로 scrollable 600px 레이아웃 적용됨.
- SSR 첫 fetch가 Supabase 지연으로 느릴 경우 Suspense `fallback`에 skeleton 2–3개 카드 표시.
- `/feed?sort=popular` URL param은 T-IA-03에서 동기화 예정. 이 티켓에서는 `sort` param 무시하고 기본 인기순만 처리.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-ia-3tab.md§4 |
| 2026-05-26 08:36Z | pdt-developer | sonnet/high | impl | /feed page.tsx + FeedClient.tsx 신규 (RSC SSR, 20 courses prefetch, FeedSkeleton inline, LoginModal 연결, sitemap +1); build/tsc clean |
