import type { ArticleSeries, ContentArticle } from "@/types/insightsAnalysis";

const NEWS_API = "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/news";

export const NEWS_PAGE_SIZE = 20;

export type NewsRef = {
  id: number;
  headline: string;
  publication_date?: string;
};

/**
 * News article as the News section understands it. `follow_up_to` and
 * `related_ia` are contract fields the backend still has to provide
 * ("Follow-up to" CMS field; I&A matched by Company of Focus or by hand).
 */
export type NewsArticle = ContentArticle & {
  News_Sub_Type?: string;
  news_sub_type?: string;
  follow_up_to?: number | NewsRef | null;
  related_ia?: { id: number; headline?: string; contentType?: string } | null;
  /** From /news/top_stories: "Follow-up" | "Previously" | null. */
  label?: "Follow-up" | "Previously" | null;
  /** From /news/feed: other published articles in this article's series. */
  series_others?: NewsRef[];
  /** From /news/feed: Content Series (parts in series.parts). */
  series?: ArticleSeries | null;
  is_content_series?: boolean;
  /** Sector and transaction status of the first company of focus (card tags). */
  focus_tags?: { primarySectors: string[]; transactionStatus: string | null };
};

/** One filter the user picked (suggestion or Enter-to-search). */
export type NewsFilter =
  | { kind: "company"; id: number; label: string }
  | { kind: "investor"; id: number; label: string }
  | { kind: "sector"; id: number; label: string }
  | { kind: "text"; label: string };

type FilterRef = { id: number; label: string };

/** Active filters: at most one per kind, combined with AND by the API. */
export type NewsFilters = {
  company?: FilterRef;
  investor?: FilterRef;
  sector?: FilterRef;
  text?: string;
  /** News sub-type from the filter bar (e.g. "Fundraise"). */
  subType?: string;
  /** Transaction status from the filter dropdown (value from /news/filters). */
  transactionStatus?: string;
  /** HQ country ISO2 codes of the Company of Focus (Geography filter), e.g. ["GB", "DE"]. */
  countries?: string[];
  /** Publication date range, inclusive, "YYYY-MM-DD". Computed on the front (presets or custom). */
  dateFrom?: string;
  dateTo?: string;
  /**
   * Only articles whose company of focus the user follows. The feed has no
   * such parameter yet, so the page applies this one itself.
   */
  followedOnly?: boolean;
};

export function addNewsFilter(filters: NewsFilters, f: NewsFilter): NewsFilters {
  return f.kind === "text"
    ? { ...filters, text: f.label }
    : { ...filters, [f.kind]: { id: f.id, label: f.label } };
}

