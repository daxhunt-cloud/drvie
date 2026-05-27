# Routebook — As-Built PRD
> 현재 운영 중인 제품을 있는 그대로 기술합니다. 개선안은 `routebook-improvement-audit.md`를 참조하세요.

**버전**: 2026-05-22 · **작성**: pdt-designer · **소스**: `CLAUDE.md` + 실제 소스코드 분석

---

## 1. 제품 요약

**루트북(Routebook)**은 한국 드라이브 문화에 특화된 코스 공유 웹앱이다. 사용자가 지도에 경유지를 찍어 드라이브 코스를 만들고, 45초 분량의 3D 플라이오버 애니메이션으로 미리보기한 뒤, YouTube BGM과 함께 피드에 공유한다. 무료 서비스, 한국어 전용, 결제 없음. 운영 도메인: `https://routebook-app.vercel.app`

---

## 2. 타깃 사용자 & 핵심 JTBD

| 페르소나 | Job-to-be-Done |
|---|---|
| **드라이브 커플** | "우리만의 감성 드라이브 코스를 저장하고 추억으로 남기고 싶다" |
| **로드트립 솔로** | "떠나기 전에 코스를 미리 시각적으로 확인하고 싶다" |
| **드라이브 인플루언서** | "내 코스를 영상 없이도 감각적으로 보여줘서 팔로워를 늘리고 싶다" |
| **코스 탐색자** | "내 출발지~도착지 근처의 검증된 드라이브 코스를 빠르게 찾고 싶다" |

---

## 3. 핵심 가치 제안

> **"30줄의 텍스트보다 45초의 3D 비행이 낫다."**  
> 지도 + 음악 + 폴라로이드 사진이 결합된 드라이브 코스 미리보기 경험은 기존 SNS(텍스트/정지이미지)로 대체 불가능하다.

---

## 4. 기능 인벤토리

### 4-A. 발견 & 피드

| 기능 | 상세 |
|---|---|
| **메인 피드** | `like_count DESC` 정렬, `limit(100)`, 공개 코스만 |
| **featured 코스** | `featured_courses` 테이블 — 운영자가 `sort_order` 지정 |
| **지도 위 핀** | 코스별 작성자 아바타 핀 + 코스 미리보기 마커 |
| **탐색 패널** | 출발지/도착지 검색 + 반경(5~50km) 슬라이더 + 태그 멀티필터 |
| **필터** | `all` / `liked` / `mine` 3-탭 (지도 위 피드 필터) |
| **코스 상세 페이지** | `/course/[id]` — SSR, OG 메타 + JSON-LD(TouristTrip), 댓글, 좋아요, 공유 |

### 4-B. 코스 만들기

| 단계 | 내용 |
|---|---|
| **Step 1 — 경유지** | 지도 탭으로 핀 추가, DnD 정렬(`@dnd-kit`), 드래그 이동, 역지오코딩(카카오 API), 경유지별 사진(blob)·메모(12자 제한) |
| **Step 2 — 감성 태그** | 야경/심야/힐링/해안/산길/드라이브 데이트/단풍/새벽/일출/지름길/와인딩/강변/맛집/카페 중 최대 3개 |
| **Step 3 — 코스 정보** | 제목(2자 이상, 자음 단독 불가)·소개(60자 제한) |
| **Step 4 — 음악 (선택)** | YouTube URL 붙여넣기 → videoId 추출 → 시작 지점(분·초) 설정 → 45초 자동 구간 → 구간 미리듣기 |
| **저장** | 사진 압축→Vision SafeSearch→Storage 업로드→`courses` INSERT(`visibility:"draft"`) → `/course/{id}/preview` 이동 |
| **미리보기 확인** | 3D 애니메이션 재생 후 "피드에 올리기" 클릭 → `visibility:"public"` UPDATE |

### 4-C. 3D 애니메이션 플레이어 (`CoursePlayer.tsx`)

| 항목 | 값 |
|---|---|
| **고정 길이** | `FIXED_DURATION_SEC = 45`초 |
| **지도 스타일** | 낮: `outdoors-v12`, 야경·심야 태그: `dark-v11` |
| **지형** | Mapbox DEM 1.5× 과장 |
| **카메라** | 속도 기반 자동 줌, `smoothBearingRef` 0.03 계수 보간 |
| **폴라로이드** | 경유지 도달 시 팝업→빨래줄 레일로 이동 |
| **댓글 티커** | 하단 좌→우 스크롤 슬라이더 |
| **BGM** | YouTube IFrame — fade-in 시작, 종료 2초 전부터 fade-out |
| **풀스크린** | 지원 (`onFullscreenChange` 콜백) |

