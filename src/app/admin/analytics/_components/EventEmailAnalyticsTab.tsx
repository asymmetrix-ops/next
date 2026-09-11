"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BroadcastDashboardListResponse,
  BroadcastDashboardPeriod,
  BroadcastDashboardSendRow,
  BroadcastDashboardSummary,
  BroadcastDashboardTab,
} from "@/types/broadcast-analytics";

const DASHBOARD_BASE = "/api/admin/email-analytics/broadcast/dashboard";
const DEFAULT_TIMEZONE = "Europe/London";
const PAGE_SIZE = 50;

const PERIOD_OPTIONS: { value: BroadcastDashboardPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const LIST_TABS: { value: BroadcastDashboardTab; label: string }[] = [
  { value: "sent", label: "All sent" },
  { value: "opened", label: "Opened" },
  { value: "clicked", label: "Clicked link" },
];

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatRate(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value % 1 === 0 ? Math.round(value) : value.toFixed(1)}%`;
}

function normalizeSummary(raw: unknown): BroadcastDashboardSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const period = String(row.period ?? "30d") as BroadcastDashboardPeriod;
  return {
    total_sent: num(row.total_sent),
    total_opened: num(row.total_opened),
    total_clicked: num(row.total_clicked),
    open_rate: num(row.open_rate),
    click_rate: num(row.click_rate),
    from_date: String(row.from_date ?? ""),
    to_date: String(row.to_date ?? ""),
    period,
    search: String(row.search ?? ""),
  };
}

function normalizeSendRow(raw: unknown): BroadcastDashboardSendRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const email = String(row.email ?? "").trim();
  if (!email) return null;
  return {
    id: num(row.id),
    email,
    campaign_key: String(row.campaign_key ?? ""),
    subject: String(row.subject ?? ""),
    status: String(row.status ?? ""),
    sent_at: String(row.sent_at ?? ""),
    postmark_message_id: String(row.postmark_message_id ?? ""),
  };
}

function normalizeListResponse(raw: unknown): BroadcastDashboardListResponse {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const tab = String(row.tab ?? "sent") as BroadcastDashboardTab;
  const itemsRaw = row.items;
  const items = (Array.isArray(itemsRaw) ? itemsRaw : [])
    .map(normalizeSendRow)
    .filter((item): item is BroadcastDashboardSendRow => item !== null);

  return {
    tab,
    total: num(row.total),
    limit: num(row.limit) || PAGE_SIZE,
    offset: num(row.offset),
    search: String(row.search ?? ""),
    items,
  };
}

function dashboardQueryParams(options: {
  date: string;
  period: BroadcastDashboardPeriod;
  campaignKey: string;
  search: string;
  limit: number;
  offset: number;
}): URLSearchParams {
  const params = new URLSearchParams({
    date: options.date,
    timezone: DEFAULT_TIMEZONE,
    period: options.period,
    limit: String(options.limit),
    offset: String(options.offset),
  });
  if (options.campaignKey.trim()) {
    params.set("campaign_key", options.campaignKey.trim());
  }
  if (options.search.trim()) {
    params.set("search", options.search.trim());
  }
  return params;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-1 tabular-nums">
        {value}
      </p>
      {sub ? <p className="text-xs text-gray-400 mt-1">{sub}</p> : null}
    </div>
  );
}

export function EventEmailAnalyticsTab() {
  const [period, setPeriod] = useState<BroadcastDashboardPeriod>("30d");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [campaignKey, setCampaignKey] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [listTab, setListTab] = useState<BroadcastDashboardTab>("sent");
  const [offset, setOffset] = useState(0);

  const [summary, setSummary] = useState<BroadcastDashboardSummary | null>(
    null
  );
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [list, setList] = useState<BroadcastDashboardListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setOffset(0);
  }, [period, date, campaignKey, listTab]);

  const queryBase = useMemo(
    () => ({
      date,
      period,
      campaignKey,
      search,
      limit: PAGE_SIZE,
      offset,
    }),
    [date, period, campaignKey, search, offset]
  );

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const params = dashboardQueryParams({
        ...queryBase,
        limit: PAGE_SIZE,
        offset: 0,
      });
      const res = await fetch(`${DASHBOARD_BASE}/summary?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      setSummary(normalizeSummary(await res.json()));
    } catch (err) {
      setSummary(null);
      setSummaryError(
        err instanceof Error ? err.message : "Failed to load summary"
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [queryBase]);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params = dashboardQueryParams(queryBase);
      const res = await fetch(`${DASHBOARD_BASE}/${listTab}?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      setList(normalizeListResponse(await res.json()));
    } catch (err) {
      setList(null);
      setListError(err instanceof Error ? err.message : "Failed to load list");
    } finally {
      setListLoading(false);
    }
  }, [queryBase, listTab]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const total = list?.total ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeLabel =
    summary?.from_date && summary?.to_date
      ? `${summary.from_date} → ${summary.to_date}`
      : null;

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period</label>
          <div className="flex flex-wrap gap-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`text-sm px-3 py-1.5 rounded-md border ${
                  period === option.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5"
          />
        </div>
        <div className="min-w-[180px]">
          <label className="block text-xs text-gray-500 mb-1">
            Campaign key
          </label>
          <input
            type="text"
            value={campaignKey}
            onChange={(e) => setCampaignKey(e.target.value)}
            placeholder="All campaigns"
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs text-gray-500 mb-1">
            Search email
          </label>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. john@company.com"
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            fetchSummary();
            fetchList();
          }}
          disabled={summaryLoading || listLoading}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {rangeLabel ? (
        <p className="text-xs text-gray-500">
          Window ({DEFAULT_TIMEZONE}): {rangeLabel}
        </p>
      ) : null}

      {summaryError ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {summaryError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total sent"
          value={
            summaryLoading && !summary
              ? "—"
              : (summary?.total_sent ?? 0).toLocaleString()
          }
          sub={
            summary ? `${formatRate(summary.open_rate)} open rate` : undefined
          }
        />
        <StatCard
          label="Total opened"
          value={
            summaryLoading && !summary
              ? "—"
              : (summary?.total_opened ?? 0).toLocaleString()
          }
        />
        <StatCard
          label="Total clicked"
          value={
            summaryLoading && !summary
              ? "—"
              : (summary?.total_clicked ?? 0).toLocaleString()
          }
          sub={
            summary ? `${formatRate(summary.click_rate)} click rate` : undefined
          }
        />
      </div>

      <div className="border-b border-gray-200 flex gap-1">
        {LIST_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setListTab(tab.value)}
            className={`text-sm py-2 px-3 border-b-2 -mb-px ${
              listTab === tab.value
                ? "border-gray-900 text-gray-900 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {listError ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {listError}
        </div>
      ) : null}

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {listLoading && !list ? (
          <p className="text-sm text-gray-500 text-center py-10">Loading…</p>
        ) : !list || list.items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            No emails in this tab
            {search ? ` matching “${search}”` : ""}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Campaign</th>
                <th className="px-4 py-2 font-medium">Subject</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Sent at</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((row) => (
                <tr
                  key={`${row.id}-${row.email}-${row.sent_at}`}
                  className="border-t border-gray-100 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {row.email}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">
                    {row.campaign_key || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">
                    {row.subject || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 capitalize">
                    {row.status || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                    {row.sent_at || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <span>
            {total.toLocaleString()} total · page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={listLoading || offset <= 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={listLoading || offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
