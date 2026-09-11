import type { CSSProperties } from "react";
import {
  dotPillStyleFromTone,
  formatTransactionStatusLabel as formatLabel,
  getTransactionStatusTone as getTone,
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
 * Dotted pill, no visible border — matches tags.txt §2 / .lp-chip.lp-chip-dot.
 * Fill alone separates the statuses; border is intentionally transparent.
 */
export function getTransactionStatusPillStyle(status: string): CSSProperties {
  const tone = getTone(status);
  return {
    ...dotPillStyleFromTone(tone),
    fontSize: 10.5,
    padding: "5px 10px",
    letterSpacing: "0.01em",
  };
}
