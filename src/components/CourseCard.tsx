"use client";

import { useState } from "react";
import { useLike } from "@/hooks/useLike";
import { getCourseThumbnail } from "@/lib/map-utils";

// ── Utility ──────────────────────────────────────────────────────────────────

function formatRelativeTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const d = new Date(createdAt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    distance_km?: number | null;
    like_count: number;
    tags?: string[];
    region_tags?: string[];
    photos?: string[];           // photos[0] = 대표 사진; 없으면 thumbnail API 사용
    user_id: string;
    created_at?: string;
    waypoints?: { lng: number; lat: number; name: string }[];  // thumbnail 생성용
    route_geojson?: any;                                       // thumbnail 생성용
    profiles?: {
      id?: string;
      nickname: string;
      avatar_url?: string | null;
    } | null;
  };
  variant: "feed" | "popup";
  isLiked?: boolean;
  onClose?: () => void;                        // popup variant 전용 닫기
  onDetailClick?: (courseId: string) => void;  // "자세히 보기" 탭
  source?: "feed" | "map";                     // GA4 추적용 출처
  onLoginRequired?: () => void;                // 비로그인 좋아요 → 부모에 위임
}

// ── Shared pill style (defined outside render to avoid recreation) ────────────

const pillStyle: React.CSSProperties = {
  background: "var(--color-bg-alt)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-full)",
  padding: "3px 8px",
  fontSize: "var(--text-xs)",
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseCard({
  course,
  variant,
  isLiked: initialLikedProp,
  onClose,
  onDetailClick,
  source = "map",
  onLoginRequired,
}: CourseCardProps) {
  // ── Like hook ──────────────────────────────────────────────────────────────
  const { liked, likeCount, toggleLike } = useLike({
    courseId: course.id,
    initialLikeCount: course.like_count,
    initialLiked: initialLikedProp,
    ownerId: course.user_id,
    onLoginRequired,
  });

  // ── Thumbnail: photos[0] → getCourseThumbnail → placeholder ───────────────
  const fallbackThumbnailSrc =
    course.waypoints && course.waypoints.length >= 2
      ? getCourseThumbnail(course.waypoints, course.route_geojson, "400x240")
      : "";
  const initialSrc = course.photos?.[0] || fallbackThumbnailSrc;
  const [imgFailed, setImgFailed] = useState(false);

  // ── Like button pulse animation ────────────────────────────────────────────
  const [likeAnimating, setLikeAnimating] = useState(false);

  const handleLike = () => {
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 150);
    toggleLike();
  };

  // ── Detail click (+ GA4 event) ─────────────────────────────────────────────
  const handleDetailClick = () => {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "course_card_click", {
        course_id: course.id,
        source,
      });
    }
    onDetailClick?.(course.id);
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const nickname = course.profiles?.nickname ?? "익명";
  const avatarUrl = course.profiles?.avatar_url ?? null;
  const thumbnailHeight = variant === "feed" ? 180 : 160;
  const allTags = course.tags ?? [];
  const displayedTags = allTags.slice(0, 2);
  const overflowCount = allTags.length - 2;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <article
      role="article"
      aria-label={`${course.title} 코스, ${nickname}님 작성`}
      style={{
        background: "var(--color-bg)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}
    >
      {/* ── B. Header row: avatar · nickname · · · relative-time · [×close] ── */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${nickname} 프로필 사진`}
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              flexShrink: 0,
              background: "#222222",
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {nickname.charAt(0).toUpperCase()}
          </div>
        )}

        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 120,
          }}
        >
          {nickname}
        </span>

        <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--text-xs)", flexShrink: 0 }}>
          ·
        </span>

        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 400,
            color: "var(--color-text-tertiary)",
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          {course.created_at ? formatRelativeTime(course.created_at) : ""}
        </span>

        {/* Close button — popup variant only */}
        {variant === "popup" && onClose && (
          <button
            onClick={onClose}
            aria-label="코스 카드 닫기"
            style={{
              marginLeft: 8,
              minWidth: 24,
              minHeight: 24,
              border: "none",
              background: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-tertiary)",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── A. Thumbnail ── */}
      {!imgFailed && initialSrc ? (
        <img
          src={initialSrc}
          alt={`${course.title} 코스 경로 지도`}
          loading="lazy"
          onError={() => setImgFailed(true)}
          style={{
            width: "100%",
            height: thumbnailHeight,
            objectFit: "cover",
            borderRadius: 0,
            display: "block",
          }}
        />
      ) : (
        /* Placeholder — map-pin SVG centered on bg-alt */
        <div
          style={{
            width: "100%",
            height: thumbnailHeight,
            background: "var(--color-bg-alt)",
            borderRadius: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      )}

      {/* ── C. Title + description (2-line clamp) ── */}
      <div style={{ padding: "8px 16px 0" }}>
        <div
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            lineHeight: 1.25,
          }}
        >
          {course.title}
        </div>
        {course.description && (
          <div
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 400,
              color: "var(--color-text-secondary)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
              marginTop: 4,
            }}
          >
            {course.description}
          </div>
        )}
      </div>

      {/* ── D. Tag pills — max 2 + "+N" overflow ── */}
      {displayedTags.length > 0 && (
        <div
          style={{
            padding: "8px 16px 0",
            display: "flex",
            gap: 6,
            flexWrap: "nowrap",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {displayedTags.map((tag) => (
            <span key={tag} style={pillStyle}>
              #{tag}
            </span>
          ))}
          {overflowCount > 0 && <span style={pillStyle}>+{overflowCount}</span>}
        </div>
      )}

      {/* ── E. Metrics (🚗 km) + Like button ── */}
      <div
        style={{
          padding: "8px 16px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Distance */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>🚗</span>
          <span>{course.distance_km != null ? `${course.distance_km}km` : "–"}</span>
        </div>

        {/* Like button */}
        <button
          onClick={handleLike}
          aria-label={`${liked ? "좋아요 취소" : "좋아요"} (${likeCount}개)`}
          aria-pressed={liked}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            minWidth: 44,
            minHeight: 36,
            padding: "4px 8px",
            color: liked ? "var(--color-brand)" : "var(--color-text-tertiary)",
            transform: likeAnimating ? "scale(1.2)" : "scale(1)",
            transition: "transform 150ms var(--ease-out)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={liked ? "var(--color-brand)" : "none"}
            stroke={liked ? "var(--color-brand)" : "var(--color-text-tertiary)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ fontSize: "var(--text-xs)" }}>{likeCount}</span>
        </button>
      </div>

      {/* ── F. CTA "자세히 보기" ── */}
      <div style={{ padding: "12px 16px 16px" }}>
        <button
          onClick={handleDetailClick}
          aria-label={`${course.title} 코스 자세히 보기`}
          style={{
            width: "100%",
            height: 44,
            background: "var(--color-brand)",
            color: "var(--color-text-inverse)",
            borderRadius: "var(--radius-md)",
            border: "none",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            cursor: "pointer",
            transition:
              "background 150ms var(--ease-out), transform 100ms var(--ease-out)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          자세히 보기
        </button>
      </div>
    </article>
  );
}
