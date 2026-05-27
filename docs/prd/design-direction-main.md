# Routebook 메인 스크린 디자인 방향 제안
> Phase 1 Discovery · 2026-05-26 · pdt-designer
> 참조 레퍼런스: Strava activity feed + Airbnb DS + Routebook 브랜드
> 범위: Map.tsx feed mode (`/map` 라우트) — 토큰 + 코어 컴포넌트 (Option A, 1-2주)

---

## 1. Strava 레퍼런스 분석 — 루트북에 적용 가능한 패턴 추출

Strava activity feed를 디자이너 시각으로 분석, 루트북에 이식 가능한 6개 패턴을 추출한다.

### Strava의 핵심 성공 요인

**1. 아바타 → 제목 → 지도 → 메트릭 배지 계층 (Photo-first hierarchy)**
- 아바타 + 이름 + 시간 헤더 (top-left)
- 제목 bold 대형 (가장 큰 텍스트)
- 지도 미리보기 / 사진 (visual proof)
- 거리·속도·심박 메트릭 배지 row (하단)
- CTA는 항상 끝

루트북 적용: **아바타 핀 tap → 카드에 경로 미리보기 썸네일 추가** (현재 없음이 가장 큰 격차)

**2. 메트릭 배지 (Pill with icon)**
- `🏃 5.2km | ⚡ 5:30/km | 💓 148bpm` 형태
- flat pill, border 없음, 아이콘 + 값 쌍
- 고밀도 정보를 스캔하기 쉬운 형태로 압축

루트북 적용: `🚗 XXkm | ♥ YY` → pill 배지 형식으로 ("♥ 이모지 텍스트" 탈피)

**3. Activity type 아이콘 (코스 바이브 태그)**
- 러닝/라이딩/수영 등 activity type이 카드 상단 right에 icon으로 표시
- 스캔 속도 향상, 필터링 단서 제공

루트북 적용: `야경 / 해안 / 산길` 등 감성 태그의 첫 번째 태그를 아이콘으로 변환하는 방향. 현재 Featured chips가 이 역할을 부분적으로 하고 있으나 아이콘 없음.

**4. 단일 브랜드 컬러 + 그레이스케일 (Singular accent philosophy)**
- Strava: `#FC4C02` (orange) 1색 + 회색 계열
- 희소성이 accent의 힘을 증폭
- Airbnb: `#ff385c` (red) 1색 + 회색 계열 — **동일 철학**

루트북 적용: `#ff385c`를 진정한 singular accent로 운용. `#0066FF` (Montage blue)를 semantic-info 역할로만 제한 (GPS icon 등 UX-semantically "blue가 맞는" 곳만).

**5. 카드 밀도 + 지도 미리보기 embed**
- Strava는 경로 지도를 카드 내에 embed (static map image)
- 루트북의 `/api/thumbnail` 라우트 + `lib/map-utils.ts`의 Mapbox Static Images 유틸이 이미 준비되어 있음

루트북 적용: 선택된 코스 카드에 `<img src="/api/thumbnail?courseId=..."` 썸네일 삽입 — 즉시 적용 가능.

**6. Kudos (좋아요) 인터랙션**
- thumb-up 아이콘 + 카운트 숫자, 탭 시 애니메이션 fill
- 현재 루트북 코스 카드에 like 인터랙션 없음 (코스 상세 페이지로 이동해야만 가능)

루트북 적용: 코스 카드 bottom row에 `♥ XX` 인터랙티브 좋아요 버튼 추가 — `useLike` hook 이미 존재.

### Strava 패턴 중 루트북에 맞지 않는 것

| Strava 패턴 | 이유 |
|---|---|
| 세로 스크롤 피드 뷰 | 루트북 메인은 지도 first — 피드 리스트 뷰 추가는 Phase 1 범위 밖 (Open Question 참조) |
| 세그먼트/KOM/리더보드 | 게이미피케이션 요소 — 루트북 무료 단순 모델에 불필요 |
| Beacon (실시간 위치 공유) | 라이브 트래킹 — 루트북 비동기 코스 공유 모델과 다름 |

---

## 2. Routebook × Airbnb × Strava 통합 방향 제안

### Direction: "Clean Road" (단방향 권고)

