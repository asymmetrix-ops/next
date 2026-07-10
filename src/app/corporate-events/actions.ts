"use server";

import { cookies } from "next/headers";
import {
  corporateEventsCountsFiltersToSearchParams,
  corporateEventsFiltersToSearchParams,
  createDefaultCorporateEventFilters,
  type CorporateEventsSearchFilters,
} from "@/lib/corporateEventsFilterPayload";
import {
  mapCorporateEventsCountsResponse,
  mapResponseToCorporateEventsSummaryStats,
} from "@/components/corporate-events/corporateEventsFilterConfig";
import type { CorporateEvent, CorporateEventsResponse } from "@/types/corporateEvents";

export type { CorporateEventsSearchFilters };

export type CorporateEventListItem = CorporateEvent;

export interface CorporateEventsListResponse {
  items: CorporateEventListItem[];
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  pageTotal: number;
  itemTotal: number;
  summaryStats: ReturnType<typeof mapResponseToCorporateEventsSummaryStats>;
}

const CORPORATE_EVENTS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l:develop";

function normalizeCorporateEventsResponse(
  raw: CorporateEventsResponse,
  filters: CorporateEventsSearchFilters
): Omit<CorporateEventsListResponse, "summaryStats"> {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const itemTotal = raw.itemTotal ?? items.length;
  const pageTotal =
    raw.pageTotal ??
    (itemTotal && filters.Per_page > 0
      ? Math.ceil(itemTotal / filters.Per_page)
      : 0);

  return {
    items,
    itemsReceived: raw.itemsReceived ?? items.length,
    curPage: raw.curPage ?? filters.Page,
    nextPage: raw.nextPage ?? null,
    prevPage: raw.prevPage ?? null,
    offset: raw.offset ?? 0,
    perPage: filters.Per_page,
    pageTotal: Number(pageTotal) || 0,
    itemTotal: Number(itemTotal) || 0,
  };
}

export async function fetchCorporateEventsServer(
  page: number = 1,
  filters: CorporateEventsSearchFilters = createDefaultCorporateEventFilters()
): Promise<CorporateEventsListResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const perPage = filters.Per_page > 0 ? filters.Per_page : 50;
    const payload: CorporateEventsSearchFilters = {
      ...filters,
      Page: Math.max(1, page),
      Per_page: perPage,
    };

    const params = corporateEventsFiltersToSearchParams(payload);
    const url = `${CORPORATE_EVENTS_API_BASE}/get_all_corporate_events?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Corporate events API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const raw = (await response.json()) as CorporateEventsResponse;
    const list = normalizeCorporateEventsResponse(raw, payload);
    return {
      ...list,
      summaryStats: mapResponseToCorporateEventsSummaryStats(raw, list.itemTotal),
    };
  } catch (error) {
    console.error("fetchCorporateEventsServer error:", error);
    return null;
  }
}

export async function fetchCorporateEventsCountsServer(
  filters: CorporateEventsSearchFilters = createDefaultCorporateEventFilters()
): Promise<ReturnType<typeof mapCorporateEventsCountsResponse> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const params = corporateEventsCountsFiltersToSearchParams({
      ...filters,
      deal_types: [],
    });
    const url = `${CORPORATE_EVENTS_API_BASE}/get_corporate_events_counts?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Corporate events counts API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return mapCorporateEventsCountsResponse(data);
  } catch (error) {
    console.error("fetchCorporateEventsCountsServer error:", error);
    return null;
  }
}

export { createDefaultCorporateEventFilters };
