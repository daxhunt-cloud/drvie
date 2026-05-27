"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import { containsBannedWord } from "@/lib/text-filter";

function SettingItem({ icon, iconBg, label, right, onClick, danger }: {
  icon: string; iconBg: string; label: string; right?: React.ReactNode; onClick?: () => void; danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", borderBottom: "0.5px solid #F4F4F4",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: 15, color: danger ? "#DC2626" : "#1e293b" }}>{label}</span>
      {right ?? (onClick ? <span style={{ fontSize: 16, color: "#999999" }}>›</span> : null)}
    </div>
  );
}

export default function SettingsPage() {
  const supabase = createClient();
  const { user, profile, loading, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [courseCount, setCourseCount] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);

  const saveField = async (field: string, value: string) => {
    if (!user) return false;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
    if (error) { showToast("저장에 실패했어요"); setSaving(false); return false; }
    await refreshProfile();
    setSaving(false);
    return true;
  };

  const saveNickname = async () => {
    const v = nickDraft.trim();
    if (!v) { showToast("닉네임을 입력해주세요"); setNickDraft(profile?.nickname || ""); setEditingNick(false); return; }
    if (containsBannedWord(v)) { showToast("부적절한 표현이 포함돼 있어요"); return; }
    const ok = await saveField("nickname", v);
    if (ok) showToast("닉네임이 변경됐어요");
    setEditingNick(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) { showToast("이미지는 2MB 이하만 업로드 가능해요"); return; }
    setUploading(true);
    setLocalAvatar(URL.createObjectURL(file));

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    await supabase.storage.from("avatars").remove([path]);
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { setUploading(false); setLocalAvatar(null); showToast("업로드에 실패했어요"); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq("id", user.id);
    await refreshProfile();
    setUploading(false);
    showToast("프로필 사진이 변경됐어요");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Fetch stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, like_count")
        .eq("user_id", user.id);
      const list = courses || [];
      setCourseCount(list.length);
      setTotalLikes(list.reduce((sum: number, c: any) => sum + (c.like_count ?? 0), 0));
    })();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/settings");
  }, [loading, user, router]);

  if (loading || !profile) {
    return <div style={{ minHeight: "100%", background: "#FFFFFF" }} />;
  }

  const nickname = profile?.nickname || "루트북 유저";
  const avatarUrl = profile?.avatar_url || "";

  return (
    <div style={{ minHeight: "100%", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", padding: "12px 16px",
        borderBottom: "0.5px solid #E0E0E0",
        position: "sticky", top: 0, background: "#FFFFFF", zIndex: 10,
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
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginRight: 32 }}>설정</div>
      </div>

      {/* Profile section */}
      <div style={{ padding: "24px 16px", display: "flex", alignItems: "center", gap: 14, borderBottom: "0.5px solid #F4F4F4" }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarUpload(file);
              e.target.value = "";
            }}
          />
          {(localAvatar || avatarUrl) ? (
            <img src={localAvatar || avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#0066FF", color: "#fff",
              fontSize: 20, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {nickname.charAt(0).toUpperCase()}
            </div>
          )}
          {uploading && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff", borderRadius: "50%", display: "block",
                animation: "spin 0.6s linear infinite",
              }} />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: "absolute", bottom: -2, right: -2,
              width: 22, height: 22, borderRadius: "50%",
              background: "#FFFFFF", border: "1px solid #E0E0E0",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        {/* Name + stats */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {editingNick ? (
              <input
                autoFocus
                maxLength={20}
                value={nickDraft}
                onChange={(e) => setNickDraft(e.target.value)}
                onBlur={saveNickname}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); saveNickname(); }
                  if (e.key === "Escape") { setNickDraft(nickname); setEditingNick(false); }
                }}
                style={{
                  fontSize: 16, fontWeight: 700, color: "#1A1A1A",
                  border: "none", borderBottom: "2px solid #2563EB",
                  outline: "none", background: "transparent", width: 140,
                }}
              />
            ) : (
              <>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{nickname}</span>
                <button
                  onClick={() => { setNickDraft(nickname); setEditingNick(true); }}
                  style={{
                    width: 20, height: 20, border: "none", background: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "#999999" }}>
            <span>코스 {courseCount}개</span>
            <span>좋아요 {totalLikes}개</span>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: "8px 0 0" }}>
        <div style={{ padding: "12px 16px 4px", fontSize: 11, color: "#999999", fontWeight: 600 }}>정보</div>
        <SettingItem icon="📄" iconBg="#f1f5f9" label="서비스 이용약관" onClick={() => router.push("/terms")} />
        <SettingItem icon="🔒" iconBg="#f1f5f9" label="개인정보처리방침" onClick={() => router.push("/privacy")} />
        <SettingItem icon="📧" iconBg="#f1f5f9" label="개발자 이메일" right={<span style={{ fontSize: 13, color: "#999999" }}>sansu423@gmail.com</span>} onClick={() => window.location.href = "mailto:sansu423@gmail.com"} />
        <SettingItem icon="📲" iconBg="#FFF0F5" label="앱 설치하기" onClick={() => {
          const deferredPrompt = (window as any).__pwaPrompt;
          if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => { (window as any).__pwaPrompt = null; });
          } else {
            showToast("브라우저 메뉴에서 '홈 화면에 추가'를 눌러주세요");
          }
        }} />
        <SettingItem icon="ℹ️" iconBg="#f1f5f9" label="앱 버전" right={<span style={{ fontSize: 13, color: "#999999" }}>v0.2.0</span>} />

        <div style={{ padding: "16px 16px 4px", fontSize: 11, color: "#999999", fontWeight: 600 }}>계정 관리</div>
        <SettingItem icon="🚪" iconBg="#f1f5f9" label="로그아웃" onClick={() => setShowLogout(true)} />
        <SettingItem icon="⚠️" iconBg="#FFF0F0" label="회원탈퇴" onClick={() => setShowDelete(true)} danger />
      </div>

      {/* Logout modal */}
      {showLogout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 20, width: "min(300px, calc(100% - 48px))", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>로그아웃 할까요?</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowLogout(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "0.5px solid #E0E0E0", background: "transparent", fontSize: 14, fontWeight: 600, color: "#1A1A1A", cursor: "pointer" }}>취소</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#1e293b", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" }}>로그아웃</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 20, width: "min(300px, calc(100% - 48px))", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>정말 탈퇴할까요?</div>
            <div style={{ fontSize: 13, color: "#999999", lineHeight: 1.5 }}>탈퇴하면 모든 코스와 데이터가 삭제되며{"\n"}복구할 수 없어요</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "0.5px solid #E0E0E0", background: "transparent", fontSize: 14, fontWeight: 600, color: "#1A1A1A", cursor: "pointer" }}>취소</button>
              <button onClick={async () => {
                setShowDelete(false);
                showToast("탈퇴 처리 중...");
                try {
                  const res = await fetch("/api/delete-account", { method: "POST" });
                  if (!res.ok) { showToast("탈퇴에 실패했어요. 다시 시도해주세요"); return; }
                  window.location.href = "/login";
                } catch {
                  showToast("탈퇴에 실패했어요. 다시 시도해주세요");
                }
              }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#FF4D4D", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" }}>탈퇴하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
