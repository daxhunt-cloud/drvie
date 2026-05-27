---
id: T-DS-04
slug: routebook-design-direction-main
version: v2
title: "CourseCard 컴포넌트 추출 (variant prop)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-phase2-spec.md§1
estimated_complexity: L3
risk_flags: [refactor,component-extract]
priority: P1
started_at: "2026-05-26T08:24:13Z"
completed_at: "2026-05-26T08:31:33Z"
duration_min: 9
routing: { model: sonnet, effort: high }
created_at: "2026-05-26T07:21:31Z"
---

# T-DS-04 · CourseCard variant prop 컴포넌트화

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`src/components/CourseCard.tsx`를 신규 작성한다. Map.tsx의 selectedCourse popup 카드와 `/feed` 피드 카드 두 곳이 동일 컴포넌트를 `variant="popup" | "feed"` prop으로 재사용하도록 한다. 전체 구현 명세는 `design-phase2-spec.md §1`(CourseCard 컴포넌트 명세)이며, T-DS-03의 썸네일 로직을 컴포넌트 내부로 흡수한다. 선행: T-DS-01(토큰), T-DS-03(썸네일 로직 확인).

## Approach

**1. `src/components/CourseCard.tsx` 신규 작성**

`design-phase2-spec.md §1.2`의 `CourseCardProps` 인터페이스를 그대로 구현. 영역별 상세 스타일은 `design-phase2-spec.md §1.4`(A~F 각 영역) 준수.

주요 구현 포인트:
- `variant="feed"`: 썸네일 height 180px, width 100%, `margin-bottom: 12px`
- `variant="popup"`: 썸네일 height 160px, `position:fixed` 컨테이너는 부모(Map.tsx)가 처리
- 썸네일 src 우선순위: T-DS-03에서 구현한 로직(`photos[0]` → `/api/thumbnail?courseId={id}` → placeholder) 동일하게 적용
- 좋아요 버튼: `useLike` hook import, `isLiked` prop + `onLike` callback 연결
- 태그 pill: 최대 2개 + `+N` overflow pill
- CTA 버튼: `height: 44px`, `borderRadius: var(--radius-md)`, `background: var(--color-brand)`
- 닫기 버튼: `variant === "popup"` && `onClose` prop 있을 때만 렌더
- GA4 이벤트: `onDetailClick` 호출 시 `gtag("event","course_card_click",{course_id, source})`

**2. Map.tsx 교체**

Map.tsx의 selectedCourse 카드 JSX(기존 인라인 구현) → `<CourseCard variant="popup" course={...} onClose={...} onDetailClick={...} />` 로 교체. SelectedCourseCard 위치 컨테이너(position:fixed, bottom calc)는 Map.tsx 래퍼 div가 계속 관리.

접근성 항목(`design-phase2-spec.md §1.6`) 준수: `role="article"`, `aria-label`, 좋아요 버튼 `aria-pressed`.

## Acceptance

- [ ] `src/components/CourseCard.tsx` 파일 존재, `CourseCardProps` 타입 정의 포함
- [ ] Map.tsx의 기존 selectedCourse 카드 JSX가 `<CourseCard variant="popup" ...>` 으로 교체됨
- [ ] `/feed` 피드 리스트에서 `<CourseCard variant="feed" ...>` 사용 (T-IA-02 연동)
- [ ] 좋아요 버튼이 `useLike` hook과 연결되어 optimistic update 동작
- [ ] `variant="popup"` 일 때 닫기(×) 버튼 표시, `variant="feed"` 일 때 미표시
- [ ] 태그 최대 2개 + `+N` pill 렌더링 동작
- [ ] `role="article"`, `aria-label` 적용 (`design-phase2-spec.md §1.6`)
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- 스와이프 다운 dismiss 제스처 (추후 개선)
- CourseCard 호버 애니메이션 (데스크탑 `--shadow-hover` 전환 — 선택적 구현)
- 태그 overflow 스크롤 가로 스와이프 커스텀 처리

## Notes / risks

- `useLike` hook(`src/hooks/useLike.ts`)이 `courseId` 파라미터를 받는 방식 확인 후 연결. hook signature 변경이 필요하면 이 티켓 내에서 처리.
- Map.tsx의 `selectedBrowseCourse` state 타입과 `CourseCardProps.course` 타입 일치 여부 확인 필요. Supabase 쿼리 결과 타입을 CourseCardProps와 맞추는 type assertion이 필요할 수 있음.
- T-DS-03 이전에 이 티켓을 작업하는 경우 썸네일 로직을 직접 구현하면 됨. T-DS-03 이후라면 해당 로직을 컴포넌트로 이동하는 것으로 충분.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-phase2-spec.md§1 |
| 2026-05-26 08:31Z | pdt-developer | sonnet/high | impl | CourseCard.tsx 신규 416L (variant popup/feed, useLike, photos[0]→thumbnail→placeholder fallback, a11y) + Map.tsx selectedCourse JSX 교체 |
| 2026-05-27 02:06Z | pdt-developer | sonnet/medium | adjust | anatomy reorder — 헤더(아바타·닉·시간·×) 썸네일 위로 이동, 썸네일 border-radius 0 (양 variant 동일); spec doc 동기화 |
| 2026-05-27 02:11Z | pdt-developer | haiku/low | enhance | 코스 핀 선택 시 floating animation (translateY -5px + shadow pulse, 2s ease-in-out infinite); CSS keyframe + dataset courseId + class toggle useEffect |
| 2026-05-27 02:15Z | pdt-developer | haiku/low | hotfix | pin transform 충돌 해결 — createProfilePinEl outer(Mapbox transform용) > inner.pin-inner(animation 전용) 분리 |
