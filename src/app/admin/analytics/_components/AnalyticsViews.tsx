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

type EATab = "all" | "stale" | "bounced" | "inactive";

type EAEmailDailyByItemType = {
  clicks: number;
  failed: number;
  opened: number;
  bounced: number;
  skipped: number;
  item_type: string;
  actually_sent: number;
  open_rate_pct?: number;
};

type EAEmailDailyFailedItem = {
  email: string;
  status: string;
  sent_at: number;
  user_id: number;
  alert_id: number;
  item_type: string;
  user_name: string;
  final_status: string;
};

type EAEmailDailyStats = {
  date: string;
  expected_sent: number;
  actually_sent: number;
  skipped: number;
  failed: number;
  still_failed: number;
  retried_and_delivered: number;
  bounced: number;
  opened: number;
  total_clicks: number;
  delivery_rate_pct: string;
  open_rate_pct: string;
  by_item_type: EAEmailDailyByItemType[];
  failed_list: EAEmailDailyFailedItem[];
};

function eaDailyOpenRateLabel(opened: number, delivered: number): string {
  if (delivered <= 0) return "—";
  return `${Math.round((opened / delivered) * 100)}%`;
}

function eaDailyFinalStatusBadge(finalStatus: string) {
  switch (finalStatus.toLowerCase()) {
    case "sent":
      return { label: "Recovered", cls: "bg-green-50 text-green-700" };
    case "opened":
      return { label: "Recovered (Opened)", cls: "bg-green-50 text-green-700" };
    case "failed":
      return { label: "Still Failed", cls: "bg-red-50 text-red-700" };
    default:
      return {
        label: finalStatus.replace(/_/g, " "),
        cls: "bg-gray-100 text-gray-600",
      };
  }
}

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

type EAOverviewFilters = {
  firmType: string;
  seniorityLevel: string;
  userStatus: string;
};

const EMAIL_ANALYTICS_OVERVIEW_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_analytics/overview";

const EA_LIST_PER_PAGE = 25;

type EAEmailListItem = {
  user_id: number;
  user_name: string;
  email: string;
  firm_type: string;
  seniority_level: string;
  user_status: string;
  company_name: string;
  subscriptions: string;
  active_subscriptions: number;
  total_sent: number;
  total_opened: number;
  total_bounced: number;
  open_rate_pct: string;
  sent_30d: number;
  opened_30d: number;
  clicks_30d: string;
  last_opened_at: number;
  engagement_status: string;
};

type EAEmailListResponse = {
  items: EAEmailListItem[];
  total_count: number;
  cur_page: number;
  per_page: number;
  total_pages: number;
  next_page: number | null;
};

type EAEmailAlertSetting = {
  alert_id: number;
  frequency: string;
  is_active: boolean;
  item_type: string;
  next_run_at: number | null;
  alert_status: string;
  last_sent_at: number | null;
};

type EAEmailByType = {
  opened: number;
  status: string;
  clicked: number;
  frequency: string;
  item_type: string;
  open_rate_pct: number;
  last_opened_at: number;
  emails_delivered: number;
};

type EAEmailUserDetail = {
  user_id: number;
  user_name: string;
  email: string;
  total_sent: number;
  total_opened: number;
  total_bounced: number;
  total_clicks: number;
  open_rate_pct: string;
  sent_30d: number;
  opened_30d: number;
  clicks_30d: number;
  open_rate_30d_pct: string;
  last_opened_at: number;
  alert_settings: EAEmailAlertSetting[];
  by_email_type: EAEmailByType[];
};

const EMAIL_ANALYTICS_USER_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_analytics/user";

const EMAIL_ANALYTICS_DAILY_STATS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_analytics/daily_stats";

function eaParseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function eaEngagementBadge(status: string, bounced: number) {
  if (bounced > 0) {
    return { label: "Bounced", cls: "bg-red-50 text-red-700" };
  }
  switch (status.toLowerCase()) {
    case "active":
      return { label: "Active", cls: "bg-green-50 text-green-700" };
    case "stale":
      return { label: "Stale", cls: "bg-amber-50 text-amber-700" };
    case "inactive":
      return { label: "Inactive", cls: "bg-gray-100 text-gray-500" };
    case "no_opens":
    case "never_opened":
      return { label: "No opens", cls: "bg-amber-50 text-amber-700" };
    case "bounced":
      return { label: "Bounced", cls: "bg-red-50 text-red-700" };
    default:
      return {
        label: status.replace(/_/g, " "),
        cls: "bg-gray-100 text-gray-600",
      };
  }
}

