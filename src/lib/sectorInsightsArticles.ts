import type { ContentArticle } from "@/types/insightsAnalysis";

export const SECTOR_INSIGHTS_ARTICLES_API =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/articles_based_on_sectors";

/** Matches `articles_based_on_sectors` default page size. */
export const INSIGHTS_PAGE_SIZE = 2;

/** Parse `corporate_events_id` from URL search params. */
export function parseCorporateEventIdFromSearch(
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

  const raw = params.get("corporate_events_id");
  if (!raw) return undefined;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Parse comma-separated `primary_sectors_ids` from URL search params. */
export function parsePrimarySectorIdsFromSearch(
  search?: string | URLSearchParams | null
): number[] {
  let params: URLSearchParams;

  if (search instanceof URLSearchParams) {
    params = search;
  } else if (typeof search === "string") {
    const normalized = search.startsWith("?") ? search.slice(1) : search;
    params = new URLSearchParams(normalized);
  } else if (typeof window !== "undefined") {
    params = new URLSearchParams(window.location.search);
  } else {
    return [];
  }

  const raw = params.get("primary_sectors_ids");
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((id) => Number.parseInt(id.trim(), 10))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function buildSectorInsightsBrowseAllHref(args: {
  corporateEventId: number;
  primarySectorIds: number[];
  dealName?: string;
}): string {
  const params = new URLSearchParams();
  params.set("corporate_events_id", String(args.corporateEventId));
  if (args.primarySectorIds.length > 0) {
    params.set("primary_sectors_ids", args.primarySectorIds.join(","));
  }
  if (args.dealName?.trim()) {
    params.set("deal_name", args.dealName.trim());
  }
  return `/insights-analysis?${params.toString()}`;
}

export type SectorInsightsArticlesResult = {
  articles: ContentArticle[];
  total: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  page: number;
  perPage: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type PaginatedArticlesPayload = {
  items?: ContentArticle[];
  total?: number;
  total_pages?: number;
  showing_from?: number;
  showing_to?: number;
  page?: number;
  /** Items returned on this page — not the full result count. */
  itemsReceived?: number;
  itemTotal?: number;
  itemsTotal?: number;
  curPage?: number;
  nextPage?: number | null;
  prevPage?: number | null;
  offset?: number;
  perPage?: number;
  pageTotal?: number;
};

/** Parse paginated I&A list responses (`itemsTotal`, `pageTotal`, `curPage`, …). */
export function parseInsightsArticlesPage(
  data: ContentArticle[] | PaginatedArticlesPayload,
  page: number,
  defaultPerPage: number = INSIGHTS_PAGE_SIZE
): SectorInsightsArticlesResult {
  if (Array.isArray(data)) {
    const total = data.length;
    const responsePerPage = defaultPerPage;
    const start = total > 0 ? (page - 1) * responsePerPage : 0;
    const articles = data.slice(start, start + responsePerPage);
    const showingTo = total > 0 ? Math.min(start + articles.length, total) : 0;
    return {
      articles,
      total,
      totalPages: total > 0 ? Math.ceil(total / responsePerPage) : 0,
      showingFrom: total > 0 ? start + 1 : 0,
      showingTo,
      page,
      perPage: responsePerPage,
      hasNext: showingTo < total,
      hasPrev: page > 1,
    };
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  const responsePage = Math.max(
    1,
    typeof data?.curPage === "number" ? data.curPage : data?.page ?? page
  );
  const responsePerPage =
    typeof data?.perPage === "number" && data.perPage > 0
      ? data.perPage
      : defaultPerPage;
  const offset =
    typeof data?.offset === "number"
      ? data.offset
      : (responsePage - 1) * responsePerPage;

  const explicitTotal =
    typeof data?.itemsTotal === "number"
      ? data.itemsTotal
      : typeof data?.itemTotal === "number"
        ? data.itemTotal
        : typeof data?.total === "number"
          ? data.total
          : undefined;

  const total =
    explicitTotal ??
    (data?.nextPage != null
      ? offset + items.length + 1
      : offset + items.length);

  const showingFrom =
    typeof data?.showing_from === "number"
      ? data.showing_from
      : items.length > 0
        ? offset + 1
        : 0;
  const showingTo =
    typeof data?.showing_to === "number"
      ? data.showing_to
      : items.length > 0
        ? offset + items.length
        : 0;
  const totalPages =
    typeof data?.pageTotal === "number" && data.pageTotal > 0
      ? data.pageTotal
      : typeof data?.total_pages === "number" && data.total_pages > 0
        ? data.total_pages
        : total > 0
          ? Math.ceil(total / responsePerPage)
          : 0;
  const hasNext = data?.nextPage != null;
  const hasPrev = data?.prevPage != null;

  return {
    articles: items,
    total,
    totalPages,
    showingFrom,
    showingTo,
    page: responsePage,
    perPage: responsePerPage,
    hasNext,
    hasPrev,
  };
}

export async function fetchSectorInsightsArticles(args: {
  primarySectorIds: number[];
  corporateEventId: number;
  page?: number;
  token: string;
}): Promise<SectorInsightsArticlesResult> {
  const page = Math.max(1, args.page ?? 1);

  const params = new URLSearchParams();
  args.primarySectorIds.forEach((id) => {
    params.append("primary_sectors_ids[]", String(id));
  });
  params.append("corporate_events_id", String(args.corporateEventId));
  params.append("page", String(page));
  params.append("per_page", String(INSIGHTS_PAGE_SIZE));

  const url = `${SECTOR_INSIGHTS_ARTICLES_API}?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(String(res.status));
  }

  const data = (await res.json()) as ContentArticle[] | PaginatedArticlesPayload;
  return parseInsightsArticlesPage(data, page);
}

export function mapArticlesForPdfExport(
  articles: ContentArticle[]
): Array<{ id?: number; tag?: string; date?: string; title: string; content: string }> {
  return articles.map((article) => ({
    id: article.id,
    tag: (article.Content_Type || "Article").trim() || "Article",
    date: article.Publication_Date
      ? new Date(article.Publication_Date).toLocaleDateString()
      : undefined,
    title: article.Headline || "Untitled",
    content: article.Strapline || "",
  }));
}
