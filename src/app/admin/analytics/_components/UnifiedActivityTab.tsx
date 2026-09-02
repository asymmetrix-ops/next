"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ClientCompanyOption } from "@/app/api/admin/client-companies/route";

const UNIFIED_OVERVIEW_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/admin_analytics/unified_overview";
const COMPANY_SUMMARY_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/admin_analytics/company_summary";

const UA_PER_PAGE = 25;
const UA_DRILLDOWN_PER_PAGE = 100;

const UA_FIRM_TYPES = [
  "Private equity",
  "Venture capital",
  "Corporate Finance / Investment bank",
  "Consulting",
  "Corporate",
  "Equity Research",
] as const;

const UA_SENIORITY_LEVELS = ["Junior", "Middle", "Senior"] as const;

const UA_USER_STATUSES = ["Admin", "Client", "Trial", "Contributor"] as const;

type ViewMode = "by-user" | "by-company";

type UnifiedFilters = {
  firmType: string;
  seniorityLevel: string;
  userStatus: string;
  companyId: string;
};

type UnifiedOverviewRow = {
  user_id: number;
  user_name: string;
  email: string;
  firm_type: string;
  seniority_level: string;
  user_status: string;
  company_id: number;
  company_name: string;
  sessions_24h: number;
  page_views_24h: number;
  sessions_7d: number;
  page_views_7d: number;
  sessions_30d: number;
  page_views_30d: number;
  sessions_90d: number;
  page_views_90d: number;
  total_sessions: number;
  total_page_views: number;
  last_activity_at: number | null;
};

type CompanySummaryRow = {
  company_id: number;
  company_name: string;
  total_users: number;
  total_sessions_30d: number;
  total_page_views_30d: number;
  total_sessions_90d: number;
  total_page_views_90d: number;
  last_activity_at: number | null;
};

type PaginatedMeta = {
  total_count: number;
  cur_page: number;
  per_page: number;
  total_pages: number;
  next_page: number | null;
};

function uaNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function uaOptionalTs(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0") +
      " " +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  } catch {
    return String(ts);
  }
}

function formatMetric(v: unknown): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "—";
}

function mapUnifiedOverviewRow(raw: Record<string, unknown>): UnifiedOverviewRow {
  return {
    user_id: uaNum(raw.user_id),
    user_name: String(raw.user_name ?? ""),
    email: String(raw.email ?? ""),
    firm_type: String(raw.firm_type ?? ""),
    seniority_level: String(raw.seniority_level ?? ""),
    user_status: String(raw.user_status ?? ""),
    company_id: uaNum(raw.company_id),
    company_name: String(raw.company_name ?? ""),
    sessions_24h: uaNum(raw.sessions_24h),
    page_views_24h: uaNum(raw.page_views_24h),
    sessions_7d: uaNum(raw.sessions_7d),
    page_views_7d: uaNum(raw.page_views_7d),
    sessions_30d: uaNum(raw.sessions_30d),
    page_views_30d: uaNum(raw.page_views_30d),
    sessions_90d: uaNum(raw.sessions_90d),
    page_views_90d: uaNum(raw.page_views_90d),
    total_sessions: uaNum(raw.total_sessions),
    total_page_views: uaNum(raw.total_page_views),
    last_activity_at: uaOptionalTs(raw.last_activity_at),
  };
}

function mapCompanySummaryRow(raw: Record<string, unknown>): CompanySummaryRow {
  return {
    company_id: uaNum(raw.company_id),
    company_name: String(raw.company_name ?? ""),
    total_users: uaNum(raw.total_users),
    total_sessions_30d: uaNum(raw.total_sessions_30d),
    total_page_views_30d: uaNum(raw.total_page_views_30d),
    total_sessions_90d: uaNum(raw.total_sessions_90d),
    total_page_views_90d: uaNum(raw.total_page_views_90d),
    last_activity_at: uaOptionalTs(raw.last_activity_at),
  };
}

function parsePaginatedMeta(root: Record<string, unknown>): PaginatedMeta {
  const total_count = uaNum(root.total_count);
  const per_page = Math.max(1, uaNum(root.per_page) || UA_PER_PAGE);
  const cur_page = Math.max(1, uaNum(root.cur_page ?? root.page));
  const total_pages = Math.max(
    1,
    uaNum(root.total_pages) ||
      (total_count > 0 ? Math.ceil(total_count / per_page) : 1)
  );
  const nextRaw = root.next_page;
  const next_page =
    nextRaw == null || nextRaw === ""
      ? cur_page < total_pages
        ? cur_page + 1
        : null
      : uaNum(nextRaw) || null;

  return { total_count, cur_page, per_page, total_pages, next_page };
}