> **하나의 일관된 방향을 권고한다.** 두 방향 제시를 지양 — 결정 비용을 사용자에게 전가하지 않기 위해.

---

#### 2.1 컬러

| 역할 | 값 | 근거 |
|---|---|---|
| **Brand accent** | `#ff385c` | Rausch Red. DESIGN.md + 실제 구현 + 아이콘 모두 일치. 변경 불필요. |
| **Brand dark** | `#e00b41` | Pressed state, deep variant |
| **Brand subtle** | `rgba(255,56,92,0.08)` | 활성 메뉴 배경, 힌트 영역 (현재 `#EBF5FF` 파란색을 교체) |
| **Text primary** | `#222222` | Airbnb near-black (warm) — Montage `#1A1A1A`보다 따뜻함 |
| **Text secondary** | `#6a6a6a` | Airbnb 2차 텍스트 |
| **Text tertiary** | `#999999` | 탭 비활성, disabled |
| **Surface white** | `#ffffff` | 카드, 패널, 드롭다운 |
| **Surface subtle** | `#F8F8F6` | 입력 배경, empty state, 크림 톤 |
| **Info/GPS** | `#428bff` | GPS 아이콘, 링크 — semantic-blue만 허용. CTA에서 제거. |
| **Success** | `#10b981` | "출발" 마커만 — 도착 방향성 UX semantic 유지 |
| **Arrive accent** | `#ff385c` | "도착" 마커 — brand red 일치 |
| **Danger** | `#e03e3e` | 에러 텍스트, 취소 아이콘 |

**그라데이션 정책**: 피드/브라우즈/만들기 UI = flat, no gradient. 그라데이션은 `CoursePlayer.tsx` dark cinematic skin 전용 (현재 FilmOverlay 구현 유지).

---

#### 2.2 타이포그래피

**SOT 결정: Pretendard Variable** (이유: audit §5 참조)

| 역할 | size | weight | line-height | letter-spacing | 적용처 |
|---|---|---|---|---|---|
| Display / 섹션 헤딩 | 20px | 700 | 1.3 | normal | 패널 제목, 단계 헤딩 |
| Card title | 16px | 700 | 1.25 | normal | 코스 카드 제목 |
| Card title medium | 16px | 600 | 1.25 | normal | 검색 결과 장소명 |
| UI semibold | 14px | 600 | 1.43 | normal | 버튼, 강조 UI 텍스트 |
| Body / link | 14px | 400 | 1.43 | normal | 본문, 드롭다운 주소 |
| Caption | 13px | 500 | 1.4 | normal | 코스 설명, 태그 버튼 |
| Small | 12px | 400–600 | 1.4 | normal | 라벨, 카운터 |
| Micro | 11px | 600 | 1.3 | 0.2px | 태그 배지, 메트릭 단위 |
| Nano | 10px | 400–500 | 1.3 | normal | 탭 라벨, 스텝 카운터 |

**원칙 (Airbnb 계승)**: 헤딩은 400 이하 weight 금지. 본문 최소 13px. 한국어 특성상 letter-spacing은 0 또는 약간 양수(0.2px 이내)만 사용.

---

#### 2.3 카드 해부학 — 메인 스크린 선택된 코스 카드

```
┌─────────────────────────────────────────┐
│  [경로 썸네일 — Mapbox Static, 16:9] ← NEW  │
│  (via /api/thumbnail 기존 라우트 활용)     │
├─────────────────────────────────────────┤
│  [아바타 24px] 닉네임  · 00분 전     [×]   │
│                                          │
│  코스 제목 (16px/700)                    │
│  한 줄 소개 (13px/400, #6a6a6a, 2줄 클램프)│
│                                          │
│  [야경] [해안] [+1]  ← 태그 pill         │
│                                          │
│  🚗 24.5km    ♥ 128    ← 메트릭 배지     │
│                                          │
│  [────────── 자세히 보기 ──────────]     │
└─────────────────────────────────────────┘
```

- **사진 비율**: 16:9 (Mapbox Static 기본 출력)
- **썸네일 반경**: `--radius-md` (12px) — 카드 내 contained image
- **카드 반경**: `--radius-lg` (16px)
- **카드 shadow**: `--shadow-card` (3-layer)
- **좋아요 버튼**: 탭 가능 (optimistic update, `useLike` hook)
- **메트릭 배지**: icon + 숫자, `#6a6a6a` text, no border

