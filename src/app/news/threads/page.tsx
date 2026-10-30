"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import "@/components/news/news.css";
import {
  THREAD_TYPES,
  THREAD_TYPE_LABEL,
  THREADS_PER_PAGE,
  fetchThreads,
  type ThreadSummary,
  type ThreadType,
} from "@/lib/newsThreads";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function NewsThreadsPage() {
  const [type, setType] = useState<ThreadType>("company");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ThreadSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPage(1);
    fetchThreads({ type, q: query, page: 1, signal: controller.signal })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "Could not load threads");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [type, query]);

  const loadMore = useCallback(async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchThreads({ type, q: query, page: next });
      setItems((cur) => [...cur, ...res.items]);
      setTotal(res.total);
      setPage(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load threads");
    } finally {
      setLoadingMore(false);
    }
  }, [page, type, query]);

  return (
    <AppShell>
      <div className="min-h-screen" style={{ width: "100%", background: "#F5F7FD" }}>
        <div className="nw-shell">
          <div className="nw-head">
            <div>
              <p className="nw-eyebrow">Reporting</p>
              <h1 className="nw-title">Threads</h1>
            </div>
            <div className="nw-actions">
              <Link href="/news" className="nw-btn nw-btn-outline">
                ← Back to News
              </Link>
            </div>
          </div>

          <div className="nw-controls">
            <div className="nw-controls-search">
              <div className="nw-search-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${THREAD_TYPE_LABEL[type].toLowerCase()} threads…`}
                  aria-label="Search threads"
                />
              </div>
            </div>
            <div className="nw-pills" role="tablist" aria-label="Thread type">
              {THREAD_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={type === t}
                  className={`nw-pill ${type === t ? "nw-pill-active" : ""}`}
                  onClick={() => setType(t)}
                >
                  {THREAD_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="nw-error" role="alert">{error}</div>}

          {loading ? (
            <div className="nw-feed" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="nw-skel" key={i} style={{ minHeight: 120 }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            !error && <div className="nw-state">No threads found.</div>
          ) : (
            <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="nw-section-row">
                <h2 className="nw-section-title">
                  {total.toLocaleString()} {total === 1 ? "thread" : "threads"}
                </h2>
              </div>
              <div className="nw-feed">
                {items.map((thread) => (
                  <Link
                    key={thread.key}
                    href={`/news/threads/${type}/${encodeURIComponent(thread.key)}`}
                    className="nw-card nw-thread-card"
                  >
                    <span className="nw-thread-name">{thread.name}</span>
                    <span className="nw-thread-meta">
                      <span className="nw-thread-count">
                        {thread.article_count} {thread.article_count === 1 ? "article" : "articles"}
                      </span>
                      {thread.latest_date ? <span>Latest {formatDate(thread.latest_date)}</span> : null}
                    </span>
                    {thread.latest_headline ? (
                      <span className="nw-thread-headline">{thread.latest_headline}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
              {items.length < total && items.length >= THREADS_PER_PAGE && (
                <div className="nw-more">
                  <button type="button" className="nw-btn nw-btn-outline" disabled={loadingMore} onClick={loadMore}>
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
        <Footer />
      </div>
    </AppShell>
  );
}
