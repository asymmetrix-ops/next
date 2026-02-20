"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";

type SortDirection = "asc" | "desc";

function compareValues(a: unknown, b: unknown, dir: SortDirection): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return -1 * mul;
  if (b == null) return 1 * mul;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  return String(a).localeCompare(String(b)) * mul;
}

// -------------------------
// User Activity
// -------------------------

type UserActivityRow = {
  user_id: number;
  user_name: string;
  user_email: string | null;
  company_name: string;
  // Newer API fields (as seen in analytics payload)
  sessions_last_24_hours?: number | null;
  page_views_last_24_hours?: number | null;
  sessions_last_7_days?: number | null;
  page_views_last_7_days?: number | null;

  // Existing/legacy fields (keep optional for backward compatibility)
  sessions_last_30_days?: number | null;
  sessions_last_90_days?: number | null;
  page_views_last_30_days?: number | null;
  page_views_last_90_days?: number | null;
  total_sessions?: number | null;
  total_page_views?: number | null;
  last_activity_timestamp: number | null;
};

type SortColumn = keyof UserActivityRow;

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

export function UserActivityTab() {
  const [data, setData] = useState<UserActivityRow[]>([]);
  const [loadingUa, setLoadingUa] = useState(false);
  const [errorUa, setErrorUa] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sortCol, setSortCol] = useState<SortColumn>("last_activity_timestamp");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    let aborted = false;
    async function fetchData() {
      setLoadingUa(true);
      setErrorUa(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const resp = await fetch(
          "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/user_activity",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as UserActivityRow[];
        if (!aborted) setData(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!aborted)
          setErrorUa(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!aborted) setLoadingUa(false);
      }
    }
    fetchData();
    return () => {
      aborted = true;
    };
  }, []);

  const companies = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      if (r.company_name) set.add(r.company_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => (companyFilter ? r.company_name === companyFilter : true))
      .filter((r) => {
        if (!q) return true;
        return (
          r.user_name?.toLowerCase().includes(q) ||
          (r.user_email || "")?.toLowerCase().includes(q) ||
          r.company_name?.toLowerCase().includes(q)
        );
      })
      .slice()
      .sort((a, b) => compareValues(a[sortCol], b[sortCol], sortDir));
  }, [data, search, companyFilter, sortCol, sortDir]);

  function onSort(col: SortColumn) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(
        col === "user_name" || col === "user_email" || col === "company_name"
          ? "asc"
          : "desc"
      );
    }
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, company"
          className="px-3 py-2 w-full rounded border"
        />
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="px-3 py-2 w-full rounded border"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-auto bg-white rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {(
                [
                  ["user_id", "User ID"],
                  ["user_name", "User Name"],
                  ["user_email", "User Email"],
                  ["company_name", "Company"],
                  ["sessions_last_24_hours", "Sessions 24h"],
                  ["page_views_last_24_hours", "Page Views 24h"],
                  ["sessions_last_7_days", "Sessions 7d"],
                  ["page_views_last_7_days", "Page Views 7d"],
                  ["sessions_last_30_days", "Sessions 30d"],
                  ["sessions_last_90_days", "Sessions 90d"],
                  ["page_views_last_30_days", "Page Views 30d"],
                  ["page_views_last_90_days", "Page Views 90d"],
                  ["total_sessions", "Total Sessions"],
                  ["total_page_views", "Total Page Views"],
                  ["last_activity_timestamp", "Last Activity"],
                ] as [SortColumn, string][]
              ).map(([key, label]) => (
                <th key={key} className="px-3 py-2 text-left whitespace-nowrap">
                  <button
                    onClick={() => onSort(key)}
                    className="inline-flex items-center gap-1 hover:underline"
                    title="Sort"
                  >
                    <span>{label}</span>
                    {sortCol === key && (
                      <span className="text-xs text-gray-500">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingUa && (
              <tr>
                <td className="px-3 py-3 text-center" colSpan={15}>
                  Loading…
                </td>
              </tr>
            )}
            {errorUa && !loadingUa && (
              <tr>
                <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={15}>
                  {errorUa}
                </td>
              </tr>
            )}
            {!loadingUa && !errorUa && filtered.length === 0 && (
              <tr>
                <td
                  className="px-3 py-3 text-center text-gray-500"
                  colSpan={15}
                >
                  No results
                </td>
              </tr>
            )}
            {!loadingUa &&
              !errorUa &&
              filtered.map((r) => (
                <tr
                  key={`${r.user_id}-${r.user_email || ""}`}
                  className="border-t"
                >
                  <td className="px-3 py-2">{r.user_id}</td>
                  <td className="px-3 py-2">{r.user_name}</td>
                  <td className="px-3 py-2">{r.user_email || "—"}</td>
                  <td className="px-3 py-2">{r.company_name}</td>
                  <td className="px-3 py-2">
                    {formatMetric(r.sessions_last_24_hours)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.page_views_last_24_hours)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.sessions_last_7_days)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.page_views_last_7_days)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.sessions_last_30_days)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.sessions_last_90_days)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.page_views_last_30_days)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.page_views_last_90_days)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.total_sessions)}
                  </td>
                  <td className="px-3 py-2">
                    {formatMetric(r.total_page_views)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatTimestamp(r.last_activity_timestamp)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------
// Platform Wide Search Analytics
// -------------------------

const PLATFORM_WIDE_SEARCH_ANALYTICS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/platform_wide_search_analytics";

type PlatformWideSearchRow = {
  query: string;
  search_count: number;
  unique_users: number;
  unique_sessions: number;
};

type PlatformWideSearchSortCol =
  | "query"
  | "search_count"
  | "unique_users"
  | "unique_sessions";

export function PlatformWideSearchTab() {
  const [data, setData] = useState<PlatformWideSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<PlatformWideSearchSortCol>("search_count");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    let aborted = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const resp = await fetch(PLATFORM_WIDE_SEARCH_ANALYTICS_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as PlatformWideSearchRow[];
        if (!aborted) setData(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!aborted)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      aborted = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => (q ? r.query?.toLowerCase().includes(q) : true))
      .slice()
      .sort((a, b) =>
        compareValues(
          a[sortCol],
          b[sortCol],
          sortDir
        )
      );
  }, [data, search, sortCol, sortDir]);

  function onSort(col: PlatformWideSearchSortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "query" ? "asc" : "desc");
    }
  }

  const columns: [PlatformWideSearchSortCol, string][] = [
    ["query", "Query"],
    ["search_count", "Search Count"],
    ["unique_users", "Unique Users"],
    ["unique_sessions", "Unique Sessions"],
  ];

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by query..."
          className="px-3 py-2 w-full max-w-md rounded border"
        />
      </div>

      <div className="overflow-auto bg-white rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {columns.map(([key, label]) => (
                <th key={key} className="px-3 py-2 text-left whitespace-nowrap">
                  <button
                    onClick={() => onSort(key)}
                    className="inline-flex items-center gap-1 hover:underline"
                    title="Sort"
                  >
                    <span>{label}</span>
                    {sortCol === key && (
                      <span className="text-xs text-gray-500">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-3 text-center" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={4}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-gray-500" colSpan={4}>
                  No results
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filtered.map((r, idx) => (
                <tr key={`${r.query}-${idx}`} className="border-t">
                  <td className="px-3 py-2">{r.query || "—"}</td>
                  <td className="px-3 py-2">{formatMetric(r.search_count)}</td>
                  <td className="px-3 py-2">{formatMetric(r.unique_users)}</td>
                  <td className="px-3 py-2">{formatMetric(r.unique_sessions)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------
// Company Search Analytics
// -------------------------

const COMPANY_SEARCH_ANALYTICS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/get_company_searched";

type CompanySearchRow = {
  query: string | null;
  filters_used: string;
  search_count: number;
  unique_users: number;
  unique_sessions: number;
};

type CompanySearchSortCol =
  | "query"
  | "filters_used"
  | "search_count"
  | "unique_users"
  | "unique_sessions";

export function CompanySearchTab() {
  const [data, setData] = useState<CompanySearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<CompanySearchSortCol>("search_count");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    let aborted = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const resp = await fetch(COMPANY_SEARCH_ANALYTICS_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as CompanySearchRow[];
        if (!aborted) setData(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!aborted)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      aborted = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => {
        if (!q) return true;
        const queryStr = (r.query ?? "").toLowerCase();
        const filtersStr = (r.filters_used ?? "").toLowerCase();
        return queryStr.includes(q) || filtersStr.includes(q);
      })
      .slice()
      .sort((a, b) => compareValues(a[sortCol], b[sortCol], sortDir));
  }, [data, search, sortCol, sortDir]);

  function onSort(col: CompanySearchSortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "query" || col === "filters_used" ? "asc" : "desc");
    }
  }

  const columns: [CompanySearchSortCol, string][] = [
    ["query", "Query"],
    ["filters_used", "Filters Used"],
    ["search_count", "Search Count"],
    ["unique_users", "Unique Users"],
    ["unique_sessions", "Unique Sessions"],
  ];

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by query or filters..."
          className="px-3 py-2 w-full max-w-md rounded border"
        />
      </div>

      <div className="overflow-auto bg-white rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {columns.map(([key, label]) => (
                <th key={key} className="px-3 py-2 text-left whitespace-nowrap">
                  <button
                    onClick={() => onSort(key)}
                    className="inline-flex items-center gap-1 hover:underline"
                    title="Sort"
                  >
                    <span>{label}</span>
                    {sortCol === key && (
                      <span className="text-xs text-gray-500">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-3 text-center" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={5}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-gray-500" colSpan={5}>
                  No results
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filtered.map((r, idx) => (
                <tr key={`${r.query ?? ""}-${r.filters_used}-${idx}`} className="border-t">
                  <td className="px-3 py-2">{r.query ?? "—"}</td>
                  <td className="px-3 py-2 max-w-xs truncate font-mono text-xs" title={r.filters_used}>
                    {r.filters_used || "—"}
                  </td>
                  <td className="px-3 py-2">{formatMetric(r.search_count)}</td>
                  <td className="px-3 py-2">{formatMetric(r.unique_users)}</td>
                  <td className="px-3 py-2">{formatMetric(r.unique_sessions)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------
// Content Insights
// -------------------------

type ContentInsightsView = "Individual" | "Content Type" | "Top Articles Per Type";
type ContentInsightsRow = Record<string, unknown>;
type ContentInsightsSortColumn = string;

export function ContentInsightsTab() {
  const [view, setView] = useState<ContentInsightsView>("Top Articles Per Type");
  const [data, setData] = useState<ContentInsightsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>(
    []
  );
  const [sortCol, setSortCol] = useState<ContentInsightsSortColumn>("");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const values = await locationsService.getContentTypesForArticles();
        if (!cancelled) setAvailableContentTypes(values);
      } catch {
        if (!cancelled) setAvailableContentTypes([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let aborted = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const url = new URL(
          "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/content_insights"
        );

        let resp: Response;
        if (selectedContentTypes.length > 0) {
          resp = await fetch(url.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ view, content_type: selectedContentTypes }),
          });
        } else {
          url.searchParams.append("view", view);
          resp = await fetch(url.toString(), {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
        }

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as ContentInsightsRow[];
        if (!aborted) {
          const rows = Array.isArray(json) ? json : [];
          setData(rows);
          if (rows.length > 0) {
            const keys = Object.keys(rows[0] as Record<string, unknown>);
            if (view === "Top Articles Per Type" || view === "Content Type") {
              setSortCol(
                keys.includes("total_page_views")
                  ? "total_page_views"
                  : keys.includes("total_views")
                    ? "total_views"
                    : "page_views_90d"
              );
            } else {
              setSortCol(keys[0] || "");
            }
          }
        }
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      aborted = true;
    };
  }, [view, selectedContentTypes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => {
        if (!q) return true;
        return Object.values(r).some((v) =>
          String(v || "").toLowerCase().includes(q)
        );
      })
      .slice()
      .sort((a, b) => {
        if (!sortCol) return 0;
        return compareValues(
          (a as Record<string, unknown>)[sortCol],
          (b as Record<string, unknown>)[sortCol],
          sortDir
        );
      });
  }, [data, search, sortCol, sortDir]);

  function onSort(col: ContentInsightsSortColumn) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  function formatDate(dateStr: string | unknown): string {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr as string);
      if (Number.isNaN(d.getTime())) return String(dateStr);
      return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
      );
    } catch {
      return String(dateStr);
    }
  }

  function getColumnHeaders(): [string, string][] {
    if (data.length === 0) return [];
    const firstRow = data[0] as Record<string, unknown>;
    const keys = Object.keys(firstRow);

    const labelMap: Record<string, string> = {
      Content_Type: "Content Type",
      content_type: "Content Type",
      content_id: "Content ID",
      Headline: "Headline",
      headline: "Headline",
      Publication_Date: "Publication Date",
      publication_date: "Publication Date",
      sessions_24h: "Sessions 24h",
      page_views_24h: "Page Views 24h",
      views_24h: "Views 24h",
      sessions_7d: "Sessions 7d",
      page_views_7d: "Page Views 7d",
      views_7d: "Views 7d",
      sessions_30d: "Sessions 30d",
      page_views_30d: "Page Views 30d",
      views_30d: "Views 30d",
      sessions_90d: "Sessions 90d",
      page_views_90d: "Page Views 90d",
      views_90d: "Views 90d",
      total_sessions: "Total Sessions",
      total_page_views: "Total Page Views",
      total_views: "Total Views",
      unique_users: "Unique Users",
      number_of_articles: "Articles",
      last_viewed: "Last Viewed",
      rank_in_type: "Rank in Type",
    };

    const preferredOrder = [
      "Content_Type",
      "content_type",
      "content_id",
      "Headline",
      "headline",
      "Publication_Date",
      "publication_date",
      "sessions_24h",
      "page_views_24h",
      "views_24h",
      "sessions_7d",
      "page_views_7d",
      "views_7d",
      "sessions_30d",
      "page_views_30d",
      "views_30d",
      "sessions_90d",
      "page_views_90d",
      "views_90d",
      "total_sessions",
      "total_page_views",
      "total_views",
      "unique_users",
      "number_of_articles",
      "last_viewed",
      "rank_in_type",
    ];
    const orderIndex = new Map<string, number>(
      preferredOrder.map((k, i) => [k, i])
    );

    const ordered = keys.slice().sort((a, b) => {
      const ai = orderIndex.get(a);
      const bi = orderIndex.get(b);
      const aKnown = typeof ai === "number";
      const bKnown = typeof bi === "number";
      if (aKnown && bKnown) return ai! - bi!;
      if (aKnown) return -1;
      if (bKnown) return 1;
      return a.localeCompare(b);
    });

    return ordered.map((key) => [key, labelMap[key] || key] as [string, string]);
  }

  const columnHeaders = getColumnHeaders();
  const columnCount = columnHeaders.length || 1;

  return (
    <div>
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setView("Individual")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Individual"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Individual
        </button>
        <button
          onClick={() => setView("Content Type")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Content Type"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Content Type
        </button>
        <button
          onClick={() => setView("Top Articles Per Type")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Top Articles Per Type"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Top Articles Per Type
        </button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-2 w-full rounded border"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">
            Content Types (select one or more)
          </label>
          <SearchableSelect
            options={availableContentTypes.map((ct) => ({
              value: ct,
              label: ct,
            }))}
            value={""}
            onChange={(value) => {
              if (
                typeof value === "string" &&
                !selectedContentTypes.includes(value)
              ) {
                setSelectedContentTypes([...selectedContentTypes, value]);
              }
            }}
            placeholder={
              availableContentTypes.length === 0
                ? "Loading content types..."
                : "Select content types to filter"
            }
            disabled={availableContentTypes.length === 0}
            style={{ width: "100%" }}
          />
          {selectedContentTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedContentTypes.map((ct) => (
                <span
                  key={ct}
                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                >
                  {ct}
                  <button
                    onClick={() =>
                      setSelectedContentTypes(
                        selectedContentTypes.filter((x) => x !== ct)
                      )
                    }
                    className="font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-auto bg-white rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {columnHeaders.map(([key, label]) => (
                <th key={key} className="px-3 py-2 text-left whitespace-nowrap">
                  <button
                    onClick={() => onSort(key)}
                    className="inline-flex items-center gap-1 hover:underline"
                    title="Sort"
                  >
                    <span>{label}</span>
                    {sortCol === key && (
                      <span className="text-xs text-gray-500">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-3 text-center" colSpan={columnCount}>
                  Loading…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td
                  className="px-3 py-3 text-red-700 bg-red-50"
                  colSpan={columnCount}
                >
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td
                  className="px-3 py-3 text-center text-gray-500"
                  colSpan={columnCount}
                >
                  No results
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filtered.map((r, idx) => {
                const row = r as Record<string, unknown>;
                const rowKey =
                  (row.content_id as number | undefined)?.toString() ||
                  (row.Content_Type as string | undefined) ||
                  `row-${idx}`;
                return (
                  <tr key={rowKey} className="border-t">
                    {columnHeaders.map(([key]) => {
                      const value = row[key];

                      if (
                        (key === "content_id" || key === "Content_ID") &&
                        view === "Top Articles Per Type" &&
                        value != null
                      ) {
                        const contentId = String(value);
                        return (
                          <td key={key} className="px-3 py-2">
                            <Link
                              href={`/article/${contentId}`}
                              className="text-blue-600 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {contentId}
                            </Link>
                          </td>
                        );
                      }

                      if (
                        (key === "Publication_Date" ||
                          key === "publication_date") &&
                        value
                      ) {
                        return (
                          <td key={key} className="px-3 py-2 whitespace-nowrap">
                            {formatDate(value)}
                          </td>
                        );
                      }

                      if (key === "last_viewed" && value) {
                        return (
                          <td key={key} className="px-3 py-2 whitespace-nowrap">
                            {formatDate(value)}
                          </td>
                        );
                      }

                      return (
                        <td key={key} className="px-3 py-2">
                          {value == null ? "—" : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------
// Page Insights
// -------------------------

type PageInsightsView =
  | "Companies"
  | "Sectors"
  | "Investors"
  | "Advisors"
  | "Individuals"
  | "Corporate Events";

type PageInsightsMetrics = {
  sessions_24h: number;
  views_24h: number;
  sessions_7d: number;
  views_7d: number;
  sessions_30d: number;
  views_30d: number;
  sessions_90d: number;
  views_90d: number;
  total_sessions: number;
  total_views: number;
  unique_users: number;
  last_viewed: string | null;
};

type PageInsightsCompanyRow = {
  company_id: number;
  company_name: string;
} & PageInsightsMetrics;

type PageInsightsSectorRow = {
  sector_id: number;
  sector_name: string;
} & PageInsightsMetrics;

type PageInsightsInvestorRow = {
  investor_id: number;
  investor_name: string;
} & PageInsightsMetrics;

type PageInsightsAdvisorRow = {
  advisor_id: number;
  advisor_name: string;
} & PageInsightsMetrics;

type PageInsightsIndividualRow = {
  individual_id: number;
  individual_name: string;
} & PageInsightsMetrics;

type PageInsightsCorporateEventRow = {
  event_id: number;
  event_name: string;
  deal_type: string | null;
} & PageInsightsMetrics;

type InsightsColumnDef<T> = { key: keyof T; label: string };

function toXanoTimestamp(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const raw = String(v).trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(normalized);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatXanoDateTime(v: unknown): string {
  const ms = toXanoTimestamp(v);
  if (!ms) return v ? String(v) : "—";
  const d = new Date(ms);
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
}

function buildInsightsColumns<
  T extends PageInsightsMetrics & Record<string, unknown>,
>(params: {
  idKey: keyof T;
  nameKey: keyof T;
  idLabel: string;
  nameLabel: string;
  extraColumns?: Array<InsightsColumnDef<T>>;
}): InsightsColumnDef<T>[] {
  const { idKey, nameKey, idLabel, nameLabel, extraColumns } = params;
  const metricCols = [
    ["sessions_24h", "Sessions 24h"],
    ["views_24h", "Views 24h"],
    ["sessions_7d", "Sessions 7d"],
    ["views_7d", "Views 7d"],
    ["sessions_30d", "Sessions 30d"],
    ["views_30d", "Views 30d"],
    ["sessions_90d", "Sessions 90d"],
    ["views_90d", "Views 90d"],
    ["total_sessions", "Total Sessions"],
    ["total_views", "Total Views"],
    ["unique_users", "Unique Users"],
    ["last_viewed", "Last Viewed"],
  ] as const;

  return [
    { key: idKey, label: idLabel },
    { key: nameKey, label: nameLabel },
    ...(extraColumns || []),
    ...metricCols.map(([k, label]) => ({ key: k as keyof T, label })),
  ];
}

function useInsightsData<T>(params: { url: string; enabled: boolean }) {
  const { url, enabled } = params;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnceRef = useRef(false);

  const run = useMemo(() => {
    return async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const resp = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as unknown;
        const rows = Array.isArray(json) ? (json as T[]) : [];
        setData(rows);
        loadedOnceRef.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
  }, [url]);

  useEffect(() => {
    if (!enabled) return;
    if (loadedOnceRef.current) return;
    void run();
  }, [enabled, run]);

  return { data, loading, error } as const;
}

function useInsightsSort<T extends Record<string, unknown>>(params: {
  defaultSortCol: keyof T;
  defaultSortDir: SortDirection;
  textSortCol: keyof T;
}) {
  const { defaultSortCol, defaultSortDir, textSortCol } = params;
  const [sortCol, setSortCol] = useState<keyof T>(defaultSortCol);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);

  const onSort = (col: keyof T) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortCol(col);
    setSortDir(col === textSortCol ? "asc" : "desc");
  };

  return { sortCol, sortDir, onSort } as const;
}

function filterAndSortInsightsRows<T extends Record<string, unknown>>(params: {
  rows: T[];
  search: string;
  searchKeys: Array<keyof T>;
  sortCol: keyof T;
  sortDir: SortDirection;
  dateKey?: keyof T;
}): T[] {
  const { rows, search, searchKeys, sortCol, sortDir, dateKey } = params;
  const q = search.trim().toLowerCase();

  const filtered = !q
    ? rows
    : rows.filter((r) =>
        searchKeys.some((k) =>
          String((r as Record<string, unknown>)[k as string] ?? "")
            .toLowerCase()
            .includes(q)
        )
      );

  return filtered.slice().sort((a, b) => {
    if (dateKey && sortCol === dateKey) {
      const ta = toXanoTimestamp(
        (a as Record<string, unknown>)[dateKey as string]
      );
      const tb = toXanoTimestamp(
        (b as Record<string, unknown>)[dateKey as string]
      );
      return compareValues(ta, tb, sortDir);
    }
    return compareValues(
      (a as Record<string, unknown>)[sortCol as string],
      (b as Record<string, unknown>)[sortCol as string],
      sortDir
    );
  });
}

function InsightsTable<T extends Record<string, unknown>>(props: {
  columns: Array<InsightsColumnDef<T>>;
  rows: T[];
  loading: boolean;
  error: string | null;
  sortCol: keyof T;
  sortDir: SortDirection;
  onSort: (col: keyof T) => void;
  getRowKey: (row: T) => string | number;
  nameKey: keyof T;
  dateKey?: keyof T;
}) {
  const {
    columns,
    rows,
    loading,
    error,
    sortCol,
    sortDir,
    onSort,
    getRowKey,
    nameKey,
    dateKey,
  } = props;

  return (
    <div className="overflow-auto bg-white rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            {columns.map(({ key, label }) => (
              <th
                key={String(key)}
                className="px-3 py-2 text-left whitespace-nowrap"
              >
                <button
                  onClick={() => onSort(key)}
                  className="inline-flex items-center gap-1 hover:underline"
                  title="Sort"
                >
                  <span>{label}</span>
                  {sortCol === key && (
                    <span className="text-xs text-gray-500">
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="px-3 py-3 text-center" colSpan={columns.length}>
                Loading…
              </td>
            </tr>
          )}
          {error && !loading && (
            <tr>
              <td
                className="px-3 py-3 text-red-700 bg-red-50"
                colSpan={columns.length}
              >
                {error}
              </td>
            </tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr>
              <td
                className="px-3 py-3 text-center text-gray-500"
                colSpan={columns.length}
              >
                No results
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            rows.map((r) => (
              <tr key={String(getRowKey(r))} className="border-t">
                {columns.map(({ key }) => {
                  const value = (r as Record<string, unknown>)[key as string];
                  if (dateKey && key === dateKey) {
                    return (
                      <td
                        key={String(key)}
                        className="px-3 py-2 whitespace-nowrap"
                      >
                        {formatXanoDateTime(value)}
                      </td>
                    );
                  }
                  if (key === nameKey) {
                    return (
                      <td key={String(key)} className="px-3 py-2">
                        {value ? String(value) : "—"}
                      </td>
                    );
                  }
                  return (
                    <td key={String(key)} className="px-3 py-2">
                      {value == null ? "—" : String(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageInsightsTab() {
  const [view, setView] = useState<PageInsightsView>("Companies");
  const [search, setSearch] = useState("");

  const companiesQ = useInsightsData<PageInsightsCompanyRow>({
    url: "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/acitvity_by_company",
    enabled: view === "Companies",
  });
  const sectorsQ = useInsightsData<PageInsightsSectorRow>({
    url: "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/activity_by_sectors",
    enabled: view === "Sectors",
  });
  const investorsQ = useInsightsData<PageInsightsInvestorRow>({
    url: "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/activity_by_investors",
    enabled: view === "Investors",
  });
  const advisorsQ = useInsightsData<PageInsightsAdvisorRow>({
    url: "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/acitivity_by_advisor",
    enabled: view === "Advisors",
  });
  const individualsQ = useInsightsData<PageInsightsIndividualRow>({
    url: "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/activity_by_individual",
    enabled: view === "Individuals",
  });
  const corporateEventsQ = useInsightsData<PageInsightsCorporateEventRow>({
    url: "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/activity_by_ce",
    enabled: view === "Corporate Events",
  });

  const companySort = useInsightsSort<PageInsightsCompanyRow>({
    defaultSortCol: "views_24h",
    defaultSortDir: "desc",
    textSortCol: "company_name",
  });
  const sectorSort = useInsightsSort<PageInsightsSectorRow>({
    defaultSortCol: "views_24h",
    defaultSortDir: "desc",
    textSortCol: "sector_name",
  });
  const investorSort = useInsightsSort<PageInsightsInvestorRow>({
    defaultSortCol: "views_24h",
    defaultSortDir: "desc",
    textSortCol: "investor_name",
  });
  const advisorSort = useInsightsSort<PageInsightsAdvisorRow>({
    defaultSortCol: "views_24h",
    defaultSortDir: "desc",
    textSortCol: "advisor_name",
  });
  const individualSort = useInsightsSort<PageInsightsIndividualRow>({
    defaultSortCol: "views_24h",
    defaultSortDir: "desc",
    textSortCol: "individual_name",
  });
  const corporateEventSort = useInsightsSort<PageInsightsCorporateEventRow>({
    defaultSortCol: "views_24h",
    defaultSortDir: "desc",
    textSortCol: "event_name",
  });

  const companyColumns = useMemo(
    () =>
      buildInsightsColumns<PageInsightsCompanyRow>({
        idKey: "company_id",
        nameKey: "company_name",
        idLabel: "Company ID",
        nameLabel: "Company",
      }),
    []
  );
  const sectorColumns = useMemo(
    () =>
      buildInsightsColumns<PageInsightsSectorRow>({
        idKey: "sector_id",
        nameKey: "sector_name",
        idLabel: "Sector ID",
        nameLabel: "Sector",
      }),
    []
  );
  const investorColumns = useMemo(
    () =>
      buildInsightsColumns<PageInsightsInvestorRow>({
        idKey: "investor_id",
        nameKey: "investor_name",
        idLabel: "Investor ID",
        nameLabel: "Investor",
      }),
    []
  );
  const advisorColumns = useMemo(
    () =>
      buildInsightsColumns<PageInsightsAdvisorRow>({
        idKey: "advisor_id",
        nameKey: "advisor_name",
        idLabel: "Advisor ID",
        nameLabel: "Advisor",
      }),
    []
  );
  const individualColumns = useMemo(
    () =>
      buildInsightsColumns<PageInsightsIndividualRow>({
        idKey: "individual_id",
        nameKey: "individual_name",
        idLabel: "Individual ID",
        nameLabel: "Individual",
      }),
    []
  );
  const corporateEventColumns = useMemo(
    () =>
      buildInsightsColumns<PageInsightsCorporateEventRow>({
        idKey: "event_id",
        nameKey: "event_name",
        idLabel: "Event ID",
        nameLabel: "Event",
        extraColumns: [{ key: "deal_type", label: "Deal Type" }],
      }),
    []
  );

  const filteredCompanies = useMemo(() => {
    return filterAndSortInsightsRows<PageInsightsCompanyRow>({
      rows: companiesQ.data,
      search,
      searchKeys: ["company_id", "company_name"],
      sortCol: companySort.sortCol,
      sortDir: companySort.sortDir,
      dateKey: "last_viewed",
    });
  }, [companiesQ.data, search, companySort.sortCol, companySort.sortDir]);

  const filteredSectors = useMemo(() => {
    return filterAndSortInsightsRows<PageInsightsSectorRow>({
      rows: sectorsQ.data,
      search,
      searchKeys: ["sector_id", "sector_name"],
      sortCol: sectorSort.sortCol,
      sortDir: sectorSort.sortDir,
      dateKey: "last_viewed",
    });
  }, [sectorsQ.data, search, sectorSort.sortCol, sectorSort.sortDir]);

  const filteredInvestors = useMemo(() => {
    return filterAndSortInsightsRows<PageInsightsInvestorRow>({
      rows: investorsQ.data,
      search,
      searchKeys: ["investor_id", "investor_name"],
      sortCol: investorSort.sortCol,
      sortDir: investorSort.sortDir,
      dateKey: "last_viewed",
    });
  }, [investorsQ.data, search, investorSort.sortCol, investorSort.sortDir]);

  const filteredAdvisors = useMemo(() => {
    return filterAndSortInsightsRows<PageInsightsAdvisorRow>({
      rows: advisorsQ.data,
      search,
      searchKeys: ["advisor_id", "advisor_name"],
      sortCol: advisorSort.sortCol,
      sortDir: advisorSort.sortDir,
      dateKey: "last_viewed",
    });
  }, [advisorsQ.data, search, advisorSort.sortCol, advisorSort.sortDir]);

  const filteredIndividuals = useMemo(() => {
    return filterAndSortInsightsRows<PageInsightsIndividualRow>({
      rows: individualsQ.data,
      search,
      searchKeys: ["individual_id", "individual_name"],
      sortCol: individualSort.sortCol,
      sortDir: individualSort.sortDir,
      dateKey: "last_viewed",
    });
  }, [individualsQ.data, search, individualSort.sortCol, individualSort.sortDir]);

  const filteredCorporateEvents = useMemo(() => {
    return filterAndSortInsightsRows<PageInsightsCorporateEventRow>({
      rows: corporateEventsQ.data,
      search,
      searchKeys: ["event_id", "event_name", "deal_type"],
      sortCol: corporateEventSort.sortCol,
      sortDir: corporateEventSort.sortDir,
      dateKey: "last_viewed",
    });
  }, [
    corporateEventsQ.data,
    search,
    corporateEventSort.sortCol,
    corporateEventSort.sortDir,
  ]);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Page Insights</h2>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setView("Companies")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Companies"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Companies
        </button>
        <button
          onClick={() => setView("Sectors")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Sectors"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Sectors
        </button>
        <button
          onClick={() => setView("Investors")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Investors"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Investors
        </button>
        <button
          onClick={() => setView("Advisors")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Advisors"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Advisors
        </button>
        <button
          onClick={() => setView("Individuals")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Individuals"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Individuals
        </button>
        <button
          onClick={() => setView("Corporate Events")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            view === "Corporate Events"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Corporate Events
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            view === "Companies"
              ? "Search company name or ID"
              : view === "Sectors"
                ? "Search sector name or ID"
                : view === "Investors"
                  ? "Search investor name or ID"
                  : view === "Advisors"
                    ? "Search advisor name or ID"
                    : view === "Individuals"
                      ? "Search individual name or ID"
                      : "Search event name, deal type, or ID"
          }
          className="px-3 py-2 w-full rounded border"
        />
      </div>

      {view === "Companies" && (
        <InsightsTable<PageInsightsCompanyRow>
          columns={companyColumns}
          rows={filteredCompanies}
          loading={companiesQ.loading}
          error={companiesQ.error}
          sortCol={companySort.sortCol}
          sortDir={companySort.sortDir}
          onSort={companySort.onSort}
          getRowKey={(r) => r.company_id}
          nameKey="company_name"
          dateKey="last_viewed"
        />
      )}

      {view === "Sectors" && (
        <InsightsTable<PageInsightsSectorRow>
          columns={sectorColumns}
          rows={filteredSectors}
          loading={sectorsQ.loading}
          error={sectorsQ.error}
          sortCol={sectorSort.sortCol}
          sortDir={sectorSort.sortDir}
          onSort={sectorSort.onSort}
          getRowKey={(r) => r.sector_id}
          nameKey="sector_name"
          dateKey="last_viewed"
        />
      )}

      {view === "Investors" && (
        <InsightsTable<PageInsightsInvestorRow>
          columns={investorColumns}
          rows={filteredInvestors}
          loading={investorsQ.loading}
          error={investorsQ.error}
          sortCol={investorSort.sortCol}
          sortDir={investorSort.sortDir}
          onSort={investorSort.onSort}
          getRowKey={(r) => r.investor_id}
          nameKey="investor_name"
          dateKey="last_viewed"
        />
      )}

      {view === "Advisors" && (
        <InsightsTable<PageInsightsAdvisorRow>
          columns={advisorColumns}
          rows={filteredAdvisors}
          loading={advisorsQ.loading}
          error={advisorsQ.error}
          sortCol={advisorSort.sortCol}
          sortDir={advisorSort.sortDir}
          onSort={advisorSort.onSort}
          getRowKey={(r) => r.advisor_id}
          nameKey="advisor_name"
          dateKey="last_viewed"
        />
      )}

      {view === "Individuals" && (
        <InsightsTable<PageInsightsIndividualRow>
          columns={individualColumns}
          rows={filteredIndividuals}
          loading={individualsQ.loading}
          error={individualsQ.error}
          sortCol={individualSort.sortCol}
          sortDir={individualSort.sortDir}
          onSort={individualSort.onSort}
          getRowKey={(r) => r.individual_id}
          nameKey="individual_name"
          dateKey="last_viewed"
        />
      )}

      {view === "Corporate Events" && (
        <InsightsTable<PageInsightsCorporateEventRow>
          columns={corporateEventColumns}
          rows={filteredCorporateEvents}
          loading={corporateEventsQ.loading}
          error={corporateEventsQ.error}
          sortCol={corporateEventSort.sortCol}
          sortDir={corporateEventSort.sortDir}
          onSort={corporateEventSort.onSort}
          getRowKey={(r) => r.event_id}
          nameKey="event_name"
          dateKey="last_viewed"
        />
      )}
    </div>
  );
}

