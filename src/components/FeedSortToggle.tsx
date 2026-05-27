"use client";

// ── Types (exported — used by FeedClient + page.tsx) ──────────────────────────

export type FeedSortMode = "popular" | "new" | "liked" | "mine";

interface FeedSortToggleProps {
  active: FeedSortMode;
  onSelect: (mode: FeedSortMode) => void;
  onLoginRequired?: () => void;  // 비로그인 "관심"/"내 코스" 클릭 시
  isLoggedIn: boolean;
  loading?: boolean;             // fetch 중 dim
}

// ── Tab config ────────────────────────────────────────────────────────────────

const SORT_TABS: { key: FeedSortMode; label: string }[] = [
  { key: "popular", label: "인기"    },
  { key: "new",     label: "신규"    },
  { key: "liked",   label: "관심"    },
  { key: "mine",    label: "내 코스" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedSortToggle({
  active,
  onSelect,
  onLoginRequired,
  isLoggedIn,
  loading = false,
}: FeedSortToggleProps) {
  const handleClick = (mode: FeedSortMode) => {
    // 비로그인 상태에서 "관심" / "내 코스" → LoginModal, 탭 전환 없음
    if ((mode === "liked" || mode === "mine") && !isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    onSelect(mode);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 16px",
        overflowX: "auto",
        scrollbarWidth: "none",
        background: "var(--color-bg)",
        borderBottom: "0.5px solid var(--color-border)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        pointerEvents: loading ? "none" : "auto",
        opacity: loading ? 0.6 : 1,
        transition: "opacity 150ms var(--ease-out)",
      }}
    >
      {SORT_TABS.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => handleClick(key)}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: isActive
                ? "var(--color-text-inverse)"
                : "var(--color-text-secondary)",
              background: isActive
                ? "var(--color-brand)"
                : "var(--color-bg-alt)",
              border: isActive
                ? "1px solid var(--color-brand)"
                : "1px solid var(--color-border)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
              transition:
                "background 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
