import type { ContentArticle } from "@/types/insightsAnalysis";

const NEWS_API = "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/news";

export const NEWS_PAGE_SIZE = 18;

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
  related_ia?: { id: number; headline?: string } | null;
  /** From /news/top_stories: "Follow-up" | "Previously" | null. */
  label?: "Follow-up" | "Previously" | null;
  /** From /news/feed: other published articles in this article's series. */
  series_others?: NewsRef[];
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
};

export function addNewsFilter(filters: NewsFilters, f: NewsFilter): NewsFilters {
  return f.kind === "text"
    ? { ...filters, text: f.label }
    : { ...filters, [f.kind]: { id: f.id, label: f.label } };
}

export function hasNewsFilters(f: NewsFilters): boolean {
  return Boolean(f.company || f.investor || f.sector || f.text);
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
  series_others?: unknown;
  ia_id?: number | null;
  ia_headline?: string | null;
  News_Sub_Type?: string | null;
  focus_companies?: unknown;
};

type FocusCompany = {
  id: number;
  name: string;
  logo?: string | null;
  hq_country?: string | null;
  hq_iso2?: string | null;
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
    follow_up_to: item.follow_up_to ?? null,
    label: item.label ?? null,
    related_ia: item.ia_id ? { id: item.ia_id, headline: item.ia_headline || undefined } : null,
    series_others: item.in_series ? others : [],
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

/** Two Top Stories; the backend applies Rule A / Rule B. */
export async function fetchTopStories(signal?: AbortSignal): Promise<NewsArticle[]> {
  const rows = await getJson<Array<ApiNewsItem & { slot: number }>>("top_stories", undefined, signal);
  return [...rows].sort((a, b) => a.slot - b.slot).map(fromApiItem);
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
  // Omit entirely when empty — the API rejects exclude_ids=null.
  for (const id of opts.excludeIds ?? []) params.append("exclude_ids[]", String(id));
  const rows = await getJson<Array<ApiNewsItem & { total_count?: number }>>("feed", params, opts.signal);
  return { items: rows.map(fromApiItem), total: rows[0]?.total_count ?? null };
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
