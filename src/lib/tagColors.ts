/**
 * Canonical tag / badge colour registry for the platform.
 *
 * Single source of truth for every tag family in tags.txt. Mappings are
 * fixed platform-wide — do not re-map colours per page. Any component that
 * renders a tag/badge/chip/pill should read its colours from here rather
 * than hard-coding hexes, so the whole app stays in sync with tags.txt.
 *
 * See /tags.txt at the repo root for the full spec and rationale.
 */

import type { CSSProperties } from "react";

export type TagTone = {
  text: string;
  fill: string;
  border: string;
  dot?: string;
};

/* -------------------------------------------------------------------------
 * 1 · Deal type & funding stage
 * ---------------------------------------------------------------------- */

/** Deal type is always the neutral grey, whatever the value. */
export const DEAL_TYPE_TONE: TagTone = {
  text: "var(--c-fg-343c46)",
  fill: "var(--c-bg-eceff3)",
  border: "var(--c-line-dde2e8)",
};

/** Funding-stage ramp — stepping darker as the stage advances. */
// Same text colour across each group
export const FUNDING_STAGE_TONES: Record<string, TagTone> = {
  "pre-seed": { text: "var(--c-fg-143e96)", fill: "var(--c-bg-eef3fc)", border: "var(--c-line-dce6f6)" },
  seed: { text: "var(--c-fg-143e96)", fill: "var(--c-bg-e4ecfa)", border: "var(--c-line-ccdbf3)" },
  "series a": { text: "var(--c-fg-143e96)", fill: "var(--c-bg-d7e2f4)", border: "var(--c-line-b8caea)" },
  "series b": { text: "var(--c-fg-032d20)", fill: "var(--c-bg-e7f7ef)", border: "var(--c-line-c8ead9)" },
  "series c": { text: "var(--c-fg-032d20)", fill: "var(--c-bg-def3e7)", border: "var(--c-line-bbe2ce)" },
  "series d": { text: "var(--c-fg-032d20)", fill: "var(--c-bg-d5efdf)", border: "var(--c-line-aed8c3)" },
  "series e": { text: "var(--c-fg-032d20)", fill: "var(--c-bg-ccead6)", border: "var(--c-line-9dceb7)" },
  "series f": { text: "var(--c-fg-032d20)", fill: "var(--c-bg-c3e6cd)", border: "var(--c-line-8fc4ab)" },
  "series g": { text: "var(--c-fg-032d20)", fill: "var(--c-bg-bbe2c5)", border: "var(--c-line-80b89d)" },
  growth: { text: "var(--c-fg-032d20)", fill: "var(--c-bg-b2ddbc)", border: "var(--c-line-6fae91)" },
  buyout: { text: "var(--c-fg-4d2d7c)", fill: "var(--c-bg-efe6f7)", border: "var(--c-line-ddd0ec)" },
  "take private": { text: "var(--c-fg-4d2d7c)", fill: "var(--c-bg-e1d4ef)", border: "var(--c-line-c5b0de)" },
  "credit facility": { text: "var(--c-fg-5e4204)", fill: "var(--c-bg-fff2d2)", border: "var(--c-line-f2dea1)" },
  debt: { text: "var(--c-fg-5e4204)", fill: "var(--c-bg-f5e2b6)", border: "var(--c-line-e2c880)" },
  grant: { text: "var(--c-fg-5e4204)", fill: "var(--c-bg-ecd68f)", border: "var(--c-line-cdae5b)" },
  closing: { text: "var(--c-fg-93400f)", fill: "var(--c-bg-fce3d2)", border: "var(--c-line-f4ccb1)" },
};

export function getFundingStageTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return FUNDING_STAGE_TONES[key] ?? DEAL_TYPE_TONE;
}

/* -------------------------------------------------------------------------
 * 2 · Transaction status
 * ---------------------------------------------------------------------- */

