"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AnalysisSections = Record<string, string>;

type FullAnalysisResult = {
  company_id: number;
  company_name: string;
  sections_written: number;
  total_chars: number;
  sections: AnalysisSections;
  markdown?: string;
};

type ApiError = {
  error?: string;
  detail?: string;
  code?: string;
};

const SECTION_ORDER: Array<{ key: string; label: string }> = [
  { key: "summary", label: "Summary" },
  { key: "overview", label: "Company Overview" },
  { key: "product", label: "Product Overview" },
  { key: "users_and_use_cases", label: "Users & Use Cases" },
  { key: "market_dynamics", label: "Market Dynamics" },
  { key: "ai_risks", label: "AI Risks & Opportunities" },
  { key: "competitive_landscape", label: "Competitive Landscape" },
  { key: "growth_strategy", label: "Growth Strategy" },
  { key: "potential_acquirors", label: "Potential Acquirors" },
  { key: "valuation", label: "Valuation" },
  { key: "transaction_activity", label: "Transaction Activity" },
  { key: "conclusion", label: "Conclusion" },
];

function sectionLabel(key: string): string {
  return (
    SECTION_ORDER.find((s) => s.key === key)?.label ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function orderedKeys(sections: AnalysisSections): string[] {
  const known = SECTION_ORDER.map((s) => s.key).filter((k) => k in sections);
  const extra = Object.keys(sections).filter((k) => !known.includes(k));
  return [...known, ...extra];
}

function extractError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as ApiError;
    const parts = [
      d.error || d.detail,
      d.code ? `Code: ${d.code}` : null,
      `HTTP ${status}`,
    ].filter(Boolean) as string[];
    return parts.join(" · ");
  }
  return `Request failed (HTTP ${status})`;
}

// ─── Word export ─────────────────────────────────────────────────────────────

/**
 * Convert a plain-text section (markdown-ish) to docx paragraphs.
 * Handles: **bold**, *italic*, bullet lines (- / • / *), blank lines → spacing.
 */
async function buildDocxParagraphs(
  text: string,
  docxModule: typeof import("docx")
) {
  const { Paragraph, TextRun, HeadingLevel } = docxModule;

  const lines = text.split("\n");
  const paragraphs: InstanceType<typeof Paragraph>[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Heading: ## or ###
    if (/^#{2,3} /.test(line)) {
      const lvl = line.startsWith("###") ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2;
      paragraphs.push(
        new Paragraph({ text: line.replace(/^#+\s*/, ""), heading: lvl })
      );
      continue;
    }

    // Bullet line
    const bulletMatch = line.match(/^(\s*)[-•*]\s+(.*)/);
    if (bulletMatch) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: bulletMatch[1].length > 0 ? 1 : 0 },
          children: parseInline(bulletMatch[2], TextRun),
        })
      );
      continue;
    }

    // Empty line → small spacer
    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Normal paragraph
    paragraphs.push(new Paragraph({ children: parseInline(line, TextRun) }));
  }

  return paragraphs;
}

/**
 * Parse inline **bold** and *italic* markers into TextRun children.
 */
function parseInline(
  text: string,
  TextRun: typeof import("docx").TextRun
): InstanceType<typeof import("docx").TextRun>[] {
  const runs: InstanceType<typeof import("docx").TextRun>[] = [];
  // tokenise: **bold**, *italic*, plain
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[2]) runs.push(new TextRun({ text: m[2], bold: true }));
    else if (m[3]) runs.push(new TextRun({ text: m[3], italics: true }));
    else if (m[4]) runs.push(new TextRun({ text: m[4] }));
  }
  return runs.length ? runs : [new TextRun({ text })];
}

