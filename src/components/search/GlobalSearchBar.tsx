"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { trackEvent } from "@/lib/tracking";
import {
  type GlobalSearchResult,
  type GlobalSearchPagination,
  type SearchPageType,
  fetchGlobalSearchProgressive,
  sortSearchResults,
  badgeClassForSearchType,
  resolveSearchHref,
  getSearchBadgeLabel,
  SEARCH_PAGE_TYPES,
  SEARCH_PAGE_TYPE_LABELS,
  GLOBAL_SEARCH_INPUT_PLACEHOLDER,
} from "@/lib/globalSearch";

/**
 * Cross-platform search bar: an input + live dropdown, plus a "view more"
 * popup with per-entity-type filters. Self-contained (owns its own state and
 * data fetching) so it can be dropped into any page — the dashboard renders
 * it directly, and AppShell renders it for every other authenticated page.
 */
export default function GlobalSearchBar({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const { user, isTrialActive } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [searchPopupOpen, setSearchPopupOpen] = useState(false);
  const [, setSearchPagination] = useState<GlobalSearchPagination | null>(
    null
  );
  const [popupResults, setPopupResults] = useState<GlobalSearchResult[]>([]);
  const [searchPageType, setSearchPageType] = useState<SearchPageType | null>(
    null
  );
  const [popupFiltering, setPopupFiltering] = useState(false);
  const [searchLoadingSources, setSearchLoadingSources] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const popupAbortRef = useRef<AbortController | null>(null);
  const searchRunIdRef = useRef(0);
  const loggedSearchRunIdRef = useRef(0);

  const mergeResults = useCallback(
    (prev: GlobalSearchResult[], newItems: GlobalSearchResult[]) => {
      const seen = new Set(prev.map((r) => `${r.type}-${r.id}`));
      const added = newItems.filter((r) => {
        const key = `${r.type}-${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...prev, ...added];
    },
    []
  );

  useEffect(() => {
    if (isTrialActive) {
      setSearchOpen(false);
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      setSearchLoadingSources(false);
      return;
    }
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      setSearchLoadingSources(false);
      return;
    }

    const ac = new AbortController();
    searchAbortRef.current = ac;
    setSearchLoading(true);
    setSearchLoadingSources(true);
    setSearchError(null);
    setSearchOpen(true);
    setSearchResults([]);

    searchRunIdRef.current += 1;
    const runId = searchRunIdRef.current;

    const allResultsRef = { current: [] as GlobalSearchResult[] };

    const t = window.setTimeout(() => {
      fetchGlobalSearchProgressive(q, null, {
        signal: ac.signal,
        onBatch: (items) => {
          if (ac.signal.aborted) return;
          const merged = mergeResults(allResultsRef.current, items);
          allResultsRef.current = merged;
          setSearchResults(merged);

          // Log platform-wide search only once per search run, and only when we actually have results.
          if (merged.length > 0 && loggedSearchRunIdRef.current !== runId) {
            loggedSearchRunIdRef.current = runId;
            const parsedUserId = Number.parseInt(String(user?.id || ""), 10);
            const userId =
              Number.isFinite(parsedUserId) && parsedUserId > 0
                ? parsedUserId
                : undefined;
            trackEvent({
              eventType: "platform_wide_search",
              userId,
              query: q,
            });
          }
        },
        onComplete: () => {
          if (ac.signal.aborted) return;
          setSearchResults(sortSearchResults(allResultsRef.current));
          setSearchLoading(false);
          setSearchLoadingSources(false);
          const total = allResultsRef.current.length;
          const perPage = 25;
          const totalPages = Math.max(1, Math.ceil(total / perPage));
          setSearchPagination({
            current_page: 1,
            per_page: perPage,
            total_results: total,
            total_pages: totalPages,
            next_page: totalPages > 1 ? 2 : null,
            prev_page: null,
            pages_left: Math.max(0, totalPages - 1),
          });
        },
        onError: (_source, err) => {
          const name =
            err && typeof err === "object"
              ? String((err as { name?: unknown }).name)
              : "";
          if (name !== "AbortError") {
            setSearchError("Search failed. Please try again.");
          }
        },
      });
    }, 250);

    return () => {
      window.clearTimeout(t);
      ac.abort();
      searchAbortRef.current = null;
    };
  }, [searchQuery, mergeResults, isTrialActive, user?.id]);

  const [popupDisplayedCount, setPopupDisplayedCount] = useState(25);
  const popupQueryRef = useRef("");

  const handleLoadMoreInPopup = useCallback(() => {
    setPopupDisplayedCount((prev) => prev + 25);
  }, []);

  const openSearchPopup = useCallback(() => {
    setPopupResults(searchResults);
    setPopupDisplayedCount(25);
    setSearchPageType(null);
    setSearchPopupOpen(true);
    popupQueryRef.current = searchQuery;
  }, [searchResults, searchQuery]);

  const closeSearchPopup = useCallback(() => {
    popupAbortRef.current?.abort();
    popupAbortRef.current = null;
    setPopupFiltering(false);
    setSearchPopupOpen(false);
    setSearchPageType(null);
  }, []);

  const handleSearchFilterChange = useCallback(
    (pageType: SearchPageType | null) => {
      popupAbortRef.current?.abort();
      popupAbortRef.current = null;

      setSearchPageType(pageType);
      popupQueryRef.current = searchQuery;
      const q = searchQuery.trim();
      setPopupDisplayedCount(25);
      if (!q || q.length < 2) {
        setPopupResults([]);
        setPopupFiltering(false);
        return;
      }

      // For "All", just mirror the main progressive results (and let the effect keep it updated)
      if (pageType === null) {
        setPopupResults(searchResults);
        setPopupFiltering(false);
        setSearchPagination({
          current_page: 1,
          per_page: 25,
          total_results: searchResults.length,
          total_pages: Math.max(1, Math.ceil(searchResults.length / 25)),
          next_page: searchResults.length > 25 ? 2 : null,
          prev_page: null,
          pages_left: Math.max(0, Math.ceil(searchResults.length / 25) - 1),
        });
        return;
      }

      setPopupFiltering(true);
      // Critical: clear stale results so we don't "carry over" from the previous tab.
      setPopupResults([]);

      const ac = new AbortController();
      popupAbortRef.current = ac;

      const allResultsRef = { current: [] as GlobalSearchResult[] };
      fetchGlobalSearchProgressive(q, pageType, {
        signal: ac.signal,
        onBatch: (items) => {
          if (ac.signal.aborted) return;
          const merged = mergeResults(allResultsRef.current, items);
          allResultsRef.current = merged;
          setPopupResults(merged);
        },
        onComplete: () => {
          if (ac.signal.aborted) return;
          setPopupResults(sortSearchResults(allResultsRef.current));
          const total = allResultsRef.current.length;
          const perPage = 25;
          const totalPages = Math.max(1, Math.ceil(total / perPage));
          setSearchPagination({
            current_page: 1,
            per_page: perPage,
            total_results: total,
            total_pages: totalPages,
            next_page: totalPages > 1 ? 2 : null,
            prev_page: null,
            pages_left: Math.max(0, totalPages - 1),
          });
          setPopupFiltering(false);
        },
        onError: (_source, err) => {
          const name =
            err && typeof err === "object"
              ? String((err as { name?: unknown }).name)
              : "";
          if (name === "AbortError") return;
          setPopupFiltering(false);
        },
      });
    },
    [searchQuery, mergeResults, searchResults]
  );

  const matchesPopupFilter = useCallback(
    (result: GlobalSearchResult, pageType: SearchPageType | null) => {
      if (!pageType) return true;
      const t = String(result.type || "").toLowerCase().trim();
      const allowed: Record<SearchPageType, string[]> = {
        companies: ["company", "companies"],
        sectors: ["sector", "sectors", "sub_sector", "sub-sector"],
        investors: ["investor", "investors"],
        advisors: ["advisor", "advisors"],
        individuals: ["individual", "individuals"],
        "corporate events": ["corporate_event", "corporate-events", "event"],
        "insights and analysis": ["insight", "insights", "article"],
      };
      return (allowed[pageType] || []).includes(t);
    },
    []
  );

  useEffect(() => {
    if (!searchPopupOpen || searchPageType !== null) return;
    setPopupResults(searchResults);
    setPopupDisplayedCount(25);
  }, [searchPopupOpen, searchPageType, searchResults]);

  useEffect(() => {
    if (!searchPopupOpen || searchPageType === null) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      // If the user clears the query while a filtered search is in-flight,
      // abort and reset so the UI doesn't get "stuck" in loading/disabled state.
      popupAbortRef.current?.abort();
      popupAbortRef.current = null;
      setPopupFiltering(false);
      setPopupResults([]);
      setPopupDisplayedCount(25);
      popupQueryRef.current = searchQuery;
      return;
    }
    if (searchQuery === popupQueryRef.current) return;
    popupQueryRef.current = searchQuery;
    const t = window.setTimeout(() => {
      handleSearchFilterChange(searchPageType);
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchPopupOpen, searchQuery, searchPageType, handleSearchFilterChange]);

  useEffect(() => {
    if (!searchOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [searchOpen]);

  const goToResult = useCallback(
    (href: string) => {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      setSearchPopupOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <>
      <div
        ref={searchWrapRef}
        className={`relative w-full min-w-0 flex-1 max-w-3xl rounded-full border-2 bg-white shadow-sm ${
          isTrialActive
            ? "border-gray-200"
            : "border-blue-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
        } ${className}`}
      >
        <svg
          width={17}
          height={17}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          disabled={isTrialActive}
          placeholder={
            isTrialActive
              ? "Search is disabled during trial access"
              : GLOBAL_SEARCH_INPUT_PLACEHOLDER
          }
          className={`w-full rounded-full border-0 bg-transparent py-3 pl-11 pr-4 text-base focus:outline-none focus:ring-0 ${
            isTrialActive
              ? "text-gray-500 cursor-not-allowed"
              : "text-gray-900 placeholder-gray-500"
          }`}
          onFocus={() => {
            if (!isTrialActive) setSearchOpen(true);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
        />

        {searchOpen && !isTrialActive && searchQuery.trim().length >= 2 && (
          <div className="absolute z-50 mt-2 w-full bg-white rounded-lg border-2 border-blue-200 shadow-lg">
            {searchLoading && searchResults.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-600">
                Searching…
              </div>
            ) : searchLoadingSources && searchResults.length > 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                Loading more results…
              </div>
            ) : null}
            {searchError ? (
              <div className="px-3 py-3 text-xs text-red-600">
                {searchError}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-600">
                No results
              </div>
            ) : (
              <>
                <ul className="py-1 max-h-72 overflow-auto">
                  {searchResults.slice(0, 25).map((r, idx) => {
                    const href = resolveSearchHref(r);
                    const t = String(r.type || "").toLowerCase().trim();
                    const isInsight =
                      t === "insight" || t === "insights" || t === "article";
                    const badgeLabel = getSearchBadgeLabel(r.type);
                    return (
                      <li key={`${r.type}-${r.id}-${idx}`}>
                        <a
                          href={href || "#"}
                          className="group flex items-start justify-between gap-3 px-3 py-2 w-full hover:bg-blue-50 hover:shadow-sm no-underline cursor-pointer transition-all duration-150 rounded-md"
                          onClick={(e) => {
                            if (!href) {
                              e.preventDefault();
                              return;
                            }
                            if (
                              e.defaultPrevented ||
                              e.button !== 0 ||
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.altKey
                            ) {
                              return;
                            }
                            e.preventDefault();
                            goToResult(href);
                          }}
                        >
                          <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                            {r.title}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full border shrink-0 ${badgeClassForSearchType(
                              String(r.type || "")
                            )} ${isInsight ? "normal-case" : "uppercase"}`}
                          >
                            {badgeLabel}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
                <div className="px-3 py-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      openSearchPopup();
                    }}
                    className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    View more
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search results popup */}
      {searchPopupOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-popup-title"
          onClick={closeSearchPopup}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all pages..."
                className="flex-1 px-4 py-2.5 text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Search"
                id="search-popup-title"
              />
              <button
                type="button"
                onClick={closeSearchPopup}
                className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200">
              <button
                type="button"
                onClick={() => handleSearchFilterChange(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  searchPageType === null
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {SEARCH_PAGE_TYPES.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => handleSearchFilterChange(pt)}
                  disabled={popupFiltering}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors shrink-0 ${
                    searchPageType === pt
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  {SEARCH_PAGE_TYPE_LABELS[pt]}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const visibleResults =
                  searchPageType === null
                    ? popupResults
                    : popupResults.filter((r) =>
                        matchesPopupFilter(r, searchPageType)
                      );
                const displayed = visibleResults.slice(0, popupDisplayedCount);
                const allTabLoading =
                  searchPageType === null &&
                  searchQuery.trim().length >= 2 &&
                  (searchLoading || searchLoadingSources);

                if (
                  (popupFiltering || allTabLoading) &&
                  visibleResults.length === 0
                ) {
                  return (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                      <span className="ml-2 text-sm text-gray-600">
                        Searching…
                      </span>
                    </div>
                  );
                }
                if (searchPageType === null && searchError) {
                  return (
                    <p className="text-sm text-red-600 py-4">{searchError}</p>
                  );
                }
                if (visibleResults.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 py-4">No results</p>
                  );
                }
                return (
                  <>
                    {(popupFiltering || allTabLoading) && (
                      <div className="pb-2 text-xs text-gray-500">
                        Loading more results…
                      </div>
                    )}
                    <ul className="space-y-1">
                      {displayed.map((r, idx) => {
                        const href = resolveSearchHref(r);
                        const t = String(r.type || "").toLowerCase().trim();
                        const isInsight =
                          t === "insight" ||
                          t === "insights" ||
                          t === "article";
                        const badgeLabel = getSearchBadgeLabel(r.type);
                        return (
                          <li key={`popup-${r.type}-${r.id}-${idx}`}>
                            <a
                              href={href || "#"}
                              className="group flex items-start justify-between gap-3 px-3 py-2.5 w-full rounded-md hover:bg-blue-50 hover:shadow-sm no-underline cursor-pointer transition-all duration-150"
                              onClick={(e) => {
                                if (!href) {
                                  e.preventDefault();
                                  return;
                                }
                                // Allow default behavior for right-click, ctrl+click, cmd+click, etc.
                                if (
                                  e.defaultPrevented ||
                                  e.button !== 0 ||
                                  e.metaKey ||
                                  e.ctrlKey ||
                                  e.shiftKey ||
                                  e.altKey
                                ) {
                                  return;
                                }
                                e.preventDefault();
                                goToResult(href);
                              }}
                            >
                              <span className="text-sm text-gray-900 group-hover:text-blue-700 line-clamp-2 transition-colors">
                                {r.title}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full border shrink-0 ${badgeClassForSearchType(
                                  String(r.type || "")
                                )} ${
                                  isInsight ? "normal-case" : "uppercase"
                                }`}
                              >
                                {badgeLabel}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-200 space-y-3">
              {(() => {
                const visibleResults =
                  searchPageType === null
                    ? popupResults
                    : popupResults.filter((r) =>
                        matchesPopupFilter(r, searchPageType)
                      );
                const showing = Math.min(
                  popupDisplayedCount,
                  visibleResults.length
                );
                const canLoadMore = showing < visibleResults.length;

                if (visibleResults.length === 0) return null;
                return (
                  <>
                    <p className="text-xs text-gray-600">
                      Showing {showing} of {visibleResults.length} results
                    </p>
                    {canLoadMore ? (
                      <button
                        type="button"
                        onClick={handleLoadMoreInPopup}
                        className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        Load more
                      </button>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