---

#### 2.4 모바일 / 데스크탑 레이아웃

**모바일 (<768px):**
- 상단: 메뉴버튼(left) + 검색바(center-right) 고정
- 중단: Featured chips (horizontal scroll)
- 하단: 코스 선택 시 카드가 SafeArea-aware 위치에서 올라옴 (`bottom: calc(60px + 16px + env(safe-area-inset-bottom))`)
  - 현재 `calc(24px + env(...))` → BottomTab 60px를 고려하지 않음 → 수정 필요
- 하단 배너: "루트북 추가하기" CTA (코스 미선택 시 항상 표시)

**데스크탑 (≥768px):**
- 코스 선택 시 좌측 또는 하단에 카드 표시 (현재 동일 위치 — 개선 가능하나 Phase 1 scope 밖)
- 우측 FAB 그룹 유지

---

#### 2.5 빈 상태 (Empty State)

현재: floating bubble 텍스트. 개선안:
- 하단 배너 영역에 통합 (별도 floating 제거)
- 일러스트 대신 아이콘(지도 핀) + 카피 "근처에 아직 코스가 없어요" + "첫 번째 루트북 추가하기" 버튼
- 하단 CTA 버튼이 이미 존재하므로 중복 floating bubble 제거로 단순화

---

#### 2.6 로딩 상태

현재: 전체화면 white + spinner. 개선안 (Phase 1 범위 내):
- 카드 skeleton pulse 애니메이션 (`@keyframes skeletonPulse` 이미 globals.css에 선언됨)
- 전체화면 spinner는 navigating/auto-save에만 유지 (현재 ✓)

---

#### 2.7 지도 오버레이 UI

- **핀 스타일**: 현재 프로필 아바타 원형 핀 유지 — 직관적이고 소셜 아이덴티티 표현
- **경로선**: selected = `#ff385c` (4px) / all-routes = `#222222` opacity 0.3 (3px) — 현재 유지
- **경유지 번호 마커**: `#ef4444` → `#ff385c` 교체 (brand alignment)
- **출발 마커**: `#10b981` 유지 — "Green = Go/Start" UX semantic은 글로벌 convention

---

#### 2.8 바텀 탭

> ⚠️ **[STALE]** 이 섹션은 Phase 1.5 결정으로 대체됨.
> 3-탭 IA 결정 (지도/피드/설정)이 SOT: `design-ia-3tab.md §1`

~~현재 구현 거의 적절. 2가지 미세 수정:~~
- ~~활성 색: `#1A1A1A` → `#222222` (DESIGN.md near-black)~~
- ~~비활성 색: `#999999` 유지 (현재 OK)~~
- ~~배경 `rgba(248,247,244,0.95)` — 따뜻한 크림 톤, 브랜드 일치, 유지~~

최신 BottomTab 명세: `design-ia-3tab.md §5` + `design-phase2-spec.md §2`

---

## 3. 토큰 시스템 제안 — 신규 `globals.css` `:root` 블록

현재 Montage 토큰을 완전히 교체. 아래가 새 SOT.

