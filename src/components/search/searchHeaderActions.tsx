import type { CSSProperties } from "react";

export const SEARCH_HEADER_ACTION_BUTTON_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 14px",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
