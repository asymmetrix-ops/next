import type { PortfolioEntityType } from "@/lib/portfolioEntity";

export const COLLECT_IDS_MAX_PAGES = 500;

type PageResult = {
  items: Record<string, unknown>[];
  pageTotal: number;
  totalCount: number;
};

/**
 * Page through a list endpoint and gather every entity id of the current
 * filters (all pages, not just the visible one). Unlike the export helpers this
 * does not use export mode, so it is not capped by or counted against the
 * user's export limit.
 */
export async function collectAllEntityIds(
  fetchPage: (page: number) => Promise<PageResult>,
  getId: (row: Record<string, unknown>) => number,
  perPage: number
): Promise<number[]> {
  const ids = new Set<number>();
  let page = 1;
  let pageTotal = 1;
  let totalCount = 0;

  while (page <= pageTotal && page <= COLLECT_IDS_MAX_PAGES) {
    const result = await fetchPage(page);
    if (page === 1) {
      pageTotal = result.pageTotal || 1;
      totalCount = result.totalCount;
    }
    if (result.items.length === 0) break;

    let added = 0;
    for (const row of result.items) {
      const id = getId(row);
      if (id > 0 && !ids.has(id)) {
        ids.add(id);
        added += 1;
      }
    }
    if (added === 0) break;
    if (totalCount > 0 && ids.size >= totalCount) break;
    if (result.items.length < perPage) break;
    page += 1;
  }

  return Array.from(ids);
}

export type CollectableEntityType = Extract<
  PortfolioEntityType,
  "company" | "investor" | "advisor" | "individual"
>;
