# Routebook 2-탭 IA 재구성 명세
> Phase 1.5 IA Spec · 2026-05-26 · pdt-designer
> 이 문서는 prior 2-탭 결정을 공식 대체한다.
> 연계: [design-direction-main.md](design-direction-main.md) · [design-phase2-spec.md](design-phase2-spec.md)

> ⚠️ **SHIPPED WITH DEVIATION (2026-05-27, commit 2706b81)** — 실제 배포는 **2-탭** (지도/피드). 설정 탭을 BottomTab에서 제거하고 `/map` 헤더 메뉴로 이전함. 정렬 모드도 팔로잉/내지역 → 관심/내 코스로 변경됨. 아래 `§ reality-vs-spec` 참조.

---

## § reality-vs-spec (배포 후 확인된 실제 구현)

| 항목 | spec (이 문서 원본) | shipped (2026-05-27) |
|---|---|---|
| BottomTab 슬롯 수 | 3 (지도/피드/설정) | **2 (지도/피드)** |
| 설정 진입점 | `/settings` BottomTab | `/map` 헤더 햄버거 메뉴 "⚙️ 설정" |
| FeedSortToggle 3번째 모드 | `following` 팔로잉 (bookmarks JOIN) | **`liked` 관심** (내가 좋아요한 코스, Auth) |
| FeedSortToggle 4번째 모드 | `region` 내지역 (위치 기반) | **`mine` 내 코스** (내가 만든 코스, Auth) |
| URL backward-compat | 없음 | `?sort=following` → `liked`, `?sort=region` → `mine` |
| bookmarks!inner 팔로잉 정렬 | v2 shipped | **V3 deferred** |
| 위치 기반 내지역 정렬 | v2 shipped | **V3 deferred** |

---

## 1. 결정 기록

### 이전 결정 — 무효화
- 날짜: 2026-05-26 (Phase 1 Discovery)
- 내용: 바텀탭 2개 유지 — 지도(`/map`) / 설정(`/settings`)
- 원문서: `design-direction-main.md §2.8`

### 신규 결정 — 본 문서가 SOT
- 날짜: 2026-05-26 (Phase 1.5) / 배포 편차 2026-05-27
- 내용: **2-탭 구조 — 지도(`/map`) / 피드(`/feed`); 설정(`/settings`)은 `/map` 헤더 메뉴로 이전**
- 근거 (사용자 패턴 분석):
  - Creator + Consumer 역할이 동시에 강함 — 코스 만들기와 코스 탐색이 병립
  - 지도 탐색(map-browse) + 인기 피드(popular-feed) 모두 heavy use 예상
  - 검색 vs 피드 사용 비중 미확정 → 두 진입점을 분리하는 것이 안전한 IA
  - 피드 분리 시 `/map`에서 courseFilter "liked"/"mine" 혼재 제거 → 지도 본연의 역할 명확화
  - 설정은 낮은 빈도 utility → BottomTab 슬롯 절약, 헤더 메뉴로 충분

### 스테일 선언

```
[STALE] design-direction-main.md §2.8 — 2-탭 IA 전환으로 대체됨 (2026-05-26)
[STALE] design-direction-main.md §4 마이그레이션 테이블 #10 — BottomTab 재구성으로 scope 변경됨
```

---

## 2. 탭 해부학

| # | 탭 라벨 | 경로 | 아이콘 | 목적 | 로그인 |
|---|---|---|---|---|---|
| 1 | **지도** | `/map` | Map polygon (현재 SVG 유지) | 위치 기반 코스 탐색, 코스 만들기 | Guest 허용 (만들기만 Auth) |
| 2 | **피드** | `/feed` | Compass / 나침반 SVG | 인기·신규·관심(좋아요)·내 코스 목록 | Guest 허용 (관심·내 코스 탭 제외) |

> **설정 진입점**: BottomTab에서 제거됨. `/map` 헤더 햄버거 메뉴의 "⚙️ 설정" 항목 → `/settings` 페이지. `/settings` 자체는 미들웨어 Auth 보호 유지.

### 피드 탭 아이콘 선택 근거 — Compass 채택

**채택 이유:**
- "탐색하다 / 발견하다" 의미론 — 피드는 새로운 코스를 발견하는 공간
- 지도 탭의 map polygon 아이콘과 시각적으로 충분히 구별됨
- strokeWidth 1.8 Airbnb line-icon 스타일로 통일 가능

