import type { FilterBarState, FilterItem } from "@/components/companies/CompaniesFilterBar";

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
  Statuses: string[];
  portfolio_only: boolean;
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
  Statuses: [],
  portfolio_only: false,
});

export function buildIndividualsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  jobTitles: JobTitleRef[];
  page?: number;
  perPage?: number;
}): IndividualsSearchFilters {
  const {
    state,
    primarySectors,
    secondarySectors,
    jobTitles,
    page = 1,
    perPage = 50,
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

  return filters;
}

export function individualsFiltersToSearchParams(
  filters: IndividualsSearchFilters
): URLSearchParams {
  const params = new URLSearchParams();
  const page = Math.max(1, filters.page || 1);
  const perPage = filters.per_page > 0 ? filters.per_page : 50;

  params.append("Offset", String(page));
  params.append("Per_page", String(perPage));

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
  if (filters.Statuses.length > 0) {
    params.append("statuses", filters.Statuses.join(","));
  }

  params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
  return params;
}
