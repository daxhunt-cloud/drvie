---
id: T-DEPLOY-v2
slug: routebook-design-direction-main
version: v2
title: "v2 Design System Overhaul — Production Deploy"
status: in-progress
stage: phase4_deploy
assignee: pdt-po
type: deploy
estimated_complexity: L2
risk_flags: [new-route-feed, ia-refactor-large, uncommitted-changes-pending]
priority: P1
routing: { model: sonnet, effort: medium }
started_at: "2026-05-27T05:38:21Z"
created_at: "2026-05-27T10:00:00Z"
---

# T-DEPLOY-v2 · v2 Design System Overhaul — Production Deploy

> status: in-progress · stage: phase4_deploy · assignee: pdt-po
> (mirrored — PO updates on lifecycle change)

## Context

v2 Design System overhaul — 13 tickets complete, 0 blocked. Key surface changes:
- **Routebook DS v1.0** tokens live (globals.css :root 전면 교체)
- **BottomTab 2→3슬롯** (지도 / 피드 / 설정) — `(main)/layout.tsx` 에 mounted 확인됨
- **`/feed` 신규 라우트** — SSR + FeedSortToggle (4-mode) + 무한 스크롤 + 팔로잉/내지역 쿼리
- **CourseCard.tsx** 컴포넌트 추출 (variant: feed | popup, 썸네일 포함)
- **Floating Action Pill CTA** (Strava-style, /map explore 모드 하단 center-bottom fixed)
- **Map.tsx 모드 정리** — `courseFilter` 제거, `/feed` 1회 마이그레이션 토스트
- 0 production regressions (tsc clean, visual smoke pass)

Last known git state: `5825c3d fix: separate map container from overlay elements to fix z-index` — uncommitted v2 changes in working tree pending commit.

No new environment variables required (기존 Supabase + Mapbox 설정 그대로).

---

## Steps

### Phase 1 — Pre-deploy local verify

```
[PO] npx tsc --noEmit
```
> 결과: error 0건 확인 필수. 실패 시 배포 중단 + 오류 내용 본 ticket Activity에 기록.

```
[PO] npm run build
```
> ⚠️ Large changeset (13 tickets) — Vercel 배포 전 로컬 full build 강력 권고. .next 캐시 오염 없음 확인 (po-memory: build는 phase-boundary에만). 실패 시 배포 중단.

---

### Phase 2 — Git commit & push

```
[user] git status 검토
```
> 변경 파일 목록 확인 — src/ (BottomTab, Map, CourseCard, /feed/*), globals.css, public/ 등. 의도하지 않은 파일 포함 여부 확인 후 `[PO]` 단계 진행 허가.

```
[PO] git add -A
```

```
[PO] git commit -m "$(cat <<'COMMITMSG'
feat(v2): Routebook design system overhaul — DS tokens, 3-tab IA, /feed, CourseCard, Floating Pill

DS Bundle (T-DS-01~06):
- globals.css: Routebook DS v1.0 tokens (:root 전면 교체, --color-brand/shadow-*/radius-*/space-*)
- Map.tsx: 18 boxShadow → --shadow-card/float/control tokens
- CourseCard.tsx: 신규 컴포넌트 (variant feed|popup, thumbnail photos[0]→/api/thumbnail→placeholder)
- CTA color sweep: #ef4444/#EBF5FF/#0066FF → DS tokens (Mapbox paint: literal hex 유지)
- Floating Action Pill: --radius-full + --shadow-float + +icon + var(--bottom-tab-h) offset

IA Bundle (T-IA-01~07):
- BottomTab: 2→3슬롯 (지도/피드/설정, Compass SVG, token--bottom-tab-h)
- /feed: 신규 RSC route + FeedSortToggle(인기/최신/팔로잉/내지역) + 무한스크롤 + sitemap
- Map.tsx: courseFilter/browseCourses 제거, 모드 단순화 (explore|create|editMode)
- 마이그레이션: localStorage routebook_feed_tab_seen 1회 토스트

Co-Authored-By: productune <productune@axzcorp.com>
COMMITMSG
)"
```

```
[PO] git push origin main
```

---

### Phase 3 — Deploy to production

```
[PO] npx vercel --prod
```
> 배포 URL 출력 확인. `https://routebook-app.vercel.app` 에 반영될 때까지 약 1~2분 대기.

---

### Phase 4 — Post-deploy smoke (production URL)

```
[user] https://routebook-app.vercel.app 접속
```

아래 항목 순서대로 눈으로 확인:

| # | 확인 항목 | 기대 결과 | 결과 기록 |
|---|---|---|---|
| 1 | BottomTab 슬롯 수 | 하단 탭 3개 (지도 / 피드 / 설정) | ☐ |
| 2 | 피드 탭 탭 | `/feed` 페이지 진입, 코스 카드 목록 노출 | ☐ |
| 3 | FeedSortToggle | 인기 / 최신 / 팔로잉 / 내지역 4탭 표시 | ☐ |
| 4 | `/map` explore 모드 | 하단 full-width 흰 컨테이너 없음 — Floating Pill만 표시 | ☐ |
| 5 | Floating Pill CTA | `+` 아이콘 + "루트북 추가하기" 텍스트, brand red pill shape | ☐ |
| 6 | CourseCard thumbnail | 코스 핀 탭 → 카드 상단 썸네일 이미지 또는 skeleton 노출 | ☐ |
| 7 | 브랜드 색상 일관성 | 파란색 카테고리 배경 없음, 경유지 마커 brand red | ☐ |
| 8 | iPhone 또는 Safari | BottomTab safe-area 잘림 없음, Pill CTA notch 침범 없음 | ☐ |

> 1건이라도 실패 시 결과를 ## Persona Activity에 기록 + PO에게 알림.

---

### Phase 5 — Git tag (권고)

```
[PO] git tag v2-design-system && git push origin v2-design-system
```
> v2 완료 시점 커밋 보존. 롤백 필요 시 `git revert v2-design-system..HEAD` 기준점.

---

## Risk notes

- **`/feed` 신규 라우트** — Vercel 배포 후 sitemap.xml에 `/feed` 추가 확인 권장 (`https://routebook-app.vercel.app/sitemap.xml`).
- **BottomTab mount** — T-IA-01 구현 시 layout.tsx import 누락으로 14h cascade 발생 이력 있음. smoke step #1에서 3-slot 직접 확인 필수.
- **Mapbox CSS var 제약** — 배포 후 지도 위 경유지 마커 색상 확인 (smoke #7). literal hex `#ff385c` 적용됨 — Vercel 환경에서 동일하게 동작해야 함.
- **환경 변수** — 신규 env 없음. 기존 `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SUPABASE_*`, `KAKAO_REST_API_KEY` 설정 유지.
- **롤백 기준** — production regression 발생 시 `git revert <commit>` → `npx vercel --prod` 재배포.

---

## Persona Activity
<!-- PO appends -->
| timestamp | persona | model/effort | action | note |
|---|---|---|---|---|
| 2026-05-27T10:00Z | pdt-designer | sonnet/medium | spec | deploy ticket authored from v2 5a/5c synthesis |