### 4-D. 프로필 & 소셜

| 기능 | 상세 |
|---|---|
| **내 프로필** | 닉네임, 아바타, bio, 인스타그램 링크, 기본 차량 |
| **타인 프로필** | `/profile/[userId]` — 코스 목록, 사람 찜(북마크) |
| **좋아요** | 낙관적 ±1 + `recount_course_likes` RPC 재계산 |
| **공유** | `increment_share_count` RPC + 카카오맵 딥링크(`kakaomap://route`) |
| **댓글** | 코스별 텍스트 댓글 (`CourseComments.tsx`) |
| **사람 찜** | `bookmarks(user_id, target_user_id)` — 코스 찜이 아닌 **사람** 찜 |

### 4-E. 인증 & 계정

| 항목 | 내용 |
|---|---|
| **인증** | Google OAuth 단일 (Supabase Auth) |
| **보호 경로** | `/create`, `/settings` — 미인증 시 `/login`으로 리다이렉트 |
| **게스트** | 피드·탐색·코스 상세 열람 가능, 좋아요·만들기는 로그인 필요 |
| **계정 삭제** | Storage(사진·아바타) + DB(likes→bookmarks→courses→profiles) 순 일괄 삭제 |

### 4-F. 운영·관리

| 기능 | 상세 |
|---|---|
| **어뷰징 방어** | 금칙어 필터 (`text-filter.ts`), Google Vision SafeSearch, 코스 인당 10개 DB 트리거 |
| **레이트 리밋** | Upstash Redis sliding window: 검색 30/min, Vision 10/min, 계정삭제 3/min |
| **SEO** | 동적 사이트맵(`sitemap.ts`), 코스 페이지 OG 메타 + JSON-LD |
| **분석** | GA4 (`G-V9C13LRQ72`, `layout.tsx`) |
| **featured 편집** | DB 직접 조작 (관리자 UI 없음) |

---

## 5. 주요 사용자 플로우

### 5-1. 신규 가입 → 코스 만들기 → 게시

```
랜딩(/) → [구글 로그인] → /map (피드)
→ "루트북 추가하기" 클릭 → create 모드 진입
→ Step1: 경유지 핀 2개 이상 추가 (지도 탭)
→ Step2: 감성 태그 선택 (1~3개)
→ Step3: 코스 이름·소개 입력
→ Step4: YouTube BGM 설정 (선택)
→ "코스 저장" → 사진 검사+업로드 → draft INSERT
→ /course/{id}/preview (3D 애니메이션 미리보기)
→ "피드에 올리기" → visibility:"public" UPDATE
→ /map (피드, 내 코스 상단 노출)
```

### 5-2. 코스 탐색 → 재생

```
/map → 지도 위 코스 핀 클릭 or 아래 카드 클릭
→ CourseDetail 사이드패널/바텀시트 열림
→ "애니메이션 보기" → CoursePlayer 실행 (45초 3D)
→ 좋아요/댓글/공유 → 카카오맵 딥링크 이동 or URL 복사
```

### 5-3. 출발지·도착지 탐색

```
/map 우상단 탐색 아이콘 → searchMode 패널 열림
→ 출발지 검색 (카카오 키워드+주소 통합) + 도착지 검색
→ 반경 슬라이더 조정 → 실시간 피드 필터링
→ 태그 멀티필터 적용 → 코스 선택
```

### 5-4. 로그인 없이 저장 시도 → 로그인 후 복귀

```
create 모드 진행 → "코스 저장" 클릭 (미인증)
→ sessionStorage에 draft 저장 + `create_pending_save` 플래그
→ /login?redirect=/map 이동 → 구글 로그인
→ /map 복귀 → draft 복원 → 자동 저장 실행
```

---

## 6. 비기능 요구사항

