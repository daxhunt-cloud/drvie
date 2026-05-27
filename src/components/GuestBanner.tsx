"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

interface GuestBannerProps {
  courseId: string;
}

export default function GuestBanner({ courseId }: GuestBannerProps) {
  const { user, loading } = useAuth();
  if (loading || user) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "#222222", padding: "16px 20px", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>이 코스가 마음에 드셨나요?</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>로그인하고 저장해보세요</div>
      </div>
      <Link href={`/login?redirect=/course/${courseId}`} style={{ textDecoration: "none" }}>
        <button style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "var(--color-brand)", color: "#ffffff", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>시작하기</button>
      </Link>
    </div>
  );
}
