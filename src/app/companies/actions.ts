"use server";

import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

function isEmptyFilters(filters: CompaniesFilters): boolean {
  const hasArray = (arr?: unknown[]) => Array.isArray(arr) && arr.length > 0;
  const hasStr = (s?: string) => typeof s === "string" && s.trim().length > 0;
  const hasNum = (n?: number | null) => n != null;

  return !(
    hasArray(filters.countries) ||
    hasArray(filters.provinces) ||
    hasArray(filters.cities) ||
    hasArray(filters.continentalRegions) ||
    hasArray(filters.subRegions) ||
    hasArray(filters.primarySectors) ||
    hasArray(filters.secondarySectors) ||
    hasArray(filters.hybridBusinessFocuses) ||
    hasArray(filters.ownershipTypes) ||
    hasNum(filters.linkedinMembersMin) ||
    hasNum(filters.linkedinMembersMax) ||
    hasStr(filters.searchQuery) ||
    hasStr(filters.keywordSearch) ||
    // Financial Metrics
    hasNum(filters.revenueMin) ||
    hasNum(filters.revenueMax) ||
    hasNum(filters.ebitdaMin) ||
    hasNum(filters.ebitdaMax) ||
    hasNum(filters.enterpriseValueMin) ||
    hasNum(filters.enterpriseValueMax) ||
    hasNum(filters.revenueMultipleMin) ||
    hasNum(filters.revenueMultipleMax) ||
    hasNum(filters.revenueGrowthMin) ||
    hasNum(filters.revenueGrowthMax) ||
    hasNum(filters.ebitdaMarginMin) ||
    hasNum(filters.ebitdaMarginMax) ||
    hasNum(filters.ruleOf40Min) ||
    hasNum(filters.ruleOf40Max) ||
    // Subscription Metrics
    hasNum(filters.arrMin) ||
    hasNum(filters.arrMax) ||
    hasNum(filters.arrPcMin) ||
    hasNum(filters.arrPcMax) ||
    hasNum(filters.churnMin) ||
    hasNum(filters.churnMax) ||
    hasNum(filters.grrMin) ||
    hasNum(filters.grrMax) ||
    hasNum(filters.nrrMin) ||
    hasNum(filters.nrrMax) ||
    hasNum(filters.newClientsRevenueGrowthMin) ||
    hasNum(filters.newClientsRevenueGrowthMax)
  );
}

export interface CompaniesFilters {
  countries?: string[];
  provinces?: string[];
  cities?: string[];
  continentalRegions?: string[];
  subRegions?: string[];
  primarySectors?: number[];
  secondarySectors?: number[];
  hybridBusinessFocuses?: number[];
  ownershipTypes?: number[];
  linkedinMembersMin?: number | null;
  linkedinMembersMax?: number | null;
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
    ownershipCounts: {
      publicCompanies: number;
      peOwnedCompanies: number;
      vcOwnedCompanies: number;
      privateCompanies: number;
      subsidiaryCompanies: number;
    };
  };
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

    // Initial list should be fast: cache only page 1 with no filters.
    // Default page size requested: 20.
    const perPage = 20;
    const offset = page;

    const redis = getRedisClient();
    const isInitial = page === 1 && isEmptyFilters(filters);
    const ttlSeconds = Math.min(
      Math.max(Number(process.env.COMPANIES_INITIAL_TTL_SECONDS ?? 26 * 60 * 60), 60),
      7 * 24 * 60 * 60
    );

    if (redis && isInitial) {
      // Shared cache key (still requires auth to access this server action).
      const key = `companies:initial:v1:per${perPage}`;
      try {
        const cached = await redis.get<CompaniesResponse>(key);
        if (cached) return cached;
      } catch (e) {
        console.error("[COMPANIES CACHE] ❌ Redis read failed:", e);
      }
    }

    const params = new URLSearchParams();
    params.append("Offset", offset.toString());
    params.append("Per_page", perPage.toString());

    // Add filters to the request
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
    if ((filters.ownershipTypes || []).length > 0) {
      filters.ownershipTypes!.forEach((ownershipTypeId) => {
        params.append("Ownership_types_ids[]", ownershipTypeId.toString());
      });
    }
    if ((filters.hybridBusinessFocuses || []).length > 0) {
      filters.hybridBusinessFocuses!.forEach((focusId) => {
        params.append("Hybrid_Data_ids[]", focusId.toString());
      });
    }

    // LinkedIn Members
    if (filters.linkedinMembersMin != null) {
      params.append("Min_linkedin_members", filters.linkedinMembersMin.toString());
    }
    if (filters.linkedinMembersMax != null) {
      params.append("Max_linkedin_members", filters.linkedinMembersMax.toString());
    }

    // Financial Metrics
    if (filters.revenueMin != null) {
      params.append("Revenue_min", filters.revenueMin.toString());
    }
    if (filters.revenueMax != null) {
      params.append("Revenue_max", filters.revenueMax.toString());
    }
    if (filters.ebitdaMin != null) {
      params.append("EBITDA_min", filters.ebitdaMin.toString());
    }
    if (filters.ebitdaMax != null) {
      params.append("EBITDA_max", filters.ebitdaMax.toString());
    }
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

    // Subscription Metrics
    if (filters.arrMin != null) {
      params.append("ARR_min", filters.arrMin.toString());
    }
    if (filters.arrMax != null) {
      params.append("ARR_max", filters.arrMax.toString());
    }
    if (filters.arrPcMin != null) {
      params.append("ARR_pc_min", filters.arrPcMin.toString());
    }
    if (filters.arrPcMax != null) {
      params.append("ARR_pc_max", filters.arrPcMax.toString());
    }
    if (filters.churnMin != null) {
      params.append("Churn_min", filters.churnMin.toString());
    }
    if (filters.churnMax != null) {
      params.append("Churn_max", filters.churnMax.toString());
    }
    if (filters.grrMin != null) {
      params.append("GRR_min", filters.grrMin.toString());
    }
    if (filters.grrMax != null) {
      params.append("GRR_max", filters.grrMax.toString());
    }
    if (filters.nrrMin != null) {
      params.append("NRR_min", filters.nrrMin.toString());
    }
    if (filters.nrrMax != null) {
      params.append("NRR_max", filters.nrrMax.toString());
    }
    if (filters.newClientsRevenueGrowthMin != null) {
      params.append("New_Clients_Revenue_Growth_min", filters.newClientsRevenueGrowthMin.toString());
    }
    if (filters.newClientsRevenueGrowthMax != null) {
      params.append("New_Clients_Revenue_Growth_max", filters.newClientsRevenueGrowthMax.toString());
    }

    // Search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      params.append("query", filters.searchQuery.trim());
    }

    // Keyword search (searches across descriptions)
    if (filters.keywordSearch && filters.keywordSearch.trim()) {
      params.append("keywords_search", filters.keywordSearch.trim());
    }

    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;

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

    if (redis && isInitial) {
      const key = `companies:initial:v1:per${perPage}`;
      try {
        await redis.set(key, data as never, { ex: ttlSeconds });
      } catch (e) {
        console.error("[COMPANIES CACHE] ❌ Redis write failed:", e);
      }
    }

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
