import { trackKeyAction, type TrackingSection } from "@/lib/tracking";

function isEmptyValue(value: unknown): boolean {
  if (value == null || value === "" || value === false) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isEmptyValue);
  }
  return false;
}

/** True when `current` differs from `defaults` in anything that is not empty on both sides. */
function hasActiveFilters(
  current: Record<string, unknown>,
  defaults: Record<string, unknown>
): boolean {
  const keys = Array.from(new Set(Object.keys(current).concat(Object.keys(defaults))));
  for (const key of keys) {
    if (JSON.stringify(current[key] ?? null) === JSON.stringify(defaults[key] ?? null)) continue;
    if (isEmptyValue(current[key]) && isEmptyValue(defaults[key])) continue;
    return true;
  }
  return false;
}

/** Payload keys that hold free text typed by the user. */
const SEARCH_TEXT_KEY =
  /^(search|search_term|searchterm|query|q|keyword|keywords|name|company_name|text)$/i;
const PAGING_KEY = /^(page|offset|per_page|perpage|user_id)$/i;
const SORT_KEY = /^(sort_column|sort_direction)$/i;

function clean(filters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (!PAGING_KEY.test(k) && !SORT_KEY.test(k) && k !== "export") out[k] = v;
  }
  return out;
}

/**
 * Section Insights: a list search was run. Fires `search` when free text changed, otherwise
 * `filter_applied`, with the number of results. Does nothing for the untouched default view
 * (initial load) or for paging and sorting alone.
 */
export function trackListQuery(args: {
  section: TrackingSection;
  filters: Record<string, unknown>;
  defaults: Record<string, unknown>;
  resultsCount?: number;
}): void {
  const current = clean(args.filters);
  const defaults = clean(args.defaults);
  if (!hasActiveFilters(current, defaults)) return;

  const changed = Object.keys(current).filter(
    (key) => JSON.stringify(current[key] ?? null) !== JSON.stringify(defaults[key] ?? null)
  );
  const textKey = changed.find(
    (key) => SEARCH_TEXT_KEY.test(key) && typeof current[key] === "string" && String(current[key]).trim()
  );
  trackKeyAction({
    section: args.section,
    action: textKey ? "search" : "filter_applied",
    actionDetail: changed.join(",").slice(0, 120),
    query: textKey ? String(current[textKey]).trim() : undefined,
    resultsCount: args.resultsCount,
  });
}
