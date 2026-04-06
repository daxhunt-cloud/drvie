"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (isSignUp) {
      setError("확인 이메일을 전송했습니다. 이메일을 확인해주세요.");
      return;
    }

    onSuccess();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "32px 28px",
          width: 340,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
          {isSignUp ? "회원가입" : "로그인"}
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
          코스를 저장하려면 로그인이 필요합니다
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div style={{ fontSize: 13, color: "#ef4444", padding: "0 2px" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: loading ? "#94a3b8" : "#3b82f6",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "처리중..." : isSignUp ? "회원가입" : "로그인"}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
          style={{
            marginTop: 12,
            width: "100%",
            background: "none",
            border: "none",
            color: "#3b82f6",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {isSignUp ? "이미 계정이 있나요? 로그인" : "계정이 없나요? 회원가입"}
        </button>
      </div>
    </div>
  );
}
