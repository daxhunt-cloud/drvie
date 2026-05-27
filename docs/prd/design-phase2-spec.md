# Routebook Phase 2 구현 명세 — "Clean Road" 컴포넌트 스펙
> Phase 2 Implementation Spec · 2026-05-26 · pdt-designer
> 선행 문서: [design-direction-main.md](design-direction-main.md) · [design-ia-3tab.md](design-ia-3tab.md)
> 범위: Phase 3 개발 입력 자료. 코드 미포함, 디자인 명세만.

---

## 개요

이 문서는 "Clean Road" 방향의 핵심 컴포넌트 5종에 대한 상세 구현 명세다.
Phase 3 티켓 작성 시 각 섹션이 Acceptance Criteria(AC)의 SOT가 된다.

| 섹션 | 컴포넌트 | 파일 | 티켓 |
|---|---|---|---|
| §1 | CourseCard | `src/components/CourseCard.tsx` (신규) | T-IA-04 + T-DS-03 병합 |
| §2 | BottomTab (3-탭) | `src/components/BottomTab.tsx` (수정) | T-IA-01 |
| §3 | FeedSortToggle | `src/components/FeedSortToggle.tsx` (신규) | T-IA-03 |
| §4 | MapTopBar 카테고리 칩 | `src/components/Map.tsx` 내부 (수정) | T-DS-04 |
| §5 | SelectedCourseCard | CourseCard `variant="popup"` (§1 동일 컴포넌트) | T-DS-05 |
| §6 | 토큰 SOT | `src/app/globals.css` (교체) | T-DS-01 |

---

## 1. CourseCard 컴포넌트 명세

### 1.1 Variant 구분

| Variant | 사용처 | 배치 방식 |
|---|---|---|
| `"feed"` | `/feed` 페이지 수직 리스트 | `width: 100%`, 카드 간 `margin-bottom: 12px` |
| `"popup"` | `/map` 핀 탭 시 하단 팝업 | `position: fixed` 컨테이너 내부, 모바일 full-width / 데스크탑 max-width 420px |

### 1.2 TypeScript Props 인터페이스

```typescript
interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    distance_km: number | null;
    like_count: number;
    tags: string[];
    region_tags: string[];
    photos: string[];              // photos[0] = 대표 사진 (없으면 thumbnail API 사용)
    user_id: string;
    created_at: string;
    profiles: {
      id: string;
      nickname: string;
      avatar_url: string | null;
    };
  };
  variant: "feed" | "popup";
  isLiked?: boolean;                              // 좋아요 상태 (낙관적)
  onLike?: (courseId: string) => void;            // useLike hook 콜백
  onClose?: () => void;                           // popup variant 전용 닫기
  onDetailClick?: (courseId: string) => void;     // "자세히 보기" 탭
  source?: "feed" | "map";                        // GA4 추적용 출처
}
```

### 1.3 카드 컨테이너 스타일

```css
background: var(--color-bg);              /* #ffffff */
border-radius: var(--radius-lg);          /* 16px */
box-shadow: var(--shadow-card);           /* Airbnb 3-layer */
overflow: hidden;
```

### 1.4 카드 해부학 — 영역별 상세 명세

> (2026-05-27 user request — 헤더 행 썸네일 위로 이동) 렌더 순서: B → A → C → D → E → F

#### B. 헤더 행 ← **썸네일 위**

```
padding:     12px 16px
display:     flex
align-items: center
gap:         8px
```

#### A. 썸네일 영역

```
height:      160px (popup variant) / 180px (feed variant)
border-radius: 0   /* 카드 컨테이너(overflow:hidden + radius-lg)가 상단 모서리 처리 */
object-fit:  cover
width:       100%
```

**src 우선순위:**
1. `course.photos[0]` — 사용자 업로드 대표 사진 (있으면 항상 우선)
2. `/api/thumbnail?courseId={id}` — Mapbox Static 경로 지도 (사진 없을 때)
3. Placeholder: `background: var(--color-bg-alt)` + 지도핀 SVG 아이콘 중앙 (`color: var(--color-text-tertiary)`)

```
loading: "lazy"   (IntersectionObserver 기반 — viewport 진입 시 로드)
```

구성:
```
[아바타 24×24] · [닉네임] · [·] · [상대시간]        [× 닫기] ← popup only
```

