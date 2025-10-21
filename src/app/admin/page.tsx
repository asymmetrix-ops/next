"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
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

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  theme?: string;
  modules?: unknown;
  formats?: string[];
}

const ReactQuill = dynamic(() => import("react-quill"), {
  ssr: false,
}) as unknown as ComponentType<RichTextEditorProps>;

function EmailsTab() {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgWidthPct, setImgWidthPct] = useState<number>(100);
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [singleRecipient, setSingleRecipient] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
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

  // Load templates on mount
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

  // Attach click handler to detect selected image and show resize control
  useEffect(() => {
    const root = editorContainerRef.current?.querySelector(
      ".ql-editor"
    ) as HTMLElement | null;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        setSelectedImg(img);
        const containerWidth = root?.clientWidth || 1;
        const attrWidth = img.getAttribute("width");
        const numericAttr = attrWidth ? parseInt(attrWidth, 10) : undefined;
        const currentWidth =
          numericAttr || img.getBoundingClientRect().width || img.width;
        const pct = Math.min(
          100,
          Math.max(10, Math.round((currentWidth / containerWidth) * 100))
        );
        setImgWidthPct(pct);
      } else {
        setSelectedImg(null);
      }
    };
    if (root) root.addEventListener("click", onClick as EventListener);
    return () => {
      if (root) root.removeEventListener("click", onClick as EventListener);
    };
  }, [text]);

  const handleExport = () => {
    const editorEl = editorContainerRef.current?.querySelector(
      ".ql-editor"
    ) as HTMLElement | null;
    const rawHtml = editorEl?.innerHTML ?? text;
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
              setText(String(t.Body ?? ""));
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
        {(() => {
          const modules = {
            toolbar: [
              [{ header: [2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ list: "ordered" }, { list: "bullet" }],
              ["blockquote", "code-block"],
              ["link", "image"],
              [{ align: [] }],
              ["clean"],
            ],
          } as const;
          const formats = [
            "header",
            "bold",
            "italic",
            "underline",
            "strike",
            "list",
            "bullet",
            "blockquote",
            "code-block",
            "link",
            "image",
            "align",
          ] as const;
          return (
            <ReactQuill
              theme="snow"
              value={text}
              onChange={setText}
              placeholder="Write your email content here..."
              modules={modules as unknown}
              formats={formats as unknown as string[]}
            />
          );
        })()}
      </div>

      {selectedImg && (
        <div className="flex gap-3 items-center mt-2">
          <label className="text-sm">Image width</label>
          <input
            type="range"
            min={10}
            max={100}
            value={imgWidthPct}
            onChange={(e) => {
              const val = Number(e.target.value);
              setImgWidthPct(val);
              if (selectedImg) {
                const editorEl = editorContainerRef.current?.querySelector(
                  ".ql-editor"
                ) as HTMLElement | null;
                const containerWidth = editorEl?.clientWidth || 1;
                const px = Math.round((containerWidth * val) / 100);
                selectedImg.removeAttribute("style");
                selectedImg.setAttribute("width", String(px));
                // Do not setText here to avoid Quill sanitizing styles away; keep DOM mutation
              }
            }}
          />
          <span className="w-10 text-sm text-right">{imgWidthPct}%</span>
        </div>
      )}

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
        {selectedTemplateId === "" ? (
          <button
            className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
            onClick={async () => {
              if (sending) return;
              const subjectTrimmed = subject.trim();
              const textTrimmed = text.trim();
              if (!subjectTrimmed || !textTrimmed) return;

              // Build sanitized HTML body from current text and wrap with brand template
              const editorEl = editorContainerRef.current?.querySelector(
                ".ql-editor"
              ) as HTMLElement | null;
              const currentHtml = editorEl?.innerHTML ?? text;
              const sanitized = sanitizeHtml(currentHtml);
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
            disabled={sending || !subject.trim() || !text.trim()}
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
              const textTrimmed = text.trim();
              if (!subjectTrimmed || !textTrimmed) return;

              const editorEl = editorContainerRef.current?.querySelector(
                ".ql-editor"
              ) as HTMLElement | null;
              const currentHtml = editorEl?.innerHTML ?? text;
              const sanitized = sanitizeHtml(currentHtml);
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
            disabled={sending || !subject.trim() || !text.trim()}
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
