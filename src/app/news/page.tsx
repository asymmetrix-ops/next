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
  fetchNewsFeed,
  fetchNewsPage,
  fetchTopStories,
  NEWS_PAGE_SIZE,
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
  const [topStories, setTopStories] = useState<NewsArticle[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const topIdsRef = useRef<number[]>([]);

  const load = useCallback(async (nextFilter: NewsFilter | null, nextPage: number) => {
    const req = ++requestRef.current;
    const first = nextPage === 1;
    if (first) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      if (nextFilter) {
        const res = await fetchNewsPage({ page: nextPage, filter: nextFilter });
        if (req !== requestRef.current) return;
        setArticles((prev) => sortNewest(first ? res.items : mergeById(prev, res.items)));
        setTotal(res.total);
        setHasMore(res.nextPage != null);
      } else {
        // Top Stories first: their ids are excluded from the feed.
        if (first) {
          const top = await fetchTopStories();
          if (req !== requestRef.current) return;
          topIdsRef.current = top.map((a) => a.id);
          setTopStories(top);
        }
        const res = await fetchNewsFeed({ page: nextPage, excludeIds: topIdsRef.current });
        if (req !== requestRef.current) return;
        setArticles((prev) => (first ? res.items : mergeById(prev, res.items)));
        const feedTotal = res.total ?? 0;
        setHasMore(res.items.length > 0 && nextPage * NEWS_PAGE_SIZE < feedTotal);
      }
      setPage(nextPage);
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
    setTopStories([]);
    setHasMore(false);
    void load(filter, 1);
  }, [filter, load]);

  const filtered = filter != null;
  const top = !filtered && topStories.length > 0 ? topStories : null;
  
  // Filtered results come from the generic list endpoint, which has no series data.
  const seriesIndex = useMemo(() => (filtered ? buildSeriesIndex(articles) : null), [filtered, articles]);
  const seriesFor = (a: NewsArticle) => (a.series_others?.length ? a.series_others : seriesIndex?.get(a.id));

  const feed = articles;

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
                    {top.map((a) => (
                      <NewsCard
                        key={a.id}
                        article={a}
                        variant="top"
                        relation={a.label === "Follow-up" ? "follow-up" : a.label === "Previously" ? "previously" : undefined}
                        seriesLinks={seriesFor(a)}
                      />
                    ))}
                    {top.length < 2 && <div className="nw-card nw-card-empty">No other stories yet.</div>}
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
                        <NewsCard key={a.id} article={a} seriesLinks={seriesFor(a)} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {!filtered && !top && feed.length === 0 && !error && <div className="nw-state">No news published yet.</div>}

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
