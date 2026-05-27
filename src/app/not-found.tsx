import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#FFFFFF", padding: "24px 20px", textAlign: "center",
      fontFamily: "var(--font-body)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#222222", margin: "0 0 8px" }}>
        페이지를 찾을 수 없어요
      </h1>
      <p style={{ fontSize: 14, color: "#6a6a6a", margin: "0 0 32px", lineHeight: 1.5 }}>
        요청하신 페이지가 존재하지 않거나 이동되었어요
      </p>
      <Link
        href="/map"
        style={{
          padding: "12px 32px", borderRadius: 8, border: "none",
          background: "#ff385c", color: "#fff", fontSize: 15, fontWeight: 500,
          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8,
        }}
      >
        지도로 돌아가기
      </Link>
    </div>
  );
}
