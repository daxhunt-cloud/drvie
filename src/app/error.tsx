"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#FFFFFF", padding: "24px 20px", textAlign: "center",
      fontFamily: "var(--font-body)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#222222", margin: "0 0 8px" }}>
        문제가 발생했어요
      </h1>
      <p style={{ fontSize: 14, color: "#6a6a6a", margin: "0 0 32px", lineHeight: 1.5 }}>
        일시적인 오류가 발생했어요. 다시 시도해주세요
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            padding: "12px 28px", borderRadius: 8,
            border: "1px solid #dddddd", background: "#ffffff",
            color: "#222222", fontSize: 15, fontWeight: 500, cursor: "pointer",
          }}
        >
          다시 시도
        </button>
        <a
          href="/map"
          style={{
            padding: "12px 28px", borderRadius: 8, border: "none",
            background: "#ff385c", color: "#fff", fontSize: 15, fontWeight: 500,
            textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}
        >
          지도로 돌아가기
        </a>
      </div>
    </div>
  );
}
