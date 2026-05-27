---
id: T-DS-03
slug: routebook-design-direction-main
version: v2
title: "코스 카드 썸네일 추가 (/api/thumbnail)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-phase2-spec.md§1
estimated_complexity: L3
risk_flags: [api-cost-thumbnail]
priority: P1
started_at: "2026-05-26T08:24:13Z"
completed_at: "2026-05-26T08:31:33Z"
duration_min: 0
routing: { model: sonnet, effort: high }
created_at: "2026-05-26T07:21:31Z"
---

# T-DS-03 · 코스 카드 썸네일 추가 (`/api/thumbnail` 활용)

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

선택된 코스 카드(Map.tsx의 selectedCourse 카드)에 경로 썸네일을 추가한다. `/api/thumbnail` 라우트는 이미 존재하므로 카드 렌더 시 src 우선순위 로직(`photos[0]` → `/api/thumbnail` → placeholder), skeleton 로딩, 에러 fallback만 구현하면 된다. 아울러 `/api/thumbnail` 라우트에 `Cache-Control: public, max-age=86400` 헤더를 추가해 Mapbox Static API 중복 호출을 줄인다(OQ-2 Option A). 구현 명세: `design-phase2-spec.md §1.4 A (썸네일 영역)`.

## Approach

**1. 카드 썸네일 렌더링**

`src/components/Map.tsx` 내 selectedCourse 카드 JSX 상단에 썸네일 `<img>` 블록을 추가:

- `course.photos` 배열이 비어 있지 않으면 `photos[0]`를 src로 사용
- `photos` 없거나 빈 배열이면 `/api/thumbnail?courseId={course.id}`
- `onError` 핸들러: 이미지 로드 실패 시 `--color-bg-alt` 배경 + 지도핀 SVG placeholder로 교체
- 로딩 중: `skeletonPulse` animation (`background: var(--color-bg-alt)`) — globals.css `@keyframes skeletonPulse` 활용
- 스타일: `width:100%`, `height:160px`, `objectFit:"cover"`, `borderRadius:"var(--radius-lg) var(--radius-lg) 0 0"`

이 썸네일 블록은 T-DS-04에서 `CourseCard.tsx`로 이관되므로, 지금은 Map.tsx 내 인라인 구현으로 작성. T-DS-04 진행 시 컴포넌트로 흡수됨.

**2. `/api/thumbnail` Cache-Control 헤더 추가**

`src/app/api/thumbnail/route.ts`의 Response 반환부에 아래 헤더 추가:
```
Cache-Control: public, max-age=86400, s-maxage=86400
```
Vercel edge cache 및 브라우저 캐시 모두 활성화. 동일 courseId는 24시간 캐시.

## Acceptance

- [ ] 선택된 코스 카드 상단에 16:9 비율 썸네일 이미지 표시
- [ ] `course.photos[0]`이 있는 코스: 사용자 업로드 사진 표시
- [ ] `photos` 없는 코스: `/api/thumbnail?courseId=...` Mapbox Static 경로 지도 표시
- [ ] 썸네일 로딩 중: `skeletonPulse` 배경 애니메이션 표시
- [ ] 이미지 로드 실패(API 오류 등): 크림 배경 + 지도핀 아이콘 placeholder 표시
- [ ] `/api/thumbnail` 응답에 `Cache-Control: public, max-age=86400` 헤더 포함
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- `/feed` 피드 카드 썸네일 (T-DS-04 CourseCard 컴포넌트화 시 통합)
- Supabase Storage에 썸네일 사전 생성 (OQ-2 Option B — 추후 검토)
- 썸네일 API 자체 로직 변경 (기존 Mapbox Static + sharp 합성 로직 유지)

## Notes / risks

- `T-DS-04`에서 `CourseCard.tsx`를 추출할 때 이 썸네일 블록을 컴포넌트 내부로 이관한다. 두 티켓을 동일 개발자가 순서대로 작업하는 것을 권장.
- `photos[0]`은 Supabase Storage public URL — `img` src로 직접 사용 가능 (현재 `course-photos` 버킷 public 여부 확인 필요. 비공개라면 signed URL 생성 로직 추가 필요).
- 롤백: 썸네일 영역만 제거하면 이전 카드로 복원 가능. Cache-Control 헤더는 삭제만 하면 됨.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-phase2-spec.md§1 |
| 2026-05-26 08:31Z | pdt-developer | (merged) | merged | scope absorbed into T-DS-04 — thumbnail logic placed inside CourseCard component (photos[0] → /api/thumbnail → placeholder) |
