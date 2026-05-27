"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import { containsBannedWord } from "@/lib/text-filter";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profiles: { nickname: string; avatar_url: string } | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const month = Math.floor(day / 30);
  return `${month}달 전`;
}

export default function CourseComments({ courseId, courseOwnerId, onCommentsChange }: { courseId: string; courseOwnerId: string; onCommentsChange?: (comments: { nickname: string; text: string }[]) => void }) {
  const supabase = createClient();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, text, created_at, user_id, profiles(nickname, avatar_url)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setComments(data as any);
    setLoaded(true);
  }, [courseId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // 댓글 변경 시 상위 컴포넌트에 알림
  useEffect(() => {
    if (!loaded) return;
    onCommentsChange?.(comments.map((c) => ({ nickname: c.profiles?.nickname || "유저", text: c.text })));
  }, [comments, loaded]);

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;

    let currentUser = user;
    if (!currentUser) {
      const { data: { session } } = await supabase.auth.getSession();
      currentUser = session?.user ?? null;
    }
    if (!currentUser) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/course/${courseId}`)}`;
      return;
    }

    if (containsBannedWord(text)) {
      setText("");
      return;
    }

    setSending(true);

    // 낙관적 업데이트
    const tempId = crypto.randomUUID();
    const optimistic: Comment = {
      id: tempId,
      text: text.trim(),
      created_at: new Date().toISOString(),
      user_id: currentUser.id,
      profiles: { nickname: "나", avatar_url: "" },
    };
    setComments((prev) => [optimistic, ...prev]);
    setText("");

    const { data, error } = await supabase
      .from("comments")
      .insert({ course_id: courseId, user_id: currentUser.id, text: optimistic.text })
      .select("id, text, created_at, user_id, profiles(nickname, avatar_url)")
      .single();

    if (error || !data) {
      // 실패 시 롤백
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    } else {
      // 임시 댓글을 실제 데이터로 교체
      setComments((prev) => prev.map((c) => c.id === tempId ? (data as any) : c));
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await supabase.from("comments").delete().eq("id", commentId);
  };

  const visible = showAll ? comments : comments.slice(0, 3);
  const currentUserId = user?.id;

  if (!loaded) return null;

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#222222" }}>후기</span>
        <span style={{ fontSize: 13, color: "#6a6a6a" }}>{comments.length}개</span>
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <div style={{
          padding: "20px 0", textAlign: "center",
          fontSize: 13, color: "#999999",
        }}>
          아직 후기가 없어요. 첫 후기를 남겨보세요!
        </div>
      ) : (
        <>
          {visible.map((comment) => {
            const nickname = comment.profiles?.nickname || "루트북 유저";
            const avatarUrl = comment.profiles?.avatar_url;
            const canDelete = currentUserId === comment.user_id || currentUserId === courseOwnerId;

            return (
              <div key={comment.id} style={{
                display: "flex", gap: 10, padding: "10px 0",
                borderBottom: "0.5px solid #f2f2f2",
              }}>
                {/* Avatar */}
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "#222222", color: "#fff", fontSize: 11, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#222222" }}>{nickname}</span>
                    <span style={{ fontSize: 11, color: "#999999" }}>{timeAgo(comment.created_at)}</span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        style={{
                          marginLeft: "auto", background: "none", border: "none",
                          fontSize: 11, color: "#c1c1c1", cursor: "pointer", padding: "2px 4px",
                        }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#4D4D4D", lineHeight: 1.5, marginTop: 2, wordBreak: "break-word" }}>
                    {comment.text}
                  </div>
                </div>
              </div>
            );
          })}
          {comments.length > 3 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                width: "100%", padding: "10px 0", background: "none", border: "none",
                fontSize: 13, color: "#6a6a6a", cursor: "pointer", fontWeight: 500,
              }}
            >
              후기 {comments.length - 3}개 더 보기
            </button>
          )}
        </>
      )}

      {/* Input */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        marginTop: 12, padding: "10px 12px",
        background: "#f8f8f6", borderRadius: 12,
      }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 200))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSubmit(); }}
          placeholder={currentUserId ? "후기를 남겨주세요..." : "로그인하고 후기를 남겨보세요"}
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 13, color: "#222222",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={sending || !text.trim()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 14, color: text.trim() ? "var(--color-brand)" : "#c1c1c1",
            fontWeight: 600, flexShrink: 0, padding: "4px",
          }}
        >
          등록
        </button>
      </div>
      {text.length > 0 && (
        <div style={{ fontSize: 11, color: "#999999", textAlign: "right", marginTop: 4 }}>{text.length}/200</div>
      )}
    </div>
  );
}
