import type { ContentArticle } from "@/types/insightsAnalysis";
import { normalizeContentArticles } from "@/lib/contentArticleDisplay";

const CONTENT_ARTICLES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles";
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

export type NewsFilter =
  | { kind: "company"; id: number; label: string }
  | { kind: "investor"; id: number; label: string }
  | { kind: "sector"; id: number; label: string }
  | { kind: "text"; label: string };

export type NewsPage = {
  items: NewsArticle[];
  total: number;
  nextPage: number | null;
};

const timeOf = (a: { Publication_Date?: string }) =>
  new Date(a.Publication_Date || 0).getTime();

export const sortNewest = <T extends { Publication_Date?: string }>(items: T[]) =>
  [...items].sort((a, b) => timeOf(b) - timeOf(a));

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

export async function fetchNewsPage(opts: {
  page: number;
  perPage?: number;
  filter?: NewsFilter | null;
  signal?: AbortSignal;
}): Promise<NewsPage> {
  const perPage = opts.perPage ?? NEWS_PAGE_SIZE;
  const params = new URLSearchParams({
    Offset: String(opts.page),
    Per_page: String(perPage),
    content_type: "News",
    portfolio_only: "false",
    show_followed: "false",
  });
  const f = opts.filter;
  if (f?.kind === "company") params.append("company_id", String(f.id));
  if (f?.kind === "sector") params.append("primary_sectors_ids", String(f.id));
  // Backend gap: investor filtering is not exposed by this endpoint yet.
  if (f?.kind === "investor") params.append("investor_id", String(f.id));
  if (f?.kind === "text") params.append("search_query", f.label);

  const res = await fetch(`${CONTENT_ARTICLES_URL}?${params}`, {
    headers: authHeaders(),
    cache: "no-store",
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401 ? "Authentication required" : `News request failed (${res.status})`
    );
  }
  const json = (await res.json()) as {
    items?: ContentArticle[];
    itemsTotal?: number;
    totalItems?: number;
    nextPage?: number | null;
  };
  const items = normalizeContentArticles(json.items || []) as NewsArticle[];
  return {
    items,
    total: json.itemsTotal ?? json.totalItems ?? items.length,
    nextPage: json.nextPage ?? null,
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
  return {
    id: item.id,
    Headline: item.Headline,
    Strapline: item.Strapline || "",
    Publication_Date: item.Publication_Date,
    Content_Type: "News",
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

export async function fetchNewsFeed(opts: {
  page: number;
  perPage?: number;
  excludeIds?: number[];
  signal?: AbortSignal;
}): Promise<NewsFeedPage> {
  const perPage = opts.perPage ?? NEWS_PAGE_SIZE;
  const params = new URLSearchParams({ page: String(opts.page), per_page: String(perPage) });
  // Omit entirely when empty — the API rejects exclude_ids=null.
  for (const id of opts.excludeIds ?? []) params.append("exclude_ids[]", String(id));
  const rows = await getJson<Array<ApiNewsItem & { total_count?: number }>>("feed", params, opts.signal);
  return { items: rows.map(fromApiItem), total: rows[0]?.total_count ?? null };
}

// ── Series ───────────────────────────────────────────────────────────────

/** Id of the article this one directly follows up on, if any. */
export function getPredecessorId(article: NewsArticle): number | null {
  const link = article.follow_up_to;
  if (typeof link === "number" && link > 0) return link;
  if (link && typeof link === "object" && link.id > 0) return link.id;

  // Fallback: legacy multi-part series info on the content row.
  const parts = article.series?.parts;
  if (parts?.length) {
    const sorted = [...parts].sort((a, b) => a.part_number - b.part_number);
    const idx = sorted.findIndex((p) => p.id === article.id);
    if (idx > 0) return sorted[idx - 1].id;
  }
  return null;
}

function toRef(a: NewsArticle): NewsRef {
  return { id: a.id, headline: a.Headline, publication_date: a.Publication_Date };
}

/**
 * For every article that belongs to a series, the *other* articles in that
 * series (oldest first). Built from follow-up links between loaded items,
 * plus any ref objects carried on `follow_up_to`.
 */
export function buildSeriesIndex(items: NewsArticle[]): Map<number, NewsRef[]> {
  const byId = new Map(items.map((a) => [a.id, a]));
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const refs = new Map<number, NewsRef>();
  for (const a of items) {
    refs.set(a.id, toRef(a));
    if (!parent.has(a.id)) parent.set(a.id, a.id);
    const pid = getPredecessorId(a);
    if (pid == null) continue;
    if (!parent.has(pid)) parent.set(pid, pid);
    union(a.id, pid);
    if (!byId.has(pid)) {
      const link = a.follow_up_to;
      if (link && typeof link === "object") refs.set(pid, link);
      else {
        const part = a.series?.parts.find((p) => p.id === pid);
        if (part) {
          refs.set(pid, { id: pid, headline: part.headline, publication_date: part.publication_date });
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (const id of Array.from(parent.keys())) {
    const root = find(id);
    groups.set(root, [...(groups.get(root) || []), id]);
  }

  const out = new Map<number, NewsRef[]>();
  groups.forEach((ids) => {
    if (ids.length < 2) return;
    const members = ids
      .map((id) => refs.get(id))
      .filter((r): r is NewsRef => Boolean(r))
      .sort(
        (a, b) =>
          new Date(a.publication_date || 0).getTime() -
          new Date(b.publication_date || 0).getTime()
      );
    for (const m of members) out.set(m.id, members.filter((o) => o.id !== m.id));
  });
  return out;
}

// ── Follow news (v1: all news). Local stub until the backend ships. ──────

const FOLLOW_KEY = "asymmetrix_follow_news";

export function getNewsFollowing(): boolean {
  try {
    return localStorage.getItem(FOLLOW_KEY) === "1";
  } catch {
    return false;
  }
}

export async function setNewsFollowing(next: boolean): Promise<void> {
  // TODO(backend): create/delete the user's follow-news subscription.
  localStorage.setItem(FOLLOW_KEY, next ? "1" : "0");
}
