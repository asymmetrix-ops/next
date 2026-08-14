import { EMPTY_DISPLAY, isEmptyDisplayValue } from "@/lib/emptyDisplay";

function parseMetricNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Preferred-currency conversion sometimes returns monetary *_m fields at
 * 1000× scale with spurious decimals (e.g. 22471.42 instead of 22.47142).
 */
export function normalizeMillionsFieldValue(value: unknown): number | null {
  const num = parseMetricNumber(value);
  if (num == null) return null;

  const abs = Math.abs(num);
  const hasSpuriousFraction =
    abs >= 100 && Math.abs(num - Math.round(num)) > 0.001;

  if (hasSpuriousFraction && abs >= 1_000) {
    const scaled = num / 1_000;
    if (Math.abs(scaled) < 100_000) return scaled;
  }

  return num;
}

/** Rounds millions-style metrics for display (e.g. 22.47 → "22.5", 16600 → "16,600"). */
export function formatMetricMillionsPlain(value: unknown): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (typeof value === "string" && isEmptyDisplayValue(value)) return EMPTY_DISPLAY;

  const num = normalizeMillionsFieldValue(value);
  if (num == null) return EMPTY_DISPLAY;

  return num.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(num) >= 100 ? 0 : 1,
  });
}