export const TRANSACTION_STATUS_TONES: Record<string, TagTone> = {
  "reported in market": {
    text: "var(--t-emerald)",
    fill: "var(--t-emerald-soft)",
    dot: "#17A05C",
    border: "var(--c-line-c3e7d3)",
  },
  "rumoured in market": {
    text: "var(--t-warn)",
    fill: "var(--t-warn-soft)",
    dot: "#E0A32E",
    border: "var(--c-line-f6e3b4)",
  },
  "anticipated within 6 months": {
    text: "var(--c-fg-182a9b)",
    fill: "var(--ax-cyan-100)",
    dot: "#2A46EA",
    border: "var(--c-line-bfcbf8)",
  },
  "anticipated within 18 months": {
    text: "var(--ax-cyan-700)",
    fill: "var(--t-azure-soft)",
    dot: "#3D5BF3",
    border: "var(--t-card-hover-border)",
  },
  "process on hold": {
    text: "var(--ax-gray-700)",
    fill: "var(--t-paper)",
    dot: "#8A93A8",
    border: "var(--t-divider)",
  },
};

/** Neutral email-safe rendering — see tags.txt §2 note on mail clients. */
export const TRANSACTION_STATUS_EMAIL_TONE: TagTone = {
  text: "var(--c-fg-1f252e)",
  fill: "var(--c-bg-e1e4e9)",
  border: "var(--c-line-cbd0d8)",
};

export function getTransactionStatusTone(status: string): TagTone {
  const s = String(status || "").toLowerCase();
  if (s.includes("report")) return TRANSACTION_STATUS_TONES["reported in market"];
  if (s.includes("rumour") || s.includes("rumor"))
    return TRANSACTION_STATUS_TONES["rumoured in market"];
  if (s.includes("hold")) return TRANSACTION_STATUS_TONES["process on hold"];
  if (s.includes("anticipated")) {
    if (s.includes("6")) return TRANSACTION_STATUS_TONES["anticipated within 6 months"];
    return TRANSACTION_STATUS_TONES["anticipated within 18 months"];
  }
  return TRANSACTION_STATUS_TONES["anticipated within 18 months"];
}

