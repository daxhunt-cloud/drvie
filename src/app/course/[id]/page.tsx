import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

const CoursePlayer = dynamic(() => import("@/components/CoursePlayer"), { ssr: false });

interface CoursePageProps {
  params: { id: string };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !course) notFound();

  const waypoints = course.waypoints as { lng: number; lat: number; name: string }[];
  const routeGeojson = course.route_geojson as { type: string; coordinates: [number, number][] } | null;
  const music = course.music as { videoId: string; startSec: number; endSec: number | null } | null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
        {course.title}
      </h1>

      {course.description && (
        <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 16px" }}>{course.description}</p>
      )}

      {course.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {course.tags.map((tag: string) => (
            <span
              key={tag}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                background: "#eff6ff",
                color: "#2563eb",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Route animation player */}
      {routeGeojson && waypoints.length >= 2 && (
        <div style={{ marginBottom: 24 }}>
          <CoursePlayer routeGeojson={routeGeojson} waypoints={waypoints} music={music} title={course.title} distanceKm={course.distance_km} tags={course.tags || []} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "16px 20px",
          background: "#f8fafc",
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>거리</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{course.distance_km}km</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>소요시간</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            {course.duration_min >= 60
              ? `${Math.floor(course.duration_min / 60)}시간 ${course.duration_min % 60}분`
              : `${course.duration_min}분`}
          </div>
        </div>
        {music && (
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>음악</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>YouTube 첨부됨</div>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 12px" }}>
        경유지 ({waypoints.length})
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {waypoints.map((wp, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
              borderBottom: i < waypoints.length - 1 ? "1px solid #f1f5f9" : "none",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#ef4444",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 14, color: "#334155" }}>{wp.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