```css
/* =======================================================
   Routebook Design System Tokens — v1.0
   Clean Road direction · 2026-05-26
   SOT: docs/prd/design-direction-main.md §3
   ======================================================= */
:root {

  /* ── 브랜드 컬러 ── */
  --color-brand:          #ff385c;            /* Rausch Red — singular accent */
  --color-brand-dark:     #e00b41;            /* Pressed / deep state */
  --color-brand-subtle:   rgba(255,56,92,0.08); /* Active menu bg, hint areas */

  /* ── 텍스트 컬러 ── */
  --color-text-primary:   #222222;            /* Near-black (Airbnb warm) */
  --color-text-secondary: #6a6a6a;            /* Body secondary, descriptions */
  --color-text-tertiary:  #999999;            /* Tab inactive, disabled */
  --color-text-inverse:   #ffffff;            /* On dark surfaces */
  --color-text-label:     #6B7B8D;            /* Form labels */

  /* ── 배경 / 서피스 ── */
  --color-bg:             #ffffff;            /* Card, panel, dropdown */
  --color-bg-subtle:      #F8F8F6;            /* Input bg, empty state, cream */
  --color-bg-alt:         #F4F4F4;            /* App chrome, skeleton bg */
  --color-bg-control:     #f2f2f2;            /* Circular nav button surface */
  --color-bg-overlay:     rgba(0,0,0,0.3);   /* Modal scrim */

  /* ── 보더 ── */
  --color-border:         #E0E0E0;            /* Standard dividers */
  --color-border-strong:  #C2C2C2;            /* Emphasized borders */
  --color-border-subtle:  #f1f5f9;            /* Hairline dividers */

  /* ── 시맨틱 상태 ── */
  --color-success:        #10b981;            /* "출발" endpoint, URL 유효 */
  --color-danger:         #e03e3e;            /* Error text, cancel action */
  --color-info:           #428bff;            /* GPS icon, 링크 — CTA 불가 */

  /* ── 그림자 ── */
  /* Airbnb 3-layer warm shadow — 모든 elevated surface의 SOT */
  --shadow-card:
    rgba(0,0,0,0.02) 0px 0px 0px 1px,
    rgba(0,0,0,0.04) 0px 2px 6px,
    rgba(0,0,0,0.1)  0px 4px 8px;
  /* 호버 / 버튼 lift */
  --shadow-hover:         rgba(0,0,0,0.08) 0px 4px 12px;
  /* 포커스 링 */
  --shadow-focus:         0 0 0 2px rgba(255,56,92,0.3);
  /* Float 카드 (선택된 코스 카드 등) */
  --shadow-float:         rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 4px 16px;
  /* 바텀 시트 상단 */
  --shadow-panel-top:     0 -2px 12px rgba(0,0,0,0.1);
  /* 원형 FAB */
  --shadow-control:       0 2px 8px rgba(0,0,0,0.12);

  /* ── 반경 ── */
  --radius-xs:    4px;      /* 작은 링크, 드래그 핸들 */
  --radius-sm:    8px;      /* 버튼, 입력, 배지 pill */
  --radius-md:    12px;     /* 패널, 카드, 검색바, 드롭다운 */
  --radius-lg:    16px;     /* 코스 카드, 바텀 시트 단차 */
  --radius-xl:    20px;     /* 바텀 시트 상단 모서리 */
  --radius-full:  9999px;   /* pill 태그 (완전 원형) */
  --radius-circle: 50%;     /* 원형 FAB, 아바타 */

  /* ── 타이포그래피 ── */
  --font-display: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-body:    'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

  /* size / line-height 쌍 */
  --text-nano:  10px;   /* lh: 1.3 */
  --text-micro: 11px;   /* lh: 1.3 */
  --text-xs:    12px;   /* lh: 1.4 */
  --text-sm:    13px;   /* lh: 1.5 */
  --text-md:    14px;   /* lh: 1.43 */
  --text-lg:    15px;   /* lh: 1.4 */
  --text-xl:    16px;   /* lh: 1.25 */
  --text-2xl:   20px;   /* lh: 1.3 */
  --text-3xl:   24px;   /* lh: 1.2 */

  /* weight */
  --weight-regular:   400;
  --weight-medium:    500;
  --weight-semibold:  600;
  --weight-bold:      700;

  /* ── 스페이싱 (4px base) ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;

  /* ── 모션 ── */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast:   150ms;
  --duration-normal: 300ms;
  --duration-slow:   500ms;

  /* ── 지도 오버레이 고정 치수 ── */
  --fab-size:       42px;   /* 원형 FAB 기본 사이즈 */
  --bottom-tab-h:   60px;   /* BottomTab 높이 */
  --top-bar-h:      60px;   /* 상단 컨트롤 영역 기준 */
}
```

### 기존 Montage 토큰과의 매핑 (삭제 전 참조)