- 아바타: `width:24px`, `height:24px`, `border-radius:50%`, `object-fit:cover`, `flex-shrink:0`
- 닉네임: `font-size: var(--text-sm)` (13px), `font-weight: var(--weight-semibold)`, `color: var(--color-text-primary)`
- 구분점(·): `color: var(--color-text-tertiary)`, `font-size: var(--text-xs)` (12px)
- 상대시간: `font-size: var(--text-xs)` (12px), `font-weight: var(--weight-regular)`, `color: var(--color-text-tertiary)`, `margin-left: auto`
- 닫기(×): popup variant만. 탭 영역 최소 24×24px. `color: var(--color-text-tertiary)`. `margin-left: 8px`.

#### C. 제목 + 설명

```
padding: 8px 16px 0
```

- 제목: `font-size: var(--text-xl)` (16px), `font-weight: var(--weight-bold)`, `color: var(--color-text-primary)`, `line-height: 1.25`
- 설명: `font-size: var(--text-sm)` (13px), `font-weight: var(--weight-regular)`, `color: var(--color-text-secondary)`, `line-height: 1.5`
  - 2줄 클램프: `-webkit-line-clamp: 2`, `overflow: hidden`, `display: -webkit-box`, `-webkit-box-orient: vertical`
  - `description === null`이면 미렌더링 (높이 0)

#### D. 태그 pill row

```
padding:     8px 16px 0
display:     flex
gap:         6px
flex-wrap:   nowrap
overflow-x:  auto
scrollbar-width: none          /* Firefox */
```

pill 스타일:
```css
background:    var(--color-bg-alt);       /* #F4F4F4 */
border:        1px solid var(--color-border);
border-radius: var(--radius-full);
padding:       3px 8px;
font-size:     var(--text-xs);            /* 12px */
font-weight:   var(--weight-medium);
color:         var(--color-text-secondary);
white-space:   nowrap;
```

**최대 표시 규칙**: `tags[0]`, `tags[1]` 최대 2개 + overflow pill `"+N"` (N = 나머지 개수)
`overflow pill`: 동일 스타일, 텍스트 `"+N"`

#### E. 메트릭 + 좋아요 행

```
padding:         8px 16px 0
display:         flex
justify-content: space-between
align-items:     center
```

좌측 메트릭:
```
🚗 {distance_km}km  (distance_km null이면 "–")
font-size:   var(--text-xs)        /* 12px */
color:       var(--color-text-secondary)
display:     flex; align-items: center; gap: 4px
```

우측 좋아요 버튼:
```
[하트 아이콘 16px] [count]
비활성: 하트 stroke only, color var(--color-text-tertiary) (#999999)
활성:   하트 fill,   color var(--color-brand) (#ff385c)
count font-size: var(--text-xs), color 아이콘과 동일
터치 영역: min-width 44px, min-height 36px (padding 포함)
탭 시 optimistic update + scale(1.2) 애니메이션 150ms var(--ease-out)
```

하트 SVG:
```jsx
<svg width="16" height="16" viewBox="0 0 24 24"
  fill={isLiked ? "var(--color-brand)" : "none"}
  stroke={isLiked ? "var(--color-brand)" : "var(--color-text-tertiary)"}
  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
</svg>
```

#### F. CTA 버튼

```
padding: 12px 16px 16px   (버튼 외부 패딩)
```

```css
width:         100%;
height:        44px;
background:    var(--color-brand);          /* #ff385c */
color:         var(--color-text-inverse);   /* #ffffff */
border-radius: var(--radius-md);            /* 12px */
border:        none;
font-size:     var(--text-md);              /* 14px */
font-weight:   var(--weight-semibold);
cursor:        pointer;
transition:    background 150ms var(--ease-out), transform 100ms var(--ease-out);

/* active / pressed state */
:active {
  background: var(--color-brand-dark);      /* #e00b41 */
  transform: scale(0.98);
}
```

텍스트: `"자세히 보기"`

### 1.5 컴포넌트 상태

