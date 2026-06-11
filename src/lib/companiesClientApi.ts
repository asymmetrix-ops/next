import type { CompaniesFilters, CompaniesCountsResponse, CompaniesResponse } from "@/app/companies/actions";
import { normalizeCompaniesResponse } from "@/app/companies/normalizeCompaniesResponse";
import {
  COMPANIES_API_BASE,
  companyCountsPayloadToSearchParams,
  companySearchPayloadToSearchParams,
} from "@/lib/companiesFilterPayload";

function getAuthToken(explicitToken?: string | null): string | null {
  if (explicitToken) return explicitToken;
  if (typeof window === "undefined") return null;
  return localStorage.getItem("asymmetrix_auth_token");
}

export async function fetchCompaniesClient(
  page: number = 1,
  filters: CompaniesFilters = {},
  token?: string | null
): Promise<CompaniesResponse | null> {
  const authToken = getAuthToken(token);
  if (!authToken) return null;

  const perPageRaw = filters.Per_page ?? 20;
  const perPage = perPageRaw > 0 ? perPageRaw : 20;
  const payload: CompaniesFilters = {
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
      Authorization: `Bearer ${authToken}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
    );
  }

  const raw = await response.json();
  return normalizeCompaniesResponse(raw);
}

export async function fetchCompaniesCountsClient(
  filters: CompaniesFilters = {},
  token?: string | null
): Promise<CompaniesCountsResponse | null> {
  const authToken = getAuthToken(token);
  if (!authToken) return null;

  const payload: CompaniesFilters = {
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
      Authorization: `Bearer ${authToken}`,
    },
    credentials: "include",
  });

  if (!response.ok) return null;
  return (await response.json()) as CompaniesCountsResponse;
}

export async function fetchAllCompaniesClientPages<T = CompaniesResponse["result1"]["items"][number]>(
  filters: CompaniesFilters,
  options?: { perPage?: number; token?: string | null }
): Promise<T[]> {
  const perPage = options?.perPage ?? 500;
  const allItems: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await fetchCompaniesClient(
      page,
      { ...filters, Per_page: perPage },
      options?.token
    );
    if (!data?.result1) break;
    allItems.push(...((data.result1.items ?? []) as T[]));
    totalPages = data.result1.pageTotal ?? 1;
    page++;
  } while (page <= totalPages);

  return allItems;
}
