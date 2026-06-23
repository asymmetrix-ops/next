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
        padding: "0 14px",
        background: active ? "#0f172a" : "#fff",
        border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        color: active ? "#fff" : "#374151",
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
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
