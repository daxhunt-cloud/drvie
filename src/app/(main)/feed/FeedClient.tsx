"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import LoginModal from "@/components/LoginModal";
import FeedSortToggle, { type FeedSortMode } from "@/components/FeedSortToggle";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

// ── Constants ─────────────────────────────────────────────────────────────────

interface FeedClientProps {
  initialCourses: any[];
  initialSort: FeedSortMode;
}

const COURSE_SELECT =
  "id,title,description,distance_km,like_count,tags,region_tags,photos,user_id,created_at,waypoints,route_geojson,profiles(id,nickname,avatar_url)";
const PAGE_SIZE = 20;

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedClient({ initialCourses, initialSort }: FeedClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // ── Core list state ───────────────────────────────────────────────────────
  const [activeSortMode, setActiveSortMode] = useState<FeedSortMode>(initialSort);
  const [courses, setCourses] = useState<any[]>(initialCourses);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialCourses.length >= PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── "관심" tab: distinguishes "no likes" vs "likes exist but all private" ──
  const [likedHasCourseIds, setLikedHasCourseIds] = useState(false);
  // Cached liked course IDs for loadMore pagination (Step 1 fetched once in refetch)
  const likedCourseIdsRef = useRef<string[]>([]);

  // ── Race guard ref (always reflects latest render value) ─────────────────
  const activeSortModeRef = useRef(activeSortMode);
  useEffect(() => { activeSortModeRef.current = activeSortMode; }, [activeSortMode]);

  // ── One-time URL migration (stale ?sort=following / ?sort=region) ─────────
  useEffect(() => {
    const url = new URL(window.location.href);
    const cur = url.searchParams.get("sort");
    if (cur === "following") { router.replace("/feed?sort=liked", { scroll: false }); return; }
    if (cur === "region")    { router.replace("/feed?sort=mine",  { scroll: false }); return; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── loadMore: cursor pagination for all modes ─────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    const fetchedMode = activeSortMode;
    setLoadingMore(true);

    try {
      const from = (page + 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;
      const supabase = createClient();
      let data: any[] | null = null;

      if (fetchedMode === "popular" || fetchedMode === "new") {
        const query = supabase
          .from("courses")
          .select(COURSE_SELECT)
          .eq("visibility", "public")
          .range(from, to);

        const result =
          fetchedMode === "new"
            ? await query.order("created_at", { ascending: false })
            : await query.order("like_count",  { ascending: false });

        data = result.data;
      } else if (fetchedMode === "liked") {
        if (!user) { setHasMore(false); return; }

        const courseIds = likedCourseIdsRef.current;
        if (courseIds.length === 0) { setHasMore(false); return; }

        const result = await supabase
          .from("courses")
          .select(COURSE_SELECT)
          .in("id", courseIds)
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .range(from, to);

        data = result.data;
      } else if (fetchedMode === "mine") {
        if (!user) { setHasMore(false); return; }

        const result = await supabase
          .from("courses")
          .select(COURSE_SELECT)
          .eq("user_id", user.id)
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .range(from, to);

        data = result.data;
      }

      // Race guard: sort mode changed mid-flight → discard
      if (fetchedMode !== activeSortModeRef.current) return;

      const newItems = data ?? [];
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setCourses((prev) => [...prev, ...newItems]);
        setPage((p) => p + 1);
        if (newItems.length < PAGE_SIZE) setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeSortMode, page, hasMore, loadingMore, user]);

  // ── IntersectionObserver ──────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1, rootMargin: "0px 0px 200px 0px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── refetch: first-page fetch on sort mode change ─────────────────────────
  const refetch = async (mode: FeedSortMode) => {
    if (mode === "liked") {
      if (!user) {
        setCourses([]);
        setPage(0);
        setHasMore(false);
        setLikedHasCourseIds(false);
        likedCourseIdsRef.current = [];
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();

        // Step 1: fetch all course IDs I've liked (cache for loadMore)
        const { data: likesList } = await supabase
          .from("likes")
          .select("course_id")
          .eq("user_id", user.id);

        const courseIds: string[] = likesList?.map((l: any) => l.course_id) ?? [];
        likedCourseIdsRef.current = courseIds;
        setLikedHasCourseIds(courseIds.length > 0);

        if (courseIds.length === 0) {
          setCourses([]);
          setPage(0);
          setHasMore(false);
          return;
        }

        // Step 2: fetch first page of those public courses
        const { data } = await supabase
          .from("courses")
          .select(COURSE_SELECT)
          .in("id", courseIds)
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1);

        setCourses(data || []);
        setPage(0);
        setHasMore((data?.length ?? 0) >= PAGE_SIZE);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "mine") {
      if (!user) {
        setCourses([]);
        setPage(0);
        setHasMore(false);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("courses")
          .select(COURSE_SELECT)
          .eq("user_id", user.id)
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1);

        setCourses(data || []);
        setPage(0);
        setHasMore((data?.length ?? 0) >= PAGE_SIZE);
      } finally {
        setLoading(false);
      }
      return;
    }

    // popular / new
    setLoading(true);
    try {
      const supabase = createClient();
      const query = supabase
        .from("courses")
        .select(COURSE_SELECT)
        .eq("visibility", "public")
        .range(0, PAGE_SIZE - 1);

      const { data } =
        mode === "new"
          ? await query.order("created_at", { ascending: false })
          : await query.order("like_count",  { ascending: false });

      setCourses(data || []);
      setPage(0);
      setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };

  const handleSortSelect = (mode: FeedSortMode) => {
    setActiveSortMode(mode);
    router.replace(`/feed?sort=${mode}`, { scroll: false });
    refetch(mode);
  };

  // Sync when initialSort prop changes (browser back/forward navigation)
  useEffect(() => {
    setActiveSortMode(initialSort);
    setCourses(initialCourses);
    setPage(0);
    setHasMore(initialCourses.length >= PAGE_SIZE);
    // Trigger refetch for liked/mine (SSR doesn't fetch these, client-side only)
    if (initialSort === "liked" || initialSort === "mine") {
      refetch(initialSort);
    }
  }, [initialSort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty state variants ──────────────────────────────────────────────────
  const renderEmpty = () => {
    if (activeSortMode === "liked") {
      if (!likedHasCourseIds) {
        return (
          <div style={emptyWrap}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>♥</div>
            <div style={emptyTitle}>아직 좋아요한 코스가 없어요</div>
            <div style={emptyBody}>마음에 드는 코스에 ♥ 을 눌러보세요</div>
          </div>
        );
      }
      // Has likes but all are private/deleted
      return (
        <div style={emptyWrap}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>♥</div>
          <div style={emptyTitle}>좋아요한 코스가 모두 비공개 처리됐어요</div>
          <div style={emptyBody}>코스 작성자가 비공개로 전환했어요</div>
        </div>
      );
    }

    if (activeSortMode === "mine") {
      return (
        <div style={emptyWrap}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🗺️</div>
          <div style={emptyTitle}>아직 만든 코스가 없어요</div>
          <div style={{ ...emptyBody, marginBottom: 24 }}>지도에서 첫 코스를 만들어보세요</div>
          <Link
            href="/map"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              padding: "0 var(--space-8)",
              background: "var(--color-brand)",
              color: "var(--color-text-inverse)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            지도로 가기
          </Link>
        </div>
      );
    }

    // popular / new — no public courses yet
    return (
      <div style={emptyWrap}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🗺️</div>
        <div style={emptyTitle}>아직 공개된 코스가 없어요</div>
        <div style={{ ...emptyBody, marginBottom: 24 }}>지도에서 첫 코스를 만들어보세요</div>
        <Link
          href="/map"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 44,
            padding: "0 var(--space-8)",
            background: "var(--color-brand)",
            color: "var(--color-text-inverse)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          지도로 가기
        </Link>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Sort toggle */}
      <FeedSortToggle
        active={activeSortMode}
        onSelect={handleSortSelect}
        isLoggedIn={isLoggedIn}
        onLoginRequired={() => setShowLogin(true)}
        loading={loading}
      />

      {/* Course list / empty state */}
      <div
        style={{
          padding: 16,
          paddingBottom:
            "calc(var(--bottom-tab-h) + 16px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {courses.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            {courses.map((course) => (
              <div key={course.id} style={{ marginBottom: 16 }}>
                <CourseCard
                  variant="feed"
                  course={course}
                  source="feed"
                  onDetailClick={(id) => router.push(`/course/${id}`)}
                  onLoginRequired={() => setShowLogin(true)}
                />
              </div>
            ))}

            {/* Loading more spinner */}
            {loadingMore && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "16px 0",
                  color: "var(--color-text-tertiary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
                >
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                불러오는 중...
              </div>
            )}

            {/* End of list */}
            {!hasMore && !loadingMore && (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                더 이상 코스가 없어요
              </div>
            )}

            {/* IntersectionObserver sentinel */}
            <div ref={sentinelRef} style={{ height: 1 }} />
          </>
        )}
      </div>

      {/* Login modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}

// ── Shared empty-state styles ─────────────────────────────────────────────────

const emptyWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 24px",
  textAlign: "center",
};

const emptyTitle: React.CSSProperties = {
  fontSize: "var(--text-xl)",
  fontWeight: 700,
  color: "var(--color-text-primary)",
  marginBottom: 8,
};

const emptyBody: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text-secondary)",
};
