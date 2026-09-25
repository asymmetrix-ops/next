"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/providers/AuthProvider";
import { trackEvent } from "@/lib/tracking";
import { getInitials } from "@/lib/userDisplay";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import {
  type GlobalSearchResult,
  type SearchPageType,
  fetchGlobalSearchProgressive,
  sortSearchResults,
  resolveSearchHref,
  getSearchBadgeLabel,
  SEARCH_PAGE_TYPES,
  SEARCH_PAGE_TYPE_LABELS,
} from "@/lib/globalSearch";
import { useGlobalSearch } from "./GlobalSearchProvider";

const AVATAR_COLORS = [
  { bg: "#FEE2E2", fg: "#DC2626" },
  { bg: "#DBEAFE", fg: "#1D4ED8" },
  { bg: "#EDE9FE", fg: "#7C3AED" },
  { bg: "#D1FAE5", fg: "#059669" },
  { bg: "#FEF3C7", fg: "#B45309" },
  { bg: "#E0E7FF", fg: "#4338CA" },
  { bg: "#FCE7F3", fg: "#DB2777" },
  { bg: "#CCFBF1", fg: "#0D9488" },
];

function colorForTitle(title: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function normalizeType(type: string): string {
  return String(type || "").toLowerCase().trim();
}

const ICON_TYPES = new Set([
  "sector",
  "sectors",
  "sub_sector",
  "sub-sector",
  "corporate_event",
  "corporate-events",
  "event",
  "insight",
  "insights",
  "article",
]);

function ResultAvatar({ result }: { result: GlobalSearchResult }) {
  const t = normalizeType(result.type);

  const logoSrc = result.logo ? resolveCompanyLogoSrc(result.logo) : null;
  if (logoSrc) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URIs, not a next/image-optimizable source */}
        <img src={logoSrc} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }

  if (ICON_TYPES.has(t)) {
    const Icon =
      t === "insight" || t === "insights" || t === "article"
        ? LightBulbIcon
        : t.startsWith("corporate") || t === "event"
          ? CalendarDaysIcon
          : ChartBarIcon;
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <Icon className="h-[18px] w-[18px]" />
      </span>
    );
  }
  const color = colorForTitle(result.title || "?");
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
      style={{ background: color.bg, color: color.fg }}
    >
      {getInitials(result.title) || <BuildingOfficeIcon className="h-[18px] w-[18px]" />}
    </span>
  );
}

const FILTERS: Array<{ key: SearchPageType | null; label: string }> = [
  { key: null, label: "All" },
  ...SEARCH_PAGE_TYPES.map((pt) => ({ key: pt, label: SEARCH_PAGE_TYPE_LABELS[pt] })),
];

const PAGE_SIZE = 25;

export function GlobalSearchModal() {
  const { open, closeSearch } = useGlobalSearch();
  const { user, isTrialActive } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchPageType | null>(null);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loggedQueryRef = useRef<string | null>(null);

  const mergeResults = useCallback(
    (prev: GlobalSearchResult[], next: GlobalSearchResult[]) => {
      const seen = new Set(prev.map((r) => `${r.type}-${r.id}`));
      const added = next.filter((r) => {
        const key = `${r.type}-${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...prev, ...added];
    },
    []
  );

  // Reset everything when the modal closes, so reopening always starts fresh.
  useEffect(() => {
    if (open) {
      setDisplayedCount(PAGE_SIZE);
      setHighlightedIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    abortRef.current?.abort();
    setQuery("");
    setFilter(null);
    setResults([]);
    setError(null);
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open || isTrialActive) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    setDisplayedCount(PAGE_SIZE);
    setHighlightedIndex(0);

    const allResultsRef = { current: [] as GlobalSearchResult[] };

    const t = window.setTimeout(() => {
      fetchGlobalSearchProgressive(q, filter, {
        signal: ac.signal,
        onBatch: (items) => {
          if (ac.signal.aborted) return;
          allResultsRef.current = mergeResults(allResultsRef.current, items);
          setResults(allResultsRef.current);

          if (allResultsRef.current.length > 0 && loggedQueryRef.current !== q) {
            loggedQueryRef.current = q;
            const parsedUserId = Number.parseInt(String(user?.id || ""), 10);
            trackEvent({
              eventType: "platform_wide_search",
              userId:
                Number.isFinite(parsedUserId) && parsedUserId > 0
                  ? parsedUserId
                  : undefined,
              query: q,
            });
          }
        },
        onComplete: () => {
          if (ac.signal.aborted) return;
          setResults(sortSearchResults(allResultsRef.current));
          setLoading(false);
        },
        onError: (_source, err) => {
          const name =
            err && typeof err === "object" ? String((err as { name?: unknown }).name) : "";
          if (name !== "AbortError") setError("Search failed. Please try again.");
        },
      });
    }, 250);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [open, query, filter, isTrialActive, user?.id, mergeResults]);

  const visibleResults = results.slice(0, displayedCount);
  const canLoadMore = displayedCount < results.length;

  const goToResult = useCallback(
    (result: GlobalSearchResult) => {
      const href = resolveSearchHref(result);
      if (!href) return;
      closeSearch();
      router.push(href);
    },
    [closeSearch, router]
  );

  const cycleFilter = useCallback((direction: 1 | -1) => {
    setFilter((current) => {
      const idx = FILTERS.findIndex((f) => f.key === current);
      const next = FILTERS[(idx + direction + FILTERS.length) % FILTERS.length];
      return next.key;
    });
  }, []);

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, visibleResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const target = visibleResults[highlightedIndex];
        if (target) goToResult(target);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        cycleFilter(e.shiftKey ? -1 : 1);
      }
    },
    [visibleResults, highlightedIndex, goToResult, closeSearch, cycleFilter]
  );

  const showEmptyState = query.trim().length < 2;
  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform),
    []
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={closeSearch}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4">
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
            className="shrink-0 text-gray-400"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={isTrialActive}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={
              isTrialActive
                ? "Search is disabled during trial access"
                : "Search companies, sectors, investors, advisors, individuals, insights, events…"
            }
            className="min-w-0 flex-1 border-0 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
          />
          <kbd className="shrink-0 rounded border border-gray-300 px-2 py-0.5 text-[11px] font-medium text-gray-400">
            Esc
          </kbd>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {showEmptyState ? (
            <div className="px-3 py-10 text-center text-sm text-gray-400">
              Type at least 2 characters to search
            </div>
          ) : error ? (
            <div className="px-3 py-6 text-sm text-red-600">{error}</div>
          ) : loading && results.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-gray-500">Searching…</div>
          ) : visibleResults.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-gray-500">No results</div>
          ) : (
            <ul>
              {visibleResults.map((r, idx) => (
                <li key={`${r.type}-${r.id}-${idx}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => goToResult(r)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      idx === highlightedIndex ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <ResultAvatar result={r} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {r.title}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {getSearchBadgeLabel(r.type)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
          <div className="hidden items-center gap-4 sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-gray-300 px-1.5 py-0.5 font-medium">↑↓</kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-gray-300 px-1.5 py-0.5 font-medium">↵</kbd>
              Open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-gray-300 px-1.5 py-0.5 font-medium">Tab</kbd>
              Next type
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-gray-300 px-1.5 py-0.5 font-medium">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
              Toggle
            </span>
          </div>
          {canLoadMore ? (
            <button
              type="button"
              onClick={() => setDisplayedCount((c) => c + PAGE_SIZE)}
              className="ml-auto shrink-0 font-medium text-blue-600 hover:text-blue-700"
            >
              See all results
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
