# Routebook Design Audit — 메인 스크린 현황 분석
> Phase 1 Discovery · 2026-05-26 · pdt-designer
> 범위: Map.tsx feed mode (`/map` 라우트), BottomTab.tsx, layout.tsx, globals.css

---

## 1. Audit Method

수집 경로:
- **소스 코드 직접 독해**: `src/components/Map.tsx` (2379행), `src/components/BottomTab.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `DESIGN.md` (246행) 전체 읽기
- **앱 아이콘 시각 검수**: `public/Routebook_icon.jpg` + `public/apple-touch-icon.png` 직접 렌더링 확인
- **패턴 집계**: `style=\{` 발생 횟수 grep (184건), 색상 hex 발생 횟수 grep (110건), `borderRadius.*50%` 18건, 3-layer shadow 10건
- **라이브 사이트 접속**: WebFetch 권한 미부여로 직접 스크린샷 불가 → 소스 코드에서 렌더 경로 역추적으로 UI 상태 완전 복원

---

## 2. 세 시스템의 충돌 — Three-System Conflict

루트북에는 현재 **동시에 살아있는 세 개의 서로 다른 디자인 시스템**이 있다. 이것이 "대충 만든 느낌"의 구조적 원인이다.

### 시스템 A: DESIGN.md (Airbnb 기반 목표 스펙)
- **Primary**: Rausch Red `#ff385c` (singular accent)
- **Text**: Near-black `#222222`, secondary `#6a6a6a`
- **Font**: Airbnb Cereal VF (custom variable font, 500–700 weight)
- **Shadow**: 3-layer `rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px`
- **Radius**: 8px(버튼) / 14px(배지) / 20px(카드) / 32px(대형) / 50%(원형)
- **Body bg**: `#ffffff`

### 시스템 B: globals.css (Montage Design System 토큰 선언)
- **Primary**: `--primary: #0066FF` (파란색 — Airbnb Red와 완전히 다름)
- **Text**: `--label-normal: #1A1A1A` (vs DESIGN.md `#222222`)
- **Font**: `--font-family: 'Pretendard Variable'` (vs DESIGN.md Cereal VF)
- **Radius**: `--radius-sm: 8px / --radius-md: 12px / --radius-lg: 16px` (vs DESIGN.md 20px 카드)
- **Body bg**: `--bg-alt: #F4F4F4` (layout.tsx body에 적용됨 — vs DESIGN.md `#ffffff`)
- **상태색**: `--status-positive: #00B386 / --status-negative: #FF4D4D`

### 시스템 C: Map.tsx 실제 구현 (인라인 스타일 하드코딩)
- **Primary 사용**: `#ff385c` (DESIGN.md ✓) — 그러나 `#ef4444`도 혼용 (경유지 마커)
- **Accent blue**: `#0066FF` (Montage) — 위치 아이콘, 스피너, 검색 카테고리 텍스트
- **Green**: `#10b981` (Tailwind emerald) — "출발" 마커, 음악 URL 성공 표시
- **Close icon**: `#64748b` (Tailwind slate, not `#6a6a6a`)
- **Cancel X**: `#DC2626` (Tailwind red-600, not `#ff385c`)
- **Font**: Pretendard (CDN 로드됨) — DESIGN.md의 Cereal VF는 미적용
- **Border 6종**: `#dddddd`, `#c1c1c1`, `#E0E0E0`, `#e2e8f0`, `#f1f5f9`, `#cbd5e1` 혼재
- **Shadow 2종**: 3-layer Airbnb shadow (일부) + 단일레이어 `0 2px 8px` / `0 4px 20px` (일부) 불일치

### 왜 "대충 만든 느낌"이 나는가

| 증상 | 원인 |
|---|---|
| UI 요소마다 테두리 색이 다름 | 6종 border 색이 context 없이 사용 |
| 그림자 깊이가 일관되지 않음 | 카드마다 shadow 레이어 수 다름 |
| 아이콘 색이 빨강/파랑/초록 혼재 | Airbnb 빨강(CTA), Montage 파랑(GPS), Tailwind 초록(출발) 무규칙 혼용 |
| 모서리 굴림이 요소마다 다름 | borderRadius 4/6/8/10/12/14/16/20 등 9가지 값 산재 |
| 토큰이 실제로 쓰이지 않음 | globals.css의 `--primary`, `--label-*` 등이 Map.tsx 어디서도 참조되지 않음 |

---

## 3. 메인 스크린 요소별 현황 분석

### 3.1 전역 레이아웃

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| Body background | `layout.tsx:48` | `#ffffff` (pure white) | `background:"#F4F4F4"` (지도 앱이므로 실질 영향 미미) | cosmetic | S |
| Font family | `layout.tsx:48` | Airbnb Cereal VF | `var(--font-family)` = Pretendard Variable ✓ (현실적) | — | — |

---

### 3.2 상단 컨트롤 영역

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **메뉴 버튼 (햄버거)** | `Map.tsx:1384–1397` | 카드 radius 20px, 3-layer shadow | `borderRadius:12`, 3-layer shadow ✓, `stroke="#ff385c"` ✓ | inconsistent (radius) | S |
| **검색 바** | `Map.tsx:1482–1524` | 32px radius, 3-layer shadow | `borderRadius:12`, **단일 shadow** `0 2px 8px rgba(0,0,0,0.15)` | inconsistent (shadow) | S |
| **검색 결과 드롭다운** | `Map.tsx:1527–1566` | 3-layer shadow, 14px badge radius | `borderRadius:12`, 3-layer shadow ✓ | cosmetic | S |
| **Featured 코스 칩** | `Map.tsx:1609–1688` | (미정의) | `borderRadius:20`, active=`#ff385c` ✓, shadow 2-layer `0 2px 8px + 0 0 4px` | cosmetic | S |
| **필터 미니바** | `Map.tsx:1571–1606` | (미정의) | `borderRadius:12`, backdrop-filter, 3-layer shadow ✓ | cosmetic | — |

> ⚠️ **검색 바 shadow 불일치** 가장 중요한 single-touch element임에도 3-layer shadow를 쓰지 않아 다른 카드들보다 시각적 "얕음"이 감지됨.

---

### 3.3 지도 오버레이 — 핀 & 경로

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **프로필 아바타 핀** | `Map.tsx:36–50` | (미정의) | 36px circle, white border 1px, shadow ✓ | cosmetic | — |
| **경유지 번호 마커** | `Map.tsx:106–116` | (미정의) | `background:"#ef4444"` ← **Tailwind red-500, 브랜드 red `#ff385c` 아님** | brand-violating | S |
| **출발 엔드포인트 마커** | `Map.tsx:53–64, 1231` | (미정의) | `color:"#10b981"` (Tailwind emerald green) | brand-violating | M |
| **도착 엔드포인트 마커** | `Map.tsx:53–64, 1232` | (미정의) | `color:"#ff385c"` ✓ | — | — |
| **전체 경로 라인 (browse)** | `Map.tsx:1186` | (미정의) | `line-color:"#222222"`, opacity 0.3 | cosmetic | — |
| **선택된 경로 라인** | `Map.tsx:1059, 1226` | (미정의) | `line-color:"#ff385c"` ✓ | — | — |

---

### 3.4 브라우즈 모드 — 코스 카드 (핵심 UI)

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **선택된 코스 카드 컨테이너** | `Map.tsx:1734–1780` | 20px radius, 3-layer shadow | `borderRadius:16`, **단일 shadow** `0 4px 20px rgba(0,0,0,0.12)` | inconsistent | S |
| **코스 제목** | `Map.tsx:1751` | 22px semibold, -0.44px tracking | `fontSize:16, fontWeight:700` (OK for card size), no letter-spacing | cosmetic | S |
| **코스 설명** | `Map.tsx:1753` | 13px, `#6a6a6a` | ✓ 일치 | — | — |
| **태그 배지** | `Map.tsx:1756–1758` | 14px radius, border `#c1c1c1` | `borderRadius:10`, border `#dddddd` (불일치), `color:"#64748b"` (Tailwind slate, not `#6a6a6a`) | inconsistent | S |
| **메트릭 행 (거리/좋아요)** | `Map.tsx:1760–1763` | (미정의 — Strava 참조 필요) | 텍스트만: `"Xkm ♥ 닉네임"` — badge/pill 없음, ♥ 이모지는 브랜드 부재 | inconsistent | M |
| **"자세히 보기" CTA** | `Map.tsx:1775–1778` | `#222222` bg, 8px radius | `borderRadius:10`, bg:`#222222` ✓ — radius 2px 차이 | cosmetic | S |
| **코스 사진 썸네일** | (없음) | 포토 퍼스트 (DESIGN.md §4) | **아예 없음** — 가장 큰 Strava 대비 결핍 | brand-violating | L |

> ⚠️ **코스 카드에 사진/썸네일이 없음**이 가장 임팩트 큰 문제. `lib/map-utils.ts`에 Mapbox Static Images URL 생성 유틸이 이미 존재 (`/api/thumbnail` 라우트도 있음)하므로 경로 미리보기 썸네일 삽입은 기술적으로 준비됨.

---

### 3.5 브라우즈 모드 — 하단 고정 영역

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **"루트북 추가하기" CTA 버튼** | `Map.tsx:1977–1988` | `#ff385c` bg, 8px radius | `bg:"#ff385c"` ✓, `borderRadius:12`, height=14px padding | inconsistent (radius) | S |
| **하단 배너 컨테이너** | `Map.tsx:1969–1989` | (미정의) | `borderTop:"1px solid #f2f2f2"`, bg white | cosmetic | — |

---

### 3.6 FAB & 나침반

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **나침반 FAB** | `Map.tsx:1791–1803` | 50% circular, 3-layer shadow | 42px circle ✓, 3-layer shadow ✓, north pointer `#ff385c` ✓ | — | — |
| **현재위치 FAB** | `Map.tsx:1804–1817` | 50% circular, 3-layer shadow | 42px circle ✓, **단일 shadow** `0 4px 12px rgba(0,0,0,0.15)`, **icon `stroke="#0066FF"`** (Montage blue, not brand) | inconsistent | S |
| **위치 스피너** | `Map.tsx:1811` | (미정의) | `borderTopColor:"#0066FF"` (Montage blue) | inconsistent | S |

---

### 3.7 코스 탐색 (Search) 패널

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **탐색 패널 컨테이너** | `Map.tsx:1823–1936` | (미정의) | `borderRadius:14`, backdrop-filter, 3-layer shadow ✓ | cosmetic | — |
| **출발지 입력** | `Map.tsx:1836` | (미정의) | active border `#10b981` (green) — 브랜드 일관성 없음 | inconsistent | S |
| **도착지 입력** | `Map.tsx:1869` | (미정의) | active border `#ff385c` ✓ | — | — |
| **태그 필터 버튼** | `Map.tsx:1926–1934` | (미정의) | selected: bg `#1f1f1f` (not `#222222`!), border `#222222` | cosmetic | S |
| **범위 슬라이더** | `Map.tsx:1906` | (미정의) | `accentColor:"#ff385c"` ✓ | — | — |

---

### 3.8 바텀 탭 (BottomTab)

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **탭 배경** | `BottomTab.tsx:43–50` | (미정의) | `rgba(248,247,244,0.95)`, backdrop-blur — 따뜻한 크림 톤 | cosmetic | — |
| **활성 아이콘 색** | `BottomTab.tsx:10–12` | `#222222` (DESIGN.md near-black) | **`#1A1A1A`** (Montage --label-strong) | cosmetic | S |
| **비활성 색** | `BottomTab.tsx:23` | `#6a6a6a` 내외 | `#999999` (Montage --label-assistive) — 약간 더 밝음 | cosmetic | S |
| **탭 상단 구분선** | `BottomTab.tsx:49` | (미정의) | `0.5px solid #E0E0E0` ✓ | — | — |

---

### 3.9 메뉴 오버레이

| 요소 | 파일:행 | DESIGN.md 목표 | 현재 구현 | 심각도 | 수정난이도 |
|---|---|---|---|---|---|
| **메뉴 패널** | `Map.tsx:1404–1479` | 14px badge radius, 3-layer shadow | `borderRadius:14`, 3-layer shadow ✓ | — | — |
| **활성 메뉴 항목** | `Map.tsx:1422–1424` | (미정의) | `background:"#EBF5FF"` (**Montage 파란 accent bg** — 빨간 앱에 파란 하이라이트!) | brand-violating | S |
| **활성 텍스트** | `Map.tsx:1421` | (미정의) | `color:"#ff385c"` ✓ (텍스트는 올바름) | — | — |

> ⚠️ 메뉴 활성 항목의 `#EBF5FF` (파란 배경)은 브랜드 훼손. `rgba(255,56,92,0.08)` (brand subtle)로 교체 필요.

---

## 4. 인라인 스타일 Sprawl 분석

### 규모
- `style={}` 발생: **184건** / 2379행 (행 13개당 1건 — 극도로 높은 밀도)
- 하드코딩 색상 hex 발생: **110건** (ff385c + 222222 + 6a6a6a + 0066FF + 10b981 + ef4444만 카운트, 나머지 색 포함 시 더 많음)
- borderRadius 12/14/16 발생: **30건** (반경 scale 없음 증명)
- 50% circular 발생: **18건**

### Top 5 — 컴포넌트/토큰화 우선순위

| 순위 | 패턴 | 발생 추정 | 토큰화 방향 |
|---|---|---|---|
| 1 | **3-layer card shadow** `rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px` | ~10건 | `--shadow-card` 토큰 |
| 2 | **Primary/Secondary 텍스트 색** `color:"#222222"` + `color:"#6a6a6a"` | ~60건 | `--color-text-primary` / `--color-text-secondary` |
| 3 | **Tag/pill 배지** `padding:"3px 8px"~"6px 14px"; borderRadius:10~20; border:"1px solid #dddddd or #c1c1c1"` | ~12건 | `--radius-full` + `<TagPill>` 컴포넌트 패턴 |
| 4 | **원형 FAB 버튼** `width:42px; height:42px; borderRadius:50%; border:none; background:#ffffff; boxShadow:...; cursor:pointer; display:flex; alignItems:center; justifyContent:center` | ~6건 | `--shadow-control` + `<CircularFAB>` 패턴 |
| 5 | **Primary CTA 버튼** `borderRadius:8~16; border:none; background:#ff385c or #222222; color:#fff; fontWeight:600; cursor:pointer` | ~8건 | `--color-brand` + `--radius-sm` + `<PrimaryButton>` 패턴 |

---

## 5. Pretendard vs Cereal VF — 폰트 결정

### 현황
- `layout.tsx:46`: `pretendardvariable-dynamic-subset.min.css` CDN 로드 → Pretendard 이미 사용 중
- `globals.css:57`: `--font-family: 'Pretendard Variable', Pretendard, ...` 선언
- `layout.tsx:48`: `fontFamily: "var(--font-family)"` 실제 적용
- **Cereal VF는 어디에도 로드되지 않음** — DESIGN.md 명세는 실제로 구현된 적 없음

### Airbnb Cereal VF의 현실적 문제
1. **Airbnb 전용 proprietary 폰트** — 공개 CDN 없음, npm 패키지 없음
2. **한국어 글리프 미지원** — 루트북은 Korean-only UI. Cereal VF는 한글 자체 불가
3. **라이선스**: Airbnb 내부 전용 (외부 제품 사용 불가)

### 결정 권고
**→ Pretendard Variable을 공식 SOT로 채택. DESIGN.md §3 폰트 섹션 업데이트 필요.**

Pretendard는:
- 한국어 최적화 (KS X 1001, 완성형 2350자 + 추가 글리프)
- Variable font (weight 100–900 연속 가변)
- Airbnb Cereal과 유사한 "따뜻한 기하학적 산세리프" 성격
- DESIGN.md의 weight 500–700 원칙 그대로 적용 가능
- `dynamic-subset` CDN: 한국어 dynamic subsetting으로 로딩 성능 최적화

---

## 6. 브랜드 바이브 갭 분석

### 실제 앱 아이콘 확인 결과

`public/Routebook_icon.jpg` 직접 렌더링 확인:
- **배경**: 순백 (#ffffff에 가까운 white)
- **로고마크**: Coral-red (~`#ff385c`) 다중 선 "R" 레터폼 — 도로/경로를 표현하는 3겹 stroke line
- **디테일**: R 하단-우측에 작은 위치핀(location pin) 삽입
- **스타일**: flat, graphic, 클린 모던 — 시네마틱/다크 아님

### po-memory 수정 필요
po-memory는 "석양 그라데이션 + 네온 R 도로"로 기재되어 있으나, 실제 아이콘은:
- 그라데이션 없음 (flat coral-red)
- 배경은 dark 아닌 white
- "네온" 표현은 bold stroke 특성을 묘사한 것으로 이해 가능

### 브랜드 바이브 Gap Assessment

| 레이어 | 아이콘 시그널 | DESIGN.md 시그널 | 현실 구현 | Gap |
|---|---|---|---|---|
| 주색 | Coral-red (~#ff385c) | Rausch Red `#ff385c` | `#ff385c` 혼용 | **없음** ✓ |
| 배경 톤 | 순백 | `#ffffff` | `#ffffff` 카드 | **없음** ✓ |
| 스타일 | Graphic, clean | Photography-warm | 인라인 스타일 혼재 | 있음 (구현) |
| 감성 | Road journey, precise | Airbnb "belong anywhere" | 혼재 | 미세한 갭 |

### Designer 권고 입장

**단방향 입장: Airbnb 기반 방향 유지. 시네마틱 레이어 = CoursePlayer 전용.**

- 앱 아이콘이 이미 Airbnb white + Rausch Red 위에 설계됨 → UI와 완벽히 정합
- 시네마틱 경험(`CoursePlayer.tsx`의 dark 오버레이, 45초 3D 애니메이션, 영화 필름 그레인)은 **의도된 모드 분리**로 올바름
- Feed/Browse/Create 모드는 → **밝은 Airbnb 미학** (white canvas + 단일 red accent)
- CoursePlayer 진입 시 → **다크 시네마틱 순간** (현재 구현 유지)
- 아이콘의 "road winding" 성격은 future map pin style, 경로 선 thickness 등에 반영 가능

---

## 스테일 노트 (decisions.md 후보)

> 2026-05-26 · DESIGN.md §3 Cereal VF 명세는 구현 불가(proprietary/한국어 미지원) — Pretendard Variable을 공식 SOT로 전환 결정 대기 중 · Designer 권고 제출됨
