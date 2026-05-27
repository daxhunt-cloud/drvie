"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success";
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export default function Toast({ message, type = "error", duration = 1500, actionLabel, onAction, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        background: type === "error" ? "#FF4D4D" : "#00B386",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transition: "all 0.3s",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ flex: "0 1 auto" }}>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.4)",
            background: "transparent",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
