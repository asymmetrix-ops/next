"use server";

import { cookies } from "next/headers";
import type { Individual, IndividualsResponse } from "@/types/individuals";
import {
  createDefaultIndividualFilters,
  individualsFiltersToSearchParams,
  individualsCountsFiltersToSearchParams,
  type IndividualsSearchFilters,
} from "@/lib/individualsFilterPayload";
import {
  mapResponseToIndividualsSummaryCounts,
  mapIndividualsCountsResponse,
} from "@/components/individuals/individualsFilterConfig";

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

// List lives on the main branch; counts endpoint is only on :develop.
const INDIVIDUALS_LIST_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R";
const INDIVIDUALS_COUNTS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R:develop";

export async function fetchIndividualsServer(
  filters: IndividualsSearchFilters = createDefaultIndividualFilters()
): Promise<IndividualsListResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const payload = {
      ...filters,
      page: Math.max(1, filters.page || 1),
      per_page: filters.per_page > 0 ? filters.per_page : 50,
    };
    const params = individualsFiltersToSearchParams(payload);
    const url = `${INDIVIDUALS_LIST_API_BASE}/get_all_individuals?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Individuals API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }

    const data = (await response.json()) as IndividualsResponse;
    const currentPage = data.currentPage || payload.page;
    const totalPages = data.totalPages || 1;

    return {
      items: data.individuals || [],
      curPage: currentPage,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
      perPage: data.perPage || payload.per_page,
      pageTotal: totalPages,
      itemsTotal: data.totalIndividuals || data.individuals?.length || 0,
      summaryCounts: mapResponseToIndividualsSummaryCounts(data),
    };
  } catch (error) {
    console.error("fetchIndividualsServer error:", error);
    return null;
  }
}

export async function fetchIndividualsCountsServer(
  filters: IndividualsSearchFilters = createDefaultIndividualFilters()
): Promise<ReturnType<typeof mapIndividualsCountsResponse> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const params = individualsCountsFiltersToSearchParams(filters);
    const url = `${INDIVIDUALS_COUNTS_API_BASE}/get_individuals_counts?${params.toString()}`;

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

export async function fetchJobTitlesServer(): Promise<
  Array<{ id: number; job_title: string }>
> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
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
