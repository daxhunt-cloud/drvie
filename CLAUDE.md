# CLAUDE.md — Routebook 프로젝트 가이드

## 프로젝트 개요
**루트북(Routebook)** — 드라이브 코스를 만들고 공유하는 웹앱.
사용자가 지도에 경유지를 찍어 코스를 만들고, 45초 3D 애니메이션으로 미리보기하고, 음악과 함께 공유한다.

- 운영 도메인: `https://routebook-app.vercel.app`
- 결제 없음(무료), 한국어 UI 전용

## 기술 스택
- **프레임워크**: Next.js 14 (App Router), React 18, TypeScript 5
- **스타일**: Tailwind CSS 3.4 + 인라인 스타일(CSS-in-JS), Pretendard 가변 폰트(CDN)
- **지도**: Mapbox GL JS 3.4 + @turf/turf 7
- **DnD**: @dnd-kit/core, @dnd-kit/sortable (경유지 순서 변경)
- **이미지**: sharp (서버사이드 썸네일 합성)
- **DB/Auth/Storage**: Supabase (PostgreSQL + Auth + Storage)
- **Rate Limit**: Upstash Redis + @upstash/ratelimit (sliding window)
- **분석**: Google Analytics 4 (`G-V9C13LRQ72`, gtag.js, layout.tsx에 직접 삽입)
- **배포**: Vercel (`npx vercel --prod`)

## 프로젝트 구조 (실제)
```
src/
├── app/
│   ├── (main)/                     # 바텀탭(지도/설정) 레이아웃
│   │   ├── map/page.tsx            # 메인 지도 — Map.tsx 한 컴포넌트가 피드/탐색/만들기 모드를 모두 처리
│   │   ├── settings/page.tsx       # 내 프로필 편집 + 계정 삭제
│   │   ├── profile/[userId]/       # 타인 프로필 (page.tsx + UserProfileClient.tsx)
│   │   ├── course/[id]/page.tsx    # 코스 상세 (서버 컴포넌트, 메타데이터 + JSON-LD)
│   │   ├── course/[id]/CoursePageClient.tsx
│   │   ├── course/[id]/preview/    # 저장 직후 draft 미리보기
│   │   ├── privacy/page.tsx
│   │   └── terms/page.tsx
│   ├── api/                        # Route Handlers (서버)
│   │   ├── search/route.ts         # Kakao 장소+주소 검색
│   │   ├── reverse-geocode/route.ts# Kakao 좌표→행정동
│   │   ├── thumbnail/route.ts      # Mapbox 정적지도 + 앱 아이콘 합성
│   │   ├── check-image/route.ts    # Google Vision SafeSearch
│   │   └── delete-account/route.ts # 계정 + 사진 + DB 일괄 삭제
│   ├── auth/callback/route.ts      # Supabase OAuth 콜백 → /map 리다이렉트
│   ├── login/page.tsx              # Google 로그인 진입
│   ├── create/page.tsx             # (legacy 라우트, 실제 동선은 /map 안의 create 모드)
│   ├── layout.tsx                  # 루트 레이아웃 + GA + Kakao SDK + Service Worker 등록
│   ├── page.tsx                    # 랜딩
│   ├── sitemap.ts                  # 동적 사이트맵 (공개 코스/프로필 포함)
│   ├── error.tsx, not-found.tsx
│   └── globals.css
├── components/
│   ├── Map.tsx                     # 가장 큰 파일 — 피드/탐색/만들기/편집 모드 전환을 한 컴포넌트가 담당
│   ├── CoursePlayer.tsx            # 45초 3D 애니메이션 + 음악
│   ├── CourseDetail.tsx, CourseDetailPage.tsx
│   ├── CourseActions.tsx           # 좋아요/공유/관리(featured)
│   ├── CourseComments.tsx          # 코스 댓글
│   ├── AuthProvider.tsx            # 세션/프로필 컨텍스트 (useAuth)
│   ├── BottomTab.tsx               # 지도/설정 2-탭
│   ├── Providers.tsx               # AuthProvider → ToastProvider
│   ├── LikeButton.tsx, ShareButton.tsx, StatIcons.tsx
│   ├── LoginModal.tsx, GuestBanner.tsx, Onboarding.tsx
│   ├── BackButton.tsx, FilmOverlay.tsx, Toast.tsx
├── hooks/
│   ├── useLike.ts                  # 좋아요 (낙관적 + RPC 재계산)
│   ├── useBookmark.ts              # 사람 찜
│   └── useToast.tsx
├── lib/
│   ├── supabase/client.ts          # 브라우저용
│   ├── supabase/server.ts          # 서버용 (RSC, route handler)
│   ├── rate-limit.ts               # Upstash Redis 기반 sliding window
│   ├── map-utils.ts                # Mapbox Static URL, polyline 인코딩 등
│   ├── geo-utils.ts, drive-regions.ts
│   ├── image-utils.ts, image-check.ts # Vision API 호출 래퍼
│   └── text-filter.ts
└── middleware.ts                   # Supabase 세션 갱신 + /settings 보호 + /login 리다이렉트
```