export function hasNewsFilters(f: NewsFilters): boolean {
  return Boolean(
    f.company ||
      f.investor ||
      f.sector ||
      f.text ||
      f.subType ||
      f.transactionStatus ||
      (f.countries && f.countries.length > 0) ||
      f.dateFrom ||
      f.dateTo ||
      f.followedOnly
  );
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;
  return {
    "Content-Type": "application/json",
    "X-Data-Source": "live",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Curated endpoints: /news/top_stories and /news/feed ──────────────────

type ApiNewsItem = {
  id: number;
  Headline: string;
  Strapline?: string;
  Publication_Date: string;
  Company_of_Focus?: unknown;
  follow_up_to?: number | null;
  label?: "Follow-up" | "Previously" | null;
  in_series?: boolean;
  is_content_series?: boolean;
  series?: ArticleSeries | null;
  series_others?: unknown;
  ia_id?: number | null;
  ia_headline?: string | null;
  ia_content_type?: string | null;
  News_Sub_Type?: string | null;
  focus_companies?: unknown;
};

type FocusCompany = {
  id: number;
  name: string;
  logo?: string | null;
  hq_country?: string | null;
  hq_iso2?: string | null;
  primary_sectors?: unknown;
  process_stage?: string | null;
  /** Deal Radar transaction status (e.g. "Reported in Market") — the parent status to show, not its process-stage children ("Deal Prep", "In Market"). */
  transaction_status?: string | null;
};

/** Raw-SQL endpoints can return arrays as JSON strings. */
function parseArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function fromApiItem(item: ApiNewsItem): NewsArticle {
  const others = parseArray<{ id: number; Headline: string; Publication_Date?: string }>(
    item.series_others
  ).map((o) => ({ id: o.id, headline: o.Headline, publication_date: o.Publication_Date }));
  const focus = parseArray<FocusCompany>(item.focus_companies);
  return {
    id: item.id,
    Headline: item.Headline,
    Strapline: item.Strapline || "",
    Publication_Date: item.Publication_Date,
    Content_Type: "News",
    News_Sub_Type: item.News_Sub_Type || undefined,
    companies_of_focus: focus,
    focus_tags: focus[0]
      ? {
          primarySectors: parseArray<{ id: number; name: string }>(focus[0].primary_sectors)
            .map((sector) => sector.name)
            .filter(Boolean),
          transactionStatus: focus[0].transaction_status?.trim() || null,
        }
      : undefined,
    follow_up_to: item.follow_up_to ?? null,
    label: item.label ?? null,
    related_ia: item.ia_id
      ? {
          id: item.ia_id,
          headline: item.ia_headline || undefined,
          contentType: item.ia_content_type || undefined,
        }
      : null,
    series_others: item.in_series && !item.is_content_series ? others : [],
    is_content_series: !!item.is_content_series,
    series: item.series && item.series.parts?.length ? item.series : null,
  } as unknown as NewsArticle;
}

async function getJson<T>(path: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${NEWS_API}/${path}${params ? `?${params}` : ""}`, {
    headers: authHeaders(),
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Authentication required" : `News request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Top Stories (the backend applies Rule A / Rule B to pick them); shown newest first. */
export async function fetchTopStories(signal?: AbortSignal): Promise<NewsArticle[]> {
  const rows = await getJson<Array<ApiNewsItem & { slot: number }>>("top_stories", undefined, signal);
  return [...rows]
    .sort((a, b) => new Date(b.Publication_Date).getTime() - new Date(a.Publication_Date).getTime())
    .map(fromApiItem);
}

export type NewsFeedPage = { items: NewsArticle[]; total: number | null };

/**
 * Recent News. With a filter/search active the same endpoint serves the
 * results (Top Stories is hidden, so no exclude_ids).
 */
export async function fetchNewsFeed(opts: {
  page: number;
  perPage?: number;
  excludeIds?: number[];
  filters?: NewsFilters;
  signal?: AbortSignal;
}): Promise<NewsFeedPage> {
  const perPage = opts.perPage ?? NEWS_PAGE_SIZE;
  const params = new URLSearchParams({ page: String(opts.page), per_page: String(perPage) });
  const f = opts.filters;
  if (f?.text) params.append("q", f.text);
  if (f?.company) params.append("company_id", String(f.company.id));
  if (f?.investor) params.append("investor_id", String(f.investor.id));
  if (f?.sector) params.append("sector_id", String(f.sector.id));
  if (f?.subType) params.append("sub_type", f.subType);
  if (f?.transactionStatus) params.append("transaction_status", f.transactionStatus);
  for (const iso2 of f?.countries ?? []) params.append("countries[]", iso2);
  if (f?.dateFrom) params.append("date_from", f.dateFrom);
  if (f?.dateTo) params.append("date_to", f.dateTo);
  // Omit entirely when empty — the API rejects exclude_ids=null.
  for (const id of opts.excludeIds ?? []) params.append("exclude_ids[]", String(id));
  const rows = await getJson<Array<ApiNewsItem & { total_count?: number }>>("feed", params, opts.signal);
  return { items: rows.map(fromApiItem), total: rows[0]?.total_count ?? null };
}

// ── Date range presets (computed on the front, sent as date_from/date_to) ──

export type NewsDatePreset = "7d" | "30d" | "3m" | "ytd";

export const NEWS_DATE_PRESETS: Array<{ value: NewsDatePreset; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "ytd", label: "This year" },
];

/** YYYY-MM-DD in local time (date-only, no timezone surprises for a date_from/date_to pair). */
function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function newsDatePresetRange(preset: NewsDatePreset, now: Date = new Date()): { dateFrom: string; dateTo: string } {
  const to = toDateOnly(now);
  const from = new Date(now);
  if (preset === "7d") from.setDate(from.getDate() - 7);
  else if (preset === "30d") from.setDate(from.getDate() - 30);
  else if (preset === "3m") from.setMonth(from.getMonth() - 3);
  else if (preset === "ytd") {
    from.setMonth(0);
    from.setDate(1);
  }
  return { dateFrom: toDateOnly(from), dateTo: to };
}

// ── Filter options ───────────────────────────────────────────────────────

export type NewsFilterOption = { value: string; count: number };
export type NewsCountryOption = { iso2: string; name: string; count: number };
export type NewsFilterOptions = {
  subTypes: NewsFilterOption[];
  transactionStatuses: NewsFilterOption[];
  /** HQ countries with published News, for the Geography filter. Sorted by name. */
  countries: NewsCountryOption[];
};

/**
 * Values that have published News, from GET /news/filters. `transaction_statuses`
 * is optional: the dropdown only appears once the API returns it.
 */
export async function fetchNewsFilterOptions(signal?: AbortSignal): Promise<NewsFilterOptions> {
  const json = await getJson<{ sub_types?: unknown; transaction_statuses?: unknown; countries?: unknown }>(
    "filters",
    undefined,
    signal
  );
  const clean = (v: unknown) => parseArray<NewsFilterOption>(v).filter((o) => o && o.value);
  // Keep iso2 as returned (e.g. "GB") — it's sent back as-is in `countries[]`;
  // CountryFlagImg/getCountryFlagUrl lowercase it themselves for the flagcdn URL.
  const countries = parseArray<NewsCountryOption>(json?.countries).filter((c) => c && c.iso2 && c.name);
  return { subTypes: clean(json?.sub_types), transactionStatuses: clean(json?.transaction_statuses), countries };
}

// ── I&A content type (for the "Read our …" link) ──────────────────────────
// The feed doesn't return the I&A piece's type yet (ia_content_type). Until it
// does, look it up once per piece and cache it.

const CONTENT_BY_ID_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content";
const iaTypeCache = new Map<number, Promise<string>>();

export function fetchIaContentType(id: number): Promise<string> {
  let hit = iaTypeCache.get(id);
  if (!hit) {
    hit = fetch(`${CONTENT_BY_ID_URL}/${id}`, { headers: authHeaders(), cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const row = Array.isArray(json) ? json[0] : json;
        return String(row?.Content_Type ?? row?.content_type ?? "").trim();
      })
      .catch(() => "");
    iaTypeCache.set(id, hit);
  }
  return hit;
}

// ── Search suggestions ───────────────────────────────────────────────────

export type SuggestionEntity = { id: number; name: string; article_count?: number };
export type SuggestionArticle = {
  id: number;
  Headline: string;
  Publication_Date?: string;
  News_Sub_Type?: string | null;
};
export type NewsSuggestions = {
  companies: SuggestionEntity[];
  investors: SuggestionEntity[];
  sectors: SuggestionEntity[];
  articles: SuggestionArticle[];
};

export async function fetchSearchSuggestions(q: string, signal?: AbortSignal): Promise<NewsSuggestions> {
  const params = new URLSearchParams({ q: q.trim(), per_group: "5" });
  const json = await getJson<Record<string, unknown>>("search_suggestions", params, signal);
  return {
    companies: parseArray<SuggestionEntity>(json?.companies),
    investors: parseArray<SuggestionEntity>(json?.investors),
    sectors: parseArray<SuggestionEntity>(json?.sectors),
    articles: parseArray<SuggestionArticle>(json?.articles),
  };
}

/** Articles whose company of focus is one of the followed companies. */
export function keepFollowedCompanyNews(items: NewsArticle[], followedCompanyIds: Iterable<number>): NewsArticle[] {
  const followed = new Set(followedCompanyIds);
  if (followed.size === 0) return [];
  return items.filter((a) => a.companies_of_focus?.some((c) => followed.has(c.id)));
}

// ── Follow news (v1: all news) ───────────────────────────────────────────
// Goes through /api/news-follow, which holds the alerts-service key and takes
// the user's identity from their login token.

function followHeaders(): Record<string, string> {
  const token = localStorage.getItem("asymmetrix_auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-asym-token": token } : {}),
  };
}

export async function fetchNewsFollowing(): Promise<boolean> {
  const res = await fetch("/api/news-follow", { headers: followHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`Follow status failed (${res.status})`);
  return Boolean(((await res.json()) as { is_following?: boolean }).is_following);
}

export async function setNewsFollowing(next: boolean): Promise<boolean> {
  const res = await fetch("/api/news-follow", {
    method: "POST",
    headers: followHeaders(),
    body: JSON.stringify({ action: next ? "follow" : "unfollow" }),
  });
  if (!res.ok) throw new Error(`Follow update failed (${res.status})`);
  return Boolean(((await res.json()) as { is_following?: boolean }).is_following);
}
