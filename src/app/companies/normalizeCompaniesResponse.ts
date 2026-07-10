import type { CompaniesResponse, CompaniesResultPayload, CompanyItem } from "./actions";

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Normalize Get_new_companies payloads (result1 wrapper, flat body, or alternate keys). */
export function normalizeCompaniesResponse(raw: unknown): CompaniesResponse {
  const empty: CompaniesResultPayload = {
    items: [],
    itemsReceived: 0,
    curPage: 1,
    nextPage: null,
    prevPage: null,
    offset: 0,
    perPage: 20,
    pageTotal: 1,
    totalCount: 0,
  };

  if (!raw || typeof raw !== "object") {
    return { result1: empty };
  }

  const root = raw as Record<string, unknown>;
  const payload =
    root.result1 && typeof root.result1 === "object"
      ? (root.result1 as Record<string, unknown>)
      : root;

  const items = Array.isArray(payload.items)
    ? (payload.items as CompanyItem[])
    : Array.isArray(root.items)
    ? (root.items as CompanyItem[])
    : [];

  const perPage =
    readNumber(payload.perPage ?? payload.per_page ?? root.perPage ?? root.per_page, 20) ||
    20;
  const curPage =
    readNumber(payload.curPage ?? payload.cur_page ?? root.curPage ?? root.cur_page, 1) || 1;
  const nextPage = readNullableNumber(
    payload.nextPage ?? payload.next_page ?? root.nextPage ?? root.next_page
  );
  const prevPage = readNullableNumber(
    payload.prevPage ?? payload.prev_page ?? root.prevPage ?? root.prev_page
  );

  let pageTotal = readNumber(
    payload.pageTotal ??
      payload.pagetotal ??
      payload.page_total ??
      root.pageTotal ??
      root.pagetotal ??
      root.page_total,
    0
  );

  if (pageTotal <= 0 && nextPage != null) {
    pageTotal = Math.max(nextPage, curPage + 1);
  }
  if (pageTotal <= 0 && items.length >= perPage) {
    pageTotal = curPage + 1;
  }
  if (pageTotal <= 0) {
    pageTotal = 1;
  }

  const totalCount = readNumber(
    payload.total_count ??
      payload.totalCount ??
      payload.total_count_all ??
      root.total_count ??
      root.totalCount,
    0
  );

  return {
    result1: {
      items,
      itemsReceived: readNumber(
        payload.itemsReceived ?? payload.items_received ?? items.length,
        items.length
      ),
      curPage,
      nextPage,
      prevPage: prevPage ?? (curPage > 1 ? curPage - 1 : null),
      offset: readNumber(payload.offset ?? root.offset, 0),
      perPage,
      pageTotal,
      totalCount: totalCount > 0 ? totalCount : undefined,
      ownershipCounts: (payload.ownershipCounts ?? root.ownershipCounts) as
        | CompaniesResultPayload["ownershipCounts"]
        | undefined,
    },
  };
}
