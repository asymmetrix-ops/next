import type { PortfolioResponse, PaginationState } from "@/types/investor";

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

export const parsePortfolioApiResponse = (
  raw: unknown,
  page: number,
  itemsKey: "current_portfolio" | "past_portfolio"
): { items: unknown[]; pagination: PaginationState } => {
  if (Array.isArray(raw)) {
    const first = asRecord(raw[0]);
    return {
      items: raw,
      pagination: {
        itemsReceived: Number(first?.itemsreceived ?? raw.length ?? 0),
        curPage: Number(first?.curpage ?? page ?? 1),
        nextPage:
          first?.nextpage === null || first?.nextpage === undefined
            ? null
            : Number(first?.nextpage),
        prevPage:
          first?.prevpage === null || first?.prevpage === undefined
            ? null
            : Number(first?.prevpage),
        offset: Number(first?.offset ?? 0),
        perPage: 50,
        pageTotal: Number(first?.pagetotal ?? 0),
      },
    };
  }

  const obj = asRecord(raw);
  const nestedItems = obj[itemsKey];
  if (Array.isArray(nestedItems)) {
    const result = asRecord(obj["results"] ?? obj["result"]);
    const first = asRecord(nestedItems[0]);
    return {
      items: nestedItems,
      pagination: {
        itemsReceived: Number(
          result["itemsReceived"] ?? first["_total_count"] ?? nestedItems.length ?? 0
        ),
        curPage: Number(result["curPage"] ?? first["_page"] ?? page ?? 1),
        nextPage:
          result["nextPage"] === null || result["nextPage"] === undefined
            ? null
            : Number(result["nextPage"]),
        prevPage:
          result["prevPage"] === null || result["prevPage"] === undefined
            ? null
            : Number(result["prevPage"]),
        offset: Number(result["offset"] ?? 0),
        perPage: Number(result["perPage"] ?? first["_per_page"] ?? 50),
        pageTotal: Number(result["pageTotal"] ?? 0),
      },
    };
  }

  const data = raw as PortfolioResponse;
  return {
    items: data.items || [],
    pagination: {
      itemsReceived: data.itemsReceived || 0,
      curPage: data.curPage || 1,
      nextPage: data.nextPage ?? null,
      prevPage: data.prevPage ?? null,
      offset: data.offset || 0,
      perPage: data.perPage || 50,
      pageTotal: data.pageTotal || 0,
    },
  };
};
