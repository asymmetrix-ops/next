import type {
  FilterBarState,
  FilterItem,
} from "@/components/companies/CompaniesFilterBar";
import type { FinancialScreenerItem } from "@/app/financials/actions";
import {
  FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG,
  type FinancialScreenerOwnershipTab,
  type PrimarySector,
  type SecondarySector,
  type OwnershipType,
} from "./financialScreenerFilterConfig";

export interface FinancialScreenerFilters {
  page?: number;
  per_page?: number;
  query?: string | null;
  ownership_tab?: FinancialScreenerOwnershipTab;
  filters?: FilterItem[];
  filter_logic?: "and" | "or";
}

function hasRangeValue(value: unknown): value is { min?: number; max?: number } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { min?: number; max?: number };
  return rv.min !== undefined || rv.max !== undefined;
}

function isUnboundedMax(max: number | undefined): boolean {
  if (max === undefined) return false;
  return max >= 1e15 || max === Number.MAX_SAFE_INTEGER;
}

function getEnumValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

export function buildFinancialScreenerSearchPayload(args: {
  state: FilterBarState;
  ownershipTab: FinancialScreenerOwnershipTab;
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
  ownershipTypes: OwnershipType[];
  page?: number;
  perPage?: number;
}): FinancialScreenerFilters {
  const {
    state,
    ownershipTab,
    page = 1,
    perPage = 25,
  } = args;

  return {
    page,
    per_page: perPage,
    query: state.searchText.trim() || null,
    ownership_tab: ownershipTab,
    filters: state.filters,
    filter_logic: state.filterLogic,
  };
}

export function financialScreenerFiltersToSearchParams(
  filters: FinancialScreenerFilters
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("Offset", String(filters.page ?? 1));
  params.set("Per_page", String(filters.per_page ?? 25));

  if (filters.query) {
    params.set("query", filters.query);
  }

  if (filters.ownership_tab && filters.ownership_tab !== "all") {
    const tabConfig = FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG[filters.ownership_tab];
    if (tabConfig) {
      params.set("ownership_type", tabConfig.apiValue);
    }
  }

  if (filters.filters?.length) {
    for (const filter of filters.filters) {
      appendFilterToParams(params, filter);
    }
    if (filters.filter_logic) {
      params.set("filter_logic", filters.filter_logic);
    }
  }

  return params;
}

function appendFilterToParams(params: URLSearchParams, filter: FilterItem): void {
  const prefix = `filter_${filter.id}`;

  if (hasRangeValue(filter.value)) {
    const { min, max } = filter.value;
    if (min !== undefined) params.append(`${prefix}_min`, String(min));
    if (max !== undefined && !isUnboundedMax(max)) {
      params.append(`${prefix}_max`, String(max));
    }
    return;
  }

  const values = getEnumValues(filter.value);
  for (const value of values) {
    params.append(prefix, value);
  }
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function getItemSectorNames(
  sectors: FinancialScreenerItem["primary_sectors"] | FinancialScreenerItem["secondary_sectors"]
): string[] {
  if (!Array.isArray(sectors)) return [];
  return sectors
    .map((s) => s.sector_name?.trim())
    .filter((name): name is string => Boolean(name));
}

function getMetricValue(
  item: FinancialScreenerItem,
  filterId: string
): number | null {
  const fin = item.financials ?? {};
  switch (filterId) {
    case "revenue":
      return parseNumber(fin.revenue_m);
    case "rev_growth":
      return parseNumber(fin.rev_growth_pct);
    case "ebitda":
      return parseNumber(fin.ebitda_m);
    case "ebitda_margin":
      return parseNumber(fin.ebitda_margin_pct);
    case "ebit":
      return parseNumber(fin.ebit_m);
    case "enterprise_value":
      return parseNumber(fin.ev_m);
    case "ev_revenue":
      return parseNumber(fin.ev_revenue);
    case "ev_ebit":
      return parseNumber(fin.ev_ebit);
    case "ev_ebitda":
      return parseNumber(fin.ev_ebitda);
    case "rev_multiple":
      return parseNumber(fin.rev_multiple);
    case "fte":
      return parseNumber(item.fte);
    case "financial_year":
      return parseNumber(item.financial_year);
    default:
      return null;
  }
}

function matchesRangeFilter(
  value: number | null,
  range: { min?: number; max?: number }
): boolean {
  if (value == null) return false;
  if (range.min !== undefined && value < range.min) return false;
  if (
    range.max !== undefined &&
    !isUnboundedMax(range.max) &&
    value > range.max
  ) {
    return false;
  }
  return true;
}

function matchesFilter(
  item: FinancialScreenerItem,
  filter: FilterItem
): boolean {
  if (hasRangeValue(filter.value)) {
    const metric = getMetricValue(item, filter.id);
    return matchesRangeFilter(metric, filter.value);
  }

  const enumValues = getEnumValues(filter.value);
  if (enumValues.length === 0) return true;

  switch (filter.id) {
    case "primary_sector": {
      const names = getItemSectorNames(item.primary_sectors);
      return enumValues.some((v) => names.includes(v));
    }
    case "secondary_sector": {
      const names = getItemSectorNames(item.secondary_sectors);
      return enumValues.some((v) => names.includes(v));
    }
    case "country": {
      const country = item.location?.country?.trim() ?? "";
      return enumValues.includes(country);
    }
    case "ownership": {
      const ownership = item.ownership_type?.trim() ?? "";
      return enumValues.includes(ownership);
    }
    case "financial_year": {
      const year = String(item.financial_year ?? "").trim();
      return enumValues.includes(year);
    }
    default:
      return true;
  }
}

export function itemMatchesSearch(
  item: FinancialScreenerItem,
  query: string | null | undefined
): boolean {
  const q = query?.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.name,
    item.url,
    item.ownership_type,
    item.location?.country,
    item.location?.city,
    ...(item.primary_sectors ?? []).map((s) => s.sector_name),
    ...(item.secondary_sectors ?? []).map((s) => s.sector_name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function itemMatchesOwnershipTab(
  item: FinancialScreenerItem,
  tab: FinancialScreenerOwnershipTab
): boolean {
  if (tab === "all") return true;
  const config = FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG[tab];
  return item.ownership_type === config.apiValue;
}

export function applyClientFilters(
  items: FinancialScreenerItem[],
  filters: FinancialScreenerFilters
): FinancialScreenerItem[] {
  const activeFilters =
    filters.filters?.filter((filter) => {
      if (hasRangeValue(filter.value)) return true;
      return getEnumValues(filter.value).length > 0;
    }) ?? [];

  return items.filter((item) => {
    if (!itemMatchesSearch(item, filters.query)) return false;
    if (!itemMatchesOwnershipTab(item, filters.ownership_tab ?? "all")) {
      return false;
    }
    if (activeFilters.length === 0) return true;

    const logic = filters.filter_logic ?? "and";
    if (logic === "or") {
      return activeFilters.some((filter) => matchesFilter(item, filter));
    }
    return activeFilters.every((filter) => matchesFilter(item, filter));
  });
}

export function hasActiveClientFilters(filters: FinancialScreenerFilters): boolean {
  const hasQuery = Boolean(filters.query?.trim());
  const hasChipFilters = Boolean(
    filters.filters?.some((filter) => {
      if (hasRangeValue(filter.value)) return true;
      return getEnumValues(filter.value).length > 0;
    })
  );
  return hasQuery || hasChipFilters;
}
