"use client";

import { createClient } from "@/lib/supabase/client";

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    const redirectUrl = window.location.href;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`,
      },
    });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF", borderRadius: 16,
          padding: "32px 28px", width: 340,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#1A1A1A" }}>
          로그인
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#999999" }}>
          코스를 저장하려면 로그인이 필요합니다
        </p>

        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%", padding: "12px 24px", borderRadius: 10,
            border: "1px solid #E0E0E0", background: "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontSize: 15, fontWeight: 600, color: "#1A1A1A",
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google로 계속하기
        </button>

        <button
          onClick={onClose}
          style={{
            marginTop: 12, width: "100%", padding: "10px 0",
            background: "none", border: "none",
            color: "#999999", fontSize: 13, cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
