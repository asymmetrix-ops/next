/**
 * Shared URL <-> filter-bar state contract for list views (used by AsymmIQ deep links).
 *
 * URL format (all values URL-encoded by URLSearchParams):
 *   f.<filterId>=<v1>&f.<filterId>=<v2>   multi-select / enum filters (repeat the param)
 *   f.<filterId>=<min>~<max>               numeric range, either side may be empty ("100~", "~50")
 *   f.<filterId>=<from>~<to>               date range (YYYY-MM-DD), either side may be empty
 *   f.<filterId>=true                      boolean filters
 *   sort=<serverSortKey>:<asc|desc>        server-side sort (list-specific allowlist)
 *   logic=and|or                           how the filters combine (default "and")
 *
 * The URL only ever carries whitelisted filter ids and typed values. It never carries SQL:
 * the existing build*Payload functions turn the resulting filter state into server clauses.
 */
import {
  createFilterInstanceKey,
  type FilterBarState,
  type FilterItem,
} from "@/components/companies/CompaniesFilterBar";

export type UrlFilterKind = "enum[]" | "range" | "dateRange" | "boolean";

export type ListUrlSpec = {
  /** filter id -> value kind; anything else in the URL is ignored. */
  filters: Record<string, UrlFilterKind>;
  /** allowed values for `sort` (server sort keys). */
  sortKeys: readonly string[];
};

export type ParsedListUrl = {
  filterBarState: FilterBarState | null;
  sort: { key: string; dir: "asc" | "desc" } | null;
  /** URL params that were ignored (unknown id, bad value). For logging only. */
  rejected: string[];
};

const MAX_VALUES_PER_FILTER = 25;
const MAX_VALUE_LENGTH = 120;

function parseNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function parseDate(raw: string): string | undefined {
  const trimmed = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

export function parseListUrlFilters(
  params: URLSearchParams,
  spec: ListUrlSpec
): ParsedListUrl {
  const rejected: string[] = [];
  const grouped = new Map<string, string[]>();

  params.forEach((value, name) => {
    if (!name.startsWith("f.")) return;
    const id = name.slice(2);
    if (!Object.prototype.hasOwnProperty.call(spec.filters, id)) {
      rejected.push(name);
      return;
    }
    grouped.set(id, [...(grouped.get(id) ?? []), value]);
  });

  const filters: FilterItem[] = [];
  for (const [id, values] of Array.from(grouped.entries())) {
    const kind = spec.filters[id];
    let parsed: unknown;

    if (kind === "enum[]") {
      const list = values
        .map((v) => v.trim())
        .filter((v) => v && v.length <= MAX_VALUE_LENGTH)
        .slice(0, MAX_VALUES_PER_FILTER);
      if (list.length > 0) parsed = list;
    } else if (kind === "range") {
      const [rawMin = "", rawMax = ""] = values[0].split("~");
      const min = parseNumber(rawMin);
      const max = parseNumber(rawMax);
      if (min !== undefined || max !== undefined) {
        parsed = {
          ...(min !== undefined ? { min } : {}),
          ...(max !== undefined ? { max } : {}),
        };
      }
    } else if (kind === "dateRange") {
      const [rawFrom = "", rawTo = ""] = values[0].split("~");
      const from = parseDate(rawFrom);
      const to = parseDate(rawTo);
      if (from || to) {
        parsed = { ...(from ? { from } : {}), ...(to ? { to } : {}) };
      }
    } else if (kind === "boolean") {
      if (values[0] === "true") parsed = true;
    }

    if (parsed === undefined) {
      rejected.push(`f.${id}`);
      continue;
    }
    filters.push({ id, key: createFilterInstanceKey(), value: parsed });
  }

  let sort: ParsedListUrl["sort"] = null;
  const rawSort = params.get("sort");
  if (rawSort) {
    const [key, dirRaw = "desc"] = rawSort.split(":");
    const dir = dirRaw === "asc" ? "asc" : dirRaw === "desc" ? "desc" : null;
    if (dir && spec.sortKeys.includes(key)) {
      sort = { key, dir };
    } else {
      rejected.push("sort");
    }
  }

  const logic = params.get("logic") === "or" ? "or" : "and";

  return {
    filterBarState:
      filters.length > 0
        ? {
            filters,
            viewId: null,
            searchText: params.get("search")?.trim() ?? "",
            filterLogic: logic,
          }
        : null,
    sort,
    rejected,
  };
}

/** Inverse of parseListUrlFilters. Used for docs/tests and any "share this view" feature. */
export function buildListUrl(
  path: string,
  spec: ListUrlSpec,
  filters: Array<{ id: string; value: unknown }>,
  sort?: { key: string; dir: "asc" | "desc" } | null,
  logic: "and" | "or" = "and"
): string {
  const params = new URLSearchParams();
  for (const { id, value } of filters) {
    const kind = spec.filters[id];
    if (!kind) continue;
    if (kind === "enum[]" && Array.isArray(value)) {
      for (const v of value) params.append(`f.${id}`, String(v));
    } else if (kind === "range" || kind === "dateRange") {
      const v = value as Record<string, unknown>;
      const lo = kind === "range" ? v.min : v.from;
      const hi = kind === "range" ? v.max : v.to;
      params.append(`f.${id}`, `${lo ?? ""}~${hi ?? ""}`);
    } else if (kind === "boolean" && value === true) {
      params.append(`f.${id}`, "true");
    }
  }
  if (sort && spec.sortKeys.includes(sort.key)) {
    params.set("sort", `${sort.key}:${sort.dir}`);
  }
  if (logic === "or") params.set("logic", "or");
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Filters whose value names must be resolved to ids from lookup lists before searching. */
export function filterIdsNeedingLookups(
  state: FilterBarState | null | undefined,
  lookupFilterIds: readonly string[]
): string[] {
  if (!state) return [];
  return state.filters
    .map((f) => f.id)
    .filter((id) => lookupFilterIds.includes(id));
}