function unifiedOverviewQueryParams(
  filters: UnifiedFilters,
  q: string,
  page: number,
  perPage: number,
  companyIdOverride?: number
): string {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const trimmedQ = q.trim();
  if (trimmedQ) params.set("q", trimmedQ);
  if (filters.firmType) params.set("firm_type", filters.firmType);
  if (filters.seniorityLevel) params.set("seniority_level", filters.seniorityLevel);
  if (filters.userStatus) params.set("user_status", filters.userStatus);

  const companyId =
    companyIdOverride ??
    (filters.companyId ? parseInt(filters.companyId, 10) : NaN);
  if (Number.isFinite(companyId) && companyId > 0) {
    params.set("company_id", String(companyId));
  }

  return params.toString();
}

function companySummaryQueryParams(
  q: string,
  page: number,
  perPage: number
): string {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const trimmedQ = q.trim();
  if (trimmedQ) params.set("q", trimmedQ);
  return params.toString();
}

async function authFetch(url: string): Promise<Response> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : "";
  return fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function UnifiedUserRow({ row }: { row: UnifiedOverviewRow }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 whitespace-nowrap">{row.user_id}</td>
      <td className="px-3 py-2 whitespace-nowrap">{row.user_name || "—"}</td>
      <td className="px-3 py-2 whitespace-nowrap">{row.email || "—"}</td>
      <td className="px-3 py-2 whitespace-nowrap">{row.company_name || "—"}</td>
      <td className="px-3 py-2">{formatMetric(row.sessions_24h)}</td>
      <td className="px-3 py-2">{formatMetric(row.page_views_24h)}</td>
      <td className="px-3 py-2">{formatMetric(row.sessions_7d)}</td>
      <td className="px-3 py-2">{formatMetric(row.page_views_7d)}</td>
      <td className="px-3 py-2">{formatMetric(row.sessions_30d)}</td>
      <td className="px-3 py-2">{formatMetric(row.sessions_90d)}</td>
      <td className="px-3 py-2">{formatMetric(row.page_views_30d)}</td>
      <td className="px-3 py-2">{formatMetric(row.page_views_90d)}</td>
      <td className="px-3 py-2">{formatMetric(row.total_sessions)}</td>
      <td className="px-3 py-2">{formatMetric(row.total_page_views)}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        {formatTimestamp(row.last_activity_at)}
      </td>
    </tr>
  );
}

const USER_TABLE_HEADERS = [
  "User ID",
  "User name",
  "Email",
  "Company",
  "Sessions 24h",
  "Page views 24h",
  "Sessions 7d",
  "Page views 7d",
  "Sessions 30d",
  "Sessions 90d",
  "Page views 30d",
  "Page views 90d",
  "Total sessions",
  "Total page views",
  "Last activity",
] as const;

