"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    label: "지도",
    path: "/map",
    icon: (active: boolean) => (
      <svg
        width="22" height="22" viewBox="0 0 24 24"
        fill={active ? "var(--color-text-primary)" : "none"}
        stroke={active ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      >
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    label: "피드",
    path: "/feed",
    icon: (active: boolean) => (
      <svg
        width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon
          points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
          fill={active ? "var(--color-text-primary)" : "none"}
          stroke={active ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
        />
      </svg>
    ),
  },
];

export default function BottomTab() {
  const pathname = usePathname();

  if (pathname.startsWith("/course/")) return null;

  const isActive = (path: string) => {
    if (pathname.startsWith("/course")) return false;
    if (path === "/map") return pathname === "/map" || pathname.startsWith("/map/");
    return pathname.startsWith(path);  // /feed ✓, /settings ✓
  };

  return (
    <nav
      className="bottom-tab"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        height: "var(--bottom-tab-h)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(248,247,244,0.95)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderTop: `0.5px solid var(--color-border)`,
        display: "flex", alignItems: "center", justifyContent: "space-around",
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.path);
        return (
          <Link
            key={tab.path}
            href={tab.path}
            prefetch
            style={{
              flex: 1, height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              textDecoration: "none", padding: 0,
            }}
          >
            {tab.icon(active)}
            <span
              style={{
                fontSize: "var(--text-nano)",
                fontWeight: active ? 500 : 400,
                color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
