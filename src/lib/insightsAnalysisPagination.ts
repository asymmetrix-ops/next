import type {
  InsightsAnalysisFilters,
  InsightsAnalysisResponse,
} from "@/types/insightsAnalysis";
import { fetchAllContentArticles } from "@/lib/fetchAllContentArticles";

/** Cards shown per Insights & Analysis page — must divide evenly by desktop column count (4). */
export const INSIGHTS_DISPLAY_PAGE_SIZE = 12;

function inferApiPageSize(data: InsightsAnalysisResponse): number {
  const items = data.items ?? [];
  const apiPageTotal = data.pageTotal ?? 0;

  if (items.length > 0 && apiPageTotal > 1) {
    return items.length;
  }

  return items.length > 0 ? items.length : INSIGHTS_DISPLAY_PAGE_SIZE;
}

/** Resolve catalog total — itemsReceived is often the current page count, not the full total. */
function inferTotalItems(
  data: InsightsAnalysisResponse,
  apiPageSize: number
): number {
  const pageTotal = data.pageTotal ?? 0;
  const itemsReceived = data.itemsReceived ?? 0;
  const pageItemCount = data.items?.length ?? 0;

  if (pageTotal > 1 && apiPageSize > 0) {
    // itemsReceived is the catalog total only when it exceeds one API page.
    if (itemsReceived > apiPageSize) return itemsReceived;
    return (pageTotal - 1) * apiPageSize + pageItemCount;
  }

  return itemsReceived || pageItemCount;
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

  const apiPageSize = inferApiPageSize(probe);
  const totalItems = inferTotalItems(probe, apiPageSize);
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
