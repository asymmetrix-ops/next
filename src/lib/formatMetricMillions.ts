import { EMPTY_DISPLAY, isEmptyDisplayValue } from "@/lib/emptyDisplay";

function parseMetricNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Rounds millions-style metrics for display (e.g. 16600.42 → "16,600"). */
export function formatMetricMillionsPlain(value: unknown): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (typeof value === "string" && isEmptyDisplayValue(value)) return EMPTY_DISPLAY;

  const num = parseMetricNumber(value);
  if (num == null) return EMPTY_DISPLAY;

  return num.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(num) >= 100 ? 0 : 1,
  });
}
