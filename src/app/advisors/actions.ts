"use server";

import { cookies } from "next/headers";
import {
  advisorsCountsFiltersToSearchParams,
  advisorsFiltersToSearchParams,
  createDefaultAdvisorFilters,
  type AdvisorsSearchFilters,
} from "@/lib/advisorsFilterPayload";
import { mapCountsToAdvisorsRoleCounts } from "@/components/advisors/advisorsFilterConfig";
import { getAdvisorFieldAliasesForColumn } from "@/components/advisors/advisorsColumnFields";
import { readLogoFromRecord } from "@/lib/companyLogo";

export type { AdvisorsSearchFilters };

export interface AdvisorSectorItem {
  id: number;
  name: string;
}

export interface AdvisorListItem {
  id: number;
  name: string;
  url?: string;
  website?: string;
  description?: string;
  events_advised?: number;
  sectors?: AdvisorSectorItem[];
  sectors_count?: number;
  linkedin_members?: number;
  country?: string;
  linkedin_logo?: string;
}

export interface AdvisorsListResponse {
  items: AdvisorListItem[];
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  itemsTotal: number;
  pageTotal: number;
  roleCounts: ReturnType<typeof mapCountsToAdvisorsRoleCounts>;
}

const ADVISORS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn:develop";

function normalizeAdvisorListItem(item: AdvisorListItem): AdvisorListItem {
  const logo = readLogoFromRecord(item, getAdvisorFieldAliasesForColumn("logo"));
  return logo ? { ...item, linkedin_logo: logo } : item;
}

function normalizeAdvisorsListResponse(
  raw: Record<string, unknown>,
  filters: AdvisorsSearchFilters
): Omit<AdvisorsListResponse, "roleCounts"> {
  const r = raw as {
    items?: AdvisorListItem[];
    result1?: {
      items?: AdvisorListItem[];
      itemsReceived?: number;
      curPage?: number;
      nextPage?: number | null;
      prevPage?: number | null;
      offset?: number;
      itemsTotal?: number;
      pageTotal?: number;
    };
    Advisors_companies?: {
      items?: AdvisorListItem[];
      itemsReceived?: number;
      curPage?: number;
      nextPage?: number | null;
      prevPage?: number | null;
      offset?: number;
      itemsTotal?: number;
      pageTotal?: number;
    };
    itemsReceived?: number;
    curPage?: number;
    nextPage?: number | null;
    prevPage?: number | null;
    offset?: number;
    itemsTotal?: number;
    pageTotal?: number;
  };

  const listRoot =
    r.items ?? r.result1?.items ?? r.Advisors_companies?.items ?? [];
  const items = (Array.isArray(listRoot) ? listRoot : []).map(normalizeAdvisorListItem);
  const itemsTotal =
    r.itemsTotal ??
    r.result1?.itemsTotal ??
    r.Advisors_companies?.itemsTotal ??
    items.length;
  const pageTotal =
    r.pageTotal ??
    r.result1?.pageTotal ??
    r.Advisors_companies?.pageTotal ??
    (itemsTotal && filters.per_page > 0
      ? Math.ceil(itemsTotal / filters.per_page)
      : 0);

  return {
    items,
    itemsReceived:
      r.itemsReceived ??
      r.result1?.itemsReceived ??
      r.Advisors_companies?.itemsReceived ??
      items.length,
    curPage:
      r.curPage ??
      r.result1?.curPage ??
      r.Advisors_companies?.curPage ??
      filters.page,
    nextPage:
      r.nextPage ??
      r.result1?.nextPage ??
      r.Advisors_companies?.nextPage ??
      null,
    prevPage:
      r.prevPage ??
      r.result1?.prevPage ??
      r.Advisors_companies?.prevPage ??
      null,
    offset:
      r.offset ?? r.result1?.offset ?? r.Advisors_companies?.offset ?? 0,
    itemsTotal: Number(itemsTotal) || 0,
    pageTotal: Number(pageTotal) || 0,
  };
}

export async function fetchAdvisorsServer(
  filters: AdvisorsSearchFilters = createDefaultAdvisorFilters()
): Promise<AdvisorsListResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const payload = {
      ...filters,
      page: Math.max(1, filters.page || 1),
      per_page: filters.per_page > 0 ? filters.per_page : 25,
    };
    const params = advisorsFiltersToSearchParams(payload);
    const url = `${ADVISORS_API_BASE}/get_all_advisors_list?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Advisors API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const text = await response.text();
    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(text) as Record<string, unknown>;
    } catch (parseError) {
      console.error("Failed to parse advisors list response:", parseError);
      return null;
    }

    const list = normalizeAdvisorsListResponse(raw, payload);
    return {
      ...list,
      roleCounts: mapCountsToAdvisorsRoleCounts(undefined, list.itemsTotal),
    };
  } catch (error) {
    console.error("fetchAdvisorsServer error:", error);
    return null;
  }
}

export async function fetchAdvisorsCountsServer(
  filters: AdvisorsSearchFilters = createDefaultAdvisorFilters()
): Promise<ReturnType<typeof mapCountsToAdvisorsRoleCounts> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const params = advisorsCountsFiltersToSearchParams(filters);
    const url = `${ADVISORS_API_BASE}/get_all_advisors_counts?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Advisors counts API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return mapCountsToAdvisorsRoleCounts(data);
  } catch (error) {
    console.error("fetchAdvisorsCountsServer error:", error);
    return null;
  }
}

export { createDefaultAdvisorFilters };
