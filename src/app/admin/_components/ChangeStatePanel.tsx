"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  type ChangeRequestItem,
  type ChangeRequestResponse,
  formatAiReasoningCard,
  getChangeRequestAiReasoning,
  getChangeRequestDiffText,
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
        <div className="space-y-1.5 text-[11px] leading-relaxed">
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

const CHANGE_REQUEST_TYPES = ["companies", "web_resource", "others"] as const;
type ChangeRequestType = (typeof CHANGE_REQUEST_TYPES)[number];

const CHANGE_REQUEST_TYPE_LABELS: Record<ChangeRequestType, string> = {
  companies: "Companies",
  web_resource: "Web resource",
  others: "Others",
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
  const [requestType, setRequestType] = useState<ChangeRequestType>("companies");
  /** Local checkbox state; merges with `item.reviewed` from API until persisted. */
  const [reviewOverrides, setReviewOverrides] = useState<Record<number, boolean>>(
    {}
  );
  /** IDs gathered from the current page when "Check all" is used before POST. */
  const [collectedPageIds, setCollectedPageIds] = useState<number[]>([]);

  useEffect(() => {
    setReviewOverrides({});
    setCollectedPageIds([]);
  }, [page, requestType]);

  const loadItems = useCallback(async (pageNum: number, type: ChangeRequestType) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        throw new Error("Authentication required");
      }
      const url = new URL("/api/change-request", window.location.origin);
      url.searchParams.set("type", type);
      url.searchParams.set("page", String(pageNum));
      url.searchParams.set("per_page", String(CHANGE_REQUEST_PER_PAGE));
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
        setReviewOverrides({});
        await loadItems(page, requestType);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to mark as viewed"
        );
      }
    },
    [loadItems, page, requestType]
  );

  useEffect(() => {
    void loadItems(page, requestType);
  }, [page, requestType, loadItems]);

  function selectRequestType(next: ChangeRequestType) {
    if (next === requestType) return;
    setRequestType(next);
    setPage(1);
  }

  function getReviewed(item: ChangeRequestItem): boolean {
    const o = reviewOverrides[item.id];
    if (typeof o === "boolean") return o;
    return item.reviewed ?? false;
  }

  async function handleCheckAllOnPage() {
    if (items.length === 0) return;
    const ids = items.map((i) => i.id);
    setCollectedPageIds(ids);
    await markAsViewedAndRefresh(ids);
  }

  const collectedIdsLabel = useMemo(() => {
    if (collectedPageIds.length === 0) return null;
    return `${collectedPageIds.length} ID${collectedPageIds.length === 1 ? "" : "s"} on page ${page}`;
  }, [collectedPageIds, page]);

  const linkClass =
    "min-w-0 break-all text-[11px] leading-snug text-blue-600 hover:underline";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Change detection
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Live diffs from Xano{" "}
            <code className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-500">
              change_request
            </code>
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
          aria-label="Change request type"
        >
          {CHANGE_REQUEST_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={requestType === t}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                requestType === t
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => selectRequestType(t)}
            >
              {CHANGE_REQUEST_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <button
            type="button"
            disabled={loading || items.length === 0}
            onClick={() => void handleCheckAllOnPage()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check all
          </button>
          {collectedIdsLabel ? (
            <span className="max-w-[14rem] truncate text-[11px] text-slate-500" title={collectedPageIds.join(", ")}>
              {collectedIdsLabel}
            </span>
          ) : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadItems(page, requestType)}
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

      {items.length > 0 && (
        <div
          className={`w-full overflow-x-auto ${loading ? "opacity-60" : ""}`}
        >
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "3.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "52%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "ID",
                  "Reviewed",
                  "Created",
                  "AI Reasoning",
                  "Added",
                  "Watch URL",
                  "Bucket",
                ].map((col) => (
                  <th
                    key={col}
                    className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:px-4 ${
                      col === "Reviewed"
                        ? "text-center"
                        : "text-left"
                    } ${col === "Added" ? "min-w-0" : ""}`}
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

                return (
                  <tr
                    key={item.id}
                    className={`h-px border-b border-gray-100 transition-colors hover:bg-blue-50/20 ${
                      i % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                    }`}
                  >
                    <td className="h-full align-top px-3 py-4 sm:px-4">
                      <div className="flex h-full min-h-full flex-col">
                        <span className="font-mono text-xs font-bold text-gray-400">
                          {item.id}
                        </span>
                      </div>
                    </td>
                    <td className="h-full align-top px-3 py-4 text-center sm:px-4">
                      <div className="flex h-full min-h-full items-start justify-center pt-0.5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                          checked={getReviewed(item)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              void markAsViewedAndRefresh([item.id]);
                            } else {
                              setReviewOverrides((prev) => ({
                                ...prev,
                                [item.id]: false,
                              }));
                            }
                          }}
                          aria-label={`Reviewed: record ${item.id}`}
                        />
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
                      <div className="flex h-full min-h-full">
                        <AddedDiffBlock items={addedItems} />
                      </div>
                    </td>
                    <td className="h-full min-w-0 align-top px-3 py-4 sm:px-4">
                      <div className="flex h-full min-h-full flex-col justify-start">
                        {item.watch_url ? (
                          <a
                            href={item.watch_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                          >
                            {item.watch_url}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="h-full align-top px-3 py-4 sm:px-4">
                      <div className="flex h-full min-h-full flex-col justify-start">
                        {item.bucket ? (
                          <span className="w-fit rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {item.bucket}
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

      {meta && (
        <div
          className="flex flex-col items-stretch gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="navigation"
          aria-label="Pagination"
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
            <div className="flex items-center justify-center gap-0 overflow-hidden rounded-lg border border-gray-200 bg-white text-xs shadow-sm sm:justify-end">
              <button
                type="button"
                className="px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="border-l border-gray-200 px-3 py-1.5 tabular-nums text-gray-500">
                {meta.page} / {meta.total_pages}
              </span>
              <button
                type="button"
                className="border-l border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={loading || page >= meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
