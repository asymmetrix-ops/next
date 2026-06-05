"use server";

import { cookies } from "next/headers";

export interface CompaniesFilters {
  countries?: string[];
  provinces?: string[];
  cities?: string[];
  continentalRegions?: string[];
  subRegions?: string[];
  primarySectors?: number[];
  secondarySectors?: number[];
  hybridBusinessFocuses?: number[];
  exclude_business_focus?: boolean | null;
  ownershipTypes?: number[];
  linkedinMembersMin?: number | null;
  linkedinMembersMax?: number | null;
  lastInvestmentYearsMin?: number | null;
  lastInvestmentYearsMax?: number | null;
  searchQuery?: string;
  keywordSearch?: string;
  // Financial Metrics
  revenueMin?: number | null;
  revenueMax?: number | null;
  ebitdaMin?: number | null;
  ebitdaMax?: number | null;
  enterpriseValueMin?: number | null;
  enterpriseValueMax?: number | null;
  revenueMultipleMin?: number | null;
  revenueMultipleMax?: number | null;
  revenueGrowthMin?: number | null;
  revenueGrowthMax?: number | null;
  ebitdaMarginMin?: number | null;
  ebitdaMarginMax?: number | null;
  ruleOf40Min?: number | null;
  ruleOf40Max?: number | null;
  // Subscription Metrics
  arrMin?: number | null;
  arrMax?: number | null;
  arrPcMin?: number | null;
  arrPcMax?: number | null;
  churnMin?: number | null;
  churnMax?: number | null;
  grrMin?: number | null;
  grrMax?: number | null;
  nrrMin?: number | null;
  nrrMax?: number | null;
  newClientsRevenueGrowthMin?: number | null;
  newClientsRevenueGrowthMax?: number | null;
  minGrowthPercent?: number | null;
  maxGrowthPercent?: number | null;
  timeFrame?: string;
  transactionStatus?: string[];
  portfolio_only?: boolean;
  filterMode?: "AND" | "OR";
  yearFoundedMin?: number | null;
  yearFoundedMax?: number | null;
  /** Optional column keys requested from Get_new_companies (non-default columns only). */
  columns?: string[];
}

export interface CompanyItem {
  id: number;
  name: string;
  description: string;
  primary_sectors: (string | { id?: number; sector_name?: string; name?: string })[];
  secondary_sectors: (string | { id?: number; sector_name?: string; name?: string })[];
  ownership_type_id: number;
  ownership: string;
  country: string;
  linkedin_logo: string;
  linkedin_members_latest: number;
  linkedin_members_old: number;
  linkedin_members: number;
  last_investment?: {
    display?: string | null;
    date?: string | null;
    days_since?: number | string | null;
  } | null;
}

export interface CompaniesResponse {
  result1: {
    items: CompanyItem[];
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    perPage: number;
    pageTotal: number;
    ownershipCounts?: {
      publicCompanies: number;
      peOwnedCompanies: number;
      vcOwnedCompanies: number;
      privateCompanies: number;
      subsidiaryCompanies: number;
    };
  };
}

export interface CompaniesCountsResponse {
  totalCount: number;
  publicCompanies: number;
  vcOwnedCompanies: number;
  peOwnedCompanies: number;
  privateCompanies: number;
  subsidiaryCompanies: number;
  acquiredCompanies: number;
  otherCompanies: number;
}

const yearsToDays = (years: number | null | undefined): number | null => {
  if (years == null || !Number.isFinite(years)) return null;
  return Math.round(years * 365);
};