async function exportSectionAsWord(
  companyName: string,
  key: string,
  content: string
) {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, HeadingLevel } = docx;

  const title = sectionLabel(key);
  const body = await buildDocxParagraphs(content, docx);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 24 },
          paragraph: { spacing: { after: 160 } },
        },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            text: `${companyName} — ${title}`,
            heading: HeadingLevel.HEADING_1,
          }),
          ...body,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${companyName} — ${title}.docx`);
}

async function exportAllSectionsAsWord(
  companyName: string,
  keys: string[],
  sections: AnalysisSections
) {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, HeadingLevel, PageBreak, TextRun } = docx;

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      text: `${companyName} — Company Analysis`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    }),
  ];

  let first = true;
  for (const key of keys) {
    const content = (sections[key] ?? "").replace(/^\n+/, ""); // trim leading blank lines
    if (!content.trim()) continue;

    // Explicit page break paragraph (more reliable than pageBreakBefore on heading)
    if (!first) {
      children.push(
        new Paragraph({ children: [new TextRun({ break: 1 })], spacing: { after: 0, before: 0 } })
      );
      children.push(
        new Paragraph({ children: [new PageBreak()], spacing: { after: 0, before: 0 } })
      );
    }
    first = false;

    children.push(
      new Paragraph({
        text: sectionLabel(key),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 0, after: 240 },
      })
    );
    const body = await buildDocxParagraphs(content, docx);
    children.push(...body);
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 24 },
          paragraph: { spacing: { after: 160 } },
        },
      },
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${companyName} — Company Analysis.docx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ─── Component ────────────────────────────────────────────────────────────────

function WordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 17l-1.5-6h1.2l1 4.3 1.1-4.3h1.1l1.1 4.3 1-4.3H14l-1.5 6h-1.1l-1.1-4.3-1.1 4.3H8.5z" />
    </svg>
  );
}

export function CompanyAnalysisTab() {
  const [companyId, setCompanyId] = useState("");
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [sections, setSections] = useState<AnalysisSections>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<string | null>(null); // key or "all"
  const [insiderData, setInsiderData] = useState("");

  useEffect(() => {
    if (!loading) { setElapsedSec(0); return; }
    const t0 = Date.now();
    const id = window.setInterval(
      () => setElapsedSec(Math.floor((Date.now() - t0) / 1000)),
      1000
    );
    return () => window.clearInterval(id);
  }, [loading]);

  const keys = useMemo(() => (result ? orderedKeys(sections) : []), [result, sections]);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSections({});

    const id = parseInt(companyId.trim(), 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("Enter a valid company ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ia-writer/run-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: id,
          ...(insiderData.trim() ? { insider_data: insiderData.trim() } : {}),
        }),
      });

      let data: unknown;
      const text = await res.text();
      try { data = JSON.parse(text); } catch {
        throw new Error(res.ok ? "Invalid JSON response" : `HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      if (!res.ok) throw new Error(extractError(data, res.status));

      const r = data as FullAnalysisResult;
      setResult(r);
      setSections({ ...(r.sections ?? {}) });
      setExpanded(new Set(["summary", "overview"]));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleExportSection(key: string) {
    if (!result) return;
    setExporting(key);
    try {
      await exportSectionAsWord(result.company_name || "Company", key, sections[key] ?? "");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportAll() {
    if (!result) return;
    setExporting("all");
    try {
      await exportAllSectionsAsWord(result.company_name || "Company", keys, sections);
    } finally {
      setExporting(null);
    }
  }

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Company Analysis</h2>
      <p className="mb-6 text-sm text-gray-500">
        Runs the full IA writer pipeline for a company (5–7 min). Keep this tab open.
      </p>

      <form onSubmit={onSubmit} className="mb-8 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="block mb-1 text-sm font-medium">Company ID</label>
            <input
              type="number"
              min={1}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="e.g. 3222"
              className="px-3 py-2 w-full rounded border"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-black rounded disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {elapsedSec > 0 ? `Running… (${fmtTime(elapsedSec)})` : "Running…"}
              </>
            ) : (
              "Run analysis"
            )}
          </button>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">
            Insider data{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={insiderData}
            onChange={(e) => setInsiderData(e.target.value)}
            disabled={loading}
            rows={4}
            placeholder="Non-public context the AI should factor in — e.g. sale process status, diligence parties, upcoming announcements…"
            className="px-3 py-2 w-full text-sm rounded border resize-y border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-gray-400">
            Sent as <code className="bg-gray-100 px-1 rounded">insider_data</code> in the request payload. Leave blank to omit.
          </p>
        </div>
      </form>

      {loading && (
        <div className="p-4 mb-6 text-sm rounded border border-amber-200 bg-amber-50 text-amber-900">
          <p className="font-medium">Analysis in progress</p>
          <p className="mt-1 text-amber-700">
            The server is running the pipeline and will return the full result
            when done. This can take up to 7 minutes — do not close or refresh the page.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 mb-6 bg-red-50 rounded border border-red-300">
          <p className="font-medium text-red-700">Analysis failed</p>
          <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap break-words">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Header card */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-2 justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {result.company_name || "Company"}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">Company ID {result.company_id}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 font-medium text-indigo-800 bg-indigo-50 rounded-full border border-indigo-100">
                  {result.sections_written ?? 0} sections
                </span>
                <span className="px-3 py-1 font-medium rounded-full border text-slate-700 bg-slate-100 border-slate-200">
                  {(result.total_chars ?? 0).toLocaleString()} chars
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={() => setExpanded(new Set(keys))}
                className="px-2 py-1 text-xs text-slate-600 rounded border border-slate-200 hover:bg-slate-50"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={() => setExpanded(new Set())}
                className="px-2 py-1 text-xs text-slate-600 rounded border border-slate-200 hover:bg-slate-50"
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* Export all */}
          <button
            type="button"
            onClick={handleExportAll}
            disabled={exporting !== null}
            className="inline-flex items-center gap-2 w-full justify-center px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
          >
            {exporting === "all" ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <WordIcon />
            )}
            {exporting === "all" ? "Generating Word document…" : "Export full analysis as Word (.docx)"}
          </button>

          {/* Section cards */}
          <div className="space-y-4">
            {keys.map((key) => {
              const content = sections[key] ?? "";
              const isOpen = expanded.has(key);
              const preview = content.length > 280 ? `${content.slice(0, 280).trim()}…` : content;

              return (
                <article
                  key={key}
                  className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="flex flex-1 gap-3 justify-between items-center px-5 py-4 text-left bg-slate-50/80 hover:bg-slate-100/80"
                    >
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900">{sectionLabel(key)}</h4>
                        {!isOpen && preview && (
                          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{preview}</p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 gap-2 items-center">
                        <span className="text-xs tabular-nums text-slate-400">
                          {content.length.toLocaleString()} chars
                        </span>
                        <span
                          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          aria-hidden
                        >
                          ▼
                        </span>
                      </div>
                    </button>

                    {/* Per-section export button */}
                    <button
                      type="button"
                      title={`Export "${sectionLabel(key)}" as Word`}
                      onClick={() => handleExportSection(key)}
                      disabled={exporting !== null}
                      className="flex items-center gap-1.5 px-3 border-l border-slate-200 bg-slate-50/80 hover:bg-blue-50 text-slate-400 hover:text-blue-600 disabled:opacity-40 transition-colors text-xs font-medium"
                    >
                      {exporting === key ? (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <WordIcon />
                      )}
                      <span className="hidden sm:inline">.docx</span>
                    </button>
                  </div>

                  {isOpen && (
                    <div className="p-5 border-t border-slate-100">
                      <textarea
                        value={content}
                        onChange={(e) =>
                          setSections((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        rows={Math.min(24, Math.max(8, Math.ceil(content.length / 80)))}
                        className="px-4 py-3 w-full font-sans text-sm leading-relaxed rounded-lg border resize-y border-slate-200 text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
                        spellCheck
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
