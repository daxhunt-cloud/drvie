---
id: T-IA-05
slug: routebook-design-direction-main
version: v2
title: "팔로잉+내지역 쿼리 (audit F-2 fix)"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-ia-3tab.md§4
estimated_complexity: L3
risk_flags: [supabase-query,geolocation]
priority: P1
started_at: "2026-05-26T11:19:46Z"
completed_at: "2026-05-26T11:26:33Z"
duration_min: 7
routing: { model: sonnet, effort: high }
created_at: "2026-05-26T07:21:31Z"
---

# T-IA-05 · "팔로잉" + "내지역" 정렬 쿼리 구현

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`FeedSortToggle`의 "팔로잉"과 "내지역" 탭의 실제 Supabase 쿼리를 구현한다. 팔로잉 = `bookmarks` 테이블 INNER JOIN으로 팔로우한 사용자의 public 코스. 내지역 = OQ-1 Option A — `navigator.geolocation` + `/api/reverse-geocode`(Kakao) → 행정동 → `region_tags` overlap 필터. 쿼리 명세: `design-ia-3tab.md §4.3`. 선행: T-IA-04(무한 스크롤 + 쿼리 분기 구조).

## Approach

**1. 팔로잉 쿼리** (Auth 필수)

`design-ia-3tab.md §4.3` Supabase JS 구문 그대로:
```typescript
const { data } = await supabase
  .from("courses")
  .select(`
    id, title, description, distance_km, like_count, tags,
    region_tags, photos, user_id, created_at,
    profiles(id, nickname, avatar_url),
    bookmarks!inner(user_id)
  `)
  .eq("bookmarks.user_id", userId)
  .eq("visibility", "public")
  .order("created_at", { ascending: false })
  .range(from, to);
```

비로그인 상태에서 팔로잉 탭 접근 시(T-IA-03에서 `LoginModal` 트리거 처리) 이 쿼리는 호출되지 않음.

빈 결과(팔로우한 사람의 코스 없음) → empty state: "팔로우한 사람의 코스가 여기 표시돼요" + 지도 탭 이동 버튼.

**2. 내지역 쿼리** (Option A — 역지오코딩)

```typescript
// 1. 브라우저 위치 요청
navigator.geolocation.getCurrentPosition(
  async (pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    // 2. Kakao 역지오코딩 → 행정동
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    const { region } = await res.json();  // 예: "마포구", "서초구"
    // 3. Supabase region_tags overlap 쿼리
    const { data } = await supabase
      .from("courses")
      .select("...")
      .eq("visibility", "public")
      .contains("region_tags", [region])
      .order("like_count", { ascending: false })
      .range(from, to);
  },
  (err) => {
    // 위치 권한 거부: fallback 처리
    setRegionFallback(true);
  }
);
```

위치 권한 거부 시 fallback:
- `regionFallback === true`이면 `region_tags.cs({"수도권"})` 기본 쿼리 + 안내 메시지 "위치 권한을 허용하면 내 지역 코스를 볼 수 있어요"

`/api/reverse-geocode` 응답에서 행정동 문자열을 추출하는 방식은 기존 `api/reverse-geocode/route.ts` 응답 구조 확인 후 동일하게 파싱.

**3. 무한 스크롤 통합**

T-IA-04의 쿼리 분기 구조에 `"following"`, `"region"` case 추가. 정렬 변경 시 state 리셋 로직 동일 적용.

## Acceptance

- [ ] 팔로잉 탭: 로그인한 사용자가 `bookmarks`에 등록한 사용자의 public 코스만 표시
- [ ] 팔로잉 탭: 팔로우 없음 → "팔로우한 사람의 코스가 여기 표시돼요" 빈 상태 표시
- [ ] 내지역 탭: 위치 허용 시 역지오코딩된 행정동으로 `region_tags` 필터 적용
- [ ] 내지역 탭: 위치 거부 시 "수도권" fallback + 안내 메시지 표시
- [ ] 내지역 탭: `region_tags` 매칭 코스 없음 → empty state("내 주변 코스가 없어요") 표시
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- 내지역 Option B (turf.js 거리 계산) — OQ-1 결정으로 추후 고려
- 팔로잉 실시간 업데이트 (Supabase Realtime — 추후 개선)
- `/api/reverse-geocode` 라우트 자체 수정

## Notes / risks

- `bookmarks!inner` join 구문이 Supabase JS v2에서 정상 동작하는지 로컬 테스트 필요. 의도한 대로 작동하지 않으면 `.select("..., bookmarks(user_id)").not("bookmarks","is","null")` 대안 패턴 사용.
- `/api/reverse-geocode` 응답 구조 확인: 현재 Kakao `coord2regioncode` API 응답에서 `region_2depth_name`(구 단위) 또는 `region_3depth_name`(동 단위) 중 어느 수준으로 `region_tags`와 매칭할지 결정 필요. `region_tags`에 실제 저장된 값 수준과 일치시켜야 함.
- Kakao API rate limit 30/min — 내지역 탭 빠른 재탭 시 연속 호출 방지 debounce(500ms) 적용 권장.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-ia-3tab.md§4 |
| 2026-05-26 11:26Z | pdt-developer | sonnet/high | impl | following 2-step + region getRegionByCoord (Kakao 불필요) + geo cancel guard + fallback 서울 도심; tsc clean |