function appendCompaniesFilterParams(
  params: URLSearchParams,
  filters: CompaniesFilters,
  options?: {
    includePagination?: boolean;
    page?: number;
    perPage?: number;
    includePortfolioOnly?: boolean;
    includeOwnership?: boolean;
  }
) {
  const {
    includePagination = false,
    page = 1,
    perPage = 20,
    includePortfolioOnly = false,
    includeOwnership = true,
  } = options ?? {};

  if (includePagination) {
    params.append("Offset", page.toString());
    params.append("Per_page", perPage.toString());
  }

  if ((filters.continentalRegions || []).length > 0) {
    params.append("Continental_Region", (filters.continentalRegions || []).join(","));
  }
  if ((filters.subRegions || []).length > 0) {
    params.append("geographical_sub_region", (filters.subRegions || []).join(","));
  }
  if ((filters.countries || []).length > 0) {
    filters.countries!.forEach((country) => {
      params.append("Countries[]", country);
    });
  }
  if ((filters.provinces || []).length > 0) {
    filters.provinces!.forEach((province) => {
      params.append("Provinces[]", province);
    });
  }
  if ((filters.cities || []).length > 0) {
    filters.cities!.forEach((city) => {
      params.append("Cities[]", city);
    });
  }
  if ((filters.primarySectors || []).length > 0) {
    filters.primarySectors!.forEach((sectorId) => {
      params.append("Primary_sectors_ids[]", sectorId.toString());
    });
  }
  if ((filters.secondarySectors || []).length > 0) {
    filters.secondarySectors!.forEach((sectorId) => {
      params.append("Secondary_sectors_ids[]", sectorId.toString());
    });
  }
  if (includeOwnership && (filters.ownershipTypes || []).length > 0) {
    filters.ownershipTypes!.forEach((ownershipTypeId) => {
      params.append("Ownership_types_ids[]", ownershipTypeId.toString());
    });
  }
  if ((filters.hybridBusinessFocuses || []).length > 0) {
    filters.hybridBusinessFocuses!.forEach((focusId) => {
      params.append("Hybrid_Data_ids[]", focusId.toString());
    });
  }
  if (typeof filters.exclude_business_focus === "boolean") {
    params.append("exclude_business_focus", String(filters.exclude_business_focus));
  }
  if (filters.linkedinMembersMin != null) {
    params.append("Min_linkedin_members", filters.linkedinMembersMin.toString());
  }
  if (filters.linkedinMembersMax != null) {
    params.append("Max_linkedin_members", filters.linkedinMembersMax.toString());
  }

  const lastInvestmentDaysMin = yearsToDays(filters.lastInvestmentYearsMin);
  const lastInvestmentDaysMax = yearsToDays(filters.lastInvestmentYearsMax);
  if (lastInvestmentDaysMin != null) {
    params.append("Last_investment_days_since_min", lastInvestmentDaysMin.toString());
  }
  if (lastInvestmentDaysMax != null) {
    params.append("Last_investment_days_since_max", lastInvestmentDaysMax.toString());
  }
  if (filters.minGrowthPercent != null) {
    params.append("min_growth_percent", filters.minGrowthPercent.toString());
  }
  if (filters.maxGrowthPercent != null) {
    params.append("max_growth_percent", filters.maxGrowthPercent.toString());
  }
  if (filters.timeFrame && filters.timeFrame.trim()) {
    params.append("time_frame", filters.timeFrame.trim());
  }

  if (filters.revenueMin != null) params.append("Revenue_min", filters.revenueMin.toString());
  if (filters.revenueMax != null) params.append("Revenue_max", filters.revenueMax.toString());
  if (filters.ebitdaMin != null) params.append("EBITDA_min", filters.ebitdaMin.toString());
  if (filters.ebitdaMax != null) params.append("EBITDA_max", filters.ebitdaMax.toString());
  if (filters.enterpriseValueMin != null) {
    params.append("Enterprise_Value_min", filters.enterpriseValueMin.toString());
  }
  if (filters.enterpriseValueMax != null) {
    params.append("Enterprise_Value_max", filters.enterpriseValueMax.toString());
  }
  if (filters.revenueMultipleMin != null) {
    params.append("Revenue_Multiple_min", filters.revenueMultipleMin.toString());
  }
  if (filters.revenueMultipleMax != null) {
    params.append("Revenue_Multiple_max", filters.revenueMultipleMax.toString());
  }
  if (filters.revenueGrowthMin != null) {
    params.append("Revenue_Growth_min", filters.revenueGrowthMin.toString());
  }
  if (filters.revenueGrowthMax != null) {
    params.append("Revenue_Growth_max", filters.revenueGrowthMax.toString());
  }
  if (filters.ebitdaMarginMin != null) {
    params.append("EBITDA_Margin_min", filters.ebitdaMarginMin.toString());
  }
  if (filters.ebitdaMarginMax != null) {
    params.append("EBITDA_Margin_max", filters.ebitdaMarginMax.toString());
  }
  if (filters.ruleOf40Min != null) {
    params.append("Rule_of_40_min", filters.ruleOf40Min.toString());
  }
  if (filters.ruleOf40Max != null) {
    params.append("Rule_of_40_max", filters.ruleOf40Max.toString());
  }
  if (filters.arrMin != null) params.append("ARR_min", filters.arrMin.toString());
  if (filters.arrMax != null) params.append("ARR_max", filters.arrMax.toString());
  if (filters.arrPcMin != null) params.append("ARR_pc_min", filters.arrPcMin.toString());
  if (filters.arrPcMax != null) params.append("ARR_pc_max", filters.arrPcMax.toString());
  if (filters.churnMin != null) params.append("Churn_min", filters.churnMin.toString());
  if (filters.churnMax != null) params.append("Churn_max", filters.churnMax.toString());
  if (filters.grrMin != null) params.append("GRR_min", filters.grrMin.toString());
  if (filters.grrMax != null) params.append("GRR_max", filters.grrMax.toString());
  if (filters.nrrMin != null) params.append("NRR_min", filters.nrrMin.toString());
  if (filters.nrrMax != null) params.append("NRR_max", filters.nrrMax.toString());
  if (filters.newClientsRevenueGrowthMin != null) {
    params.append(
      "New_Clients_Revenue_Growth_min",
      filters.newClientsRevenueGrowthMin.toString()
    );
  }
  if (filters.newClientsRevenueGrowthMax != null) {
    params.append(
      "New_Clients_Revenue_Growth_max",
      filters.newClientsRevenueGrowthMax.toString()
    );
  }
  if (filters.yearFoundedMin != null) {
    params.append("Year_founded_min", filters.yearFoundedMin.toString());
  }
  if (filters.yearFoundedMax != null) {
    params.append("Year_founded_max", filters.yearFoundedMax.toString());
  }
  if (filters.searchQuery && filters.searchQuery.trim()) {
    params.append("query", filters.searchQuery.trim());
  }
  if (filters.keywordSearch && filters.keywordSearch.trim()) {
    params.append("keywords_search", filters.keywordSearch.trim());
  }
  if ((filters.transactionStatus || []).length > 0) {
    filters.transactionStatus!.forEach((status) => {
      params.append("transaction_status[]", status);
    });
  }
  if (includePortfolioOnly) {
    params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
  }
  if (filters.filterMode === "AND" || filters.filterMode === "OR") {
    params.append("filter_mode", filters.filterMode);
  }
  if ((filters.columns || []).length > 0) {
    filters.columns!.forEach((column) => {
      params.append("columns[]", column);
    });
  }
}

