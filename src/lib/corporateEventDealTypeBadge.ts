import type { CSSProperties } from "react";
import { DEAL_TYPE_TONE, getFundingStageTone, pillStyleFromTone } from "@/lib/tagColors";

export type DealTypeBadgeColors = { bg: string; fg: string; bd: string };

/** Deal type — always the neutral grey, whatever the value (tags.txt §1). */
export const DEAL_TYPE_BADGE_COLORS: DealTypeBadgeColors = {
  bg: DEAL_TYPE_TONE.fill,
  fg: DEAL_TYPE_TONE.text,
  bd: DEAL_TYPE_TONE.border,
};

/** @deprecated single flat colour — kept for legacy callers. Use fundingStageBadgeStyle(value) for the real per-stage ramp. */
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

/**
 * Funding stage — colour steps by group and darkens as the stage advances
 * (tags.txt §1). Pass the stage value (e.g. "Series A", "Buyout", "Grant").
 */
export function fundingStageBadgeStyle(value?: string): CSSProperties {
  if (!value) return badgeStyleFromColors(FUNDING_STAGE_BADGE_COLORS);
  return pillStyleFromTone(getFundingStageTone(value));
}
