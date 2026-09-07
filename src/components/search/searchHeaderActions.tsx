import type { CSSProperties } from "react";

export const SEARCH_HEADER_ACTION_BUTTON_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 16px",
  background: "#fff",
  border: "1px solid #C6D1FB",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  color: "#2A46EA",
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(16, 28, 70, 0.05)",
};

export function SearchExportCsvIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <path
        d="M6 1v8M3 6l3 3 3-3M1 13h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
