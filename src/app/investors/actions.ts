"use server";

import { cookies } from "next/headers";
import {
  createDefaultInvestorFilters,
  investorSearchPayloadToSearchParams,
  type InvestorsSearchFilters,
} from "@/lib/investorsFilterPayload";
import { mapSummaryToInvestorTypeCounts } from "@/components/investors/investorsFilterConfig";
import { getInvestorFieldAliasesForColumn } from "@/components/investors/investorsColumnFields";
import { readLogoFromRecord } from "@/lib/companyLogo";
import { INVESTORS_API_BASE } from "@/lib/investorsApiBase";

export type { InvestorsSearchFilters };

export interface InvestorListItem {
  id?: number;
  original_new_company_id?: number;
  company_name?: string;
  investor_type?: string[];
  description?: string;
  number_of_active_investments?: number;
  da_primary_sector_names?: string[];
  linkedin_members?: number;
  country?: string;
  linkedin_logo?: string;
  website?: string;
  linkedin_url?: string;
  year_founded?: number | string | null;
  total_investments?: number | null;
  days_since_last_investment?: number | null;
  years_since_last_investment?: string | number | null;
  last_investment?: {
    display?: string | null;
    date?: string | null;
    days_since?: number | string | null;
  } | null;
  sub_region?: string | null;
  state?: string | null;
  city?: string | null;
}

export interface InvestorsListResponse {
  items: InvestorListItem[];
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  itemsTotal: number;
  pageTotal: number;
  typeCounts: ReturnType<typeof mapSummaryToInvestorTypeCounts>;
}

function normalizeInvestorListItem(item: InvestorListItem): InvestorListItem {
  const logo = readLogoFromRecord(item, getInvestorFieldAliasesForColumn("logo"));
  return logo ? { ...item, linkedin_logo: logo } : item;
}

export async function fetchInvestorsServer(
  filters: InvestorsSearchFilters = createDefaultInvestorFilters()
): Promise<InvestorsListResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const payload = {
      ...filters,
      page: Math.max(1, filters.page || 1),
      per_page: filters.per_page > 0 ? filters.per_page : 50,
    };
    const params = investorSearchPayloadToSearchParams(payload);
    const url = `${INVESTORS_API_BASE}/investors_with_d_a_list?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(
        `Investors API failed (${response.status}):`,
        errorText || response.statusText,
        `(GET ${INVESTORS_API_BASE}/investors_with_d_a_list)`
      );
      return null;
    }

    const raw = await response.json();
    const investors = raw?.investors ?? raw;
    const items = (Array.isArray(investors?.items) ? investors.items : []).map(
      normalizeInvestorListItem
    );
    const summary = investors?.summary_by_company_focus as
      | Record<string, unknown>
      | undefined;
    const totalCount =
      typeof investors?.itemsTotal === "number"
        ? investors.itemsTotal
        : items.length;

    return {
      items,
      itemsReceived: investors?.itemsReceived ?? items.length,
      curPage: investors?.curPage ?? payload.page,
      nextPage: investors?.nextPage ?? null,
      prevPage: investors?.prevPage ?? null,
      offset: investors?.offset ?? 0,
      itemsTotal: totalCount,
      pageTotal: investors?.pageTotal ?? 0,
      typeCounts: mapSummaryToInvestorTypeCounts(summary, totalCount),
    };
  } catch (error) {
    console.error("fetchInvestorsServer error:", error);
    return null;
  }
}

export async function fetchInvestorTypesServer(): Promise<
  Array<{
    id: number;
    sector_name?: string;
    name?: string;
    investor_type?: string;
  }>
> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return [];

    const response = await fetch(
      "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop/Get_investor_types_for_filter",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("fetchInvestorTypesServer error:", error);
    return [];
  }
}

export { createDefaultInvestorFilters };
