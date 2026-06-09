import type { CSSProperties } from "react";

export type DealTypeBadgeColors = { bg: string; fg: string; bd: string };

/** Email lambda — single grey style for all deal types. */
export const DEAL_TYPE_BADGE_COLORS: DealTypeBadgeColors = {
  bg: "#F1F5F9",
  fg: "#64748B",
  bd: "#CBD5E1",
};

/** Funding stage reuses investment palette. */
export const FUNDING_STAGE_BADGE_COLORS: DealTypeBadgeColors = {
  bg: "#d1fae5",
  fg: "#065f46",
  bd: "#6ee7b7",
};

function badgeStyleFromColors({ bg, fg, bd }: DealTypeBadgeColors): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 4,
    backgroundColor: bg,
    color: fg,
    border: `1px solid ${bd}`,
    fontSize: 11.5,
    fontWeight: 500,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
  };
}

export function dealTypeBadgeStyle(): CSSProperties {
  return badgeStyleFromColors(DEAL_TYPE_BADGE_COLORS);
}

export function fundingStageBadgeStyle(): CSSProperties {
  return badgeStyleFromColors(FUNDING_STAGE_BADGE_COLORS);
}
