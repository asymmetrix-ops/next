/**
 * Platform-wide search using split APIs (sectors, investors, individuals, events, content, companies, advisors).
 * Client calls /api/search which fetches from all 7 Xano endpoints in parallel on the server.
 * Payload: { query, per_page?: 25, page?: 1, page_type?: string }
 */

export const SEARCH_PAGE_TYPES = [
  "companies",
  "sectors",
  "investors",
  "advisors",
  "individuals",
  "corporate events",
  "insights and analysis",
] as const;

export type SearchPageType = (typeof SEARCH_PAGE_TYPES)[number];

export const SEARCH_PAGE_TYPE_LABELS: Record<SearchPageType, string> = {
  companies: "Companies",
  sectors: "Sectors",
  investors: "Investors",
  advisors: "Advisors",
  individuals: "Individuals",
  "corporate events": "Corporate Events",
  "insights and analysis": "Insights & Analysis",
};

export type GlobalSearchResult = {
  id: number;
  title: string;
  type: string;
  match_rank?: number;
  type_order?: number;
  sort_date?: string;
  sector_importance?: string;
};

const TYPE_ORDER: Record<string, number> = {
  company: 1,
  companies: 1,
  investor: 2,
  investors: 2,
  advisor: 3,
  advisors: 3,
  individual: 4,
  individuals: 4,
  sector: 5,
  sectors: 5,
  sub_sector: 5,
  "sub-sector": 5,
  corporate_event: 6,
  "corporate-events": 6,
  event: 6,
  insight: 7,
  insights: 7,
  article: 7,
};

export function sortSearchResults(results: GlobalSearchResult[]): GlobalSearchResult[] {
  return [...results].sort((a, b) => {
    const rankA = a.match_rank ?? 999;
    const rankB = b.match_rank ?? 999;
    if (rankA !== rankB) return rankA - rankB;

    const orderA = a.type_order ?? TYPE_ORDER[a.type?.toLowerCase()] ?? 99;
    const orderB = b.type_order ?? TYPE_ORDER[b.type?.toLowerCase()] ?? 99;
    if (orderA !== orderB) return orderA - orderB;

    const isEventOrInsight = (t: string) =>
      ["corporate_event", "corporate-events", "event", "insight", "insights", "article"].includes(
        (t || "").toLowerCase()
      );
    if (isEventOrInsight(a.type) && isEventOrInsight(b.type) && a.sort_date && b.sort_date) {
      return new Date(b.sort_date).getTime() - new Date(a.sort_date).getTime();
    }

    return (a.title || "").localeCompare(b.title || "");
  });
}

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

const PER_PAGE = 25;

export const SEARCH_SOURCES = [
  "sector",
  "investor",
  "individual",
  "corporate_event",
  "insight",
  "company",
  "advisor",
] as const;

export type SearchSource = (typeof SEARCH_SOURCES)[number];

/**
 * Fetch from a single search source (for progressive loading).
 */
export async function fetchGlobalSearchBySource(
  query: string,
  source: SearchSource,
  signal?: AbortSignal
): Promise<{ items: GlobalSearchResult[] }> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: query.trim(),
      source,
    }),
    signal,
    credentials: "same-origin",
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Authentication required");
    throw new Error(`Search failed (${res.status})`);
  }

  const data = (await res.json()) as { items?: GlobalSearchResult[] };
  const items = Array.isArray(data?.items) ? data.items : [];
  return { items };
}

export type ProgressiveSearchOptions = {
  onBatch: (items: GlobalSearchResult[], source: SearchSource) => void;
  onComplete: () => void;
  onError?: (source: SearchSource, err: unknown) => void;
  signal?: AbortSignal;
};

/**
 * Fetch from all sources in parallel; call onBatch as each source responds (progressive loading).
 */
export function fetchGlobalSearchProgressive(
  query: string,
  pageType: SearchPageType | null,
  options: ProgressiveSearchOptions
): void {
  const { onBatch, onComplete, onError, signal } = options;
  const q = query.trim();
  if (!q || q.length < 2) {
    onComplete();
    return;
  }

  const typeToSource: Record<string, SearchSource> = {
    companies: "company",
    sectors: "sector",
    investors: "investor",
    advisors: "advisor",
    individuals: "individual",
    "corporate events": "corporate_event",
    "insights and analysis": "insight",
  };

  const sources: SearchSource[] = pageType
    ? [typeToSource[pageType] ?? "company"]
    : [...SEARCH_SOURCES];

  let pending = sources.length;

  sources.forEach((source) => {
    fetchGlobalSearchBySource(q, source, signal)
      .then(({ items }) => {
        if (items.length > 0) {
          onBatch(items, source);
        }
      })
      .catch((err) => {
        onError?.(source, err);
      })
      .finally(() => {
        pending -= 1;
        if (pending === 0) {
          onComplete();
        }
      });
  });
}

/**
 * Fetch paginated search results from our API route (server-side parallel fetch to 7 Xano endpoints).
 */
export async function fetchGlobalSearchPaginated(
  query: string,
  page: number,
  signal?: AbortSignal,
  pageType?: SearchPageType | null
): Promise<GlobalSearchResponse> {
  const body: Record<string, unknown> = {
    query: query.trim(),
    per_page: PER_PAGE,
    page,
  };
  if (pageType) {
    body.page_type = pageType;
  }

  const res = await fetch("/api/search", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
    credentials: "same-origin",
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Authentication required");
    throw new Error(`Search failed (${res.status})`);
  }

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
  if (t === "sector" || t === "sub_sector" || t === "sub-sector") {
    const importance = String(result.sector_importance || "").trim().toLowerCase();
    return importance === "secondary" ? `/sub-sector/${id}` : `/sector/${id}`;
  }

  return "";
}

export function getSearchBadgeLabel(type: string): string {
  const t = (type || "").toLowerCase().trim();
  if (t === "insight" || t === "insights" || t === "article")
    return "Insights & Analysis";
  return String(type).replace(/_/g, " ");
}