function buildCompaniesCountsRequestBody(
  filters: CompaniesFilters
): Record<string, unknown> {
  const num = (value: number | null | undefined): string =>
    value != null && Number.isFinite(value) ? String(value) : "0";

  return {
    query: filters.searchQuery?.trim() || null,
    Primary_sectors_ids: filters.primarySectors ?? [],
    Secondary_sectors_ids: filters.secondarySectors ?? [],
    Ownership_types_ids: [],
    Min_linkedin_members: filters.linkedinMembersMin ?? 0,
    Max_linkedin_members: filters.linkedinMembersMax ?? 0,
    Countries: filters.countries ?? [],
    Provinces: filters.provinces ?? [],
    exclude_business_focus: filters.exclude_business_focus ?? null,
    Cities: filters.cities ?? [],
    Hybrid_Data_ids: filters.hybridBusinessFocuses ?? [],
    Continental_Region: (filters.continentalRegions ?? []).join(","),
    geographical_sub_region: (filters.subRegions ?? []).join(","),
    Revenue_min: num(filters.revenueMin),
    ARR_pc_min: num(filters.arrPcMin),
    ARR_pc_max: num(filters.arrPcMax),
    Revenue_max: num(filters.revenueMax),
    EBITDA_min: num(filters.ebitdaMin),
    EBITDA_max: num(filters.ebitdaMax),
    Enterprise_Value_min: num(filters.enterpriseValueMin),
    Enterprise_Value_max: num(filters.enterpriseValueMax),
    Revenue_Multiple_min: num(filters.revenueMultipleMin),
    Revenue_Multiple_max: num(filters.revenueMultipleMax),
    Revenue_Growth_min: num(filters.revenueGrowthMin),
    Revenue_Growth_max: num(filters.revenueGrowthMax),
    EBITDA_Margin_min: num(filters.ebitdaMarginMin),
    EBITDA_Margin_max: num(filters.ebitdaMarginMax),
    Rule_of_40_min: num(filters.ruleOf40Min),
    Rule_of_40_max: num(filters.ruleOf40Max),
    ARR_min: num(filters.arrMin),
    ARR_max: num(filters.arrMax),
    Churn_min: num(filters.churnMin),
    Churn_max: num(filters.churnMax),
    GRR_min: num(filters.grrMin),
    GRR_max: num(filters.grrMax),
    NRR_min: num(filters.nrrMin),
    NRR_max: num(filters.nrrMax),
    New_Clients_Revenue_Growth_min: num(filters.newClientsRevenueGrowthMin),
    New_Clients_Revenue_Growth_max: num(filters.newClientsRevenueGrowthMax),
    keywords_search: filters.keywordSearch?.trim() ?? "",
    min_growth_percent: num(filters.minGrowthPercent),
    max_growth_percent: num(filters.maxGrowthPercent),
    Year_founded_min: num(filters.yearFoundedMin),
    Year_founded_max: num(filters.yearFoundedMax),
    transaction_status: filters.transactionStatus ?? [],
    filter_mode:
      filters.filterMode === "OR" || filters.filterMode === "AND"
        ? filters.filterMode
        : "",
  };
}

