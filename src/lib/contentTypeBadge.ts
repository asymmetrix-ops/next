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
  if (t === "company analysis" || t === "company update") {
    return {
      ...base,
      backgroundColor: "#F1F4FE",
      color: "#2A46EA",
      borderColor: "#E2E8FD",
    };
  }
  if (t === "deal analysis" || t === "deal perspective" || t === "hot take") {
    return {
      ...base,
      backgroundColor: "#FEF6E0",
      color: "#7A5605",
      borderColor: "#FBE8B8",
    };
  }
  if (t === "market commentary") {
    return {
      ...base,
      backgroundColor: "#FEF6E0",
      color: "#7A5605",
      borderColor: "#FBE8B8",
    };
  }
  if (t === "sector analysis") {
    return {
      ...base,
      backgroundColor: "#F1EBFC",
      color: "#523793",
      borderColor: "#E2D5F8",
    };
  }
  if (t === "executive interview") {
    return {
      ...base,
      backgroundColor: "#E4F5EC",
      color: "#0F7040",
      borderColor: "#C8EBD9",
    };
  }
  if (t === "news") {
    return {
      ...base,
      backgroundColor: "#FCEAE7",
      color: "#A62E22",
      borderColor: "#F8D4CD",
    };
  }

  return {
    ...base,
    backgroundColor: "#EFF2F8",
    color: "#6B7488",
    borderColor: "#E4E8F2",
  };
}

/** Accent color for card top borders — matches Insights & Analysis cards. */
export function getContentTypeAccentColor(contentType?: string): string {
  const t = (contentType || "").toLowerCase();
  if (t === "company analysis" || t === "company update") return "#2A46EA";
  if (t === "sector analysis") return "#523793";
  if (t === "executive interview") return "#0F7040";
  if (t === "news") return "#A62E22";
  if (
    t === "deal analysis" ||
    t === "deal perspective" ||
    t === "hot take" ||
    t === "market commentary"
  ) {
    return "#7A5605";
  }
  return "#6B7488";
}
