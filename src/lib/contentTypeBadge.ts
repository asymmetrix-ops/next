import type { CSSProperties } from "react";

/** Matches Insights & Analysis list card content-type badges. */
export function getContentTypeBadgeStyle(contentType?: string): CSSProperties {
  const base: CSSProperties = {
    display: "inline-block",
    fontSize: 12,
    lineHeight: 1,
    padding: "6px 10px",
    borderRadius: 9999,
    border: "1px solid transparent",
    fontWeight: 600,
  };

  const t = (contentType || "").toLowerCase();
  if (t === "company analysis") {
    return {
      ...base,
      backgroundColor: "#ecfdf5",
      color: "#065f46",
      borderColor: "#a7f3d0",
    };
  }
  if (t === "deal analysis") {
    return {
      ...base,
      backgroundColor: "#eff6ff",
      color: "#1e40af",
      borderColor: "#bfdbfe",
    };
  }
  if (t === "deal perspective") {
    return {
      ...base,
      backgroundColor: "#ecfeff",
      color: "#155e75",
      borderColor: "#a5f3fc",
    };
  }
  if (t === "market commentary") {
    return {
      ...base,
      backgroundColor: "#fefce8",
      color: "#854d0e",
      borderColor: "#fde68a",
    };
  }
  if (t === "sector analysis") {
    return {
      ...base,
      backgroundColor: "#f5f3ff",
      color: "#5b21b6",
      borderColor: "#ddd6fe",
    };
  }
  if (t === "hot take") {
    return {
      ...base,
      backgroundColor: "#fff7ed",
      color: "#9a3412",
      borderColor: "#fed7aa",
    };
  }
  if (t === "executive interview") {
    return {
      ...base,
      backgroundColor: "#f0fdf4",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  return {
    ...base,
    backgroundColor: "#f3f4f6",
    color: "#374151",
    borderColor: "#e5e7eb",
  };
}
