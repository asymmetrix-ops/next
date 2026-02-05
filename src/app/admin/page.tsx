"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import EmailEditor from "react-email-editor";
import SearchableSelect from "@/components/ui/SearchableSelect";
import TiptapSimpleEditor from "@/components/ui/TiptapSimpleEditor";
import { locationsService } from "@/lib/locationsService";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

type SourceIdList = number[];

interface FieldValue<T = unknown> {
  value: T;
  source_ids?: SourceIdList;
  as_of?: string;
}

type CompanySection = Record<string, FieldValue<unknown>>;

interface MVAStage {
  stage: string;
  summary: string;
}

type FinancialsValue = number | string | undefined;

type FinancialsEntry =
  | number
  | {
      low?: number;
      mid?: number;
      high?: number;
      method?: string;
      [k: string]: FinancialsValue;
    };

type FinancialsEst = Record<string, FinancialsEntry>;

interface MetaSection {
  queries_used?: string[];
  [k: string]: unknown;
}

interface ValuationReport {
  citations?: unknown[];
  company?: CompanySection;
  debug?: {
    company_raw?: CompanySection;
    mva_stages?: MVAStage[];
    [k: string]: unknown;
  };
  financials_est?: FinancialsEst;
  meta?: MetaSection;
  rendered_report_markdown?: string;
  [k: string]: unknown;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | "valuation"
    | "user-activity"
    | "content-insights"
    | "page-insights"
    | "emails"
    | "content"
    | "sectors"
  >("valuation");

