"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/useToast";
import CourseDetail from "@/components/CourseDetail";

export default function PreviewPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    (async () => {
      // authLoading을 기다리지 않고 직접 세션 확인
      let currentUser = user;
      if (!currentUser) {
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user ?? null;
      }
      if (!currentUser) { router.replace("/login"); return; }
      const { data } = await supabase.from("courses").select("*, profiles(nickname, avatar_url)").eq("id", courseId).single();
      if (!data) { router.replace("/map"); return; }
      if (data.user_id !== currentUser.id) { router.replace("/map"); return; }
      if (data.visibility !== "draft") { router.replace(`/course/${courseId}`); return; }
      setCourse(data);
      setIsEdit(sessionStorage.getItem("preview_is_edit") === "true");
      setLoading(false);
    })();
  }, [courseId]);

  const handleUpload = async () => {
    let currentUser = user;
    if (!currentUser) {
      const { data: { session } } = await supabase.auth.getSession();
      currentUser = session?.user ?? null;
    }
    if (!currentUser) return;
    setUploading(true);
    const { error } = await supabase.from("courses").update({ visibility: "public" }).eq("id", courseId).eq("user_id", currentUser.id);
    if (error) { showToast("업로드에 실패했어요"); setUploading(false); return; }
    showToast("코스가 피드에 올라갔어요! 🎉");
    sessionStorage.removeItem("create_draft");
    sessionStorage.removeItem("preview_is_edit");
    router.push("/map");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ width: 24, height: 24, border: "3px solid #e2e8f0", borderTopColor: "#0066FF", borderRadius: "50%", display: "block", animation: "spin 0.6s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!course) return null;

  const authorProfile = course.profiles as { nickname: string; avatar_url: string } | null;

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto",
      padding: "24px 16px",
      paddingBottom: "calc(140px + env(safe-area-inset-bottom, 0px))",
      fontFamily: "inherit",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setShowExitConfirm(true)}
          style={{ fontSize: 14, color: "#6B7B8D", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
        >
          나가기
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 600, color: "#1A1A1A", marginRight: 40 }}>코스 미리보기</div>
      </div>

      {/* Exit confirm modal */}
      {showExitConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 20, width: "min(320px, calc(100% - 48px))", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>코스 작성을 그만할까요?</div>
            <div style={{ fontSize: 13, color: "#999999", lineHeight: 1.5 }}>{isEdit ? "수정 내용이 저장되지 않아요" : "나가면 작성 중인 코스가 삭제돼요"}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowExitConfirm(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "0.5px solid #E0E0E0", background: "transparent", fontSize: 14, fontWeight: 600, color: "#1A1A1A", cursor: "pointer" }}>계속 작성</button>
              <button onClick={async () => {
                setShowExitConfirm(false);
                let exitUser = user;
                if (!exitUser) {
                  const { data: { session } } = await supabase.auth.getSession();
                  exitUser = session?.user ?? null;
                }
                if (exitUser) {
                  if (isEdit) {
                    await supabase.from("courses").update({ visibility: "public" }).eq("id", courseId).eq("user_id", exitUser.id);
                  } else {
                    await supabase.from("courses").delete().eq("id", courseId).eq("user_id", exitUser.id);
                  }
                }
                sessionStorage.removeItem("preview_is_edit");
                sessionStorage.removeItem("create_draft");
                router.push("/map");
              }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#FF4D4D", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" }}>나가기</button>
            </div>
          </div>
        </div>
      )}
      <CourseDetail
        course={course}
        authorName={authorProfile?.nickname || "익명"}
        isDraft
        onUpload={handleUpload}
        onEdit={() => router.push(`/create?edit=${courseId}`)}
        uploading={uploading}
      />
    </div>
  );
}
