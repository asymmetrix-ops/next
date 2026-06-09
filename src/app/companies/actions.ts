"use server";

import { cookies } from "next/headers";
import type { CompanySearchPayload } from "@/lib/filterBuilder";
import {
  COMPANIES_API_BASE,
  companyCountsPayloadToSearchParams,
  companySearchPayloadToSearchParams,
} from "@/lib/companiesFilterPayload";
import { normalizeCompaniesResponse } from "./normalizeCompaniesResponse";

export type CompaniesFilters = CompanySearchPayload;

export interface CompanyItem {
  id: number;
  name: string;
  description?: string;
  linkedin_logo?: string;
  website?: string;
  ownership_type_id?: number;
  ownership?: string;
  linkedin_members?: number;
  country?: string;
  /** May be a JSON string or array from Get_new_companies. */
  primary_sectors?: string | { id?: number; sector_name?: string; name?: string }[];
  secondary_sectors?: string | { id?: number; sector_name?: string; name?: string }[];
  years_since_last_investment?: number | string | null;
  year_founded?: number | string | null;
  hq?: string;
  city?: string;
  state?: string;
  linkedin_url?: string;
  linkedin_growth?: number | string | null;
  investors?: string | { id?: number; name?: string }[];
  lifecycle_stage?: string;
  product_type?: string | unknown[];
  data_collection_method?: string | unknown[];
  revenue_model?: string | unknown[];
  transaction_status?: string;
  revenue_m?: number | null;
  ebitda_m?: number | null;
  ev?: number | null;
  revenue_multiple?: number | null;
  revenue_growth?: number | null;
  ebitda_margin?: number | null;
  rule_of_40?: number | null;
  arr_pc?: number | null;
  arr_m?: number | null;
  churn?: number | null;
  grr?: number | null;
  nrr?: number | null;
  new_client_growth?: number | null;
  upsell?: number | null;
  cross_sell?: number | null;
  price_increase?: number | null;
  rev_expansion?: number | null;
  ebit_m?: number | null;
  no_clients?: number | null;
  rev_per_client?: number | null;
  no_employees?: number | null;
  rev_per_employee?: number | null;
  financial_year?: number | string | null;
  last_investment?: {
    display?: string | null;
    date?: string | null;
    days_since?: number | string | null;
  } | null;
}

export interface CompaniesResultPayload {
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
}

export interface CompaniesResponse {
  result1: CompaniesResultPayload;
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

export async function fetchCompaniesCountsServer(
  filters: CompaniesFilters = {}
): Promise<CompaniesCountsResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;

    if (!token) {
      return null;
    }

    const payload: CompanySearchPayload = {
      ...filters,
      query: filters.query?.trim() || null,
      filters_sql: filters.filters_sql || null,
      columns: filters.columns ?? [],
      has_financial_filters: Boolean(filters.has_financial_filters),
      has_year_filter: Boolean(filters.has_year_filter),
    };

    const params = companyCountsPayloadToSearchParams(payload);
    const url = `${COMPANIES_API_BASE}/companies_counts?${params.toString()}`;

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

    const perPageRaw = filters.Per_page ?? 20;
    const perPage = perPageRaw > 0 ? perPageRaw : 20;
    const payload: CompanySearchPayload = {
      ...filters,
      Offset: page,
      Per_page: perPage,
      filters_sql: filters.filters_sql || null,
      query: filters.query?.trim() || null,
      columns: filters.columns ?? [],
      has_financial_filters: Boolean(filters.has_financial_filters),
      has_year_filter: Boolean(filters.has_year_filter),
    };

    const params = companySearchPayloadToSearchParams(payload, { page, perPage });
    const url = `${COMPANIES_API_BASE}/Get_new_companies?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `HTTP error! status: ${response.status}`,
        await response.text().catch(() => ""),
        `(GET ${COMPANIES_API_BASE}/Get_new_companies)`
      );
      return null;
    }

    const raw = await response.json();
    return normalizeCompaniesResponse(raw);
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

    const [
      countriesRes,
      primarySectorsRes,
      ownershipTypesRes,
      hybridBusinessFocusesRes,
      continentalRegionsRes,
      subRegionsRes,
    ] = await Promise.all([
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/locations_country", {
        headers,
        cache: "no-store",
      }),
      fetch(
        "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_primary_sectors_dropdown",
        { headers, cache: "no-store" }
      ),
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_ownership_types", {
        headers,
        cache: "no-store",
      }),
      fetch(
        "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_hybrid_business_focuses",
        { headers, cache: "no-store" }
      ),
      fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_continental_regions", {
        headers,
        cache: "no-store",
      }),
      fetch(
        "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_geographical_sub_regions",
        { headers, cache: "no-store" }
      ),
    ]);

    const [
      countries,
      primarySectors,
      ownershipTypes,
      hybridBusinessFocuses,
      continentalRegions,
      subRegions,
    ] = await Promise.all([
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