**Compass SVG 구현 명세:**
```jsx
// 비활성: stroke="#999999", needle fill="none"
// 활성:   stroke="#222222", needle fill="#222222"
<svg
  width="22" height="22" viewBox="0 0 24 24" fill="none"
  stroke={active ? "#222222" : "#999999"}
  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
>
  <circle cx="12" cy="12" r="10" />
  <polygon
    points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
    fill={active ? "#222222" : "none"}
    stroke={active ? "#222222" : "#999999"}
  />
</svg>
```

---

## 3. `/map` 모드 재정의

### 변경 전 (현재 Map.tsx browse 모드)
- `courseFilter` state: `"all" | "liked" | "mine"` — 피드 기능이 지도 안에 혼재
- 수직 코스 목록 패널 (모드 토글) 지도 안에 내장
- Supabase `.limit(100)` 일괄 로드

### 변경 후 (`/map` 재정의)

| 기능 | 처리 | 비고 |
|---|---|---|
| 지도 인터랙티브 레이어 | ✅ 유지 | 아바타 핀, 경로 polyline |
| Featured category bar | ✅ 유지 → 개선 | icon+텍스트 전환 (design-phase2-spec.md §4) |
| 코스 만들기 모드 | ✅ 유지 | Auth gate 유지 |
| 검색 바 (장소 검색) | ✅ 유지 | `/map` 전용. `/feed`에 검색 바 없음. |
| 핀 탭 → 선택된 코스 카드 | ✅ 유지 | SelectedCourseCard (spec §5) |
| `courseFilter "liked"` | ❌ 제거 → `/feed` **관심** 탭으로 이전 | |
| `courseFilter "mine"` | ❌ 제거 → `/feed` **내 코스** 탭으로 이전 | |
| 코스 수직 목록 패널 | ❌ 제거 → `/feed`로 분리 | |
| 무한 스크롤 / 페이지네이션 | ❌ 불필요 | 지도에 핀만 표시 |

**지도 핀 로드 전략 (Phase 3):**
- browse 모드에서 공개 코스의 핀 좌표 + courseId만 경량 로드 (photos, description 제외)
- 핀 탭 시 해당 courseId로 상세 lazy fetch (썸네일 포함)
- Phase 3에서는 기존 limit(100) → 200 완화 허용 (viewport 기반 클러스터링은 이후 개선)

---

## 4. `/feed` 신규 라우트 명세

### 4.1 경로 및 레이아웃
- Route: `src/app/(main)/feed/page.tsx` (신규 생성)
- Layout 처리: `(main)/layout.tsx`의 "기타" 경로 자동 적용
  - `max-width: 600px`, `margin: 0 auto`, `background: #ffffff`, `overflow-y: auto`
  - BottomTab은 `position: fixed` → 피드 컨텐츠 하단에 padding 필요:
    `padding-bottom: calc(var(--bottom-tab-h) + env(safe-area-inset-bottom))`
- `(main)/layout.tsx` 수정 불필요 (자동 처리 확인됨)

### 4.2 정렬 모드 (FeedSortToggle)

| 모드 키 | 라벨 | 정렬 로직 | 로그인 |
|---|---|---|---|
| `popular` | 인기 | `order("like_count", { ascending: false })` | Guest 허용 |
| `new` | 신규 | `order("created_at", { ascending: false })` | Guest 허용 |
| `liked` | 관심 | 로그인 사용자가 좋아요한 코스 (`likes` 테이블 JOIN) | **Auth 필수** |
| `mine` | 내 코스 | 로그인 사용자가 만든 코스 (`eq("user_id", currentUserId)`) | **Auth 필수** |

기본 진입 탭: `popular`

> **URL backward-compat**: `?sort=following` → `liked` 자동 마이그레이션, `?sort=region` → `mine` 자동 마이그레이션 (feed/page.tsx 구현됨).

> **V3 deferred**: 팔로잉(bookmarks!inner JOIN으로 내가 찜한 사람들의 코스) + 내지역(위치 기반 지역 필터) 정렬 모드는 V3로 이월 (§ reality-vs-spec 참조).

### 4.3 관심·내 코스 쿼리 (v2 shipped)

**관심 탭** (`liked`) — 로그인 사용자가 좋아요한 코스:
```typescript
supabase
  .from("likes")
  .select(`
    course_id,
    courses!inner(
      id, title, description, distance_km, like_count, tags,
      region_tags, photos, user_id, created_at,
      profiles(id, nickname, avatar_url)
    )
  `)
  .eq("user_id", userId)
  .eq("courses.visibility", "public")
  .order("created_at", { ascending: false })
  .range(from, to)
```