| 상태 | 시각 처리 |
|---|---|
| 로딩 (skeleton) | `skeletonPulse` 애니메이션 — 썸네일(회색 블록) + 제목(폭 60% 회색 바) + 태그(pill 2개 회색) 영역 |
| 썸네일 로드 실패 | `background: var(--color-bg-alt)` + 지도핀 SVG 중앙 (`40px`, `color: var(--color-text-tertiary)`) |
| 좋아요 탭 | scale(1.2) → scale(1.0), `duration: 150ms`, `var(--ease-out)` |
| 호버 (데스크탑) | `box-shadow: var(--shadow-hover)`, `transition: box-shadow 200ms` |
| 포커스 (키보드) | `outline: 2px solid var(--color-brand)`, `outline-offset: 2px` |

### 1.6 접근성

```
카드 컨테이너:    role="article"
                  aria-label="{title} 코스, {nickname}님 작성"
좋아요 버튼:      aria-label="{isLiked ? '좋아요 취소' : '좋아요'} ({like_count}개)"
                  aria-pressed={isLiked}
CTA 버튼:         aria-label="{title} 코스 자세히 보기"
썸네일 img:       alt="{title} 코스 경로 지도"
아바타 img:       alt="{nickname} 프로필 사진"
닫기 버튼(popup): aria-label="코스 카드 닫기"
```

---

## 2. BottomTab (3-탭) 컴포넌트 명세

### 2.1 파일 + 변경 범위
파일: `src/components/BottomTab.tsx` (수정)
티켓: T-IA-01

### 2.2 TABS 배열

```typescript
const TABS = [
  { label: "지도",  path: "/map",      icon: MapIcon },
  { label: "피드",  path: "/feed",     icon: CompassIcon },   // 신규 추가 (중간 위치)
  { label: "설정",  path: "/settings", icon: GearIcon },
]
```

### 2.3 Compass 아이콘 (피드 탭) SVG

```jsx
const CompassIcon = (active: boolean) => (
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
)
```

> 실제 색상값은 `var(--color-text-primary)` / `var(--color-text-tertiary)` 변수 참조로 교체할 것 (T-DS-01 토큰 교체 이후).

### 2.4 스타일 토큰 업데이트

| 속성 | 현재 하드코딩 | 변경 후 CSS 변수 |
|---|---|---|
| 활성 아이콘/라벨 색 | `#1A1A1A` | `var(--color-text-primary)` |
| 비활성 아이콘/라벨 색 | `#999999` | `var(--color-text-tertiary)` |
| 라벨 fontSize | `10` | `"var(--text-nano)"` |
| 라벨 fontWeight 활성 | `500` | `var(--weight-medium)` |
| 라벨 fontWeight 비활성 | `400` | `var(--weight-regular)` |
| 높이 | `height: 60` | `height: "var(--bottom-tab-h)"` |
| border-top 색 | `"0.5px solid #E0E0E0"` | `"0.5px solid var(--color-border)"` |
| 배경 | `rgba(248,247,244,0.95)` | **유지** (브랜드 크림 톤) |
| backdropFilter | `blur(8px)` | **유지** |

### 2.5 isActive 로직 — 무변경

```typescript
const isActive = (path: string) => {
  if (pathname.startsWith("/course")) return false;
  if (path === "/map") return pathname === "/map" || pathname.startsWith("/map/");
  return pathname.startsWith(path);  // /feed ✓, /settings ✓ 모두 처리
};
```

### 2.6 탭 전환 트랜지션

```css
/* 아이콘 + 라벨 색 전환 */
transition: color 150ms var(--ease-out);
/* font-weight는 transition 제외 — 레이아웃 시프트 방지 */
```

---

## 3. FeedSortToggle 컴포넌트 명세

### 3.1 파일 + 위치
파일: `src/components/FeedSortToggle.tsx` (신규)
마운트 위치: `/feed` 페이지 상단 고정 (`position: sticky; top: 0`)
티켓: T-IA-03

### 3.2 Props

```typescript
type FeedSortMode = "popular" | "new" | "following" | "region";

interface FeedSortToggleProps {
  active: FeedSortMode;
  onSelect: (mode: FeedSortMode) => void;
  isLoggedIn: boolean;     // 팔로잉 탭 LoginModal 트리거용
}
```

### 3.3 탭 배열

```typescript
const SORT_TABS = [
  { key: "popular",   label: "인기"    },
  { key: "new",       label: "신규"    },
  { key: "following", label: "팔로잉"  },
  { key: "region",    label: "내지역"  },
]
```

### 3.4 컨테이너 스타일

