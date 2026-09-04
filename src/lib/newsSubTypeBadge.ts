import type { CSSProperties } from "react";

const BADGE_BASE: CSSProperties = {
  display: "inline-block",
  fontSize: 12,
  lineHeight: 1,
  padding: "6px 10px",
  borderRadius: 9999,
  border: "1px solid transparent",
  fontWeight: 600,
};

type BadgeColors = Pick<
  CSSProperties,
  "backgroundColor" | "color" | "borderColor"
>;

/**
 * Per sub-type colours — update when the News section design ticket confirms assignments.
 * Keys are matched case-insensitively.
 */
const NEWS_SUB_TYPE_STYLES: Record<string, BadgeColors> = {};

const DEFAULT_NEWS_SUB_TYPE_STYLE: BadgeColors = {
  backgroundColor: "#fdf4ff",
  color: "#86198f",
  borderColor: "#f0abfc",
};

/** Badge style for a News sub-type tag on article pages. */
export function getNewsSubTypeBadgeStyle(subType?: string): CSSProperties {
  const label = (subType || "").trim();
  if (!label) {
    return {
      ...BADGE_BASE,
      ...DEFAULT_NEWS_SUB_TYPE_STYLE,
    };
  }

  const colors =
    NEWS_SUB_TYPE_STYLES[label.toLowerCase()] ?? DEFAULT_NEWS_SUB_TYPE_STYLE;

  return {
    ...BADGE_BASE,
    ...colors,
  };
}
