"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DcpOutreachTab } from "./DcpOutreachTab";

const EMAIL_ANALYTICS_DAILY_URL = "/api/admin/email-analytics/daily";
const EMAIL_ANALYTICS_USERS_URL = "/api/admin/email-analytics/users";
const DEFAULT_TIMEZONE = "Europe/London";
const LIST_PER_PAGE = 25;

type SortDirection = "asc" | "desc";

type EATab = "all" | "dcp";

type ItemTypeFilter = "" | "digest";

type DailyAnalytics = {
  date: string;
  timezone: string;
  is_weekend: boolean;
  scheduled: number;
  sent_today: number;
  send_rate: number;
  remaining: number;
  opened: number;
  open_rate: number;
  total_clicks: number;
  failed: number;
  skipped: number;
};

type ClickedUrl = {
  url: string;
  clicks: number;
  last_clicked_at: string;
};

type UserAnalytics = {
  user_id: number;
  email: string;
  sent: number;
  opened: number;
  open_rate: number;
  total_clicks: number;
  clicked_urls: ClickedUrl[];
};

type UsersSummary = {
  users_count: number;
  total_sent: number;
  total_opened: number;
  overall_open_rate: number;
  avg_user_open_rate: number;
  total_clicks: number;
};

type UserSortCol = "openRate" | "sent" | "clicks" | "email";

function eaNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function eaFormatRate(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value % 1 === 0 ? Math.round(value) : value.toFixed(1)}%`;
}

function eaFmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

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

function analyticsQueryParams(
  date: string,
  itemType: ItemTypeFilter
): URLSearchParams {
  const params = new URLSearchParams({
    date,
    timezone: DEFAULT_TIMEZONE,
  });
  if (itemType) params.set("item_type", itemType);
  return params;
}

function normalizeDailyAnalytics(raw: unknown): DailyAnalytics | null {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!row) return null;

  return {
    date: String(row.date ?? ""),
    timezone: String(row.timezone ?? DEFAULT_TIMEZONE),
    is_weekend: Boolean(row.is_weekend),
    scheduled: eaNum(row.scheduled),
    sent_today: eaNum(row.sent_today),
    send_rate: eaNum(row.send_rate ?? row.send_rate_pct),
    remaining: eaNum(row.remaining),
    opened: eaNum(row.opened),
    open_rate: eaNum(row.open_rate ?? row.open_rate_pct),
    total_clicks: eaNum(row.total_clicks),
    failed: eaNum(row.failed),
    skipped: eaNum(row.skipped),
  };
}

function normalizeClickedUrls(raw: unknown): ClickedUrl[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      url: String(item.url ?? ""),
      clicks: eaNum(item.clicks),
      last_clicked_at: String(item.last_clicked_at ?? ""),
    }))
    .filter((item) => item.url);
}

function normalizeUserAnalytics(raw: unknown): UserAnalytics | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const userId = eaNum(row.user_id);
  if (userId <= 0) return null;

  return {
    user_id: userId,
    email: String(row.email ?? ""),
    sent: eaNum(row.sent),
    opened: eaNum(row.opened),
    open_rate: eaNum(row.open_rate),
    total_clicks: eaNum(row.total_clicks),
    clicked_urls: normalizeClickedUrls(row.clicked_urls),
  };
}

function normalizeUsersResponse(raw: unknown): {
  summary: UsersSummary | null;
  users: UserAnalytics[];
} {
  const root =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return { summary: null, users: [] };

  const summaryRaw =
    root.summary && typeof root.summary === "object"
      ? (root.summary as Record<string, unknown>)
      : null;

  const summary = summaryRaw
    ? {
        users_count: eaNum(summaryRaw.users_count),
        total_sent: eaNum(summaryRaw.total_sent),
        total_opened: eaNum(summaryRaw.total_opened),
        overall_open_rate: eaNum(summaryRaw.overall_open_rate),
        avg_user_open_rate: eaNum(summaryRaw.avg_user_open_rate),
        total_clicks: eaNum(summaryRaw.total_clicks),
      }
    : null;

  const usersRaw = root.users ?? root.items ?? [];
  const users = (Array.isArray(usersRaw) ? usersRaw : [])
    .map(normalizeUserAnalytics)
    .filter((user): user is UserAnalytics => user !== null);

  return { summary, users };
}

function UserDetailPanel({ user }: { user: UserAnalytics }) {
  return (
    <div className="px-4 py-3 bg-gray-50 space-y-4 border-t border-gray-100">
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2">Engagement summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded border bg-white px-3 py-2">
            <div className="text-xs text-gray-500">Open rate</div>
            <div className="text-lg font-medium text-green-700">
              {eaFormatRate(user.open_rate)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {user.opened}/{user.sent} opened
            </div>
          </div>
          <div className="rounded border bg-white px-3 py-2">
            <div className="text-xs text-gray-500">Sent</div>
            <div className="text-lg font-medium text-gray-900">{user.sent}</div>
          </div>
          <div className="rounded border bg-white px-3 py-2">
            <div className="text-xs text-gray-500">Opened</div>
            <div className="text-lg font-medium text-green-700">{user.opened}</div>
          </div>
          <div className="rounded border bg-white px-3 py-2">
            <div className="text-xs text-gray-500">Clicks</div>
            <div className="text-lg font-medium text-blue-700">
              {user.total_clicks}
            </div>
          </div>
        </div>
      </div>

      {user.clicked_urls.length > 0 ? (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Clicked URLs</h4>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {["URL", "Clicks", "Last clicked"].map((h) => (
                    <th
                      key={h}
                      className="text-left font-normal text-gray-500 px-3 py-2"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...user.clicked_urls]
                  .sort((a, b) => b.clicks - a.clicks)
                  .map((row) => (
                    <tr
                      key={row.url}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-2 text-blue-700 break-all">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {row.url}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{row.clicks}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {eaFmtDateTime(row.last_clicked_at)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">No link clicks recorded for this day.</p>
      )}
    </div>
  );
}

function UserListRow({ user }: { user: UserAnalytics }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        onClick={() => setExpanded((value) => !value)}
        className="cursor-pointer hover:bg-gray-50 border-b border-gray-200"
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{expanded ? "▼" : "▶"}</span>
            <div>
              <div className="text-sm font-medium">{user.email || "—"}</div>
              <div className="text-xs text-gray-400">User ID {user.user_id}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{eaFormatRate(user.open_rate)}</span>
            <span className="text-xs text-gray-400">
              {user.opened}/{user.sent} opened
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
          {user.sent} sent · {user.opened} opened · {user.total_clicks} clicks
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600">
          {user.opened === 0 && user.sent > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
              No opens
            </span>
          ) : user.sent > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
              Opened
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
              No sends
            </span>
          )}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-gray-200">
          <td colSpan={4} className="p-0">
            <UserDetailPanel user={user} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function EmailAnalyticsTab() {
  const [auditDate, setAuditDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [itemType, setItemType] = useState<ItemTypeFilter>("");
  const [tab, setTab] = useState<EATab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showDebug, setShowDebug] = useState(false);
  const [dcpCompanyCount, setDcpCompanyCount] = useState(0);

  const [dailyStats, setDailyStats] = useState<DailyAnalytics | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [usersSummary, setUsersSummary] = useState<UsersSummary | null>(null);
  const [allUsers, setAllUsers] = useState<UserAnalytics[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersRaw, setUsersRaw] = useState<object | null>(null);

  const [userSortCol, setUserSortCol] = useState<UserSortCol>("openRate");
  const [userSortDir, setUserSortDir] = useState<SortDirection>("desc");

  function onUserSort(col: UserSortCol) {
    if (userSortCol === col) {
      setUserSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setUserSortCol(col);
      setUserSortDir(col === "email" ? "asc" : "desc");
    }
  }

  const fetchDailyStats = useCallback(async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const params = analyticsQueryParams(auditDate, itemType);
      const res = await fetch(`${EMAIL_ANALYTICS_DAILY_URL}?${params.toString()}`, {
        method: "GET",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      setDailyStats(normalizeDailyAnalytics(json));
    } catch (error) {
      setDailyStats(null);
      setDailyError(
        error instanceof Error ? error.message : "Failed to load daily stats"
      );
    } finally {
      setDailyLoading(false);
    }
  }, [auditDate, itemType]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = analyticsQueryParams(auditDate, itemType);
      const res = await fetch(`${EMAIL_ANALYTICS_USERS_URL}?${params.toString()}`, {
        method: "GET",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      setUsersRaw(json && typeof json === "object" ? (json as object) : null);
      const { summary, users } = normalizeUsersResponse(json);
      setUsersSummary(summary);
      setAllUsers(users);
    } catch (error) {
      setUsersSummary(null);
      setAllUsers([]);
      setUsersRaw(null);
      setUsersError(
        error instanceof Error ? error.message : "Failed to load user analytics"
      );
    } finally {
      setUsersLoading(false);
    }
  }, [auditDate, itemType]);

  const refreshAll = useCallback(() => {
    fetchDailyStats();
    fetchUsers();
  }, [fetchDailyStats, fetchUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchDailyStats();
  }, [fetchDailyStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [auditDate, itemType, tab]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    return allUsers.filter((user) =>
      user.email.toLowerCase().includes(searchQuery)
    );
  }, [allUsers, searchQuery]);

  const sortedUsers = useMemo(() => {
    const mul = userSortDir === "asc" ? 1 : -1;
    return filteredUsers.slice().sort((a, b) => {
      switch (userSortCol) {
        case "openRate":
          return (a.open_rate - b.open_rate) * mul;
        case "sent":
          return (a.sent - b.sent) * mul;
        case "clicks":
          return (a.total_clicks - b.total_clicks) * mul;
        case "email":
          return a.email.localeCompare(b.email) * mul;
        default:
          return 0;
      }
    });
  }, [filteredUsers, userSortCol, userSortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / LIST_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = sortedUsers.slice(
    (currentPage - 1) * LIST_PER_PAGE,
    currentPage * LIST_PER_PAGE
  );

  const neverOpened = useMemo(
    () => allUsers.filter((user) => user.sent > 0 && user.opened === 0).length,
    [allUsers]
  );

  const periodLabel = useMemo(() => {
    if (!auditDate) return "Selected day";
    try {
      const d = new Date(`${auditDate}T12:00:00`);
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return auditDate;
    }
  }, [auditDate]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-medium">Daily analytics</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Turso-backed send and engagement stats for the selected day (
              {DEFAULT_TIMEZONE})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={itemType}
              onChange={(event) => setItemType(event.target.value as ItemTypeFilter)}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="">All alert types</option>
              <option value="digest">Digest only</option>
            </select>
            <input
              type="date"
              value={auditDate}
              onChange={(event) => setAuditDate(event.target.value)}
              className="text-sm border rounded px-2 py-1.5"
            />
          </div>
        </div>

        {dailyError ? (
          <div className="mx-4 mt-4 bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
            Failed to load daily stats: {dailyError}
          </div>
        ) : null}

        {dailyLoading && !dailyStats ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
        ) : !dailyStats ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No data for {auditDate}.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {dailyStats.is_weekend ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                Weekend day — scheduled sends are expected to be 0.
              </p>
            ) : null}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Scheduled</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dailyStats.scheduled.toLocaleString()}
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Sent today</div>
                <div className="text-2xl font-medium text-green-700">
                  {dailyStats.sent_today.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {eaFormatRate(dailyStats.send_rate)} send rate
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Remaining</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dailyStats.remaining.toLocaleString()}
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Opened</div>
                <div className="text-2xl font-medium text-green-700">
                  {dailyStats.opened.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {eaFormatRate(dailyStats.open_rate)} open rate
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Total clicks</div>
                <div className="text-2xl font-medium text-blue-700">
                  {dailyStats.total_clicks.toLocaleString()}
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Failed</div>
                <div className="text-2xl font-medium text-red-700">
                  {dailyStats.failed.toLocaleString()}
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Skipped</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dailyStats.skipped.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshAll}
              disabled={dailyLoading || usersLoading}
              className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              {dailyLoading || usersLoading ? "Loading…" : "↻ Refresh"}
            </button>
            <button
              onClick={() => setShowDebug((value) => !value)}
              className="text-xs border rounded px-2 py-1.5 text-gray-500 hover:bg-gray-50"
            >
              {showDebug ? "Hide debug" : "Debug"}
            </button>
          </div>
          <span className="text-xs text-gray-500">{periodLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by email…"
            className="text-sm border rounded px-2 py-1.5 min-w-[220px]"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Clear search
            </button>
          ) : null}
        </div>
      </div>

      {usersError ? (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          Failed to load user analytics: {usersError}
        </div>
      ) : null}

      {usersLoading && !usersSummary ? (
        <div className="text-center py-6 text-sm text-gray-500">Loading overview…</div>
      ) : null}

      {usersSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Emails sent</div>
            <div className="text-2xl font-medium text-gray-900">
              {usersSummary.total_sent.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {usersSummary.users_count.toLocaleString()} recipients · {periodLabel}
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Open rate (overall)</div>
            <div className="text-2xl font-medium text-green-700">
              {eaFormatRate(usersSummary.overall_open_rate)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {usersSummary.total_opened.toLocaleString()} of{" "}
              {usersSummary.total_sent.toLocaleString()} messages opened
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Total clicks</div>
            <div className="text-2xl font-medium text-blue-700">
              {usersSummary.total_clicks.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Avg open rate per user</div>
            <div className="text-2xl font-medium text-green-700">
              {eaFormatRate(usersSummary.avg_user_open_rate)}
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Never opened</div>
            <div className="text-2xl font-medium text-amber-700">{neverOpened}</div>
            <div className="text-xs text-gray-400 mt-1">
              users received email but 0 opens
            </div>
          </div>
        </div>
      ) : null}

      {showDebug && usersRaw ? (
        <div className="bg-gray-900 text-gray-100 rounded border border-gray-700 px-4 py-3 text-xs font-mono">
          <div className="text-gray-400 font-sans font-medium text-xs mb-2">
            Turso users analytics response
          </div>
          <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(usersRaw, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="bg-white rounded border">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-medium">
            {tab === "dcp" ? "DCP outreach tracker" : "Per-user engagement"}
          </h2>
          {tab === "dcp" ? (
            <span className="text-xs text-gray-500">
              {dcpCompanyCount.toLocaleString()} companies
            </span>
          ) : (
            <span className="text-xs text-gray-500">
              {filteredUsers.length.toLocaleString()} users
              {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
            </span>
          )}
        </div>

        <div className="flex border-b border-gray-200 px-4">
          {(
            [
              ["all", "All users"],
              ["dcp", "DCP Outreach"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setPage(1);
                setTab(value);
              }}
              className={`text-sm py-2 px-3 border-b-2 mr-1 ${
                tab === value
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              {value === "all" ? (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({allUsers.length.toLocaleString()})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "dcp" ? (
          <DcpOutreachTab onCompanyCountChange={setDcpCompanyCount} />
        ) : (
          <>
            <div className="overflow-x-auto">
              {usersLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {(
                        [
                          ["email", "User", true],
                          ["openRate", "Open rate", true],
                          [null, "Engagement", false],
                          [null, "Status", false],
                        ] as [UserSortCol | null, string, boolean][]
                      ).map(([col, label, sortable]) => (
                        <th
                          key={label}
                          className="text-left font-normal text-xs text-gray-500 px-3 py-2"
                        >
                          {sortable && col ? (
                            <button
                              onClick={() => onUserSort(col)}
                              className="inline-flex items-center gap-1 hover:text-gray-900"
                            >
                              {label}
                              {userSortCol === col ? (
                                <span>{userSortDir === "asc" ? "▲" : "▼"}</span>
                              ) : null}
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-8 text-sm text-gray-500"
                        >
                          No users match this filter.
                        </td>
                      </tr>
                    ) : (
                      pagedUsers.map((user) => (
                        <UserListRow key={user.user_id} user={user} />
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                <span>
                  Showing page {currentPage} of {totalPages} (
                  {filteredUsers.length.toLocaleString()} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={usersLoading || currentPage <= 1}
                    className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={usersLoading || currentPage >= totalPages}
                    className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
