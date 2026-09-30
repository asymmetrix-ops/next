import type { FilterBarState, FilterItem } from "@/components/companies/CompaniesFilterBar";

export type IndividualsSortBy = "name" | "corporate_events_count";
export type IndividualsSortDir = "asc" | "desc";

export interface IndividualsSearchFilters {
  Search_Query: string;
  page: number;
  per_page: number;
  Countries: string[];
  Provinces: string[];
  Cities: string[];
  Continental_Region: string[];
  geographical_sub_region: string[];
  Primary_Sectors: number[];
  Secondary_Sectors: number[];
  Job_Titles: number[];
  /** Current employer company ids (requires `current_company_ids` backend support). */
  Current_Companies: number[];
  /** Advisor deal count range (non-advisors count as 0). */
  Advisor_Deal_Count_Min?: number;
  Advisor_Deal_Count_Max?: number;
  Statuses: string[];
  portfolio_only: boolean;
  advisors_only?: boolean;
  sort_by?: IndividualsSortBy;
  sort_dir?: IndividualsSortDir;
}

type SectorRef = { id: number; sector_name: string };
type JobTitleRef = { id: number; job_title: string };

function resolveSectorIds(names: string[], sectors: SectorRef[]): number[] {
  const ids = names
    .map((name) => sectors.find((sector) => sector.sector_name === name)?.id)
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

function resolveJobTitleIds(
  labels: string[],
  jobTitles: JobTitleRef[]
): number[] {
  const ids = labels
    .map((label) => jobTitles.find((title) => title.job_title === label)?.id)
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

function applyFilterItem(
  filters: IndividualsSearchFilters,
  item: FilterItem,
  primarySectors: SectorRef[],
  secondarySectors: SectorRef[],
  jobTitles: JobTitleRef[]
): IndividualsSearchFilters {
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
    next.Countries = v as string[];
    return next;
  }
  if (item.id === "state" && Array.isArray(v)) {
    next.Provinces = v as string[];
    return next;
  }
  if (item.id === "city" && Array.isArray(v)) {
    next.Cities = v as string[];
    return next;
  }
  if (item.id === "primary_sector" && Array.isArray(v)) {
    next.Primary_Sectors = resolveSectorIds(v as string[], primarySectors);
    return next;
  }
  if (item.id === "secondary_sector" && Array.isArray(v)) {
    next.Secondary_Sectors = resolveSectorIds(v as string[], secondarySectors);
    return next;
  }
  if (item.id === "job_title" && Array.isArray(v)) {
    next.Job_Titles = resolveJobTitleIds(v as string[], jobTitles);
    return next;
  }
  if (item.id === "current_company" && Array.isArray(v)) {
    const ids = (v as string[])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);
    next.Current_Companies = Array.from(new Set(ids));
    return next;
  }
  if (
    item.id === "corporate_events" &&
    typeof v === "object" &&
    !Array.isArray(v)
  ) {
    const range = v as { min?: number; max?: number };
    if (range.min !== undefined) next.Advisor_Deal_Count_Min = range.min;
    if (range.max !== undefined) next.Advisor_Deal_Count_Max = range.max;
    return next;
  }
  if (item.id === "status" && Array.isArray(v)) {
    next.Statuses = v as string[];
    return next;
  }
  if (item.id === "followed" && v === true) {
    next.portfolio_only = true;
    return next;
  }

  return next;
}

export const createDefaultIndividualFilters = (): IndividualsSearchFilters => ({
  Search_Query: "",
  page: 1,
  per_page: 50,
  Countries: [],
  Provinces: [],
  Cities: [],
  Continental_Region: [],
  geographical_sub_region: [],
  Primary_Sectors: [],
  Secondary_Sectors: [],
  Job_Titles: [],
  Current_Companies: [],
  Statuses: [],
  portfolio_only: false,
  sort_by: "name",
  sort_dir: "asc",
});

export function buildIndividualsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  jobTitles: JobTitleRef[];
  page?: number;
  perPage?: number;
  roleTabJobTitleIds?: number[];
  roleTabStatuses?: string[];
}): IndividualsSearchFilters {
  const {
    state,
    primarySectors,
    secondarySectors,
    jobTitles,
    page = 1,
    perPage = 50,
    roleTabJobTitleIds,
    roleTabStatuses,
  } = args;

  let filters = createDefaultIndividualFilters();
  filters.Search_Query = state.searchText.trim();
  filters.page = page;
  filters.per_page = perPage;

  for (const item of state.filters) {
    filters = applyFilterItem(
      filters,
      item,
      primarySectors,
      secondarySectors,
      jobTitles
    );
  }

  if (roleTabJobTitleIds && roleTabJobTitleIds.length > 0) {
    filters.Job_Titles = [...roleTabJobTitleIds];
  }
  if (roleTabStatuses && roleTabStatuses.length > 0) {
    filters.Statuses = [...roleTabStatuses];
  }

  return filters;
}

