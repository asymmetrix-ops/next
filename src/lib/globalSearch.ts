/**
 * Platform-wide global search API and helpers.
 * API: POST { query, per_page: 25, offset: pageNumber }
 * Response: { items: [...], pagination: { current_page, per_page, total_results, total_pages, next_page, prev_page, pages_left } }
 */

export type GlobalSearchResult = {
  id: number;
  title: string;
  type: string;
};

export type GlobalSearchPagination = {
  current_page: number;
  per_page: number;
  total_results: number;
  total_pages: number;
  next_page: number | null;
  prev_page: number | null;
  pages_left: number;
};

export type GlobalSearchResponse = {
  items: GlobalSearchResult[];
  pagination: GlobalSearchPagination;
};

const GLOBAL_SEARCH_ENDPOINT =
  "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/global_search";

const PER_PAGE = 25;

/**
 * Fetch paginated search results.
 * @param query Search query
 * @param page 1-based page number (offset in API)
 * @param signal AbortSignal for cancellation
 */
export async function fetchGlobalSearchPaginated(
  query: string,
  page: number,
  signal?: AbortSignal
): Promise<GlobalSearchResponse> {
  const res = await fetch(GLOBAL_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: query.trim(),
      per_page: PER_PAGE,
      offset: page,
    }),
    signal,
  });

  if (!res.ok) throw new Error(`Search failed (${res.status})`);

  const data = (await res.json()) as unknown;
  if (!data || typeof data !== "object") {
    return { items: [], pagination: defaultPagination() };
  }

  const obj = data as Record<string, unknown>;
  const items = Array.isArray(obj.items) ? obj.items : [];
  const pag = obj.pagination as Partial<GlobalSearchPagination> | undefined;

  return {
    items: items as GlobalSearchResult[],
    pagination: pag
      ? {
          current_page: pag.current_page ?? 1,
          per_page: pag.per_page ?? PER_PAGE,
          total_results: pag.total_results ?? 0,
          total_pages: pag.total_pages ?? 0,
          next_page: pag.next_page ?? null,
          prev_page: pag.prev_page ?? null,
          pages_left: pag.pages_left ?? 0,
        }
      : defaultPagination(),
  };
}

function defaultPagination(): GlobalSearchPagination {
  return {
    current_page: 1,
    per_page: PER_PAGE,
    total_results: 0,
    total_pages: 0,
    next_page: null,
    prev_page: null,
    pages_left: 0,
  };
}

export function badgeClassForSearchType(type: string): string {
  const t = (type || "").toLowerCase().trim();
  if (t === "company") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (t === "investor" || t === "investors")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (t === "advisor" || t === "advisors")
    return "bg-sky-50 text-sky-700 border-sky-200";
  if (t === "individual" || t === "individuals")
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (t === "corporate_event" || t === "corporate-events" || t === "event")
    return "bg-purple-50 text-purple-700 border-purple-200";
  if (t === "insight" || t === "insights" || t === "article")
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (t === "sector" || t === "sub_sector" || t === "sub-sector")
    return "bg-gray-50 text-gray-700 border-gray-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

export function resolveSearchHref(result: GlobalSearchResult): string {
  const t = String(result.type || "").toLowerCase().trim();
  const id = Number(result.id);
  if (!Number.isFinite(id) || id <= 0) return "";

  if (t === "company") return `/company/${id}`;
  if (t === "investor" || t === "investors") return `/investors/${id}`;
  if (t === "advisor" || t === "advisors") return `/advisor/${id}`;
  if (t === "individual" || t === "individuals") return `/individual/${id}`;
  if (t === "corporate_event" || t === "corporate-events" || t === "event")
    return `/corporate-event/${id}`;
  if (t === "insight" || t === "insights" || t === "article")
    return `/article/${id}`;
  if (t === "sector") return `/sector/${id}`;
  if (t === "sub_sector" || t === "sub-sector") return `/sub-sector/${id}`;

  return "";
}

export function getSearchBadgeLabel(type: string): string {
  const t = (type || "").toLowerCase().trim();
  if (t === "insight" || t === "insights" || t === "article")
    return "Insights & Analysis";
  return String(type).replace(/_/g, " ");
}
