"use client";

export function SearchColumnsButton({
  active,
  count,
  total,
  onClick,
}: {
  active: boolean;
  count: number;
  total: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 36,
        padding: "0 16px",
        background: active ? "var(--c-bg-2a46ea)" : "var(--t-panel)",
        border: active ? "1px solid var(--c-line-2a46ea)" : "1px solid var(--t-card-hover-border)",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        color: active ? "#fff" : "var(--t-azure)",
        fontFamily:
          "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(16, 28, 70, 0.05)",
        transition: "background 150ms, color 150ms, border-color 150ms",
      }}
    >
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
        <path
          d="M0 1h14M0 5h10M0 9h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      Columns {count}/{total}
    </button>
  );
}
