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
  text: "#343C46",
  fill: "#ECEFF3",
  border: "#DDE2E8",
};

/** Funding-stage ramp — stepping darker as the stage advances. */
export const FUNDING_STAGE_TONES: Record<string, TagTone> = {
  "pre-seed": { text: "#5B7FC9", fill: "#EEF3FC", border: "#DCE6F6" }, // △ 3.54
  seed: { text: "#2A5DB5", fill: "#E4ECFA", border: "#CCDBF3" },
  "series a": { text: "#143E96", fill: "#D7E2F4", border: "#B8CAEA" },
  "series b": { text: "#2FAA7C", fill: "#E7F7EF", border: "#C8EAD9" }, // △ 2.65
  "series c": { text: "#1E946A", fill: "#DEF3E7", border: "#BBE2CE" }, // △ 3.29
  "series d": { text: "#117955", fill: "#D5EFDF", border: "#AED8C3" }, // △ 4.43
  "series e": { text: "#0B6346", fill: "#CCEAD6", border: "#9DCEB7" },
  "series f": { text: "#074E37", fill: "#C3E6CD", border: "#8FC4AB" },
  "series g": { text: "#053C2B", fill: "#BBE2C5", border: "#80B89D" },
  growth: { text: "#032D20", fill: "#B2DDBC", border: "#6FAE91" },
  buyout: { text: "#7A52AE", fill: "#EFE6F7", border: "#DDD0EC" },
  "take private": { text: "#4D2D7C", fill: "#E1D4EF", border: "#C5B0DE" },
  "credit facility": { text: "#B5860B", fill: "#FFF2D2", border: "#F2DEA1" }, // △ 2.96
  debt: { text: "#8C6306", fill: "#F5E2B6", border: "#E2C880" }, // △ 4.21
  grant: { text: "#5E4204", fill: "#ECD68F", border: "#CDAE5B" },
  closing: { text: "#B85015", fill: "#FCE3D2", border: "#F4CCB1" }, // △ 4.06
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
    text: "#0F7040",
    fill: "#E4F5EC",
    dot: "#17A05C",
    border: "#C3E7D3",
  },
  "rumoured in market": {
    text: "#7A5605",
    fill: "#FEF6E0",
    dot: "#E0A32E",
    border: "#F6E3B4",
  },
  "anticipated within 6 months": {
    text: "#182A9B",
    fill: "#E2E8FD",
    dot: "#2A46EA",
    border: "#C6D1FB",
  },
  "anticipated within 18 months": {
    text: "#1F35C4",
    fill: "#F1F4FE",
    dot: "#3D5BF3",
    border: "#C6D1FB",
  },
  "process on hold": {
    text: "#3D4657",
    fill: "#F5F7FD",
    dot: "#8A93A8",
    border: "#E4E8F2",
  },
};

/** Neutral email-safe rendering — see tags.txt §2 note on mail clients. */
export const TRANSACTION_STATUS_EMAIL_TONE: TagTone = {
  text: "#1F252E",
  fill: "#E1E4E9",
  border: "#CBD0D8",
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
  "company analysis": { text: "#1E7A50", fill: "#E7F6EE", border: "#BFE4D0" },
  "company update": { text: "#1E7A50", fill: "#E7F6EE", border: "#BFE4D0" },
  "market commentary": { text: "#8A5A06", fill: "#FBF1DE", border: "#EBCE94" },
  "deal analysis": { text: "#8A5A06", fill: "#FBF1DE", border: "#EBCE94" },
  "deal perspective": { text: "#8A5A06", fill: "#FBF1DE", border: "#EBCE94" },
  "hot take": { text: "#8A5A06", fill: "#FBF1DE", border: "#EBCE94" },
  "sector analysis": { text: "#4F3DB0", fill: "#EEEBFA", border: "#D4CCEE" },
  "investor analysis": { text: "#0370AA", fill: "#E8F8FF", border: "#8DDAFF" },
  "company brief": { text: "#02527D", fill: "#E8F8FF", border: "#8DDAFF" },
  "executive interview": { text: "#1E7A50", fill: "#E7F6EE", border: "#BFE4D0" },
  "there's a data provider for that": {
    text: "#4F3DB0",
    fill: "#EEEBFA",
    border: "#D4CCEE",
  },
  news: { text: "#A62E22", fill: "#FCEAE7", border: "#F5CFC8", dot: "#D24534" },
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
  return { text: "#6B7488", fill: "#EFF2F8", border: "#E4E8F2" };
}

/* -------------------------------------------------------------------------
 * 4 · News subtypes
 * ---------------------------------------------------------------------- */