| 기존 (globals.css) | 신규 토큰 | 비고 |
|---|---|---|
| `--primary: #0066FF` | 제거 | UI에서 미사용. info-only |
| `--label-normal: #1A1A1A` | `--color-text-primary: #222222` | Airbnb warm 우선 |
| `--label-alternative: #4D4D4D` | — | `--color-text-secondary` 로 흡수 |
| `--label-assistive: #999999` | `--color-text-tertiary: #999999` | ✓ 유지 |
| `--bg-normal: #FFFFFF` | `--color-bg: #ffffff` | ✓ |
| `--bg-alt: #F4F4F4` | `--color-bg-alt: #F4F4F4` | ✓ |
| `--fill-normal: #F4F4F4` | `--color-bg-alt` 로 통합 | |
| `--line-normal: #E0E0E0` | `--color-border: #E0E0E0` | ✓ |
| `--status-positive: #00B386` | `--color-success: #10b981` | 기존 구현과 동기화 |
| `--status-negative: #FF4D4D` | `--color-danger: #e03e3e` | 기존 구현과 동기화 |
| `--accent-blue-bg: #EBF5FF` | `--color-brand-subtle` 로 교체 | 메뉴 active에서 파란배경 제거 |
| `--radius-sm: 8px` | `--radius-sm: 8px` | ✓ |
| `--radius-md: 12px` | `--radius-md: 12px` | ✓ |
| `--radius-lg: 16px` | `--radius-lg: 16px` | ✓ |

---

## 4. 마이그레이션 경로 — 1-2주 Phase 3 티켓 범위

