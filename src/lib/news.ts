import type { ContentArticle } from "@/types/insightsAnalysis";
import { normalizeContentArticles } from "@/lib/contentArticleDisplay";

const CONTENT_ARTICLES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles";
const CONTENT_BY_ID_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content";

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

export async function fetchNewsArticleById(id: number): Promise<NewsArticle | null> {
  try {
    const res = await fetch(`${CONTENT_BY_ID_URL}/${id}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as NewsArticle;
  } catch {
    return null;
  }
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

export type TopStories = {
  rule: "A" | "B";
  primary: NewsArticle;
  secondary: NewsArticle | null;
  /** Rule A where the predecessor isn't in the loaded set and must be fetched. */
  missingPredecessorId: number | null;
};

/** Top Story 1 = newest. Top Story 2 = direct predecessor (Rule A) or 2nd newest (Rule B). */
export function resolveTopStories(
  newestFirst: NewsArticle[],
  fetchedPredecessor?: NewsArticle | null
): TopStories | null {
  const primary = newestFirst[0];
  if (!primary) return null;
  const predId = getPredecessorId(primary);
  if (predId != null) {
    const found =
      newestFirst.find((a) => a.id === predId) ??
      (fetchedPredecessor?.id === predId ? fetchedPredecessor : null);
    return { rule: "A", primary, secondary: found ?? null, missingPredecessorId: found ? null : predId };
  }
  return { rule: "B", primary, secondary: newestFirst[1] ?? null, missingPredecessorId: null };
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