> ⚠️ 바텀탭은 **지도(/map) / 설정(/settings) 2-탭**이다. 홈/탐색/저장/프로필 4-탭 구조가 아니다.
> 피드·탐색·코스 만들기는 모두 [src/components/Map.tsx](src/components/Map.tsx) 한 컴포넌트의 `mode` 상태로 전환된다.

## 주요 패턴

### Supabase 클라이언트
- **클라이언트 컴포넌트**: `import { createClient } from "@/lib/supabase/client"`
- **서버 컴포넌트 / Route Handler**: `import { createClient } from "@/lib/supabase/server"`
- **미들웨어 / 인증 콜백**: `@supabase/ssr`의 `createServerClient` 직접 사용

### 인증
- Google OAuth 단일 (Supabase Auth `signInWithOAuth({ provider: "google" })`)
- 세션 컨텍스트: `useAuth()` → `{ user, profile, loading, refreshProfile }`
- `Providers.tsx`: `AuthProvider` → `ToastProvider` 순서
- 미들웨어 보호 경로: `/create`, `/settings`. 인증 중인 사용자가 `/login` 접근 시 `/map`으로 리다이렉트.

### 코스 저장 흐름
1. `/map` 진입 후 "코스 만들기" 모드 → 경유지 추가, 사진/메모/태그/지역태그/음악(YouTube videoId+startSec) 입력
2. 저장 시 `course-photos/{userId}/{courseId}/`에 사진 업로드 → `courses.insert({ visibility: "draft", ... })` → `/course/{id}/preview`로 이동
3. 미리보기 확인 후 "피드에 올리기" 클릭 시 `visibility: "public"`로 업데이트
4. 미리보기에서 나가면 draft 코스 + Storage 사진 정리

### 사진 업로드
- 클라이언트에서 압축 → `POST /api/check-image`로 SafeSearch → 통과 시 `course-photos` 버킷 업로드
- Vision 키 미설정이면 fail-open (검사 통과로 간주)

### 좋아요 (race-free 카운터)
- `likes` insert/delete + 클라이언트 카운트 ±1 (낙관적)
- 직후 `rpc("recount_course_likes")` 호출로 실제 행 개수 기반 재계산 → 정확한 `courses.like_count` 보장

### 코스 인당 10개 제한
- 클라이언트 체크 + DB 트리거 `enforce_course_limit` 이중 방어 (`profiles.role = 'admin'`은 예외)

### 피드 쿼리 (필수 패턴)
```ts
.from("courses")
.select("..., profiles(id, nickname, avatar_url)")
.eq("visibility", "public")
.order("like_count", { ascending: false })
```

### CoursePlayer (3D 애니메이션)
- 영상 길이 고정 45초 (`FIXED_DURATION_SEC`)
- 줌은 속도(km/s) 기반 자동 조절, bearing은 `smoothBearingRef`로 0.03 계수 보간
- 음악: 시작 시 fade-in, 종료 2초 전부터 ratio 기반 fade-out (`endSec = 사용자입력 + 2초`)
- `야경` 태그 → dark-v11 스타일 + 노을 오버레이

### 반응형 레이아웃 (Map.tsx)
- 모바일(<768px): 바텀시트(스와이프 다운으로 닫기)
- 데스크탑(≥768px): 사이드 패널 360px
- `isMobile` state + resize 이벤트, 화면 전환 시 `map.resize()` 필수

### Rate Limiting (Upstash Redis)
- `lib/rate-limit.ts`는 `@upstash/ratelimit`의 sliding window 사용 → 모든 Vercel Serverless 인스턴스가 공유 카운터를 본다
- 호출은 **async**: `const { success } = await rateLimit(ip, { limit, windowMs })`
- Upstash 장애 시 fail-open (요청 통과)

## 데이터 모델

### 테이블
| 테이블 | 핵심 컬럼 | 비고 |
|---|---|---|
| `profiles` | `id (PK = auth.uid)`, `nickname`, `avatar_url`, `bio`, `instagram`, `default_car`, `bookmark_count`, `role('admin'\|null)` | |
| `courses` | `id`, `user_id (FK profiles.id)`, `title`, `description`, `waypoints (jsonb)`, `route_geojson (jsonb)`, `tags text[]`, `region_tags text[]`, `distance_km`, `duration_min`, `music (jsonb {videoId,startSec,endSec})`, `photos text[]`, `visibility('draft'\|'public')`, `like_count`, `share_count`, `created_at`, `updated_at` | 인당 10개 제한(트리거) |
| `likes` | `user_id`, `course_id` | 좋아요 |
| `bookmarks` | `user_id`, `target_user_id` | **사람 찜** (코스 찜 아님) |
| `comments` | `id`, `course_id`, `user_id`, `text`, `created_at` | 코스 댓글 |
| `featured_courses` | `course_id (unique)`, `label`, `sort_order` | 운영자 큐레이션 |

