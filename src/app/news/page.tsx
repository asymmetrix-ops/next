"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import NewsCard from "@/components/news/NewsCard";
import NewsSearchBar from "@/components/news/NewsSearchBar";
import DealTipButton from "@/components/news/DealTipButton";
import FollowNewsButton from "@/components/news/FollowNewsButton";
import "@/components/news/news.css";
import {
  buildSeriesIndex,
  fetchNewsArticleById,
  fetchNewsPage,
  resolveTopStories,
  sortNewest,
  type NewsArticle,
  type NewsFilter,
} from "@/lib/news";

const FILTER_KIND_LABEL: Record<NewsFilter["kind"], string> = {
  company: "Company",
  investor: "Investor",
  sector: "Sector",
  text: "Search",
};

function mergeById(prev: NewsArticle[], next: NewsArticle[]): NewsArticle[] {
  const seen = new Set(prev.map((a) => a.id));
  return [...prev, ...next.filter((a) => !seen.has(a.id))];
}

export default function NewsPage() {
  const [filter, setFilter] = useState<NewsFilter | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predecessor, setPredecessor] = useState<NewsArticle | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (nextFilter: NewsFilter | null, nextPage: number) => {
    const req = ++requestRef.current;
    const first = nextPage === 1;
    if (first) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchNewsPage({ page: nextPage, filter: nextFilter });
      if (req !== requestRef.current) return;
      setArticles((prev) => sortNewest(first ? res.items : mergeById(prev, res.items)));
      setPage(nextPage);
      setTotal(res.total);
      setHasMore(res.nextPage != null);
    } catch (e) {
      if (req !== requestRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load news");
    } finally {
      if (req === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    setArticles([]);
    setPredecessor(null);
    void load(filter, 1);
  }, [filter, load]);

  const filtered = filter != null;
  const top = useMemo(
    () => (filtered ? null : resolveTopStories(articles, predecessor)),
    [filtered, articles, predecessor]
  );

  // Rule A: the predecessor may be older than anything loaded — fetch it.
  const missingId = top?.missingPredecessorId ?? null;
  useEffect(() => {
    if (missingId == null) return;
    let cancelled = false;
    fetchNewsArticleById(missingId).then((a) => {
      if (!cancelled && a) setPredecessor(a);
    });
    return () => {
      cancelled = true;
    };
  }, [missingId]);

  const seriesIndex = useMemo(
    () => buildSeriesIndex(predecessor ? [...articles, predecessor] : articles),
    [articles, predecessor]
  );

  const feed = useMemo(() => {
    if (filtered) return articles;
    const shown = new Set([top?.primary.id, top?.secondary?.id]);
    return articles.filter((a) => !shown.has(a.id));
  }, [filtered, articles, top]);

  const rel = top?.rule === "A";

  return (
    <AppShell>
      <div className="min-h-screen" style={{ width: "100%", background: "#F5F7FD" }}>
        <div className="nw-shell">
          <div className="nw-head">
            <div>
              <p className="nw-eyebrow">Latest</p>
              <h1 className="nw-title">News</h1>
              <p className="nw-sub">The latest Data &amp; Analytics deal news, and how each story develops.</p>
            </div>
            <div className="nw-actions">
              <FollowNewsButton />
              <DealTipButton />
            </div>
          </div>

          <NewsSearchBar onApplyFilter={setFilter} />

          {filter && (
            <div className="nw-chips">
              <span className="nw-chip">
                <span className="nw-chip-kind">{FILTER_KIND_LABEL[filter.kind]}</span>
                {filter.label}
                <button type="button" aria-label={`Remove filter ${filter.label}`} onClick={() => setFilter(null)}>
                  ×
                </button>
              </span>
              {!loading && <span className="nw-count">{total.toLocaleString()} {total === 1 ? "article" : "articles"}</span>}
            </div>
          )}

          {error && <div className="nw-error" role="alert">{error}</div>}

          {loading ? (
            <div className={filtered ? "nw-feed" : "nw-top"} aria-busy="true">
              {Array.from({ length: filtered ? 6 : 2 }).map((_, i) => (
                <div className="nw-skel" key={i} style={{ minHeight: filtered ? 180 : 260 }} />
              ))}
            </div>
          ) : (
            <>
              {top && (
                <section aria-labelledby="nw-top-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 className="nw-section-title" id="nw-top-h">Top stories</h2>
                  <div className="nw-top">
                    <NewsCard article={top.primary} variant="top" relation={rel ? "follow-up" : undefined} seriesLinks={seriesIndex.get(top.primary.id)} />
                    {top.secondary ? (
                      <NewsCard article={top.secondary} variant="top" relation={rel ? "previously" : undefined} seriesLinks={seriesIndex.get(top.secondary.id)} />
                    ) : (
                      <div className="nw-card nw-card-empty">
                        {missingId != null ? "Loading the earlier story…" : "No other stories yet."}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {(feed.length > 0 || filtered) && (
                <section aria-labelledby="nw-feed-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="nw-section-row">
                    <h2 className="nw-section-title" id="nw-feed-h">{filtered ? "Results" : "Recent news"}</h2>
                  </div>
                  {feed.length === 0 ? (
                    <div className="nw-state">No news found for this filter.</div>
                  ) : (
                    <div className="nw-feed">
                      {feed.map((a) => (
                        <NewsCard key={a.id} article={a} seriesLinks={seriesIndex.get(a.id)} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {!filtered && !top && !error && <div className="nw-state">No news published yet.</div>}

              {hasMore && (
                <div className="nw-more">
                  <button type="button" className="nw-btn nw-btn-outline" disabled={loadingMore} onClick={() => load(filter, page + 1)}>
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <Footer />
      </div>
    </AppShell>
  );
}