```css
display:          flex;
gap:              8px;
padding:          12px 16px;
overflow-x:       auto;
-webkit-overflow-scrolling: touch;
scroll-snap-type: x mandatory;
background:       var(--color-bg);
border-bottom:    0.5px solid var(--color-border);
position:         sticky;
top:              0;
z-index:          10;
/* scrollbar 숨김 */
scrollbar-width:  none;
```

### 3.5 개별 탭 버튼 스타일

**비활성:**
```css
padding:       7px 14px;
border-radius: var(--radius-full);
font-size:     var(--text-sm);        /* 13px */
font-weight:   var(--weight-medium);
color:         var(--color-text-secondary);
background:    var(--color-bg-alt);
border:        1px solid var(--color-border);
white-space:   nowrap;
cursor:        pointer;
transition:    background 150ms var(--ease-out), color 150ms var(--ease-out),
               border-color 150ms var(--ease-out);
```

**활성:**
```css
color:         var(--color-text-inverse);  /* #ffffff */
background:    var(--color-brand);         /* #ff385c */
border-color:  var(--color-brand);
```

### 3.6 팔로잉 탭 비로그인 처리

- 탭은 항상 표시 (dimmed 처리 없음 — 발견/로그인 유도)
- 비로그인 상태에서 "팔로잉" 탭 클릭 시:
  - 탭 이동 없이 `LoginModal` 트리거
  - 정렬 상태(`active`) 변경 없음

### 3.7 로딩 상태

```
데이터 fetching 중: pointer-events: none, opacity: 0.6
결과 없음(빈 피드): toggle 유지 — 빈 상태 UI는 카드 리스트 영역에서 처리
```

---

## 4. MapTopBar — 카테고리 칩 명세

### 4.1 변경 대상

파일: `src/components/Map.tsx` 내 Featured chips 섹션
티켓: T-DS-04

변경 방향: 텍스트 전용 pill → **이모지 아이콘 + 텍스트** 카테고리 바

### 4.2 TAG_OPTIONS → 아이콘 매핑 테이블

| 태그 (원본) | 이모지 | 표시 텍스트 | 비고 |
|---|---|---|---|
| 야경 | 🌃 | 야경 | |
| 심야 | 🌙 | 심야 | |
| 힐링 | 🌿 | 힐링 | |
| 해안 | 🌊 | 해안 | |
| 산길 | 🏔️ | 산길 | |
| 드라이브 데이트 | 💕 | 데이트 | 표시는 축약 (원본 필터 값은 "드라이브 데이트" 유지) |
| 단풍 | 🍁 | 단풍 | |
| 새벽 | 🌅 | 새벽 | |
| 일출 | 🌄 | 일출 | |
| 지름길 | ⚡ | 지름길 | |
| 와인딩 | 〰️ | 와인딩 | |
| 강변 | 🏞️ | 강변 | |
| 맛집 | 🍽️ | 맛집 | |
| 카페 | ☕ | 카페 | |

> **필터 값 주의**: 화면 표시 텍스트("데이트")와 `searchTagFilter` 비교값("드라이브 데이트")을 분리 관리.

### 4.3 칩 렌더링 패턴

```jsx
{CATEGORY_MAP.map(({ tag, emoji, label }) => (
  <button
    key={tag}
    onClick={() => toggleTagFilter(tag)}
    style={isActive ? activeStyle : inactiveStyle}
  >
    <span>{emoji}</span>
    <span>{label}</span>
  </button>
))}
```

### 4.4 칩 스타일

**비활성:**
```css
display:       flex;
align-items:   center;
gap:           4px;
background:    var(--color-bg);
border:        1px solid var(--color-border);
border-radius: var(--radius-full);
padding:       6px 12px;
font-size:     var(--text-xs);           /* 12px */
font-weight:   var(--weight-medium);
color:         var(--color-text-secondary);
white-space:   nowrap;
cursor:        pointer;
```

**활성 (`searchTagFilter` 포함 시):**
```css
background:   var(--color-brand-subtle);  /* rgba(255,56,92,0.08) */
border-color: var(--color-brand);
color:        var(--color-brand);
font-weight:  var(--weight-semibold);
```

### 4.5 칩 컨테이너 (스크롤 처리)

