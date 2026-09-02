"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientCompanyOption } from "@/app/api/admin/client-companies/route";
import { DcpOutreachTab } from "./DcpOutreachTab";
import type {
  DailyAnalyticsResponse,
  PeriodKey,
  PeriodSummary,
  UserAnalyticsResponse,
  UserRow,
} from "@/types/email-analytics";

const EMAIL_ANALYTICS_DAILY_URL = "/api/admin/email-analytics/daily";
const EMAIL_ANALYTICS_USERS_URL = "/api/admin/email-analytics/users";
const DEFAULT_TIMEZONE = "Europe/London";
const LIST_PER_PAGE = 25;

type SortDirection = "asc" | "desc";
type EATab = "all" | "dcp";
type ItemTypeFilter = "" | "digest";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

const PERIOD_KEYS: PeriodKey[] = ["today", "7d", "30d", "90d"];

type UserColumn = {
  key: keyof UserRow | "email";
  label: string;
  period?: PeriodKey;
  format?: "number" | "rate";
};

const USER_TABLE_COLUMNS: UserColumn[] = [
  { key: "email", label: "Email" },
  { key: "sent_today", label: "Sent", period: "today", format: "number" },
  { key: "open_rate_today", label: "Open %", period: "today", format: "rate" },
  { key: "clicks_today", label: "Clicks", period: "today", format: "number" },
  { key: "sent_7d", label: "Sent", period: "7d", format: "number" },
  { key: "open_rate_7d", label: "Open %", period: "7d", format: "rate" },
  { key: "clicks_7d", label: "Clicks", period: "7d", format: "number" },
  { key: "sent_30d", label: "Sent", period: "30d", format: "number" },
  { key: "open_rate_30d", label: "Open %", period: "30d", format: "rate" },
  { key: "clicks_30d", label: "Clicks", period: "30d", format: "number" },
  { key: "sent_90d", label: "Sent", period: "90d", format: "number" },
  { key: "open_rate_90d", label: "Open %", period: "90d", format: "rate" },
  { key: "clicks_90d", label: "Clicks", period: "90d", format: "number" },
];

const DEFAULT_SORTABLE_COLUMNS = USER_TABLE_COLUMNS.map((col) => col.key).filter(
  (key) => key !== "email"
);

const SORT_ASC_FIRST = new Set<string>(["email"]);

function eaNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function eaFormatRate(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value % 1 === 0 ? Math.round(value) : value.toFixed(1)}%`;
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
  itemType: ItemTypeFilter,
  companyId: string,
  sortBy?: string,
  sortOrder?: SortDirection
): URLSearchParams {
  const params = new URLSearchParams({
    date,
    timezone: DEFAULT_TIMEZONE,
  });
  if (itemType) params.set("item_type", itemType);
  const parsedCompanyId = companyId ? Number.parseInt(companyId, 10) : NaN;
  if (Number.isFinite(parsedCompanyId) && parsedCompanyId > 0) {
    params.set("company_id", String(parsedCompanyId));
  }
  if (sortBy) params.set("sort_by", sortBy);
  if (sortOrder) params.set("sort_order", sortOrder);
  return params;
}

function emptyPeriodSummary(period: PeriodKey): PeriodSummary {
  return {
    period,
    from_date: "",
    to_date: "",
    scheduled: 0,
    sent: 0,
    send_rate: 0,
    remaining: 0,
    opened: 0,
    open_rate: 0,
    total_clicks: 0,
    failed: 0,
    skipped: 0,
  };
}

function normalizePeriodSummary(
  raw: unknown,
  period: PeriodKey
): PeriodSummary {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!row) return emptyPeriodSummary(period);

  return {
    period: (row.period as PeriodKey) ?? period,
    from_date: String(row.from_date ?? ""),
    to_date: String(row.to_date ?? ""),
    scheduled: eaNum(row.scheduled),
    sent: eaNum(row.sent ?? row.sent_today),
    send_rate: eaNum(row.send_rate ?? row.send_rate_pct),
    remaining: eaNum(row.remaining),
    opened: eaNum(row.opened),
    open_rate: eaNum(row.open_rate ?? row.open_rate_pct),
    total_clicks: eaNum(row.total_clicks),
    failed: eaNum(row.failed),
    skipped: eaNum(row.skipped),
  };
}

function normalizeDailyAnalytics(raw: unknown): DailyAnalyticsResponse | null {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!row) return null;

  const periodsRaw =
    row.periods && typeof row.periods === "object"
      ? (row.periods as Record<string, unknown>)
      : null;

  if (periodsRaw) {
    return {
      date: String(row.date ?? ""),
      timezone: String(row.timezone ?? DEFAULT_TIMEZONE),
      is_weekend: Boolean(row.is_weekend),
      periods: {
        today: normalizePeriodSummary(periodsRaw.today, "today"),
        "7d": normalizePeriodSummary(periodsRaw["7d"], "7d"),
        "30d": normalizePeriodSummary(periodsRaw["30d"], "30d"),
        "90d": normalizePeriodSummary(periodsRaw["90d"], "90d"),
      },
    };
  }

  const legacy = normalizePeriodSummary(row, "today");
  return {
    date: String(row.date ?? ""),
    timezone: String(row.timezone ?? DEFAULT_TIMEZONE),
    is_weekend: Boolean(row.is_weekend),
    periods: {
      today: {
        ...legacy,
        sent: eaNum(row.sent_today ?? legacy.sent),
      },
      "7d": emptyPeriodSummary("7d"),
      "30d": emptyPeriodSummary("30d"),
      "90d": emptyPeriodSummary("90d"),
    },
  };
}

function normalizeUserRow(raw: unknown): UserRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const email = String(row.email ?? "").trim();
  if (!email) return null;

  const userIdRaw = row.user_id;
  const userId =
    userIdRaw == null || userIdRaw === ""
      ? null
      : eaNum(userIdRaw) || null;

  const sentLegacy = eaNum(row.sent);
  const openedLegacy = eaNum(row.opened);
  const openRateLegacy = eaNum(row.open_rate);
  const clicksLegacy = eaNum(row.total_clicks);

  return {
    user_id: userId,
    email,
    sent_today: eaNum(row.sent_today) || sentLegacy,
    opened_today: eaNum(row.opened_today) || openedLegacy,
    open_rate_today: eaNum(row.open_rate_today) || openRateLegacy,
    clicks_today: eaNum(row.clicks_today) || clicksLegacy,
    sent_7d: eaNum(row.sent_7d),
    opened_7d: eaNum(row.opened_7d),
    open_rate_7d: eaNum(row.open_rate_7d),
    clicks_7d: eaNum(row.clicks_7d),
    sent_30d: eaNum(row.sent_30d),
    opened_30d: eaNum(row.opened_30d),
    open_rate_30d: eaNum(row.open_rate_30d),
    clicks_30d: eaNum(row.clicks_30d),
    sent_90d: eaNum(row.sent_90d),
    opened_90d: eaNum(row.opened_90d),
    open_rate_90d: eaNum(row.open_rate_90d),
    clicks_90d: eaNum(row.clicks_90d),
  };
}

function normalizeUsersResponse(raw: unknown): {
  users: UserRow[];
  sortBy: string;
  sortOrder: SortDirection;
  sortableColumns: string[];
  periodRanges: UserAnalyticsResponse["period_ranges"] | null;
} {
  const root =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) {
    return {
      users: [],
      sortBy: "sent_7d",
      sortOrder: "desc",
      sortableColumns: DEFAULT_SORTABLE_COLUMNS,
      periodRanges: null,
    };
  }

  const usersRaw = root.users ?? root.items ?? [];
  const sortOrderRaw = String(root.sort_order ?? root.sort_dir ?? "desc");

  return {
    users: (Array.isArray(usersRaw) ? usersRaw : [])
      .map(normalizeUserRow)
      .filter((user): user is UserRow => user !== null),
    sortBy: String(root.sort_by ?? "sent_7d"),
    sortOrder: sortOrderRaw === "asc" ? "asc" : "desc",
    sortableColumns: Array.isArray(root.sortable_columns)
      ? root.sortable_columns.map(String)
      : DEFAULT_SORTABLE_COLUMNS,
    periodRanges:
      root.period_ranges && typeof root.period_ranges === "object"
        ? (root.period_ranges as UserAnalyticsResponse["period_ranges"])
        : null,
  };
}

function formatUserCell(user: UserRow, column: UserColumn): string {
  if (column.key === "email") return user.email || "—";
  const value = user[column.key as keyof UserRow];
  if (column.format === "rate") return eaFormatRate(eaNum(value));
  if (typeof value === "number") return String(value);
  return "—";
}

function PeriodStatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "blue" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-700"
      : tone === "blue"
        ? "text-blue-700"
        : tone === "red"
          ? "text-red-700"
          : "text-gray-900";

  return (
    <div className="rounded border px-4 py-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-medium ${toneClass}`}>{value}</div>
      {sub ? <div className="text-xs text-gray-400 mt-1">{sub}</div> : null}
    </div>
  );
}

function sortableHeaderProps(
  column: UserColumn,
  sortBy: string,
  sortOrder: SortDirection,
  sortable: boolean,
  onSort: (key: string) => void
) {
  const active = sortBy === column.key;
  if (!sortable) {
    return {
      className:
        "text-left font-normal text-xs text-gray-500 px-3 py-2 whitespace-nowrap",
      children: column.label,
    };
  }

  return {
    className:
      "text-left font-normal text-xs text-gray-500 px-3 py-2 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100",
    onClick: () => onSort(column.key),
    children: (
      <span className="inline-flex items-center gap-1">
        {column.label}
        {active ? (
          <span className="text-gray-400">{sortOrder === "desc" ? "▼" : "▲"}</span>
        ) : null}
      </span>
    ),
  };
}

