"use server";

import { cookies } from "next/headers";
import type { FinancialScreenerFilters } from "@/components/financial-screener/financialScreenerFilterPayload";
import { financialScreenerFiltersToSearchParams } from "@/components/financial-screener/financialScreenerFilterPayload";

export interface FinancialScreenerSectorRef {
  id: number;
  sector_name: string;
}

export interface FinancialScreenerLocation {
  country?: string | null;
  city?: string | null;
}

export interface FinancialScreenerFinancials {
  revenue_m?: string | number | null;
  revenue_currency?: string | null;
  rev_growth_pct?: string | number | null;
  ebitda_m?: string | number | null;
  ebitda_margin_pct?: string | number | null;
  ebit_m?: string | number | null;
  ev_m?: string | number | null;
  ev_currency?: string | null;
  ev_revenue?: string | number | null;
  ev_ebit?: string | number | null;
  ev_ebitda?: string | number | null;
  rev_multiple?: string | number | null;
}

export interface FinancialScreenerItem {
  id: number;
  name: string;
  description?: string;
  url?: string;
  ownership_type?: string;
  location?: FinancialScreenerLocation;
  logo?: string;
  fte?: number | null;
  financial_year?: string | number | null;
  primary_sectors?: FinancialScreenerSectorRef[];
  secondary_sectors?: FinancialScreenerSectorRef[];
  financials?: FinancialScreenerFinancials;
}

export interface FinancialScreenerPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  next_page: number | null;
  prev_page: number | null;
}

export interface FinancialScreenerCounts {
  total: number;
  public: number;
  vc_owned: number;
  pe_owned: number;
  private: number;
  subsidiary: number;
}

export interface FinancialScreenerResponse {
  items: FinancialScreenerItem[];
  pagination: FinancialScreenerPagination;
  counts: FinancialScreenerCounts;
}

const FINANCIAL_SCREENER_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:J8SXS75g:develop";

export async function fetchFinancialScreenerServer(
  filters: FinancialScreenerFilters = {}
): Promise<FinancialScreenerResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;

    if (!token) {
      return null;
    }

    const params = financialScreenerFiltersToSearchParams(filters);
    const url = `${FINANCIAL_SCREENER_API_BASE}/get_financial_screener?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `HTTP error fetching financial screener! status: ${response.status}`,
        await response.text().catch(() => "")
      );
      return null;
    }

    const raw = (await response.json()) as {
      items?: FinancialScreenerItem[];
      pagination?: Partial<FinancialScreenerPagination>;
      counts?: Partial<FinancialScreenerCounts>;
    };

    const pagination = raw.pagination ?? {};
    const counts = raw.counts ?? {};

    return {
      items: raw.items ?? [],
      pagination: {
        page: pagination.page ?? filters.page ?? 1,
        per_page: pagination.per_page ?? filters.per_page ?? 25,
        total: pagination.total ?? 0,
        total_pages: pagination.total_pages ?? 1,
        next_page: pagination.next_page ?? null,
        prev_page: pagination.prev_page ?? null,
      },
      counts: {
        total: counts.total ?? 0,
        public: counts.public ?? 0,
        vc_owned: counts.vc_owned ?? 0,
        pe_owned: counts.pe_owned ?? 0,
        private: counts.private ?? 0,
        subsidiary: counts.subsidiary ?? 0,
      },
    };
  } catch (error) {
    console.error("Error fetching financial screener:", error);
    return null;
  }
}
