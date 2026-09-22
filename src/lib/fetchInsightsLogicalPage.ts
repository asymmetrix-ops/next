import { normalizeContentArticles } from "@/lib/contentArticleDisplay";
import type {
  ContentArticle,
  InsightsAnalysisFilters,
  InsightsAnalysisResponse,
} from "@/types/insightsAnalysis";

export type InsightsApiPageCache = Map<number, InsightsAnalysisResponse>;

function getItemsTotal(json: InsightsAnalysisResponse): number {
  if (typeof json.itemsTotal === "number") return json.itemsTotal;
  if (typeof json.totalItems === "number") return json.totalItems;
  return 0;
}

/**
 * Walk paginated API responses in tile order and collect the slice for one
 * logical UI page. Fixes short API pages (e.g. 19 tiles when Per_page=20)
 * when series collapse happens after SQL LIMIT/OFFSET on the server.
 */
export async function fetchInsightsLogicalPage(
  filters: InsightsAnalysisFilters,
  options: {
    token: string;
    url: string;
    buildParams: (filters: InsightsAnalysisFilters) => URLSearchParams;
    cache?: InsightsApiPageCache;
  }
): Promise<{ items: ContentArticle[]; meta: InsightsAnalysisResponse }> {
  const perPage = filters.Per_page;
  const logicalPage = Math.max(1, filters.Offset);
  const startTile = (logicalPage - 1) * perPage;

  const headers = {
    Authorization: `Bearer ${options.token}`,
    "Content-Type": "application/json",
    "X-Data-Source": "live",
  };

  const fetchApiPage = async (apiPage: number): Promise<InsightsAnalysisResponse> => {
    const cached = options.cache?.get(apiPage);
    if (cached) return cached;

    const params = options.buildParams({ ...filters, Offset: apiPage });
    const response = await fetch(`${options.url}?${params.toString()}`, {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as InsightsAnalysisResponse;
    options.cache?.set(apiPage, data);
    return data;
  };

  const pageTiles: ContentArticle[] = [];
  let globalIdx = 0;
  let apiPage = 1;
  let lastMeta: InsightsAnalysisResponse | null = null;
  let pageTotal = 1;

  const maxApiPages = 200;

  while (pageTiles.length < perPage && apiPage <= pageTotal && apiPage <= maxApiPages) {
    const data = await fetchApiPage(apiPage);
    lastMeta = data;
    pageTotal = Math.max(1, data.pageTotal ?? 1);

    const batch = normalizeContentArticles(data.items || []);
    if (batch.length === 0) break;

    for (const item of batch) {
      if (globalIdx >= startTile && pageTiles.length < perPage) {
        pageTiles.push(item);
      }
      globalIdx += 1;
      if (pageTiles.length >= perPage) break;
    }

    if (pageTiles.length >= perPage) break;

    const hasMore =
      data.nextPage != null && data.nextPage > apiPage && apiPage < pageTotal;
    if (!hasMore && batch.length < perPage) break;

    apiPage = data.nextPage ?? apiPage + 1;
  }

  if (!lastMeta) {
    throw new Error("No insights data returned");
  }

  const itemsTotal = getItemsTotal(lastMeta);
  const meta: InsightsAnalysisResponse = {
    ...lastMeta,
    items: pageTiles,
    itemsReceived: pageTiles.length,
    itemsTotal,
    curPage: logicalPage,
    offset: startTile,
    pageTotal: Math.max(1, lastMeta.pageTotal ?? Math.ceil(itemsTotal / perPage)),
    prevPage: logicalPage > 1 ? logicalPage - 1 : null,
    nextPage:
      startTile + pageTiles.length < itemsTotal ? logicalPage + 1 : null,
  };

  return { items: pageTiles, meta };
}