```css
display:          flex;
gap:              8px;
padding:          8px 16px;
overflow-x:       auto;
-webkit-overflow-scrolling: touch;
scrollbar-width:  none;
```

### 4.6 검색 바 shadow 수정 (병행)

```css
/* 현재 */
box-shadow: 0 2px 8px rgba(0,0,0,0.15);

/* 변경 후 */
box-shadow: var(--shadow-control);   /* 0 2px 8px rgba(0,0,0,0.12) */
```

---

## 5. SelectedCourseCard (popup variant) 포지셔닝 명세

### 5.1 컴포넌트 관계

`SelectedCourseCard` = `CourseCard variant="popup"` + 외부 위치 컨테이너.
별도 컴포넌트 신규 생성 없이 §1 `CourseCard`의 `popup` variant 재사용.

### 5.2 포지셔닝 버그 수정

**현재 (버그):**
```css
bottom: calc(24px + env(safe-area-inset-bottom));
```
문제: BottomTab 높이(60px) 미반영 → 카드가 탭 바 아래로 가려짐

**변경 후:**
```css
bottom: calc(var(--bottom-tab-h) + 16px + env(safe-area-inset-bottom));
/* = 60px + 16px + safe-area ≈ 84–92px */
```

### 5.3 위치 컨테이너 전체 스타일

```css
position:   fixed;
bottom:     calc(var(--bottom-tab-h) + 16px + env(safe-area-inset-bottom));
left:       16px;
right:      16px;
z-index:    30;      /* BottomTab(50) 아래, 지도(1) 위 */
max-width:  420px;
margin:     0 auto;
```

### 5.4 진입/퇴장 애니메이션

```css
/* 진입: 선택된 핀 탭 시 */
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
animation: slideUp 300ms var(--ease-out) forwards;

/* 퇴장: × 닫기 버튼 / 지도 배경 탭 시 */
@keyframes slideDown {
  from { transform: translateY(0);    opacity: 1; }
  to   { transform: translateY(100%); opacity: 0; }
}
animation: slideDown 200ms var(--ease-in-out) forwards;
```

### 5.5 닫기 인터랙션

| 트리거 | 동작 |
|---|---|
| × 버튼 탭 | `setSelectedBrowseCourse(null)` → slideDown 애니메이션 |
| 지도 배경 탭 | 동일 |
| 스와이프 다운 | Phase 3 필수 아님 — 향후 개선 여지 |

---

## 6. 토큰 SOT — 참조

> **전체 `:root` CSS 토큰 블록**은 `docs/prd/design-direction-main.md §3`이 SOT.
>
> Phase 3 T-DS-01 티켓에서 `src/app/globals.css`의 기존 Montage 시스템 `:root` 블록을
> 해당 문서의 블록으로 **전면 교체**한다. 부분 패치 금지.

기존 Montage 토큰 → 신규 토큰 매핑 표: `design-direction-main.md §3` 하위 참조.

---

## 7. Phase 3 티켓 가이드

### 7.1 Acceptance Criteria 템플릿

```markdown
## AC

**디자인 명세**: `docs/prd/design-phase2-spec.md §{섹션번호}` + `design-ia-3tab.md §{섹션번호}`

### 기능
- [ ] spec의 TypeScript props 인터페이스를 준수한다
- [ ] spec의 HTML 구조 / 영역 배치를 준수한다
- [ ] 모바일(<768px) + 데스크탑(≥768px) 양쪽 시각 확인
- [ ] iOS safe-area 처리 (관련 컴포넌트)

### 토큰 준수
- [ ] 모든 색상값이 `var(--color-*)` 변수를 참조한다 (하드코딩 없음)
- [ ] 모든 shadow가 `var(--shadow-*)` 토큰을 참조한다
- [ ] 모든 border-radius가 `var(--radius-*)` 토큰을 참조한다
- [ ] 모든 font-size가 `var(--text-*)` 토큰을 참조한다

### 접근성
- [ ] 키보드 포커스 가능
- [ ] `aria-label` spec 명세 준수

### 빌드
- [ ] `npx tsc --noEmit` 타입 에러 없음
```

### 7.2 의존성 그래프 (요약)