**내 코스 탭** (`mine`) — 로그인 사용자가 만든 코스:
```typescript
supabase
  .from("courses")
  .select(`id, title, description, distance_km, like_count, tags,
           region_tags, photos, user_id, created_at,
           profiles(id, nickname, avatar_url)`)
  .eq("user_id", userId)
  .eq("visibility", "public")
  .order("created_at", { ascending: false })
  .range(from, to)
```

> **V3 팔로잉 쿼리** (deferred): bookmarks!inner JOIN으로 내가 찜한 사람들의 공개 코스 조회 — V3-VAL-03에서 구현 예정.

### 4.4 페이지네이션
- 방식: Cursor pagination via Supabase `.range(from, to)`, page size **20**
- 트리거: `IntersectionObserver` on sentinel div — 화면 하단 200px 전 도달 시 다음 페이지 fetch
- 로딩 상태: `skeletonPulse` 카드 (globals.css `@keyframes skeletonPulse` 기존 선언 활용)

### 4.5 빈 상태 (Empty State)

| 탭 | 조건 | 표시 |
|---|---|---|
| 인기 / 신규 | 코스 0개 | 지도핀 아이콘 + "아직 공개된 코스가 없어요" |
| 관심 | 좋아요한 코스 없음 | "좋아요한 코스가 여기 표시돼요" + 지도 탭 이동 버튼 |
| 관심 | 비로그인 | 로그인 유도 배너 (`LoginModal` 트리거) |
| 내 코스 | 만든 코스 없음 | "아직 만든 코스가 없어요 — 첫 번째 루트북 추가하기 →" (지도 탭 이동) |
| 내 코스 | 비로그인 | 로그인 유도 배너 (`LoginModal` 트리거) |

### 4.6 피드 카드 구성 순서
`CourseCard (variant="feed")`:
썸네일 → 헤더(아바타+닉네임+상대시간) → 제목 → 설명 → 태그 pill → 메트릭+좋아요 → CTA "자세히 보기"

상세 spec: `design-phase2-spec.md §1`

### 4.7 검색 바 부재 — 설계 의도
- `/feed` 상단에 검색 바를 두지 않음
- 장소 검색은 `/map` 전용 — 두 역할의 혼재 방지
- 코스 필터는 FeedSortToggle(§4.2)만으로 제공

---

## 5. BottomTab 2-탭 재설계 (설정 → /map 헤더 메뉴)

### 5.1 변경 명세 요약

파일: `src/components/BottomTab.tsx` (신규 아님, 수정)

**변경 전:**
```typescript
const TABS = [
  { label: "지도",  path: "/map",      icon: ... },
  { label: "설정",  path: "/settings", icon: ... },
]
```

**변경 후 (shipped):**
```typescript
const TABS = [
  { label: "지도",  path: "/map",      icon: MapIcon },
  { label: "피드",  path: "/feed",     icon: CompassIcon },   // ← 신규 (설정 대체)
]
```

> 설정 진입점: `/map` 헤더 햄버거 메뉴 → "⚙️ 설정" → `/settings`. `/settings` middleware Auth 보호 유지.

### 5.2 isActive 로직 — 수정 불필요

기존 로직이 `/feed` 경로를 올바르게 처리:
```typescript
const isActive = (path: string) => {
  if (pathname.startsWith("/course")) return false;  // 그대로
  if (path === "/map") return pathname === "/map" || pathname.startsWith("/map/"); // 그대로
  return pathname.startsWith(path);  // /feed ✓
};
```

### 5.3 토큰 적용 (스타일 업데이트)

| 속성 | 현재 하드코딩 값 | 변경 후 |
|---|---|---|
| 활성 아이콘/라벨 색 | `#1A1A1A` | `var(--color-text-primary)` |
| 비활성 아이콘/라벨 색 | `#999999` | `var(--color-text-tertiary)` |
| 탭 라벨 fontSize | `10` (숫자) | `"var(--text-nano)"` |
| 높이 | `height: 60` | `height: "var(--bottom-tab-h)"` |
| border-top 색 | `#E0E0E0` | `var(--color-border)` |
| 배경 | `rgba(248,247,244,0.95)` | 유지 (브랜드 일치 크림 톤) |
| backdropFilter | `blur(8px)` | 유지 |

