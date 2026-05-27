"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";

interface ToastState {
  message: string;
  id: number;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2100);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((t, i) => (
        <ToastItem key={t.id} message={t.message} index={i} />
      ))}
    </ToastContext.Provider>
  );
}

function ToastItem({ message, index }: { message: string; index: number }) {
  const [phase, setPhase] = useState<"in" | "visible" | "out">("in");

  useState(() => {
    requestAnimationFrame(() => setPhase("visible"));
    setTimeout(() => setPhase("out"), 1800);
  });

  return (
    <div style={{
      position: "fixed",
      bottom: 100 + index * 50,
      left: "50%",
      transform: `translateX(-50%) translateY(${phase === "in" ? 20 : phase === "out" ? 20 : 0}px)`,
      background: "#1a1a1a",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: 20,
      fontSize: 14,
      fontWeight: 500,
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      zIndex: 9999,
      opacity: phase === "visible" ? 1 : 0,
      transition: "all 0.3s",
      whiteSpace: "nowrap",
      pointerEvents: "none",
    }}>
      {message}
    </div>
  );
}
