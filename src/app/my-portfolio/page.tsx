"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
/* eslint-disable @typescript-eslint/no-unused-vars -- used in fallback search JSX */
import {
  type GlobalSearchResult,
  fetchGlobalSearchProgressive,
  sortSearchResults,
  resolveSearchHref,
  getSearchBadgeLabel,
  badgeClassForSearchType,
  PORTFOLIO_FALLBACK_SOURCES,
} from "@/lib/globalSearch";
/* eslint-enable @typescript-eslint/no-unused-vars */
import { followPortfolioEntity } from "@/lib/portfolioFollow";
import { toast } from "react-hot-toast";

type PortfolioEntityType =
  | "company"
  | "advisor"
  | "investor"
  | "individual"
  | "sector"
  | string;

type PortfolioEntityRow = {
  entity: PortfolioEntityType;
  id: number;
  name: string;
};

const formatEntityType = (entity: string) => {
  const s = (entity || "").trim().toLowerCase();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getEntityHref = (row: PortfolioEntityRow): string | null => {
  const t = String(row.entity || "").trim().toLowerCase();
  const id = row.id;
  if (!Number.isFinite(id) || id <= 0) return null;

  switch (t) {
    case "company":
      return `/company/${id}`;
    case "advisor":
      return `/advisor/${id}`;
    case "investor":
      return `/investors/${id}`;
    case "sector":
      return `/sector/${id}`;
    case "individual":
      return `/individual/${id}`;
    default:
      return null;
  }
};

const ENTITY_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "company", label: "Company" },
  { value: "sector", label: "Sector" },
  { value: "individual", label: "Individual" },
  { value: "investor", label: "Investor" },
  { value: "advisor", label: "Advisor" },
];

/** Map global search result type to portfolio follow key; null if not followable. */
function getFollowKeyForSearchType(type: string): "followed_companies" | "followed_advisors" | "followed_investors" | "followed_sectors" | "followed_individuals" | null {
  const t = String(type || "").toLowerCase().trim();
  if (t === "company" || t === "companies") return "followed_companies";
  if (t === "advisor" || t === "advisors") return "followed_advisors";
  if (t === "investor" || t === "investors") return "followed_investors";
  if (t === "sector" || t === "sectors" || t === "sub_sector" || t === "sub-sector") return "followed_sectors";
  if (t === "individual" || t === "individuals") return "followed_individuals";
  return null;
}

