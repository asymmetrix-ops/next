import type { NewsArticle } from "@/lib/news";

const THREADS_API = "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu:develop/news/threads";

export const THREAD_TYPES = ["company", "sector", "geography", "investor"] as const;
export type ThreadType = (typeof THREAD_TYPES)[number];

export const THREAD_TYPE_LABEL: Record<ThreadType, string> = {
  company: "Company",
  sector: "Sector",
  geography: "Geography",
  investor: "Investor",
};

export const THREADS_PER_PAGE = 20;

export function isThreadType(value: string): value is ThreadType {
  return (THREAD_TYPES as readonly string[]).includes(value);
}

export type ThreadSummary = {
  /** id for company / sector / investor, upper-case ISO2 for geography. */
  key: string;
  name: string;
  article_count: number;
  latest_id: number | null;
  latest_headline: string;
  latest_date: string;
};

export type ThreadInfo = { type: ThreadType; key: string; name: string };

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("asymmetrix_auth_token") : null;
  return {
    "Content-Type": "application/json",
    "X-Data-Source": "live",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store", signal });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Authentication required" : `Threads request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Threads of one type, newest activity first. The backend applies the minimum article count. */
export async function fetchThreads(opts: {
  type: ThreadType;
  q?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<{ items: ThreadSummary[]; total: number }> {
  const params = new URLSearchParams({
    thread_type: opts.type,
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? THREADS_PER_PAGE),
  });
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  const json = await getJson<{ items?: ThreadSummary[]; total?: number }>(`${THREADS_API}?${params}`, opts.signal);
  const items = (json.items ?? []).map((item) => ({ ...item, key: String(item.key) }));
  return { items, total: json.total ?? items.length };
}

/** One thread's articles, newest first. `thread` is null for an unknown key or an empty thread. */
export async function fetchThread(
  type: ThreadType,
  key: string,
  signal?: AbortSignal
): Promise<{ thread: ThreadInfo | null; items: NewsArticle[]; total: number }> {
  const json = await getJson<{
    thread?: ThreadInfo | null;
    items?: Array<{ id: number; Headline: string; Strapline?: string; Publication_Date: string; News_Sub_Type?: string | null }>;
    total?: number;
  }>(`${THREADS_API}/${type}/${encodeURIComponent(key)}`, signal);
  const items = (json.items ?? []).map(
    (row) =>
      ({
        id: row.id,
        Headline: row.Headline,
        Strapline: row.Strapline || "",
        Publication_Date: row.Publication_Date,
        Content_Type: "News",
        News_Sub_Type: row.News_Sub_Type || undefined,
        follow_up_to: null,
        series_others: [],
      }) as unknown as NewsArticle
  );
  return { thread: json.thread ?? null, items, total: json.total ?? items.length };
}

/** Platform profile of the thread's subject; geography has none. */
export function threadProfileHref(type: ThreadType, key: string): string | null {
  if (type === "company") return `/company/${key}`;
  if (type === "sector") return `/sector/${key}`;
  if (type === "investor") return `/investors/${key}`;
  return null;
}
