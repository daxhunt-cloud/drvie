"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "./AuthProvider";
import CourseActions from "./CourseActions";
import CourseComments from "./CourseComments";
import { getCourseThumbnail } from "@/lib/map-utils";

const CoursePlayer = dynamic(() => import("./CoursePlayer"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 12, background: "#f4f4f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ width: 24, height: 24, border: "3px solid #e2e8f0", borderTopColor: "var(--color-brand)", borderRadius: "50%", display: "block", animation: "spin 0.6s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

interface CourseDetailProps {
  course: any;
  authorName?: string;
  isDraft?: boolean;
  isExternal?: boolean;
  onUpload?: () => void;
  onEdit?: () => void;
  uploading?: boolean;
}

export default function CourseDetail({ course, authorName = "익명", isDraft = false, isExternal = false, onUpload, onEdit, uploading }: CourseDetailProps) {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const waypoints = course.waypoints as { lng: number; lat: number; name: string }[];
  const music = course.music as ({ videoId: string; startSec: number; endSec: number | null } | null);
  const [playerFs, setPlayerFs] = useState(false);
  const [playerComments, setPlayerComments] = useState<{ nickname: string; text: string }[]>([]);

  return (
    <>
      {/* Polaroid stack container */}
      <div style={{ position: "relative", padding: "24px 0 16px", width: "85%", margin: "0 auto" }}>
        {/* Back polaroid (decorative) */}
        <div style={{
          position: "absolute", top: 16, left: "50%", width: "92%", height: "100%",
          transform: "translateX(-50%) rotate(-4deg)",
          background: "#f7f7f7", borderRadius: 20,
          boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
          zIndex: 0,
        }} />
        {/* Main polaroid */}
        <div style={{
          position: "relative", background: "#ffffff", borderRadius: 20,
          boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
          zIndex: 1,
        }}>
          {/* Photo area */}
          <div style={{ padding: "5% 5% 0", display: "flex", justifyContent: "center" }}>
            {course.route_geojson && waypoints.length >= 2 && (
              <div style={{ width: "100%", borderRadius: 14, overflow: "hidden", background: "#222222" }}>
                <CoursePlayer routeGeojson={course.route_geojson} waypoints={waypoints} music={music} title={course.title} distanceKm={course.distance_km} durationMin={course.duration_min} tags={course.tags || []} photos={course.photos || []} comments={playerComments} authorName={authorName} authorAvatar={course.profiles?.avatar_url} onFullscreenChange={setPlayerFs} />
              </div>
            )}
          </div>
          {/* Bottom caption */}
          <div style={{ padding: "16px 18px 18px" }}>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: "#222222", margin: "0 0 10px", lineHeight: 1.18, letterSpacing: -0.44 }}>{course.title}</h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div onClick={() => { if (course.user_id) window.location.href = `/profile/${course.user_id}`; }} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 0 }}>
                {course.profiles?.avatar_url ? (
                  <img src={course.profiles.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "#222222", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600 }}>{authorName.charAt(0).toUpperCase()}</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#222222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authorName}</div>
                  <div style={{ fontSize: 10, color: "#6a6a6a" }}>{course.distance_km}km</div>
                </div>
              </div>
              {!isDraft && (<div style={{ flexShrink: 0 }}><CourseActions courseId={course.id} likeCount={course.like_count ?? 0} initialLiked={false} ownerId={course.user_id} compact courseTitle={course.title} courseDescription={course.description} courseThumbnail={getCourseThumbnail(course.waypoints, course.route_geojson, "600x600")} /></div>)}
            </div>
            {course.description && <p style={{ fontSize: 14, color: "#6a6a6a", margin: "0 0 12px", lineHeight: 1.43 }}>{course.description}</p>}
            {(waypoints.length >= 2 || course.tags?.length > 0) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
                {waypoints.length >= 2 && (
                  <span style={{ padding: "4px 12px", borderRadius: 14, background: "var(--color-brand)", color: "#ffffff", fontSize: 12, fontWeight: 500 }}>
                    {waypoints[0].name} → {waypoints[waypoints.length - 1].name}
                  </span>
                )}
                {course.tags?.map((tag: string) => (<span key={tag} style={{ padding: "4px 12px", borderRadius: 14, background: "#ffffff", color: "#222222", fontSize: 12, fontWeight: 500, border: "1px solid #c1c1c1" }}>#{tag}</span>))}
                {music && <span style={{ padding: "4px 12px", borderRadius: 14, background: "#ffffff", color: "var(--color-brand)", fontSize: 12, fontWeight: 500, border: "1px solid var(--color-brand)" }}>#music</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments section */}
      {!isDraft && !playerFs && (
        <div style={{ padding: "36px 0 24px" }}>
          <CourseComments courseId={course.id} courseOwnerId={course.user_id} onCommentsChange={(list) => setPlayerComments(list.map((c) => ({ nickname: c.nickname, text: c.text })))} />
        </div>
      )}

      {!isDraft && !playerFs && waypoints.length >= 2 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
          background: "#ffffff", borderTop: "1px solid #f2f2f2",
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}>
          {isExternal ? (
            <button onClick={() => { window.location.href = `/map?course=${course.id}`; }} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: "var(--color-brand)", color: "#fff", fontSize: 16, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>루트북에서 자세히 보기
            </button>
          ) : isLoggedIn ? (
            <>
              <button onClick={() => { const wps=waypoints,sp=`${wps[0].lat},${wps[0].lng}`,ep=`${wps[wps.length-1].lat},${wps[wps.length-1].lng}`,middle=wps.slice(1,-1),vpKeys=["vp","vp2","vp3","vp4","vp5"];let viaParams="";if(middle.length<=5){middle.forEach((wp,i)=>{viaParams+=`&${vpKeys[i]}=${wp.lat},${wp.lng}`})}else{const step=middle.length/5;for(let i=0;i<5;i++){const wp=middle[Math.round(i*step)];viaParams+=`&${vpKeys[i]}=${wp.lat},${wp.lng}`}}const kakaoAppUrl=`kakaomap://route?sp=${sp}${viaParams}&ep=${ep}&by=car`,startWp=wps[0],endWp=wps[wps.length-1],kakaoWebUrl=`https://map.kakao.com/link/from/${encodeURIComponent(startWp.name)},${startWp.lat},${startWp.lng}/to/${encodeURIComponent(endWp.name)},${endWp.lat},${endWp.lng}`;if(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)){const t=Date.now();window.location.href=kakaoAppUrl;setTimeout(()=>{if(Date.now()-t<2000)window.open(kakaoWebUrl,"_blank")},1500)}else{window.open(kakaoWebUrl,"_blank")}}} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: "#FEE500", color: "#222222", fontSize: 16, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#222222"><path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-.95 3.47c-.08.28.25.52.49.35l4.07-2.74c.57.06 1.15.09 1.73.09 5.52 0 10-3.58 10-7.94S17.52 3 12 3z"/></svg>카카오맵으로 길찾기
              </button>
              {waypoints.length > 2 && <div style={{ fontSize: 11, color: "#6a6a6a", textAlign: "center", marginTop: 4 }}>웹에서는 출발·도착지만 표시돼요. 전체 경로는 카카오맵 앱에서 확인하세요.</div>}
            </>
          ) : (
            <button onClick={() => { window.location.href = `/login?redirect=${encodeURIComponent(`/course/${course.id}`)}`; }} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: "var(--color-brand)", color: "#fff", fontSize: 16, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>로그인하고 루트북 시작하기
            </button>
          )}
        </div>
      )}

      {isDraft && !playerFs && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20, paddingBottom: "env(safe-area-inset-bottom, 0px)", background: "#ffffff", borderTop: "1px solid #f2f2f2", padding: "16px", display: "flex", gap: 12 }}>
          <button onClick={onEdit} style={{ flex: 1, padding: "14px 0", borderRadius: 8, border: "1px solid #dddddd", background: "#ffffff", fontSize: 16, fontWeight: 500, color: "#222222", cursor: "pointer" }}>수정하기</button>
          <button onClick={onUpload} disabled={uploading} style={{ flex: 2, padding: "14px 0", borderRadius: 8, border: "none", background: "var(--color-brand)", color: "#fff", fontSize: 16, fontWeight: 500, cursor: uploading ? "wait" : "pointer", opacity: uploading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {uploading && <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />}
            {uploading ? "올리는 중..." : "피드에 올리기"}
          </button>
        </div>
      )}
    </>
  );
}
