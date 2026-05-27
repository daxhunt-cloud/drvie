---
id: T-IA-04
slug: routebook-design-direction-main
version: v2
title: "/feed 무한 스크롤 페이지네이션"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-ia-3tab.md§4
estimated_complexity: L2
risk_flags: [pagination,perf]
priority: P1
started_at: "2026-05-26T11:16:05Z"
completed_at: "2026-05-26T11:19:46Z"
duration_min: 5
routing: { model: sonnet, effort: medium }
created_at: "2026-05-26T07:21:31Z"
---

# T-IA-04 · `/feed` 무한 스크롤 + 정렬별 쿼리 연결

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`/feed`의 cursor 기반 무한 스크롤을 구현한다. `IntersectionObserver`로 하단 sentinel div를 탐지해 20개씩 추가 로드. 인기/신규 두 정렬 모드의 Supabase 쿼리를 `FeedSortMode`에 따라 분기. 스크롤 끝 도달 시 종료 메시지 표시. 선행: T-IA-02(/feed 라우트), T-IA-03(FeedSortToggle — sort mode state). 팔로잉/내지역 쿼리는 T-IA-05에서 추가.

## Approach

**1. 무한 스크롤 로직** (`FeedClient.tsx` 내부 또는 `src/hooks/useInfiniteScroll.ts` 신규)

```typescript
// cursor state
const [page, setPage] = useState(0);
const [courses, setCourses] = useState<Course[]>(initialCourses);
const [hasMore, setHasMore] = useState(true);
const [loading, setLoading] = useState(false);

const loadMore = async () => {
  if (loading || !hasMore) return;
  setLoading(true);
  const from = (page + 1) * 20;
  const to = from + 19;
  const { data } = await supabase
    .from("courses")
    .select("...")
    .eq("visibility", "public")
    .order(sortField, { ascending: false })
    .range(from, to);
  if (!data || data.length === 0) {
    setHasMore(false);
  } else {
    setCourses(prev => [...prev, ...data]);
    setPage(p => p + 1);
  }
  setLoading(false);
};
```

**2. 정렬별 쿼리 분기**

| `activeSortMode` | `sortField` | `ascending` |
|---|---|---|
| `"popular"` | `"like_count"` | `false` |
| `"new"` | `"created_at"` | `false` |
| `"following"` | — T-IA-05에서 처리 | — |
| `"region"` | — T-IA-05에서 처리 | — |

정렬 모드 변경 시: `setCourses([])`, `setPage(0)`, `setHasMore(true)` 리셋 후 재fetch.

**3. IntersectionObserver sentinel**

```typescript
const sentinelRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting) loadMore(); },
    { threshold: 0.1, rootMargin: "0px 0px 200px 0px" }
  );
  if (sentinelRef.current) observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [loading, hasMore, activeSortMode]);
```

**4. 로딩 / 종료 상태 UI**

- 로딩 중: 하단에 skeleton card 2개 (`skeletonPulse` 애니메이션)
- 마지막 페이지: "더 이상 코스가 없어요 🗺️" 메시지 (`text-align:center`, `color: var(--color-text-tertiary)`, `padding: 24px`)
- 결과 0건: design-ia-3tab.md §4.5 빈 상태 메시지 표시

## Acceptance

- [ ] 피드 스크롤 하단 200px 진입 시 다음 20개 코스 자동 로드
- [ ] 추가 로드 중 하단에 skeleton card 2개 표시
- [ ] 마지막 페이지 도달 시 "더 이상 코스가 없어요" 메시지 표시
- [ ] 빈 결과(코스 0개) 시 empty state 메시지 표시 (`design-ia-3tab.md §4.5`)
- [ ] 정렬 탭 전환 시 목록 리셋 후 새 정렬 기준으로 재fetch
- [ ] 중복 fetch 없음 (`loading` flag 가드)
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- 팔로잉/내지역 정렬 쿼리 (T-IA-05)
- 풀-투-리프레시 (pull-to-refresh) 제스처
- 코스 카드 클릭 후 뒤로가기 시 스크롤 위치 복원 (scroll restoration)

## Notes / risks

- `initialCourses` prop(SSR 첫 20개)과 client-side `courses` state 동기화: 마운트 시 `useState(initialCourses)`로 초기화, 첫 loadMore 시 `range(20, 39)`에서 시작하도록 `page` 초기값을 0이 아닌 별도 처리 필요 (SSR page = 0으로 이미 소비됨).
- 정렬 변경 시 리셋 로직이 `activeSortMode` 변경 useEffect와 충돌하지 않도록 주의. 리셋은 `loadMore` 호출 전에 동기적으로 완료해야 함.
- Supabase `.range()` 쿼리는 0-indexed offset 기반 — 대용량 피드에서는 성능 저하 가능. Phase 3 완료 후 cursor(id 기반) 페이지네이션 마이그레이션 고려.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-ia-3tab.md§4 |
| 2026-05-26 11:19Z | pdt-developer | sonnet/medium | impl | IntersectionObserver cursor pagination + race guard (activeSortModeRef) + end-message; tsc clean |
