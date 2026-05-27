"use client";

import { useEffect, useState } from "react";
import CourseDetail from "./CourseDetail";
import GuestBanner from "./GuestBanner";
import BackButton from "./BackButton";
import { useAuth } from "./AuthProvider";

interface CourseDetailPageProps {
  course: any;
}

export default function CourseDetailPage({ course }: CourseDetailPageProps) {
  const { user } = useAuth();
  const authorProfile = course.profiles as { nickname: string; avatar_url: string } | null;
  const authorName = authorProfile?.nickname || "익명";
  const [isExternal, setIsExternal] = useState(true);

  useEffect(() => {
    // If user has visited the app (map page), they're internal
    const visited = sessionStorage.getItem("routebook_app");
    setIsExternal(!visited);
  }, []);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#ffffff",
      fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif",
    }}>
      <div style={{
        maxWidth: 480, margin: "0 auto",
        padding: "24px 16px 100px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: -18 }}>
            <img src="/icon-rounded.png" alt="Routebook" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#222222", letterSpacing: -0.3 }}>Routebook</span>
          </div>
          {!isExternal && <div style={{ position: "absolute", left: 0 }}><BackButton /></div>}
        </div>
        <CourseDetail course={course} authorName={authorName} isExternal={isExternal} />
        {!isExternal && <GuestBanner courseId={course.id} />}
      </div>
    </div>
  );
}