  // Only authenticated users with admin role may access; others are redirected.
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const status = (
      user.Status ??
      user.status ??
      user.role ??
      ""
    ).toString().toLowerCase();
    if (status === "admin") return true;
    const roles = (user.roles ?? []).map((r) => String(r).toLowerCase());
    return roles.includes("admin");
  }, [user]);

  const canAccessAdmin = !loading && !!user && isAuthenticated && isAdmin;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAuthenticated, isAdmin, loading, router]);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const defaultPrompt = `You are the Multi-Stage Valuation Agent (MVA). Perform a multi-stage valuation analysis of the target company using public sources.
Output strict JSON with keys: stages (array of {stage, summary}), and company (same schema as below, with source_ids).
Stages: Stage 0 Company Overview; Stage 1 Revenue Estimation; Stage 2 Recurring Revenue %; Stage 3 GRR; Stage 4 NRR; Stage 5 New Clients Revenue Growth %;
Stage 6 EBITDA Margin %; Stage 7 Rule of 40; Stage 8 Valuation Estimate; Stage 9 Validation; Stage 10 Update.
All asserted company.* fields must have >=1 source_ids from the citations. Leave null if not supported.
Schema: {
  "stages": [{"stage": string, "summary": string}],
  "company": {
    "name": {"value": string|null, "source_ids": [int]},
    "domain": {"value": string|null, "source_ids": [int]},
    "one_liner": {"value": string|null, "source_ids": [int]},
    "founded_year": {"value": int|null, "source_ids": [int]},
    "ownership": {"value": string|null, "source_ids": [int]},
    "hq": {"value": string|null, "source_ids": [int]},
    "ceo": {"value": string|null, "source_ids": [int]},
    "employees": {"value": int|null, "as_of": string|null, "source_ids": [int]},
    "clients": {"value": string|null, "source_ids": [int]},
    "products": {"value": [string], "source_ids": [int]}
  }
}
Target company: {query} ({domain})`;
  const [prompt, setPrompt] = useState<string>(defaultPrompt);
  const [result, setResult] = useState<ValuationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { name, domain };
      if (prompt.trim() !== defaultPrompt.trim()) {
        (payload as { [k: string]: unknown }).ai_prompt = prompt;
      }

      const res = await fetch("/api/valuation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canAccessAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>{loading ? "Loading…" : "Access denied."}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 w-full max-w-none min-h-screen">
      <h1 className="mb-6 text-2xl font-semibold">Admin</h1>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("valuation")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "valuation"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Valuation Report
        </button>
        <button
          onClick={() => setActiveTab("user-activity")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "user-activity"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          User Activity
        </button>
        <button
          onClick={() => setActiveTab("content-insights")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "content-insights"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Content Insights
        </button>
        <button
          onClick={() => setActiveTab("page-insights")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "page-insights"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Page Insights
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "emails"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Emails
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "content"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Content
        </button>
        <button
          onClick={() => setActiveTab("sectors")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "sectors"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Sectors
        </button>
      </div>

      {activeTab === "valuation" && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Valuation Report</h2>
          <form onSubmit={onSubmit} className="mb-8 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bloomberg L.P."
                  className="px-3 py-2 w-full rounded border"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="bloomberg.com"
                  className="px-3 py-2 w-full rounded border"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                Prompt (optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="px-3 py-2 w-full font-mono text-sm rounded border min-h-48"
              />
              <p className="mt-1 text-xs text-gray-500">
                If unchanged, the prompt will not be sent.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 text-white bg-black rounded disabled:opacity-50"
            >
              {submitting ? "Querying…" : "Query"}
            </button>
          </form>

          {error && (
            <div className="p-3 mb-6 text-red-700 bg-red-50 rounded border border-red-300">
              {error}
            </div>
          )}

          {result && <ResultView data={result} />}
        </div>
      )}

      {activeTab === "user-activity" && <UserActivityTab />}
      {activeTab === "content-insights" && <ContentInsightsTab />}
      {activeTab === "page-insights" && <PageInsightsTab />}
      {activeTab === "emails" && <EmailsTab />}
      {activeTab === "content" && <ContentTab />}
      {activeTab === "sectors" && <SectorsTab />}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="p-4 bg-white rounded border">{children}</div>
    </div>
  );
}

type UserActivityRow = {
  user_id: number;
  user_name: string;
  user_email: string | null;
  company_name: string;
  sessions_last_30_days: number;
  sessions_last_90_days: number;
  page_views_last_30_days: number;
  page_views_last_90_days: number;
  total_sessions: number;
  total_page_views: number;
  last_activity_timestamp: number | null;
};

type SortColumn = keyof UserActivityRow;
type SortDirection = "asc" | "desc";

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

function compareValues(a: unknown, b: unknown, dir: SortDirection): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return -1 * mul;
  if (b == null) return 1 * mul;
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * mul;
  }
  return String(a).localeCompare(String(b)) * mul;
}

function UserActivityTab() {
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
      .filter((r) =>
        companyFilter ? r.company_name === companyFilter : true
      )
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
      setSortDir(col === "user_name" || col === "user_email" || col === "company_name" ? "asc" : "desc");
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
                <td className="px-3 py-3 text-center" colSpan={11}>
                  Loading…
                </td>
              </tr>
            )}
            {errorUa && !loadingUa && (
              <tr>
                <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={11}>
                  {errorUa}
                </td>
              </tr>
            )}
            {!loadingUa && !errorUa && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-gray-500" colSpan={11}>
                  No results
                </td>
              </tr>
            )}
            {!loadingUa && !errorUa &&
              filtered.map((r) => (
                <tr key={`${r.user_id}-${r.user_email || ""}`} className="border-t">
                  <td className="px-3 py-2">{r.user_id}</td>
                  <td className="px-3 py-2">{r.user_name}</td>
                  <td className="px-3 py-2">{r.user_email || "—"}</td>
                  <td className="px-3 py-2">{r.company_name}</td>
                  <td className="px-3 py-2">{r.sessions_last_30_days}</td>
                  <td className="px-3 py-2">{r.sessions_last_90_days}</td>
                  <td className="px-3 py-2">{r.page_views_last_30_days}</td>
                  <td className="px-3 py-2">{r.page_views_last_90_days}</td>
                  <td className="px-3 py-2">{r.total_sessions}</td>
                  <td className="px-3 py-2">{r.total_page_views}</td>
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

// Content Insights Types
type ContentInsightsView = "Individual" | "Content Type" | "Top Articles Per Type";

// Flexible type for different views - will be determined by the API response
type ContentInsightsRow = Record<string, unknown>;

type ContentInsightsSortColumn = string;

function ContentInsightsTab() {
  const [view, setView] = useState<ContentInsightsView>("Top Articles Per Type");
  const [data, setData] = useState<ContentInsightsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<ContentInsightsSortColumn>("");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Fetch available content types from service
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
        
        // Use POST if content types are selected (for array support), otherwise GET
        if (selectedContentTypes.length > 0) {
          // POST with JSON body for array support
          const payload = {
            view,
            content_type: selectedContentTypes,
          };
          resp = await fetch(url.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
        } else {
          // GET for backward compatibility when no filters
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
          setData(Array.isArray(json) ? json : []);
          // Set default sort column based on view
          if (json.length > 0) {
            const keys = Object.keys(json[0] as Record<string, unknown>);
            if (view === "Top Articles Per Type") {
              setSortCol(
                keys.includes("total_page_views")
                  ? "total_page_views"
                  : keys.includes("total_views")
                    ? "total_views"
                    : "page_views_90d"
              );
            } else if (view === "Content Type") {
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
  }, [view, selectedContentTypes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => {
        if (!q) return true;
        // Search across all string fields
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

    // Define column labels based on common field names
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

    // Prefer a stable, human-friendly column order when metrics exist
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

    return ordered.map(
      (key) => [key, labelMap[key] || key] as [string, string]
    );
  }

  const columnHeaders = getColumnHeaders();
  const columnCount = columnHeaders.length || 1;

  return (
    <div>
      {/* Sub-tabs for different views */}
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

      {/* Filters */}
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
              if (typeof value === "string" && !selectedContentTypes.includes(value)) {
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

      {/* Table */}
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
                <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={columnCount}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-gray-500" colSpan={columnCount}>
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
                      // Make content_id a link in "Top Articles Per Type" view
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
                      // Format dates
                      if (
                        (key === "Publication_Date" || key === "publication_date") &&
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

// Page Insights Types + reusable helpers (Companies / Sectors / Investors / Advisors / Individuals)
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
  // Xano often returns: "2026-01-16 20:38:59.189+00"
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
  T extends PageInsightsMetrics & Record<string, unknown>
>(
  params: {
    idKey: keyof T;
    nameKey: keyof T;
    idLabel: string;
    nameLabel: string;
    extraColumns?: Array<InsightsColumnDef<T>>;
  }
): InsightsColumnDef<T>[] {
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
      const ta = toXanoTimestamp((a as Record<string, unknown>)[dateKey as string]);
      const tb = toXanoTimestamp((b as Record<string, unknown>)[dateKey as string]);
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
              <th key={String(key)} className="px-3 py-2 text-left whitespace-nowrap">
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

function PageInsightsTab() {
  const [view, setView] = useState<PageInsightsView>("Companies");
  const [search, setSearch] = useState("");

  // Data (cached per sub-tab)
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

  // Sort state per sub-tab
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

      {/* Sub-tabs */}
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

      {/* Filters */}
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

function KeyValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex gap-2 py-1">
      <div className="font-medium min-w-48">{label}</div>
      <div className="flex-1 break-words">
        {Array.isArray(value) ? value.join(", ") : String(value)}
      </div>
    </div>
  );
}

function ResultView({ data }: { data: ValuationReport }) {
  const {
    company,
    financials_est,
    debug,
    citations,
    meta,
    rendered_report_markdown,
  } = data || {};

  return (
    <div className="space-y-8">
      {rendered_report_markdown && (
        <Section title="Rendered Report">
          <pre className="text-sm whitespace-pre-wrap break-words">
            {rendered_report_markdown}
          </pre>
        </Section>
      )}

      {company && (
        <Section title="Company">
          <div>
            {Object.entries(company as CompanySection).map(([k, v]) => (
              <div
                key={k}
                className="py-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="text-sm text-gray-500">{k}</div>
                <KeyValue label="value" value={(v as FieldValue).value} />
                {(v as FieldValue).as_of && (
                  <KeyValue label="as_of" value={(v as FieldValue).as_of} />
                )}
                {(v as FieldValue).source_ids && (
                  <KeyValue
                    label="source_ids"
                    value={(v as FieldValue).source_ids}
                  />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {financials_est && (
        <Section title="Financials (Estimated)">
          <div>
            {Object.entries(financials_est as FinancialsEst).map(([k, v]) => (
              <div
                key={k}
                className="py-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="text-sm text-gray-500">{k}</div>
                {typeof v === "object" && v !== null ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {Object.entries(v as Record<string, FinancialsValue>).map(
                      ([kk, vv]) => (
                        <KeyValue key={kk} label={kk} value={vv} />
                      )
                    )}
                  </div>
                ) : (
                  <KeyValue label={k} value={v} />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {debug?.mva_stages && Array.isArray(debug.mva_stages) && (
        <Section title="MVA Stages">
          <ol className="ml-6 space-y-2 list-decimal">
            {(debug.mva_stages as MVAStage[]).map((s, idx) => (
              <li key={idx} className="p-3 rounded border">
                <div className="font-medium">{s.stage}</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {s.summary}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {debug?.company_raw && (
        <Section title="Debug: Company Raw">
          <div>
            {Object.entries(debug.company_raw as CompanySection).map(
              ([k, v]) => (
                <div
                  key={k}
                  className="py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-sm text-gray-500">{k}</div>
                  <KeyValue label="value" value={(v as FieldValue).value} />
                  {(v as FieldValue).as_of && (
                    <KeyValue label="as_of" value={(v as FieldValue).as_of} />
                  )}
                  {(v as FieldValue).source_ids && (
                    <KeyValue
                      label="source_ids"
                      value={(v as FieldValue).source_ids}
                    />
                  )}
                </div>
              )
            )}
          </div>
        </Section>
      )}

      {(meta?.queries_used || meta) && (
        <Section title="Meta">
          {meta?.queries_used && (
            <div className="mb-4">
              <div className="mb-2 font-medium">Queries Used</div>
              <ul className="ml-6 space-y-1 list-disc">
                {(meta.queries_used as string[]).map((q, i) => (
                  <li key={i} className="text-sm break-words">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <pre className="p-3 text-xs whitespace-pre-wrap break-words bg-gray-50 rounded border">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </Section>
      )}

      {Array.isArray(citations) && (
        <Section title="Citations">
          {citations.length === 0 ? (
            <div className="text-sm text-gray-600">No citations.</div>
          ) : (
            <ul className="ml-6 space-y-1 list-disc">
              {(citations as unknown[]).map((c, i) => (
                <li key={i} className="text-sm break-words">
                  {JSON.stringify(c)}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section title="Raw JSON">
        <pre className="p-3 text-xs whitespace-pre-wrap break-words bg-gray-50 rounded border">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Section>
    </div>
  );
}

function sanitizeHtml(input: string): string {
  let out = input;
  // Remove script tags entirely
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  // Drop on* event handler attributes
  out = out.replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Neutralize javascript: URLs
  out = out.replace(
    /(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
    '$1="#"'
  );
  return out;
}

function buildBrandedEmailHtml(params: {
  bodyHtml: string;
  subject: string;
}): string {
  const { bodyHtml, subject } = params;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${
      subject ? subject.replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""
    }</title>
    <style>
      /* Fonts */
      body { margin:0; padding:0; background:#ffffff; color:#333333; font-family: Arial, sans-serif; }
      a { color:#1a73e8; text-decoration:none; }
      h2 { font-size:22px; line-height:1.3; font-weight:600; margin:24px 0 8px; }

      /* Layout */
      table { border-collapse:collapse; }
      .full { width:100%; }
      .container { max-width:720px; margin:0 auto; padding:16px 24px; }

      /* Tables as cards */
      .card { border:1px solid #e5e7eb; border-radius:6px; }
      .card table { width:100%; border-collapse:separate; border-spacing:0; }
      .card th { font:600 14px Arial, sans-serif; text-align:left; padding:12px; background:#f8fafc; border-bottom:1px solid #e5e7eb; color:#111827; }
      .card td { font-size:14px; line-height:1.5; padding:12px; border-top:1px solid #e5e7eb; color:#333333; }
      .col-date { width:110px; }

      /* Badges */
      .badge { font-size:11px; font-weight:700; text-transform:uppercase; display:inline-block; padding:2px 8px; border-radius:9999px; border:1px solid transparent; }
      .badge.hot-take { background:#FFF7ED; border-color:#F5D6B3; color:#8B5E2B; }
      .badge.company-analysis { background:#EEF2FF; border-color:#C7D2FE; color:#3E4AC9; }
      .badge.deal-brief { background:#F0F9FF; border-color:#BAE6FD; color:#0F4C81; }
      .badge.market-map { background:#F0FDF4; border-color:#BBF7D0; color:#166534; }
      .badge.default { background:#F3F4F6; border-color:#E5E7EB; color:#374151; }

      /* Stack for mobile */
      @media (max-width:600px) {
        .stack thead { display:none !important; }
        .stack td, .stack th, .stack .stack-col { display:block !important; width:100% !important; }
      }
    </style>
  </head>
  <body>
    <table role="presentation" class="full" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="100%">
            <tr>
              <td>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function EmailsTab() {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const unlayerRef = useRef<unknown>(null);
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [singleRecipient, setSingleRecipient] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const imageUploadRegisteredRef = useRef(false);

  const UNLAYER_PROJECT_ID: number | null = (() => {
    const raw = process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  })();

  const XANO_IMAGE_UPLOAD_URL =
    "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/upload_image_file";

  async function uploadImageToXano(file: File): Promise<string> {
    const token = localStorage.getItem("asymmetrix_auth_token");
    const fd = new FormData();
    fd.append("file", file, file.name);

    const resp = await fetch(XANO_IMAGE_UPLOAD_URL, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // IMPORTANT: do NOT set Content-Type for multipart/form-data
      },
      body: fd,
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Image upload failed: ${resp.status} ${txt}`);
    }
    const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    const urlCandidate =
      (json as { url?: string }).url ||
      (json as { file?: { url?: string } }).file?.url ||
      (json as { image?: { url?: string } }).image?.url ||
      (json as { path?: string }).path ||
      (json as { file?: { path?: string } }).file?.path ||
      "";
    const url =
      urlCandidate && urlCandidate.startsWith("/vault/")
        ? `https://xdil-abvj-o7rq.e2.xano.io${urlCandidate}`
        : urlCandidate;
    if (!url) throw new Error("Image upload response missing url");
    return url;
  }
  interface EmailTemplate {
    id: number;
    Headline?: string | null;
    Body?: string | null;
    Publication_Date?: unknown;
    created_at?: number;
  }
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");

  function extractInnerContent(fullHtml: string): string {
    // If it's a full HTML document, extract the inner content
    // Look for the content inside the container table/td
    try {
      // Create a temporary DOM parser to extract content safely
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullHtml, 'text/html');
      
      // Try to find the container table
      const container = doc.querySelector('table.container, .container table, table[class*="container"]');
      if (container) {
        const td = container.querySelector('td');
        if (td) {
          return td.innerHTML.trim();
        }
      }
      
      // Try to find any div inside body
      const bodyDiv = doc.body?.querySelector('div');
      if (bodyDiv) {
        return bodyDiv.innerHTML.trim();
      }
      
      // If no wrapper found, return body content or as-is
      return doc.body?.innerHTML.trim() || fullHtml;
    } catch {
      // Fallback: regex extraction
      const containerMatch = fullHtml.match(/<table[^>]*class="container"[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/table>/i);
      if (containerMatch && containerMatch[1]) {
        return containerMatch[1].trim();
      } 
      const divMatch = fullHtml.match(/<body[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/body>/i);
      if (divMatch && divMatch[1]) {
        return divMatch[1].trim();
      }
      return fullHtml;
    }
  }

  const readyResolveRef = useRef<(() => void) | null>(null);
  const readyP = useRef<Promise<void> | null>(null);
  if (!readyP.current) {
    readyP.current = new Promise<void>(
      (res) => (readyResolveRef.current = res)
    );
  }

  async function getEditorApi() {
    await readyP.current;
    type EditorRef = {
      editor?: {
        exportHtml?: (cb: (d: { html?: string }) => void) => void;
        loadDesign?: (design: unknown) => void;
      };
    };
    const ref = unlayerRef.current as EditorRef | null;
    const api = ref?.editor as
      | {
          exportHtml?: (cb: (d: { html?: string }) => void) => void;
          loadDesign?: (design: unknown) => void;
        }
      | undefined;
    if (!api?.exportHtml || !api?.loadDesign) {
      throw new Error("Email editor API not available yet.");
    }
    return api;
  }

  async function safeExportHtml(): Promise<{ html?: string }> {
    const api = await getEditorApi();
    return await new Promise<{ html?: string }>((resolve) =>
      api.exportHtml?.((d: { html?: string }) => resolve(d))
    );
  }

  async function safeLoadHtml(rawHtml: string): Promise<void> {
    const innerHtml = extractInnerContent(rawHtml);
    const api = await getEditorApi();
    api.loadDesign?.({
      body: {
        rows: [
          {
            cells: [1],
            columns: [
              {
                contents: [
                  {
                    type: "html",
                    values: { html: innerHtml },
                  },
                ],
              },
            ],
          },
        ],
        values: { backgroundColor: "#ffffff", contentWidth: "600px" },
      },
    } as unknown);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      try {
        setTemplatesLoading(true);
        const res = await fetch(
          "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_content",
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setTemplates(data as EmailTemplate[]);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    }
    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    try {
      const exported = await safeExportHtml();
      const rawHtml = exported?.html || "";
      const sanitized = sanitizeHtml(rawHtml);
      const branded = buildBrandedEmailHtml({
        bodyHtml: `<div>${sanitized}</div>`,
        subject,
      });
      setHtml(branded);
    } catch (err) {
      console.error("Failed to export HTML:", err);
      alert("Email editor is not ready yet. Try again in a few seconds.");
    }
  };

  const handleCopy = async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
    } catch {}
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Email Template Builder</h2>

      <div className="flex gap-3 items-center mb-3">
        <label className="text-sm font-medium">Single recipient</label>
        <input
          type="checkbox"
          checked={singleRecipient}
          onChange={(e) => setSingleRecipient(e.target.checked)}
        />
      </div>
      {singleRecipient && (
        <div className="mb-3">
          <label className="block mb-1 text-sm font-medium">
            Recipient email
          </label>
          <input
            type="email"
            className="p-2 w-full border"
            placeholder="name@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
        </div>
      )}

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Template</label>
        <select
          className="p-2 w-full border"
          value={selectedTemplateId}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              setSelectedTemplateId("");
              return;
            }
            const idNum = Number(val);
            setSelectedTemplateId(idNum);
            const t = templates.find((x) => x.id === idNum);
            if (t) {
              setSubject(String(t.Headline ?? ""));
              if (t.Body) {
                const bodyHtml = String(t.Body);
                if (editorReady) {
                  void safeLoadHtml(bodyHtml);
                } else {
                  setPendingHtml(bodyHtml);
                }
              }
            }
          }}
        >
          <option value="" disabled={templatesLoading}>
            {templatesLoading ? "Loading templates..." : "Choose a template"}
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.Headline ? String(t.Headline) : `Template #${t.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Subject</label>
        <input
          type="text"
          className="p-2 w-full border"
          placeholder="Email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="border" ref={editorContainerRef}>
        <EmailEditor
          ref={unlayerRef as unknown as never}
          minHeight={500}
          options={{
            ...(UNLAYER_PROJECT_ID ? { projectId: UNLAYER_PROJECT_ID } : {}),
            user: {
              id: "admin",
            },
          } as never}
          onReady={() => {
            readyResolveRef.current?.();
            setEditorReady(true);
            // Ensure image uploads go to Xano (not Unlayer)
            if (!imageUploadRegisteredRef.current) {
              imageUploadRegisteredRef.current = true;
              const editor = (unlayerRef.current as { editor?: unknown } | null)
                ?.editor as
                | {
                    registerCallback?: (
                      type: string,
                      cb: (file: unknown, done: (data: unknown) => void) => void
                    ) => void;
                  }
                | undefined;
              editor?.registerCallback?.("image", async (file: unknown, done) => {
                try {
                  const f =
                    file instanceof File
                      ? file
                      : (file as { attachments?: unknown[] })?.attachments?.[0] instanceof
                        File
                      ? ((file as { attachments?: unknown[] }).attachments![0] as File)
                      : null;
                  if (!f) throw new Error("No image file provided");
                  const url = await uploadImageToXano(f);
                  done({ progress: 100, url });
                } catch (e) {
                  console.error("Image upload failed:", e);
                  done({ progress: 100, url: "" });
                  alert(
                    e instanceof Error ? e.message : "Failed to upload image to Xano"
                  );
                }
              });
            }
            if (pendingHtml) {
              void safeLoadHtml(pendingHtml);
              setPendingHtml(null);
            }
          }}
        />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          className="px-4 py-2 text-white bg-purple-600 rounded"
          onClick={handleExport}
        >
          Export HTML
        </button>
        <button
          className="px-4 py-2 text-white bg-gray-800 rounded disabled:opacity-50"
          onClick={handleCopy}
          disabled={!html}
        >
          Copy HTML
        </button>
        {selectedTemplateId === "" ? (
          <button
            className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
            onClick={async () => {
              if (sending) return;
              const subjectTrimmed = subject.trim();
              if (!subjectTrimmed) return;

              let exported: { html?: string };
              try {
                exported = await safeExportHtml();
              } catch (err) {
                console.error("Failed to export HTML:", err);
                alert(
                  "Email editor is not ready yet. Try again in a few seconds."
                );
                return;
              }

              const rawHtml = exported?.html || "";
              const sanitized = sanitizeHtml(rawHtml);
              const bodyHtml = `<div>${sanitized}</div>`;
              const brandedHtml = buildBrandedEmailHtml({
                bodyHtml,
                subject: subjectTrimmed,
              });
              setHtml(brandedHtml);

              setSending(true);
              try {
                const res = await fetch(
                  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_content",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      Publication_Date: null,
                      Headline: subjectTrimmed,
                      Body: brandedHtml,
                    }),
                  }
                );
                if (!res.ok) {
                  alert("Failed to submit email content");
                } else {
                  alert("Email content submitted");
                }
              } catch {
                alert("Network error while submitting content");
              } finally {
                setSending(false);
              }
            }}
            disabled={sending || !subject.trim()}
          >
            Submit
          </button>
        ) : (
          <button
            className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
            onClick={async () => {
              if (sending) return;
              const idNum = Number(selectedTemplateId);
              if (!idNum) return;
              const subjectTrimmed = subject.trim();
              if (!subjectTrimmed) return;

              let exported: { html?: string };
              try {
                exported = await safeExportHtml();
              } catch (err) {
                console.error("Failed to export HTML:", err);
                alert(
                  "Email editor is not ready yet. Try again in a few seconds."
                );
                return;
              }

              const rawHtml = exported?.html || "";
              const sanitized = sanitizeHtml(rawHtml);
              const bodyHtml = `<div>${sanitized}</div>`;
              const brandedHtml = buildBrandedEmailHtml({
                bodyHtml,
                subject: subjectTrimmed,
              });
              setHtml(brandedHtml);

              setSending(true);
              try {
                const res = await fetch(
                  `https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_content/${idNum}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email_content_id: idNum,
                      Publication_Date: null,
                      Headline: subjectTrimmed,
                      Body: brandedHtml,
                    }),
                  }
                );
                if (!res.ok) {
                  alert("Failed to save template");
                } else {
                  alert("Template saved");
                }
              } catch {
                alert("Network error while saving");
              } finally {
                setSending(false);
              }
            }}
            disabled={sending || !subject.trim()}
          >
            Save
          </button>
        )}
      </div>

      {html && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">Generated HTML</h3>
          <pre className="overflow-x-auto p-2 text-sm bg-gray-100 rounded">
            {html}
          </pre>
        </div>
      )}
    </div>
  );
}
function ContentTab() {
  const [html, setHtml] = useState("");
  const [bodyHtml, setBodyHtml] = useState<string>("<p></p>");
  const [headline, setHeadline] = useState("");
  const [strapline, setStrapline] = useState("");
  const [contentType, setContentType] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [singleRecipient, setSingleRecipient] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);

  const XANO_IMAGE_UPLOAD_URL =
    "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/images";

  async function uploadImageToXano(file: File): Promise<string> {
    const token = localStorage.getItem("asymmetrix_auth_token");
    const fd = new FormData();
    fd.append("img", file, file.name);

    const resp = await fetch(XANO_IMAGE_UPLOAD_URL, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // IMPORTANT: do NOT set Content-Type for multipart/form-data
      },
      body: fd,
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Image upload failed: ${resp.status} ${txt}`);
    }
    const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    const urlCandidate =
      (json as { url?: string }).url ||
      (json as { file?: { url?: string } }).file?.url ||
      (json as { image?: { url?: string } }).image?.url ||
      (json as { path?: string }).path ||
      (json as { file?: { path?: string } }).file?.path ||
      "";
    const url =
      urlCandidate && urlCandidate.startsWith("/vault/")
        ? `https://xdil-abvj-o7rq.e2.xano.io${urlCandidate}`
        : urlCandidate;
    if (!url) throw new Error("Image upload response missing url");
    return url;
  }

  // Company + sector metadata (for content creation workflows)
  interface SimpleCompany {
    id: number;
    name: string;
  }

  // Company of Focus (multi)
  const [cofQuery, setCofQuery] = useState("");
  const [cofResults, setCofResults] = useState<SimpleCompany[]>([]);
  const [companyOfFocus, setCompanyOfFocus] = useState<SimpleCompany[]>([]);
  const [cofLoading, setCofLoading] = useState(false);

  // Companies Mentioned (multi)
  const [mentionedQuery, setMentionedQuery] = useState("");
  const [mentionedResults, setMentionedResults] = useState<SimpleCompany[]>([]);
  const [companiesMentioned, setCompaniesMentioned] = useState<SimpleCompany[]>(
    []
  );
  const [mentionedLoading, setMentionedLoading] = useState(false);

  // Sectors (multi)
  const [allSectors, setAllSectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);
  const [selectedSectorIds, setSelectedSectorIds] = useState<number[]>([]);

  // Related corporate events (multi)
  type SimpleCorporateEvent = { id: number; label: string };
  const [corporateEventsQuery, setCorporateEventsQuery] = useState("");
  const [corporateEventsResults, setCorporateEventsResults] = useState<
    SimpleCorporateEvent[]
  >([]);
  const [selectedCorporateEvents, setSelectedCorporateEvents] = useState<
    SimpleCorporateEvent[]
  >([]);
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(false);
  const corporateEventsDebounceRef = useRef<number | null>(null);

  // Related documents (local only for now)
  const [relatedDocuments, setRelatedDocuments] = useState<File[]>([]);

  // Summary (array of strings)
  const [summaryItems, setSummaryItems] = useState<string[]>([]);
  const [summaryInput, setSummaryInput] = useState("");

  // MP3 uploads (uploaded to API, stored as URLs for Related_Documents)
  interface UploadedMp3 {
    id?: number;
    url: string;
    name: string;
    path?: string;
  }
  const [uploadedMp3s, setUploadedMp3s] = useState<UploadedMp3[]>([]);
  const [uploadingMp3, setUploadingMp3] = useState(false);
  const mp3InputRef = useRef<HTMLInputElement | null>(null);

  const handleMp3Upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingMp3(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const newUploads: UploadedMp3[] = [];

      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);

        const resp = await fetch(
          "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/upload_mp3_file",
          {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: fd,
          }
        );

        if (resp.ok) {
          const json = await resp.json().catch(() => ({} as Record<string, unknown>));
          // Try to extract url/id/path from response - adapt based on actual API response shape
          const urlCandidate =
            (json as { url?: string }).url ||
            (json as { file?: { url?: string } }).file?.url ||
            (json as { mp3?: { url?: string } }).mp3?.url ||
            (json as { path?: string }).path ||
            "";
          const idCandidate =
            (json as { id?: number }).id ||
            (json as { file?: { id?: number } }).file?.id ||
            (json as { mp3?: { id?: number } }).mp3?.id;
          const pathCandidate =
            (json as { path?: string }).path ||
            (json as { file?: { path?: string } }).file?.path ||
            (json as { mp3?: { path?: string } }).mp3?.path ||
            "";

          if (urlCandidate || pathCandidate) {
            newUploads.push({
              id: idCandidate,
              url: urlCandidate || pathCandidate,
              name: file.name,
              path: pathCandidate,
            });
          }
        } else {
          console.error(`Failed to upload ${file.name}: ${resp.status}`);
        }
      }

      setUploadedMp3s((prev) => [...prev, ...newUploads]);
    } catch (err) {
      console.error("Error uploading MP3 file(s):", err);
      alert("Error uploading MP3 file(s)");
    } finally {
      setUploadingMp3(false);
      if (mp3InputRef.current) {
        mp3InputRef.current.value = "";
      }
    }
  };

  const removeMp3 = (index: number) => {
    setUploadedMp3s((prev) => prev.filter((_, i) => i !== index));
  };

  // Content articles for "Edit Content" dropdown
  // Note: API returns arrays that can be either just IDs or objects
  interface ContentArticle {
    id: number;
    Headline?: string | null;
    Strapline?: string | null;
    Body?: string | null;
    Content_Type?: string | null;
    Visibility?: string | null;
    summary?: string[] | null;
    // Can be array of IDs or array of objects
    Company_of_Focus?: Array<number | { id: number; company_name?: string; name?: string }> | null;
    companies_mentioned?: Array<number | { id: number; company_name?: string; name?: string }> | null;
    // Sectors come as objects with sector_name (no id)
    sectors?: Array<{ id?: number; sector_name?: string }> | null;
    // Can be array of IDs or array of objects
    Related_Corporate_Event?: Array<number | { id: number; [key: string]: unknown }> | null;
    Related_Documents?: Array<{ id?: number; url?: string; path?: string; name?: string; access?: string; type?: string; size?: number; mime?: string }> | string[] | null;
    Body_Design?: string | null;
    Publication_Date?: unknown;
    created_at?: number;
  }
  const [allContentArticles, setAllContentArticles] = useState<ContentArticle[]>([]);
  const [contentArticlesLoading, setContentArticlesLoading] = useState(false);
  const [selectedEditContentId, setSelectedEditContentId] = useState<number | "">("");
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<string>("Admin");

  function extractInnerContent(fullHtml: string): string {
    // If it's a full HTML document, extract the inner content
    // Look for the content inside the container table/td
    try {
      // Create a temporary DOM parser to extract content safely
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullHtml, "text/html");

      // Try to find the container table
      const container = doc.querySelector(
        'table.container, .container table, table[class*="container"]'
      );
      if (container) {
        const td = container.querySelector("td");
        if (td) {
          return td.innerHTML.trim();
        }
      }

      // Try to find any div inside body
      const bodyDiv = doc.body?.querySelector("div");
      if (bodyDiv) {
        return bodyDiv.innerHTML.trim();
      }

      // If no wrapper found, return body content or as-is
      return doc.body?.innerHTML.trim() || fullHtml;
    } catch {
      // Fallback: regex extraction
      const containerMatch = fullHtml.match(
        /<table[^>]*class="container"[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/table>/i
      );
      if (containerMatch && containerMatch[1]) {
        return containerMatch[1].trim();
      }
      const divMatch = fullHtml.match(
        /<body[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/body>/i
      );
      if (divMatch && divMatch[1]) {
        return divMatch[1].trim();
      }
      return fullHtml;
    }
  }

  const UNLAYER_DESIGN_RE = /<!--\s*UNLAYER_DESIGN:([A-Za-z0-9+/=]+)\s*-->/;

  function stripUnlayerDesignComment(bodyHtml: string): string {
    return bodyHtml.replace(UNLAYER_DESIGN_RE, "").trim();
  }

  // Fetch content types (same source as Insights & Analysis)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const values = await locationsService.getContentTypesForArticles();
        if (!cancelled) setContentTypes(values);
      } catch {
        if (!cancelled) setContentTypes([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch sectors list (primary + secondary combined)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const prim = await locationsService.getPrimarySectors();
        const allPrimaryIds = prim.map((p) => p.id);
        const sec =
          allPrimaryIds.length > 0
            ? await locationsService.getSecondarySectors(allPrimaryIds)
            : [];
        const combined = [...prim, ...sec];
        const unique = combined.filter(
          (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
        );
        if (!cancelled) setAllSectors(unique);
      } catch {
        if (!cancelled) setAllSectors([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchCompaniesByName(query: string, perPage: number) {
    const q = query.trim();
    if (!q) return [];
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();
      params.append("Offset", "1");
    params.append("Per_page", String(perPage));
      params.append("Min_linkedin_members", "0");
      params.append("Max_linkedin_members", "0");
      params.append("Horizontals_ids", "");
    params.append("query", q);
      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
    if (!resp.ok) return [];
      const data = await resp.json().catch(() => null);
      const items: Array<{ id: number; name: string }> =
        (data?.result1?.items as Array<{ id: number; name: string }>) ||
        (data?.companies?.items as Array<{ id: number; name: string }>) ||
        (data?.items as Array<{ id: number; name: string }>) ||
        [];
    return (Array.isArray(items) ? items : [])
          .map((c) => ({ id: Number(c.id), name: String(c.name || "") }))
      .filter((c) => c.id && c.name);
  }

  const searchCompanyOfFocus = async () => {
    if (!cofQuery.trim()) return;
    try {
      setCofLoading(true);
      const results = await fetchCompaniesByName(cofQuery, 25);
      setCofResults(results);
    } catch {
      setCofResults([]);
    } finally {
      setCofLoading(false);
    }
  };

  const searchCompaniesMentioned = async () => {
    if (!mentionedQuery.trim()) return;
    try {
      setMentionedLoading(true);
      const results = await fetchCompaniesByName(mentionedQuery, 25);
      setMentionedResults(results);
    } catch {
      setMentionedResults([]);
    } finally {
      setMentionedLoading(false);
    }
  };

  const searchCorporateEvents = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setCorporateEventsResults([]);
      return;
    }
    try {
      setCorporateEventsLoading(true);
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();
      // Corporate Events API expects 0-based page indexing
      params.append("Page", "0");
      params.append("Per_page", "25");
      params.append("search_query", q);
      const resp = await fetch(`/api/corporate-events?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        setCorporateEventsResults([]);
        return;
      }
      const json = (await resp.json().catch(() => null)) as
        | { items?: Array<Record<string, unknown>>; result1?: { items?: Array<Record<string, unknown>> } }
        | null;
      const items =
        (Array.isArray(json?.items) ? json!.items! : []) ||
        (Array.isArray(json?.result1?.items) ? json!.result1!.items! : []) ||
        [];

      const mapped = items
        .map((it) => {
          const idRaw = (it.id ?? it.corporate_event_id ?? it.corporate_events_id) as
            | number
            | string
            | undefined;
          const idNum =
            typeof idRaw === "number"
              ? idRaw
              : typeof idRaw === "string"
              ? parseInt(idRaw, 10)
              : NaN;
          if (!Number.isFinite(idNum) || idNum <= 0) return null;

          const dealType = String(it.deal_type ?? it.Deal_type ?? "").trim();
          const description = String(it.description ?? "").trim();

          // Requirement: show deal type + description in dropdown
          const label =
            [dealType || undefined, description || undefined].filter(Boolean).join(" • ") ||
            `Corporate Event #${idNum}`;

          return { id: idNum, label } satisfies SimpleCorporateEvent;
        })
        .filter((x): x is SimpleCorporateEvent => Boolean(x));

      setCorporateEventsResults(mapped);
    } catch {
      setCorporateEventsResults([]);
    } finally {
      setCorporateEventsLoading(false);
    }
  };

  function formatBytes(n: number) {
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    const v = n / Math.pow(1024, i);
    return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  }

  // Fetch all content articles for "Edit Content" dropdown
  useEffect(() => {
    let cancelled = false;
    async function loadContentArticles() {
      try {
        setContentArticlesLoading(true);
        const token = localStorage.getItem("asymmetrix_auth_token");
        const res = await fetch(
          "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setAllContentArticles(data as ContentArticle[]);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setContentArticlesLoading(false);
      }
    }
    loadContentArticles();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handler to pre-load content article fields into form
  const handleEditContentSelect = async (contentId: number) => {
    const article = allContentArticles.find((c) => c.id === contentId);
    if (!article) return;

    // Set editing mode
    setEditingContentId(contentId);

    // Pre-load headline and strapline
    setHeadline(article.Headline || "");
    setStrapline(article.Strapline || "");

    // Pre-load content type
    if (article.Content_Type) {
      setContentType(article.Content_Type);
    }

    // Pre-load visibility
    if (article.Visibility) {
      setVisibility(article.Visibility);
    }

    // Pre-load summary array
    if (Array.isArray(article.summary)) {
      setSummaryItems(article.summary);
    } else {
      setSummaryItems([]);
    }

    // Pre-load Company of Focus
    // API can return either array of IDs [4453] or array of objects [{id: 4453, company_name: "..."}]
    if (Array.isArray(article.Company_of_Focus)) {
      const companies: SimpleCompany[] = article.Company_of_Focus.map((c) => {
        if (typeof c === "number") {
          // Just an ID
          return { id: c, name: `Company #${c}` };
        } else {
          // Object with id and possibly name
          return {
            id: c.id,
            name: c.company_name || c.name || `Company #${c.id}`,
          };
        }
      });
      setCompanyOfFocus(companies);
      setCofResults(companies); // Also add to search results so they show up
    } else {
      setCompanyOfFocus([]);
    }

    // Pre-load companies mentioned
    // API can return either array of IDs or array of objects
    if (Array.isArray(article.companies_mentioned)) {
      const companies: SimpleCompany[] = article.companies_mentioned.map((c) => {
        if (typeof c === "number") {
          // Just an ID
          return { id: c, name: `Company #${c}` };
        } else {
          // Object with id and possibly name
          return {
            id: c.id,
            name: c.company_name || c.name || `Company #${c.id}`,
          };
        }
      });
      setCompaniesMentioned(companies);
      setMentionedResults(companies); // Also add to search results
    } else {
      setCompaniesMentioned([]);
    }

    // Pre-load sectors
    // API returns objects with sector_name but no id, need to match with allSectors
    if (Array.isArray(article.sectors)) {
      const sectorIds: number[] = [];
      for (const s of article.sectors) {
        if (s.id) {
          // Has id directly
          sectorIds.push(s.id);
        } else if (s.sector_name) {
          // Find matching sector by name
          const matchingSector = allSectors.find(
            (sec) => sec.sector_name === s.sector_name
          );
          if (matchingSector) {
            sectorIds.push(matchingSector.id);
          }
        }
      }
      setSelectedSectorIds(sectorIds);
    } else {
      setSelectedSectorIds([]);
    }

    // Pre-load related corporate events
    // API can return either array of IDs [2807, 877] or array of objects
    if (Array.isArray(article.Related_Corporate_Event)) {
      const events: SimpleCorporateEvent[] = article.Related_Corporate_Event.map((e) => {
        if (typeof e === "number") {
          // Just an ID
          return { id: e, label: `Event #${e}` };
        } else {
          // Object with id and possibly label/description
          return {
            id: e.id,
            label: String(e.label || e.description || `Event #${e.id}`).slice(0, 80),
          };
        }
      });
      setSelectedCorporateEvents(events);
      setCorporateEventsResults(events); // Also add to search results
    } else {
      setSelectedCorporateEvents([]);
    }

    // Pre-load Related_Documents as uploaded MP3s (if they're URLs)
    if (Array.isArray(article.Related_Documents)) {
      const mp3s: UploadedMp3[] = [];
      for (const doc of article.Related_Documents) {
        if (typeof doc === "string") {
          // It's a URL string
          if (doc) {
            mp3s.push({ url: doc, name: doc.split("/").pop() || "Document", path: doc });
          }
        } else if (doc && typeof doc === "object") {
          // It's an object with url/path/name
          const url = doc.url || doc.path || "";
          if (url) {
            mp3s.push({
              id: doc.id,
              url: url,
              name: doc.name || url.split("/").pop() || "Document",
              path: doc.path || "",
            });
          }
        }
      }
      setUploadedMp3s(mp3s);
    } else {
      setUploadedMp3s([]);
    }

    // Clear local file uploads when editing existing content
    setRelatedDocuments([]);

    // Pre-load editor: take existing HTML (strip legacy Unlayer marker if present)
    const rawBody = String(article.Body || "");
    const cleaned = rawBody ? stripUnlayerDesignComment(rawBody) : "";
    const nextBodyHtml = cleaned ? extractInnerContent(cleaned) : "";
    setBodyHtml(nextBodyHtml || "<p></p>");
    setHtml("");
  };

  const handleExport = async () => {
    try {
      const sanitized = sanitizeHtml(bodyHtml);
      const branded = buildBrandedEmailHtml({
        bodyHtml: `<div>${sanitized}</div>`,
        subject: contentType,
      });
      setHtml(branded);
    } catch (err) {
      console.error("Failed to export HTML:", err);
      alert("Failed to export HTML. Try again.");
    }
  };

  const handleCopy = async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
    } catch {}
  };

  const submitNewContent = async () => {
    if (sending) return;
    const token = localStorage.getItem("asymmetrix_auth_token");
    if (!token) {
      alert("Authentication required");
      return;
    }

    const Headline = headline.trim();
    const Strapline = strapline.trim();
    const Content_Type = contentType.trim();
    if (!Headline) {
      alert("Headline is required");
      return;
    }
    if (!Content_Type) {
      alert("Content Type is required");
      return;
    }
    const sanitized = sanitizeHtml(bodyHtml);
    const Body = `<div>${sanitized}</div>`;

    const companyOfFocusIds = companyOfFocus.map((c) => c.id);
    const companiesMentionedIds = companiesMentioned.map((c) => c.id);
    const relatedCorporateEventIds = selectedCorporateEvents.map((e) => e.id);

    type ArrayMode = "bracketed" | "plain";
    const buildFormData = (mode: ArrayMode) => {
      const fd = new FormData();

      // Scalars
      // Xano: this should resolve to null (Publication_Date is always null for this flow)
      fd.append("Publication_Date", "");
      fd.append("Headline", Headline);
      fd.append("Strapline", Strapline);
      fd.append("Content_Type", Content_Type);
      fd.append("Body", Body);
      fd.append("Visibility", visibility);

      // Arrays of IDs (send as repeated [] keys)
      const k = (base: string) => (mode === "bracketed" ? `${base}[]` : base);
      for (const id of companyOfFocusIds)
        fd.append(k("Company_of_Focus"), String(id));
      for (const id of selectedSectorIds) fd.append(k("sectors"), String(id));
      for (const id of companiesMentionedIds)
        fd.append(k("companies_mentioned"), String(id));
      for (const id of relatedCorporateEventIds)
        fd.append(k("Related_Corporate_Event"), String(id));

      // Attachments: repeated keys for local files
      const fileKey = mode === "bracketed" ? "files[]" : "files";
      for (const file of relatedDocuments) {
        fd.append(fileKey, file, file.name);
      }

      // MP3 files (already uploaded, include URLs/paths in Related_Documents array)
      const mp3Key = mode === "bracketed" ? "Related_Documents[]" : "Related_Documents";
      for (const mp3 of uploadedMp3s) {
        // Send the URL or path of the uploaded MP3 file
        fd.append(mp3Key, mp3.url || mp3.path || "");
      }

      // Summary array of strings
      const summaryKey = mode === "bracketed" ? "summary[]" : "summary";
      for (const item of summaryItems) {
        fd.append(summaryKey, item);
      }

      return fd;
    };

    setSending(true);
    try {
      // Keep UI "Generated HTML" consistent with export button
      setHtml(
        buildBrandedEmailHtml({
          bodyHtml: `<div>${sanitized}</div>`,
          subject: Content_Type,
        })
      );

      const isEditing = editingContentId !== null;
      const apiUrl = isEditing
        ? `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content/${editingContentId}`
        : "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/new_content";

      const tryOnce = async (mode: ArrayMode) => {
        const fd = buildFormData(mode);
        const res = await fetch(apiUrl, {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // IMPORTANT: do NOT set Content-Type for multipart/form-data
          },
          body: fd,
        });
        const text = await res.text().catch(() => "");
        return { res, text };
      };

      // Xano often needs bracketed keys to consistently treat single values as arrays.
      // Try bracketed first, then fall back to plain repeated keys.
      let { res, text } = await tryOnce("bracketed");
      if (!res.ok) {
        const retry = await tryOnce("plain");
        res = retry.res;
        text = retry.text;
      }

      if (!res.ok) {
        throw new Error(`Failed to ${isEditing ? "update" : "create"} content: ${res.status} ${text}`);
      }

      alert(isEditing ? "Content updated successfully" : "Content created successfully");
      
      // Refresh content articles list after successful save
      if (isEditing) {
        const refreshRes = await fetch(
          "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const refreshData = await refreshRes.json();
        if (Array.isArray(refreshData)) {
          setAllContentArticles(refreshData as ContentArticle[]);
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create content");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Content Template Builder</h2>

      <div className="flex gap-3 items-center mb-3">
        <label className="text-sm font-medium">Single recipient</label>
        <input
          type="checkbox"
          checked={singleRecipient}
          onChange={(e) => setSingleRecipient(e.target.checked)}
        />
      </div>
      {singleRecipient && (
      <div className="mb-3">
          <label className="block mb-1 text-sm font-medium">
            Recipient email
          </label>
        <input
            type="email"
          className="p-2 w-full border"
            placeholder="name@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
        />
      </div>
      )}

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Edit Content</label>
        <SearchableSelect
          options={allContentArticles.map((c) => ({
            value: c.id,
            label: c.Headline ? String(c.Headline) : `Content #${c.id}`,
          }))}
          value={selectedEditContentId}
          onChange={(value) => {
            if (value === "" || value === null || value === undefined) {
              setSelectedEditContentId("");
              setEditingContentId(null);
              // Reset form to empty state when deselecting
              setHeadline("");
              setStrapline("");
              setContentType("");
              setVisibility("Admin");
              setSummaryItems([]);
              setCompanyOfFocus([]);
              setCompaniesMentioned([]);
              setSelectedSectorIds([]);
              setSelectedCorporateEvents([]);
              setUploadedMp3s([]);
              setRelatedDocuments([]);
              setBodyHtml("<p></p>");
              setHtml("");
              return;
            }
            const idNum = typeof value === "number" ? value : Number(value);
            if (!isNaN(idNum)) {
              setSelectedEditContentId(idNum);
              void handleEditContentSelect(idNum);
            }
          }}
          placeholder={
            contentArticlesLoading
              ? "Loading content..."
              : "Search and select content to edit"
          }
          disabled={contentArticlesLoading}
          style={{ width: "100%" }}
        />
        {editingContentId && (
          <div className="mt-1 text-xs text-blue-600">
            Editing content ID: {editingContentId}
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Content Type</label>
        <select
          className="p-2 w-full border"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
        >
          <option value="">Choose content type</option>
          {contentTypes.map((ct) => (
            <option key={ct} value={ct}>
              {ct}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Visibility</label>
        <select
          className="p-2 w-full border"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="Admin">Admin</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Private">Private</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block mb-1 text-sm font-medium">
            Company of Focus (select one or more)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded"
              placeholder="Search companies by name"
              value={cofQuery}
              onChange={(e) => setCofQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCompanyOfFocus()}
            />
            <button
              className="px-3 py-2 text-white bg-gray-800 rounded disabled:opacity-50"
              onClick={searchCompanyOfFocus}
              disabled={cofLoading}
            >
              {cofLoading ? "Searching…" : "Search"}
            </button>
          </div>
          <SearchableSelect
            options={cofResults.map((c) => ({ value: c.id, label: c.name }))}
            value={""}
            onChange={(value) => {
              if (typeof value === "number") {
                const found = cofResults.find((c) => c.id === value);
                if (found && !companyOfFocus.find((c) => c.id === found.id)) {
                  setCompanyOfFocus([...companyOfFocus, found]);
                }
              }
            }}
            placeholder={
              cofLoading
                ? "Loading companies..."
                : cofResults.length === 0
                ? "Search above to load companies"
                : "Select company to add"
            }
            disabled={cofLoading || cofResults.length === 0}
            style={{ width: "100%" }}
          />
          {companyOfFocus.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {companyOfFocus.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                >
                  {c.name}
                  <button
                    onClick={() =>
                      setCompanyOfFocus(
                        companyOfFocus.filter((x) => x.id !== c.id)
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

        <div>
          <label className="block mb-1 text-sm font-medium">
            Companies Mentioned (select one or more)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded"
              placeholder="Search companies by name"
              value={mentionedQuery}
              onChange={(e) => setMentionedQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCompaniesMentioned()}
            />
            <button
              className="px-3 py-2 text-white bg-gray-800 rounded disabled:opacity-50"
              onClick={searchCompaniesMentioned}
              disabled={mentionedLoading}
            >
              {mentionedLoading ? "Searching…" : "Search"}
            </button>
          </div>
          <SearchableSelect
            options={mentionedResults.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={""}
            onChange={(value) => {
              if (typeof value === "number") {
                const found = mentionedResults.find((c) => c.id === value);
                if (
                  found &&
                  !companiesMentioned.find((c) => c.id === found.id)
                ) {
                  setCompaniesMentioned([...companiesMentioned, found]);
                }
              }
            }}
            placeholder={
              mentionedLoading
                ? "Loading companies..."
                : mentionedResults.length === 0
                ? "Search above to load companies"
                : "Select company to add"
            }
            disabled={mentionedLoading || mentionedResults.length === 0}
            style={{ width: "100%" }}
          />
          {companiesMentioned.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {companiesMentioned.map((c) => (
                  <span
                  key={c.id}
                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-purple-700 bg-purple-50 rounded"
                  >
                  {c.name}
                    <button
                      onClick={() =>
                      setCompaniesMentioned(
                        companiesMentioned.filter((x) => x.id !== c.id)
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

      <div className="mt-4">
          <label className="block mb-1 text-sm font-medium">
          Sectors (select one or more)
          </label>
          <SearchableSelect
          options={allSectors.map((s) => ({
              value: s.id,
              label: s.sector_name,
            }))}
            value={""}
            onChange={(value) => {
            if (typeof value === "number" && !selectedSectorIds.includes(value)) {
              setSelectedSectorIds([...selectedSectorIds, value]);
            }
          }}
          placeholder={allSectors.length === 0 ? "Loading sectors..." : "Select sectors"}
          disabled={allSectors.length === 0}
            style={{ width: "100%" }}
          />
        {selectedSectorIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
            {selectedSectorIds.map((id) => {
              const s = allSectors.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                  >
                    {s?.sector_name || id}
                    <button
                      onClick={() =>
                      setSelectedSectorIds(selectedSectorIds.filter((x) => x !== id))
                      }
                      className="font-bold"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
      </div>

      <div className="mt-4">
        <label className="block mb-1 text-sm font-medium">
          Related Corporate Events (select one or more)
        </label>
        <SearchableSelect
          options={corporateEventsResults.map((ev) => ({
            value: ev.id,
            label: ev.label,
          }))}
          value={""}
          onChange={(value) => {
            if (typeof value === "number") {
              const found = corporateEventsResults.find((e) => e.id === value);
              if (
                found &&
                !selectedCorporateEvents.find((e) => e.id === found.id)
              ) {
                setSelectedCorporateEvents([...selectedCorporateEvents, found]);
              }
            }
          }}
          onSearchTermChange={(term) => {
            setCorporateEventsQuery(term);
            if (corporateEventsDebounceRef.current) {
              window.clearTimeout(corporateEventsDebounceRef.current);
            }
            corporateEventsDebounceRef.current = window.setTimeout(() => {
              void searchCorporateEvents(term);
            }, 250);
          }}
          placeholder={
            corporateEventsLoading
              ? "Searching corporate events..."
              : "Search corporate events (type to search)"
          }
          loading={corporateEventsLoading}
          loadingText="Searching…"
          noOptionsText={
            corporateEventsQuery.trim()
              ? "No corporate events found"
              : "Start typing to search corporate events"
          }
          disabled={false}
          style={{ width: "100%" }}
        />
        {selectedCorporateEvents.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedCorporateEvents.map((ev) => (
              <span
                key={ev.id}
                className="inline-flex gap-1 items-center px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded"
              >
                {ev.label}
                <button
                  onClick={() =>
                    setSelectedCorporateEvents(
                      selectedCorporateEvents.filter((x) => x.id !== ev.id)
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

      <div className="mt-4">
        <label className="block mb-1 text-sm font-medium">
          Related Documents (upload one or more)
        </label>
        <input
          type="file"
          multiple
          className="block w-full p-2 border rounded bg-white"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setRelatedDocuments(files);
          }}
        />
        {relatedDocuments.length > 0 && (
          <div className="mt-2 space-y-2">
            {relatedDocuments.map((f, idx) => (
              <div
                key={`${f.name}-${f.size}-${idx}`}
                className="flex justify-between items-center p-2 rounded border bg-white"
              >
                <div className="text-sm">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatBytes(f.size)}
                  </div>
                </div>
                <button
                  className="px-3 py-1 text-sm text-white bg-red-600 rounded"
                  onClick={() =>
                    setRelatedDocuments(
                      relatedDocuments.filter((_, i) => i !== idx)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="block mb-1 text-sm font-medium">
          MP3 Upload (upload one or more)
        </label>
        <div className="flex gap-2 items-center">
          <input
            ref={mp3InputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            multiple
            className="block flex-1 p-2 border rounded bg-white"
            onChange={(e) => handleMp3Upload(e.target.files)}
            disabled={uploadingMp3}
          />
          {uploadingMp3 && (
            <span className="text-sm text-gray-500">Uploading...</span>
          )}
        </div>
        {uploadedMp3s.length > 0 && (
          <div className="mt-2 space-y-2">
            {uploadedMp3s.map((mp3, idx) => (
              <div
                key={`${mp3.name}-${mp3.url}-${idx}`}
                className="flex justify-between items-center p-2 rounded border bg-white"
              >
                <div className="text-sm">
                  <div className="font-medium">{mp3.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {mp3.url || mp3.path}
                  </div>
                </div>
                <button
                  className="px-3 py-1 text-sm text-white bg-red-600 rounded"
                  onClick={() => removeMp3(idx)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="block mb-1 text-sm font-medium">Summary</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded"
            placeholder="Enter summary item"
            value={summaryInput}
            onChange={(e) => setSummaryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && summaryInput.trim()) {
                e.preventDefault();
                setSummaryItems([...summaryItems, summaryInput.trim()]);
                setSummaryInput("");
              }
            }}
          />
          <button
            type="button"
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={() => {
              if (summaryInput.trim()) {
                setSummaryItems([...summaryItems, summaryInput.trim()]);
                setSummaryInput("");
              }
            }}
            disabled={!summaryInput.trim()}
          >
            Add
          </button>
        </div>
        {summaryItems.length > 0 && (
          <div className="mt-2 space-y-2">
            {summaryItems.map((item, idx) => (
              <div
                key={`summary-${idx}`}
                className="flex justify-between items-center p-2 rounded border bg-white"
              >
                <div className="text-sm flex-1">{item}</div>
                <button
                  className="px-3 py-1 text-sm text-white bg-red-600 rounded ml-2"
                  onClick={() =>
                    setSummaryItems(summaryItems.filter((_, i) => i !== idx))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4 md:grid-cols-2">
        <div>
          <label className="block mb-1 text-sm font-medium">Headline</label>
          <input
            type="text"
            className="p-2 w-full border rounded"
            placeholder="Enter headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Strapline</label>
          <input
            type="text"
            className="p-2 w-full border rounded"
            placeholder="Enter strapline"
            value={strapline}
            onChange={(e) => setStrapline(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block mb-1 text-sm font-medium">Body</label>
        <TiptapSimpleEditor
          valueHtml={bodyHtml}
          onChangeHtml={setBodyHtml}
          onUploadImage={uploadImageToXano}
          placeholder="Write the article body..."
          minHeightPx={500}
        />
        <p className="mt-1 text-xs text-gray-500">
          Images are uploaded to Xano and inserted automatically.
        </p>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          className="px-4 py-2 text-white bg-purple-600 rounded"
          onClick={handleExport}
        >
          Export HTML
        </button>
        <button
          className="px-4 py-2 text-white bg-gray-800 rounded disabled:opacity-50"
          onClick={handleCopy}
          disabled={!html}
        >
          Copy HTML
        </button>
        <button
          className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
          onClick={submitNewContent}
          disabled={sending}
        >
          {sending ? "Submitting…" : editingContentId ? "Update Content" : "Create Content"}
        </button>
        {editingContentId && (
          <button
            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600"
            onClick={() => {
              setSelectedEditContentId("");
              setEditingContentId(null);
              // Reset form to empty state
              setHeadline("");
              setStrapline("");
              setContentType("");
              setVisibility("Admin");
              setSummaryItems([]);
              setCompanyOfFocus([]);
              setCompaniesMentioned([]);
              setSelectedSectorIds([]);
              setSelectedCorporateEvents([]);
              setUploadedMp3s([]);
              setRelatedDocuments([]);
              setBodyHtml("<p></p>");
              setHtml("");
            }}
          >
            Clear / New Content
          </button>
        )}
      </div>

      {html && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">Generated HTML</h3>
          <pre className="overflow-x-auto p-2 text-sm bg-gray-100 rounded">
            {html}
          </pre>
        </div>
      )}
    </div>
  );
}

function SectorsTab() {
  // Company selection
  interface SimpleCompany {
    id: number;
    name: string;
  }
  // Single-tag states
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<SimpleCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SimpleCompany | null>(
    null
  );
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Sectors selection (all sectors, not just primary/secondary split)
  const [allSectors, setAllSectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);
  const [selectedSectorIds, setSelectedSectorIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Bulk tagging states
  const [bulkSelectedSectorId, setBulkSelectedSectorId] = useState<number | "">(
    ""
  );
  const [bulkCompanyQuery, setBulkCompanyQuery] = useState("");
  const [bulkCompanyResults, setBulkCompanyResults] = useState<SimpleCompany[]>(
    []
  );
  const [bulkSelectedCompanies, setBulkSelectedCompanies] = useState<
    SimpleCompany[]
  >([]);
  const [bulkLoadingCompanies, setBulkLoadingCompanies] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    done: number;
    success: number;
    failed: number;
  } | null>(null);

  // Manage by sector: select sector → view companies → untag
  const [selectedSectorForView, setSelectedSectorForView] = useState<
    number | ""
  >("");
  const [sectorCompanies, setSectorCompanies] = useState<SimpleCompany[]>([]);
  const [sectorCompaniesLoading, setSectorCompaniesLoading] = useState(false);
  const [sectorCompaniesPage, setSectorCompaniesPage] = useState(1);
  const [sectorCompaniesHasMore, setSectorCompaniesHasMore] = useState(false);
  const [sectorActionBusyId, setSectorActionBusyId] = useState<number | null>(
    null
  );

  // Fetch all sectors (combining primary and their secondary sectors)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const prim = await locationsService.getPrimarySectors();
        if (!cancelled) {
          // Fetch secondary sectors for all primary sectors
          const allPrimaryIds = prim.map((p) => p.id);
          const sec = await locationsService.getSecondarySectors(allPrimaryIds);
          // Combine and deduplicate by id
          const combined = [...prim, ...sec];
          const unique = combined.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
          );
          setAllSectors(unique);
        }
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Company search
  const searchCompanies = async () => {
    if (!companyQuery.trim()) return;
    try {
      setLoadingCompanies(true);
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();
      params.append("Offset", "1");
      params.append("Per_page", "25");
      params.append("Min_linkedin_members", "0");
      params.append("Max_linkedin_members", "0");
      params.append("Horizontals_ids", "");
      params.append("query", companyQuery.trim());
      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!resp.ok) {
        setCompanyResults([]);
        return;
      }
      const data = await resp.json().catch(() => null);
      const items: Array<{ id: number; name: string }> =
        (data?.result1?.items as Array<{ id: number; name: string }>) ||
        (data?.companies?.items as Array<{ id: number; name: string }>) ||
        (data?.items as Array<{ id: number; name: string }>) ||
        [];
      setCompanyResults(
        (Array.isArray(items) ? items : [])
          .map((c) => ({ id: Number(c.id), name: String(c.name || "") }))
          .filter((c) => c.id && c.name)
      );
    } catch {
      setCompanyResults([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Bulk company search
  const bulkSearchCompanies = async () => {
    if (!bulkCompanyQuery.trim()) return;
    try {
      setBulkLoadingCompanies(true);
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();
      params.append("Offset", "1");
      params.append("Per_page", "50");
      params.append("Min_linkedin_members", "0");
      params.append("Max_linkedin_members", "0");
      params.append("Horizontals_ids", "");
      params.append("query", bulkCompanyQuery.trim());
      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!resp.ok) {
        setBulkCompanyResults([]);
        return;
      }
      const data = await resp.json().catch(() => null);
      const items: Array<{ id: number; name: string }> =
        (data?.result1?.items as Array<{ id: number; name: string }>) ||
        (data?.companies?.items as Array<{ id: number; name: string }>) ||
        (data?.items as Array<{ id: number; name: string }>) ||
        [];
      setBulkCompanyResults(
        (Array.isArray(items) ? items : [])
          .map((c) => ({ id: Number(c.id), name: String(c.name || "") }))
          .filter((c) => c.id && c.name)
      );
    } catch {
      setBulkCompanyResults([]);
    } finally {
      setBulkLoadingCompanies(false);
    }
  };

  // Submit to API
  const handleSubmit = async () => {
    if (!selectedCompany || selectedSectorIds.length === 0 || submitting)
      return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("asymmetrix_auth_token");
      const payload = {
        new_company_id: selectedCompany.id,
        sectors_id: selectedSectorIds,
      };

      const resp = await fetch(
        "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/company_with_sectors",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        const txt = await resp.text();
        alert(`Failed to tag company: ${resp.status} ${txt}`);
        return;
      }

      alert("Company successfully tagged to sectors!");
      // Reset selections
      setSelectedCompany(null);
      setSelectedSectorIds([]);
      setCompanyResults([]);
      setCompanyQuery("");
    } catch {
      alert("Network error while tagging company");
    } finally {
      setSubmitting(false);
    }
  };

  // Load companies for a given sector (paginated)
  const loadSectorCompanies = async (
    sectorId: number,
    page: number = 1,
    append: boolean = false
  ) => {
    try {
      setSectorCompaniesLoading(true);
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();
      params.append("Offset", String(Math.max(1, page)));
      params.append("Per_page", "50");
      params.append("Sector_id", String(sectorId));
      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Get_Sector_s_new_companies?${params.toString()}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!resp.ok) {
        if (!append) setSectorCompanies([]);
        setSectorCompaniesHasMore(false);
        return;
      }
      const data = await resp.json().catch(() => null);
      // Try common shapes for items and pagination
      const items: Array<{ id: number; name?: string; Company_name?: string }> =
        (data?.result1?.items as Array<{
          id: number;
          name?: string;
          Company_name?: string;
        }>) ||
        (data?.companies?.items as Array<{
          id: number;
          name?: string;
          Company_name?: string;
        }>) ||
        (data?.items as Array<{
          id: number;
          name?: string;
          Company_name?: string;
        }>) ||
        [];
      const mapped = (Array.isArray(items) ? items : [])
        .map((c) => ({
          id: Number(c.id),
          name: String(c.name || c.Company_name || ""),
        }))
        .filter((c) => c.id && c.name);
      setSectorCompanies((prev) => (append ? [...prev, ...mapped] : mapped));
      // Heuristic: has more if we received a full page
      setSectorCompaniesHasMore(mapped.length >= 50);
      if (!append) setSectorCompaniesPage(1);
    } catch {
      if (!append) setSectorCompanies([]);
      setSectorCompaniesHasMore(false);
    } finally {
      setSectorCompaniesLoading(false);
    }
  };

  const handleSelectSectorForView = (value: unknown) => {
    if (typeof value === "number") {
      setSelectedSectorForView(value);
      loadSectorCompanies(value, 1, false);
    }
  };

  const loadMoreSectorCompanies = async () => {
    if (typeof selectedSectorForView !== "number") return;
    const nextPage = sectorCompaniesPage + 1;
    await loadSectorCompanies(selectedSectorForView, nextPage, true);
    setSectorCompaniesPage(nextPage);
  };

  // Helper to extract sector ids from company payload in various shapes
  const extractSectorIds = (input: unknown): number[] => {
    if (!input || typeof input !== "object") return [];
    const obj = input as Record<string, unknown>;
    const candidates = [
      obj.sectors_id,
      obj.Sectors_id,
      (obj as { Company?: Record<string, unknown> }).Company?.sectors_id,
      (obj as { Company?: Record<string, unknown> }).Company?.Sectors_id,
      (obj as { new_sectors_data?: unknown }).new_sectors_data,
      (obj as { Company?: { new_sectors_data?: unknown } }).Company
        ?.new_sectors_data,
    ];

    // Handle arrays of objects with id/sector_id
    for (const cand of candidates) {
      if (Array.isArray(cand)) {
        const ids = (cand as Array<unknown>)
          .map((v) => {
            if (typeof v === "number") return v;
            if (typeof v === "string") {
              const n = parseInt(v, 10);
              return Number.isFinite(n) ? n : undefined;
            }
            if (v && typeof v === "object") {
              const o = v as {
                id?: unknown;
                sector_id?: unknown;
                Sector_id?: unknown;
              };
              const val = (o.sector_id ?? o.Sector_id ?? o.id) as unknown;
              if (typeof val === "number") return val;
              if (typeof val === "string") {
                const n = parseInt(val, 10);
                return Number.isFinite(n) ? n : undefined;
              }
            }
            return undefined;
          })
          .filter((x): x is number => typeof x === "number");
        if (ids.length) return ids;
      }
      if (typeof cand === "string") {
        try {
          const parsed = JSON.parse(cand) as unknown;
          if (Array.isArray(parsed)) {
            const ids = parsed
              .map((v) => (typeof v === "number" ? v : undefined))
              .filter((x): x is number => typeof x === "number");
            if (ids.length) return ids;
          }
        } catch {}
      }
    }
    return [];
  };

  // Untag: remove selected sector from a company by overriding its sectors list
  const handleUntagFromSector = async (company: SimpleCompany) => {
    if (typeof selectedSectorForView !== "number") return;
    if (sectorActionBusyId) return;
    setSectorActionBusyId(company.id);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      // Fetch current company to get all sector ids
      const getUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${company.id}`;
      const getRes = await fetch(getUrl, {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (!getRes.ok) {
        const txt = await getRes.text().catch(() => "");
        alert(`Failed to load company sectors: ${getRes.status} ${txt}`);
        return;
      }
      const companyPayload = await getRes.json().catch(() => ({} as unknown));
      const currentSectorIds = extractSectorIds(companyPayload);
      const updatedSectorIds = currentSectorIds.filter(
        (id) => id !== selectedSectorForView
      );

      // PUT strict override
      const putUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/edit_company_sectors`;
      const putRes = await fetch(putUrl, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          sectors: updatedSectorIds,
          new_company_id: company.id,
        }),
      });
      if (!putRes.ok) {
        const txt = await putRes.text().catch(() => "");
        alert(`Failed to untag company: ${putRes.status} ${txt}`);
        return;
      }
      // Remove company from the visible list after successful untag
      setSectorCompanies((prev) => prev.filter((c) => c.id !== company.id));
    } catch {
      alert("Network error while untagging company");
    } finally {
      setSectorActionBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Tag Companies to Sectors</h2>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">Company</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 p-2 rounded border"
            placeholder="Search companies by name"
            value={companyQuery}
            onChange={(e) => setCompanyQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchCompanies()}
          />
          <button
            className="px-3 py-2 text-white bg-gray-800 rounded disabled:opacity-50"
            onClick={searchCompanies}
            disabled={loadingCompanies}
          >
            {loadingCompanies ? "Searching…" : "Search"}
          </button>
        </div>
        <SearchableSelect
          options={companyResults.map((c) => ({ value: c.id, label: c.name }))}
          value={selectedCompany ? selectedCompany.id : ""}
          onChange={(value) => {
            if (typeof value === "number") {
              const found = companyResults.find((c) => c.id === value);
              if (found) {
                setSelectedCompany(found);
              }
            }
          }}
          placeholder={
            loadingCompanies
              ? "Loading companies..."
              : companyResults.length === 0
              ? "Search above to load companies"
              : "Select a company"
          }
          disabled={loadingCompanies || companyResults.length === 0}
          style={{ width: "100%" }}
        />
        {selectedCompany && (
          <div className="mt-2">
            <span className="inline-flex gap-2 items-center px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded">
              {selectedCompany.name}
              <button
                onClick={() => setSelectedCompany(null)}
                className="font-bold"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">
          Sectors (select multiple)
        </label>
        <SearchableSelect
          options={allSectors.map((s) => ({
            value: s.id,
            label: s.sector_name,
          }))}
          value={""}
          onChange={(value) => {
            if (
              typeof value === "number" &&
              !selectedSectorIds.includes(value)
            ) {
              setSelectedSectorIds([...selectedSectorIds, value]);
            }
          }}
          placeholder={
            allSectors.length === 0
              ? "Loading sectors..."
              : "Select sectors to tag"
          }
          disabled={allSectors.length === 0}
          style={{ width: "100%" }}
        />
        {selectedSectorIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedSectorIds.map((id) => {
              const s = allSectors.find((x) => x.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex gap-2 items-center px-3 py-2 text-sm text-green-700 bg-green-50 rounded"
                >
                  {s?.sector_name || id}
                  <button
                    onClick={() =>
                      setSelectedSectorIds(
                        selectedSectorIds.filter((x) => x !== id)
                      )
                    }
                    className="font-bold"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 rounded border">
        <h3 className="mb-2 text-sm font-semibold">Preview</h3>
        <div className="text-sm text-gray-700">
          {selectedCompany && selectedSectorIds.length > 0 ? (
            <>
              <p className="mb-1">
                <strong>Company:</strong> {selectedCompany.name}
              </p>
              <p>
                <strong>Tagged Sectors:</strong>{" "}
                {selectedSectorIds
                  .map((id) => {
                    const s = allSectors.find((x) => x.id === id);
                    return s?.sector_name || id;
                  })
                  .join(", ")}
              </p>
            </>
          ) : (
            <p className="text-gray-500">
              Select a company and at least one sector to preview
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={
            !selectedCompany || selectedSectorIds.length === 0 || submitting
          }
          className="px-6 py-3 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      <div className="pt-8 mt-10 border-t">
        <h2 className="mb-4 text-xl font-semibold">
          Bulk Tag Companies to Sector
        </h2>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Sector</label>
          <SearchableSelect
            options={allSectors.map((s) => ({
              value: s.id,
              label: s.sector_name,
            }))}
            value={bulkSelectedSectorId}
            onChange={(value) => {
              if (typeof value === "number") {
                setBulkSelectedSectorId(value);
              }
            }}
            placeholder={
              allSectors.length === 0
                ? "Loading sectors..."
                : "Select sector to tag companies to"
            }
            disabled={allSectors.length === 0}
            style={{ width: "100%" }}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Companies</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 p-2 rounded border"
              placeholder="Search companies by name"
              value={bulkCompanyQuery}
              onChange={(e) => setBulkCompanyQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && bulkSearchCompanies()}
            />
            <button
              className="px-3 py-2 text-white bg-gray-800 rounded disabled:opacity-50"
              onClick={bulkSearchCompanies}
              disabled={bulkLoadingCompanies}
            >
              {bulkLoadingCompanies ? "Searching…" : "Search"}
            </button>
          </div>
          <SearchableSelect
            options={bulkCompanyResults.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={""}
            onChange={(value) => {
              if (typeof value === "number") {
                const found = bulkCompanyResults.find((c) => c.id === value);
                if (
                  found &&
                  !bulkSelectedCompanies.find((c) => c.id === found.id)
                ) {
                  setBulkSelectedCompanies([...bulkSelectedCompanies, found]);
                }
              }
            }}
            placeholder={
              bulkLoadingCompanies
                ? "Loading companies..."
                : bulkCompanyResults.length === 0
                ? "Search above to load companies"
                : "Select company to add"
            }
            disabled={bulkLoadingCompanies || bulkCompanyResults.length === 0}
            style={{ width: "100%" }}
          />
          {bulkSelectedCompanies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {bulkSelectedCompanies.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex gap-2 items-center px-3 py-2 text-sm text-purple-700 bg-purple-50 rounded"
                >
                  {c.name}
                  <button
                    onClick={() =>
                      setBulkSelectedCompanies(
                        bulkSelectedCompanies.filter((x) => x.id !== c.id)
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

        <div className="mt-4">
          <button
            className="px-6 py-3 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={async () => {
              if (
                typeof bulkSelectedSectorId !== "number" ||
                bulkSelectedCompanies.length === 0 ||
                bulkSubmitting
              ) {
                return;
              }
              setBulkSubmitting(true);
              setBulkProgress({
                total: bulkSelectedCompanies.length,
                done: 0,
                success: 0,
                failed: 0,
              });
              try {
                const token = localStorage.getItem("asymmetrix_auth_token");
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };
                // Process sequentially to avoid rate limits
                for (const c of bulkSelectedCompanies) {
                  try {
                    // Load current sectors to preserve them
                    const getUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${c.id}`;
                    const getRes = await fetch(getUrl, {
                      method: "GET",
                      headers,
                      credentials: "include",
                    });
                    if (!getRes.ok) {
                      throw new Error(
                        `GET ${getRes.status} ${await getRes
                          .text()
                          .catch(() => "")}`
                      );
                    }
                    const payload = await getRes
                      .json()
                      .catch(() => ({} as unknown));
                    const currentSectorIds = extractSectorIds(payload);
                    // Add the bulk sector to existing sectors (deduplicate)
                    const nextIds = Array.from(
                      new Set<number>([
                        ...currentSectorIds,
                        bulkSelectedSectorId,
                      ])
                    );
                    // Skip update if already present
                    const needsUpdate =
                      nextIds.length !== currentSectorIds.length;
                    if (needsUpdate) {
                      // Use the same API endpoint as single tag
                      const putUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/company_with_sectors`;
                      const putRes = await fetch(putUrl, {
                        method: "PUT",
                        headers,
                        credentials: "include",
                        body: JSON.stringify({
                          new_company_id: c.id,
                          sectors_id: nextIds,
                        }),
                      });
                      if (!putRes.ok) {
                        throw new Error(
                          `PUT ${putRes.status} ${await putRes
                            .text()
                            .catch(() => "")}`
                        );
                      }
                    }
                    setBulkProgress((prev) => ({
                      total: prev?.total || bulkSelectedCompanies.length,
                      done: (prev?.done || 0) + 1,
                      success: (prev?.success || 0) + 1,
                      failed: prev?.failed || 0,
                    }));
                  } catch {
                    setBulkProgress((prev) => ({
                      total: prev?.total || bulkSelectedCompanies.length,
                      done: (prev?.done || 0) + 1,
                      success: prev?.success || 0,
                      failed: (prev?.failed || 0) + 1,
                    }));
                  }
                }
                alert("Bulk tagging complete");
              } finally {
                setBulkSubmitting(false);
              }
            }}
            disabled={
              typeof bulkSelectedSectorId !== "number" ||
              bulkSelectedCompanies.length === 0 ||
              bulkSubmitting
            }
          >
            {bulkSubmitting ? "Tagging…" : "Tag selected companies"}
          </button>
          {bulkProgress && (
            <div className="mt-2 text-sm text-gray-700">
              Processed {bulkProgress.done}/{bulkProgress.total} •{" "}
              {bulkProgress.success} succeeded, {bulkProgress.failed} failed
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 mt-10 border-t">
        <h2 className="mb-4 text-xl font-semibold">Manage by Sector</h2>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Sector</label>
          <SearchableSelect
            options={allSectors.map((s) => ({
              value: s.id,
              label: s.sector_name,
            }))}
            value={selectedSectorForView}
            onChange={handleSelectSectorForView}
            placeholder={
              allSectors.length === 0
                ? "Loading sectors..."
                : "Select sector to view companies"
            }
            disabled={allSectors.length === 0}
            style={{ width: "100%" }}
          />
        </div>

        {typeof selectedSectorForView === "number" && (
          <div className="p-4 bg-white rounded border">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">
                Companies in selected sector
              </h3>
              <button
                className="px-3 py-1 text-sm bg-gray-100 rounded border"
                onClick={() =>
                  loadSectorCompanies(selectedSectorForView, 1, false)
                }
                disabled={sectorCompaniesLoading}
              >
                {sectorCompaniesLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {sectorCompaniesLoading && sectorCompanies.length === 0 ? (
              <div className="text-sm text-gray-500">Loading companies…</div>
            ) : sectorCompanies.length === 0 ? (
              <div className="text-sm text-gray-500">
                No companies found for this sector.
              </div>
            ) : (
              <div className="space-y-2">
                {sectorCompanies.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center p-2 rounded border"
                  >
                    <div className="text-sm">{c.name}</div>
                    <button
                      className="px-3 py-1 text-sm text-white bg-red-600 rounded disabled:opacity-50"
                      onClick={() => handleUntagFromSector(c)}
                      disabled={sectorActionBusyId === c.id}
                    >
                      {sectorActionBusyId === c.id ? "Untagging…" : "Untag"}
                    </button>
                  </div>
                ))}
                {sectorCompaniesHasMore && (
                  <div className="pt-2">
                    <button
                      className="px-4 py-2 text-sm bg-gray-100 rounded border disabled:opacity-50"
                      onClick={loadMoreSectorCompanies}
                      disabled={sectorCompaniesLoading}
                    >
                      {sectorCompaniesLoading ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
