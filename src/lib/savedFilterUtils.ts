/** Keys that describe paging/sorting rather than what the user filtered by. */
const NON_FILTER_KEYS = new Set([
  "page",
  "per_page",
  "perPage",
  "Offset",
  "Per_page",
  "sort_column",
  "sort_direction",
  "export",
]);

function isEmptyValue(value: unknown): boolean {
  if (value == null || value === "" || value === false) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isEmptyValue);
  }
  return false;
}

/** The filter state without paging/sorting, as saved and re-applied. */
export function stripNonFilterKeys<T extends Record<string, unknown>>(
  filters: T
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!NON_FILTER_KEYS.has(key)) out[key] = value;
  }
  return out;
}

/** True when the user has set anything beyond the view's default filters. */
export function hasActiveFilters(
  current: Record<string, unknown> | undefined,
  defaults: Record<string, unknown>
): boolean {
  if (!current) return false;
  const a = stripNonFilterKeys(current);
  const b = stripNonFilterKeys(defaults);
  const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b))));
  for (const key of keys) {
    if (JSON.stringify(a[key] ?? null) === JSON.stringify(b[key] ?? null)) continue;
    if (isEmptyValue(a[key]) && isEmptyValue(b[key])) continue;
    return true;
  }
  return false;
}

function collectLabels(value: unknown, out: string[]): void {
  if (out.length >= 6 || isEmptyValue(value)) return;
  if (typeof value === "string") {
    const text = value.trim();
    if (text && text.length <= 40) out.push(text);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectLabels(item, out));
  } else if (typeof value === "object" && value) {
    const record = value as Record<string, unknown>;
    const named = record.name ?? record.label ?? record.value;
    if (typeof named === "string") collectLabels(named, out);
    else Object.values(record).forEach((item) => collectLabels(item, out));
  }
}

/** e.g. "Companies - UK, Data Providers". The user can edit it before saving. */
export function suggestSavedFilterName(
  entityPlural: string,
  filters: Record<string, unknown>
): string {
  const labels: string[] = [];
  collectLabels(stripNonFilterKeys(filters), labels);
  const unique = Array.from(new Set(labels)).slice(0, 4);
  return unique.length > 0
    ? `${entityPlural} - ${unique.join(", ")}`
    : entityPlural;
}
