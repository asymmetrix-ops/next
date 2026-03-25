"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  type GlobalSearchResult,
  fetchGlobalSearchProgressive,
  sortSearchResults,
  resolveSearchHref,
  getSearchBadgeLabel,
  PORTFOLIO_FALLBACK_SOURCES,
} from "@/lib/globalSearch";
import {
  followPortfolioEntity,
  unfollowPortfolioEntity,
  type PortfolioFollowKey,
} from "@/lib/portfolioFollow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  BuildingOffice2Icon,
  UserIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

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

const ENTITY_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "company", label: "Company" },
  { value: "sector", label: "Sector" },
  { value: "individual", label: "Individual" },
  { value: "investor", label: "Investor" },
  { value: "advisor", label: "Advisor" },
];

const getEntityIcon = (type: string) => {
  const t = (type || "").toLowerCase().trim();
  const cls = "size-3.5 shrink-0";
  switch (t) {
    case "company":
      return <BuildingOffice2Icon className={cls} />;
    case "individual":
      return <UserIcon className={cls} />;
    case "investor":
      return <ArrowTrendingUpIcon className={cls} />;
    case "advisor":
      return <UsersIcon className={cls} />;
    case "sector":
      return <MapPinIcon className={cls} />;
    default:
      return null;
  }
};

