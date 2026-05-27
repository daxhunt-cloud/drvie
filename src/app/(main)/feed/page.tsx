import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import FeedClient from "./FeedClient";
import { type FeedSortMode } from "@/components/FeedSortToggle";

export const metadata: Metadata = {
  title: "루트북 인기 코스 피드 — Routebook",
  description: "드라이버들이 공유한 인기 드라이브 코스를 만나보세요",
};

// ── Skeleton (3 grey card blocks) ─────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div style={{ padding: "16px 16px 0" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            marginBottom: 16,
            animation: "skeletonPulse 1.4s ease-in-out infinite",
          }}
        >
          {/* Thumbnail placeholder */}
          <div
            style={{
              width: "100%",
              height: 180,
              background: "var(--color-bg-alt)",
            }}
          />
          {/* Text placeholders */}
          <div
            style={{
              background: "var(--color-bg)",
              padding: "12px 16px 16px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              style={{
                width: "60%",
                height: 16,
                background: "var(--color-bg-alt)",
                borderRadius: "var(--radius-sm)",
                marginBottom: 8,
              }}
            />
            <div
              style={{
                width: "40%",
                height: 12,
                background: "var(--color-bg-alt)",
                borderRadius: "var(--radius-sm)",
                marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <div
                style={{
                  width: 48,
                  height: 22,
                  background: "var(--color-bg-alt)",
                  borderRadius: "var(--radius-full)",
                }}
              />
              <div
                style={{
                  width: 48,
                  height: 22,
                  background: "var(--color-bg-alt)",
                  borderRadius: "var(--radius-full)",
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page (RSC) ─────────────────────────────────────────────────────────────────

interface FeedPageProps {
  searchParams?: { sort?: string };
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  // Migrate stale sort params + validate
  // following→liked, region→mine
  const raw = searchParams?.sort;
  const migrated =
    raw === "following" ? "liked" :
    raw === "region"    ? "mine"  :
    raw;
  const validSort: FeedSortMode =
    migrated === "new"   ? "new"   :
    migrated === "liked" ? "liked" :
    migrated === "mine"  ? "mine"  :
    "popular";

  const supabase = createClient();

  // SSR fetch only for popular/new (liked/mine require user context, handled client-side)
  let data: any[] = [];
  if (validSort === "popular" || validSort === "new") {
    const query = supabase
      .from("courses")
      .select(
        "id,title,description,distance_km,like_count,tags,region_tags,photos,user_id,created_at,waypoints,route_geojson,profiles(id,nickname,avatar_url)"
      )
      .eq("visibility", "public")
      .range(0, 19);

    const result =
      validSort === "new"
        ? await query.order("created_at", { ascending: false })
        : await query.order("like_count", { ascending: false });
    data = result.data || [];
  }
  // liked/mine: pass empty array, FeedClient will fetch on client-side

  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedClient initialCourses={data} initialSort={validSort} />
    </Suspense>
  );
}
