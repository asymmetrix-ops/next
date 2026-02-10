import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:emt0MLoc";

const SEARCH_ENDPOINTS: { url: string; type: string }[] = [
  { url: `${BASE}/search_sectors`, type: "sector" },
  { url: `${BASE}/search_investors`, type: "investor" },
  { url: `${BASE}/search_individuals`, type: "individual" },
  { url: `${BASE}/search_events`, type: "corporate_event" },
  { url: `${BASE}/search_content`, type: "insight" },
  { url: `${BASE}/search_companies`, type: "company" },
  { url: `${BASE}/search_advisors`, type: "advisor" },
];

export type SearchResultItem = {
  id: number;
  title: string;
  type: string;
};

function extractItems(data: unknown, defaultType: string): SearchResultItem[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  let raw: unknown[] = [];
  if (Array.isArray(obj.items)) raw = obj.items;
  else if (Array.isArray(obj.data)) raw = obj.data;
  else if (Array.isArray(obj.results)) raw = obj.results;
  else if (Array.isArray(obj)) raw = obj;

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const id = Number(rec.id ?? rec.sector_id ?? rec.company_id ?? rec.investor_id ?? rec.advisor_id ?? rec.individual_id ?? rec.corporate_event_id ?? rec.event_id ?? rec.article_id);
      if (!Number.isFinite(id) || id <= 0) return null;

      const title =
        String(rec.title ?? rec.name ?? rec.headline ?? rec.description ?? rec.label ?? "")
          .trim() || "Untitled";
      const itemType = String(rec.type ?? rec.entity_type ?? defaultType).toLowerCase().trim() || defaultType;
      return { id, title, type: itemType };
    })
    .filter((r): r is SearchResultItem => r !== null);
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("asymmetrix_auth_token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const page = Math.max(1, Number(body?.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(body?.per_page) || 25));
    const pageType =
      typeof body?.page_type === "string" ? body.page_type.trim().toLowerCase() : null;

    if (!query || query.length < 2) {
      return NextResponse.json({
        items: [],
        pagination: {
          current_page: 1,
          per_page: perPage,
          total_results: 0,
          total_pages: 0,
          next_page: null,
          prev_page: null,
          pages_left: 0,
        },
      });
    }

    const payload = JSON.stringify({ query });
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const sourceFilter =
      typeof body?.source === "string" ? body.source.trim().toLowerCase() : null;
    const typeFilter = pageType
      ? new Map<string, string>([
          ["companies", "company"],
          ["sectors", "sector"],
          ["investors", "investor"],
          ["advisors", "advisor"],
          ["individuals", "individual"],
          ["corporate events", "corporate_event"],
          ["insights and analysis", "insight"],
        ]).get(pageType)
      : sourceFilter;

    const endpoints =
      typeFilter
        ? SEARCH_ENDPOINTS.filter((e) => e.type === typeFilter)
        : SEARCH_ENDPOINTS;

    const results = await Promise.all(
      endpoints.map(async ({ url, type }) => {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers,
            body: payload,
            cache: "no-store",
          });
          if (!res.ok) return [];
          const data = (await res.json()) as unknown;
          const items = extractItems(data, type);
          return items.slice(0, 100);
        } catch {
          return [];
        }
      })
    );

    const allItems = results.flat();
    const total = allItems.length;
    const isSingleSource = endpoints.length === 1;
    const effectivePerPage = isSingleSource ? Math.max(total, 1) : perPage;
    const totalPages = isSingleSource ? 1 : Math.max(1, Math.ceil(total / perPage));
    const offset = isSingleSource ? 0 : (page - 1) * perPage;
    const items = allItems.slice(offset, offset + effectivePerPage);

    return NextResponse.json({
      items,
      pagination: {
        current_page: page,
        per_page: perPage,
        total_results: total,
        total_pages: totalPages,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null,
        pages_left: Math.max(0, totalPages - page),
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