const getEntityBadgeColor = (type: string) => {
  const t = (type || "").toLowerCase().trim();
  switch (t) {
    case "company":
      return "bg-green-50 text-green-700 border-green-200";
    case "individual":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "investor":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "advisor":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "sector":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
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

function getFollowKeyForEntityType(type: string): PortfolioFollowKey | null {
  const t = (type || "").toLowerCase().trim();
  if (t === "company") return "followed_companies";
  if (t === "advisor") return "followed_advisors";
  if (t === "investor") return "followed_investors";
  if (t === "sector") return "followed_sectors";
  if (t === "individual") return "followed_individuals";
  return null;
}

function getFollowKeyForSearchType(type: string): PortfolioFollowKey | null {
  const t = (type || "").toLowerCase().trim();
  if (t === "company" || t === "companies") return "followed_companies";
  if (t === "advisor" || t === "advisors") return "followed_advisors";
  if (t === "investor" || t === "investors") return "followed_investors";
  if (t === "sector" || t === "sectors" || t === "sub_sector" || t === "sub-sector")
    return "followed_sectors";
  if (t === "individual" || t === "individuals") return "followed_individuals";
  return null;
}

export default function MyPortfolioPage() {
  // Portfolio (followed) state
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [portfolioEntityType, setPortfolioEntityType] = useState("");
  const [rows, setRows] = useState<PortfolioEntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Follow more (global search) state
  const [followSearch, setFollowSearch] = useState("");
  const [followEntityType, setFollowEntityType] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const effectivePortfolioSearch = useMemo(() => portfolioSearch.trim(), [portfolioSearch]);
  const effectiveFollowSearch = useMemo(() => followSearch.trim(), [followSearch]);

  const filteredRows = useMemo(() => {
    const filter = (portfolioEntityType || "").trim().toLowerCase();
    if (!filter) return rows;
    return rows.filter((r) => String(r.entity || "").toLowerCase().trim() === filter);
  }, [rows, portfolioEntityType]);

  const filteredSearchResults = useMemo(() => {
    const filter = (followEntityType || "").trim().toLowerCase();
    if (!filter) return searchResults;
    return searchResults.filter((r) => {
      const t = (r.type || "").toLowerCase().trim();
      if (filter === "company") return t === "company" || t === "companies";
      if (filter === "advisor") return t === "advisor" || t === "advisors";
      if (filter === "investor") return t === "investor" || t === "investors";
      if (filter === "sector") return t === "sector" || t === "sectors" || t === "sub_sector";
      if (filter === "individual") return t === "individual" || t === "individuals";
      return false;
    });
  }, [searchResults, followEntityType]);

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
      if (effectivePortfolioSearch) qs.set("search", effectivePortfolioSearch);

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
    [effectivePortfolioSearch]
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

  // Global search for "Follow More" section
  useEffect(() => {
    if (effectiveFollowSearch.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      searchAbortRef.current?.abort();
      return;
    }

    searchAbortRef.current?.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;
    setSearchLoading(true);
    setSearchResults([]);

    const collected: GlobalSearchResult[] = [];
    fetchGlobalSearchProgressive(effectiveFollowSearch, null, {
      signal: ac.signal,
      sources: PORTFOLIO_FALLBACK_SOURCES,
      onBatch: (items) => {
        if (ac.signal.aborted) return;
        collected.push(...items);
        setSearchResults(sortSearchResults([...collected]));
      },
      onComplete: () => {
        if (ac.signal.aborted) return;
        setSearchResults(sortSearchResults(collected));
        setSearchLoading(false);
      },
      onError: () => {
        setSearchLoading(false);
      },
    });

    return () => {
      ac.abort();
    };
  }, [effectiveFollowSearch]);

  const handleUnfollow = useCallback(
    async (row: PortfolioEntityRow) => {
      const followKey = getFollowKeyForEntityType(String(row.entity));
      if (!followKey) return;
      const key = `${row.entity}-${row.id}`;
      setUnfollowingId(key);
      try {
        await unfollowPortfolioEntity({ followKey, entityId: row.id });
        toast.success(`Unfollowed ${row.name}`);
        await loadPortfolio(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to unfollow");
      } finally {
        setUnfollowingId(null);
      }
    },
    [loadPortfolio]
  );

  const handleFollow = useCallback(
    async (result: GlobalSearchResult) => {
      const followKey = getFollowKeyForSearchType(result.type);
      if (!followKey || !Number.isFinite(result.id) || result.id <= 0) return;
      const key = `${result.type}-${result.id}`;
      setFollowingId(key);
      try {
        await followPortfolioEntity({ followKey, entityId: result.id });
        toast.success(`Following ${result.title}`);
        setSearchResults((prev) =>
          prev.filter((r) => !(r.type === result.type && r.id === result.id))
        );
        await loadPortfolio(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to follow");
      } finally {
        setFollowingId(null);
      }
    },
    [loadPortfolio]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="w-full px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Portfolio</h1>
          <p className="text-gray-600">
            Companies, Advisors, Investors, Sectors, and Individuals you follow.
          </p>
        </div>

        {/* Search Portfolio Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Search Portfolio</h2>
            <span className="text-sm text-gray-500">
              {loading
                ? "Loading…"
                : `${filteredRows.length} ${filteredRows.length === 1 ? "result" : "results"}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  value={portfolioSearch}
                  onChange={(e) => setPortfolioSearch(e.target.value)}
                  placeholder="Search your followed entities..."
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
              <select
                value={portfolioEntityType}
                onChange={(e) => setPortfolioEntityType(e.target.value)}
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
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              Loading…
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Entity Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Entity Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRows.map((r, idx) => {
                    const href = getEntityHref(r);
                    const unfollowKey = `${r.entity}-${r.id}`;
                    const isUnfollowing = unfollowingId === unfollowKey;
                    return (
                      <tr key={`${r.entity}:${r.id}:${idx}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          {href ? (
                            <Link
                              href={href}
                              className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                            >
                              {r.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{r.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`inline-flex items-center gap-1.5 ${getEntityBadgeColor(String(r.entity))}`}
                          >
                            {getEntityIcon(String(r.entity))}
                            {formatEntityType(String(r.entity))}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUnfollowing}
                            onClick={() => handleUnfollow(r)}
                          >
                            {isUnfollowing ? "Removing…" : "Unfollow"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              {rows.length === 0
                ? "No followed entities found."
                : "No entities match the selected filter."}
              {portfolioSearch && " Try adjusting your search criteria."}
            </div>
          )}
        </div>

        {/* Follow More Entities Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Follow More Entities</h2>
            {effectiveFollowSearch.length >= 2 && !searchLoading && (
              <span className="text-sm text-gray-500">
                {filteredSearchResults.length}{" "}
                {filteredSearchResults.length === 1 ? "result" : "results"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  value={followSearch}
                  onChange={(e) => setFollowSearch(e.target.value)}
                  placeholder="Search for entities to follow..."
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
              <select
                value={followEntityType}
                onChange={(e) => setFollowEntityType(e.target.value)}
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

          {effectiveFollowSearch.length < 2 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              Type at least 2 characters to search for entities.
            </div>
          ) : searchLoading && filteredSearchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              Searching…
            </div>
          ) : filteredSearchResults.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Entity Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Entity Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSearchResults.map((r, idx) => {
                    const href = resolveSearchHref(r);
                    const followKey = getFollowKeyForSearchType(r.type);
                    const canFollow = followKey !== null;
                    const isFollowing = followingId === `${r.type}-${r.id}`;
                    return (
                      <tr key={`${r.type}-${r.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          {href ? (
                            <Link
                              href={href}
                              className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                            >
                              {r.title}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{r.title}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`inline-flex items-center gap-1.5 ${getEntityBadgeColor(r.type)}`}
                          >
                            {getEntityIcon(r.type)}
                            {getSearchBadgeLabel(r.type)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canFollow ? (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isFollowing}
                              onClick={() => handleFollow(r)}
                            >
                              {isFollowing ? "Adding…" : "Follow"}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              No entities found.
              {followSearch && " Try adjusting your search criteria."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