/** Counts payload — filter bar only, no role-tab constraints. */
export function buildIndividualsCountsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  jobTitles: JobTitleRef[];
}): IndividualsSearchFilters {
  return buildIndividualsSearchPayload({
    ...args,
    page: 0,
    perPage: 0,
  });
}

function appendIndividualsFilterParams(
  params: URLSearchParams,
  filters: IndividualsSearchFilters
): void {
  if (filters.Search_Query) {
    params.append("search_query", filters.Search_Query);
  }

  if (filters.Countries.length > 0) {
    params.append("Countries", filters.Countries.join(","));
  }
  if (filters.Provinces.length > 0) {
    params.append("Provinces", filters.Provinces.join(","));
  }
  if (filters.Cities.length > 0) {
    params.append("Cities", filters.Cities.join(","));
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
  if (filters.Primary_Sectors.length > 0) {
    params.append("primary_sectors_ids", filters.Primary_Sectors.join(","));
  }
  if (filters.Secondary_Sectors.length > 0) {
    params.append("Secondary_sectors_ids", filters.Secondary_Sectors.join(","));
  }
  if (filters.Job_Titles.length > 0) {
    params.append("job_titles_ids", filters.Job_Titles.join(","));
  }
  if (filters.Current_Companies.length > 0) {
    params.append("current_company_ids", filters.Current_Companies.join(","));
  }
  if (filters.Advisor_Deal_Count_Min !== undefined) {
    params.append("advisor_deal_count_min", String(filters.Advisor_Deal_Count_Min));
  }
  if (filters.Advisor_Deal_Count_Max !== undefined) {
    params.append("advisor_deal_count_max", String(filters.Advisor_Deal_Count_Max));
  }
  if (filters.Statuses.length > 0) {
    params.append("statuses", filters.Statuses.join(","));
  }

  params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
}

export function individualsFiltersToSearchParams(
  filters: IndividualsSearchFilters
): URLSearchParams {
  const params = new URLSearchParams();
  const page = Math.max(1, filters.page || 1);
  const perPage = filters.per_page > 0 ? filters.per_page : 50;

  params.append("Offset", String(page));
  params.append("Per_page", String(perPage));
  appendIndividualsFilterParams(params, filters);
  return params;
}

export function individualsCountsFiltersToSearchParams(
  filters: IndividualsSearchFilters
): URLSearchParams {
  const params = new URLSearchParams();
  params.append("Offset", "0");
  params.append("Per_page", "0");
  appendIndividualsFilterParams(params, filters);
  return params;
}

function toIndividualsApiArray<T>(values: T[]): T[] | null {
  return values.length > 0 ? values : null;
}

/** Xano `get_all_individuals` expects POST with string pagination and null filters. */
export function individualsFiltersToRequestBody(
  filters: IndividualsSearchFilters
): Record<string, unknown> {
  const page = Math.max(1, filters.page || 1);
  const perPage = filters.per_page > 0 ? filters.per_page : 50;

  const itemOffset = (page - 1) * perPage + 1;

  return {
    search_query: filters.Search_Query || "",
    Offset: String(itemOffset),
    Per_page: String(perPage),
    Countries: toIndividualsApiArray(filters.Countries),
    Provinces: toIndividualsApiArray(filters.Provinces),
    Cities: toIndividualsApiArray(filters.Cities),
    Continental_Region: toIndividualsApiArray(filters.Continental_Region),
    geographical_sub_region: toIndividualsApiArray(
      filters.geographical_sub_region
    ),
    primary_sectors_ids: toIndividualsApiArray(filters.Primary_Sectors),
    Secondary_sectors_ids: toIndividualsApiArray(filters.Secondary_Sectors),
    job_titles_ids: toIndividualsApiArray(filters.Job_Titles),
    current_company_ids: toIndividualsApiArray(filters.Current_Companies),
    advisor_deal_count_min: filters.Advisor_Deal_Count_Min ?? null,
    advisor_deal_count_max: filters.Advisor_Deal_Count_Max ?? null,
    statuses: toIndividualsApiArray(filters.Statuses),
    portfolio_only: filters.portfolio_only ? true : null,
    ...(filters.advisors_only ? { advisors_only: "true" } : {}),
    sort_by: filters.sort_by ?? "name",
    sort_dir: filters.sort_dir ?? "asc",
  };
}
