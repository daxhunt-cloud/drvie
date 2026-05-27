"use client";

import { useState } from "react";
import { useLike } from "@/hooks/useLike";
import { useAuth } from "./AuthProvider";

interface LikeButtonProps {
  courseId: string;
  initialLikeCount: number;
  initialLiked?: boolean;
  ownerId?: string;
  onLoginRequired?: () => void;
  size?: "sm" | "md";
}

export default function LikeButton({ courseId, initialLikeCount, initialLiked = false, ownerId, onLoginRequired, size = "md" }: LikeButtonProps) {
  const { user } = useAuth();
  const { liked, toggleLike, loading } = useLike({
    courseId,
    initialLikeCount,
    initialLiked,
    ownerId,
    onLoginRequired,
  });
  const [animating, setAnimating] = useState(false);
  const isOwner = !!user && !!ownerId && user.id === ownerId;
  const showFilled = isOwner || liked;

  const iconSize = size === "sm" ? 16 : 20;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    await toggleLike();
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "center", gap: size === "sm" ? 3 : 4,
        background: "none", border: "none", cursor: "pointer", padding: 0,
        opacity: loading ? 0.5 : 1,
        pointerEvents: loading ? "none" : "auto",
        transition: "opacity 0.15s",
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={showFilled ? "#FF4D4D" : "none"}
        stroke={showFilled ? "#FF4D4D" : "#999999"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: animating ? "scale(1.3)" : "scale(1)",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
