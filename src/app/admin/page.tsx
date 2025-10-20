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
  const [activeTab, setActiveTab] = useState<"valuation" | "emails">(
    "valuation"
  );

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
    <div className="px-4 py-10 mx-auto max-w-5xl">
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
          onClick={() => setActiveTab("emails")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "emails"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Emails
        </button>
      </div>

      {activeTab === "valuation" ? (
        <>
          <h2 className="mb-6 text-xl font-semibold">Valuation Report</h2>
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
        </>
      ) : (
        <EmailsTab />
      )}
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

function EmailsTab() {
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [singleRecipient, setSingleRecipient] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleExport = () => {
    const withBreaks = text.replace(/\n/g, "<br>");
    const sanitized = sanitizeHtml(withBreaks);
    setHtml(`<div>${sanitized}</div>`);
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
        <label className="block mb-1 text-sm font-medium">Subject</label>
        <input
          type="text"
          className="p-2 w-full border"
          placeholder="Email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <textarea
        className="p-2 w-full h-48 border"
        placeholder="Write your email content here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-4">
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Try Xano first (hardcoded endpoint), fallback to local API
            const xanoUrl =
              "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/images";
            try {
              const fd = new FormData();
              fd.append("img", file); // field name expected by Xano
              const res = await fetch(xanoUrl, { method: "POST", body: fd });
              const data = await res.json();
              const url = data?.image?.url || data?.url;
              if (res.ok && url) {
                setText((t) => t + `\n<img src="${url}" alt="" />`);
                return;
              }
            } catch {}

            try {
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
              });
              const data = await res.json();
              if (res.ok && data?.url) {
                setText((t) => t + `\n<img src="${data.url}" alt="" />`);
              }
            } catch {}
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
        <button
          className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
          onClick={async () => {
            if (sending) return;
            const subjectTrimmed = subject.trim();
            const recipientTrimmed = recipientEmail.trim();
            const textTrimmed = text.trim();
            if (!subjectTrimmed || !textTrimmed) return;
            if (singleRecipient && !recipientTrimmed) return;

            // Build sanitized HTML body from current text
            const withBreaks = text.replace(/\n/g, "<br>");
            const sanitized = sanitizeHtml(withBreaks);
            const bodyHtml = `<div>${sanitized}</div>`;
            setHtml(bodyHtml);

            setSending(true);
            try {
              const res = await fetch(
                "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/send_email",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    Email: singleRecipient ? recipientTrimmed || null : null,
                    body: bodyHtml,
                    subject: subjectTrimmed,
                  }),
                }
              );
              // Intentionally not enforcing response shape; surface basic failure
              if (!res.ok) {
                // eslint-disable-next-line no-alert
                alert("Failed to send email");
              } else {
                // eslint-disable-next-line no-alert
                alert("Email submitted");
              }
            } catch {
              // eslint-disable-next-line no-alert
              alert("Network error while sending");
            } finally {
              setSending(false);
            }
          }}
          disabled={
            sending ||
            !subject.trim() ||
            !text.trim() ||
            (singleRecipient && !recipientEmail.trim())
          }
        >
          Submit
        </button>
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
