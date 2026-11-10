import type { NewsArticle, NewsFilters } from "@/lib/news";

const COMPANY_API = "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop";

/** Top stories shown before "Show more". */
export const COMPANY_TOP_PAGE = 4;
/** Recent news cards per request. */
export const COMPANY_RECENT_PAGE = 10;

export type CompanyNewsReason = "top" | "mentioned" | "sector";
export type CompanyNewsPart = "top_stories" | "recent_news";

export type CompanyNewsSummaryItem = {
  id: number;
  headline: string;
  news_type: string | null;
  publication_date: string;
  part: CompanyNewsPart;
  reason: CompanyNewsReason;
};

export type CompanyNewsSummary = {
  show: boolean;
  total: number;
  top_count: number;
  recent_count: number;
  shown: number;
  items: CompanyNewsSummaryItem[];
};

type ApiItem = {
  id: number;
  part: CompanyNewsPart;
  reason: CompanyNewsReason;
  publication_date: string;
  headline: string;
  strapline?: string | null;
  summary?: string[] | null;
  news_type?: string | null;
  is_sector_roundup?: boolean | null;
  company_id?: number | null;
  company_name?: string | null;
  country_code?: string | null;
  country?: string | null;
  deal_radar_status?: string | null;
  sector_tags?: Array<{ id: number; name: string }> | string | null;
  related_ia_id?: number | null;
  related_ia_type?: string | null;
  related_ia_headline?: string | null;
  series_id?: number | null;
  series_title?: string | null;
  series_part?: number | null;
  series_total?: number | null;
  follow_up_to?: number | null;
};

type ApiBlock = { items?: ApiItem[]; total?: number | null; has_more?: boolean };
type ApiNewsResponse = { top_stories?: ApiBlock; recent_news?: ApiBlock };

/** Article for the shared NewsCard, plus what the company tab adds on top. */
export type CompanyNewsArticle = NewsArticle & {
  reason: CompanyNewsReason;
  part: CompanyNewsPart;
  is_sector_roundup: boolean;
  series_chip: { title: string | null; part: number; total: number } | null;
};

export type CompanyNewsBlock = { items: CompanyNewsArticle[]; total: number | null; hasMore: boolean };

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("asymmetrix_auth_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getJson<T>(path: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${COMPANY_API}/${path}${params ? `?${params}` : ""}`, {
    headers: authHeaders(),
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Authentication required" : `News request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchCompanyNewsSummary(companyId: number, signal?: AbortSignal): Promise<CompanyNewsSummary> {
  const json = await getJson<Partial<CompanyNewsSummary>>(`company/${companyId}/news/summary`, undefined, signal);
  const items = Array.isArray(json.items) ? json.items : [];
  return {
    show: Boolean(json.show) && (json.total ?? 0) > 0,
    total: json.total ?? 0,
    top_count: json.top_count ?? 0,
    recent_count: json.recent_count ?? 0,
    shown: json.shown ?? items.length,
    items,
  };
}

/** Summary card: Top Stories only (company tagged as Company of Focus). Count, footer and View all use these. */
export async function fetchCompanyTopStoriesSummary(
  companyId: number,
  total: number,
  signal?: AbortSignal
): Promise<CompanyNewsSummary> {
  const page = await fetchCompanyNews({ companyId, filters: {}, topLimit: 5, recentLimit: 1, signal });
  const items: CompanyNewsSummaryItem[] = page.top.items.map((a) => ({
    id: a.id as number,
    headline: a.Headline as string,
    news_type: (a.News_Sub_Type as string | undefined) ?? null,
    publication_date: a.Publication_Date as string,
    part: "top_stories",
    reason: "top",
  }));
  const count = page.top.total ?? total;
  return { show: count > 0 && items.length > 0, total: count, top_count: count, recent_count: 0, shown: items.length, items };
}

function parseSectorTags(v: ApiItem["sector_tags"]): Array<{ id: number; name: string }> {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toArticle(item: ApiItem): CompanyNewsArticle {
  const roundup = Boolean(item.is_sector_roundup);
  const hasCompany = !roundup && item.company_id != null && !!item.company_name;
  const seriesTotal = item.series_total ?? 0;
  return {
    id: item.id,
    Headline: item.headline,
    Strapline: item.strapline || "",
    Publication_Date: item.publication_date,
    Content_Type: "News",
    News_Sub_Type: item.news_type || undefined,
    companies_of_focus: hasCompany ? [{ id: item.company_id as number, name: item.company_name as string, hq_iso2: item.country_code || null }] : [],
    hq_country_iso2: hasCompany ? item.country_code || undefined : undefined,
    focus_tags: {
      primarySectors: parseSectorTags(item.sector_tags).map((s) => s.name).filter(Boolean),
      transactionStatus: hasCompany ? item.deal_radar_status?.trim() || null : null,
    },
    follow_up_to: item.follow_up_to ?? null,
    related_ia: item.related_ia_id
      ? {
          id: item.related_ia_id,
          headline: item.related_ia_headline || undefined,
          contentType: item.related_ia_type || undefined,
        }
      : null,
    reason: item.reason,
    part: item.part,
    is_sector_roundup: roundup,
    series_chip:
      item.series_id && seriesTotal > 0
        ? { title: item.series_title ?? null, part: item.series_part ?? 1, total: seriesTotal }
        : null,
  } as unknown as CompanyNewsArticle;
}

function toBlock(block?: ApiBlock): CompanyNewsBlock {
  return {
    items: (block?.items ?? []).map(toArticle),
    total: block?.total ?? null,
    hasMore: Boolean(block?.has_more),
  };
}

export type CompanyNewsPage = { top: CompanyNewsBlock; recent: CompanyNewsBlock };

export async function fetchCompanyNews(opts: {
  companyId: number;
  filters: NewsFilters;
  topLimit?: number;
  topOffset?: number;
  recentLimit?: number;
  recentOffset?: number;
  signal?: AbortSignal;
}): Promise<CompanyNewsPage> {
  const f = opts.filters;
  const params = new URLSearchParams();
  if (f.text) params.set("q", f.text);
  if (f.subType) params.set("news_type", f.subType);
  if (f.sector) params.set("primary_sector_id", String(f.sector.id));
  if (f.countryName) params.set("country", f.countryName);
  if (f.timeRange) params.set("time_range", f.timeRange);
  if (f.followedOnly) params.set("followed_only", "1");
  params.set("top_limit", String(opts.topLimit ?? COMPANY_TOP_PAGE));
  params.set("top_offset", String(opts.topOffset ?? 0));
  params.set("recent_limit", String(opts.recentLimit ?? COMPANY_RECENT_PAGE));
  params.set("recent_offset", String(opts.recentOffset ?? 0));
  const json = await getJson<ApiNewsResponse>(`company/${opts.companyId}/news`, params, opts.signal);
  return { top: toBlock(json.top_stories), recent: toBlock(json.recent_news) };
}

/** "2026-10-22" -> "Oct 22" (no timezone shifts). */
export function formatShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
