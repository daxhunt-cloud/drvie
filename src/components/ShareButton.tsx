"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";

declare global { interface Window { Kakao: any; } }

interface ShareButtonProps {
  courseId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
}

const KAKAO_JS_KEY = "bfe89e09635c087e0ed76c27905bf697";

export default function ShareButton({ courseId, title, description, thumbnailUrl }: ShareButtonProps) {
  const { showToast } = useToast();
  const supabase = createClient();
  const [pressed, setPressed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // 카카오 SDK 초기화
  useEffect(() => {
    const init = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
    };
    if (window.Kakao) init();
    else {
      const timer = setInterval(() => { if (window.Kakao) { init(); clearInterval(timer); } }, 500);
      return () => clearInterval(timer);
    }
  }, []);

  const courseUrl = `${typeof window !== "undefined" ? window.location.origin : "https://routebook-app.vercel.app"}/course/${courseId}`;

  const shareKakao = () => {
    if (!window.Kakao?.Share) { copyLink(); return; }
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: title || "루트북 코스",
        description: description || "나만의 드라이브 코스를 확인해보세요",
        imageUrl: thumbnailUrl || "https://routebook-app.vercel.app/icon-512.png",
        link: { mobileWebUrl: courseUrl, webUrl: courseUrl },
      },
      buttons: [
        { title: "코스 보러가기", link: { mobileWebUrl: courseUrl, webUrl: courseUrl } },
      ],
    });
    incrementShareCount();
    setShowMenu(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(courseUrl);
    } catch {
      const input = document.createElement("input");
      input.value = courseUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    showToast("링크가 복사됐어요");
    incrementShareCount();
    setShowMenu(false);
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title: title || "루트북 코스", url: courseUrl });
    } catch (err: any) {
      if (err.name === "AbortError") return;
    }
    incrementShareCount();
    setShowMenu(false);
  };

  const incrementShareCount = async () => {
    await supabase.rpc("increment_share_count", { p_course_id: courseId });
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: pressed ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.1s",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute", bottom: 36, right: 0, zIndex: 100,
            background: "#ffffff", borderRadius: 12, padding: 6,
            boxShadow: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
            minWidth: 160,
          }}>
            <button onClick={shareKakao} style={{
              width: "100%", padding: "10px 14px", border: "none", background: "none",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              borderRadius: 8, fontSize: 14, color: "#222222", fontWeight: 500,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FEE500"><rect width="24" height="24" rx="6" fill="#FEE500"/><path d="M12 6C8.69 6 6 8.14 6 10.81c0 1.72 1.14 3.23 2.86 4.09l-.58 2.13c-.05.17.15.32.3.22l2.5-1.68c.3.03.6.05.92.05 3.31 0 6-2.14 6-4.81S15.31 6 12 6z" fill="#3C1E1E"/></svg>
              카카오톡 공유
            </button>
            <button onClick={copyLink} style={{
              width: "100%", padding: "10px 14px", border: "none", background: "none",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              borderRadius: 8, fontSize: 14, color: "#222222", fontWeight: 500,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              링크 복사
            </button>
            {typeof navigator !== "undefined" && !!navigator.share && (
              <button onClick={shareNative} style={{
                width: "100%", padding: "10px 14px", border: "none", background: "none",
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                borderRadius: 8, fontSize: 14, color: "#222222", fontWeight: 500,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                더보기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
