"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// PDF Export Activity
// -------------------------

const PDF_EXPORT_ACTIVITY_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/pdf_export_activity";

type PdfExportRow = {
  export_type: string;
  entity_title: string;
  download_count: number;
};

type PdfExportSortCol = keyof PdfExportRow;

export function PdfExportTab() {
  const [data, setData] = useState<PdfExportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<PdfExportSortCol>("download_count");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    let aborted = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const resp = await fetch(PDF_EXPORT_ACTIVITY_URL, {
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
        const json = (await resp.json()) as PdfExportRow[];
        if (!aborted) setData(Array.isArray(json) ? json : []);
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
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => {
        if (!q) return true;
        return (
          String(r.export_type || "")
            .toLowerCase()
            .includes(q) ||
          String(r.entity_title || "")
            .toLowerCase()
            .includes(q)
        );
      })
      .slice()
      .sort((a, b) => compareValues(a[sortCol], b[sortCol], sortDir));
  }, [data, search, sortCol, sortDir]);

  function onSort(col: PdfExportSortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "export_type" || col === "entity_title" ? "asc" : "desc");
    }
  }

  const columns: Array<[PdfExportSortCol, string]> = [
    ["export_type", "Export Type"],
    ["entity_title", "Entity Title"],
    ["download_count", "Download Count"],
  ];

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search export type or title..."
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
                <td className="px-3 py-3 text-center" colSpan={3}>
                  Loading…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={3}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-gray-500" colSpan={3}>
                  No results
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filtered.map((r, idx) => (
                <tr key={`${r.export_type}-${r.entity_title}-${idx}`} className="border-t">
                  <td className="px-3 py-2">{r.export_type || "—"}</td>
                  <td className="px-3 py-2">{r.entity_title || "—"}</td>
                  <td className="px-3 py-2">{formatMetric(r.download_count)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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

/** Turn filters_used JSON into readable text for non-technical users. */
function formatFiltersUsed(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "{}") return "None";

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return raw || "—";
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return "None";

  const lines: string[] = [];

  // ownership_types: [{ ownership_type_id, ownership_type_name }]
  const ownershipTypes = obj.ownership_types;
  if (Array.isArray(ownershipTypes) && ownershipTypes.length > 0) {
    const names = ownershipTypes
      .map((x) => (x as Record<string, unknown>)?.ownership_type_name)
      .filter((n): n is string => typeof n === "string");
    if (names.length) lines.push(`Ownership: ${names.join(", ")}`);
  }

  // primary_sectors: [{ sector_id, sector_name }]
  const primarySectors = obj.primary_sectors;
  if (Array.isArray(primarySectors) && primarySectors.length > 0) {
    const names = primarySectors
      .map((x) => (x as Record<string, unknown>)?.sector_name)
      .filter((n): n is string => typeof n === "string");
    if (names.length) lines.push(`Primary sectors: ${names.join(", ")}`);
  }

  // secondary_sectors: [{ sector_id, sector_name }]
  const secondarySectors = obj.secondary_sectors;
  if (Array.isArray(secondarySectors) && secondarySectors.length > 0) {
    const names = secondarySectors
      .map((x) => (x as Record<string, unknown>)?.sector_name)
      .filter((n): n is string => typeof n === "string");
    if (names.length) lines.push(`Secondary sectors: ${names.join(", ")}`);
  }

  // Any other keys: show key and a short summary
  const knownKeys = new Set([
    "ownership_types",
    "primary_sectors",
    "secondary_sectors",
  ]);
  for (const key of keys) {
    if (knownKeys.has(key)) continue;
    const val = obj[key];
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (Array.isArray(val) && val.length > 0) {
      const parts = val.map((v) =>
        typeof v === "object" && v && "name" in (v as object)
          ? String((v as Record<string, unknown>).name)
          : String(v)
      );
      lines.push(`${label}: ${parts.join(", ")}`);
    } else if (val != null && val !== "") {
      lines.push(`${label}: ${String(val)}`);
    }
  }

  return lines.length > 0 ? lines.join(" · ") : "None";
}

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
                  <td className="px-3 py-2 max-w-md text-gray-700" title={formatFiltersUsed(r.filters_used)}>
                    {formatFiltersUsed(r.filters_used)}
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
// Competitors (target company)
// -------------------------

const COMPETITORS_API_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/competitors";

type SectorWithName = { id: number; name: string };

type CompetitorsTarget = {
  company_id?: number;
  company_name?: string;
  primary_business_focus_id?: number[];
  primary_sectors?: SectorWithName[] | number[] | unknown[];
  secondary_sectors?: SectorWithName[] | number[];
};

type CompetitorsCompetitor = {
  competitor_id: number;
  competitor_name: string;
  competitor_primary_business_focus_ids?: number[];
  types_matched?: string[];
  appearance_count: number;
  type_counts?: Record<string, number>;
  content_ids_unique?: number[];
  content_hits_count?: number;
  content_id_frequencies?: Record<number, number>;
  matched_sector_ids?: number[];
  matched_target_sectors?: SectorWithName[];
};

/** Format sectors as "id (name)" when objects have id+name, else just the value. */
function formatSectors(
  items: SectorWithName[] | number[] | unknown[] | undefined
): string {
  if (!items?.length) return "—";
  return items
    .map((item) => {
      if (item != null && typeof item === "object" && "id" in (item as object) && "name" in (item as object)) {
        const s = item as SectorWithName;
        return s.name ? `${s.id} (${s.name})` : String(s.id);
      }
      return String(item);
    })
    .join(", ");
}

type CompetitorsResponse = {
  target: CompetitorsTarget | null;
  sort?: string[];
  competitors: CompetitorsCompetitor[];
};

const TYPE_PRIORITY: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };

function bestTypePriority(typesMatched: string[] | undefined): number {
  if (!typesMatched || typesMatched.length === 0) return 0;
  const priorities = typesMatched
    .map((t) => TYPE_PRIORITY[t] ?? 99)
    .filter((p) => p < 99);
  return priorities.length ? Math.min(...priorities) : 0;
}

export function CompetitorsTab() {
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState<CompetitorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetitors = async (currentLimit: number) => {
    const id = targetCompanyId.trim();
    if (!id) {
      setError("Enter a target company ID");
      return;
    }
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) {
      setError("Target company ID must be a number");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        target_company_id: String(numId),
        limit: String(currentLimit),
        min_score: "1",
      });
      const resp = await fetch(`${COMPETITORS_API_URL}?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`${resp.status} ${resp.statusText} ${text}`);
      }
      const json = (await resp.json()) as CompetitorsResponse;
      setData(json);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load competitors");
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = (e: React.FormEvent) => {
    e.preventDefault();
    setLimit(50);
    fetchCompetitors(50);
  };

  const handleLoadMore = () => {
    const newLimit = limit * 2;
    setLimit(newLimit);
    fetchCompetitors(newLimit);
  };

  const target = data?.target;
  const competitors = data?.competitors ?? [];
  const sortLabel =
    data?.sort && data.sort.length > 0
      ? data.sort.join(", ")
      : "appearance_count desc, best_type_priority asc";

  return (
    <div>
      <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <h3 className="mb-3 font-medium text-gray-900">Type Definitions</h3>
        <dl className="space-y-3">
          <div>
            <dt className="font-medium">Type A — Company Focus Match</dt>
            <dd className="mt-0.5 text-gray-600">
              Companies mentioned in content where the target company is the Company of Focus.
              These represent the strongest competitor signals because the content is specifically written about the target company.
            </dd>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <dt className="font-medium">Type B — Secondary Sector Match</dt>
            <dd className="mt-0.5 text-gray-600">
              Companies that share one or more secondary sectors with the target company.
              This identifies companies operating in similar sub-segments of the industry.
            </dd>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <dt className="font-medium">Type C — Co-Mention in Content</dt>
            <dd className="mt-0.5 text-gray-600">
              Companies that appear in the same Companies Mentioned field as the target company within a content record.
              This indicates companies that are discussed alongside the target in industry coverage.
            </dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleFetch} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Target company ID
          </span>
          <input
            type="text"
            value={targetCompanyId}
            onChange={(e) => setTargetCompanyId(e.target.value)}
            placeholder="e.g. 2142"
            className="w-48 rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Fetch"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {data && !error && (
        <>
          {/* Target info section */}
          <div className="mb-6 overflow-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="px-3 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Company</td>
                  <td className="px-3 py-2">
                    {target?.company_id != null ? (
                      <Link
                        href={`/company/${target.company_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {target?.company_name ?? "—"} ({target.company_id})
                      </Link>
                    ) : (
                      <>
                        {target?.company_name ?? "—"} (ID: {target?.company_id ?? "—"})
                      </>
                    )}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Primary business focus</td>
                  <td className="px-3 py-2">
                    {target?.primary_business_focus_id?.length
                      ? target.primary_business_focus_id.join(", ")
                      : "—"}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Primary sectors</td>
                  <td className="px-3 py-2">
                    {formatSectors(target?.primary_sectors)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Secondary sectors</td>
                  <td className="px-3 py-2">
                    {formatSectors(target?.secondary_sectors)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Sort</td>
                  <td className="px-3 py-2">{sortLabel}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Competitors table */}
          <div className="mb-4 overflow-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">#</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Competitor
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Appearance
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Best type
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Types</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">A</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">C</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">B</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">D</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Content hits
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Content IDs (unique)
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Matched sectors
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Focus IDs
                  </th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((row, idx) => (
                  <tr key={row.competitor_id} className="border-t">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/company/${row.competitor_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.competitor_name} ({row.competitor_id})
                      </Link>
                    </td>
                    <td className="px-3 py-2">{row.appearance_count}</td>
                    <td className="px-3 py-2">
                      {bestTypePriority(row.types_matched) || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.types_matched?.length
                        ? row.types_matched.join(", ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.type_counts?.A ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      {row.type_counts?.C ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      {row.type_counts?.B ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      {row.type_counts?.D ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      {row.content_hits_count ?? "—"}
                    </td>
                    <td className="min-w-[120px] max-w-[400px] px-3 py-2 align-top">
                      {!row.content_ids_unique?.length ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                          {row.content_ids_unique.map((id, i) => (
                            <span key={id}>
                              {i > 0 && ", "}
                              <Link
                                href={`/article/${id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {id}
                              </Link>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {formatSectors(
                        row.matched_target_sectors ?? row.matched_sector_ids
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.competitor_primary_business_focus_ids?.length
                        ? row.competitor_primary_business_focus_ids.join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Load more
          </button>
        </>
      )}
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

// ─── Email Analytics ──────────────────────────────────────────────────────────

type EAHeatStatus = "opened" | "clicked" | "sent" | "bounced" | "none";

type EAHeatCell = { date: string; status: EAHeatStatus };

type EAMessage = {
  messageId: string;
  subject: string;
  sentAt: string;
  status: string;
  tag: string | null;
  opened: boolean;
  clicked: boolean;
  firstOpenedAt: string | null;
  firstClickedAt: string | null;
};

type EABreakdown = {
  alertType: string;
  frequency: string | null;
  isActive: boolean;
  lastSentAtUtc: number | null;
  isUntaggedGroup: boolean;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  openRate: number;
  clickRate: number;
  lastOpened: string | null;
  heatmap: EAHeatCell[];
  messageHistory: EAMessage[];
};

type EAUser = {
  userId: number;
  name: string;
  email: string;
  status?: string;
  seniorityLevel?: string;
  firmType?: string;
  companyId?: number | null;
  companyName?: string;
  activeAlerts: number;
  alertTypes: string[];
  frequency: string | null;
  lastSentAtUtc: number | null;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  openRate: number;
  clickRate: number;
  lastOpened: string | null;
  messageHistory: EAMessage[];
  heatmap: EAHeatCell[];
  byAlertType: EABreakdown[];
};

type EADebug = {
  postmarkMessagesError: string | null;
  postmarkOpensError: string | null;
  postmarkClicksError: string | null;
  postmarkRawMessageCount: number;
  postmarkFilteredMessageCount: number;
  postmarkOpensCount: number;
  postmarkClicksCount: number;
  postmarkMsgSample: unknown;
  postmarkOpensSample: unknown;
  xanoUserCount: number;
  xanoAlertCount: number;
  unmatchedPostmarkEmails: number;
};

type EAData = {
  meta: {
    fromDate: string;
    toDate: string;
    days: number;
    hours: number | null;
    filters?: {
      firm_type: string;
      seniority_level: string;
      user_type: string;
      company_id: number | null;
    };
  };
  stats: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    avgOpenRate: number;
    overallOpenRate: number;
    overallClickRate: number;
    neverOpened: number;
    bounced: number;
  };
  users: EAUser[];
  _debug: EADebug;
};

type EATab = "all" | "stale" | "bounced" | "inactive";

type EAAuditRow =
  | { user: EAUser; msg: EAMessage; result: "opened" | "sent" | "bounced" }
  | { user: EAUser; msg: null; result: "none" };

const EA_HEAT_COLORS: Record<EAHeatStatus, string> = {
  clicked: "#1D9E75",
  opened: "#9FE1CB",
  sent: "#e5e7eb",
  bounced: "#E24B4A",
  none: "transparent",
};

const EA_HEAT_LABELS: Record<EAHeatStatus, string> = {
  clicked: "Opened + clicked",
  opened: "Opened",
  sent: "Sent, no open",
  bounced: "Bounced",
  none: "No email",
};

function eaFmtDate(val: string | number | null): string {
  if (!val) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(typeof val === "number" ? val : val));
}

function eaDaysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const EA_ALERT_LABELS: Record<string, { label: string; cls: string }> = {
  corporate_events:   { label: "Corporate Events",   cls: "bg-violet-50 text-violet-700" },
  insights_analysis:  { label: "Insights & Analysis", cls: "bg-blue-50 text-blue-700" },
  digest:             { label: "Digest",              cls: "bg-teal-50 text-teal-700" },
};

function eaAlertLabel(type: string) {
  return EA_ALERT_LABELS[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
}

function EAHeatCell({ cell }: { cell: EAHeatCell }) {
  return (
    <div
      title={`${cell.date}: ${EA_HEAT_LABELS[cell.status]}`}
      className="rounded-sm flex-shrink-0"
      style={{
        width: 12,
        height: 12,
        backgroundColor: EA_HEAT_COLORS[cell.status],
        border:
          cell.status === "sent" || cell.status === "none"
            ? "0.5px solid #e5e7eb"
            : "none",
      }}
    />
  );
}

// ── Level-0: user summary row ─────────────────────────────────────────────────

const USER_EMAIL_ENGAGEMENT_URL = "/api/admin/user-email-engagement";

type EAUserEngagementSubscription = {
  id: number;
  item_type: string;
  email_frequency: string;
  is_active: boolean;
  last_sent_at_utc: number | null;
  next_run_at_utc: number | null;
};

type EAUserEngagementItem = {
  tag: string;
  item_type: string;
  frequency: string;
  sent: number;
  opened: number;
  clicked: number;
  open_rate: number;
  click_rate: number;
  last_opened: string | null;
  never_opened: boolean;
};

type EAUserEngagement = {
  user_id: number;
  user_name: string;
  user_email: string;
  subscriptions: EAUserEngagementSubscription[];
  engagement: EAUserEngagementItem[];
};

async function fetchUserEmailEngagement(
  userId: number,
  token: string
): Promise<EAUserEngagement> {
  const res = await fetch(USER_EMAIL_ENGAGEMENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }

  return res.json() as Promise<EAUserEngagement>;
}

function EAUserEngagementPanel({ userId }: { userId: number }) {
  const [engagement, setEngagement] = useState<EAUserEngagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : "";
        const data = await fetchUserEmailEngagement(userId, token ?? "");
        if (!aborted) setEngagement(data);
      } catch (e) {
        if (!aborted) {
          setEngagement(null);
          setError(
            e instanceof Error ? e.message : "Failed to load user engagement"
          );
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50">
        Loading engagement…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-sm text-red-700 bg-red-50">
        Failed to load engagement: {error}
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50">
        No engagement data.
      </div>
    );
  }

  const activeSubscriptions = engagement.subscriptions.filter((s) => s.is_active);

  return (
    <div className="px-4 py-3 bg-gray-50 space-y-4 border-t border-gray-100">
      {engagement.subscriptions.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-2">
            Subscriptions ({activeSubscriptions.length} active)
          </h4>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Type", "Frequency", "Status", "Last sent", "Next run"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left font-normal text-gray-500 px-3 py-2"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {engagement.subscriptions.map((sub) => {
                  const { label, cls } = eaAlertLabel(sub.item_type);
                  return (
                    <tr
                      key={sub.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${cls}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize text-gray-600">
                        {sub.email_frequency}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${
                            sub.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {sub.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {sub.last_sent_at_utc
                          ? formatTimestamp(sub.last_sent_at_utc)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {sub.next_run_at_utc
                          ? formatTimestamp(sub.next_run_at_utc)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-medium text-gray-600 mb-2">
          Engagement by alert type
        </h4>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  "Tag",
                  "Type",
                  "Frequency",
                  "Sent",
                  "Opened",
                  "Clicked",
                  "Open rate",
                  "Click rate",
                  "Last opened",
                  "Status",
                ].map((h) => (
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
              {engagement.engagement.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-4 text-center text-gray-400"
                  >
                    No engagement records.
                  </td>
                </tr>
              ) : (
                engagement.engagement.map((row) => {
                  const { label, cls } = eaAlertLabel(row.item_type);
                  return (
                    <tr
                      key={row.tag}
                      className={`border-b border-gray-100 last:border-0 ${
                        row.never_opened && row.sent > 0 ? "bg-amber-50/50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-gray-600">
                        {row.tag}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${cls}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize text-gray-600">
                        {row.frequency}
                      </td>
                      <td className="px-3 py-2">{row.sent}</td>
                      <td className="px-3 py-2 text-green-700">{row.opened}</td>
                      <td className="px-3 py-2 text-blue-700">{row.clicked}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.open_rate > 0
                              ? "text-green-700 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {row.open_rate}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.click_rate > 0
                              ? "text-blue-700 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {row.click_rate}%
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {row.last_opened ? eaFmtDate(row.last_opened) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.sent === 0 ? (
                          <span className="text-gray-400">No sends</span>
                        ) : row.never_opened ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-amber-50 text-amber-700">
                            Never opened
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-green-50 text-green-700">
                            Opened
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EAUserRow({ user }: { user: EAUser }) {
  const [expanded, setExpanded] = useState(false);
  const stale = eaDaysSince(user.lastOpened) > 7;

  const badge =
    user.bouncedCount > 0
      ? { label: "Bounced", cls: "bg-red-50 text-red-700" }
      : user.activeAlerts === 0
      ? { label: "Inactive", cls: "bg-gray-100 text-gray-500" }
      : user.openRate === 0 && user.sentCount > 0
      ? { label: "No opens", cls: "bg-amber-50 text-amber-700" }
      : stale
      ? { label: "Stale", cls: "bg-amber-50 text-amber-700" }
      : { label: "Active", cls: "bg-green-50 text-green-700" };

  return (
    <>
      <tr
        onClick={() => setExpanded((e) => !e)}
        className="cursor-pointer hover:bg-gray-50 border-b border-gray-200"
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{expanded ? "▼" : "▶"}</span>
            <div>
              <div className="text-sm font-medium">{user.name || "—"}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-500">
          {user.byAlertType.length} alert{user.byAlertType.length !== 1 ? "s" : ""}
        </td>
        <td className={`px-3 py-2.5 text-xs whitespace-nowrap ${stale ? "text-red-600" : "text-gray-700"}`}>
          {eaFmtDate(user.lastOpened)}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{user.openRate}%</span>
            {user.sentCount > 0 && (
              <span className="text-xs text-gray-400">
                {user.openedCount}/{user.sentCount}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex gap-0.5 flex-nowrap overflow-hidden" style={{ maxWidth: 340 }}>
            {user.heatmap.map((cell) => (
              <EAHeatCell key={cell.date} cell={cell} />
            ))}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-200">
          <td colSpan={6} className="p-0">
            <EAUserEngagementPanel userId={user.userId} />
          </td>
        </tr>
      )}
    </>
  );
}

// period: "24h" | "7" | "30" | "90"
type EAPeriod = "24h" | "7" | "30" | "90";

type EAUserFilters = {
  companyId: string;
  firmType: string;
  seniorityLevel: string;
  userType: string;
};

const EA_FIRM_TYPES = [
  "Private equity",
  "Venture capital",
  "Corporate Finance / Investment bank",
  "Consulting",
  "Corporate",
  "Equity Research",
] as const;

const EA_SENIORITY_LEVELS = ["Junior", "Middle", "Senior"] as const;

const EA_USER_TYPES = ["Client"] as const;

type EAClientCompany = { id: number; name: string };

const CLIENT_COMPANIES_URL = "/api/admin/client-companies";

function eaPeriodLabel(p: EAPeriod) {
  return p === "24h" ? "Last 24 hours" : `Last ${p} days`;
}

function eaPeriodToParams(p: EAPeriod) {
  return p === "24h" ? "hours=24" : `days=${p}`;
}

function eaPeriodToDays(p: EAPeriod) {
  return p === "24h" ? 1 : parseInt(p);
}

function eaAnalyticsQueryParams(period: EAPeriod, filters: EAUserFilters): string {
  const params = new URLSearchParams(eaPeriodToParams(period));
  if (filters.companyId) params.set("company_id", filters.companyId);
  if (filters.firmType) params.set("firm_type", filters.firmType);
  if (filters.seniorityLevel) params.set("seniority_level", filters.seniorityLevel);
  if (filters.userType) params.set("user_type", filters.userType);
  return params.toString();
}

async function fetchClientCompanies(token: string): Promise<EAClientCompany[]> {
  const res = await fetch(CLIENT_COMPANIES_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }
  const json = (await res.json()) as EAClientCompany[];
  return Array.isArray(json) ? json : [];
}

// ─── Daily send log (Xano) ────────────────────────────────────────────────────

const EMAIL_DAILY_LOG_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/email_daily_log";
const GET_UNSENT_EMAILS_URL = "/api/admin/unsent-emails";

type EmailDailyScheduledByType = {
  item_type: string;
  email_frequency: string;
  scheduled_count: number;
};

type EmailDailyDeferredOrFailed = {
  item_type: string;
  email_frequency: string;
  scheduled_count: number | string;
  unsent_ids: number[];
};

type EmailDailyLog = {
  id: number;
  created_at: number;
  date: string;
  day_of_week: string;
  scheduled_daily: number;
  scheduled_weekly: number;
  ce_as_added_sent: number;
  ia_as_added_sent: number;
  ce_digest_sent: number;
  ia_digest_sent: number;
  digest_sent: number;
  total_scheduled: number;
  total_sent: number;
  send_rate_pct: number;
  scheduled_by_type: EmailDailyScheduledByType[];
  unsent: EmailDailyDeferredOrFailed[];
  failed?: EmailDailyDeferredOrFailed[];
};

type UnsentEmailUser = {
  id: number;
  name: string;
  email: string;
  Company?: number;
  Email_alerts?: string;
};

type UnsentEmailDetail = {
  id: number;
  user_id: number;
  item_type: string;
  email_frequency: string;
  day_of_week: string;
  timezone: string;
  send_time_local: string;
  next_run_at_utc: number | null;
  last_sent_at_utc: number | null;
  status: string;
  is_active: boolean;
  _user?: UnsentEmailUser;
};

function formatEmailItemType(type: string): string {
  const labels: Record<string, string> = {
    corporate_events: "Corporate Events",
    digest: "Digest",
    insights_analysis: "Insights & Analysis",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

function emailDailyGroupCount(
  row: EmailDailyScheduledByType,
  items: EmailDailyDeferredOrFailed[]
): number {
  const match = items.find(
    (u) =>
      u.item_type === row.item_type &&
      u.email_frequency === row.email_frequency
  );
  return match ? Number(match.scheduled_count) || 0 : 0;
}

function emailDailyGroupTotal(items: EmailDailyDeferredOrFailed[]): number {
  return items.reduce((sum, item) => sum + (Number(item.scheduled_count) || 0), 0);
}

function formatUnsentScheduledTime(
  alert: UnsentEmailDetail,
  logDate: string
): string {
  const tz = alert.timezone?.trim() || "UTC";
  const time = alert.send_time_local?.trim() || "";

  if (alert.email_frequency === "weekly" && alert.day_of_week) {
    const day =
      alert.day_of_week.charAt(0).toUpperCase() +
      alert.day_of_week.slice(1).toLowerCase();
    return time
      ? `${day}s at ${time} (${tz})`
      : `${day}s (${tz})`;
  }

  if (logDate && time) {
    try {
      const dateLabel = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${logDate}T12:00:00`));
      return `${dateLabel} at ${time} (${tz})`;
    } catch {
      return `${logDate} at ${time} (${tz})`;
    }
  }

  if (alert.next_run_at_utc) {
    try {
      return (
        new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: tz,
        }).format(new Date(alert.next_run_at_utc)) + ` (${tz})`
      );
    } catch {
      return formatTimestamp(alert.next_run_at_utc);
    }
  }

  return "—";
}

async function fetchUnsentEmailDetails(
  ids: number[],
  token: string
): Promise<UnsentEmailDetail[]> {
  if (ids.length === 0) return [];

  const res = await fetch(GET_UNSENT_EMAILS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ user_email_alerts_id: ids }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }

  const json = (await res.json()) as UnsentEmailDetail[];
  return Array.isArray(json) ? json : [];
}

function EmailAlertDetailsBlock({
  title,
  variant,
  groups,
  details,
  logDate,
  loading,
  error,
}: {
  title: string;
  variant: "deferred" | "failed";
  groups: EmailDailyDeferredOrFailed[];
  details: UnsentEmailDetail[];
  logDate: string;
  loading: boolean;
  error: string | null;
}) {
  if (groups.length === 0) return null;

  const deferred = variant === "deferred";
  const wrapClass = deferred
    ? "rounded border border-amber-200 bg-amber-50 px-4 py-3 space-y-3"
    : "rounded border border-red-200 bg-red-50 px-4 py-3 space-y-3";
  const headingClass = deferred
    ? "text-sm font-medium text-amber-800"
    : "text-sm font-medium text-red-800";
  const errorClass = deferred
    ? "text-sm text-amber-800 bg-amber-100 border border-amber-200 rounded px-3 py-2"
    : "text-sm text-red-700 bg-red-100 border border-red-200 rounded px-3 py-2";
  const loadingClass = deferred ? "text-sm text-amber-700" : "text-sm text-red-600";
  const tableWrapClass = deferred
    ? "overflow-x-auto rounded border border-amber-200 bg-white"
    : "overflow-x-auto rounded border border-red-200 bg-white";
  const theadClass = deferred
    ? "border-b border-amber-100 bg-amber-50"
    : "border-b border-red-100 bg-red-50";
  const thClass = deferred
    ? "text-left font-normal text-xs text-amber-800 px-3 py-2"
    : "text-left font-normal text-xs text-red-700 px-3 py-2";
  const rowClass = deferred
    ? "border-b border-amber-50 last:border-0"
    : "border-b border-red-50 last:border-0";
  const nameClass = deferred
    ? "px-3 py-2.5 font-medium text-amber-900"
    : "px-3 py-2.5 font-medium text-red-900";
  const cellClass = deferred
    ? "px-3 py-2.5 text-amber-800"
    : "px-3 py-2.5 text-red-800";
  const freqClass = deferred ? "text-amber-700" : "text-red-600";
  const badgeClass = deferred
    ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 capitalize"
    : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 capitalize";
  const lastSentClass = deferred
    ? "px-3 py-2.5 text-amber-700 whitespace-nowrap"
    : "px-3 py-2.5 text-red-700 whitespace-nowrap";
  const listClass = deferred ? "text-sm text-amber-800" : "text-sm text-red-700";
  const listFreqClass = deferred ? "text-amber-700" : "text-red-600";
  const listMetaClass = deferred ? "text-amber-700" : "text-red-600";
  const fallbackLabel = deferred ? "scheduled for later" : "failed";

  return (
    <div className={wrapClass}>
      <h3 className={headingClass}>{title}</h3>

      {error && (
        <div className={errorClass}>Failed to load details: {error}</div>
      )}

      {loading ? (
        <div className={loadingClass}>Loading details…</div>
      ) : details.length > 0 ? (
        <div className={tableWrapClass}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={theadClass}>
                {[
                  "User",
                  "Email",
                  "Alert type",
                  "Scheduled send",
                  "Status",
                  "Last sent",
                ].map((h) => (
                  <th key={h} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {details.map((alert) => (
                <tr key={alert.id} className={rowClass}>
                  <td className={nameClass}>{alert._user?.name || "—"}</td>
                  <td className={cellClass}>{alert._user?.email || "—"}</td>
                  <td className={cellClass}>
                    {formatEmailItemType(alert.item_type)}
                    <span className={`${freqClass} capitalize`}>
                      {" "}
                      ({alert.email_frequency})
                    </span>
                  </td>
                  <td className={`${cellClass} whitespace-nowrap`}>
                    {formatUnsentScheduledTime(alert, logDate)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={badgeClass}>
                      {alert.status || (deferred ? "unsent" : "failed")}
                    </span>
                  </td>
                  <td className={lastSentClass}>
                    {alert.last_sent_at_utc
                      ? formatTimestamp(alert.last_sent_at_utc)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((u) => (
            <li
              key={`${u.item_type}-${u.email_frequency}`}
              className={listClass}
            >
              <span className="font-medium">
                {formatEmailItemType(u.item_type)}
              </span>
              <span className={`${listFreqClass} capitalize`}>
                {" "}
                ({u.email_frequency})
              </span>
              {" — "}
              {Number(u.scheduled_count) || 0} {fallbackLabel}
              {u.unsent_ids.length > 0 && (
                <span className={listMetaClass}>
                  {" "}
                  · IDs: {u.unsent_ids.join(", ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmailDailySendLogSection() {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [log, setLog] = useState<EmailDailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsentDetails, setUnsentDetails] = useState<UnsentEmailDetail[]>([]);
  const [loadingUnsent, setLoadingUnsent] = useState(false);
  const [unsentError, setUnsentError] = useState<string | null>(null);

  const fetchDailyLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : "";
      const url = `${EMAIL_DAILY_LOG_URL}?date=${encodeURIComponent(selectedDate)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as EmailDailyLog | EmailDailyLog[];
      const row = Array.isArray(json) ? json[0] ?? null : json;
      setLog(row);
    } catch (e) {
      setLog(null);
      setError(e instanceof Error ? e.message : "Failed to load daily send log");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDailyLog();
  }, [fetchDailyLog]);

  const allAlertIds = useMemo(() => {
    if (!log) return [];
    return Array.from(
      new Set([
        ...log.unsent.flatMap((u) => u.unsent_ids),
        ...(log.failed ?? []).flatMap((u) => u.unsent_ids),
      ])
    );
  }, [log]);

  const deferredIds = useMemo(
    () => new Set(log?.unsent.flatMap((u) => u.unsent_ids) ?? []),
    [log]
  );

  const failedIds = useMemo(
    () => new Set((log?.failed ?? []).flatMap((u) => u.unsent_ids)),
    [log]
  );

  useEffect(() => {
    if (allAlertIds.length === 0) {
      setUnsentDetails([]);
      setUnsentError(null);
      return;
    }

    let aborted = false;
    async function loadUnsentDetails() {
      setLoadingUnsent(true);
      setUnsentError(null);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : "";
        const details = await fetchUnsentEmailDetails(allAlertIds, token ?? "");
        if (!aborted) setUnsentDetails(details);
      } catch (e) {
        if (!aborted) {
          setUnsentDetails([]);
          setUnsentError(
            e instanceof Error ? e.message : "Failed to load alert details"
          );
        }
      } finally {
        if (!aborted) setLoadingUnsent(false);
      }
    }

    loadUnsentDetails();
    return () => {
      aborted = true;
    };
  }, [allAlertIds]);

  const deferredTotal = log ? emailDailyGroupTotal(log.unsent) : 0;
  const failedTotal = log ? emailDailyGroupTotal(log.failed ?? []) : 0;
  const deferredDetails = unsentDetails.filter((d) => deferredIds.has(d.id));
  const failedDetails = unsentDetails.filter((d) => failedIds.has(d.id));

  return (
    <div className="bg-white rounded border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
        <div>
          <h2 className="text-sm font-medium">Daily send rate</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Scheduled vs sent emails for the selected day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border rounded px-2 py-1.5"
          />
          <button
            onClick={fetchDailyLog}
            disabled={loading}
            className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          Failed to load: {error}
        </div>
      )}

      {loading && !log && !error && (
        <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
      )}

      {!loading && !log && !error && (
        <div className="text-center py-8 text-sm text-gray-500">
          No send log data for {selectedDate}.
        </div>
      )}

      {log && (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="capitalize">{log.day_of_week}</span>
            <span>·</span>
            <span>{log.date}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded border px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">Scheduled</div>
              <div className="text-2xl font-medium text-gray-900">
                {log.total_scheduled.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {log.scheduled_daily} daily · {log.scheduled_weekly} weekly
              </div>
            </div>
            <div className="rounded border px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">Sent</div>
              <div className="text-2xl font-medium text-green-700">
                {log.total_sent.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {deferredTotal} later · {failedTotal} failed
              </div>
            </div>
            <div className="rounded border px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">Send rate</div>
              <div
                className={`text-2xl font-medium ${
                  log.send_rate_pct >= 100
                    ? "text-green-700"
                    : log.send_rate_pct >= 90
                    ? "text-amber-700"
                    : "text-red-700"
                }`}
              >
                {log.send_rate_pct}%
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {log.total_sent} of {log.total_scheduled}
              </div>
            </div>
            <div
              className={`rounded border px-4 py-3 ${
                deferredTotal > 0 ? "border-amber-200 bg-amber-50" : ""
              }`}
            >
              <div
                className={`text-xs mb-1 ${
                  deferredTotal > 0 ? "text-amber-700" : "text-gray-500"
                }`}
              >
                Scheduled for later
              </div>
              <div
                className={`text-2xl font-medium ${
                  deferredTotal > 0 ? "text-amber-800" : "text-gray-900"
                }`}
              >
                {deferredTotal.toLocaleString()}
              </div>
              <div
                className={`text-xs mt-1 ${
                  deferredTotal > 0 ? "text-amber-600" : "text-gray-400"
                }`}
              >
                deferred to next run
              </div>
            </div>
            <div
              className={`rounded border px-4 py-3 ${
                failedTotal > 0 ? "border-red-200 bg-red-50" : ""
              }`}
            >
              <div
                className={`text-xs mb-1 ${
                  failedTotal > 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                Failed
              </div>
              <div
                className={`text-2xl font-medium ${
                  failedTotal > 0 ? "text-red-700" : "text-gray-900"
                }`}
              >
                {failedTotal.toLocaleString()}
              </div>
              <div
                className={`text-xs mt-1 ${
                  failedTotal > 0 ? "text-red-500" : "text-gray-400"
                }`}
              >
                from failed log
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {[
                    "Type",
                    "Frequency",
                    "Scheduled",
                    "Sent",
                    "Scheduled for later",
                    "Failed",
                  ].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left font-normal text-xs text-gray-500 px-3 py-2"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {log.scheduled_by_type.map((row) => {
                  const deferred = emailDailyGroupCount(row, log.unsent);
                  const failed = emailDailyGroupCount(row, log.failed ?? []);
                  const sent = row.scheduled_count - deferred - failed;
                  const hasDeferred = deferred > 0;
                  const hasFailed = failed > 0;
                  return (
                    <tr
                      key={`${row.item_type}-${row.email_frequency}`}
                      className={`border-b border-gray-100 last:border-0 ${
                        hasFailed ? "bg-red-50" : hasDeferred ? "bg-amber-50" : ""
                      }`}
                    >
                      <td
                        className={`px-3 py-2 ${
                          hasFailed
                            ? "text-red-800 font-medium"
                            : hasDeferred
                            ? "text-amber-900 font-medium"
                            : ""
                        }`}
                      >
                        {formatEmailItemType(row.item_type)}
                      </td>
                      <td
                        className={`px-3 py-2 capitalize ${
                          hasFailed
                            ? "text-red-700"
                            : hasDeferred
                            ? "text-amber-800"
                            : "text-gray-600"
                        }`}
                      >
                        {row.email_frequency}
                      </td>
                      <td className="px-3 py-2">{row.scheduled_count}</td>
                      <td
                        className={`px-3 py-2 ${
                          hasFailed || hasDeferred ? "text-gray-700" : "text-green-700"
                        }`}
                      >
                        {sent}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          hasDeferred ? "text-amber-700" : "text-gray-400"
                        }`}
                      >
                        {deferred || "—"}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          hasFailed ? "text-red-700" : "text-gray-400"
                        }`}
                      >
                        {failed || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {log.unsent.length > 0 && (
            <EmailAlertDetailsBlock
              title="Scheduled for later"
              variant="deferred"
              groups={log.unsent}
              details={deferredDetails}
              logDate={log.date}
              loading={loadingUnsent}
              error={unsentError}
            />
          )}

          {(log.failed?.length ?? 0) > 0 && (
            <EmailAlertDetailsBlock
              title="Failed emails"
              variant="failed"
              groups={log.failed ?? []}
              details={failedDetails}
              logDate={log.date}
              loading={loadingUnsent}
              error={unsentError}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function EmailAnalyticsTab() {
  const [data, setData] = useState<EAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<EAPeriod>("30");
  const [filters, setFilters] = useState<EAUserFilters>({
    companyId: "",
    firmType: "",
    seniorityLevel: "",
    userType: "",
  });
  const [companies, setCompanies] = useState<EAClientCompany[]>([]);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [tab, setTab] = useState<EATab>("all");
  const [showDebug, setShowDebug] = useState(false);
  const [auditDate, setAuditDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    let aborted = false;
    async function loadCompanies() {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : "";
        const rows = await fetchClientCompanies(token ?? "");
        if (!aborted) {
          setCompanies(rows);
          setCompaniesError(null);
        }
      } catch (e) {
        if (!aborted) {
          setCompanies([]);
          setCompaniesError(
            e instanceof Error ? e.message : "Failed to load companies"
          );
        }
      }
    }
    loadCompanies();
    return () => {
      aborted = true;
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : "";
      const res = await fetch(
        `/api/admin/email-analytics?${eaAnalyticsQueryParams(period, filters)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [period, filters]);

  const updateFilter = (key: keyof EAUserFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const days = eaPeriodToDays(period);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    switch (tab) {
      case "stale":
        return data.users.filter(
          (u) => eaDaysSince(u.lastOpened) > 7 && u.sentCount > 0
        );
      case "bounced":
        return data.users.filter((u) => u.bouncedCount > 0);
      case "inactive":
        return data.users.filter((u) => u.activeAlerts === 0);
      default:
        return data.users;
    }
  }, [data, tab]);

  const tabCounts = useMemo(() => {
    if (!data) return { all: 0, stale: 0, bounced: 0, inactive: 0 };
    return {
      all: data.users.length,
      stale: data.users.filter((u) => eaDaysSince(u.lastOpened) > 7 && u.sentCount > 0).length,
      bounced: data.users.filter((u) => u.bouncedCount > 0).length,
      inactive: data.users.filter((u) => u.activeAlerts === 0).length,
    };
  }, [data]);

  const auditRows = useMemo((): EAAuditRow[] => {
    if (!data) return [];
    return data.users.flatMap((u): EAAuditRow[] => {
      const dayMsgs = u.messageHistory.filter((m) =>
        m.sentAt?.startsWith(auditDate)
      );
      if (dayMsgs.length === 0) {
        if (u.activeAlerts === 0) return [];
        return [{ user: u, msg: null, result: "none" }];
      }
      return dayMsgs.map((m): EAAuditRow => ({
        user: u,
        msg: m,
        result:
          m.status === "Bounced"
            ? "bounced"
            : m.opened
            ? "opened"
            : "sent",
      }));
    });
  }, [data, auditDate]);

  const tabs: Array<[EATab, string]> = [
    ["all", "All users"],
    ["stale", "Not opened 7d+"],
    ["bounced", "Bounced"],
    ["inactive", "Inactive"],
  ];

  return (
    <div className="space-y-4">
      <EmailDailySendLogSection />

      {/* Controls */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as EAPeriod)}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
            <button
              onClick={() => setShowDebug((s) => !s)}
              className="text-xs border rounded px-2 py-1.5 text-gray-500 hover:bg-gray-50"
              title="Toggle debug info"
            >
              {showDebug ? "Hide debug" : "Debug"}
            </button>
          </div>
          {data && (
            <span className="text-xs text-gray-500">
              {data.meta.fromDate} → {data.meta.toDate}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.companyId}
            onChange={(e) => updateFilter("companyId", e.target.value)}
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
            {EA_FIRM_TYPES.map((t) => (
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
            {EA_SENIORITY_LEVELS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filters.userType}
            onChange={(e) => updateFilter("userType", e.target.value)}
            className="text-sm border rounded px-2 py-1.5"
          >
            <option value="">All user types</option>
            {EA_USER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {(filters.companyId ||
            filters.firmType ||
            filters.seniorityLevel ||
            filters.userType) && (
            <button
              type="button"
              onClick={() =>
                setFilters({
                  companyId: "",
                  firmType: "",
                  seniorityLevel: "",
                  userType: "",
                })
              }
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {companiesError && (
          <div className="text-xs text-amber-700">
            Could not load company list: {companiesError}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          Failed to load: {error}
        </div>
      )}

      {/* Stat cards */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1 */}
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Emails sent</div>
            <div className="text-2xl font-medium text-gray-900">{data.stats.totalSent.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">
              {data.users.filter((u) => u.sentCount > 0).length} recipients · {eaPeriodLabel(period)}
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Open rate (overall)</div>
            <div className="text-2xl font-medium text-green-700">
              {data.stats.overallOpenRate}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {data.stats.totalOpened.toLocaleString()} of {data.stats.totalSent.toLocaleString()} messages opened
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Click rate (overall)</div>
            <div className="text-2xl font-medium text-blue-700">
              {data.stats.overallClickRate}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {data.stats.totalClicked.toLocaleString()} of {data.stats.totalSent.toLocaleString()} messages clicked
            </div>
          </div>
          {/* Row 2 */}
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Avg open rate per user</div>
            <div className="text-2xl font-medium text-green-700">{data.stats.avgOpenRate}%</div>
            <div className="text-xs text-gray-400 mt-1">across users who received email</div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Never opened</div>
            <div className="text-2xl font-medium text-amber-700">{data.stats.neverOpened}</div>
            <div className="text-xs text-gray-400 mt-1">
              users received email but 0 opens
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Bounced</div>
            <div className="text-2xl font-medium text-red-700">{data.stats.bounced}</div>
            <div className="text-xs text-gray-400 mt-1">hard bounce, needs action</div>
          </div>
        </div>
      )}

      {/* Debug panel */}
      {data && showDebug && (
        <div className="bg-gray-900 text-gray-100 rounded border border-gray-700 px-4 py-3 text-xs font-mono space-y-1">
          <div className="text-gray-400 font-sans font-medium text-xs mb-2">
            Postmark / Xano debug
          </div>
          {data._debug.postmarkMessagesError && (
            <div className="text-red-400">⚠ Messages: {data._debug.postmarkMessagesError}</div>
          )}
          {data._debug.postmarkOpensError && (
            <div className="text-red-400">⚠ Opens: {data._debug.postmarkOpensError}</div>
          )}
          {data._debug.postmarkClicksError && (
            <div className="text-red-400">⚠ Clicks: {data._debug.postmarkClicksError}</div>
          )}
          <div>
            Messages:{" "}
            <span className="text-green-400">{data._debug.postmarkRawMessageCount}</span> fetched →{" "}
            <span className="text-green-400">{data._debug.postmarkFilteredMessageCount}</span> in window
            {" · "}Opens:{" "}
            <span className="text-green-400">{data._debug.postmarkOpensCount}</span>
            {" · "}Clicks:{" "}
            <span className="text-green-400">{data._debug.postmarkClicksCount}</span>
          </div>
          <div>
            Xano users: <span className="text-blue-400">{data._debug.xanoUserCount}</span>
            {" · "}Alerts: <span className="text-blue-400">{data._debug.xanoAlertCount}</span>
            {" · "}Unmatched Postmark emails:{" "}
            <span className="text-yellow-400">{data._debug.unmatchedPostmarkEmails}</span>
          </div>
          {!!data._debug.postmarkMsgSample && (
            <details className="mt-1">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-200">
                Message sample (2)
              </summary>
              <pre className="mt-1 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(data._debug.postmarkMsgSample, null, 2)}
              </pre>
            </details>
          )}
          {!!data._debug.postmarkOpensSample && (
            <details className="mt-1">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-200">
                Opens sample (2)
              </summary>
              <pre className="mt-1 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(data._debug.postmarkOpensSample, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Per-user engagement table */}
      <div className="bg-white rounded border">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-medium">Per-user engagement</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {[
              { color: "#1D9E75", label: "Opened + clicked" },
              { color: "#9FE1CB", label: "Opened" },
              { color: "#e5e7eb", label: "Sent, no open", border: true },
              { color: "#E24B4A", label: "Bounced" },
            ].map(({ color, label, border }) => (
              <span key={label} className="flex items-center gap-1">
                <span
                  className="inline-block rounded-sm"
                  style={{
                    width: 10,
                    height: 10,
                    background: color,
                    border: border ? "0.5px solid #d1d5db" : "none",
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 px-4">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm py-2 px-3 border-b-2 mr-1 ${
                tab === t
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              {data && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({tabCounts[t]})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-500">
              Loading…
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {[
                    "User",
                    "Alerts",
                    "Last opened",
                    "Open rate",
                    `Last ${days} days`,
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left font-normal text-xs text-gray-500 px-3 py-2"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-sm text-gray-500"
                    >
                      No users match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <EAUserRow key={u.userId} user={u} />
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Daily send audit */}
      <div className="bg-white rounded border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium">Daily send audit</h2>
          <input
            type="date"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          />
        </div>
        {!data ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Loading…
          </div>
        ) : auditRows.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No activity for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {["User", "Alert type", "Sent at", "Opened at", "Result"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left font-normal text-xs text-gray-500 px-3 py-2"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-sm">{row.user.name}</div>
                      <div className="text-xs text-gray-500">
                        {row.user.email}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {row.msg?.tag ?? (row.user.alertTypes.join(", ") || "—")}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {row.msg ? eaFmtDate(row.msg.sentAt) : "—"}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs whitespace-nowrap ${
                        row.msg?.opened ? "text-green-700" : "text-gray-400"
                      }`}
                    >
                      {row.msg?.firstOpenedAt
                        ? eaFmtDate(row.msg.firstOpenedAt)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.result === "opened" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                          Opened
                        </span>
                      )}
                      {row.result === "bounced" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                          Bounced
                        </span>
                      )}
                      {row.result === "sent" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          Sent
                        </span>
                      )}
                      {row.result === "none" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          No email sent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

