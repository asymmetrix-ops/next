"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import NewsCard from "@/components/news/NewsCard";
import NewsSearchBar from "@/components/news/NewsSearchBar";
import DealTipButton from "@/components/news/DealTipButton";
import FollowNewsButton from "@/components/news/FollowNewsButton";
import "@/components/news/news.css";
import {
  addNewsFilter,
  fetchNewsFeed,
  hasNewsFilters,
  fetchTopStories,
  NEWS_PAGE_SIZE,
  type NewsArticle,
  type NewsFilter,
  type NewsFilters,
} from "@/lib/news";

const CHIP_ORDER = ["company", "investor", "sector", "text"] as const;
const CHIP_LABEL = { company: "Company", investor: "Investor", sector: "Sector", text: "Search" } as const;

function chipsOf(f: NewsFilters) {
  return CHIP_ORDER.flatMap((kind) => {
    const v = f[kind];
    if (!v) return [];
    return [{ kind, label: typeof v === "string" ? v : v.label }];
  });
}

function mergeById(prev: NewsArticle[], next: NewsArticle[]): NewsArticle[] {
  const seen = new Set(prev.map((a) => a.id));
  return [...prev, ...next.filter((a) => !seen.has(a.id))];
}

export default function NewsPage() {
  const [filters, setFilters] = useState<NewsFilters>({});
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

  const load = useCallback(async (nextFilters: NewsFilters, nextPage: number) => {
    const req = ++requestRef.current;
    const first = nextPage === 1;
    if (first) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      // Top Stories first (unfiltered only): their ids are excluded from the feed.
      if (first && !hasNewsFilters(nextFilters)) {
        const top = await fetchTopStories();
        if (req !== requestRef.current) return;
        topIdsRef.current = top.map((a) => a.id);
        setTopStories(top);
      }
      const res = await fetchNewsFeed({
        page: nextPage,
        filters: nextFilters,
        excludeIds: hasNewsFilters(nextFilters) ? [] : topIdsRef.current,
      });
      if (req !== requestRef.current) return;
      setArticles((prev) => (first ? res.items : mergeById(prev, res.items)));
      const feedTotal = res.total ?? 0;
      setTotal(feedTotal);
      setHasMore(res.items.length > 0 && nextPage * NEWS_PAGE_SIZE < feedTotal);
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
    void load(filters, 1);
  }, [filters, load]);

  const filtered = hasNewsFilters(filters);
  const top = !filtered && topStories.length > 0 ? topStories : null;
  
  const seriesFor = (a: NewsArticle) => a.series_others;

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

          <NewsSearchBar onApplyFilter={(f: NewsFilter) => setFilters((cur) => addNewsFilter(cur, f))} />

          {filtered && (
            <div className="nw-chips">
              {chipsOf(filters).map((chip) => (
                <span className="nw-chip" key={chip.kind}>
                  <span className="nw-chip-kind">{CHIP_LABEL[chip.kind]}</span>
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Remove filter ${chip.label}`}
                    onClick={() => setFilters((cur) => ({ ...cur, [chip.kind]: undefined }))}
                  >
                    ×
                  </button>
                </span>
              ))}
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
                  <button type="button" className="nw-btn nw-btn-outline" disabled={loadingMore} onClick={() => load(filters, page + 1)}>
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
