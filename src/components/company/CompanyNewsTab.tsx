"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NewsCard from "@/components/news/NewsCard";
import NewsFilterBar from "@/components/news/NewsFilterBar";
import "@/components/news/news.css";
import { hasNewsFilters, type NewsFilters } from "@/lib/news";
import {
  fetchCompanyNews,
  type CompanyNewsArticle,
  type CompanyNewsPart,
} from "@/lib/companyNews";
import { trackKeyAction } from "@/lib/tracking";

type Block = { items: CompanyNewsArticle[]; total: number | null; hasMore: boolean };
const EMPTY: Block = { items: [], total: null, hasMore: false };

function mergeById(prev: CompanyNewsArticle[], next: CompanyNewsArticle[]) {
  const seen = new Set(prev.map((a) => a.id));
  return [...prev, ...next.filter((a) => !seen.has(a.id))];
}

export function trackCompanyNewsOpen(id: number, part: CompanyNewsPart | "summary_card") {
  trackKeyAction({
    section: "news",
    action: "article_opened",
    actionDetail: part,
    targetType: "article",
    targetId: id,
  });
}

export default function CompanyNewsTab({ companyId }: { companyId: number }) {
  const [filters, setFilters] = useState<NewsFilters>({});
  const [top, setTop] = useState<Block>(EMPTY);
  const [recent, setRecent] = useState<Block>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [moreTop, setMoreTop] = useState(false);
  const [moreRecent, setMoreRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // New company or new filters: reload both parts from the start.
  useEffect(() => {
    const req = ++reqRef.current;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchCompanyNews({ companyId, filters, signal: ac.signal })
      .then((res) => {
        if (req !== reqRef.current) return;
        setTop(res.top);
        setRecent(res.recent);
      })
      .catch((e) => {
        if (req !== reqRef.current || ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load news");
      })
      .finally(() => {
        if (req === reqRef.current) setLoading(false);
      });
    return () => ac.abort();
  }, [companyId, filters]);

  const showMoreTop = useCallback(async () => {
    if (moreTop || !top.hasMore) return;
    const req = reqRef.current;
    setMoreTop(true);
    try {
      const res = await fetchCompanyNews({
        companyId,
        filters,
        topOffset: top.items.length,
        recentLimit: 1,
      });
      if (req !== reqRef.current) return;
      setTop((prev) => ({
        items: mergeById(prev.items, res.top.items),
        total: prev.total ?? res.top.total,
        hasMore: res.top.hasMore,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news");
    } finally {
      setMoreTop(false);
    }
  }, [companyId, filters, moreTop, top.hasMore, top.items.length]);

  const loadMoreRecent = useCallback(async () => {
    if (moreRecent || !recent.hasMore) return;
    const req = reqRef.current;
    setMoreRecent(true);
    try {
      const res = await fetchCompanyNews({
        companyId,
        filters,
        topLimit: 1,
        recentOffset: recent.items.length,
      });
      if (req !== reqRef.current) return;
      setRecent((prev) => ({
        items: mergeById(prev.items, res.recent.items),
        total: prev.total ?? res.recent.total,
        hasMore: res.recent.hasMore,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news");
    } finally {
      setMoreRecent(false);
    }
  }, [companyId, filters, moreRecent, recent.hasMore, recent.items.length]);

  // Load more as the user scrolls.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !recent.hasMore || loading) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMoreRecent();
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [recent.hasMore, loading, loadMoreRecent]);

  const filtered = hasNewsFilters(filters);
  const empty = !loading && top.items.length === 0 && recent.items.length === 0;

  return (
    <div className="nw-shell" style={{ padding: "20px 0 40px" }}>
      <div className="nw-controls">
        <NewsFilterBar
          variant="company"
          filters={filters}
          totalAll={null}
          onChange={(patch) => setFilters((cur) => ({ ...cur, ...patch }))}
          searchSlot={
            <div className="nw-search">
              <div className="nw-search-row">
                <div className="nw-search-pill">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="text"
                    aria-label="Search this company's news"
                    placeholder="Search title, strapline, summary…"
                    defaultValue={filters.text ?? ""}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = e.currentTarget.value.trim();
                        setFilters((cur) => ({ ...cur, text: v || undefined }));
                      }
                    }}
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if ((filters.text ?? "") !== v) setFilters((cur) => ({ ...cur, text: v || undefined }));
                    }}
                  />
                </div>
              </div>
            </div>
          }
        />
      </div>

      {error && <div className="nw-error" role="alert">{error}</div>}

      {loading ? (
        <div className="nw-top" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="nw-skel" key={i} style={{ minHeight: 260 }} />
          ))}
        </div>
      ) : (
        <>
          {top.items.length > 0 && (
            <section aria-labelledby="cnw-top-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 className="nw-section-title" id="cnw-top-h">Top stories</h2>
              <div className="nw-top">
                {top.items.map((a) => (
                  <NewsCard
                    key={a.id}
                    article={a}
                    variant="top"
                    sectorRoundup={a.is_sector_roundup}
                    seriesChip={a.series_chip}
                    onOpen={() => trackCompanyNewsOpen(a.id, "top_stories")}
                  />
                ))}
              </div>
              {top.hasMore && (
                <div className="nw-more">
                  <button type="button" className="nw-btn nw-btn-outline" disabled={moreTop} onClick={showMoreTop}>
                    {moreTop ? "Loading…" : "Show more"}
                  </button>
                </div>
              )}
            </section>
          )}

          {recent.items.length > 0 && (
            <section aria-labelledby="cnw-recent-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 className="nw-section-title" id="cnw-recent-h">Related News</h2>
              <div className="nw-feed nw-recent-feed">
                {recent.items.map((a) => (
                  <NewsCard
                    key={a.id}
                    article={a}
                    reasonLabel={a.reason === "mentioned" ? "Mentioned" : a.reason === "sector" ? "Same sector" : undefined}
                    sectorRoundup={a.is_sector_roundup}
                    seriesChip={a.series_chip}
                    onOpen={() => trackCompanyNewsOpen(a.id, "recent_news")}
                  />
                ))}
              </div>
              {recent.hasMore && (
                <>
                  <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
                  <div className="nw-more">
                    <button type="button" className="nw-btn nw-btn-outline" disabled={moreRecent} onClick={loadMoreRecent}>
                      {moreRecent ? "Loading…" : "Load more"}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {empty && (
            <div className="nw-state">
              {filtered ? "No news matches these filters." : "No news for this company yet."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
