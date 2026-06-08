/** Standard UI placeholder when a field has no data. */
export const EMPTY_DISPLAY = "-";

const LEGACY_EMPTY_VALUES = new Set([
  "",
  EMPTY_DISPLAY,
  "-",
  "–",
  "-",
  "n/a",
  "-",
  "-",
]);

/** Normalize legacy empty strings (API or old UI) to the standard placeholder. */
export function normalizeEmptyDisplay(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined) return EMPTY_DISPLAY;
  const text = String(value).trim();
  if (!text || LEGACY_EMPTY_VALUES.has(text)) return EMPTY_DISPLAY;
  return text;
}

export function isEmptyDisplayValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return true;
  return LEGACY_EMPTY_VALUES.has(text);
}

export function isNonEmptyDisplayString(
  value: unknown
): value is string {
  return typeof value === "string" && !isEmptyDisplayValue(value);
}
