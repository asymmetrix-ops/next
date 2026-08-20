import type {
  InsightsAnalysisFilters,
  InsightsAnalysisResponse,
} from "@/types/insightsAnalysis";
import { fetchAllContentArticles } from "@/lib/fetchAllContentArticles";

/** Cards shown per Insights & Analysis page — must divide evenly by desktop column count (4). */
export const INSIGHTS_DISPLAY_PAGE_SIZE = 12;

function inferApiPageSize(data: InsightsAnalysisResponse): number {
  const items = data.items ?? [];
  const totalItems = data.itemsReceived ?? 0;
  const apiPageTotal = data.pageTotal ?? 0;

  if (items.length > 0 && apiPageTotal > 1 && totalItems > 0) {
    const fromTotals = Math.ceil(totalItems / apiPageTotal);
    if (fromTotals > 0) return fromTotals;
  }

  return items.length > 0 ? items.length : INSIGHTS_DISPLAY_PAGE_SIZE;
}

/**
 * Fetches one display page of insights articles, stitching together multiple API
 * pages when the backend page size (often 10) is smaller than the grid page size (12).
 */
export async function fetchInsightsAnalysisDisplayPage(
  filters: InsightsAnalysisFilters,
  token: string,
  search?: string | URLSearchParams | null,
  displayPageSize: number = INSIGHTS_DISPLAY_PAGE_SIZE
): Promise<InsightsAnalysisResponse> {
  const displayPage = Math.max(1, filters.Offset);

  const probe = await fetchAllContentArticles(
    { ...filters, Offset: 1 },
    token,
    search
  );

  const totalItems = probe.itemsReceived ?? 0;
  const apiPageSize = inferApiPageSize(probe);
  const displayPageTotal =
    totalItems > 0 ? Math.ceil(totalItems / displayPageSize) : 0;

  if (totalItems === 0) {
    return {
      itemsReceived: 0,
      curPage: displayPage,
      nextPage: null,
      prevPage: null,
      offset: 0,
      pageTotal: 0,
      items: [],
    };
  }

  const startIndex = (displayPage - 1) * displayPageSize;
  if (startIndex >= totalItems) {
    return {
      itemsReceived: totalItems,
      curPage: displayPage,
      nextPage: null,
      prevPage: displayPage > 1 ? displayPage - 1 : null,
      offset: startIndex,
      pageTotal: displayPageTotal,
      items: [],
    };
  }

  const endIndex = Math.min(startIndex + displayPageSize, totalItems);
  const firstApiPage = Math.floor(startIndex / apiPageSize) + 1;
  const lastApiPage = Math.floor((endIndex - 1) / apiPageSize) + 1;

  const apiResponses = await Promise.all(
    Array.from({ length: lastApiPage - firstApiPage + 1 }, (_, index) =>
      fetchAllContentArticles(
        { ...filters, Offset: firstApiPage + index },
        token,
        search
      )
    )
  );

  const mergedItems = apiResponses.flatMap((response) => response.items ?? []);
  const sliceStart = startIndex - (firstApiPage - 1) * apiPageSize;
  const items = mergedItems.slice(sliceStart, sliceStart + displayPageSize);

  return {
    itemsReceived: totalItems,
    curPage: displayPage,
    nextPage: displayPage < displayPageTotal ? displayPage + 1 : null,
    prevPage: displayPage > 1 ? displayPage - 1 : null,
    offset: startIndex,
    pageTotal: displayPageTotal,
    items,
  };
}
