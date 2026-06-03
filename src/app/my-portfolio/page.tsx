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
import { usePortfolioStore, type XanoPortfolio } from "@/store/portfolioStore";
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
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

const ALL_FOLLOWED_TAB = "__all__";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getEntityIcon = (type: string) => {
  const t = (type || "").toLowerCase().trim();
  const cls = "size-3.5 shrink-0";
  switch (t) {
    case "company":      return <BuildingOffice2Icon className={cls} />;
    case "individual":   return <UserIcon className={cls} />;
    case "investor":     return <ArrowTrendingUpIcon className={cls} />;
    case "advisor":      return <UsersIcon className={cls} />;
    case "sector":       return <MapPinIcon className={cls} />;
    default:             return null;
  }
};

const getEntityBadgeColor = (type: string) => {
  const t = (type || "").toLowerCase().trim();
  switch (t) {
    case "company":    return "bg-green-50 text-green-700 border-green-200";
    case "individual": return "bg-purple-50 text-purple-700 border-purple-200";
    case "investor":   return "bg-orange-50 text-orange-700 border-orange-200";
    case "advisor":    return "bg-blue-50 text-blue-700 border-blue-200";
    case "sector":     return "bg-amber-50 text-amber-700 border-amber-200";
    default:           return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const formatEntityType = (entity: string) => {
  const s = (entity || "").trim().toLowerCase();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getEntityHref = (row: PortfolioEntityRow): string | null => {
  const t = String(row.entity || "").trim().toLowerCase();
  if (!Number.isFinite(row.id) || row.id <= 0) return null;
  switch (t) {
    case "company":    return `/company/${row.id}`;
    case "advisor":    return `/advisor/${row.id}`;
    case "investor":   return `/investors/${row.id}`;
    case "sector":     return `/sector/${row.id}`;
    case "individual": return `/individual/${row.id}`;
    default:           return null;
  }
};

function getFollowKeyForEntityType(type: string): PortfolioFollowKey | null {
  const t = (type || "").toLowerCase().trim();
  if (t === "company")    return "followed_companies";
  if (t === "advisor")    return "followed_advisors";
  if (t === "investor")   return "followed_investors";
  if (t === "sector")     return "followed_sectors";
  if (t === "individual") return "followed_individuals";
  return null;
}

function getFollowKeyForSearchType(type: string): PortfolioFollowKey | null {
  const t = (type || "").toLowerCase().trim();
  if (t === "company"    || t === "companies")  return "followed_companies";
  if (t === "advisor"    || t === "advisors")   return "followed_advisors";
  if (t === "investor"   || t === "investors")  return "followed_investors";
  if (t === "sector"     || t === "sectors" || t === "sub_sector" || t === "sub-sector")
    return "followed_sectors";
  if (t === "individual" || t === "individuals") return "followed_individuals";
  return null;
}

/** Returns true when a flat row belongs to the given Xano portfolio. */
function isRowInPortfolio(row: PortfolioEntityRow, p: XanoPortfolio): boolean {
  const t = String(row.entity).toLowerCase().trim();
  const id = row.id;
  if (t === "company")    return p.followed_companies.includes(id);
  if (t === "sector")     return p.followed_sectors.includes(id);
  if (t === "individual") return p.followed_individuals.includes(id);
  if (t === "investor")   return p.followed_investors.includes(id);
  if (t === "advisor")    return p.followed_advisors.includes(id);
  return false;
}

function portfolioEntityCount(p: XanoPortfolio): number {
  return (
    p.followed_companies.length +
    p.followed_sectors.length +
    p.followed_individuals.length +
    p.followed_investors.length +
    p.followed_advisors.length
  );
}

// ---------------------------------------------------------------------------
// DeleteListModal
// ---------------------------------------------------------------------------

function DeleteListModal({
  portfolio,
  onConfirm,
  onCancel,
}: {
  portfolio: XanoPortfolio;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const count = portfolioEntityCount(portfolio);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Delete &ldquo;{portfolio.portfolio_label || "this portfolio"}&rdquo;?
        </h3>
        <p className="text-sm text-gray-600 mb-1">
          This will permanently remove the portfolio and its{" "}
          <strong>{count}</strong> saved {count === 1 ? "entity" : "entities"}.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Your global follows are not affected — entities you follow will remain
          in your &ldquo;All Followed&rdquo; view.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete portfolio</Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MyPortfolioPage() {
  // ---- Store ----
  const xanoPortfolios = usePortfolioStore((s) => s.portfolios);
  const storeLoading = usePortfolioStore((s) => s.loading);
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);

  // Named portfolios (non-empty label) become list tabs
  const namedPortfolios = useMemo(
    () => xanoPortfolios.filter((p) => p.portfolio_label.trim()),
    [xanoPortfolios]
  );

  // ---- Tab state ----
  const [activeTabId, setActiveTabId] = useState<string>(ALL_FOLLOWED_TAB);

  // Keep activeTabId valid when portfolios change
  useEffect(() => {
    if (activeTabId === ALL_FOLLOWED_TAB) return;
    const still = namedPortfolios.some((p) => String(p.id) === activeTabId);
    if (!still) setActiveTabId(ALL_FOLLOWED_TAB);
  }, [namedPortfolios, activeTabId]);

  const activePortfolio = useMemo(
    () => namedPortfolios.find((p) => String(p.id) === activeTabId) ?? null,
    [namedPortfolios, activeTabId]
  );

  // ---- New list input ----
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const newListInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewListInput) newListInputRef.current?.focus();
  }, [showNewListInput]);

  // ---- Rename (optimistic in-memory only until PATCH endpoint is provided) ----
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [localLabels, setLocalLabels] = useState<Record<number, string>>({});
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId != null) renameInputRef.current?.focus();
  }, [renamingId]);

  // ---- Delete ----
  const [deletingPortfolio, setDeletingPortfolio] = useState<XanoPortfolio | null>(null);

  // ---- Portfolio (followed) state ----
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [portfolioEntityType, setPortfolioEntityType] = useState("");
  const [rows, setRows] = useState<PortfolioEntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Follow more (global search) ----
  const [followSearch, setFollowSearch] = useState("");
  const [followEntityType, setFollowEntityType] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const effectivePortfolioSearch = useMemo(() => portfolioSearch.trim(), [portfolioSearch]);
  const effectiveFollowSearch = useMemo(() => followSearch.trim(), [followSearch]);

  // ---- Filtered rows for the active tab ----
  const filteredRows = useMemo(() => {
    let base = rows;

    if (activeTabId !== ALL_FOLLOWED_TAB && activePortfolio) {
      base = base.filter((r) => isRowInPortfolio(r, activePortfolio));
    }

    const filter = (portfolioEntityType || "").trim().toLowerCase();
    if (!filter) return base;
    return base.filter((r) => String(r.entity || "").toLowerCase().trim() === filter);
  }, [rows, portfolioEntityType, activeTabId, activePortfolio]);

  const filteredSearchResults = useMemo(() => {
    const filter = (followEntityType || "").trim().toLowerCase();
    if (!filter) return searchResults;
    return searchResults.filter((r) => {
      const t = (r.type || "").toLowerCase().trim();
      if (filter === "company")    return t === "company"    || t === "companies";
      if (filter === "advisor")    return t === "advisor"    || t === "advisors";
      if (filter === "investor")   return t === "investor"   || t === "investors";
      if (filter === "sector")     return t === "sector"     || t === "sectors" || t === "sub_sector";
      if (filter === "individual") return t === "individual" || t === "individuals";
      return false;
    });
  }, [searchResults, followEntityType]);

  // ---- Load portfolio flat list ----
  const loadPortfolio = useCallback(
    async (silent = false) => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : null;

      if (!silent) { setLoading(true); setError(null); }
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
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }

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
        if (!silent) setError((e as Error).message || "Failed to load portfolio");
        setRows([]);
        return [];
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [effectivePortfolioSearch]
  );

  useEffect(() => {
    const t = window.setTimeout(() => { loadPortfolio(); }, 250);
    return () => { window.clearTimeout(t); abortRef.current?.abort(); };
  }, [loadPortfolio]);

  // ---- Global search for Follow More ----
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
      onError: () => { setSearchLoading(false); },
    });

    return () => { ac.abort(); };
  }, [effectiveFollowSearch]);

  // ---- Follow / unfollow ----
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
        await fetchPortfolio();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to unfollow");
      } finally {
        setUnfollowingId(null);
      }
    },
    [loadPortfolio, fetchPortfolio]
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
        await fetchPortfolio();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to follow");
      } finally {
        setFollowingId(null);
      }
    },
    [loadPortfolio, fetchPortfolio]
  );

  // ---- Create list ----
  const handleCreateList = useCallback(async () => {
    const name = newListName.trim();
    if (!name || creatingList) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;

    if (!token) {
      toast.error("Please sign in to create a list.");
      return;
    }

    setCreatingList(true);
    try {
      const res = await fetch("/api/portfolio/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-asym-token": token },
        credentials: "include",
        body: JSON.stringify({ label: name }),
      });

      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;

      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : `Failed (${res.status})`);
        return;
      }

      const newId =
        json && typeof json.id === "number"
          ? json.id
          : json && typeof json.id === "string"
          ? Number.parseInt(json.id as string, 10)
          : null;

      const returnedLabel =
        json && typeof json.label === "string" ? json.label : name;

      setNewListName("");
      setShowNewListInput(false);

      // Refresh store portfolios so the new tab appears
      await fetchPortfolio();

      if (newId != null && Number.isFinite(newId)) {
        setActiveTabId(String(newId));
      }

      toast.success(`Portfolio &ldquo;${returnedLabel}&rdquo; created`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create portfolio");
    } finally {
      setCreatingList(false);
    }
  }, [newListName, creatingList, fetchPortfolio]);

  // ---- Rename (optimistic / local override until PATCH endpoint) ----
  const handleStartRename = useCallback((p: XanoPortfolio) => {
    setRenamingId(p.id);
    setRenameValue(localLabels[p.id] ?? p.portfolio_label);
  }, [localLabels]);

  const handleConfirmRename = useCallback(() => {
    const name = renameValue.trim();
    if (!name || renamingId == null) return;
    setLocalLabels((prev) => ({ ...prev, [renamingId]: name }));
    setRenamingId(null);
    toast.success("Renamed (will persist after rename API is connected)");
  }, [renameValue, renamingId]);

  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
  }, []);

  // ---- Delete (optimistic / local until DELETE endpoint) ----
  const handleDeletePortfolio = useCallback(
    async (p: XanoPortfolio) => {
      // TODO: call DELETE /api/portfolio/lists/:id when endpoint is available
      setDeletingPortfolio(null);
      if (activeTabId === String(p.id)) setActiveTabId(ALL_FOLLOWED_TAB);
      toast("Delete API not yet connected — portfolio will reappear on refresh", {
        icon: "⚠️",
      });
    },
    [activeTabId]
  );

  // ---- Helpers ----
  const getDisplayLabel = (p: XanoPortfolio) =>
    localLabels[p.id] ?? p.portfolio_label;

  const tabEntityCount = (p: XanoPortfolio) => portfolioEntityCount(p);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {deletingPortfolio && (
        <DeleteListModal
          portfolio={deletingPortfolio}
          onConfirm={() => handleDeletePortfolio(deletingPortfolio)}
          onCancel={() => setDeletingPortfolio(null)}
        />
      )}

      <div className="w-full px-6 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Portfolio</h1>
            <p className="text-gray-600">
              Companies, Advisors, Investors, Sectors, and Individuals you follow.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 mt-1"
            onClick={() => { setShowNewListInput((v) => !v); setNewListName(""); }}
          >
            <PlusIcon className="size-4 mr-1.5" />
            New Portfolio
          </Button>
        </div>

        {/* New portfolio inline input */}
        {showNewListInput && (
          <div className="mb-4 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <input
              ref={newListInputRef}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Portfolio name…"
              className="flex-1 text-sm outline-none border-none"
              disabled={creatingList}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateList();
                if (e.key === "Escape" && !creatingList) {
                  setShowNewListInput(false);
                  setNewListName("");
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => void handleCreateList()}
              disabled={!newListName.trim() || creatingList}
            >
              {creatingList ? "Creating…" : "Create"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={creatingList}
              onClick={() => { setShowNewListInput(false); setNewListName(""); }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 border-b border-gray-200">
          {/* All Followed tab */}
          <TabButton
            label="All Followed"
            count={rows.length}
            active={activeTabId === ALL_FOLLOWED_TAB}
            loading={storeLoading && xanoPortfolios.length === 0}
            onClick={() => setActiveTabId(ALL_FOLLOWED_TAB)}
          />

          {/* Named portfolio tabs from Xano */}
          {namedPortfolios.map((p) => (
            <div key={p.id} className="relative group flex items-center">
              {renamingId === p.id ? (
                <div className="flex items-center gap-1 px-3 py-2">
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="text-sm border-b border-gray-400 outline-none bg-transparent w-28"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename();
                      if (e.key === "Escape") handleCancelRename();
                    }}
                  />
                  <button type="button" onClick={handleConfirmRename} className="text-green-600 hover:text-green-700">
                    <CheckIcon className="size-4" />
                  </button>
                  <button type="button" onClick={handleCancelRename} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <TabButton
                    label={getDisplayLabel(p)}
                    count={tabEntityCount(p)}
                    active={activeTabId === String(p.id)}
                    onClick={() => setActiveTabId(String(p.id))}
                  />
                  {/* Rename / delete on hover */}
                  <div className="absolute right-0 top-0 h-full flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Rename portfolio"
                      onClick={(e) => { e.stopPropagation(); handleStartRename(p); }}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <PencilIcon className="size-3" />
                    </button>
                    <button
                      type="button"
                      title="Delete portfolio"
                      onClick={(e) => { e.stopPropagation(); setDeletingPortfolio(p); }}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="size-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Loading skeleton for tabs */}
          {storeLoading && xanoPortfolios.length === 0 && (
            <div className="px-4 py-2.5 text-sm text-gray-400 animate-pulse">Loading…</div>
          )}
        </div>

        {/* Active portfolio name header */}
        {activeTabId !== ALL_FOLLOWED_TAB && activePortfolio && (
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {getDisplayLabel(activePortfolio)}
            </h2>
            <span className="text-sm text-gray-500">
              {tabEntityCount(activePortfolio)}{" "}
              {tabEntityCount(activePortfolio) === 1 ? "entity" : "entities"}
            </span>
          </div>
        )}

        {/* Search Portfolio Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTabId === ALL_FOLLOWED_TAB
                ? "Search Portfolio"
                : `Search in &ldquo;${activePortfolio ? getDisplayLabel(activePortfolio) : ""}&rdquo;`}
            </h2>
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
                  <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
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
                            <Link href={href} className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2">
                              {r.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{r.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${getEntityBadgeColor(String(r.entity))}`}>
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
              {activeTabId !== ALL_FOLLOWED_TAB && activePortfolio
                ? tabEntityCount(activePortfolio) === 0
                  ? "This portfolio has no entities yet."
                  : "No entities match your current filters."
                : rows.length === 0
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
                  <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
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
                    <th className="text-center px-4 py-3 font-medium text-gray-700">Entity Type</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-700">Actions</th>
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
                            <Link href={href} className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2">
                              {r.title}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{r.title}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${getEntityBadgeColor(r.type)}`}>
                            {getEntityIcon(r.type)}
                            <span className="capitalize">{getSearchBadgeLabel(r.type)}</span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canFollow && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isFollowing}
                              onClick={() => handleFollow(r)}
                            >
                              {isFollowing ? "Adding…" : "Follow"}
                            </Button>
                          )}
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

// ---------------------------------------------------------------------------
// TabButton
// ---------------------------------------------------------------------------

function TabButton({
  label,
  count,
  active,
  loading = false,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={[
        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors",
        active
          ? "border-violet-600 text-violet-700 bg-violet-50"
          : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs px-1.5 font-medium",
          active ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-600",
        ].join(" ")}
      >
        {loading ? "…" : count}
      </span>
    </button>
  );
}
