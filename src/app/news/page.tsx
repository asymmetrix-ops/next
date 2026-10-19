"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import NewsCard from "@/components/news/NewsCard";
import NewsSearchBar from "@/components/news/NewsSearchBar";
import NewsFilterBar from "@/components/news/NewsFilterBar";
import NewsCarousel from "@/components/news/NewsCarousel";
import DealTipButton from "@/components/news/DealTipButton";
import FollowNewsButton from "@/components/news/FollowNewsButton";
import "@/components/news/news.css";
import Link from "next/link";
import { usePortfolioStore } from "@/store/portfolioStore";
import {
  addNewsFilter,
  fetchNewsFeed,
  hasNewsFilters,
  keepFollowedCompanyNews,
  fetchTopStories,
  NEWS_PAGE_SIZE,
  type NewsArticle,
  type NewsFilter,
  type NewsFilters,
} from "@/lib/news";

const CHIP_ORDER = ["company", "investor", "sector", "subType", "transactionStatus", "followedOnly", "text"] as const;
const CHIP_LABEL = {
  company: "Company",
  investor: "Investor",
  sector: "Sector",
  subType: "Type",
  transactionStatus: "Status",
  followedOnly: "Followed",
  text: "Search",
} as const;

function chipsOf(f: NewsFilters) {
  return CHIP_ORDER.flatMap((kind) => {
    const v = f[kind];
    if (!v) return [];
    return [{ kind, label: v === true ? "Followed only" : typeof v === "string" ? v : v.label }];
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
  const [allTotal, setAllTotal] = useState<number | null>(null);
  const requestRef = useRef(0);
  const topIdsRef = useRef<number[]>([]);
  const followedCount = usePortfolioStore((st) => st.data?.followed_companies?.length ?? 0);

  // Number of published News, for the "All types" pill and the title.
  useEffect(() => {
    fetchNewsFeed({ page: 1, perPage: 1 })
      .then((res) => setAllTotal(res.total))
      .catch(() => undefined);
  }, []);

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
      if (nextFilters.followedOnly) {
        // The feed can't filter by followed companies yet: page through the
        // results (other filters still apply server-side) and keep the articles
        // whose company of focus the user follows.
        let portfolio = usePortfolioStore.getState();
        if (!portfolio.lastFetched) {
          await portfolio.fetchPortfolio();
          portfolio = usePortfolioStore.getState();
        }
        if (req !== requestRef.current) return;
        const followed = new Set(portfolio.data?.followed_companies ?? []);
        const { followedOnly: _ignored, ...serverFilters } = nextFilters;
        void _ignored;
        const kept: NewsArticle[] = [];
        if (followed.size > 0) {
          for (let p = 1; p <= 20; p += 1) {
            const chunk = await fetchNewsFeed({ page: p, perPage: 50, filters: serverFilters });
            if (req !== requestRef.current) return;
            kept.push(...keepFollowedCompanyNews(chunk.items, followed));
            if (chunk.items.length === 0 || p * 50 >= (chunk.total ?? 0)) break;
          }
        }
        setArticles(kept);
        setTotal(kept.length);
        setHasMore(false);
        setPage(1);
        return;
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

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) void load(filters, page + 1);
  }, [hasMore, loadingMore, loading, load, filters, page]);

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
              <p className="nw-eyebrow">Reporting</p>
              <h1 className="nw-title">
                News
                {allTotal != null && (
                  <span className="nw-title-count">
                    {allTotal.toLocaleString()} {allTotal === 1 ? "article" : "articles"}
                  </span>
                )}
              </h1>
            </div>
            <div className="nw-actions">
              <button type="button" className="nw-btn nw-btn-outline" onClick={() => setFilters({})}>
                Reset filters
              </button>
              <FollowNewsButton />
              <DealTipButton />
            </div>
          </div>

          <div className="nw-controls">
            <div className="nw-controls-search">
              <NewsSearchBar onApplyFilter={(f: NewsFilter) => setFilters((cur) => addNewsFilter(cur, f))} />
            </div>
            <NewsFilterBar
              filters={filters}
              totalAll={allTotal}
              onChange={(patch) => setFilters((cur) => ({ ...cur, ...patch }))}
            />
          </div>

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

              {!filtered && feed.length > 0 && (
                <NewsCarousel title="Recent news" onNearEnd={loadMore} loadingMore={loadingMore}>
                  {feed.map((a) => (
                    <NewsCard key={a.id} article={a} seriesLinks={seriesFor(a)} />
                  ))}
                </NewsCarousel>
              )}

              {filtered && (
                <section aria-labelledby="nw-feed-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="nw-section-row">
                    <h2 className="nw-section-title" id="nw-feed-h">Results</h2>
                  </div>
                  {feed.length === 0 ? (
                    <div className="nw-state">
                      {filters.followedOnly && followedCount === 0 ? (
                        <>
                          You&apos;re not following any companies yet. Add companies to{" "}
                          <Link href="/my-portfolio" style={{ color: "#2a46ea", fontWeight: 600, textDecoration: "underline" }}>
                            My Portfolio
                          </Link>{" "}
                          to see their news here.
                        </>
                      ) : filters.followedOnly ? (
                        "No news about the companies you follow matches these filters."
                      ) : (
                        "No news found for this filter."
                      )}
                    </div>
                  ) : (
                    <div className="nw-feed">
                      {feed.map((a) => (
                        <NewsCard key={a.id} article={a} seriesLinks={seriesFor(a)} />
                      ))}
                    </div>
                  )}
                  {hasMore && (
                    <div className="nw-more">
                      <button type="button" className="nw-btn nw-btn-outline" disabled={loadingMore} onClick={loadMore}>
                        {loadingMore ? "Loading…" : "Load more"}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {!filtered && !top && feed.length === 0 && !error && <div className="nw-state">No news published yet.</div>}
            </>
          )}
        </div>
        <Footer />
      </div>
    </AppShell>
  );
}