function countsBodyToSearchParams(body: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(body).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        params.append(`${key}[]`, String(item));
      });
      return;
    }

    params.append(key, String(value));
  });

  return params;
}

export async function fetchCompaniesCountsServer(
  filters: CompaniesFilters = {}
): Promise<CompaniesCountsResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;

    if (!token) {
      return null;
    }

    const body = buildCompaniesCountsRequestBody(filters);
    const params = countsBodyToSearchParams(body);
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/companies_counts?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `HTTP error fetching companies counts! status: ${response.status}`,
        await response.text().catch(() => "")
      );
      return null;
    }

    return (await response.json()) as CompaniesCountsResponse;
  } catch (error) {
    console.error("Error fetching companies counts:", error);
    return null;
  }
}

export async function fetchCompaniesServer(
  page: number = 1,
  filters: CompaniesFilters = {}
): Promise<CompaniesResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;

    if (!token) {
      return null;
    }

    const perPage = 20;
    const params = new URLSearchParams();
    appendCompaniesFilterParams(params, filters, {
      includePagination: true,
      page,
      perPage,
      includePortfolioOnly: true,
      includeOwnership: true,
    });

    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Get_new_companies?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }

    const data: CompaniesResponse = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching companies:", error);
    return null;
  }
}

// Fetch filter options from server
export async function fetchFilterOptionsServer() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;

    if (!token) {
      return null;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Fetch all filter options in parallel
    const [
      countriesRes,
      primarySectorsRes,
      ownershipTypesRes,
      hybridBusinessFocusesRes,
      continentalRegionsRes,
      subRegionsRes,
    ] = await Promise.all([
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/locations_country", { headers, cache: "no-store" }),
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_primary_sectors_dropdown", { headers, cache: "no-store" }),
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_ownership_types", { headers, cache: "no-store" }),
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_hybrid_business_focuses", { headers, cache: "no-store" }),
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_continental_regions", { headers, cache: "no-store" }),
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_geographical_sub_regions", { headers, cache: "no-store" }),
    ]);

    const [countries, primarySectors, ownershipTypes, hybridBusinessFocuses, continentalRegions, subRegions] = await Promise.all([
      countriesRes.ok ? countriesRes.json() : [],
      primarySectorsRes.ok ? primarySectorsRes.json() : [],
      ownershipTypesRes.ok ? ownershipTypesRes.json() : [],
      hybridBusinessFocusesRes.ok ? hybridBusinessFocusesRes.json() : [],
      continentalRegionsRes.ok ? continentalRegionsRes.json() : [],
      subRegionsRes.ok ? subRegionsRes.json() : [],
    ]);

    return {
      countries,
      primarySectors,
      ownershipTypes,
      hybridBusinessFocuses,
      continentalRegions,
      subRegions,
    };
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return null;
  }
}