```
T-DS-01 (globals.css 토큰)    ← 전제조건
  │
  ├─► T-IA-01 (BottomTab)     ← §2 명세
  │     └─► T-IA-02 (/feed)  ← §3 FeedSortToggle 전제
  │           └─► T-IA-03 (FeedSortToggle)     ← §3 명세
  │           └─► T-IA-04 (CourseCard feed)    ← §1 명세
  │
  ├─► T-DS-04 (MapTopBar)     ← §4 명세
  └─► T-DS-05 (카드 bottom)   ← §5 명세
```

전체 의존성 그래프: `design-ia-3tab.md §8.3` 참조.

### 7.3 Phase 3 범위 외 (명시적 제외)

| 항목 | 제외 이유 |
|---|---|
| CoursePlayer 다크 스킨 변경 | 의도적 "cinematic moment" 분리 — 스테일 아님, 유지 |
| `/map` 무한 스크롤 도입 | 지도는 핀 200개 한계 유지 — 스크롤 불필요 |
| `/feed` 팔로잉 → push 알림 | 알림 인프라 미존재 |
| OG 이미지 동적 생성 | `/icon-512.png` 유지 — 코스 썸네일 기반 동적 OG는 이후 |
| `/feed` 검색 바 | IA 결정 — 장소 검색은 `/map` 전용 |
| 스와이프 다운 dismiss (popup) | Phase 3 이후 개선 |

---

## 8. Phase 3 진입 전 오픈 퀘스천

PO / 사용자 확인이 필요한 2개 사항. 답변 전 Phase 3 T-IA-05(무한 스크롤), T-IA-06(팔로잉)은 개발 시작 보류.

---

### Q1. `/feed` 내지역 탭 — 위치 정밀도 구현 방식

"내지역" 정렬 시 현재 사용 가능한 두 방식:

| | Option A — 역지오코딩 | Option B — 거리 계산 |
|---|---|---|
| 방법 | `navigator.geolocation` → `/api/reverse-geocode` (Kakao) → 행정동 → `region_tags` 문자열 매칭 | `navigator.geolocation` → `@turf/turf` Haversine → 코스 waypoints 좌표와 거리 계산 후 근거리 정렬 |
| 장점 | 기존 API 재활용, 구현 빠름 | Kakao API 비용 없음, 더 정밀한 근거리 정렬 |
| 단점 | Kakao API 호출 (rate limit 30/min), 행정동 매칭 부정확 | DB 쿼리 변경 필요 (region_tags → 좌표 기반), 클라이언트 연산 |
| 구현 비용 | S | M |

**Designer 권고**: Option A (빠른 구현, 기존 인프라 재활용). 트래픽 증가 시 Option B 전환.

> **확인 필요**: "내지역 탭 구현 방식 — 빠른 구현(Option A, 행정동 매칭) vs 정밀도(Option B, 좌표 거리)?"

---

### Q2. 썸네일 Mapbox API 호출 빈도 — 캐싱 전략

`/api/thumbnail?courseId={id}` 라우트는 현재 매 요청마다 Mapbox Static Images API 호출.
피드 20개 카드 노출 시 최대 20 Static API 호출 발생 (브라우저 캐시 없을 경우).

| | Option A — 캐시 헤더 | Option B — Storage 사전 생성 |
|---|---|---|
| 방법 | `/api/thumbnail` 라우트에 `Cache-Control: public, max-age=86400` 추가 | 코스 저장 시 썸네일 생성 → Supabase Storage `course-thumbnails/{courseId}.png` 저장 |
| 장점 | 구현 1줄, 즉시 적용 | API 재호출 완전 제거, 빠른 이미지 로딩 |
| 단점 | 첫 방문 시 API 호출 여전히 발생 | 저장 flow 수정, Storage 용량 증가 |
| 구현 비용 | S (1줄) | M |

**Designer 권고**: Phase 3에서 Option A 우선 적용. 사용자 수 증가 시 Option B 전환.

> **확인 필요**: "썸네일 API 호출 빈도 대응 — 캐시 헤더(Option A) vs Storage 사전 생성(Option B)?"

---

## 스테일 노트 (decisions.md 후보)

> 2026-05-26 · Phase 2 구현 명세 완료 · 5개 컴포넌트 (CourseCard/BottomTab/FeedSortToggle/MapTopBar/SelectedCourseCard) · AC 템플릿 확정 · Phase 3 진입 전 오픈 퀘스천 2개 (Q1 내지역 방식, Q2 썸네일 캐싱) PO 확인 대기