export default function MyPortfolioPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PortfolioEntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* eslint-disable @typescript-eslint/no-unused-vars -- used in fallback section JSX */
  const [fallbackResults, setFallbackResults] = useState<GlobalSearchResult[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackDismissed, setFallbackDismissed] = useState(false);
  const fallbackAbortRef = useRef<AbortController | null>(null);
  const [followingId, setFollowingId] = useState<string | null>(null);
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const effectiveSearch = useMemo(() => search.trim(), [search]);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");

  const filteredRows = useMemo(() => {
    const filter = (entityTypeFilter || "").trim().toLowerCase();
    if (!filter) return rows;
    return rows.filter((r) => String(r.entity || "").toLowerCase().trim() === filter);
  }, [rows, entityTypeFilter]);

  const loadPortfolio = useCallback(
    async (silent = false) => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : null;

      if (!silent) {
        setLoading(true);
        setError(null);
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const qs = new URLSearchParams();
      if (effectiveSearch) qs.set("search", effectiveSearch);

      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["x-asym-token"] = token;

      try {
        const res = await fetch(`/api/portfolio/data?${qs.toString()}`, {
          method: "GET",
          headers,
          credentials: "include",
          signal: ac.signal,
        });

        const text = await res.text().catch(() => "");
        let data: unknown = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }

        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          if (data && typeof data === "object" && "error" in data) {
            const errVal = (data as { error?: unknown }).error;
            if (typeof errVal === "string" && errVal.trim()) message = errVal;
          }
          throw new Error(message);
        }

        const list = Array.isArray(data) ? (data as PortfolioEntityRow[]) : [];
        setRows(list);
        return list;
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return [];
        if (!silent) {
          setError((e as Error).message || "Failed to load portfolio");
        }
        setRows([]);
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [effectiveSearch]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadPortfolio();
    }, 250);
    return () => {
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [loadPortfolio]);

  // When portfolio returns 0 results and user has a search query, run global search fallback.
  // Keep fallback visible after user follows (rows.length > 0) so they can follow more.
  useEffect(() => {
    if (loading || effectiveSearch.length < 2) {
      setFallbackResults([]);
      setFallbackLoading(false);
      setFallbackDismissed(false);
      fallbackAbortRef.current?.abort();
      return;
    }
    if (rows.length > 0) {
      return;
    }

    setFallbackDismissed(false);
    fallbackAbortRef.current?.abort();
    const ac = new AbortController();
    fallbackAbortRef.current = ac;
    setFallbackLoading(true);
    setFallbackResults([]);

    const collected: GlobalSearchResult[] = [];
    fetchGlobalSearchProgressive(effectiveSearch, null, {
      signal: ac.signal,
      sources: PORTFOLIO_FALLBACK_SOURCES,
      onBatch: (items) => {
        if (ac.signal.aborted) return;
        collected.push(...items);
        setFallbackResults(sortSearchResults([...collected]));
      },
      onComplete: () => {
        if (ac.signal.aborted) return;
        setFallbackResults(sortSearchResults(collected));
        setFallbackLoading(false);
      },
      onError: () => {
        setFallbackLoading(false);
      },
    });

    return () => {
      ac.abort();
      fallbackAbortRef.current = null;
    };
  }, [loading, effectiveSearch, rows.length]);

  /* eslint-disable @typescript-eslint/no-unused-vars -- used by Follow button in fallback JSX */
  const handleFollow = useCallback(
    async (result: GlobalSearchResult) => {
      const followKey = getFollowKeyForSearchType(result.type);
      if (!followKey || !Number.isFinite(result.id) || result.id <= 0) return;
      const key = `${result.type}-${result.id}`;
      setFollowingId(key);
      try {
        await followPortfolioEntity({ followKey, entityId: result.id });
        toast.success(`Following ${result.title}`);
        setFallbackResults((prev) => prev.filter((r) => !(r.type === result.type && r.id === result.id)));
        // Re-fetch followed entities so the table updates with the new item
        await loadPortfolio(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to follow");
      } finally {
        setFollowingId(null);
      }
    },
    [loadPortfolio]
  );
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Portfolio
          </h1>
          <p className="text-gray-600">
            Companies, Advisors, Investors, Sectors, and Individuals you follow.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Followed entities
            </h2>
            <span className="text-sm text-gray-500">
              {loading
                ? "Loading…"
                : `${filteredRows.length} result${filteredRows.length === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search portfolio (e.g. "IQVIA")'
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
              >
                {ENTITY_TYPE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Entity Name
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Entity Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-10 text-gray-500">
                      {rows.length === 0
                        ? fallbackLoading || fallbackResults.length > 0
                          ? fallbackLoading
                            ? "No matches in your portfolio. Searching the platform…"
                            : "No matches in your portfolio. See results below to follow."
                          : "No followed entities found."
                        : "No entities match the selected filter."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => (
                    <tr
                      key={`${r.entity}:${r.id}:${idx}`}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-900">
                        {(() => {
                          const href = getEntityHref(r);
                          if (!href) return r.name;
                          return (
                            <Link
                              href={href}
                              className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                            >
                              {r.name}
                            </Link>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatEntityType(String(r.entity))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Fallback: global search results; stays open after follow so user can follow more */}
          {effectiveSearch.length >= 2 &&
          (fallbackLoading || fallbackResults.length > 0) &&
          !fallbackDismissed ? (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-medium text-gray-700">
                  {rows.length === 0
                    ? "No matches in your portfolio. Results from the platform:"
                    : "Results from the platform (you can follow more):"}
                </p>
                <button
                  type="button"
                  onClick={() => setFallbackDismissed(true)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  aria-label="Close search results"
                >
                  Close
                </button>
              </div>
              {fallbackLoading && fallbackResults.length === 0 ? (
                <p className="text-sm text-gray-500">Searching…</p>
              ) : (
                <ul className="space-y-2">
                  {fallbackResults.map((r, idx) => {
                    const href = resolveSearchHref(r);
                    const followKey = getFollowKeyForSearchType(r.type);
                    const canFollow = followKey !== null;
                    const isFollowing = followingId === `${r.type}-${r.id}`;
                    return (
                      <li
                        key={`${r.type}-${r.id}-${idx}`}
                        className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {href ? (
                            <Link
                              href={href}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate"
                            >
                              {r.title}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-900 truncate">
                              {r.title}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border shrink-0 ${badgeClassForSearchType(
                              r.type
                            )}`}
                          >
                            {getSearchBadgeLabel(r.type)}
                          </span>
                        </div>
                        {canFollow ? (
                          <button
                            type="button"
                            disabled={isFollowing}
                            onClick={() => handleFollow(r)}
                            className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isFollowing ? "Adding…" : "Follow"}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

