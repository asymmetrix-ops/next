"use client";

import React, { useCallback, useEffect, useState } from "react";

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

function DiffBlock({
  items,
  variant,
}: {
  items: DiffItem[];
  variant: "added" | "removed";
}) {
  const isAdded = variant === "added";
  if (!items || items.length === 0) {
    return (
      <span className="text-xs italic text-gray-300">No changes</span>
    );
  }

  return (
    <div
      className={`min-w-0 max-w-full rounded-lg border ${
        isAdded
          ? "border-green-200 bg-green-50/60"
          : "border-red-200 bg-red-50/60"
      }`}
    >
      <div className="max-h-72 min-h-0 overflow-y-auto overflow-x-hidden p-2.5">
        <p
          className={`mb-2 text-[10px] font-semibold uppercase tracking-widest ${
            isAdded ? "text-green-600" : "text-red-500"
          }`}
        >
          {isAdded ? "+ Added" : "− Removed"}
        </p>
        <div className="space-y-1.5 text-[11px] leading-relaxed">
          {items.map((item, i) => (
            <div
              key={i}
              className={[
                "hyphens-auto break-words [overflow-wrap:anywhere]",
                item.muted ? "italic text-gray-400" : "",
                item.dim ? "text-gray-500" : "",
                item.highlight && isAdded ? "font-medium text-green-800" : "",
                item.strike
                  ? "text-red-500/90 line-through decoration-red-300"
                  : "",
                !item.muted && !item.dim && !item.highlight && !item.strike
                  ? "text-gray-700"
                  : "",
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
      url.searchParams.set("per_page", "25");
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
            typeof data.per_page === "number" ? data.per_page : 25,
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

  useEffect(() => {
    void loadItems(page, requestType);
  }, [page, requestType, loadItems]);

  function selectRequestType(next: ChangeRequestType) {
    if (next === requestType) return;
    setRequestType(next);
    setPage(1);
  }

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
            Added
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />{" "}
            Removed
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
        <div className="flex flex-wrap items-center gap-2">
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white text-xs shadow-sm">
              <button
                type="button"
                className="px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="border-l border-gray-200 px-2.5 py-1.5 text-gray-500">
                {meta.page}/{meta.total_pages}
              </span>
              <button
                type="button"
                className="border-l border-gray-200 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={loading || page >= meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
          {meta && (
            <span className="text-[11px] text-gray-400">
              {meta.total.toLocaleString()} total
            </span>
          )}
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
          className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}
          style={{ minWidth: 0 }}
        >
          <table
            className="w-full table-fixed border-collapse text-left"
            style={{ minWidth: 1280 }}
          >
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "ID",
                  "Created",
                  "AI Reasoning",
                  "Added",
                  "Removed",
                  "Title",
                  "Watch URL",
                  "Tag",
                  "Bucket",
                  "Skip",
                  "Diff",
                ].map((col) => (
                  <th
                    key={col}
                    className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 ${
                      col === "Added" || col === "Removed"
                        ? "w-[260px] min-w-[200px] max-w-[280px]"
                        : col === "AI Reasoning"
                          ? "w-[280px] min-w-0 max-w-[300px]"
                          : "whitespace-nowrap"
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
                const removedRaw = getChangeRequestDiffText(
                  item,
                  "removed_text"
                );
                const addedItems = textToDiffItems(addedRaw, "added");
                const removedItems = textToDiffItems(removedRaw, "removed");

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 align-top transition-colors hover:bg-blue-50/20 ${
                      i % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-bold text-gray-400">
                        {item.id}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="text-xs font-medium text-gray-700">
                        {created.line1}
                      </div>
                      {created.line2 ? (
                        <div className="mt-0.5 text-[11px] text-gray-400">
                          {created.line2}
                        </div>
                      ) : null}
                    </td>
                    <td className="min-w-0 max-w-[300px] px-4 py-4 align-top">
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
                    </td>
                    <td className="min-w-0 w-[260px] max-w-[280px] px-4 py-4 align-top">
                      <DiffBlock items={addedItems} variant="added" />
                    </td>
                    <td className="min-w-0 w-[260px] max-w-[280px] px-4 py-4 align-top">
                      <DiffBlock items={removedItems} variant="removed" />
                    </td>
                    <td className="min-w-0 px-4 py-4 align-top">
                      <span className="break-words text-xs text-gray-600">
                        {m.watch_title ?? "—"}
                      </span>
                    </td>
                    <td className="min-w-0 max-w-[200px] px-4 py-4 align-top">
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
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-500">
                        {m.watch_tag ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {item.bucket ? (
                        <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          {item.bucket}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-500">
                        {item.skip_reason ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {m.diff_url ? (
                        <a
                          href={m.diff_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