export function EmailAnalyticsTab() {
  const [auditDate, setAuditDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [itemType, setItemType] = useState<ItemTypeFilter>("");
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<ClientCompanyOption[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [dashboardPeriod, setDashboardPeriod] = useState<PeriodKey>("today");
  const [tab, setTab] = useState<EATab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showDebug, setShowDebug] = useState(false);
  const [dcpCompanyCount, setDcpCompanyCount] = useState(0);

  const [dailyStats, setDailyStats] = useState<DailyAnalyticsResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersRaw, setUsersRaw] = useState<object | null>(null);
  const [sortBy, setSortBy] = useState("sent_7d");
  const [sortOrder, setSortOrder] = useState<SortDirection>("desc");
  const [sortableColumns, setSortableColumns] = useState<string[]>(
    DEFAULT_SORTABLE_COLUMNS
  );
  const [periodRanges, setPeriodRanges] =
    useState<UserAnalyticsResponse["period_ranges"] | null>(null);

  const handleSort = (key: string) => {
    if (!sortableColumns.includes(key) && key !== "email") return;
    if (sortBy !== key) {
      setSortBy(key);
      setSortOrder(SORT_ASC_FIRST.has(key) ? "asc" : "desc");
    } else {
      setSortOrder((prevOrder) => (prevOrder === "desc" ? "asc" : "desc"));
    }
    setPage(1);
  };

  useEffect(() => {
    let aborted = false;
    async function loadCompanies() {
      setCompaniesLoading(true);
      try {
        const res = await fetch("/api/admin/client-companies", {
          headers: authHeaders(),
        });
        if (!res.ok) {
          throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
        }
        const json = (await res.json()) as ClientCompanyOption[];
        if (!aborted) setCompanies(Array.isArray(json) ? json : []);
      } catch {
        if (!aborted) setCompanies([]);
      } finally {
        if (!aborted) setCompaniesLoading(false);
      }
    }
    loadCompanies();
    return () => {
      aborted = true;
    };
  }, []);

  const fetchDailyStats = useCallback(async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const params = analyticsQueryParams(auditDate, itemType, companyId);
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
  }, [auditDate, itemType, companyId]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = analyticsQueryParams(
        auditDate,
        itemType,
        companyId,
        sortBy,
        sortOrder
      );
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
      const normalized = normalizeUsersResponse(json);
      setAllUsers(normalized.users);
      setSortBy(normalized.sortBy);
      setSortOrder(normalized.sortOrder);
      setSortableColumns(normalized.sortableColumns);
      setPeriodRanges(normalized.periodRanges);
    } catch (error) {
      setAllUsers([]);
      setUsersRaw(null);
      setUsersError(
        error instanceof Error ? error.message : "Failed to load user analytics"
      );
    } finally {
      setUsersLoading(false);
    }
  }, [auditDate, itemType, companyId, sortBy, sortOrder]);

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
  }, [auditDate, itemType, companyId, tab]);

  const hasActiveFilters = !!itemType || !!companyId || !!searchInput;

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    return allUsers.filter((user) =>
      user.email.toLowerCase().includes(searchQuery)
    );
  }, [allUsers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / LIST_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * LIST_PER_PAGE,
    currentPage * LIST_PER_PAGE
  );

  const selectedPeriod = dailyStats?.periods[dashboardPeriod] ?? null;

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

  const periodRangeLabel = useMemo(() => {
    const range = periodRanges?.[dashboardPeriod];
    if (!range?.from_date || !range?.to_date) return null;
    return `${range.from_date} → ${range.to_date}`;
  }, [periodRanges, dashboardPeriod]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-medium">Daily analytics</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Send and engagement stats by period ({DEFAULT_TIMEZONE})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={companyId}
              onChange={(event) => {
                setPage(1);
                setCompanyId(event.target.value);
              }}
              disabled={companiesLoading}
              className="text-sm border rounded px-2 py-1.5 min-w-[180px]"
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.name}
                </option>
              ))}
            </select>
            <select
              value={itemType}
              onChange={(event) => {
                setPage(1);
                setItemType(event.target.value as ItemTypeFilter);
              }}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="">All alert types</option>
              <option value="digest">Digest only</option>
            </select>
            <input
              type="date"
              value={auditDate}
              onChange={(event) => {
                setPage(1);
                setAuditDate(event.target.value);
              }}
              className="text-sm border rounded px-2 py-1.5"
            />
          </div>
        </div>

        {companyId ? (
          <div className="mx-4 mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-3 py-2">
            Filtered to one company — scheduled and remaining counts are not
            available per company.
          </div>
        ) : null}

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
            {dailyStats.is_weekend && dashboardPeriod === "today" ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                Weekend day — scheduled sends are expected to be 0.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {PERIOD_KEYS.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setDashboardPeriod(period)}
                  className={`text-sm px-3 py-1.5 rounded border ${
                    dashboardPeriod === period
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {PERIOD_LABELS[period]}
                </button>
              ))}
            </div>

            {selectedPeriod?.from_date && selectedPeriod?.to_date ? (
              <p className="text-xs text-gray-500">
                {selectedPeriod.from_date} → {selectedPeriod.to_date}
              </p>
            ) : null}

            {selectedPeriod ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <PeriodStatCard
                  label="Scheduled"
                  value={selectedPeriod.scheduled.toLocaleString()}
                />
                <PeriodStatCard
                  label="Sent"
                  value={selectedPeriod.sent.toLocaleString()}
                  sub={`${eaFormatRate(selectedPeriod.send_rate)} send rate`}
                  tone="green"
                />
                <PeriodStatCard
                  label="Remaining"
                  value={selectedPeriod.remaining.toLocaleString()}
                />
                <PeriodStatCard
                  label="Opened"
                  value={selectedPeriod.opened.toLocaleString()}
                  sub={`${eaFormatRate(selectedPeriod.open_rate)} open rate`}
                  tone="green"
                />
                <PeriodStatCard
                  label="Total clicks"
                  value={selectedPeriod.total_clicks.toLocaleString()}
                  tone="blue"
                />
                <PeriodStatCard
                  label="Failed"
                  value={selectedPeriod.failed.toLocaleString()}
                  tone="red"
                />
                <PeriodStatCard
                  label="Skipped"
                  value={selectedPeriod.skipped.toLocaleString()}
                />
              </div>
            ) : null}
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
          <span className="text-xs text-gray-500">
            {periodLabel}
            {periodRangeLabel ? ` · ${periodRangeLabel}` : ""}
          </span>
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
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setCompanyId("");
                setItemType("");
                setSearchInput("");
              }}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {usersError ? (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          Failed to load user analytics: {usersError}
        </div>
      ) : null}

      {showDebug && usersRaw ? (
        <div className="bg-gray-900 text-gray-100 rounded border border-gray-700 px-4 py-3 text-xs font-mono">
          <div className="text-gray-400 font-sans font-medium text-xs mb-2">
            Users analytics response
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
          <DcpOutreachTab
            companyId={companyId}
            onCompanyCountChange={setDcpCompanyCount}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              {usersLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
              ) : (
                <table className="w-full text-sm border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {(() => {
                        const emailHeader = sortableHeaderProps(
                          { key: "email", label: "Email" },
                          sortBy,
                          sortOrder,
                          sortableColumns.includes("email"),
                          handleSort
                        );
                        return (
                          <th
                            rowSpan={2}
                            {...emailHeader}
                            className={`${emailHeader.className} align-bottom border-r border-gray-100`}
                          />
                        );
                      })()}
                      {PERIOD_KEYS.map((period) => {
                        const cols = USER_TABLE_COLUMNS.filter(
                          (col) => col.period === period
                        );
                        if (cols.length === 0) return null;
                        return (
                          <th
                            key={period}
                            colSpan={cols.length}
                            className="text-center font-medium text-xs text-gray-600 px-3 py-2 border-r border-gray-100"
                          >
                            {PERIOD_LABELS[period]}
                          </th>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-gray-200">
                      {USER_TABLE_COLUMNS.filter((col) => col.period).map((col) => (
                        <th
                          key={col.key}
                          {...sortableHeaderProps(
                            col,
                            sortBy,
                            sortOrder,
                            sortableColumns.includes(col.key),
                            handleSort
                          )}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={USER_TABLE_COLUMNS.length}
                          className="text-center py-8 text-sm text-gray-500"
                        >
                          No users match this filter.
                        </td>
                      </tr>
                    ) : (
                      pagedUsers.map((user) => (
                        <tr
                          key={`${user.user_id ?? "none"}-${user.email}`}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          {USER_TABLE_COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className={`px-3 py-2 whitespace-nowrap ${
                                col.key === "email" ? "font-medium" : "text-gray-700"
                              }`}
                            >
                              {col.key === "email" && user.user_id ? (
                                <div>
                                  <div>{formatUserCell(user, col)}</div>
                                  <div className="text-xs text-gray-400 font-normal">
                                    User ID {user.user_id}
                                  </div>
                                </div>
                              ) : (
                                formatUserCell(user, col)
                              )}
                            </td>
                          ))}
                        </tr>
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
