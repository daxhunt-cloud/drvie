# Designer Feature History — Routebook

> Phase 5 close log. One line per shipped/deferred/dropped/scope-change decision per version.
> Schema: `- (YYYY-MM-DD) <version> · <area-tag> · <decision-type> · note: <one-line>`
> decision-type ∈ `shipped | deferred | dropped | scope-change`

- (2026-05-27) v2 · tokens · shipped · note: globals.css :root 전면 교체 (Routebook DS v1.0) + Map.tsx 인라인 shadow 18건 토큰화 (T-DS-01·02)
- (2026-05-27) v2 · brand-color · shipped · note: 단색 accent #ff385c 통일 (#ef4444 경유지·#EBF5FF active bg·#0066FF 카테고리 텍스트 sweep, GPS는 --color-info 유지) (T-DS-05)
- (2026-05-27) v2 · course-card · shipped · note: CourseCard.tsx 신규 컴포넌트 (variant: feed|popup, 썸네일 priority photos[0]→/api/thumbnail→placeholder, T-DS-03 흡수) (T-DS-04)
- (2026-05-27) v2 · cta-pill · shipped · note: 메인 CTA Strava-style floating pill (--radius-full + --shadow-float + +icon + 52px height + var(--bottom-tab-h) bottom offset) (T-DS-06)
- (2026-05-27) v2 · ia-3tab · shipped · note: BottomTab 2슬롯 (지도/피드; 설정 → /map 헤더 메뉴 이전) + Compass SVG + /feed 신규 라우트 SSR (T-IA-01·02)
- (2026-05-27) v2 · feed-sort · shipped · note: FeedSortToggle 4-mode (인기/신규/관심/내 코스) + URL ?sort= sync + backward-compat (?sort=following→liked, region→mine) + LoginModal 트리거 (T-IA-03)
- (2026-05-27) v2 · feed-paging · shipped · note: 무한 스크롤 IntersectionObserver + cursor pagination + race guard (T-IA-04)
- (2026-05-27) v2 · feed-following · shipped · note: liked 탭: 내가 좋아요한 공개 코스 노출 (likes 테이블 JOIN, Auth 필수); bookmarks!inner 팔로잉 정렬은 V3 deferred (T-IA-05)
- (2026-05-27) v2 · feed-region-impl · scope-change · note: region 정렬 → mine(내가 만든 코스)으로 전환; 내지역(위치 기반) 구현은 V3-VAL-04 deferred. URL ?sort=region backward-compat 유지 (T-IA-05)
- (2026-05-27) v2 · map-mode-cleanup · shipped · note: courseFilter/browseCourses/likedCourseIds 제거 + 모드 단순화 (T-IA-06)
- (2026-05-27) v2 · map-list-panel-removal · scope-change · note: 200줄 감축 목표 → 실제 38줄 (Designer 가정 stale — 큰 list panel 이미 부재, 처음부터 pin-only였음) (T-IA-06)
- (2026-05-27) v2 · migration-toast · shipped · note: localStorage routebook_feed_tab_seen flag 기반 1회 안내 토스트 + Toast actionLabel/onAction props 확장 (T-IA-07)
- (2026-05-27) v2 · thumbnail-cache · scope-change · note: OQ-2 Option A (Cache-Control public max-age=86400 24h) 채택. 트래픽 증가 시 Option B (Storage 사전 생성) 전환 여지 (design-phase2-spec.md§8 Q2)
- (2026-05-27) v2 · mapbox-css-var · scope-change · note: Mapbox GL paint properties + SVG innerHTML 속성은 CSS var() 미해석 → literal hex 필수 (BRAND_COLOR const). T-DS-05 구현 중 발견된 cross-library 제약 (po-memory#mapbox-gotcha)
- (2026-05-27) v2 · dismiss-swipe-down · deferred · note: SelectedCourseCard popup 스와이프 다운 dismiss — Phase 3 제외, V3+ 검토 (design-phase2-spec.md§5.5)
- (2026-05-27) v2 · og-image-dynamic · deferred · note: 코스 썸네일 기반 동적 OG 이미지 — 현재 /icon-512.png 정적 유지 (design-phase2-spec.md§7.3)
- (2026-05-27) v2 · my-courses-view · deferred · note: `courseFilter "mine"` 제거 후 "내가 만든 코스" 노출 위치 미정 — V3 /settings 또는 /profile/[userId] 통합 검토 (design-ia-3tab.md§3)
- (2026-05-27) v2 · feed-following-sort · deferred · note: 팔로잉 정렬 (bookmarks!inner — 찜한 사람의 공개 코스) — V3-VAL-03로 이관; v2에서 liked(관심) 탭으로 대체. URL ?sort=following backward-compat 유지 (design-ia-3tab.md§4.2)
- (2026-05-27) v2 · feed-region-sort · deferred · note: 내지역 지역 기반 정렬 (위치 기반) — V3-VAL-04로 이관; v2에서 mine(내 코스) 탭으로 대체. URL ?sort=region backward-compat 유지 (design-ia-3tab.md§4.2)
- (2026-05-27) v2 · push-notifications · dropped · note: 팔로잉 신규 코스 푸시 알림 — 알림 인프라 미존재, scope 외 (design-phase2-spec.md§7.3)
- (2026-05-27) v2 · cinematic-skin-isolation · dropped · note: CoursePlayer 다크 cinematic 스킨 변경 — 의도적 분리 유지, 스테일 아님 (design-phase2-spec.md§7.3)

## V3 검증 대기 (validation_method: GA4 이벤트 추세 + 정성 피드백)

- feed_tab_view / feed_sort_change / course_card_click / feed_like 이벤트 추세 (2주 관찰)
- 사용자 정성 피드백: "피드 탭 분리 후 콘텐츠 발견성" + "Strava-style CTA tactile feedback"
- V3-VAL-03: 팔로잉 정렬 도입 타당성 (liked 탭 engagement 지표 참조)
- V3-VAL-04: 내지역 정렬 도입 타당성 (지역 기반 탐색 수요 확인 후)
