import type { FilterBarState, FilterItem } from "@/components/companies/CompaniesFilterBar";

export interface AdvisorsSearchFilters {
  searchQuery: string;
  page: number;
  per_page: number;
  countries: string[];
  provinces: string[];
  cities: string[];
  Continental_Region: string[];
  geographical_sub_region: string[];
  primarySectors: number[];
  secondarySectors: number[];
  corporate_events_advised_min?: number | null;
  corporate_events_advised_max?: number | null;
  portfolio_only: boolean;
}

type SectorRef = { id: number; sector_name: string };

function hasRangeValue(value: unknown): value is { min?: number; max?: number } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { min?: number; max?: number };
  return rv.min !== undefined || rv.max !== undefined;
}

function resolveSectorIds(names: string[], sectors: SectorRef[]): number[] {
  const ids = names
    .map((name) => sectors.find((sector) => sector.sector_name === name)?.id)
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

function applyFilterItem(
  filters: AdvisorsSearchFilters,
  item: FilterItem,
  primarySectors: SectorRef[],
  secondarySectors: SectorRef[]
): AdvisorsSearchFilters {
  const v = item.value;
  if (v == null) return filters;

  const next = { ...filters };

  if (item.id === "region" && Array.isArray(v)) {
    next.Continental_Region = v as string[];
    return next;
  }
  if (item.id === "sub_region" && Array.isArray(v)) {
    next.geographical_sub_region = v as string[];
    return next;
  }
  if (item.id === "country" && Array.isArray(v)) {
    next.countries = v as string[];
    return next;
  }
  if (item.id === "state" && Array.isArray(v)) {
    next.provinces = v as string[];
    return next;
  }
  if (item.id === "city" && Array.isArray(v)) {
    next.cities = v as string[];
    return next;
  }
  if (item.id === "primary_sector" && Array.isArray(v)) {
    next.primarySectors = resolveSectorIds(v as string[], primarySectors);
    return next;
  }
  if (item.id === "secondary_sector" && Array.isArray(v)) {
    next.secondarySectors = resolveSectorIds(v as string[], secondarySectors);
    return next;
  }
  if (item.id === "corporate_events" && hasRangeValue(v)) {
    next.corporate_events_advised_min = v.min ?? null;
    next.corporate_events_advised_max = v.max ?? null;
    return next;
  }
  if (item.id === "followed" && v === true) {
    next.portfolio_only = true;
    return next;
  }

  return next;
}

export const createDefaultAdvisorFilters = (): AdvisorsSearchFilters => ({
  searchQuery: "",
  page: 1,
  per_page: 25,
  countries: [],
  provinces: [],
  cities: [],
  Continental_Region: [],
  geographical_sub_region: [],
  primarySectors: [],
  secondarySectors: [],
  corporate_events_advised_min: null,
  corporate_events_advised_max: null,
  portfolio_only: false,
});

export function buildAdvisorsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  page?: number;
  perPage?: number;
}): AdvisorsSearchFilters {
  const { state, primarySectors, secondarySectors, page = 1, perPage = 25 } = args;

  let filters = createDefaultAdvisorFilters();
  filters.searchQuery = state.searchText.trim();
  filters.page = page;
  filters.per_page = perPage;

  for (const item of state.filters) {
    filters = applyFilterItem(filters, item, primarySectors, secondarySectors);
  }

  return filters;
}

export function advisorsFiltersToSearchParams(
  filters: AdvisorsSearchFilters
): URLSearchParams {
  const params = new URLSearchParams();
  const page = Math.max(1, filters.page || 1);
  const perPage = filters.per_page > 0 ? filters.per_page : 25;

  params.append("page", String(page));
  params.append("per_page", String(perPage));

  if (filters.searchQuery) {
    params.append("search_query", filters.searchQuery);
  }

  filters.countries.forEach((country) => params.append("Countries[]", country));
  filters.provinces.forEach((province) => params.append("Provinces[]", province));
  filters.cities.forEach((city) => params.append("Cities[]", city));

  if (filters.Continental_Region.length > 0) {
    params.append("Continental_Region", filters.Continental_Region.join(","));
  }
  if (filters.geographical_sub_region.length > 0) {
    params.append(
      "geographical_sub_region",
      filters.geographical_sub_region.join(",")
    );
  }

  filters.primarySectors.forEach((sector) =>
    params.append("primary_sectors_ids[]", sector.toString())
  );
  filters.secondarySectors.forEach((sector) =>
    params.append("Secondary_sectors_ids[]", sector.toString())
  );

  if (typeof filters.corporate_events_advised_min === "number") {
    params.append(
      "corporate_events_advised_min",
      String(filters.corporate_events_advised_min)
    );
  }
  if (typeof filters.corporate_events_advised_max === "number") {
    params.append(
      "corporate_events_advised_max",
      String(filters.corporate_events_advised_max)
    );
  }

  params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
  return params;
}

/** Counts endpoint uses comma-separated strings instead of array params. */
export function advisorsCountsFiltersToSearchParams(
  filters: AdvisorsSearchFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.countries.length > 0) {
    params.append("Countries", filters.countries.join(","));
  }
  if (filters.provinces.length > 0) {
    params.append("Provinces", filters.provinces.join(","));
  }
  if (filters.cities.length > 0) {
    params.append("Cities", filters.cities.join(","));
  }
  if (filters.Continental_Region.length > 0) {
    params.append("Continental_Region", filters.Continental_Region.join(","));
  }
  if (filters.geographical_sub_region.length > 0) {
    params.append(
      "geographical_sub_region",
      filters.geographical_sub_region.join(",")
    );
  }
  if (filters.searchQuery) {
    params.append("search_query", filters.searchQuery);
  }
  if (filters.primarySectors.length > 0) {
    params.append("primary_sectors_ids", filters.primarySectors.join(","));
  }
  if (filters.secondarySectors.length > 0) {
    params.append("Secondary_sectors_ids", filters.secondarySectors.join(","));
  }
  if (typeof filters.corporate_events_advised_min === "number") {
    params.append(
      "corporate_events_advised_min",
      String(filters.corporate_events_advised_min)
    );
  }
  if (typeof filters.corporate_events_advised_max === "number") {
    params.append(
      "corporate_events_advised_max",
      String(filters.corporate_events_advised_max)
    );
  }
  params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
  return params;
}