function PaginationBar({
  meta,
  loading,
  onPageChange,
}: {
  meta: PaginatedMeta;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (meta.total_pages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t text-sm">
      <span className="text-gray-500">
        {meta.total_count.toLocaleString()} total · Page {meta.cur_page} of{" "}
        {meta.total_pages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.cur_page - 1)}
          disabled={loading || meta.cur_page <= 1}
          className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(meta.cur_page + 1)}
          disabled={loading || meta.cur_page >= meta.total_pages}
          className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function UnifiedActivityTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("by-user");
  const [filters, setFilters] = useState<UnifiedFilters>({
    firmType: "",
    seniorityLevel: "",
    userStatus: "",
    companyId: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [userItems, setUserItems] = useState<UnifiedOverviewRow[]>([]);
  const [userMeta, setUserMeta] = useState<PaginatedMeta>({
    total_count: 0,
    cur_page: 1,
    per_page: UA_PER_PAGE,
    total_pages: 1,
    next_page: null,
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const [companyItems, setCompanyItems] = useState<CompanySummaryRow[]>([]);
  const [companyMeta, setCompanyMeta] = useState<PaginatedMeta>({
    total_count: 0,
    cur_page: 1,
    per_page: UA_PER_PAGE,
    total_pages: 1,
    next_page: null,
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<ClientCompanyOption[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const [expandedCompanyId, setExpandedCompanyId] = useState<number | null>(null);
  const [drilldownUsers, setDrilldownUsers] = useState<UnifiedOverviewRow[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);

  const updateFilter = (key: keyof UnifiedFilters, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let aborted = false;
    async function loadCompanies() {
      setCompaniesLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : "";
        const res = await fetch("/api/admin/client-companies", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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

  const fetchUnifiedOverview = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const res = await authFetch(
        `${UNIFIED_OVERVIEW_URL}?${unifiedOverviewQueryParams(
          filters,
          searchQuery,
          page,
          UA_PER_PAGE
        )}`
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const itemsRaw = Array.isArray(json.items) ? json.items : [];
      const items = itemsRaw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(mapUnifiedOverviewRow)
        .filter((r) => r.user_id > 0);

      setUserItems(items);
      setUserMeta(parsePaginatedMeta(json));
    } catch (e) {
      setUserItems([]);
      setUserMeta({
        total_count: 0,
        cur_page: 1,
        per_page: UA_PER_PAGE,
        total_pages: 1,
        next_page: null,
      });
      setUserError(e instanceof Error ? e.message : "Failed to load unified overview");
    } finally {
      setUserLoading(false);
    }
  }, [filters, searchQuery, page]);

  const fetchCompanySummary = useCallback(async () => {
    setCompanyLoading(true);
    setCompanyError(null);
    try {
      const res = await authFetch(
        `${COMPANY_SUMMARY_URL}?${companySummaryQueryParams(
          searchQuery,
          page,
          UA_PER_PAGE
        )}`
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const itemsRaw = Array.isArray(json.items) ? json.items : [];
      const items = itemsRaw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(mapCompanySummaryRow)
        .filter((r) => r.company_id > 0);

      setCompanyItems(items);
      setCompanyMeta(parsePaginatedMeta(json));
    } catch (e) {
      setCompanyItems([]);
      setCompanyMeta({
        total_count: 0,
        cur_page: 1,
        per_page: UA_PER_PAGE,
        total_pages: 1,
        next_page: null,
      });
      setCompanyError(
        e instanceof Error ? e.message : "Failed to load company summary"
      );
    } finally {
      setCompanyLoading(false);
    }
  }, [searchQuery, page]);

  const fetchCompanyDrilldown = useCallback(async (companyId: number) => {
    setDrilldownLoading(true);
    setDrilldownError(null);
    try {
      const res = await authFetch(
        `${UNIFIED_OVERVIEW_URL}?${unifiedOverviewQueryParams(
          { firmType: "", seniorityLevel: "", userStatus: "", companyId: "" },
          "",
          1,
          UA_DRILLDOWN_PER_PAGE,
          companyId
        )}`
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const itemsRaw = Array.isArray(json.items) ? json.items : [];
      const items = itemsRaw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(mapUnifiedOverviewRow)
        .filter((r) => r.user_id > 0);
      setDrilldownUsers(items);
    } catch (e) {
      setDrilldownUsers([]);
      setDrilldownError(
        e instanceof Error ? e.message : "Failed to load company users"
      );
    } finally {
      setDrilldownLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode !== "by-user") return;
    fetchUnifiedOverview();
  }, [viewMode, fetchUnifiedOverview]);

  useEffect(() => {
    if (viewMode !== "by-company") return;
    fetchCompanySummary();
  }, [viewMode, fetchCompanySummary]);

  useEffect(() => {
    setPage(1);
    setExpandedCompanyId(null);
    setDrilldownUsers([]);
    setDrilldownError(null);
  }, [viewMode]);

  const toggleCompanyExpand = (companyId: number) => {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null);
      setDrilldownUsers([]);
      setDrilldownError(null);
      return;
    }
    setExpandedCompanyId(companyId);
    setDrilldownUsers([]);
    fetchCompanyDrilldown(companyId);
  };

  const refresh = () => {
    if (viewMode === "by-user") {
      fetchUnifiedOverview();
      return;
    }
    fetchCompanySummary();
    if (expandedCompanyId != null) {
      fetchCompanyDrilldown(expandedCompanyId);
    }
  };

  const loading = viewMode === "by-user" ? userLoading : companyLoading;
  const error = viewMode === "by-user" ? userError : companyError;
  const meta = viewMode === "by-user" ? userMeta : companyMeta;

  const hasActiveFilters =
    !!filters.firmType ||
    !!filters.seniorityLevel ||
    !!filters.userStatus ||
    !!filters.companyId ||
    !!searchInput;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded border overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode("by-user")}
            className={`px-4 py-2 text-sm ${
              viewMode === "by-user"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            By User
          </button>
          <button
            type="button"
            onClick={() => setViewMode("by-company")}
            className={`px-4 py-2 text-sm border-l ${
              viewMode === "by-company"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            By Company
          </button>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || drilldownLoading}
          className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading || drilldownLoading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={
            viewMode === "by-company"
              ? "Search company name…"
              : "Search name, email, company…"
          }
          className="text-sm border rounded px-2 py-1.5 min-w-[220px]"
        />

        {viewMode === "by-user" ? (
          <>
            <select
              value={filters.companyId}
              onChange={(e) => updateFilter("companyId", e.target.value)}
              disabled={companiesLoading}
              className="text-sm border rounded px-2 py-1.5 min-w-[180px]"
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filters.firmType}
              onChange={(e) => updateFilter("firmType", e.target.value)}
              className="text-sm border rounded px-2 py-1.5 min-w-[160px]"
            >
              <option value="">All firm types</option>
              {UA_FIRM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filters.seniorityLevel}
              onChange={(e) => updateFilter("seniorityLevel", e.target.value)}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="">All seniority</option>
              {UA_SENIORITY_LEVELS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filters.userStatus}
              onChange={(e) => updateFilter("userStatus", e.target.value)}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="">All user statuses</option>
              {UA_USER_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSearchInput("");
              setSearchQuery("");
              setFilters({
                firmType: "",
                seniorityLevel: "",
                userStatus: "",
                companyId: "",
              });
            }}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-auto bg-white rounded border">
        {viewMode === "by-user" ? (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {USER_TABLE_HEADERS.map((label) => (
                  <th key={label} className="px-3 py-2 text-left whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userLoading ? (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={USER_TABLE_HEADERS.length}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!userLoading && !userError && userItems.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={USER_TABLE_HEADERS.length}>
                    No results
                  </td>
                </tr>
              ) : null}
              {!userLoading && !userError
                ? userItems.map((row) => (
                    <UnifiedUserRow key={row.user_id} row={row} />
                  ))
                : null}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {[
                  "Company",
                  "Users",
                  "Sessions 30d",
                  "Page views 30d",
                  "Sessions 90d",
                  "Page views 90d",
                  "Last activity",
                ].map((label) => (
                  <th key={label} className="px-3 py-2 text-left whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companyLoading ? (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!companyLoading && !companyError && companyItems.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={7}>
                    No results
                  </td>
                </tr>
              ) : null}
              {!companyLoading && !companyError
                ? companyItems.map((row) => {
                    const expanded = expandedCompanyId === row.company_id;
                    return (
                      <Fragment key={row.company_id}>
                        <tr
                          className="border-t cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleCompanyExpand(row.company_id)}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">
                                {expanded ? "▼" : "▶"}
                              </span>
                              {row.company_id > 0 ? (
                                <Link
                                  href={`/company/${row.company_id}`}
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {row.company_name || "—"}
                                </Link>
                              ) : (
                                row.company_name || "—"
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">{formatMetric(row.total_users)}</td>
                          <td className="px-3 py-2">
                            {formatMetric(row.total_sessions_30d)}
                          </td>
                          <td className="px-3 py-2">
                            {formatMetric(row.total_page_views_30d)}
                          </td>
                          <td className="px-3 py-2">
                            {formatMetric(row.total_sessions_90d)}
                          </td>
                          <td className="px-3 py-2">
                            {formatMetric(row.total_page_views_90d)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatTimestamp(row.last_activity_at)}
                          </td>
                        </tr>
                        {expanded ? (
                          <tr key={`${row.company_id}-drilldown`} className="border-t bg-gray-50">
                            <td colSpan={7} className="p-0">
                              {drilldownLoading ? (
                                <div className="px-4 py-4 text-sm text-gray-500">
                                  Loading users…
                                </div>
                              ) : drilldownError ? (
                                <div className="px-4 py-4 text-sm text-red-700">
                                  {drilldownError}
                                </div>
                              ) : drilldownUsers.length === 0 ? (
                                <div className="px-4 py-4 text-sm text-gray-500">
                                  No users found for this company.
                                </div>
                              ) : (
                                <div className="overflow-x-auto px-4 py-3">
                                  <table className="min-w-full text-sm bg-white rounded border">
                                    <thead className="bg-gray-50 text-gray-700">
                                      <tr>
                                        {USER_TABLE_HEADERS.map((label) => (
                                          <th
                                            key={`drill-${label}`}
                                            className="px-3 py-2 text-left whitespace-nowrap"
                                          >
                                            {label}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {drilldownUsers.map((userRow) => (
                                        <UnifiedUserRow
                                          key={`drill-${userRow.user_id}`}
                                          row={userRow}
                                        />
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                : null}
            </tbody>
          </table>
        )}

        <PaginationBar
          meta={meta}
          loading={loading}
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </div>
    </div>
  );
}
