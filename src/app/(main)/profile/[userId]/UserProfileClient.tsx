"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCourseThumbnail } from "@/lib/map-utils";

interface UserProfileClientProps {
  userId: string;
  profile: any;
  courses: any[];
  totalLikes: number;
  initialBookmarked: boolean;
}

export default function UserProfileClient({ userId, profile, courses, totalLikes }: UserProfileClientProps) {
  const router = useRouter();

  const nickname = profile.nickname || "루트북 유저";
  const bio = profile.bio || "";
  const instagram = profile.instagram || "";
  const avatarUrl = profile.avatar_url || "";

  return (
    <div style={{ minHeight: "100%", background: "#FFFFFF" }}>
      {/* 상단 바 */}
      <div style={{
        display: "flex", alignItems: "center", padding: "12px 16px",
        borderBottom: "0.5px solid #E0E0E0", position: "sticky", top: 0, background: "#FFFFFF", zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{
          width: 32, height: 32, borderRadius: "50%", border: "none",
          background: "#F4F4F4", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 600, color: "#1A1A1A", marginRight: 32 }}>
          {nickname}님의 프로필
        </div>
      </div>

      {/* 프로필 상단 */}
      <div style={{ padding: "32px 16px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "#0066FF", color: "#fff",
            fontSize: 24, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {nickname.charAt(0).toUpperCase()}
          </div>
        )}

        <span style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{nickname}</span>

        {bio && (
          <div style={{ fontSize: 13, color: "#6B7B8D", textAlign: "center" }}>{bio}</div>
        )}

        {instagram && (
          <a
            href={`https://instagram.com/${instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: "#0066FF", fontWeight: 500, textDecoration: "none" }}
          >
            @{instagram}
          </a>
        )}
      </div>

      {/* 통계 */}
      <div style={{
        display: "flex", margin: "0 16px", padding: "16px 0",
        borderTop: "1px solid #F4F4F4", borderBottom: "1px solid #F4F4F4",
      }}>
        {[
          { label: "만든 코스", value: courses.length },
          { label: "받은 좋아요", value: totalLikes },
        ].map((stat, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 1 ? "1px solid #f1f5f9" : "none" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "#999999", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 코스 목록 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 10px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>이 사람의 코스</div>
        <div style={{ fontSize: 12, color: "#999999" }}>총 {courses.length}개</div>
      </div>

      <div style={{ padding: "0 16px 80px" }}>
        {courses.length === 0 ? (
          <div style={{
            padding: "40px 20px", textAlign: "center", background: "#F4F4F4", borderRadius: 12,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 32 }}>🗺️</span>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>아직 올린 코스가 없어요</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {courses.map((course: any, idx: number) => {
              const rotations = [-2, 1.5, -1, 2, -1.5, 1];
              const rotation = rotations[idx % rotations.length];
              return (
                <div
                  key={course.id}
                  onClick={() => router.push(`/course/${course.id}`)}
                  style={{ cursor: "pointer", padding: "4px 2px" }}
                >
                  <div style={{
                    background: "#ffffff", borderRadius: 6,
                    boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
                    transform: `rotate(${rotation}deg)`,
                    overflow: "hidden",
                  }}>
                    {/* Photo */}
                    <div style={{ padding: "4px 4px 0" }}>
                      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 4, overflow: "hidden", background: "#F4F4F4" }}>
                        <CourseThumb url={getCourseThumbnail(course.waypoints, course.route_geojson, "300x300")} />
                      </div>
                    </div>
                    {/* Caption */}
                    <div style={{ padding: "6px 5px 8px" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#222222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 9, color: "#6a6a6a", marginTop: 2 }}>
                        {course.distance_km}km
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseThumb({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  if (!url) return null;
  return (
    <img
      src={url} alt=""
      onLoad={() => setLoaded(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
    />
  );
}
