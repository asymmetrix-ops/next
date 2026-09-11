import type { CSSProperties } from "react";
import {
  formatTransactionStatusLabel as formatLabel,
  getTransactionStatusTone as getTone,
  researchPillStyleFromTone,
} from "@/lib/tagColors";

export type TransactionStatusTone = {
  bg: string;
  fg: string;
  dot: string;
};

/** @deprecated colours now live in src/lib/tagColors.ts — kept for callers reading bg/fg/dot directly. */
export function getTransactionStatusTone(status: string): TransactionStatusTone {
  const tone = getTone(status);
  return { bg: tone.fill, fg: tone.text, dot: tone.dot || tone.text };
}

/** Normalizes transaction status labels to consistent title casing. */
export function formatTransactionStatusLabel(status: string): string {
  return formatLabel(status);
}

/**
 * Bordered pill — same visual language as Insights content-type badges (tags.txt §3).
 */
export function getTransactionStatusPillStyle(status: string): CSSProperties {
  const tone = getTone(status);
  return {
    ...researchPillStyleFromTone(tone),
    padding: "6px 10px",
    lineHeight: 1.4,
    whiteSpace: "normal",
    textAlign: "center",
  };
}
