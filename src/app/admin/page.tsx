"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EmailEditor from "react-email-editor";
import SearchableSelect from "@/components/ui/SearchableSelect";
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
    "valuation" | "user-activity" | "emails" | "content" | "sectors"
  >("valuation");

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

  function loadHtmlIntoEditor(rawHtml: string) {
    const inst = unlayerRef.current as {
      loadDesign?: (design: unknown) => void;
    } | null;
    const design = {
      body: {
        rows: [
          {
            cells: [1],
            columns: [
              {
                contents: [
                  {
                    type: "html",
                    values: { html: rawHtml },
                  },
                ],
              },
            ],
          },
        ],
        values: { backgroundColor: "#ffffff", contentWidth: "600px" },
      },
    };
    inst?.loadDesign?.(design as unknown);
  }

  useEffect(() => {
    if (editorReady && pendingHtml) {
      loadHtmlIntoEditor(pendingHtml);
      setPendingHtml(null);
    }
  }, [editorReady, pendingHtml]);

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
    const exported = await new Promise<{ html?: string }>((resolve) => {
      const inst = unlayerRef.current as {
        exportHtml?: (cb: (d: { html?: string }) => void) => void;
      } | null;
      inst?.exportHtml?.((d) => resolve(d));
    });
    const rawHtml = exported?.html || "";
    const sanitized = sanitizeHtml(rawHtml);
    const branded = buildBrandedEmailHtml({
      bodyHtml: `<div>${sanitized}</div>`,
      subject,
    });
    setHtml(branded);
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
                  loadHtmlIntoEditor(bodyHtml);
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
          onReady={() => setEditorReady(true)}
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

              const exported = await new Promise<{ html?: string }>(
                (resolve) => {
                  const inst = unlayerRef.current as {
                    exportHtml?: (cb: (d: { html?: string }) => void) => void;
                  } | null;
                  inst?.exportHtml?.((d) => resolve(d));
                }
              );
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
              const exported = await new Promise<{ html?: string }>(
                (resolve) => {
                  const inst = unlayerRef.current as {
                    exportHtml?: (cb: (d: { html?: string }) => void) => void;
                  } | null;
                  inst?.exportHtml?.((d) => resolve(d));
                }
              );
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
  // Core fields
  const [headline, setHeadline] = useState("");
  const [strapline, setStrapline] = useState("");
  const [contentType, setContentType] = useState("");
  const CONTENT_TYPES = [
    "Company Analysis",
    "Deal Analysis",
    "Hot Take",
    "Executive Interview",
    "Sector Analysis",
  ];
  const [contentTypes] = useState<string[]>(CONTENT_TYPES);

  // Body builder (EmailEditor)
  const contentUnlayerRef = useRef<unknown>(null);

  // Sectors
  const [primarySectors, setPrimarySectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);
  const [secondarySectors, setSecondarySectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);
  const [selectedPrimarySectorIds, setSelectedPrimarySectorIds] = useState<
    number[]
  >([]);
  const [selectedSecondarySectorIds, setSelectedSecondarySectorIds] = useState<
    number[]
  >([]);

  // Companies selection
  interface SimpleCompany {
    id: number;
    name: string;
  }
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<SimpleCompany[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<SimpleCompany[]>(
    []
  );
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Content types are fixed per product spec

  // Fetch sectors
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const prim = await locationsService.getPrimarySectors();
        if (!cancelled) setPrimarySectors(prim);
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // When primary sector selection changes, refresh secondary sector options
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (selectedPrimarySectorIds.length === 0) {
          setSecondarySectors([]);
          setSelectedSecondarySectorIds([]);
          return;
        }
        const secs = await locationsService.getSecondarySectors(
          selectedPrimarySectorIds
        );
        if (!cancelled) setSecondarySectors(secs);
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedPrimarySectorIds]);

  // Company search (same endpoint/shape as Companies list page; filter only by name)
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

  // Build JSON payload for copy/preview
  const [generatedJson, setGeneratedJson] = useState<string>("");
  const generatePayload = async () => {
    const exported = await new Promise<{ html?: string }>((resolve) => {
      const inst = contentUnlayerRef.current as {
        exportHtml?: (cb: (d: { html?: string }) => void) => void;
      } | null;
      inst?.exportHtml?.((d) => resolve(d));
    });
    const rawHtml = exported?.html || "";
    const sanitized = sanitizeHtml(rawHtml);
    const bodyHtml = `<div>${sanitized}</div>`;
    const payload = {
      Headline: headline.trim() || null,
      Strapline: strapline.trim() || null,
      Content_Type: contentType || null,
      Body: bodyHtml,
      primary_sectors_ids: selectedPrimarySectorIds,
      Secondary_sectors_ids: selectedSecondarySectorIds,
      companies_mentioned: selectedCompanies.map((c) => ({
        id: c.id,
        name: c.name,
      })),
    } as const;
    setGeneratedJson(JSON.stringify(payload, null, 2));
  };

  // Submit to Xano: create new content. Do NOT set Visibility or Publication_Date
  const [submittingContent, setSubmittingContent] = useState(false);
  const submitContent = async () => {
    if (submittingContent) return;
    try {
      setSubmittingContent(true);
      // export HTML from builder
      const exported = await new Promise<{ html?: string }>((resolve) => {
        const inst = contentUnlayerRef.current as {
          exportHtml?: (cb: (d: { html?: string }) => void) => void;
        } | null;
        inst?.exportHtml?.((d) => resolve(d));
      });
      const rawHtml = exported?.html || "";
      const sanitized = sanitizeHtml(rawHtml);
      const bodyHtml = `<div>${sanitized}</div>`;

      const sectorsCombined = [
        ...selectedPrimarySectorIds,
        ...selectedSecondarySectorIds,
      ];
      const companiesIds = selectedCompanies.map((c) => c.id);

      const token = localStorage.getItem("asymmetrix_auth_token");
      const resp = await fetch(
        "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/new_content",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            Headline: headline.trim(),
            Strapline: strapline.trim(),
            Content_Type: contentType,
            Body: bodyHtml,
            sectors: sectorsCombined,
            companies_mentioned: companiesIds,
            Related_Documents: [],
            Related_Corporate_Event: [],
          }),
        }
      );
      if (!resp.ok) {
        const txt = await resp.text();
        alert(`Failed to create content: ${resp.status} ${txt}`);
        return;
      }
      alert("Content created successfully");
    } catch {
      alert("Network error while creating content");
    } finally {
      setSubmittingContent(false);
    }
  };

  const copyPayload = async () => {
    if (!generatedJson) return;
    try {
      await navigator.clipboard.writeText(generatedJson);
    } catch {}
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Content Builder</h2>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Headline</label>
        <input
          type="text"
          className="p-2 w-full border"
          placeholder="Enter headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Strapline</label>
        <input
          type="text"
          className="p-2 w-full border"
          placeholder="Enter strapline"
          value={strapline}
          onChange={(e) => setStrapline(e.target.value)}
        />
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

      <div className="mt-3 border">
        <EmailEditor
          ref={contentUnlayerRef as unknown as never}
          minHeight={500}
          onReady={() => {
            try {
              const uploadCb = async (
                file: File,
                done: (data: { url: string }) => void
              ) => {
                try {
                  const fd = new FormData();
                  fd.append("img", file);
                  const token = localStorage.getItem("asymmetrix_auth_token");
                  const resp = await fetch(
                    "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/images",
                    {
                      method: "POST",
                      headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: fd,
                    }
                  );
                  const json = await resp
                    .json()
                    .catch(() => ({} as Record<string, unknown>));
                  const urlCandidate = (
                    json as {
                      image?: { url?: string };
                    }
                  ).image?.url;
                  if (
                    resp.ok &&
                    typeof urlCandidate === "string" &&
                    urlCandidate
                  ) {
                    done({ url: urlCandidate });
                  } else {
                    done({ url: "" });
                  }
                } catch {
                  done({ url: "" });
                }
              };

              // Register on global unlayer API if available
              const g = (globalThis as unknown as { unlayer?: unknown })
                .unlayer as
                | {
                    registerCallback?: (
                      name: string,
                      cb: typeof uploadCb
                    ) => void;
                  }
                | undefined;
              g?.registerCallback?.("image", uploadCb);

              // Also register on the instance as a fallback
              const inst = contentUnlayerRef.current as {
                registerCallback?: (name: string, cb: typeof uploadCb) => void;
              } | null;
              inst?.registerCallback?.("image", uploadCb);
            } catch {}
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block mb-1 text-sm font-medium">
            Primary Sectors
          </label>
          <SearchableSelect
            options={primarySectors.map((s) => ({
              value: s.id,
              label: s.sector_name,
            }))}
            value={""}
            onChange={(value) => {
              if (
                typeof value === "number" &&
                !selectedPrimarySectorIds.includes(value)
              ) {
                setSelectedPrimarySectorIds([
                  ...selectedPrimarySectorIds,
                  value,
                ]);
              }
            }}
            placeholder={"Select Primary Sector"}
            style={{ width: "100%" }}
          />
          {selectedPrimarySectorIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedPrimarySectorIds.map((id) => {
                const s = primarySectors.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                  >
                    {s?.sector_name || id}
                    <button
                      onClick={() =>
                        setSelectedPrimarySectorIds(
                          selectedPrimarySectorIds.filter((x) => x !== id)
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

        <div>
          <label className="block mb-1 text-sm font-medium">
            Secondary Sectors
          </label>
          <SearchableSelect
            options={secondarySectors.map((s) => ({
              value: s.id,
              label: s.sector_name,
            }))}
            value={""}
            onChange={(value) => {
              if (
                typeof value === "number" &&
                !selectedSecondarySectorIds.includes(value)
              ) {
                setSelectedSecondarySectorIds([
                  ...selectedSecondarySectorIds,
                  value,
                ]);
              }
            }}
            placeholder={
              selectedPrimarySectorIds.length === 0
                ? "Select primary sector first"
                : "Select Secondary Sector"
            }
            disabled={selectedPrimarySectorIds.length === 0}
            style={{ width: "100%" }}
          />
          {selectedSecondarySectorIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedSecondarySectorIds.map((id) => {
                const s = secondarySectors.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                  >
                    {s?.sector_name || id}
                    <button
                      onClick={() =>
                        setSelectedSecondarySectorIds(
                          selectedSecondarySectorIds.filter((x) => x !== id)
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
      </div>

      <div className="mt-4">
        <label className="block mb-1 text-sm font-medium">
          Companies Mentioned
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 p-2 border"
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
          value={""}
          onChange={(value) => {
            if (typeof value === "number") {
              const found = companyResults.find((c) => c.id === value);
              if (found && !selectedCompanies.find((c) => c.id === found.id)) {
                setSelectedCompanies([...selectedCompanies, found]);
              }
            }
          }}
          placeholder={
            loadingCompanies
              ? "Loading companies..."
              : companyResults.length === 0
              ? "Search above to load companies"
              : "Select company to add"
          }
          disabled={loadingCompanies || companyResults.length === 0}
          style={{ width: "100%" }}
        />
        {selectedCompanies.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedCompanies.map((c) => (
              <span
                key={c.id}
                className="inline-flex gap-1 items-center px-2 py-1 text-xs text-purple-700 bg-purple-50 rounded"
              >
                {c.name}
                <button
                  onClick={() =>
                    setSelectedCompanies(
                      selectedCompanies.filter((x) => x.id !== c.id)
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

      <div className="flex gap-2 mt-4">
        <button
          className="px-4 py-2 text-white bg-blue-600 rounded"
          onClick={generatePayload}
        >
          Generate JSON
        </button>
        <button
          className="px-4 py-2 text-white bg-gray-800 rounded disabled:opacity-50"
          onClick={copyPayload}
          disabled={!generatedJson}
        >
          Copy JSON
        </button>
        <button
          className="px-4 py-2 text-white bg-green-600 rounded disabled:opacity-50"
          onClick={submitContent}
          disabled={submittingContent}
        >
          {submittingContent ? "Submitting…" : "Submit"}
        </button>
      </div>

      {generatedJson && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">Payload</h3>
          <pre className="overflow-x-auto p-2 text-sm bg-gray-100 rounded">
            {generatedJson}
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
                    // Load current
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
                      const putUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/edit_company_sectors`;
                      const putRes = await fetch(putUrl, {
                        method: "PUT",
                        headers,
                        credentials: "include",
                        body: JSON.stringify({
                          sectors: nextIds,
                          new_company_id: c.id,
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
