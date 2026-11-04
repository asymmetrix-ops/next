import { hasActiveFilters, stripNonFilterKeys } from "@/lib/savedFilterUtils";
import { trackKeyAction, type TrackingSection } from "@/lib/tracking";

/** Payload keys that hold free text typed by the user. */
const SEARCH_TEXT_KEY =
  /^(search|search_term|searchterm|query|q|keyword|keywords|name|company_name|text)$/i;
const PAGING_KEY = /^(page|offset|per_page|perpage|user_id)$/i;

function clean(filters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(stripNonFilterKeys(filters))) {
    if (!PAGING_KEY.test(k)) out[k] = v;
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