function EAEmailListRow({ item }: { item: EAEmailListItem }) {
  const [expanded, setExpanded] = useState(false);
  const openRate = Math.round(parseFloat(item.open_rate_pct) || 0);
  const lastOpened = item.last_opened_at > 0 ? item.last_opened_at : null;
  const stale =
    eaDaysSince(lastOpened ? new Date(lastOpened).toISOString() : null) > 7;
  const badge = eaEngagementBadge(item.engagement_status, item.total_bounced);
  const subscriptionTypes = item.subscriptions
    ? item.subscriptions.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const clicks30d = Number(item.clicks_30d) || 0;

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
              <div className="text-sm font-medium">{item.user_name || "—"}</div>
              <div className="text-xs text-gray-500">{item.email}</div>
              {item.company_name ? (
                <div className="text-xs text-gray-400">{item.company_name}</div>
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-500">
          {subscriptionTypes.length > 0
            ? subscriptionTypes.map((t) => eaAlertLabel(t).label).join(", ")
            : "—"}
          {item.active_subscriptions > 0 ? (
            <span className="text-gray-400">
              {" "}
              · {item.active_subscriptions} active
            </span>
          ) : null}
        </td>
        <td
          className={`px-3 py-2.5 text-xs whitespace-nowrap ${
            stale && lastOpened ? "text-red-600" : "text-gray-700"
          }`}
        >
          {lastOpened ? eaFmtDate(lastOpened) : "—"}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{openRate}%</span>
            <span className="text-xs text-gray-400">all time</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
          {item.sent_30d} sent · {item.opened_30d} opened · {clicks30d} clicks
        </td>
        <td className="px-3 py-2.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}
          >
            {badge.label}
          </span>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-gray-200">
          <td colSpan={6} className="p-0">
            <EAEmailUserDetailPanel
              userId={item.user_id}
              listOpenRate={openRate}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

const EA_FIRM_TYPES = [
  "Private equity",
  "Venture capital",
  "Corporate Finance / Investment bank",
  "Consulting",
  "Corporate",
  "Equity Research",
] as const;

const EA_SENIORITY_LEVELS = ["Junior", "Middle", "Senior"] as const;

const EA_USER_STATUSES = ["Client"] as const;

type EAOverviewStats = {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  avgOpenRate: number;
  overallOpenRate: number;
  overallClickRate: number;
  neverOpened: number;
  bounced: number;
  recipients: number;
  periodLabel: string;
};

function eaOverviewNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeEmailUserDetail(raw: unknown): EAEmailUserDetail | null {
  const row = Array.isArray(raw)
    ? raw[0]
    : raw && typeof raw === "object"
    ? raw
    : null;
  if (!row || typeof row !== "object") return null;

  const r = row as Record<string, unknown>;
  const userId = eaOverviewNum(r.user_id);
  if (!userId) return null;

  return {
    user_id: userId,
    user_name: String(r.user_name ?? ""),
    email: String(r.email ?? ""),
    total_sent: eaOverviewNum(r.total_sent),
    total_opened: eaOverviewNum(r.total_opened),
    total_bounced: eaOverviewNum(r.total_bounced),
    total_clicks: eaOverviewNum(r.total_clicks ?? r.clicks_30d),
    open_rate_pct: String(r.open_rate_pct ?? "0"),
    sent_30d: eaOverviewNum(r.sent_30d),
    opened_30d: eaOverviewNum(r.opened_30d),
    clicks_30d: eaOverviewNum(r.clicks_30d),
    open_rate_30d_pct: String(r.open_rate_30d_pct ?? "0"),
    last_opened_at: eaOverviewNum(r.last_opened_at),
    alert_settings: eaParseJsonArray<EAEmailAlertSetting>(r.alert_settings),
    by_email_type: eaParseJsonArray<EAEmailByType>(r.by_email_type),
  };
}

function EAEmailUserDetailPanel({
  userId,
  listOpenRate,
}: {
  userId: number;
  listOpenRate: number;
}) {
  const [detail, setDetail] = useState<EAEmailUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : "";
        const res = await fetch(`${EMAIL_ANALYTICS_USER_URL}/${userId}`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${text}`);
        }
        const json = await res.json();
        const normalized = normalizeEmailUserDetail(json);
        if (!normalized) throw new Error("Invalid user detail response");
        if (!aborted) setDetail(normalized);
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        if (!aborted) {
          setDetail(null);
          setError(
            e instanceof Error ? e.message : "Failed to load user detail"
          );
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50">
        Loading user detail…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-sm text-red-700 bg-red-50">
        Failed to load user detail: {error}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50">
        No user detail available.
      </div>
    );
  }

  const allTimeOpenRate = Math.round(parseFloat(detail.open_rate_pct) || 0);
  const openRate30d = Math.round(parseFloat(detail.open_rate_30d_pct) || 0);
  const activeAlerts = detail.alert_settings.filter((s) => s.is_active);
  const deliveredRows = detail.by_email_type.filter(
    (row) => row.emails_delivered > 0
  );

  return (
    <div className="px-4 py-3 bg-gray-50 space-y-4 border-t border-gray-100">
      <p className="text-xs text-gray-500 leading-relaxed">
        <span className="font-medium text-gray-700">Open rate in the row</span>{" "}
        is calculated from all tracked messages (all time).{" "}
        <span className="font-medium text-gray-700">Emails delivered below</span>{" "}
        shows only tagged messages Postmark tracked in{" "}
        <span className="font-medium text-gray-700">last 30 days</span>.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded border bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Delivered (30d)</div>
          <div className="text-lg font-medium text-gray-900">{detail.sent_30d}</div>
        </div>
        <div className="rounded border bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Opened (30d)</div>
          <div
            className={`text-lg font-medium ${
              detail.opened_30d > 0 ? "text-green-700" : "text-gray-400"
            }`}
          >
            {detail.opened_30d}
          </div>
        </div>
        <div className="rounded border bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Open rate (30d)</div>
          <div
            className={`text-lg font-medium ${
              openRate30d > 0 ? "text-green-700" : "text-gray-400"
            }`}
          >
            {openRate30d}%
          </div>
        </div>
        <div className="rounded border bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Open rate (all time)</div>
          <div
            className={`text-lg font-medium ${
              allTimeOpenRate > 0 ? "text-green-700" : "text-gray-400"
            }`}
          >
            {allTimeOpenRate}%
          </div>
          {listOpenRate !== allTimeOpenRate ? (
            <div className="text-xs text-gray-400 mt-0.5">
              {listOpenRate}% in list row
            </div>
          ) : null}
        </div>
      </div>

      {detail.alert_settings.length > 0 ? (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-1">Alert settings</h4>
          <p className="text-xs text-gray-400 mb-2">
            {activeAlerts.length} active · {detail.alert_settings.length} total
            configured
          </p>
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
                {detail.alert_settings.map((sub) => {
                  const { label, cls } = eaAlertLabel(sub.item_type);
                  return (
                    <tr
                      key={sub.alert_id}
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
                        {sub.frequency}
                      </td>
                      <td className="px-3 py-2">
                        {sub.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-green-50 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {sub.last_sent_at
                          ? formatTimestamp(sub.last_sent_at)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {sub.next_run_at
                          ? formatTimestamp(sub.next_run_at)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-1">
          Emails delivered (last 30 days)
        </h4>
        {deliveredRows.length === 0 ? (
          <p className="text-xs text-gray-400 rounded border bg-white px-3 py-4 text-center">
            No emails delivered in this period.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {[
                    "Email type",
                    "Frequency",
                    "Emails delivered",
                    "Opened",
                    "Clicked",
                    "Open rate",
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
                {deliveredRows.map((row) => {
                  const { label, cls } = eaAlertLabel(row.item_type);
                  const badge = eaEngagementBadge(row.status, 0);
                  const neverOpened =
                    row.emails_delivered > 0 && row.opened === 0;
                  return (
                    <tr
                      key={row.item_type}
                      className={`border-b border-gray-100 last:border-0 ${
                        neverOpened ? "bg-amber-50/50" : ""
                      }`}
                    >
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
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {row.emails_delivered}
                      </td>
                      <td className="px-3 py-2 text-green-700">{row.opened}</td>
                      <td className="px-3 py-2 text-blue-700">{row.clicked}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.open_rate_pct > 0
                              ? "text-green-700 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {Math.round(row.open_rate_pct)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {row.last_opened_at > 0
                          ? eaFmtDate(row.last_opened_at)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${badge.cls}`}
                        >
                          {neverOpened ? "Never opened" : badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeEmailDailyStats(raw: unknown): EAEmailDailyStats | null {
  const row = Array.isArray(raw)
    ? raw[0]
    : raw && typeof raw === "object"
    ? raw
    : null;
  if (!row || typeof row !== "object") return null;

  const r = row as Record<string, unknown>;
  return {
    date: String(r.date ?? ""),
    expected_sent: eaOverviewNum(r.expected_sent),
    actually_sent: eaOverviewNum(r.actually_sent),
    skipped: eaOverviewNum(r.skipped),
    failed: eaOverviewNum(r.failed),
    still_failed: eaOverviewNum(r.still_failed),
    retried_and_delivered: eaOverviewNum(r.retried_and_delivered),
    bounced: eaOverviewNum(r.bounced),
    opened: eaOverviewNum(r.opened),
    total_clicks: eaOverviewNum(r.total_clicks),
    delivery_rate_pct: String(r.delivery_rate_pct ?? "0"),
    open_rate_pct: String(r.open_rate_pct ?? "0"),
    by_item_type: eaParseJsonArray<EAEmailDailyByItemType>(r.by_item_type),
    failed_list: eaParseJsonArray<EAEmailDailyFailedItem>(r.failed_list),
  };
}

function normalizeOverviewStats(raw: unknown): EAOverviewStats {
  const root =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const statsSource =
    root.stats && typeof root.stats === "object"
      ? (root.stats as Record<string, unknown>)
      : root.overview && typeof root.overview === "object"
      ? (root.overview as Record<string, unknown>)
      : root;

  const totalSent = eaOverviewNum(
    statsSource.total_sent ??
      statsSource.totalSent ??
      statsSource.emails_sent
  );
  const recipients = eaOverviewNum(
    statsSource.recipients ??
      statsSource.recipient_count ??
      root.recipients ??
      root.recipient_count
  );

  return {
    totalSent,
    totalOpened: eaOverviewNum(
      statsSource.total_opened ?? statsSource.totalOpened
    ),
    totalClicked: eaOverviewNum(
      statsSource.total_clicked ?? statsSource.totalClicked
    ),
    avgOpenRate: eaOverviewNum(
      statsSource.avg_open_rate ?? statsSource.avgOpenRate
    ),
    overallOpenRate: eaOverviewNum(
      statsSource.overall_open_rate ?? statsSource.overallOpenRate
    ),
    overallClickRate: eaOverviewNum(
      statsSource.overall_click_rate ?? statsSource.overallClickRate
    ),
    neverOpened: eaOverviewNum(
      statsSource.never_opened ?? statsSource.neverOpened
    ),
    bounced: eaOverviewNum(statsSource.bounced),
    recipients:
      recipients || eaOverviewNum(statsSource.users_with_sends ?? root.total_count),
    periodLabel:
      typeof statsSource.period_label === "string"
        ? statsSource.period_label
        : typeof root.period_label === "string"
        ? root.period_label
        : "Last 30 days",
  };
}

function eaOverviewQueryParams(filters: EAOverviewFilters): string {
  const params = new URLSearchParams();
  params.set("firm_type", filters.firmType);
  params.set("seniority_level", filters.seniorityLevel);
  params.set("user_status", filters.userStatus);
  return params.toString();
}

function eaListQueryParams(
  filters: EAOverviewFilters,
  page: number,
  tab: EATab
): string {
  const params = new URLSearchParams();
  params.set("firm_type", filters.firmType);
  params.set("seniority_level", filters.seniorityLevel);
  params.set("user_status", filters.userStatus);
  params.set("page", String(page));
  params.set("per_page", String(EA_LIST_PER_PAGE));
  if (tab !== "all") {
    params.set("engagement_status", tab);
  }
  return params.toString();
}

export function EmailAnalyticsTab() {
  const [overview, setOverview] = useState<EAOverviewStats | null>(null);
  const [overviewRaw, setOverviewRaw] = useState<object | null>(null);
  const [listItems, setListItems] = useState<EAEmailListItem[]>([]);
  const [listMeta, setListMeta] = useState<{
    total_count: number;
    cur_page: number;
    total_pages: number;
  } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EAOverviewFilters>({
    firmType: "",
    seniorityLevel: "",
    userStatus: "",
  });
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<EATab>("all");
  const [showDebug, setShowDebug] = useState(false);
  const [auditDate, setAuditDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dailyStats, setDailyStats] = useState<EAEmailDailyStats | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);
  type EAUserSortCol = "openRate" | "sentCount" | "lastOpened" | "name" | "activeAlerts";
  const [userSortCol, setUserSortCol] = useState<EAUserSortCol>("openRate");
  const [userSortDir, setUserSortDir] = useState<SortDirection>("desc");

  function onUserSort(col: EAUserSortCol) {
    if (userSortCol === col) {
      setUserSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setUserSortCol(col);
      setUserSortDir(col === "name" ? "asc" : "desc");
    }
  }

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : "";
      const res = await fetch(
        `${EMAIL_ANALYTICS_OVERVIEW_URL}?${eaOverviewQueryParams(filters)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      setOverviewRaw(json && typeof json === "object" ? (json as object) : null);
      setOverview(normalizeOverviewStats(json));
    } catch (e) {
      setOverview(null);
      setOverviewRaw(null);
      setOverviewError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setOverviewLoading(false);
    }
  }, [filters]);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : "";
      const res = await fetch(
        `${EMAIL_ANALYTICS_OVERVIEW_URL}?${eaListQueryParams(filters, page, tab)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as EAEmailListResponse;
      setListItems(Array.isArray(json.items) ? json.items : []);
      setListMeta({
        total_count: json.total_count ?? 0,
        cur_page: json.cur_page ?? page,
        total_pages: json.total_pages ?? 1,
      });
    } catch (e) {
      setListItems([]);
      setListMeta(null);
      setListError(e instanceof Error ? e.message : "Failed to load user list");
    } finally {
      setListLoading(false);
    }
  }, [filters, page, tab]);

  const fetchDailyStats = useCallback(async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : "";
      const params = new URLSearchParams({ date: auditDate });
      const res = await fetch(
        `${EMAIL_ANALYTICS_DAILY_STATS_URL}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      setDailyStats(normalizeEmailDailyStats(json));
    } catch (e) {
      setDailyStats(null);
      setDailyError(
        e instanceof Error ? e.message : "Failed to load daily stats"
      );
    } finally {
      setDailyLoading(false);
    }
  }, [auditDate]);

  const refreshAll = useCallback(() => {
    fetchOverview();
    fetchList();
    fetchDailyStats();
  }, [fetchOverview, fetchList, fetchDailyStats]);

  const updateFilter = (key: keyof EAOverviewFilters, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchDailyStats();
  }, [fetchDailyStats]);

  const sortedListItems = useMemo(() => {
    const mul = userSortDir === "asc" ? 1 : -1;
    return listItems.slice().sort((a, b) => {
      switch (userSortCol) {
        case "openRate":
          return (parseFloat(a.open_rate_pct) - parseFloat(b.open_rate_pct)) * mul;
        case "sentCount":
          return (a.total_sent - b.total_sent) * mul;
        case "lastOpened":
          return (a.last_opened_at - b.last_opened_at) * mul;
        case "activeAlerts":
          return (a.active_subscriptions - b.active_subscriptions) * mul;
        case "name":
          return a.user_name.localeCompare(b.user_name) * mul;
        default:
          return 0;
      }
    });
  }, [listItems, userSortCol, userSortDir]);

  const tabs: Array<[EATab, string]> = [
    ["all", "All users"],
    ["stale", "Not opened 7d+"],
    ["bounced", "Bounced"],
    ["inactive", "Inactive"],
  ];

  return (
    <div className="space-y-4">
      {/* Daily analytics */}
      <div className="bg-white rounded border">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-medium">Daily analytics</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Send and engagement stats for the selected day
            </p>
          </div>
          <input
            type="date"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
            className="text-sm border rounded px-2 py-1.5"
          />
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
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Scheduled</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dailyStats.expected_sent.toLocaleString()}
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Delivered</div>
                <div className="text-2xl font-medium text-green-700">
                  {dailyStats.actually_sent.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {dailyStats.delivery_rate_pct}% delivery rate
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Opened</div>
                <div className="text-2xl font-medium text-green-700">
                  {dailyStats.opened.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {eaDailyOpenRateLabel(
                    dailyStats.opened,
                    dailyStats.actually_sent
                  )}{" "}
                  open rate
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Clicks</div>
                <div className="text-2xl font-medium text-blue-700">
                  {dailyStats.total_clicks.toLocaleString()}
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Failed</div>
                <div className="text-2xl font-medium text-red-700">
                  {dailyStats.still_failed.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  still undelivered after retries
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Recovered</div>
                <div className="text-2xl font-medium text-teal-700">
                  {dailyStats.retried_and_delivered.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  failed initially, then delivered
                </div>
              </div>
              <div className="rounded border px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Skipped</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dailyStats.skipped.toLocaleString()}
                </div>
              </div>
              {dailyStats.bounced > 0 ? (
                <div className="rounded border px-4 py-3">
                  <div className="text-xs text-gray-500 mb-1">Bounced</div>
                  <div className="text-2xl font-medium text-red-700">
                    {dailyStats.bounced.toLocaleString()}
                  </div>
                </div>
              ) : null}
            </div>

            {dailyStats.by_item_type.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium mb-2">By email type</h3>
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {[
                          "Type",
                          "Delivered",
                          "Opened",
                          "Clicks",
                          "Failed attempts",
                          "Open rate",
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
                      {dailyStats.by_item_type.map((row) => {
                        const { label, cls } = eaAlertLabel(row.item_type);
                        return (
                          <tr
                            key={row.item_type}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}
                              >
                                {label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-green-700 font-medium">
                              {row.actually_sent}
                            </td>
                            <td className="px-3 py-2 text-green-700">
                              {row.opened}
                            </td>
                            <td className="px-3 py-2 text-blue-700">
                              {row.clicks}
                            </td>
                            <td className="px-3 py-2 text-amber-700">
                              {row.failed || "—"}
                            </td>
                            <td className="px-3 py-2">
                              {eaDailyOpenRateLabel(row.opened, row.actually_sent)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {dailyStats.failed_list.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium mb-1 text-red-800">
                  Failed send attempts ({dailyStats.failed_list.length})
                </h3>
                <p className="text-xs text-gray-500 mb-2">
                  {dailyStats.still_failed} still failed after retries ·{" "}
                  {dailyStats.retried_and_delivered} recovered
                </p>
                <div className="overflow-x-auto rounded border border-red-200">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-red-100 bg-red-50">
                        {[
                          "User",
                          "Email",
                          "Type",
                          "Sent at",
                          "Final outcome",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left font-normal text-xs text-red-700 px-3 py-2"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...dailyStats.failed_list]
                        .sort((a, b) => {
                          const rank = (s: string) =>
                            s.toLowerCase() === "failed" ? 0 : 1;
                          return (
                            rank(a.final_status || "failed") -
                              rank(b.final_status || "failed") ||
                            b.sent_at - a.sent_at
                          );
                        })
                        .map((row) => {
                        const { label, cls } = eaAlertLabel(row.item_type);
                        const outcome = eaDailyFinalStatusBadge(
                          row.final_status || row.status || "failed"
                        );
                        const stillFailed =
                          (row.final_status || row.status).toLowerCase() ===
                          "failed";
                        return (
                          <tr
                            key={`${row.alert_id}-${row.sent_at}`}
                            className={`border-b border-red-50 last:border-0 ${
                              stillFailed ? "bg-red-50/60" : ""
                            }`}
                          >
                            <td
                              className={`px-3 py-2 font-medium ${
                                stillFailed ? "text-red-900" : "text-gray-900"
                              }`}
                            >
                              {row.user_name}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {row.email}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}
                              >
                                {label}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                              {formatTimestamp(row.sent_at)}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${outcome.cls}`}
                              >
                                {outcome.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshAll}
              disabled={overviewLoading || listLoading || dailyLoading}
              className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              {overviewLoading || listLoading || dailyLoading
                ? "Loading…"
                : "↻ Refresh"}
            </button>
            <button
              onClick={() => setShowDebug((s) => !s)}
              className="text-xs border rounded px-2 py-1.5 text-gray-500 hover:bg-gray-50"
              title="Toggle debug info"
            >
              {showDebug ? "Hide debug" : "Debug"}
            </button>
          </div>
          {overview && (
            <span className="text-xs text-gray-500">{overview.periodLabel}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            value={filters.userStatus}
            onChange={(e) => updateFilter("userStatus", e.target.value)}
            className="text-sm border rounded px-2 py-1.5"
          >
            <option value="">All user statuses</option>
            {EA_USER_STATUSES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {(filters.firmType ||
            filters.seniorityLevel ||
            filters.userStatus) && (
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setFilters({
                  firmType: "",
                  seniorityLevel: "",
                  userStatus: "",
                });
              }}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {overviewError ? (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          Failed to load overview: {overviewError}
        </div>
      ) : null}

      {listError ? (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          Failed to load user list: {listError}
        </div>
      ) : null}

      {/* Stat cards */}
      {overviewLoading && !overview ? (
        <div className="text-center py-6 text-sm text-gray-500">Loading overview…</div>
      ) : null}
      {overview && (
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1 */}
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Emails sent</div>
            <div className="text-2xl font-medium text-gray-900">{overview.totalSent.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">
              {overview.recipients.toLocaleString()} recipients · {overview.periodLabel}
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Open rate (overall)</div>
            <div className="text-2xl font-medium text-green-700">
              {overview.overallOpenRate}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {overview.totalOpened.toLocaleString()} of {overview.totalSent.toLocaleString()} messages opened
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Click rate (overall)</div>
            <div className="text-2xl font-medium text-blue-700">
              {overview.overallClickRate}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {overview.totalClicked.toLocaleString()} of {overview.totalSent.toLocaleString()} messages clicked
            </div>
          </div>
          {/* Row 2 */}
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Avg open rate per user</div>
            <div className="text-2xl font-medium text-green-700">{overview.avgOpenRate}%</div>
            <div className="text-xs text-gray-400 mt-1">across users who received email</div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Never opened</div>
            <div className="text-2xl font-medium text-amber-700">{overview.neverOpened}</div>
            <div className="text-xs text-gray-400 mt-1">
              users received email but 0 opens
            </div>
          </div>
          <div className="bg-white rounded border px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Bounced</div>
            <div className="text-2xl font-medium text-red-700">{overview.bounced}</div>
            <div className="text-xs text-gray-400 mt-1">hard bounce, needs action</div>
          </div>
        </div>
      )}

      {/* Debug panel */}
      {showDebug && overviewRaw ? (
        <div className="bg-gray-900 text-gray-100 rounded border border-gray-700 px-4 py-3 text-xs font-mono space-y-1">
          <div className="text-gray-400 font-sans font-medium text-xs mb-2">
            Xano overview response
          </div>
          <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(overviewRaw, null, 2)}
          </pre>
        </div>
      ) : null}

      {/* Per-user engagement table */}
      <div className="bg-white rounded border">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-medium">Per-user engagement</h2>
          {listMeta ? (
            <span className="text-xs text-gray-500">
              {listMeta.total_count.toLocaleString()} users
              {listMeta.total_pages > 1
                ? ` · Page ${listMeta.cur_page} of ${listMeta.total_pages}`
                : ""}
            </span>
          ) : null}
        </div>

        {/* Badge legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-600">
          <span className="font-medium text-gray-500 mr-1">Status:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <b>Active</b> — received email, opened within 7 days
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <b>Stale</b> — received email, last opened 7+ days ago
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <b>No opens</b> — received email but never opened any
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            <b>Bounced</b> — at least one hard bounce, needs action
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
            <b>Inactive</b> — no active email subscriptions
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 px-4">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              onClick={() => {
                setPage(1);
                setTab(t);
              }}
              className={`text-sm py-2 px-3 border-b-2 mr-1 ${
                tab === t
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              {tab === t && listMeta ? (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({listMeta.total_count})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {listLoading ? (
            <div className="text-center py-8 text-sm text-gray-500">
              Loading…
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {(
                    [
                      ["name",         "User",              true],
                      ["activeAlerts", "Subscriptions",     true],
                      ["lastOpened",   "Last opened",       true],
                      ["openRate",     "Open rate",         true],
                      [null,           "Last 30 days",      false],
                      [null,           "Status",            false],
                    ] as [EAUserSortCol | null, string, boolean][]
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
                          {userSortCol === col && (
                            <span>{userSortDir === "asc" ? "▲" : "▼"}</span>
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedListItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-sm text-gray-500"
                    >
                      No users match this filter.
                    </td>
                  </tr>
                ) : (
                  sortedListItems.map((item) => (
                    <EAEmailListRow key={item.user_id} item={item} />
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {listMeta && listMeta.total_pages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            <span>
              Showing page {listMeta.cur_page} of {listMeta.total_pages} (
              {listMeta.total_count.toLocaleString()} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={listLoading || page <= 1}
                className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((p) =>
                    listMeta ? Math.min(listMeta.total_pages, p + 1) : p + 1
                  )
                }
                disabled={listLoading || page >= listMeta.total_pages}
                className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

