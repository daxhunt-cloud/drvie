---
id: T-IA-06
slug: routebook-design-direction-main
version: v2
title: "Map.tsx browse 모드 분리 (audit A-1 부분)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-ia-3tab.md§3
estimated_complexity: L4
risk_flags: [mega-refactor,regression-risk]
priority: P1
started_at: "2026-05-27T02:22:48Z"
completed_at: "2026-05-27T02:27:40Z"
duration_min: 8
routing: { model: sonnet, effort: high }
created_at: "2026-05-26T07:21:31Z"
---

# T-IA-06 · Map.tsx 모드 시스템 리팩터 — 피드 책임 이관

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`src/components/Map.tsx`의 browse 모드에서 코스 목록 피드 카드 표시 책임을 `/feed` 라우트로 이관한다. `courseFilter("all"|"liked"|"mine")` state와 수직 코스 목록 패널 JSX를 제거. 모드 타입을 `"explore" | "create" | "editMode"`로 정리하고, 선택된 코스 카드는 `selectedBrowseCourse` state + `CourseCard variant="popup"`으로 유지한다. 목표: Map.tsx 최소 200줄 감소. 선행: T-DS-04(CourseCard 컴포넌트화), T-IA-02(/feed 라우트 존재).

## Approach

**1. 제거 대상 식별 및 삭제**

아래 state + 관련 JSX + 관련 effect를 제거한다:
- `courseFilter` state (`"all" | "liked" | "mine"`) + 필터 버튼 UI
- `browseCourses` state (코스 목록 배열) → `/feed`가 담당
- `likedCourseIds` state — `/feed` 카드에서 `useLike` hook이 담당
- 코스 목록 수직 패널 JSX (모바일 바텀시트 목록, 데스크탑 사이드 패널 목록)
- `fetchBrowseCourses()` useEffect (목록 fetch) → 핀 표시용 경량 fetch로 교체

**2. 유지 대상 확인**

- `selectedBrowseCourse` state + `setSelectedBrowseCourse` — 핀 탭 시 카드 팝업용 유지
- `<CourseCard variant="popup" ...>` (T-DS-04) — 위치 컨테이너 포함 유지
- 지도 위 아바타 핀 레이어 (Mapbox marker) — 유지. 단, 핀 데이터는 `id, title, user_id, lat, lng` 경량 필드만 fetch하도록 쿼리 축소 가능
- `create` 모드 전체 — 유지
- `editMode` 진입/탈출 — 유지
- `searchMode`, 검색 바, Featured category bar — 유지

**3. 모드 타입 정리**

```typescript
// 변경 전
type MapMode = "browse" | "create";

// 변경 후
type MapMode = "explore" | "create" | "editMode";
// selectedBrowseCourse !== null 이 선택된 카드 팝업 상태를 대체
```

**4. 핀 데이터 경량화 (선택적)**

기존 `.limit(100)` 전체 코스 fetch를 id+좌표+userId만 가져오는 경량 쿼리로 교체하면 Map.tsx 성능 향상. 핀 탭 시 courseId로 상세 fetch(title, photos, tags 등). 이 경량화는 이 티켓 내에서 가능하면 처리, 범위 초과 시 별도 티켓으로 분리.

## Acceptance

- [ ] explore 모드에서 코스 목록 패널/카드 리스트가 표시되지 않음
- [ ] 지도 위 아바타 핀은 여전히 표시됨
- [ ] 핀 탭 시 `CourseCard variant="popup"` 카드 팝업 정상 동작
- [ ] create 모드 진입/경유지 추가/저장 플로우 정상 동작
- [ ] `courseFilter` state grep 결과 0건 (`src/components/Map.tsx`)
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] 기존 대비 Map.tsx 파일 최소 200줄 감소 (git diff --stat으로 확인)

## Out of scope

- Map.tsx의 나머지 inline style 토큰화 (T-DS-02, T-DS-05)
- Mapbox 핀 클러스터링 (대용량 핀 성능 최적화 — 이후 별도)
- Map.tsx → 여러 컴포넌트 분리 (대규모 리팩터 — 이후 별도)

## Notes / risks

- `browseCourses` state 제거 시 Mapbox 핀 레이어에 해당 데이터를 공급하는 useEffect도 함께 확인. 핀 표시를 위한 경량 fetch는 유지하거나 새로 작성해야 함.
- `likedCourseIds`가 Map.tsx 내 다른 UI(핀 강조 등)에서도 사용 중이면 제거 전 검색 후 판단.
- 대규모 삭제이므로 작업 전 브랜치 생성 권장. PR에서 삭제된 줄 수를 명시적으로 확인.
- `editMode` 관련 상태(`editingCourseId` 등)가 `mode === "browse"` 조건문에 의존하고 있을 수 있음. 조건문을 `mode === "explore"`로 변경하거나 분리 필요.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-ia-3tab.md§3 |
| 2026-05-27 02:27Z | pdt-developer | sonnet/high | impl | -38 lines (2434→2396). courseFilter/likedCourseIds 제거, mode browse→explore (14곳), filter 메뉴 항목 제거; 200줄 목표 미달(no large list panel existed) but 0 회귀 |