export function formatTransactionStatusLabel(status: string): string {
  const raw = String(status || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/^transaction\s+/i, "").trim() || raw;
  const s = normalized.toLowerCase();
  if (s.includes("report")) return "Reported in Market";
  if (s.includes("rumour") || s.includes("rumor")) return "Rumoured in Market";
  if (s.includes("anticipated") && s.includes("6")) return "Anticipated within 6 months";
  if (s.includes("anticipated")) return "Anticipated within 18 months";
  if (s.includes("hold")) return "Process on hold";
  return normalized
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && ["within", "in", "on", "of", "the", "a", "an", "and"].includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/* -------------------------------------------------------------------------
 * 3 · Insights & Analysis piece type
 * ---------------------------------------------------------------------- */

export const INSIGHTS_TYPE_TONES: Record<string, TagTone> = {
  "company analysis": { text: "var(--c-fg-1e7a50)", fill: "var(--c-bg-e7f6ee)", border: "var(--c-line-bfe4d0)" },
  "company update": { text: "var(--c-fg-1e7a50)", fill: "var(--c-bg-e7f6ee)", border: "var(--c-line-bfe4d0)" },
  "market commentary": { text: "var(--c-fg-8a5a06)", fill: "var(--c-bg-fbf1de)", border: "var(--c-line-ebce94)" },
  "deal analysis": { text: "var(--c-fg-8a5a06)", fill: "var(--c-bg-fbf1de)", border: "var(--c-line-ebce94)" },
  "deal perspective": { text: "var(--c-fg-8a5a06)", fill: "var(--c-bg-fbf1de)", border: "var(--c-line-ebce94)" },
  "hot take": { text: "var(--c-fg-8a5a06)", fill: "var(--c-bg-fbf1de)", border: "var(--c-line-ebce94)" },
  "sector analysis": { text: "var(--c-fg-4f3db0)", fill: "var(--c-bg-eeebfa)", border: "var(--c-line-d4ccee)" },
  "investor analysis": { text: "var(--c-fg-0370aa)", fill: "var(--c-bg-e8f8ff)", border: "var(--c-line-8ddaff)" },
  "company brief": { text: "var(--c-fg-02527d)", fill: "var(--c-bg-e8f8ff)", border: "var(--c-line-8ddaff)" },
  "executive interview": { text: "var(--c-fg-1e7a50)", fill: "var(--c-bg-e7f6ee)", border: "var(--c-line-bfe4d0)" },
  "there's a data provider for that": {
    text: "var(--c-fg-4f3db0)",
    fill: "var(--c-bg-eeebfa)",
    border: "var(--c-line-d4ccee)",
  },
  news: { text: "var(--t-coral)", fill: "var(--t-coral-soft)", border: "var(--c-line-f5cfc8)", dot: "#D24534" },
};

export function getInsightsTypeTone(contentType: string): TagTone {
  const t = String(contentType || "").toLowerCase();
  if (INSIGHTS_TYPE_TONES[t]) return INSIGHTS_TYPE_TONES[t];
  if (t.includes("news")) return INSIGHTS_TYPE_TONES.news;
  if (t.includes("sector")) return INSIGHTS_TYPE_TONES["sector analysis"];
  if (t.includes("investor")) return INSIGHTS_TYPE_TONES["investor analysis"];
  if (t.includes("brief")) return INSIGHTS_TYPE_TONES["company brief"];
  if (t.includes("company")) return INSIGHTS_TYPE_TONES["company analysis"];
  if (
    t.includes("market") ||
    t.includes("deal analysis") ||
    t.includes("deal perspective") ||
    t.includes("hot take")
  ) {
    return INSIGHTS_TYPE_TONES["market commentary"];
  }
  return { text: "var(--t-muted)", fill: "var(--t-inset)", border: "var(--t-divider)" };
}

/* -------------------------------------------------------------------------
 * 4 · News subtypes
 * ---------------------------------------------------------------------- */

export const NEWS_SUBTYPE_TONES: Record<string, TagTone> = {
  fundraise: { text: "var(--ax-cyan-700)", fill: "var(--t-azure-soft)", border: "var(--t-card-hover-border)", dot: "#3D5BF3" },
  // Raspberry: scoops should feel livelier than the old mustard, and it doesn't clash with
  // the other News sub-types (blue, green, teal, purple, grey) or the process-stage tones.
  "sale process": { text: "var(--c-fg-b0154f)", fill: "var(--c-bg-fdecf2)", border: "var(--c-line-f7c5d6)", dot: "#E23B7B" },
  "deal close": { text: "var(--t-emerald)", fill: "var(--t-emerald-soft)", border: "var(--c-line-c3e7d3)", dot: "#17A05C" },
  "carve-out": { text: "var(--c-fg-0a5e75)", fill: "var(--c-bg-e1f3f8)", border: "var(--c-line-bce2ec)", dot: "#1898B8" },
  ipo: { text: "var(--t-lavender)", fill: "var(--t-lavender-soft)", border: "var(--c-line-ddcef7)", dot: "#7A5BD0" },
  leadership: { text: "var(--ax-gray-700)", fill: "var(--t-paper)", border: "var(--t-divider)", dot: "#8A93A8" },
};

export function getNewsSubtypeTone(subtype: string): TagTone {
  const s = String(subtype || "").toLowerCase();
  return NEWS_SUBTYPE_TONES[s] ?? NEWS_SUBTYPE_TONES.leadership;
}

/* -------------------------------------------------------------------------
 * 5 · Process stage
 * ---------------------------------------------------------------------- */

export const PROCESS_STAGE_TONES: Record<string, TagTone> = {
  "strategic review": { text: "var(--c-fg-0370aa)", fill: "var(--c-bg-e8f8ff)", border: "var(--c-line-8ddaff)" },
  "banker pitches": { text: "var(--c-fg-0a5e75)", fill: "var(--c-bg-e1f3f8)", border: "var(--c-line-bce2ec)" },
  "deal prep": { text: "var(--c-fg-4f3db0)", fill: "var(--c-bg-eeebfa)", border: "var(--c-line-d4ccee)" },
  "in market": { text: "var(--c-fg-93400f)", fill: "var(--c-bg-fce3d2)", border: "var(--c-line-f4ccb1)" },
  "in exclusivity": { text: "var(--c-fg-372a78)", fill: "var(--c-bg-e4e0f6)", border: "var(--c-line-cbc3ea)" },
};

export function getProcessStageTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return PROCESS_STAGE_TONES[key] ?? PROCESS_STAGE_TONES["strategic review"];
}

/* -------------------------------------------------------------------------
 * 6 · Intermediary
 * ---------------------------------------------------------------------- */

