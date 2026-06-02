"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type ChangeRequestCompanyNotInDb,
  type ChangeRequestCompanyRef,
  type ChangeRequestItem,
  type ChangeRequestResponse,
  formatAiReasoningCard,
  formatCompanyNotInDbVerdict,
  getChangeRequestCompanies,
  getChangeRequestCompaniesNotInDb,
  getChangeRequestAiReasoning,
  getChangeRequestBucket,
  getChangeRequestDiffText,
  getCompanyNotInDbDisplayName,
  parseChangeMessageMeta,
  splitCreatedForDisplay,
  textToDiffItems,
  type DiffItem,
} from "@/lib/changeRequestDisplay";

const TAG_COLORS: Record<string, string> = {
  acquisition: "bg-blue-50 text-blue-700 border-blue-200",
  investment: "bg-purple-50 text-purple-700 border-purple-200",
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-red-50 text-red-600 border-red-200",
};

function getTagColor(tag: string) {
  const key = tag.split(":")[0]?.trim().toLowerCase() ?? "";
  return (
    TAG_COLORS[key] ??
    (tag.toLowerCase().includes("relevant")
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : tag.toLowerCase().includes("skip")
        ? "bg-orange-50 text-orange-800 border-orange-200"
        : "bg-gray-100 text-gray-600 border-gray-200")
  );
}

function CompanyNotInDbCard({
  entry,
  index,
}: {
  entry: ChangeRequestCompanyNotInDb;
  index: number;
}) {
  const isDa = entry.verdict === "da";
  const isNotDa = entry.verdict === "not_da";
  const displayName = getCompanyNotInDbDisplayName(entry);
  const verdictLabel = formatCompanyNotInDbVerdict(entry.verdict);

  return (
    <div
      className={[
        "relative min-w-0 rounded-lg border p-2.5 text-left shadow-sm transition",
        isDa
          ? "border-emerald-400 border-l-4 border-l-emerald-600 bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 shadow-lg shadow-emerald-200/60 ring-2 ring-emerald-400/80 ring-offset-1"
          : isNotDa
            ? "border-slate-200 bg-slate-50/80"
            : "border-amber-200 bg-amber-50/70",
      ].join(" ")}
    >
      {isDa ? (
        <span className="absolute -right-1 -top-1 animate-pulse rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md">
          New D&A
        </span>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-start gap-1.5">
        <p
          className={[
            "min-w-0 flex-1 break-words text-[11px] leading-snug [overflow-wrap:anywhere]",
            isDa
              ? "font-bold text-emerald-950"
              : isNotDa
                ? "font-medium text-slate-700"
                : "font-medium text-amber-900",
          ].join(" ")}
        >
          {displayName}
        </p>
        {verdictLabel ? (
          <span
            className={[
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
              isDa
                ? "border-emerald-600 bg-emerald-600 text-white"
                : isNotDa
                  ? "border-slate-300 bg-white text-slate-500"
                  : "border-amber-300 bg-white text-amber-700",
            ].join(" ")}
          >
            {verdictLabel}
          </span>
        ) : null}
        {entry.confidence ? (
          <span
            className={[
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium capitalize",
              isDa
                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                : "border-slate-200 bg-white text-slate-500",
            ].join(" ")}
          >
            {entry.confidence}
          </span>
        ) : null}
      </div>
      {entry.website ? (
        <a
          href={entry.website}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "mt-1.5 block break-all text-[10px] hover:underline [overflow-wrap:anywhere]",
            isDa ? "font-medium text-emerald-700" : "text-blue-600",
          ].join(" ")}
        >
          {entry.website}
        </a>
      ) : null}
      {entry.reasoning ? (
        <p
          className={[
            "mt-1.5 line-clamp-4 text-[10px] leading-relaxed [overflow-wrap:anywhere]",
            isDa ? "text-emerald-900/90" : "text-slate-500",
          ].join(" ")}
        >
          {entry.reasoning}
        </p>
      ) : null}
      <span className="sr-only">{`Company not in DB ${index + 1}`}</span>
    </div>
  );
}

const COMPANIES_IN_DB_COLLAPSED_LIMIT = 6;
const COMPANIES_NOT_IN_DB_COLLAPSED_LIMIT = 3;

function ExpandCountButton({
  hiddenCount,
  expanded,
  onToggle,
}: {
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (hiddenCount <= 0 && !expanded) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
      aria-expanded={expanded}
    >
      {expanded ? "Show less" : `+${hiddenCount} more`}
    </button>
  );
}

