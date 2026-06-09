import type {
  InsightsAnalysisFilters,
  InsightsAnalysisResponse,
} from "@/types/insightsAnalysis";

export const GET_ALL_CONTENT_ARTICLES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles";

/** Parse `company_id` from URL search params (supports live window.location fallback). */
export function parseCompanyIdFromSearch(
  search?: string | URLSearchParams | null
): number | undefined {
  let params: URLSearchParams;

  if (search instanceof URLSearchParams) {
    params = search;
  } else if (typeof search === "string") {
    const normalized = search.startsWith("?") ? search.slice(1) : search;
    params = new URLSearchParams(normalized);
  } else if (typeof window !== "undefined") {
    params = new URLSearchParams(window.location.search);
  } else {
    return undefined;
  }

  const raw = params.get("company_id");
  if (!raw) return undefined;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function resolveContentArticlesCompanyId(
  filters: InsightsAnalysisFilters,
  search?: string | URLSearchParams | null
): number {
  if (typeof filters.company_id === "number" && filters.company_id > 0) {
    return filters.company_id;
  }
  return parseCompanyIdFromSearch(search) ?? 0;
}

export function buildContentArticlesSearchParams(
  filters: InsightsAnalysisFilters,
  search?: string | URLSearchParams | null
): URLSearchParams {
  const params = new URLSearchParams();
  params.append("Offset", String(filters.Offset));
  params.append("Per_page", String(filters.Per_page));

  if (filters.search_query?.trim()) {
    params.append("search_query", filters.search_query.trim());
  }
  if (filters.Countries?.length) {
    params.append("Countries", filters.Countries.join(","));
  }
  if (filters.Provinces?.length) {
    params.append("Provinces", filters.Provinces.join(","));
  }
  if (filters.Cities?.length) {
    params.append("Cities", filters.Cities.join(","));
  }
  if (filters.primary_sectors_ids?.length) {
    params.append("primary_sectors_ids", filters.primary_sectors_ids.join(","));
  }
  if (filters.Secondary_sectors_ids?.length) {
    params.append(
      "Secondary_sectors_ids",
      filters.Secondary_sectors_ids.join(",")
    );
  }

  const contentType = (filters.Content_Type || filters.content_type || "").trim();
  if (contentType) params.append("content_type", contentType);

  if (filters.Transaction_status != null) {
    params.append("Transaction_status", String(filters.Transaction_status));
  }

  params.append(
    "company_id",
    String(resolveContentArticlesCompanyId(filters, search))
  );

  return params;
}

export async function fetchAllContentArticles(
  filters: InsightsAnalysisFilters,
  token: string,
  search?: string | URLSearchParams | null
): Promise<InsightsAnalysisResponse> {
  const params = buildContentArticlesSearchParams(filters, search);
  const url = `${GET_ALL_CONTENT_ARTICLES_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