export const INTERMEDIARY_TONES = {
  // Same orange as the advisor entity tag
  namedAdvisor: { text: "var(--c-fg-93400f)", fill: "var(--c-bg-fce3d2)", border: "var(--c-line-f4ccb1)" } as TagTone,
  notYetHired: { text: "var(--t-warn)", fill: "var(--t-warn-soft)", border: "var(--c-line-f6e3b4)" } as TagTone,
  noIntermediary: { text: "var(--ax-gray-700)", fill: "var(--t-paper)", border: "var(--t-divider)" } as TagTone,
  unknown: { text: "var(--t-muted)", fill: "var(--t-panel)", border: "var(--c-line-d8deeb)" } as TagTone, // dashed
};

export function getIntermediaryTone(value?: string | null): TagTone & { dashed?: boolean } {
  const v = String(value || "").trim().toLowerCase();
  if (!v || v === "unknown") return { ...INTERMEDIARY_TONES.unknown, dashed: true };
  if (v === "not yet hired") return INTERMEDIARY_TONES.notYetHired;
  if (v === "no intermediary") return INTERMEDIARY_TONES.noIntermediary;
  return INTERMEDIARY_TONES.namedAdvisor;
}

/* -------------------------------------------------------------------------
 * 7 · Buyer type
 * ---------------------------------------------------------------------- */

export const BUYER_TYPE_TONES: Record<string, TagTone> = {
  trade: DEAL_TYPE_TONE,
  sponsor: { text: "var(--c-fg-7a52ae)", fill: "var(--c-bg-efe6f7)", border: "var(--c-line-ddd0ec)" },
  "growth equity": { text: "var(--c-fg-0b6346)", fill: "var(--c-bg-e7f7ef)", border: "var(--c-line-c8ead9)" },
};

export function getBuyerTypeTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return BUYER_TYPE_TONES[key] ?? DEAL_TYPE_TONE;
}

/* -------------------------------------------------------------------------
 * 8 · Transaction signal
 * ---------------------------------------------------------------------- */

export const TRANSACTION_SIGNAL_TONES: Record<string, TagTone> = {
  "asymmetrix assessment": { text: "var(--ax-cyan-700)", fill: "var(--t-azure-soft)", border: "var(--t-card-hover-border)" },
  "proprietary intel": { text: "var(--c-fg-02527d)", fill: "var(--c-bg-e8f8ff)", border: "var(--c-line-8ddaff)" },
  "long hold": { text: "var(--ax-gray-700)", fill: "var(--t-paper)", border: "var(--t-divider)" },
};

/** User-facing copy for Deal Radar transaction-signal tooltips (tags.txt §8). */
export const TRANSACTION_SIGNAL_DESCRIPTIONS: Record<string, string> = {
  "long hold":
    "An observation only — no active transaction signal. Indicates where the call came from, not where the deal is in its process.",
  "asymmetrix assessment":
    "Asymmetrix's own view on the anticipated transaction — house assessment, not sourced externally.",
  "proprietary intel":
    "Sourced intelligence from proprietary channels, not inferred from public signals.",
};

export function getTransactionSignalTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return TRANSACTION_SIGNAL_TONES[key] ?? TRANSACTION_SIGNAL_TONES["long hold"];
}

export function getTransactionSignalDescription(value: string): string {
  const key = String(value || "").trim().toLowerCase();
  return TRANSACTION_SIGNAL_DESCRIPTIONS[key] ?? "";
}

/* -------------------------------------------------------------------------
 * 9 · Numeric value
 * ---------------------------------------------------------------------- */

export const NUMERIC_VALUE_TONES = {
  disclosed: { text: "var(--t-azure)", fill: "var(--t-panel)", border: "var(--t-card-hover-border)" } as TagTone,
  undisclosed: { text: "var(--t-muted)", fill: "var(--t-panel)", border: "var(--t-divider)" } as TagTone,
};

/* -------------------------------------------------------------------------
 * 10 · Entity tags (chips) — links, never a dot
 * ---------------------------------------------------------------------- */

