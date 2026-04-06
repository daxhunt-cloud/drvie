"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success";
  onClose: () => void;
}

export default function Toast({ message, type = "error", onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        background: type === "error" ? "#ef4444" : "#10b981",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transition: "all 0.3s",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}
