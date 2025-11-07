"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"valuation" | "user-activity">(
    "valuation"
  );

  const hasAccess = useMemo(() => {
    if (!user) return false;
    const normalizedStatus = (
      user.Status ||
      user.status ||
      user.role ||
      ""
    ).toString();
    if (normalizedStatus.toLowerCase() === "admin") return true;
    const roles = user.roles || [];
    return roles.map((r) => r.toLowerCase()).includes("admin");
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!hasAccess) {
        router.replace("/");
      }
    }
  }, [isAuthenticated, hasAccess, loading, router]);

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

  if (loading || !isAuthenticated || !hasAccess) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 w-full max-w-none min-h-screen">
      <h1 className="mb-6 text-2xl font-semibold">Admin</h1>

      <div className="mb-6 border-b">
        <nav className="flex gap-2 -mb-px" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("valuation")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "valuation"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Valuation Report
          </button>
          <button
            onClick={() => setActiveTab("user-activity")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "user-activity"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            User Activity
          </button>
        </nav>
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
