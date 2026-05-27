# Routebook — 개선 감사 보고서 (Improvement Audit)
> 다양한 관점에서 현재 제품의 개선 기회를 분석합니다.

**버전**: 2026-05-22 · **작성**: pdt-designer · **기반 문서**: `routebook-as-built.md` + 소스코드 분석

---

## 목차

A. 서버 아키텍처  
B. 데이터 & 스키마  
C. UI/UX  
D. 성능  
E. 신뢰 & 안전성  
F. 성장 & 참여  
G. 국제화 준비도  
H. 수익화 옵션  
I. 사용 시나리오  
[우선순위 Top-10 표](#-우선순위-top-10)

---

## A. 서버 아키텍처

---

### A-1. Map.tsx 메가 컴포넌트

**Finding** — 2379줄 단일 파일이 피드·탐색·만들기·편집·검색·인증 6개 모드를 모두 처리한다.

**Why it matters**  
번들 크기 증가, 기능별 코드 분리 불가, 테스트 불가, 신규 개발자 온보딩 병목. 하나의 버그가 전체 모드에 영향을 줄 수 있다.

**Evidence**  
`src/components/Map.tsx` — 단일 파일, `mode: "browse" | "create"` + 20개 이상의 독립적 state 블록.

**Proposed change**  
`BrowseMap` / `CreateMap` / `SearchPanel` / `CourseCard` / `WaypointEditor` 등 5~7개 서브컴포넌트로 분리. `Map.tsx`는 라우터 역할만 담당.

**Effort/Impact** — L / High

**Priority** — P1

---

### A-2. `/api/thumbnail` 레이트 리밋 없음

**Finding** — Mapbox Static API 합성 엔드포인트에 레이트 리밋이 없다.

**Why it matters**  
악의적 사용자가 반복 요청 시 Mapbox API 사용량 폭증 → 예측 불가능한 청구. `sharp`가 매 요청마다 CPU 연산도 수행한다.

**Evidence**  
`src/app/api/thumbnail/route.ts:14` — `rateLimit` 호출 없음. 다른 라우트(검색 30/min, Vision 10/min)와 대조적.

**Proposed change**  
IP당 30/min 레이트 리밋 추가 + `Cache-Control: public, max-age=86400` 헤더 확인 (현재 적용돼 있으나 프록시 레이어 검증 필요).

**Effort/Impact** — S / High

**Priority** — P1

---

### A-3. 미들웨어 범위 과도

**Finding** — `middleware.ts`의 matcher가 `api/` 제외 전체 경로를 대상으로 한다. 정적 콘텐츠 요청마다 Supabase auth 세션 갱신 호출이 발생한다.

**Why it matters**  
불필요한 Supabase 왕복 → 레이턴시 증가. 특히 `/privacy`, `/terms` 같은 순수 정적 페이지도 포함.

**Evidence**  
`src/middleware.ts:52` — `matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|_next/data).*)']`

**Proposed change**  
matcher를 보호 경로(`/create`, `/settings`)와 인증 경로(`/login`)에만 적용. 또는 `supabase.auth.getUser()` 결과를 요청 헤더로 전달해 하위 컴포넌트가 재사용.

**Effort/Impact** — S / Med

**Priority** — P2

---

### A-4. 에러 모니터링 부재

**Finding** — 전체 앱에 Sentry 또는 동등 APM이 없다. `console.error`만 존재.

**Why it matters**  
프로덕션 에러를 실시간 감지할 수 없음. 사용자가 에러를 신고하지 않으면 모름. 과거 충돌 재현 불가.

**Evidence**  
`CLAUDE.md` — "Sentry — 현재 미연동." / `src/app/api/*/route.ts` — `catch { return NextResponse.json({ safe: true })` 형태의 묵음 처리.

**Proposed change**  
Sentry Next.js SDK 연동 (무료 플랜으로 시작 가능). `withSentryConfig` 적용 + API 라우트 `captureException`.

**Effort/Impact** — S / High

**Priority** — P1

---

### A-5. 피드 쿼리 페이지네이션 없음

**Finding** — 피드는 `limit(100)` 고정이고 무한 스크롤이나 커서 기반 페이지네이션이 없다.

**Why it matters**  
코스 100개 초과 시 신규 코스가 사용자에게 노출되지 않는다. 쿼리 응답 크기도 고정 100건이어서 초기 로드 시간 증가.

**Evidence**  
`src/components/Map.tsx:318-322` — `.eq("visibility", "public").order("like_count", { ascending: false }).limit(100)`

**Proposed change**  
커서 기반 페이지네이션 도입 (`range()` 또는 `created_at` cursor). 지도 뷰포트 기반 dynamic load (지도 이동 시 현재 bounds 내 코스만 쿼리) 고려.

**Effort/Impact** — M / High

**Priority** — P1

---

### A-6. Legacy 라우트 잔존

**Finding** — `src/app/create/page.tsx`가 레거시 라우트로 존재하지만 실제 동선은 `/map` 내 create 모드이다.

**Why it matters**  
혼란, SEO 중복 인덱싱 리스크, 유지보수 부담.

**Evidence**  
`CLAUDE.md` — "(legacy 라우트, 실제 동선은 /map 안의 create 모드)"

**Proposed change**  
`/create`에서 `/map?mode=create`로 301 리다이렉트 처리 후 파일 제거.

**Effort/Impact** — S / Low

**Priority** — P3

---

## B. 데이터 & 스키마

---

### B-1. 계정 삭제 시 `comments` 미삭제 (버그)

**Finding** — `delete-account` API가 `comments` 테이블 삭제를 누락했다.

**Why it matters**  
계정 삭제 후에도 해당 사용자가 남긴 댓글이 DB에 남아 있다. FK가 `profiles.id`를 참조한다면 참조 무결성 위반이거나 고아(orphan) 레코드 누적.

**Evidence**  
`src/app/api/delete-account/route.ts:56-61` — `likes → bookmarks → courses → profiles` 순 삭제, `comments` 없음.

**Proposed change**  
`await supabase.from("comments").delete().eq("user_id", userId)` 를 `likes` 삭제 직후에 추가. 또는 DB FK에 `ON DELETE CASCADE` 설정.

**Effort/Impact** — S / High

**Priority** — **P0 (버그)**

---

### B-2. `anon` 롤에 RPC EXECUTE 권한 부여

**Finding** — `recount_course_likes`와 `increment_share_count` 모두 `anon` 롤에 실행 권한이 부여돼 있다.

**Why it matters**  
비인증 사용자(봇 포함)가 좋아요 카운트를 재계산하거나 공유 카운트를 무제한 증가시킬 수 있다. 공유 카운트 인플레이션으로 순위 조작 가능.

**Evidence**  
`scripts/atomic-counters.sql:36` — `grant execute on function recount_course_likes(uuid) to anon, authenticated;`

**Proposed change**  
`anon` 롤 권한 제거 → `authenticated`만 허용. `increment_share_count`는 서버 API 라우트를 통해서만 호출되도록 제한 (현재도 그렇게 되어 있지만 DB 레벨 보호 추가).

**Effort/Impact** — S / High

**Priority** — P1

---

### B-3. `profiles.bookmark_count` 갱신 메커니즘 불명확

**Finding** — `profiles.bookmark_count` 컬럼이 존재하지만 자동 갱신 트리거나 RPC가 소스코드 내에 보이지 않는다.

**Why it matters**  
컬럼 값이 stale해질 수 있다. `like_count`와 달리 재계산 로직이 없으면 의미 없는 컬럼이 됨.

**Evidence**  
`CLAUDE.md` 테이블 정의 — `profiles.bookmark_count` 컬럼 명시. `src/hooks/useBookmark.ts` 코드 미검토 (별도 확인 필요).

**Proposed change**  
`useBookmark.ts` 확인 후, `recount_course_likes`처럼 `recount_profile_bookmarks` RPC 추가 또는 트리거로 자동 갱신.

**Effort/Impact** — S / Med

**Priority** — P2

---

### B-4. `courses.region` vs `region_tags` 중복 컬럼

**Finding** — `courses` 테이블에 `region` (string, join("-")) 과 `region_tags` (text[]) 두 컬럼이 중복으로 존재한다.

**Why it matters**  
`region_tags`로 모든 기능이 동작하므로 `region`은 사실상 미사용 파생 컬럼. 스토리지 낭비 + 혼선.

**Evidence**  
`src/components/Map.tsx:744-745` — `const region = generatedRegionTags.join("-"); courseData = { region, region_tags: generatedRegionTags, ... }`

**Proposed change**  
`region` 컬럼 deprecated 처리 후 마이그레이션으로 제거. 쿼리는 `region_tags`만 사용.

**Effort/Impact** — S / Low

**Priority** — P3

---

### B-5. 소프트 삭제 없음

**Finding** — 코스/계정 삭제가 하드 DELETE다. 삭제된 코스의 URL(`/course/{id}`)은 404가 된다.

**Why it matters**  
- SEO: 이미 인덱싱된 코스 URL이 404로 전환 → 검색 순위 하락  
- 운영: 어뷰징 코스 신고·조사 후 삭제 시 증거 사라짐  
- UX: 공유된 링크가 즉시 깨짐

**Evidence**  
`src/app/(main)/course/[id]/page.tsx:25` — `if (!course || course.visibility !== "public") { return { title: "루트북 - Routebook" } }` — 삭제 후 메타데이터 폴백.

**Proposed change**  
`courses.visibility` 에 `"deleted"` 상태 추가 (소프트 삭제). 물리 삭제는 30일 후 배치 실행.

**Effort/Impact** — M / Med

**Priority** — P2

---

## C. UI/UX

---

### C-1. 10개 제한 UX — 사전 안내 없음

**Finding** — 코스 10개 제한이 저장 버튼을 눌렀을 때(4단계 마지막) Toast로만 안내된다.

**Why it matters**  
사용자가 Step 1~4를 모두 완성한 뒤에야 "최대 10개" 오류를 만난다. 투자한 시간 대비 실망감이 크다. 이탈 유발.

**Evidence**  
`src/components/Map.tsx:686-694` — 저장 직전 `count >= 10` 체크.

**Proposed change**  
create 모드 진입 시점(또는 Step 1 시작 전)에 현재 코스 수 + 잔여 슬롯을 표시. 9개일 때 "마지막 코스입니다" 배너 노출. 10개일 때 진입 자체를 막고 "코스 관리" 유도.

**Effort/Impact** — S / High

**Priority** — P1

---

### C-2. 애니메이션 시간 정보 불일치 (CLAUDE.md 오류)

**Finding** — `CLAUDE.md`는 "30초 3D 애니메이션"으로 표기하지만 코드는 `FIXED_DURATION_SEC = 45`다. Map.tsx도 `musicEndSec = musicStartSec + 45`로 45초를 사용한다.

**Why it matters**  
내부 문서 불일치 → 개발자 혼선, 마케팅 문구 오류 가능성.

**Evidence**  
`src/components/CoursePlayer.tsx:10` — `const FIXED_DURATION_SEC = 45;`  
`src/components/Map.tsx:565` — `const musicEndSec = musicStartSec + 45;`

**Proposed change**  
`CLAUDE.md` "30초" → "45초"로 수정 (개발자 업무). 아울러 음악 입력 UI Step 4에서도 "45초 자동 구간"으로 레이블 수정.

**Effort/Impact** — S / Med

**Priority** — **P0 (문서 버그)**

---

### C-3. 코스 북마크 없음 — 사람 찜만 존재

**Finding** — `bookmarks` 테이블은 사람→사람 관계다. 코스를 나중에 보기 위해 저장하는 "코스 찜" 기능이 없다.

**Why it matters**  
드라이브 계획 시 여러 코스를 비교하는 JTBD 미충족. 현재는 좋아요로 대체하거나 URL 저장 필요.

**Evidence**  
`CLAUDE.md` 테이블 — `bookmarks(user_id, target_user_id)` — 코스 찜 아님 명시.

**Proposed change**  
`saved_courses(user_id, course_id, created_at)` 테이블 추가 + 코스 상세에 "저장" 버튼 추가. `/settings` 또는 프로필에 "저장한 코스" 탭 추가.

**Effort/Impact** — M / Med

**Priority** — P2

---

### C-4. 접근성 — 스크린리더·키보드 내비게이션 없음

**Finding** — 지도 인터랙션, 바텀시트, 모달 등에 ARIA 레이블, focus trap, skip-to-content 등이 없다.

**Why it matters**  
WCAG 2.1 AA 미충족. 시각장애인 사용 불가. 한국 장애인차별금지법 대응 필요성 (서비스 규모 확대 시).

**Evidence**  
`src/components/Map.tsx` 전반 — `<button>` 요소 대부분 `aria-label` 없음. `<div onClick>` 패턴 다수.

**Proposed change**  
Phase 1: 모든 interactive 버튼에 `aria-label` 추가. Phase 2: 모달에 `role="dialog"` + focus trap. Phase 3: 지도 대체 텍스트(경유지 목록으로 읽기) 제공.

**Effort/Impact** — M / Med

**Priority** — P2

---

### C-5. 음악 시작 시점 UX — 분·초 분리 입력

**Finding** — 음악 시작 시점을 '분' 필드와 '초' 필드로 분리해서 입력한다.

**Why it matters**  
타임라인 슬라이더가 훨씬 직관적이다. 분·초 계산을 사용자가 수동으로 해야 하므로 마찰이 크다. YouTube 플레이어가 이미 있으므로 현재 재생 위치를 그대로 캡처하는 방식이 가능하다.

**Evidence**  
`src/components/Map.tsx:2310-2313` — 분·초 분리 number input.

**Proposed change**  
YouTube 플레이어 재생 중 "이 시점으로 설정" 버튼으로 현재 시간을 자동 캡처. 또는 0~곡 전체 길이 범위의 슬라이더 제공.

**Effort/Impact** — S / Med

**Priority** — P2

---

### C-6. 코스 신고 기능 없음

**Finding** — 부적절한 코스나 댓글을 신고하는 UI가 없다.

**Why it matters**  
Vision SafeSearch + 텍스트 필터로 막지 못한 콘텐츠가 피드에 노출되더라도 운영자가 인지할 방법이 없다.

**Evidence**  
`src/components/CourseActions.tsx`, `CourseComments.tsx` — 신고 버튼 부재 (CLAUDE.md 미구현 범위에도 포함됨).

**Proposed change**  
코스 상세에 ··· 메뉴 추가 → "신고" 옵션 → `reports(course_id, user_id, reason, created_at)` 테이블 저장. 어드민 대시보드에서 확인.

**Effort/Impact** — M / High

**Priority** — P1

---

### C-7. create 모드 — 진행 상태 가시성 부족

**Finding** — 4단계 create 플로우에서 시각적 프로그레스 바가 없다. 모바일 mini bar에서 "N/4 단계"만 표시.

**Why it matters**  
사용자가 얼마나 남았는지 직관적으로 파악하기 어렵다. 완료율 증가를 위한 기본 UX 원칙(progress indication)이 빠져 있다.

**Evidence**  
`src/components/Map.tsx:2085` — `{createStep}/4 단계 · 탭하여 열기`

**Proposed change**  
패널 상단에 4칸 progress bar (완료 칸 빨간색 fill). 각 단계 레이블 표시.

**Effort/Impact** — S / Med

**Priority** — P2

---

## D. 성능

---

### D-1. Mapbox GL 초기 번들 비용

**Finding** — Mapbox GL JS (~3MB gzip 후 ~800KB)가 앱 첫 로드 시 반드시 포함된다.

**Why it matters**  
저사양 모바일(구형 Android)에서 Mapbox GL 초기화 시간이 3~5초 이상 걸릴 수 있다. FCP(First Contentful Paint) 저하.

**Evidence**  
`src/components/Map.tsx:1` — `"use client"`, 즉시 `import mapboxgl from "mapbox-gl"`.

**Proposed change**  
Mapbox를 dynamic import로 lazy-load. 지도 컨테이너 보이기 전까지 로드 지연. 랜딩 페이지(`/`) → `/map` 이동 시 prefetch.

**Effort/Impact** — M / High

**Priority** — P1

---

### D-2. 피드 카드 이미지 최적화 없음

**Finding** — 코스 사진이 Supabase Storage 원본 URL을 직접 사용한다. `next/image` 최적화나 Supabase Transform 적용 없음.

**Why it matters**  
모바일에서 수백KB~수MB 원본 이미지를 카드 썸네일로 로드. LCP 증가, 데이터 낭비.

**Evidence**  
`src/components/Map.tsx:278` — `photos text[]` — URL 배열을 직접 `<img src>` 사용 (예상).

**Proposed change**  
Supabase Storage Transform (`width=400&quality=80`) URL로 변환. 또는 `next/image`의 외부 도메인 허용 후 적용.

**Effort/Impact** — S / High

**Priority** — P1

---

### D-3. CoursePlayer — 저사양 디바이스 3D 지형 성능

**Finding** — `setTerrain({ exaggeration: 1.5 })` + DEM 타일 + sky layer가 매 재생마다 로드된다.

**Why it matters**  
구형 Android / 저사양 기기에서 WebGL 렌더링이 버벅이거나 앱이 크래시할 수 있다.

**Evidence**  
`src/components/CoursePlayer.tsx:374` — `m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 })`.

**Proposed change**  
`navigator.deviceMemory < 4` 또는 `navigator.hardwareConcurrency < 4` 감지 시 3D 지형 비활성화. 2D 폴백 모드 제공.

**Effort/Impact** — M / Med

**Priority** — P2

---

## E. 신뢰 & 안전성

---

### E-1. 텍스트 필터 서버사이드 미적용

**Finding** — `containsBannedWord`가 클라이언트 사이드(`handleSaveCourse`)에서만 실행된다. Supabase 직접 API 호출로 우회 가능.

**Why it matters**  
악의적 사용자가 브라우저 콘솔에서 `supabase.from("courses").insert(...)` 직접 호출 시 금칙어가 포함된 코스를 게시할 수 있다. Supabase RLS만으로는 텍스트 내용 검사 불가.

**Evidence**  
`src/components/Map.tsx:697-703` — 클라이언트 체크.  
`src/lib/text-filter.ts` — 서버 임포트 없음.

**Proposed change**  
Supabase DB 트리거 또는 PostgreSQL 함수에 금칙어 검사 로직 추가. 또는 courses INSERT를 Supabase 직접이 아닌 API Route를 거치도록 변경 후 서버에서 체크.

**Effort/Impact** — S / High

**Priority** — **P0 (안전성)**

---

### E-2. Vision SafeSearch fail-open 정책

**Finding** — Vision API 키가 없거나 Vision API가 다운되면 모든 이미지가 "safe"로 처리된다.

**Why it matters**  
Vision 키 미설정 환경(로컬 dev, 새 배포)에서 부적절한 이미지가 무제한 업로드될 수 있다. API 장애 시에도 동일.

**Evidence**  
`src/app/api/check-image/route.ts:11-13` — `if (!VISION_KEY) return NextResponse.json({ safe: true });`  
`src/lib/image-check.ts` — catch 블록 fail-open.

**Proposed change**  
- 프로덕션에서는 Vision 키를 필수 환경 변수로 강제 (`GOOGLE_CLOUD_VISION_KEY` 없으면 서버 시작 실패 또는 업로드 차단).  
- Vision 장애 시 fail-closed 또는 수동 심사 큐(관리자 알림) 전환.

**Effort/Impact** — S / Med

**Priority** — P1

---

### E-3. OG 이미지에 Mapbox 토큰 노출

**Finding** — `getCourseThumbnail`이 반환하는 Mapbox Static API URL에 `access_token=<NEXT_PUBLIC_MAPBOX_TOKEN>`이 포함된다. 이 URL이 OG 메타태그에 그대로 삽입된다.

**Why it matters**  
Mapbox Public Token이 인터넷에 공개되어 있어 타인이 동일 토큰으로 Static API 호출 가능. 단, Mapbox는 Public Token을 도메인 allowlist로 제한할 수 있음 — 현재 allowlist 설정 여부 불명.

**Evidence**  
`src/lib/map-utils.ts:43` — URL에 `access_token=${token}` 포함.  
`src/app/(main)/course/[id]/page.tsx:27` — `generateMetadata`에서 `getCourseThumbnail` 사용.

**Proposed change**  
Mapbox 대시보드에서 Public Token의 URL restriction을 `routebook-app.vercel.app`으로 설정. 또는 OG 이미지를 `/api/thumbnail` 경유로 변경해 서버 사이드에서 토큰 노출 없이 서빙.

**Effort/Impact** — S / Med

**Priority** — P1

---

## F. 성장 & 참여

---

### F-1. 피드 단조로운 정렬 (like_count DESC만)

**Finding** — 피드는 좋아요 순 고정 정렬. 신규 코스가 장기간 상위 코스에 밀려 노출되지 않는다.

**Why it matters**  
신규 크리에이터 이탈 — 첫 코스가 피드 하단에만 머무르면 동기 상실. 콘텐츠 생산 선순환 깨짐.

**Evidence**  
`src/components/Map.tsx:321` — `.order("like_count", { ascending: false })`

**Proposed change**  
① "신규순" 토글 추가 (`created_at DESC`).  
② Wilson score 또는 시간 감쇠 알고리즘 (`like_count / (hours_since_created + 2)^0.8`) 적용.  
③ "이 지역 핫" 탭: 현재 뷰포트 bounds 내 코스만 필터링.

**Effort/Impact** — M / High

**Priority** — P1

---

### F-2. 팔로잉 피드 없음

**Finding** — 사람을 찜(bookmark)할 수 있지만, 찜한 사람의 신규 코스를 피드에서 모아보는 기능이 없다.

**Why it matters**  
리텐션 메커니즘 부재. "팔로우 → 신규 코스 노출 → 재방문" 루프가 없다.

**Evidence**  
`src/hooks/useBookmark.ts` 존재, 그러나 피드 쿼리에 bookmark 필터 없음.

**Proposed change**  
`courseFilter: "all" | "liked" | "mine"` 에 `"following"` 추가 — 내가 찜한 사람들의 `visibility:"public"` 코스 쿼리.

**Effort/Impact** — M / Med

**Priority** — P2

---

### F-3. 10개 상한이 크리에이터 성장 천장

**Finding** — 인당 10개 하드 캡은 액티브 크리에이터에게 즉각적인 벽이 된다.

**Why it matters**  
파워 유저가 더 이상 코스를 추가할 수 없으면 앱 사용 이유가 사라진다. 이탈 후 대체 플랫폼 탐색.

**Evidence**  
`scripts/course-limit-trigger.sql:18` — `if v_count >= 10 then raise exception 'COURSE_LIMIT_EXCEEDED'`

**Proposed change**  
① 단기: 기존 코스를 아카이브(비공개)하면 슬롯 회수 — 총 개수 대신 `public` 코스 개수로 제한.  
② 중기: 10개 초과 시 "이전 코스 삭제 후 새 코스 추가" 플로우 안내.  
③ 장기: 수익화 연계 — 프리미엄 사용자는 무제한 (하단 H. 참조).

**Effort/Impact** — M / High

**Priority** — P1

---

### F-4. OG 카드 품질 — 아이콘 합성 미적용

**Finding** — 코스 상세 페이지의 OG image는 raw Mapbox Static URL이다. `/api/thumbnail`로 아이콘 합성한 이미지가 OG에 적용되지 않는다.

**Why it matters**  
소셜 공유 시 브랜딩이 빠진 지도 이미지만 노출. 앱 인지도 하락. Kakao 링크 공유 시 특히 중요.

**Evidence**  
`src/app/(main)/course/[id]/page.tsx:27` — `getCourseThumbnail` (raw Static URL) → OG image.  
`/api/thumbnail` — 아이콘 합성 엔드포인트이지만 OG에 미사용.

**Proposed change**  
`generateMetadata`에서 `/api/thumbnail?url=<encoded_mapbox_url>` 형태로 OG image 지정. 단, 이 URL이 공개 크롤러에서 접근 가능해야 함 (Vercel함수 URL 사용).

**Effort/Impact** — S / Med

**Priority** — P1

---

## G. 국제화 준비도

---

### G-1. 한국어 하드코딩

**Finding** — 모든 UI 문자열이 소스코드에 한국어로 직접 작성돼 있다. i18n 라이브러리 없음.

**Why it matters**  
일본(JP)·대만(TW) 확장 시 전체 컴포넌트 재작성 필요. 최소 비용으로 준비하려면 지금부터 문자열 추출이 필요.

**Evidence**  
`src/components/Map.tsx` 전반 — `"루트북 추가하기"`, `"코스 저장"` 등 인라인 문자열.

**Proposed change**  
단기 준비: `src/locales/ko.json` 생성, UI 상수를 이 파일에 집중. `next-intl` 도입은 확장 결정 후 진행. Kakao Local API는 Korea 전용이므로 해외 확장 시 API 교체(Google Places 등) 계획 필요.

**Effort/Impact** — M / Low (KR 단독 운영 중에는 영향 없음)

**Priority** — P3

---

### G-2. Kakao 의존성 — 한국 전용 서비스

**Finding** — Kakao Local API(검색, 역지오코딩), Kakao Map 딥링크가 한국 지역에서만 유효하다.

**Why it matters**  
해외 확장 시 지도 검색·딥링크 교체 필요. 인프라 교체 비용이 크다.

**Evidence**  
`src/app/api/search/route.ts`, `src/app/api/reverse-geocode/route.ts` — Kakao API 직접 호출.

**Proposed change**  
검색 레이어를 추상화 (`PlaceSearchProvider` 인터페이스)하여 Kakao ↔ Google Places 전환 가능하게 설계.

**Effort/Impact** — L / Low (KR 단독 운영 중에는 영향 없음)

**Priority** — P3

---

## H. 수익화 옵션 (현재 미연동)

---

### H-1. 후킹 포인트 식별

아래는 결제 인프라 없이도 **지금 추가 가능한 수익화 인프라 시드**다.

| 훅 | 설명 | 구현 난이도 |
|---|---|---|
| `profiles.tier` 컬럼 | `free | creator | agency` 등 구분자 — 추후 기능 분기 기반 | S |
| `featured_courses` 유료화 | 현재 운영자 수동 → 광고주가 직접 신청하는 셀프서브 UI | M |
| 코스 상한 차별화 | `free=10 / creator=무제한` — 업그레이드 유도 트리거 명확 | M |
| 크리에이터 프로필 배지 | `profiles.badge` — 인증 크리에이터, 파트너 표시 | S |
| 다운로드 / 인쇄 PDF | 드라이브 코스 PDF 저장 → 프리미엄 기능 | M |

**Priority** — P3 (수익화 결정 후 진행)

---

## I. 사용 시나리오 분석

---

### I-1. 커플/동승 드라이브 시나리오

**현재 지원**: 코스 공유(URL 복사, 카카오맵 딥링크)로 동승자에게 코스 전달 가능.

**갭**:
- 공동 편집 불가 (코스는 1명 소유)
- 동승자가 실시간으로 현재 위치를 공유하거나 "다음 경유지" 가이드를 볼 UI 없음
- 코스를 두 사람 모두의 라이브러리에 저장하는 "함께 저장" 없음

**제안** (P2): "함께 저장" — `shared_courses(course_id, sharer_id, recipient_id)` 테이블. 받은 사람 프로필에 표시.

---

### I-2. 솔로 로드트립 준비 시나리오

**현재 지원**: 탐색 패널에서 출발지~도착지 반경 검색 → 코스 3D 미리보기 → 카카오맵 인계.

**갭**:
- 여러 코스를 비교·스크랩하는 UI 없음 (코스 찜 미구현 — C-3 참조)
- 총 드라이브 시간 vs 코스 `duration_min` 정확도 불명 (Mapbox Directions 기반인지 확인 필요)
- 날씨 정보 연계 없음 (야경 코스 갈 때 날씨 확인)

**제안** (P2): 코스 찜 + "내 계획" 모음 뷰.

---

### I-3. 드라이브 콘텐츠 크리에이터 시나리오

**현재 지원**: 코스 + 사진 + 음악 조합 → Instagram 링크 프로필 노출.

**갭**:
- 코스 임베드 코드(iframe) 없음 — 블로그·외부 링크에 삽입 불가
- 코스 조회수 트래킹 없음 (`share_count`만, `view_count` 없음)
- 크리에이터 포트폴리오 뷰 빈약 — 프로필 페이지가 단순 코스 목록

**제안** (P2): `view_count` 컬럼 추가 + `courses.view_count ++` on 상세 페이지 로드. 크리에이터 통계 카드 (총 좋아요·조회수·공유 수).

---

### I-4. 관광 에이전시 파트너십 시나리오

**현재 지원**: `featured_courses` 테이블으로 특정 코스 상단 고정 가능.

**갭**:
- 파트너 전용 페이지 없음
- 지역 관광청이 제공하는 공식 코스 배지 없음
- 외국어 미지원 → 외국인 관광객 타깃 불가

**제안** (P3): `profiles.partner_type` + 공식 코스 배지 UI → 지역 관광청 파트너십 기반.

---

## 우선순위 Top-10

> 점수 = Impact(High=3, Med=2, Low=1) × 역Effort(S=3, M=2, L=1). 동점은 P0 우선.

| # | Finding | Dim | Impact | Effort | 점수 | Priority |
|---|---|---|---|---|---|---|
| **1** | 계정 삭제 시 `comments` 미삭제 (버그) | B-1 | High | S | 9 | **P0** |
| **2** | 텍스트 필터 서버사이드 미적용 | E-1 | High | S | 9 | **P0** |
| **3** | 애니메이션 45초 / CLAUDE.md 30초 불일치 | C-2 | Med | S | 6 | **P0** |
| **4** | `/api/thumbnail` 레이트 리밋 없음 | A-2 | High | S | 9 | P1 |
| **5** | `anon` 롤에 RPC EXECUTE 부여 | B-2 | High | S | 9 | P1 |
| **6** | Sentry 에러 모니터링 부재 | A-4 | High | S | 9 | P1 |
| **7** | 10개 제한 UX 사전 안내 없음 | C-1 | High | S | 9 | P1 |
| **8** | 피드 이미지 최적화 없음 | D-2 | High | S | 9 | P1 |
| **9** | OG 카드 아이콘 합성 미적용 | F-4 | Med | S | 6 | P1 |
| **10** | 피드 단조로운 정렬 + 페이지네이션 없음 | A-5 + F-1 | High | M | 6 | P1 |

---

## 개선 로드맵 제안

```
P0 (즉시 — 코드 버그·문서 수정)
  ├─ B-1: delete-account comments 삭제 추가
  ├─ E-1: 텍스트 필터 서버사이드 적용
  └─ C-2: CLAUDE.md "45초"로 수정

P1 (다음 버전 — 1~2 스프린트)
  ├─ A-2: /api/thumbnail 레이트 리밋
  ├─ B-2: anon RPC 권한 제거
  ├─ A-4: Sentry 연동
  ├─ C-1: 10개 제한 UX 개선
  ├─ C-6: 신고 기능
  ├─ D-1: Mapbox lazy-load
  ├─ D-2: 이미지 최적화
  ├─ E-2: Vision fail-closed 정책
  ├─ E-3: Mapbox 토큰 allowlist
  ├─ F-4: OG 카드 아이콘 합성
  ├─ F-1: 피드 신규순 정렬 + 페이지네이션
  ├─ F-3: 10개 상한 아카이브 해법
  └─ A-1: Map.tsx 분리 (대형, 점진적 진행)

P2 (백로그)
  ├─ B-3: bookmark_count 갱신
  ├─ B-5: 소프트 삭제
  ├─ C-3: 코스 찜
  ├─ C-4: 접근성
  ├─ C-5: 음악 시작 시점 UX
  ├─ C-7: create 프로그레스 바
  ├─ D-3: 저사양 3D 폴백
  ├─ F-2: 팔로잉 피드
  └─ I-2, I-3: 시나리오 개선

P3 (검토 후)
  ├─ A-3: 미들웨어 범위 축소
  ├─ A-6: legacy /create 라우트 제거
  ├─ B-4: region 중복 컬럼 정리
  ├─ G-1, G-2: i18n 준비
  └─ H-1: 수익화 훅 시드
```
