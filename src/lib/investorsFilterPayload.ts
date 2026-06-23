import type { FilterBarState, FilterItem } from "@/components/companies/CompaniesFilterBar";
import type { InvestorTypeTab } from "@/components/investors/investorsFilterConfig";
import {
  getInvestorTypeIdsForTab,
  getInvestorTypeLabel,
  type InvestorTypeOption,
} from "@/components/investors/investorsFilterConfig";

export interface InvestorsSearchFilters {
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
  Investor_Types: number[];
  Portfolio_Companies_Min: number;
  Portfolio_Companies_Max: number;
  Years_Since_Last_Investment_Min?: number;
  Years_Since_Last_Investment_Max?: number;
  portfolio_only: boolean;
}

export const createDefaultInvestorFilters = (): InvestorsSearchFilters => ({
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
  Investor_Types: [],
  Portfolio_Companies_Min: 0,
  Portfolio_Companies_Max: 0,
  portfolio_only: false,
});

function hasRangeValue(value: unknown): value is { min?: number; max?: number } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { min?: number; max?: number };
  return rv.min !== undefined || rv.max !== undefined;
}

function resolveSectorIds(
  names: string[],
  sectors: Array<{ id: number; sector_name: string }>
): number[] {
  const ids = names
    .map((name) => sectors.find((sector) => sector.sector_name === name)?.id)
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

function resolveInvestorTypeIds(
  labels: string[],
  investorTypes: InvestorTypeOption[]
): number[] {
  const ids = labels
    .map((label) =>
      investorTypes.find((type) => getInvestorTypeLabel(type) === label)?.id
    )
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

function applyFilterItem(
  filters: InvestorsSearchFilters,
  item: FilterItem,
  primarySectors: Array<{ id: number; sector_name: string }>,
  secondarySectors: Array<{ id: number; sector_name: string }>,
  investorTypes: InvestorTypeOption[]
): InvestorsSearchFilters {
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
  if (item.id === "investor_type" && Array.isArray(v)) {
    next.Investor_Types = resolveInvestorTypeIds(v as string[], investorTypes);
    return next;
  }
  if (item.id === "portfolio_companies" && hasRangeValue(v)) {
    next.Portfolio_Companies_Min = v.min ?? 0;
    next.Portfolio_Companies_Max = v.max ?? 0;
    return next;
  }
  if (item.id === "years_since_inv" && hasRangeValue(v)) {
    next.Years_Since_Last_Investment_Min = v.min;
    next.Years_Since_Last_Investment_Max = v.max;
    return next;
  }
  if (item.id === "followed" && v === true) {
    next.portfolio_only = true;
    return next;
  }

  return next;
}

export function buildInvestorsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: Array<{ id: number; sector_name: string }>;
  secondarySectors: Array<{ id: number; sector_name: string }>;
  investorTypes: InvestorTypeOption[];
  investorTypeTab?: InvestorTypeTab;
  applyInvestorTypeTabFilter?: boolean;
  investorTypeIds?: number[];
  page?: number;
  perPage?: number;
}): InvestorsSearchFilters {
  const {
    state,
    primarySectors,
    secondarySectors,
    investorTypes,
    investorTypeTab = "all",
    applyInvestorTypeTabFilter = true,
    investorTypeIds,
    page = 1,
    perPage = 50,
  } = args;

  let filters = createDefaultInvestorFilters();
  filters.Search_Query = state.searchText.trim();
  filters.page = page;
  filters.per_page = perPage;

  for (const item of state.filters) {
    filters = applyFilterItem(
      filters,
      item,
      primarySectors,
      secondarySectors,
      investorTypes
    );
  }

  if (applyInvestorTypeTabFilter) {
    const tabIds =
      investorTypeIds ??
      (investorTypeTab !== "all"
        ? getInvestorTypeIdsForTab(investorTypeTab, investorTypes)
        : []);
    if (tabIds.length > 0) {
      filters.Investor_Types = Array.from(
        new Set([...filters.Investor_Types, ...tabIds])
      );
    }
  }

  return filters;
}

export function investorsFiltersToSearchParams(
  filters: InvestorsSearchFilters
): URLSearchParams {
  const params = new URLSearchParams();
  params.append("page", String(Math.max(1, filters.page || 1)));
  params.append("per_page", String(filters.per_page > 0 ? filters.per_page : 50));

  if (filters.Search_Query) {
    params.append("Search_Query", filters.Search_Query);
  }

  filters.Countries.forEach((country) => params.append("Countries[]", country));
  filters.Provinces.forEach((province) => params.append("Provinces[]", province));
  filters.Cities.forEach((city) => params.append("Cities[]", city));

  if (filters.Continental_Region.length > 0) {
    params.append("Continental_Region", filters.Continental_Region.join(","));
  }
  if (filters.geographical_sub_region.length > 0) {
    params.append(
      "geographical_sub_region",
      filters.geographical_sub_region.join(",")
    );
  }

  filters.Primary_Sectors.forEach((sector) =>
    params.append("Primary_Sectors[]", sector.toString())
  );
  filters.Secondary_Sectors.forEach((sector) =>
    params.append("Secondary_Sectors[]", sector.toString())
  );
  filters.Investor_Types.forEach((type) =>
    params.append("Investor_Types[]", type.toString())
  );

  if (filters.Portfolio_Companies_Min > 0) {
    params.append(
      "Portfolio_Companies_Min",
      filters.Portfolio_Companies_Min.toString()
    );
  }
  if (filters.Portfolio_Companies_Max > 0) {
    params.append(
      "Portfolio_Companies_Max",
      filters.Portfolio_Companies_Max.toString()
    );
  }

  if (filters.Years_Since_Last_Investment_Min != null) {
    params.append(
      "Years_Since_Last_Investment_Min",
      String(filters.Years_Since_Last_Investment_Min)
    );
  }
  if (filters.Years_Since_Last_Investment_Max != null) {
    params.append(
      "Years_Since_Last_Investment_Max",
      String(filters.Years_Since_Last_Investment_Max)
    );
  }

  params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
  return params;
}