export const ENTITY_TONES = {
  company: { text: "var(--t-emerald)", fill: "var(--t-emerald-soft)", border: "var(--c-line-c3e7d3)", hoverFill: "var(--c-bg-d3eee0)" },
  investor: { text: "var(--c-fg-0370aa)", fill: "var(--c-bg-e8f8ff)", border: "var(--c-line-8ddaff)", hoverFill: "var(--c-bg-d5f1fe)" },
  advisor: { text: "var(--c-fg-93400f)", fill: "var(--c-bg-fce3d2)", border: "var(--c-line-f4ccb1)", hoverFill: "var(--c-bg-f8d4bc)" },
  individual: { text: "var(--c-fg-372a78)", fill: "var(--c-bg-e4e0f6)", border: "var(--c-line-cbc3ea)", hoverFill: "var(--c-bg-d5cff0)" },
  sector: { text: "var(--t-lavender)", fill: "var(--t-lavender-soft)", border: "var(--c-line-ddcef7)", hoverFill: "var(--c-bg-e5daf9)" },
  subsector: { text: "var(--c-fg-5e4aa8)", fill: "var(--c-bg-fbf9fe)", border: "var(--c-line-d8cdf0)", hoverFill: "var(--c-bg-f2ecfc)" },
} as const;

export type EntityKind = keyof typeof ENTITY_TONES;

/* -------------------------------------------------------------------------
 * Ownership (not in the reference, each type uses the matching reference tone)
 * ---------------------------------------------------------------------- */

export const OWNERSHIP_TONES: Record<string, TagTone> = {
  public: { text: "var(--t-lavender)", fill: "var(--t-lavender-soft)", border: "var(--c-line-ddcef7)" },
  "private equity": { text: "var(--ax-cyan-700)", fill: "var(--t-azure-soft)", border: "var(--t-card-hover-border)" },
  "venture capital": { text: "var(--t-emerald)", fill: "var(--t-emerald-soft)", border: "var(--c-line-c3e7d3)" },
  private: { text: "var(--t-warn)", fill: "var(--t-warn-soft)", border: "var(--c-line-f6e3b4)" },
  subsidiary: { text: "var(--c-fg-182a9b)", fill: "var(--ax-cyan-100)", border: "var(--c-line-bfcbf8)" },
  acquired: { text: "var(--t-coral)", fill: "var(--t-coral-soft)", border: "var(--c-line-f5cfc8)" },
};

const OWNERSHIP_FALLBACK_TONE: TagTone = { text: "var(--c-fg-4a5468)", fill: "var(--c-bg-eef0f4)", border: "var(--c-line-dde2e8)" };

export function getOwnershipTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return OWNERSHIP_TONES[key] ?? OWNERSHIP_FALLBACK_TONE;
}

/* -------------------------------------------------------------------------
 * Generic style builders
 * ---------------------------------------------------------------------- */

// Colours only, for tags that keep their own size and shape
export function tagColourStyle(tone: { text: string; fill: string; border: string }): CSSProperties {
  return { backgroundColor: tone.fill, color: tone.text, border: `1px solid ${tone.border}` };
}

/** Standard filled pill (Deal type, Funding stage, Process stage, Buyer type, Intermediary, etc). */
export function pillStyleFromTone(
  tone: TagTone,
  opts: { dashed?: boolean } = {}
): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    backgroundColor: tone.fill,
    color: tone.text,
    border: `1px solid ${tone.border}`,
    borderStyle: opts.dashed ? "dashed" : "solid",
    fontSize: 11.5,
    fontWeight: 700,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
  };
}

/** Status pill (Transaction status, News subtypes) — no dot. */
export function dotPillStyleFromTone(tone: TagTone, bordered = true): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11.5,
    lineHeight: 1,
    padding: "5px 10px",
    borderRadius: 999,
    fontWeight: 700,
    whiteSpace: "nowrap",
    backgroundColor: tone.fill,
    color: tone.text,
    border: bordered ? `1px solid ${tone.border}` : "1px solid transparent",
  };
}

/** Sentence-case research/type pill, no dot (Insights & Analysis, Transaction signal). */
export function researchPillStyleFromTone(tone: TagTone): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 11.5,
    lineHeight: 1.4,
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 700,
    whiteSpace: "nowrap",
    backgroundColor: tone.fill,
    color: tone.text,
    border: `1px solid ${tone.border}`,
  };
}

/** Numeric value tag — brand blue on white with a hairline border. */
export function numericValueStyle(disclosed = true): CSSProperties {
  const tone = disclosed ? NUMERIC_VALUE_TONES.disclosed : NUMERIC_VALUE_TONES.undisclosed;
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: 999,
    backgroundColor: tone.fill,
    color: tone.text,
    border: `1px solid ${tone.border}`,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    fontSize: 12,
    whiteSpace: "nowrap",
  };
}
