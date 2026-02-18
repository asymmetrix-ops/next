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
  match_rank?: number;
  type_order?: number;
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

function normalizeForMatch(input: string): string {
  // Lowercase, remove diacritics, strip punctuation, normalize whitespace.
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Cross-source comparable match ranking.
 * Lower is better (0 = best).
 */
function computeMatchRank(query: string, title: string): number {
  const qRaw = String(query || "").trim();
  const tRaw = String(title || "").trim();
  if (!qRaw || !tRaw) return 999;

  const qLower = qRaw.toLowerCase();
  const tLower = tRaw.toLowerCase();
  if (tLower === qLower) return 0; // exact (case-insensitive)

  const qNorm = normalizeForMatch(qRaw);
  const tNorm = normalizeForMatch(tRaw);
  if (!qNorm || !tNorm) return 999;
  if (tNorm === qNorm) return 1; // exact ignoring punctuation/diacritics/extra whitespace
  if (tNorm.startsWith(qNorm)) return 2; // prefix
  if (tNorm.includes(qNorm)) return 3; // contains
  return 999;
}

function compareSearchItems(a: SearchResultItem, b: SearchResultItem): number {
  const rankA = a.match_rank ?? 999;
  const rankB = b.match_rank ?? 999;
  if (rankA !== rankB) return rankA - rankB;

  const orderA = a.type_order ?? TYPE_ORDER[String(a.type || "").toLowerCase()] ?? 99;
  const orderB = b.type_order ?? TYPE_ORDER[String(b.type || "").toLowerCase()] ?? 99;
  if (orderA !== orderB) return orderA - orderB;

  return String(a.title || "").localeCompare(String(b.title || ""));
}

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
      const sectorImportance =
        rec.sector_importance != null ? String(rec.sector_importance).trim() : undefined;
      return { id, title, type: itemType, ...(sectorImportance ? { sector_importance: sectorImportance } : {}) };
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

    const allItems = results
      .flat()
      .map((item) => {
        const type = String(item.type || "").toLowerCase().trim();
        const matchRank = computeMatchRank(query, item.title);
        const typeOrder = TYPE_ORDER[type] ?? 99;
        return {
          ...item,
          type,
          match_rank: matchRank,
          type_order: typeOrder,
          ...(item.sector_importance ? { sector_importance: item.sector_importance } : {}),
        } satisfies SearchResultItem;
      })
      .sort(compareSearchItems);

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