function ChangeRequestCompaniesCell({
  companies,
  companiesNotInDb,
}: {
  companies: ChangeRequestCompanyRef[];
  companiesNotInDb: ChangeRequestCompanyNotInDb[];
}) {
  const [showAllInDb, setShowAllInDb] = useState(false);
  const [showAllNotInDb, setShowAllNotInDb] = useState(false);

  const inDbCollapsed = companies.length > COMPANIES_IN_DB_COLLAPSED_LIMIT;
  const visibleInDb =
    showAllInDb || !inDbCollapsed
      ? companies
      : companies.slice(0, COMPANIES_IN_DB_COLLAPSED_LIMIT);
  const hiddenInDbCount = inDbCollapsed
    ? companies.length - COMPANIES_IN_DB_COLLAPSED_LIMIT
    : 0;

  const notInDbCollapsed =
    companiesNotInDb.length > COMPANIES_NOT_IN_DB_COLLAPSED_LIMIT;
  const visibleNotInDb =
    showAllNotInDb || !notInDbCollapsed
      ? companiesNotInDb
      : companiesNotInDb.slice(0, COMPANIES_NOT_IN_DB_COLLAPSED_LIMIT);
  const hiddenNotInDbCount = notInDbCollapsed
    ? companiesNotInDb.length - COMPANIES_NOT_IN_DB_COLLAPSED_LIMIT
    : 0;

  if (companies.length === 0 && companiesNotInDb.length === 0) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  return (
    <div className="flex h-full min-h-full flex-col gap-2">
      {companies.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {visibleInDb.map((c) => (
            <Link
              key={c.id}
              href={`/company/${c.id}`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium leading-snug text-slate-700 hover:bg-slate-100 [overflow-wrap:anywhere]"
            >
              {c.name}
            </Link>
          ))}
          <ExpandCountButton
            hiddenCount={hiddenInDbCount}
            expanded={showAllInDb}
            onToggle={() => setShowAllInDb((prev) => !prev)}
          />
        </div>
      ) : null}
      {companiesNotInDb.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
            Not in DB
            {notInDbCollapsed && !showAllNotInDb ? (
              <span className="ml-1.5 font-bold normal-case tracking-normal text-amber-700">
                ({companiesNotInDb.length})
              </span>
            ) : null}
            {companiesNotInDb.some((c) => c.verdict === "da") ? (
              <span className="ml-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-white">
                D&A found
              </span>
            ) : null}
          </p>
          <div className="space-y-2">
            {visibleNotInDb.map((entry, idx) => (
              <CompanyNotInDbCard
                key={`${entry.company_name ?? entry.website ?? idx}-${idx}`}
                entry={entry}
                index={idx}
              />
            ))}
          </div>
          <ExpandCountButton
            hiddenCount={hiddenNotInDbCount}
            expanded={showAllNotInDb}
            onToggle={() => setShowAllNotInDb((prev) => !prev)}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Green diff column only — height grows with content (defines row height). */
function AddedDiffBlock({ items }: { items: DiffItem[] }) {
  if (!items || items.length === 0) {
    return (
      <span className="text-xs italic text-gray-300">No changes</span>
    );
  }

  return (
    <div className="min-h-full min-w-0 max-w-full rounded-lg border border-green-200 bg-green-50/60">
      <div className="min-h-0 overflow-x-hidden p-2.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-green-600">
          + Added
        </p>
        <div className="space-y-1.5 text-xs leading-relaxed">
          {items.map((item, i) => (
            <div
              key={i}
              className={[
                "hyphens-auto break-words [overflow-wrap:anywhere]",
                item.muted ? "italic text-gray-400" : "",
                item.dim ? "text-gray-500" : "",
                item.highlight ? "font-medium text-green-800" : "",
                !item.muted && !item.dim && !item.highlight ? "text-gray-700" : "",
              ].join(" ")}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sub-tabs: `all` uses `get_change_state_all`; others use `change_request` + `type`. */
const CHANGE_STATE_TABS = [
  "all",
  "companies",
  "web_resource",
  "others",
] as const;
type ChangeStateTabId = (typeof CHANGE_STATE_TABS)[number];

const CHANGE_STATE_TAB_LABELS: Record<ChangeStateTabId, string> = {
  companies: "Companies",
  web_resource: "Web resource",
  others: "Others",
  all: "All",
};

const CHANGE_REQUEST_PER_PAGE = 50;

export function ChangeStateTab() {
  const [items, setItems] = useState<ChangeRequestItem[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ChangeStateTabId>("all");
  /** Gmail-style row selection (current page only; cleared on tab/page change). */
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [page, activeTab]);

  const loadItems = useCallback(async (pageNum: number, tab: ChangeStateTabId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        throw new Error("Authentication required");
      }
      const url =
        tab === "all"
          ? new URL("/api/change-state-all", window.location.origin)
          : new URL("/api/change-request", window.location.origin);
      url.searchParams.set("page", String(pageNum));
      url.searchParams.set("per_page", String(CHANGE_REQUEST_PER_PAGE));
      if (tab !== "all") {
        url.searchParams.set("type", tab);
      }
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      const raw = await res.json().catch(() => null);
      if (!res.ok) {
        const errBody =
          raw && typeof raw === "object"
            ? (raw as { error?: string })
            : null;
        throw new Error(
          (errBody?.error && typeof errBody.error === "string"
            ? errBody.error
            : null) || `Request failed (${res.status})`
        );
      }
      const data = raw as ChangeRequestResponse | null;
      if (data && Array.isArray(data.items)) {
        setItems(data.items);
        setMeta({
          total:
            typeof data.total === "number" ? data.total : data.items.length,
          page: typeof data.page === "number" ? data.page : pageNum,
          per_page:
            typeof data.per_page === "number"
              ? data.per_page
              : CHANGE_REQUEST_PER_PAGE,
          total_pages:
            typeof data.total_pages === "number" ? data.total_pages : 1,
        });
      } else {
        setItems([]);
        setMeta(null);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load change requests"
      );
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsViewedAndRefresh = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      setError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) throw new Error("Authentication required");
        const res = await fetch("/api/mark-as-viewed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ change_state_id: ids }),
        });
        const raw = await res.json().catch(() => null);
        if (!res.ok) {
          const errBody =
            raw && typeof raw === "object"
              ? (raw as { error?: string })
              : null;
          throw new Error(
            (errBody?.error && typeof errBody.error === "string"
              ? errBody.error
              : null) || `Request failed (${res.status})`
          );
        }
        setSelectedRowIds([]);
        await loadItems(page, activeTab);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to mark as viewed"
        );
      }
    },
    [loadItems, page, activeTab]
  );

  const unmarkAsViewedAndRefresh = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      setError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) throw new Error("Authentication required");
        const res = await fetch("/api/unmark-as-viewed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ change_state_id: ids }),
        });
        const raw = await res.json().catch(() => null);
        if (!res.ok) {
          const errBody =
            raw && typeof raw === "object"
              ? (raw as { error?: string })
              : null;
          throw new Error(
            (errBody?.error && typeof errBody.error === "string"
              ? errBody.error
              : null) || `Request failed (${res.status})`
          );
        }
        setSelectedRowIds([]);
        await loadItems(page, activeTab);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to unmark as viewed"
        );
      }
    },
    [loadItems, page, activeTab]
  );

  useEffect(() => {
    void loadItems(page, activeTab);
  }, [page, activeTab, loadItems]);

  function selectTab(next: ChangeStateTabId) {
    if (next === activeTab) return;
    setActiveTab(next);
    setPage(1);
  }

  function isRowSelected(id: number): boolean {
    return selectedRowIds.includes(id);
  }

  function toggleRowSelected(id: number) {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedOnPageCount = useMemo(
    () => items.filter((i) => selectedRowIds.includes(i.id)).length,
    [items, selectedRowIds]
  );

  const allOnPageSelected =
    items.length > 0 && selectedOnPageCount === items.length;
  const someOnPageSelected =
    selectedOnPageCount > 0 && !allOnPageSelected;

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  function toggleSelectAllOnPage() {
    if (items.length === 0) return;
    if (allOnPageSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(items.map((i) => i.id));
    }
  }

  function clearRowSelection() {
    setSelectedRowIds([]);
  }

  function getReviewed(item: ChangeRequestItem): boolean {
    return item.reviewed ?? false;
  }

  async function handleBulkMarkAsRead() {
    if (selectedRowIds.length === 0) return;
    await markAsViewedAndRefresh(selectedRowIds);
  }

  async function handleBulkMarkAsUnread() {
    if (selectedRowIds.length === 0) return;
    await unmarkAsViewedAndRefresh(selectedRowIds);
  }

  const linkClass =
    "min-w-0 break-all text-[11px] leading-snug text-blue-600 hover:underline";

  function getVisiblePageNumbers(currentPage: number, totalPages: number) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];

    if (currentPage > 3) {
      pages.push(2);
    }

    if (currentPage > 4) {
      pages.push("ellipsis-left");
    }

    for (
      let pageNumber = Math.max(3, currentPage - 1);
      pageNumber <= Math.min(totalPages - 2, currentPage + 1);
      pageNumber += 1
    ) {
      if (!pages.includes(pageNumber)) {
        pages.push(pageNumber);
      }
    }

    if (currentPage < totalPages - 3) {
      pages.push("ellipsis-right");
    }

    if (currentPage < totalPages - 2) {
      pages.push(totalPages - 1);
    }

    pages.push(totalPages);

    return pages;
  }

  function renderPagination(variant: "top" | "bottom") {
    if (!meta) return null;
    const edge =
      variant === "top"
        ? "border-b border-gray-100"
        : "border-t border-gray-100";
    const visiblePages = getVisiblePageNumbers(meta.page, meta.total_pages);
    return (
      <div
        className={`flex flex-col items-stretch gap-3 ${edge} bg-gray-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between`}
        role="navigation"
        aria-label={
          variant === "top" ? "Pagination (top)" : "Pagination (bottom)"
        }
      >
        <p className="text-center text-[11px] text-gray-500 sm:text-left">
          <span className="font-medium text-gray-700">
            {meta.total.toLocaleString()} total
          </span>
          {meta.total_pages > 1 ? (
            <span className="text-gray-400">
              {" "}
              · Page {meta.page} of {meta.total_pages}
            </span>
          ) : null}
        </p>
        {meta.total_pages > 1 ? (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Prev
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {visiblePages.map((pageNumber, index) =>
                typeof pageNumber === "number" ? (
                  <button
                    key={`${variant}-page-${pageNumber}`}
                    type="button"
                    className={`min-w-9 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
                      pageNumber === meta.page
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    disabled={loading}
                    onClick={() => setPage(pageNumber)}
                    aria-current={pageNumber === meta.page ? "page" : undefined}
                    aria-label={`Go to page ${pageNumber}`}
                  >
                    {pageNumber}
                  </button>
                ) : (
                  <span
                    key={`${variant}-${pageNumber}-${index}`}
                    className="px-1 text-xs font-medium text-gray-400"
                    aria-hidden
                  >
                    ...
                  </span>
                )
              )}
            </div>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || page >= meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Change detection
          </h2>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-gray-400">
            Live diffs from Xano{" "}
            <code className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-500">
              {activeTab === "all"
                ? "get_change_state_all"
                : "change_request"}
            </code>
            . Select rows, then use Mark as read / Mark as unread (like Gmail).
            Reviewed state is shared across tabs after refresh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />{" "}
            Added diff
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex gap-0.5 rounded-lg border border-gray-200 bg-white p-1"
          role="tablist"
          aria-label="Change state tabs"
        >
          {CHANGE_STATE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={activeTab === t}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === t
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => selectTab(t)}
            >
              {CHANGE_STATE_TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadItems(page, activeTab)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M14 8A6 6 0 1 1 8 2c1.8 0 3.4.8 4.5 2" />
              <path d="M14 2v4h-4" />
            </svg>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {items.length > 0 && selectedRowIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/70 px-5 py-2.5">
          <span className="text-xs font-medium text-slate-800">
            {selectedRowIds.length} selected
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleBulkMarkAsRead()}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Mark as read
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleBulkMarkAsUnread()}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Mark as unread
          </button>
          <button
            type="button"
            onClick={clearRowSelection}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {error && (
        <div
          className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && items.length === 0 && !error && (
        <div className="py-14 text-center">
          <p className="text-sm font-medium text-gray-600">
            Loading change requests…
          </p>
          <p className="mt-1 text-xs text-gray-400">Fetching from Xano</p>
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="py-14 text-center">
          <p className="text-sm font-medium text-gray-600">
            No change requests
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Try another tab or refresh.
          </p>
        </div>
      )}

      {meta && items.length > 0 ? renderPagination("top") : null}

      {items.length > 0 && (
        <div
          className={`w-full overflow-x-auto ${loading ? "opacity-60" : ""}`}
        >
          <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "2.8%" }} />
              <col style={{ width: "3%" }} />
              <col style={{ width: "3.2%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "32.5%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "8.5%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-2 py-2.5 text-center sm:px-3">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    disabled={items.length === 0 || loading}
                    aria-label="Select all rows on this page"
                  />
                </th>
                {[
                  "ID",
                  "Read",
                  "Created",
                  "AI Reasoning",
                  "Companies",
                  "Added",
                  "Watch URL",
                  "Bucket",
                ].map((col) => (
                  <th
                    key={col}
                    className={`py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 ${
                      col === "Read" ? "text-center" : "text-left"
                    } ${
                      col === "Added"
                        ? "min-w-0 px-3 sm:px-4"
                        : col === "Watch URL" || col === "Bucket"
                          ? "w-[1%] whitespace-nowrap px-1.5 sm:px-2"
                          : "px-3 sm:px-4"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const m = parseChangeMessageMeta(item);
                const created = splitCreatedForDisplay(item, m);
                const reasoning = formatAiReasoningCard(
                  getChangeRequestAiReasoning(item)
                );
                const addedRaw = getChangeRequestDiffText(item, "added_text");
                const addedItems = textToDiffItems(addedRaw, "added");
                const companies = getChangeRequestCompanies(item);
                const companiesNotInDb =
                  getChangeRequestCompaniesNotInDb(item);
                const bucketLabel = getChangeRequestBucket(item);

                return (
                  <tr
                    key={item.id}
                    className={`h-px border-b border-gray-100 transition-colors hover:bg-blue-50/20 ${
                      i % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                    }`}
                  >
                    <td className="h-full align-top px-2 py-4 text-center sm:px-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                        checked={isRowSelected(item.id)}
                        onChange={() => toggleRowSelected(item.id)}
                        aria-label={`Select row ${item.id}`}
                      />
                    </td>
                    <td className="h-full align-top px-3 py-4 sm:px-4">
                      <div className="flex h-full min-h-full flex-col">
                        <span className="font-mono text-xs font-bold text-gray-400">
                          {item.id}
                        </span>
                      </div>
                    </td>
                    <td className="h-full align-top px-3 py-4 text-center sm:px-4">
                      <div
                        className="flex h-full min-h-full items-start justify-center pt-0.5"
                        title={getReviewed(item) ? "Read" : "Unread"}
                      >
                        {getReviewed(item) ? (
                          <CheckIcon
                            className="h-4 w-4 text-emerald-600"
                            aria-hidden
                          />
                        ) : (
                          <span
                            className="mx-auto block h-4 w-4 rounded border border-dashed border-gray-300 bg-white"
                            aria-hidden
                          />
                        )}
                      </div>
                    </td>
                    <td className="h-full align-top px-3 py-4 sm:px-4">
                      <div className="flex h-full min-h-full flex-col">
                        <div className="text-xs font-medium text-gray-700">
                          {created.line1}
                        </div>
                        {created.line2 ? (
                          <div className="mt-0.5 text-[11px] text-gray-400">
                            {created.line2}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="h-full min-w-0 align-top px-3 py-4 sm:px-4">
                      <div className="flex h-full min-h-full flex-col">
                        {reasoning ? (
                          <div className="min-w-0 space-y-1.5 break-words">
                            <p className="text-xs font-semibold leading-snug text-gray-900">
                              {reasoning.title}
                            </p>
                            {reasoning.body ? (
                              <p className="text-[11px] leading-relaxed text-gray-500 [overflow-wrap:anywhere]">
                                {reasoning.body}
                              </p>
                            ) : null}
                            {reasoning.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {reasoning.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${getTagColor(tag)}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="h-full min-w-0 align-top px-3 py-4 sm:px-4">
                      <ChangeRequestCompaniesCell
                        companies={companies}
                        companiesNotInDb={companiesNotInDb}
                      />
                    </td>
                    <td className="h-full min-w-0 align-top px-3 py-4 sm:px-4">
                      <div className="flex h-full min-h-full">
                        <AddedDiffBlock items={addedItems} />
                      </div>
                    </td>
                    <td className="h-full min-w-0 align-top px-1.5 py-4 sm:px-2">
                      <div className="flex h-full min-h-full flex-col justify-start">
                        {item.watch_url ? (
                          <a
                            href={item.watch_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={item.watch_url}
                            className={`${linkClass} block break-all [overflow-wrap:anywhere]`}
                          >
                            {item.watch_url}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="h-full min-w-0 align-top px-1.5 py-4 sm:px-2">
                      <div className="flex h-full min-h-full flex-col justify-start">
                        {bucketLabel ? (
                          <span className="w-fit rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {bucketLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {renderPagination("bottom")}
    </div>
  );
}