> ⚠️ **[PARTIAL STALE]** 이 테이블은 Phase 1.5 결정으로 부분 업데이트됨.
> 최신 통합 티켓 인벤토리 + 의존성 그래프: `design-ia-3tab.md §8`
> (#10 BottomTab 항목은 3-탭 전환(T-IA-01)으로 대체됨)

### 우선순위 컴포넌트 10개

| # | 컴포넌트/토큰 | 임팩트 | 노력 | 순서 이유 |
|---|---|---|---|---|
| 1 | **globals.css 토큰 전면 교체** | ★★★ | S | 모든 것의 기반. 가장 먼저. |
| 2 | **`--shadow-card` 토큰 일괄 적용** | ★★★ | S | 10곳의 shadow 불일치 → 1 토큰으로 통일. 가장 가시적 일관성 효과. |
| 3 | **메뉴 active bg `#EBF5FF` → `--color-brand-subtle`** | ★★ | S | 브랜드 훼손 (파란 배경) 즉시 제거. |
| 4 | **경유지 마커 `#ef4444` → `--color-brand`** | ★★ | S | 브랜드 빨강 통일. 1행 수정. |
| 5 | **태그 배지 border 통일** | ★★ | S | 6종 border 색 → `--color-border` 1종. Tag pill 패턴 확립. |
| 6 | **Primary CTA 버튼 radius 통일** | ★★ | S | "루트북 추가하기", "자세히 보기" 등 → `--radius-md` (12px) 일괄. |
| 7 | **검색 바 shadow → `--shadow-card`** | ★★ | S | 가장 자주 닿는 interactive element. 단일→3-layer. |
| 8 | **선택된 코스 카드 썸네일 추가** | ★★★ | M | Strava gap 핵심. `/api/thumbnail` 활용. `lib/map-utils.ts` 기존 유틸 사용. |
| 9 | **코스 카드 bottom row → 메트릭 배지 + 좋아요 버튼** | ★★★ | M | `♥ 이모지` → pill badge + `useLike` hook 연결. |
| 10 | ~~**BottomTab 활성색 `#1A1A1A` → `#222222`**~~ | ~~★~~ | ~~S~~ | **[STALE]** → T-IA-01 (3-탭 전환)에 흡수됨 |

### 전환 순서 (Impact × Effort 매트릭스)

```
S(Quick wins) 먼저 → M(medium) 순으로

Week 1:
  Day 1–2 : 토큰 교체 (#1) + shadow/border/color 일괄 적용 (#2,#3,#4,#5,#6,#7)
  Day 3–4 : 코스 카드 썸네일 구현 (#8)
  Day 5   : 메트릭 배지 + 좋아요 버튼 (#9)

Week 2:
  QA, 엣지케이스(빈 썸네일, API 느릴 때 skeleton), 접근성 체크
  + 3-탭 IA 작업 (design-ia-3tab.md §8.4)
```

### Phase 3 "Done" 정의 (완료 기준)

- [ ] `Map.tsx` 내 하드코딩 색상값 → `--color-*` CSS 변수 참조 (단, `#10b981`은 "출발" semantic 유지 허용)
- [ ] `Map.tsx` 내 모든 shadow → `--shadow-card` / `--shadow-control` / `--shadow-float` 중 하나
- [ ] `Map.tsx` 내 borderRadius → `--radius-*` 변수 (예외: Mapbox inject DOM은 직접 접근 불가)
- [ ] `Map.tsx` 내 fontSize → `--text-*` 변수
- [ ] `#ef4444` (Tailwind red) 전부 제거 → `--color-brand`
- [ ] `#EBF5FF` (Montage blue-bg) 전부 제거 → `--color-brand-subtle`
- [ ] 코스 카드에 경로 썸네일 표시 (빈 상태 skeleton 처리 포함)
- [ ] 코스 카드 bottom에 `♥ XX` 인터랙티브 좋아요 배지
- [ ] 시각 일관성 체크: 동일 elevation 카드는 동일 shadow level
- [ ] BottomTab 3-탭 전환 완료 (design-ia-3tab.md §5 준수)

---

## 5. 사용자 확인이 필요한 오픈 퀘스천

> ✅ Q1–Q5 모두 답변 완료 (Phase 1.5 진입). 아래는 기록 보존용.

**Q1. 경로 썸네일 API 사용량 허용 여부** → ✅ 승인. Mapbox Static 비용 허용.

**Q2. `#0066FF` (파란색) 완전 제거 여부** → ✅ 동의. GPS/locate = `--color-info: #428bff` 유지. 카테고리 텍스트 = `--color-brand` 또는 `--color-text-secondary`로 교체.

**Q3. 코스 목록 피드 뷰 추가 여부** → ✅ **3-탭 IA 채택** (지도/피드/설정). `/feed` 신규 라우트로 분리.

**Q4. Featured chips → 아이콘 포함 카테고리 바 전환 여부** → ✅ 동의. 이모지+텍스트 전환. 상세 매핑: `design-phase2-spec.md §4.2`.

**Q5. CTA 버튼 최종 radius** → ✅ `12px (--radius-md)` 확정.

---

## 6. 연계 문서 (Phase 1.5 이후 작성)

이 문서(Phase 1 Discovery)를 기반으로 작성된 후속 명세:

### 6.1 `design-ia-3tab.md` — 3-탭 IA 재구성 명세
경로: `docs/prd/design-ia-3tab.md`
내용: 2-탭 → 3-탭(지도/피드/설정) 전환 결정 기록, `/feed` 신규 라우트 명세, BottomTab 재설계, 라우팅/인증 게이트, GA4 이벤트, 전체 티켓 인벤토리(T-DS-01~05 + T-IA-01~07)

이 문서에서 대체된 섹션:
- `§2.8 바텀 탭` → `design-ia-3tab.md §5` + `design-phase2-spec.md §2`
- `§4 마이그레이션 테이블 #10` → `design-ia-3tab.md §8.1 T-IA-01`

### 6.2 `design-phase2-spec.md` — Phase 2 컴포넌트 구현 명세
경로: `docs/prd/design-phase2-spec.md`
내용: 5개 컴포넌트 상세 spec (CourseCard / BottomTab / FeedSortToggle / MapTopBar / SelectedCourseCard), TypeScript Props 인터페이스, 상태 처리, 접근성, Phase 3 AC 템플릿, 오픈 퀘스천 2개

Phase 3 개발 시 이 문서와 `design-phase2-spec.md`를 병행 참조.

### 6.3 문서 간 우선순위 관계

```
design-direction-main.md  ← 토큰 SOT (§3), 브랜드 방향 SOT
  └─► design-ia-3tab.md   ← IA / 라우팅 / 티켓 인벤토리 SOT
  └─► design-phase2-spec.md ← 컴포넌트 구현 spec SOT (Phase 3 AC)
```

충돌 발생 시: 날짜가 최신인 문서가 우선.

---

## 스테일 노트 (decisions.md 후보)

> 2026-05-26 · "Clean Road" 방향 확정 · Q1–Q5 모두 답변 완료 · 3-탭 IA 전환 결정 · §2.8·§4 일부 항목 스테일 처리 · Phase 2 명세(design-ia-3tab.md, design-phase2-spec.md) 작성 완료 · Phase 3 진입 전 오픈 퀘스천 2개 남음 (design-phase2-spec.md §8 참조)