### 관계
- `profiles 1 ─ N courses` (작성자, FK `courses.user_id`)
- `profiles M ─ N courses` via `likes`
- `profiles M ─ N profiles` via `bookmarks` (사람 → 사람)
- `courses 1 ─ N comments`
- `courses 1 ─ 0..1 featured_courses`
- 계정 삭제 FK 순서: `likes → bookmarks → courses → profiles` ([api/delete-account/route.ts](src/app/api/delete-account/route.ts))

### Storage 버킷
- `course-photos/{userId}/{courseId}/*` — 코스 사진
- `avatars/{userId}/*` — 프로필 사진

### RPC (atomic)
- `recount_course_likes(p_course_id uuid) → int` — `likes` 행수로 `like_count` 재계산
- `increment_share_count(p_course_id uuid) → int` — `share_count` atomic +1

### 트리거
- `enforce_course_limit` (BEFORE INSERT on `courses`): 10개 초과 시 `COURSE_LIMIT_EXCEEDED` 예외 (admin 예외)

SQL 정의: [scripts/atomic-counters.sql](scripts/atomic-counters.sql), [scripts/course-limit-trigger.sql](scripts/course-limit-trigger.sql)

## API 라우트
| 메서드/경로 | 역할 | 외부 의존 | Rate Limit |
|---|---|---|---|
| `GET /api/search` | 장소+주소 검색 | Kakao Local Keyword/Address | 30/min |
| `GET /api/reverse-geocode` | 좌표→행정동 | Kakao coord2regioncode | 30/min |
| `GET /api/thumbnail` | Mapbox 정적지도+아이콘 합성(sharp) | Mapbox Static Images | 없음 |
| `POST /api/check-image` | 이미지 SafeSearch | Google Cloud Vision | 10/min |
| `POST /api/delete-account` | 계정 + Storage + DB 일괄 삭제 | Supabase | 3/min |
| `GET /auth/callback` | OAuth 코드→세션 교환 후 `/map` | Supabase | 없음 |
| `GET /sitemap.xml` | SEO 사이트맵 | Supabase (`courses`, `profiles`) | 없음 |

## 외부 서비스
| 서비스 | 용도 |
|---|---|
| Supabase | DB + Auth(Google OAuth) + Storage |
| Mapbox | 인터랙티브 지도 + Static Images |
| Kakao Local API | 장소/주소 검색, 좌표→행정동 |
| Google Cloud Vision | 업로드 이미지 SafeSearch (선택) |
| YouTube IFrame | 코스 BGM 재생 |
| Kakao Map (딥링크) | 코스 → 카카오맵 길안내 인계 (`kakaomap://route?...`) |
| Upstash Redis | API rate limit 공유 카운터 |
| Google Analytics 4 | 측정 ID `G-V9C13LRQ72` (gtag.js, layout.tsx) |
| Vercel | 호스팅 + Serverless |

> 결제 게이트웨이, Sentry, 메일/푸시 — 현재 미연동.

## 빌드/배포
```bash
npm run dev            # 개발
npm run build          # 로컬 빌드 확인
npx tsc --noEmit       # 타입 체크만
npx vercel --prod      # Vercel 프로덕션 배포
```

## 환경 변수
| Key | 용도 | 위치 |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox API | 클라이언트 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 클라이언트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개키 | 클라이언트 |
| `KAKAO_REST_API_KEY` | Kakao Local | 서버 전용 |
| `GOOGLE_CLOUD_VISION_KEY` | Vision API (선택, 없으면 검사 스킵) | 서버 전용 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | 서버 전용 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | 서버 전용 |

## 코딩 규칙
- 한국어 UI 텍스트
- 인라인 스타일 사용 (CSS-in-JS), Tailwind은 보조
- 서버 컴포넌트는 최소화 (`/course/[id]`처럼 메타데이터·SEO가 필요한 곳만), 대부분 클라이언트 컴포넌트
- 타입 에러 없이 빌드 통과 후 배포 (`npx tsc --noEmit`)
- `any` 타입은 Supabase 쿼리 결과에 한정해서 허용
- 신규 컴포넌트보다 기존 파일 수정을 우선 (특히 Map.tsx의 모드 분기)