### 5.4 Safe Area
현재: `paddingBottom: "env(safe-area-inset-bottom, 0px)"` — iOS 노치 대응 ✓ 유지

### 5.5 탭 터치 영역
2탭 모두 `flex: 1` → 균등 분배. 각 탭 최소 44px 터치 영역 보장 (아이콘 22px + 상하 패딩 11px×2).

상세 컴포넌트 spec: `design-phase2-spec.md §2`

---

## 6. 라우팅 + 인증 게이트

### 6.1 신규 라우트 파일 구조
```
src/app/(main)/
├── map/page.tsx          (기존, 무변경)
├── feed/
│   └── page.tsx          ← 신규 생성
├── settings/page.tsx     (기존, 무변경)
```

### 6.2 middleware.ts 업데이트 방침

현재 보호 경로: `/create`, `/settings`

| 경로 | 변경 | 이유 |
|---|---|---|
| `/feed` | 보호 추가 **불필요** | Guest 접근 허용 |
| `/feed` 관심·내 코스 탭 | 클라이언트 처리 | 탭 클릭 시 `LoginModal` 트리거 (middleware 아님) |
| `/settings` | 기존 그대로 | Auth 필수 유지 |

> **Implementation note**: middleware.ts에 `/feed` 보호 추가 불필요. 관심·내 코스 탭 인증은 `FeedSortToggle` 또는 `feed/page.tsx` 컴포넌트 레벨에서 `useAuth()` 체크 후 처리.

### 6.3 SEO / SSR 고려
- `/feed` 인기 탭 첫 페이지: 서버 컴포넌트 prefetch 가능 → OGP + 첫 20개 코스 SSR 최적화 (Phase 3 선택)
- `/map`: 현재 CSR 유지 (Mapbox GL JS는 SSR 불가)

### 6.4 auth/callback 리다이렉트
현재: OAuth 완료 → `/map` 리다이렉트 — 유지 (변경 불필요)

---

## 7. 마이그레이션 리스크

### 7.1 사용자 온보딩 안내 (Toast, 1회)
- 대상: 기존 사용자 (2-탭에 익숙)
- 조건: `localStorage.getItem("routebook_feed_tab_seen")` === null
- Toast 메시지: `"코스 피드가 피드 탭으로 이동했어요 🗺️"`
- CTA: "피드 탭으로 이동" → `/feed`
- 위치: `/map` 첫 방문 시, BottomTab 바로 위에서 Toast 표시 (5초 auto-dismiss)
- 구현: `localStorage.setItem("routebook_feed_tab_seen", "1")` 표시 후 세팅

### 7.2 SEO — `/feed` 신규 라우트 처리
- `src/app/sitemap.ts`에 `/feed` static route 추가
- `/feed` metadata:
  ```typescript
  title: "루트북 인기 코스 피드 — Routebook"
  description: "드라이버들이 공유한 인기 드라이브 코스를 만나보세요"
  ```
- OG image: 현재 `/icon-512.png` 유지 (동적 OG는 이후 개선)

### 7.3 GA4 이벤트 추가

기존 측정 ID `G-V9C13LRQ72` (layout.tsx)에 신규 이벤트 추가:

| 이벤트명 | 트리거 | 파라미터 |
|---|---|---|
| `feed_tab_view` | /feed 진입 | `{ sort: "popular"\|"new"\|"liked"\|"mine" }` |
| `feed_sort_change` | FeedSortToggle 탭 전환 | `{ from: string, to: string }` |
| `course_card_click` | 카드 "자세히 보기" 탭 | `{ course_id: string, source: "feed"\|"map" }` |
| `feed_like` | 피드 카드 좋아요 탭 | `{ course_id: string }` |

> **Implementation note**: `CourseCard.tsx`에 `source?: "feed" | "map"` prop 추가, `gtag("event", ...)` 호출로 구분.

### 7.4 BottomTab pathname 예외 — 유지 확인
현재: `/course/[id]` 경로에서 BottomTab 숨김 (`if (pathname.endsWith("/preview")) return null` 외 `/course` 분기). 2-탭 전환 후에도 동일 로직 유지 ✓.

### 7.5 (main)/layout.tsx — 무변경 확인
`(main)/layout.tsx`의 `/map` → `height: 100dvh` 풀스크린, 기타 → `maxWidth: 600px` scrollable 분기가 `/feed`를 자동으로 "기타"로 처리. 추가 변경 불필요.

