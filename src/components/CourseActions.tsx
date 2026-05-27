"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import { useToast } from "@/hooks/useToast";
import LikeButton from "./LikeButton";
import ShareButton from "./ShareButton";

interface CourseActionsProps {
  courseId: string;
  likeCount: number;
  initialLiked: boolean;
  ownerId?: string;
  compact?: boolean;
  courseTitle?: string;
  courseDescription?: string;
  courseThumbnail?: string;
}

export default function CourseActions({ courseId, likeCount, initialLiked, ownerId, compact = false, courseTitle, courseDescription, courseThumbnail }: CourseActionsProps) {
  const { user, profile } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();
  const router = useRouter();
  const isAdmin = profile?.role === "admin";
  const isOwner = (!!user && user.id === ownerId) || isAdmin;
  const [featured, setFeatured] = useState(false);
  const [featuredLabel, setFeaturedLabel] = useState("추천");
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("featured_courses").select("label").eq("course_id", courseId).single()
      .then(({ data }) => { if (data) { setFeatured(true); setFeaturedLabel(data.label); } });
  }, [courseId, isAdmin]);

  const toggleFeatured = async () => {
    if (featured) {
      await supabase.from("featured_courses").delete().eq("course_id", courseId);
      setFeatured(false);
      showToast("추천 해제됨");
    } else {
      setShowFeaturedModal(true);
    }
  };

  const confirmFeatured = async () => {
    await supabase.from("featured_courses").insert({ course_id: courseId, label: featuredLabel });
    setFeatured(true);
    setShowFeaturedModal(false);
    showToast("추천 등록됨");
  };

  return (
    <>
      <div style={{ display: "flex", gap: compact ? 8 : 12, padding: compact ? 0 : "12px 20px", alignItems: "center" }}>
        <LikeButton courseId={courseId} initialLikeCount={likeCount} initialLiked={initialLiked} ownerId={ownerId} onLoginRequired={() => setShowLogin(true)} />
        <ShareButton courseId={courseId} title={courseTitle} description={courseDescription} thumbnailUrl={courseThumbnail} />
        {isAdmin && (
          <button onClick={toggleFeatured} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={featured ? "var(--color-brand)" : "none"} stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
            </svg>
          </button>
        )}
        {isOwner && (
          <>
            <button onClick={() => router.push(`/create?edit=${courseId}`)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowDelete(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            </button>
          </>
        )}
      </div>
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", borderRadius: 20, padding: 28, width: "min(320px, calc(100% - 48px))", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
            <span style={{ fontSize: 36 }}>🗑️</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#222222" }}>코스를 삭제할까요?</div>
            <div style={{ fontSize: 14, color: "#6a6a6a", lineHeight: 1.43 }}>삭제하면 복구할 수 없어요</div>
            <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 4 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #dddddd", background: "#ffffff", fontSize: 16, fontWeight: 500, color: "#222222", cursor: "pointer" }}>취소</button>
              <button onClick={async () => { if (!user) return; let q = supabase.from("courses").delete().eq("id", courseId); if (!isAdmin) q = q.eq("user_id", user.id); const { error } = await q; if (error) { showToast("삭제에 실패했어요"); } else { showToast("코스가 삭제됐어요"); router.push("/map"); } setShowDelete(false); }} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: "var(--color-brand)", fontSize: 16, fontWeight: 500, color: "#fff", cursor: "pointer" }}>삭제</button>
            </div>
          </div>
        </div>
      )}
      {showLogin && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", borderRadius: 20, padding: 28, width: "min(320px, calc(100% - 48px))", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
            <span style={{ fontSize: 36 }}>🔒</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#222222" }}>로그인이 필요해요</div>
            <div style={{ fontSize: 14, color: "#6a6a6a", lineHeight: 1.43 }}>이 코스를 저장하려면 로그인해주세요</div>
            <button onClick={() => setShowLogin(false)} style={{ marginTop: 4, width: "100%", padding: "12px 0", borderRadius: 8, border: "1px solid #dddddd", background: "#ffffff", fontSize: 16, fontWeight: 500, color: "#222222", cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      )}
      {showFeaturedModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", borderRadius: 20, padding: 28, width: "min(320px, calc(100% - 48px))", display: "flex", flexDirection: "column", gap: 12, boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#222222" }}>추천 코스 등록</div>
            <input
              type="text" value={featuredLabel} onChange={(e) => setFeaturedLabel(e.target.value)}
              placeholder="라벨 (예: 🌸 봄 드라이브)"
              maxLength={20}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #E0E0E0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowFeaturedModal(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #dddddd", background: "#ffffff", fontSize: 14, fontWeight: 500, color: "#222222", cursor: "pointer" }}>취소</button>
              <button onClick={confirmFeatured} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: "var(--color-brand)", fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer" }}>등록</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