export const NEWS_SUBTYPE_TONES: Record<string, TagTone> = {
  fundraise: { text: "#1F35C4", fill: "#F1F4FE", border: "#C6D1FB", dot: "#3D5BF3" },
  "sale process": { text: "#7A5605", fill: "#FEF6E0", border: "#F6E3B4", dot: "#E0A32E" },
  "deal close": { text: "#0F7040", fill: "#E4F5EC", border: "#C3E7D3", dot: "#17A05C" },
  "carve-out": { text: "#0A5E75", fill: "#E1F3F8", border: "#BCE2EC", dot: "#1898B8" },
  ipo: { text: "#523793", fill: "#F1EBFC", border: "#DDCEF7", dot: "#7A5BD0" },
  leadership: { text: "#3D4657", fill: "#F5F7FD", border: "#E4E8F2", dot: "#8A93A8" },
};

export function getNewsSubtypeTone(subtype: string): TagTone {
  const s = String(subtype || "").toLowerCase();
  return NEWS_SUBTYPE_TONES[s] ?? NEWS_SUBTYPE_TONES.leadership;
}

/* -------------------------------------------------------------------------
 * 5 · Process stage
 * ---------------------------------------------------------------------- */

export const PROCESS_STAGE_TONES: Record<string, TagTone> = {
  "strategic review": { text: "#0370AA", fill: "#E8F8FF", border: "#8DDAFF" },
  "banker pitches": { text: "#0A5E75", fill: "#E1F3F8", border: "#BCE2EC" },
  "deal prep": { text: "#4F3DB0", fill: "#EEEBFA", border: "#D4CCEE" },
  "in market": { text: "#93400F", fill: "#FCE3D2", border: "#F4CCB1" },
  "in exclusivity": { text: "#372A78", fill: "#E4E0F6", border: "#CBC3EA" },
};

export function getProcessStageTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return PROCESS_STAGE_TONES[key] ?? PROCESS_STAGE_TONES["strategic review"];
}

/* -------------------------------------------------------------------------
 * 6 · Intermediary
 * ---------------------------------------------------------------------- */

export const INTERMEDIARY_TONES = {
  namedAdvisor: { text: "#0370AA", fill: "#E8F8FF", border: "#8DDAFF" } as TagTone,
  notYetHired: { text: "#7A5605", fill: "#FEF6E0", border: "#F6E3B4" } as TagTone,
  noIntermediary: { text: "#3D4657", fill: "#F5F7FD", border: "#E4E8F2" } as TagTone,
  unknown: { text: "#6B7488", fill: "#FFFFFF", border: "#D8DEEB" } as TagTone, // dashed
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
  sponsor: { text: "#7A52AE", fill: "#EFE6F7", border: "#DDD0EC" },
  "growth equity": { text: "#0B6346", fill: "#E7F7EF", border: "#C8EAD9" },
};

export function getBuyerTypeTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return BUYER_TYPE_TONES[key] ?? DEAL_TYPE_TONE;
}

/* -------------------------------------------------------------------------
 * 8 · Transaction signal
 * ---------------------------------------------------------------------- */

export const TRANSACTION_SIGNAL_TONES: Record<string, TagTone> = {
  "asymmetrix assessment": { text: "#1F35C4", fill: "#F1F4FE", border: "#C6D1FB" },
  "proprietary intel": { text: "#02527D", fill: "#E8F8FF", border: "#8DDAFF" },
  "long hold": { text: "#3D4657", fill: "#F5F7FD", border: "#E4E8F2" },
};

export function getTransactionSignalTone(value: string): TagTone {
  const key = String(value || "").trim().toLowerCase();
  return TRANSACTION_SIGNAL_TONES[key] ?? TRANSACTION_SIGNAL_TONES["long hold"];
}

/* -------------------------------------------------------------------------
 * 9 · Numeric value
 * ---------------------------------------------------------------------- */

export const NUMERIC_VALUE_TONES = {
  disclosed: { text: "#2A46EA", fill: "#FFFFFF", border: "#C6D1FB" } as TagTone,
  undisclosed: { text: "#6B7488", fill: "#FFFFFF", border: "#E4E8F2" } as TagTone,
};

/* -------------------------------------------------------------------------
 * 10 · Entity tags (chips) — links, never a dot
 * ---------------------------------------------------------------------- */

export const ENTITY_TONES = {
  company: { text: "#0F7040", fill: "#E4F5EC", hoverFill: "#D3EEE0" },
  investor: { text: "#0370AA", fill: "#E8F8FF", hoverFill: "#D5F1FE" },
  advisor: { text: "#93400F", fill: "#FCE3D2", hoverFill: "#F8D4BC" },
  individual: { text: "#372A78", fill: "#E4E0F6", hoverFill: "#D5CFF0" },
  sector: { text: "#523793", fill: "#F1EBFC", hoverFill: "#E5DAF9" },
  subsector: { text: "#5E4AA8", fill: "#FBF9FE", border: "#D8CDF0", hoverFill: "#F2ECFC" },
} as const;

export type EntityKind = keyof typeof ENTITY_TONES;

/* -------------------------------------------------------------------------
 * Generic style builders
 * ---------------------------------------------------------------------- */

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

/** Dotted status pill (Transaction status, News subtypes) — no visible border. */
export function dotPillStyleFromTone(tone: TagTone, bordered = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
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