---

## 8. Phase 3 티켓 인벤토리

### 8.1 신규 2-탭 IA 티켓

| 티켓 | 제목 | 타입 | 크기 | 선행 |
|---|---|---|---|---|
| **T-IA-01** | BottomTab 2-탭 재구성 (지도/피드) + 토큰 적용 | dev | S | T-DS-01 |
| **T-IA-02** | `/feed` 라우트 + 레이아웃 골격 생성 | dev | S | T-IA-01 |
| **T-IA-03** | `FeedSortToggle` 컴포넌트 (4탭: 인기/신규/관심/내 코스) | dev | S | T-IA-02 |
| **T-IA-04** | `CourseCard (variant="feed")` — 썸네일+메트릭+좋아요 | dev | M | T-IA-02, T-DS-01 |
| **T-IA-05** | `/feed` 인기/신규 정렬 + 무한 스크롤 + 관심/내 코스 쿼리 연결 | dev | M | T-IA-04 |
| **T-IA-06** | `/map` courseFilter "liked"/"mine" 제거 + 핀 경량화 | dev | M | T-IA-01 |
| **T-IA-07** | 피드 탭 이동 안내 토스트 (1회) | dev | S | T-IA-06 |

### 8.2 기존 마이그레이션 티켓 (direction-main §4 origin)

| 티켓 | 제목 | 타입 | 크기 | 우선순위 |
|---|---|---|---|---|
| **T-DS-01** | globals.css 토큰 전면 교체 | dev | S | **최우선** — 모든 것의 기반 |
| **T-DS-02** | Map.tsx shadow/color/radius 일괄 토큰화 | dev | M | T-DS-01 이후 |
| **T-DS-03** | 코스 카드 경로 썸네일 (`/api/thumbnail`) | dev | M | T-DS-01, T-IA-04와 병합 가능 |
| **T-DS-04** | MapTopBar 카테고리 칩 → 아이콘+텍스트 | dev | S | T-DS-01 이후 |
| **T-DS-05** | 선택된 코스 카드 bottom position 수정 | dev | S | T-IA-01 이후 |

### 8.3 의존성 그래프

```
T-DS-01 (globals.css 토큰)
  ├─► T-DS-02 (Map.tsx 토큰화)
  ├─► T-DS-04 (MapTopBar 아이콘칩)
  ├─► T-DS-05 (카드 bottom 수정)
  └─► T-IA-01 (BottomTab 2-탭)
        └─► T-IA-02 (/feed 라우트 골격)
              ├─► T-IA-03 (FeedSortToggle)
              ├─► T-IA-04 (CourseCard feed)
              │     └─► T-IA-05 (무한 스크롤 + 관심/내 코스)
              └─► T-IA-06 (/map 정리)
                    └─► T-IA-07 (마이그레이션 토스트)
```

### 8.4 2주 스프린트 실행 순서

```
Day 1      : T-DS-01 (토큰 교체 ~30분)
Day 2–3    : T-DS-02 (Map.tsx 토큰화)
             T-DS-04 (MapTopBar 칩)
             T-DS-05 (카드 bottom fix)
Day 4      : T-IA-01 (BottomTab 2-탭)
             T-IA-02 (/feed 골격)
Day 5–6    : T-IA-03 (FeedSortToggle)
             T-IA-04 (CourseCard + 썸네일) ← T-DS-03 병합
Day 7–8    : T-IA-05 (무한 스크롤 + 관심/내 코스)
             T-IA-06 (/map 정리)
Day 9      : T-IA-07 (마이그레이션 토스트)
Day 10–11  : QA · 엣지케이스 · skeleton · 접근성
Day 12     : 배포 후 GA4 이벤트 검증
```

---

## 스테일 노트 (decisions.md 후보)

> 2026-05-26 · 2-탭 IA 확정 (지도/피드); 설정 BottomTab 제거 → /map 헤더 메뉴 이전 · 이전 2-탭(지도/설정) 폐기 · design-direction-main.md §2.8 + §4 #10 스테일 처리 · Phase 3 티켓 T-DS-01~05 + T-IA-01~07 인벤토리 확정
> 2026-05-27 · 배포 후 편차 확인 — FeedSortToggle 팔로잉/내지역 → 관심/내 코스로 구현; 팔로잉(bookmarks JOIN)+내지역(위치 기반) V3 이월
