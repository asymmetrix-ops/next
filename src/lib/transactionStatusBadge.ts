import type { CSSProperties } from "react";

export type TransactionStatusTone = {
  bg: string;
  fg: string;
  dot: string;
};

export function getTransactionStatusTone(status: string): TransactionStatusTone {
  const s = String(status || "").toLowerCase();
  if (s.includes("reported")) {
    return { bg: "#E4F5EC", fg: "#0F7040", dot: "#17A05C" };
  }
  if (s.includes("rumoured") || s.includes("rumored")) {
    return { bg: "#FEF6E0", fg: "#7A5605", dot: "#E0A32E" };
  }
  if (s.includes("hold")) {
    return { bg: "#F5F7FD", fg: "#566078", dot: "#B4BCCB" };
  }
  return { bg: "#F1F4FE", fg: "#1F35C4", dot: "#3D5BF3" };
}

/** Normalizes transaction status labels to consistent title casing. */
export function formatTransactionStatusLabel(status: string): string {
  const raw = String(status || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/^transaction\s+/i, "").trim() || raw;
  const s = normalized.toLowerCase();
  if (s.includes("reported")) return "Reported in Market";
  if (s.includes("rumoured") || s.includes("rumored")) return "Rumored in Market";
  if (s.includes("anticipated")) return "Anticipated within 18 months";
  if (s.includes("hold")) return "Process on Hold";
  return normalized
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (
        i > 0 &&
        ["within", "in", "on", "of", "the", "a", "an", "and"].includes(lower)
      ) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function getTransactionStatusPillStyle(status: string): CSSProperties {
  const { bg, fg, dot } = getTransactionStatusTone(status);
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 10.5,
    lineHeight: 1,
    padding: "5px 10px",
    borderRadius: 9999,
    fontWeight: 700,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    border: `1.5px solid ${dot}`,
    backgroundColor: bg,
    color: fg,
  };
}