| 항목 | 현재 상태 |
|---|---|
| **레이트 리밋** | Upstash Redis sliding window; Upstash 장애 시 fail-open |
| **이미지 안전** | Google Vision SafeSearch; Vision 키 미설정 시 fail-open |
| **텍스트 필터** | 클라이언트 사이드 `containsBannedWord` (제목·설명·경유지명) |
| **코스 캡** | 인당 10개 — 클라이언트 체크 + DB 트리거 이중 방어 |
| **반응형** | 모바일(<768px) 바텀시트 스와이프, 데스크탑(≥768px) 사이드패널 360px |
| **인증** | Supabase SSR + 미들웨어 세션 자동 갱신 |
| **SEO** | SSR 코스 페이지, 동적 사이트맵, JSON-LD TouristTrip |
| **접근성** | 미선언 (ARIA 없음, 키보드 내비게이션 미지원) |
| **오류 추적** | 없음 (console.error 외 별도 APM 없음) |

---

## 7. 데이터 모델 요약

> 컬럼 상세는 `CLAUDE.md § 데이터 모델`을 참조. 여기서는 관계만 기술.

```
profiles ──< courses ──< likes
               │  └──< comments
               └──< featured_courses
profiles ──< bookmarks >── profiles   (사람→사람 찜, 코스 찜 아님)
```

**Storage 경로**
- 코스 사진: `course-photos/{userId}/{courseId}/`
- 아바타: `avatars/{userId}/`

**원자적 RPC**
- `recount_course_likes(p_course_id)` — likes 행수로 like_count 재계산
- `increment_share_count(p_course_id)` — share_count atomic +1

---

## 8. 외부 의존성 지도

| 서비스 | 역할 | 장애 영향 |
|---|---|---|
| Supabase | DB + Auth + Storage | 전체 서비스 중단 |
| Mapbox GL JS | 인터랙티브 지도 + 3D 지형 | 지도 기능 전체 |
| Mapbox Static API | 코스 썸네일 이미지 | OG 카드 + 썸네일 |
| Kakao Local API | 장소 검색, 역지오코딩 | 검색·경유지명 불가 |
| Google Vision | 이미지 SafeSearch | fail-open (검사 스킵) |
| YouTube IFrame | BGM 재생 | 음악 없이 작동 |
| Kakao Map (딥링크) | 길안내 인계 | 공유 기능 일부 |
| Upstash Redis | API 레이트 리밋 | fail-open (제한 해제) |
| GA4 | 방문자 분석 | 분석만 중단 |
| Vercel | 호스팅 + Serverless | 전체 서비스 중단 |

---

## 9. 명시적 미구현 범위

- 결제 / 구독 (결제 게이트웨이 없음)
- 푸시 알림 / 이메일
- 다국어 (한국어 전용)
- 신고 기능 (부적절 코스·댓글 신고 버튼 없음)
- 코스 북마크 (사람 찜만 존재)
- 어드민 UI (DB 직접 조작)
- 오류 추적 (Sentry 미연동)
- 팔로잉 피드 (북마크한 사람의 신규 코스 알림 없음)

---

## 10. 코드 분석 중 발견된 오픈 이슈

| # | 위치 | 내용 |
|---|---|---|
| OQ-1 | `CoursePlayer.tsx:10` | `FIXED_DURATION_SEC = 45`인데 `CLAUDE.md`는 "30초 3D 애니메이션"으로 기재 — 어느 쪽이 맞는지 확인 필요 |
| OQ-2 | `Map.tsx:275` 주석 | `createStep` 주석에 6단계로 기재돼 있으나 실제 코드는 4단계 — 주석 stale |
| OQ-3 | `delete-account/route.ts` | `comments` 테이블 삭제 누락 — 계정 삭제 후 고아 댓글 잔존 |
| OQ-4 | `atomic-counters.sql:36` | `recount_course_likes`, `increment_share_count` 모두 `anon` 롤에 EXECUTE 권한 부여 — 비인증 호출 가능 |
| OQ-5 | `profiles` 테이블 | `bookmark_count` 컬럼이 있으나 자동 갱신 트리거나 RPC가 코드 내 보이지 않음 |
| OQ-6 | `courses` 테이블 | `region` (string) 과 `region_tags` (text[]) 이중 저장 — 중복 컬럼 |
| OQ-7 | `map-utils.ts:43` | OG 이미지 URL에 `NEXT_PUBLIC_MAPBOX_TOKEN`이 포함됨 — 토큰 노출 (NEXT_PUBLIC이므로 의도된 것이나 로테이션 정책 필요) |
| OQ-8 | `map-utils.ts` | `/api/thumbnail`과 `getCourseThumbnail`이 별개로 운영 — OG 카드는 raw Mapbox URL, `/api/thumbnail`은 아이콘 합성용인지 명확히 문서화 필요 |
