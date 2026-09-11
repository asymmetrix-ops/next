import type { CSSProperties } from "react";
import { getInsightsTypeTone } from "@/lib/tagColors";

/** Matches Insights & Analysis list card content-type badges — tags.txt §3. */
export function getContentTypeBadgeStyle(contentType?: string): CSSProperties {
  const tone = getInsightsTypeTone(contentType || "");
  return {
    display: "inline-block",
    fontSize: 11.5,
    lineHeight: 1.4,
    padding: "6px 10px",
    borderRadius: 9999,
    border: `1px solid ${tone.border}`,
    fontWeight: 700,
    backgroundColor: tone.fill,
    color: tone.text,
  };
}

/** Accent color for card top borders — matches Insights & Analysis cards. */
export function getContentTypeAccentColor(contentType?: string): string {
  return getInsightsTypeTone(contentType || "").text;
}
