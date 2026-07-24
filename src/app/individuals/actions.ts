"use server";

import { cookies } from "next/headers";
import type { Individual } from "@/types/individuals";
import {
  createDefaultIndividualFilters,
  individualsCountsFiltersToSearchParams,
  individualsFiltersToRequestBody,
  type IndividualsSearchFilters,
} from "@/lib/individualsFilterPayload";
import {
  mapResponseToIndividualsSummaryCounts,
  mapIndividualsCountsResponse,
} from "@/components/individuals/individualsFilterConfig";
import { normalizeIndividualFromApi } from "@/lib/normalizeIndividual";

export type { IndividualsSearchFilters };

export interface IndividualsListResponse {
  items: Individual[];
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  perPage: number;
  pageTotal: number;
  itemsTotal: number;
  summaryCounts: ReturnType<typeof mapResponseToIndividualsSummaryCounts>;
}

type IndividualsApiListResponse = {
  items?: unknown[];
  individuals?: unknown[];
  offset?: number;
  currentPage?: number;
  perPage?: number;
  totalItems?: number;
  totalIndividuals?: number;
  totalPages?: number;
  nextOffset?: number | null;
  currentRoles?: number;
  pastRoles?: number;
  ceos?: number;
  chairs?: number;
  founders?: number;
};

function mapIndividualsListResponse(
  data: IndividualsApiListResponse,
  fallbackPage: number,
  fallbackPerPage: number
): IndividualsListResponse {
  const rawItems = data.items ?? data.individuals ?? [];
  const items = rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeIndividualFromApi)
    .filter((item) => Number.isFinite(item.id));

  const perPage = data.perPage || fallbackPerPage;
  const itemsTotal = data.totalItems ?? data.totalIndividuals ?? items.length;
  const pageTotal =
    data.totalPages ??
    (perPage > 0 ? Math.max(1, Math.ceil(itemsTotal / perPage)) : 1);

  const rawOffset = data.offset;
  const curPage =
    rawOffset != null && perPage > 0
      ? Math.floor((rawOffset - 1) / perPage) + 1
      : (data.currentPage ?? fallbackPage);

  const hasNext =
    data.nextOffset != null
      ? Number(data.nextOffset) > 0
      : curPage < pageTotal;

  return {
    items,
    curPage,
    nextPage: hasNext ? curPage + 1 : null,
    prevPage: curPage > 1 ? curPage - 1 : null,
    perPage,
    pageTotal,
    itemsTotal,
    summaryCounts: mapResponseToIndividualsSummaryCounts({
      individuals: items,
      totalIndividuals: itemsTotal,
      currentPage: curPage,
      perPage,
      totalPages: pageTotal,
      currentRoles: data.currentRoles ?? 0,
      pastRoles: data.pastRoles ?? 0,
      ceos: data.ceos ?? 0,
      chairs: data.chairs ?? 0,
      founders: data.founders ?? 0,
    }),
  };
}

const INDIVIDUALS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R:develop";

async function resolveAuthToken(authToken?: string | null): Promise<string | null> {
  const explicit = authToken?.trim();
  if (explicit) return explicit;

  const cookieStore = await cookies();
  return cookieStore.get("asymmetrix_auth_token")?.value ?? null;
}

export async function fetchIndividualsServer(
  filters: IndividualsSearchFilters = createDefaultIndividualFilters(),
  authToken?: string | null
): Promise<IndividualsListResponse | null> {
  try {
    const token = await resolveAuthToken(authToken);
    if (!token) {
      console.error("fetchIndividualsServer: no auth token (cookie or client)");
      return null;
    }

    const payload = {
      ...filters,
      page: Math.max(1, filters.page || 1),
      per_page: filters.per_page > 0 ? filters.per_page : 50,
    };
    const url = `${INDIVIDUALS_API_BASE}/get_all_individuals`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(individualsFiltersToRequestBody(payload)),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Individuals API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const data = (await response.json()) as IndividualsApiListResponse;
    return mapIndividualsListResponse(data, payload.page, payload.per_page);
  } catch (error) {
    console.error("fetchIndividualsServer error:", error);
    return null;
  }
}

export async function fetchIndividualsCountsServer(
  filters: IndividualsSearchFilters = createDefaultIndividualFilters(),
  authToken?: string | null
): Promise<ReturnType<typeof mapIndividualsCountsResponse> | null> {
  try {
    const token = await resolveAuthToken(authToken);
    if (!token) return null;

    const params = individualsCountsFiltersToSearchParams(filters);
    const url = `${INDIVIDUALS_API_BASE}/get_individuals_counts?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Individuals counts API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return mapIndividualsCountsResponse(data);
  } catch (error) {
    console.error("fetchIndividualsCountsServer error:", error);
    return null;
  }
}

export async function fetchJobTitlesServer(
  authToken?: string | null
): Promise<Array<{ id: number; job_title: string }>> {
  try {
    const token = await resolveAuthToken(authToken);
    if (!token) return [];

    const response = await fetch(
      "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop/get_all_job_titles",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("fetchJobTitlesServer error:", error);
    return [];
  }
}

export { createDefaultIndividualFilters };
