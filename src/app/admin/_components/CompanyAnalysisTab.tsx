"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const POLL_INTERVAL_MS = 30_000;

type JobState = {
  jobId: string;
  status: "queued" | "running" | "done" | "error";
  progress: string | null;
};

export function CompanyAnalysisTab() {
  const [companyId, setCompanyId] = useState("");
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [sections, setSections] = useState<AnalysisSections>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<string | null>(null);
  const [insiderData, setInsiderData] = useState("");
  const [job, setJob] = useState<JobState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Regeneration state per section
  const [regenOpen, setRegenOpen] = useState<string | null>(null);     // section key with panel open
  const [regenFeedback, setRegenFeedback] = useState<Record<string, string>>({});
  const [regenLoading, setRegenLoading] = useState<string | null>(null); // section key being regenerated
  const [regenError, setRegenError] = useState<Record<string, string>>({});

  // Elapsed timer while loading
  useEffect(() => {
    if (!loading) { setElapsedSec(0); return; }
    const t0 = Date.now();
    const id = window.setInterval(
      () => setElapsedSec(Math.floor((Date.now() - t0) / 1000)),
      1000
    );
    return () => window.clearInterval(id);
  }, [loading]);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const keys = useMemo(() => (result ? orderedKeys(sections) : []), [result, sections]);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function pollJobStatus(jobId: string) {
    try {
      const res = await fetch(`/api/ia-writer/job-status/${encodeURIComponent(jobId)}`);
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch {
        return; // transient error, keep polling
      }

      if (!res.ok) {
        const d = data as { error?: string };
        // 404 = machine routing issue, keep polling
        if (res.status === 404) return;
        stopPolling();
        setError(d.error ?? `Poll failed (HTTP ${res.status})`);
        setLoading(false);
        setJob(null);
        return;
      }

      const d = data as {
        status: string;
        progress?: string | null;
        result?: FullAnalysisResult | null;
        error?: string | null;
      };

      setJob((prev) => prev ? { ...prev, status: d.status as JobState["status"], progress: d.progress ?? null } : null);

      if (d.status === "done" && d.result) {
        stopPolling();
        setResult(d.result);
        setSections({ ...(d.result.sections ?? {}) });
        setExpanded(new Set(["summary", "overview"]));
        setLoading(false);
        setJob(null);
      } else if (d.status === "error") {
        stopPolling();
        setError(d.error ?? "Analysis failed on server");
        setLoading(false);
        setJob(null);
      }
    } catch {
      // network error — keep polling
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    stopPolling();
    setError(null);
    setResult(null);
    setSections({});
    setJob(null);

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

      const d = data as {
        job_id?: string;
        status?: string;
        result?: FullAnalysisResult;
        sections?: AnalysisSections;
      };

      // Synchronous result (unlikely but handle it)
      if (!d.job_id && d.sections) {
        const r = data as FullAnalysisResult;
        setResult(r);
        setSections({ ...(r.sections ?? {}) });
        setExpanded(new Set(["summary", "overview"]));
        setLoading(false);
        return;
      }

      if (!d.job_id) throw new Error("No job_id returned from server");

      const jobId = d.job_id;
      setJob({ jobId, status: (d.status as JobState["status"]) ?? "queued", progress: null });

      // Poll immediately, then every 30 s
      await pollJobStatus(jobId);
      pollRef.current = setInterval(() => pollJobStatus(jobId), POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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

  async function handleRegenerate(key: string) {
    if (!result) return;
    const feedback = regenFeedback[key]?.trim() ?? "";
    setRegenLoading(key);
    setRegenError((prev) => { const n = { ...prev }; delete n[key]; return n; });

    try {
      const payload: Record<string, unknown> = {
        company_id: result.company_id,
        section: key,
      };
      if (feedback) payload.feedback = feedback;
      if (insiderData.trim()) payload.insider_data = insiderData.trim();
      // summary and conclusion need the other sections as context
      if (key === "summary" || key === "conclusion") {
        payload.compiled_sections = sections;
      }

      const res = await fetch("/api/ia-writer/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.ok) {
        const d = data as { error?: string };
        throw new Error(d.error ?? `Request failed (HTTP ${res.status})`);
      }
      const d = data as { text: string };
      setSections((prev) => ({ ...prev, [key]: d.text }));
      setRegenOpen(null);
      setRegenFeedback((prev) => { const n = { ...prev }; delete n[key]; return n; });
      // Expand so the user sees the new text immediately
      setExpanded((prev) => { const n = new Set(prev); n.add(key); return n; });
    } catch (err) {
      setRegenError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setRegenLoading(null);
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
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="font-medium">
              {job ? `Job ${job.jobId.slice(0, 8)}… — ${job.status}` : "Starting analysis…"}
            </p>
          </div>
          {job?.progress && (
            <p className="mt-1.5 text-amber-800 font-mono text-xs">{job.progress}</p>
          )}
          <p className="mt-2 text-amber-700">
            Elapsed: {fmtTime(elapsedSec)} · Polling every 30 s. Keep this tab open.
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
              const isRegenOpen = regenOpen === key;
              const isRegenerating = regenLoading === key;
              const preview = content.length > 280 ? `${content.slice(0, 280).trim()}…` : content;

              return (
                <article
                  key={key}
                  className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* ── Header row ── */}
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="flex flex-1 gap-3 justify-between items-center px-5 py-4 text-left bg-slate-50/80 hover:bg-slate-100/80"
                    >
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900">{sectionLabel(key)}</h4>
                        {!isOpen && !isRegenOpen && preview && (
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

                    {/* Regenerate button */}
                    <button
                      type="button"
                      title="Regenerate this section"
                      onClick={() => setRegenOpen(isRegenOpen ? null : key)}
                      disabled={isRegenerating}
                      className={`flex items-center gap-1.5 px-4 border-l border-slate-200 text-xs font-semibold transition-colors disabled:opacity-40
                        ${isRegenOpen
                          ? "bg-violet-600 text-white hover:bg-violet-700"
                          : "bg-violet-500 text-white hover:bg-violet-600"}`}
                    >
                      {isRegenerating
                        ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <span>↺</span>}
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>

                    {/* Export button */}
                    <button
                      type="button"
                      title={`Export "${sectionLabel(key)}" as Word`}
                      onClick={() => handleExportSection(key)}
                      disabled={exporting !== null}
                      className="flex items-center gap-1.5 px-4 border-l border-slate-200 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 transition-colors text-xs font-semibold"
                    >
                      {exporting === key
                        ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <WordIcon />}
                      <span className="hidden sm:inline">.docx</span>
                    </button>
                  </div>

                  {/* ── Regenerate panel ── */}
                  {isRegenOpen && (
                    <div className="px-5 py-4 border-t border-violet-100 bg-violet-50/40">
                      <p className="mb-2 text-xs font-semibold text-violet-700 uppercase tracking-wide">
                        Regenerate — {sectionLabel(key)}
                      </p>
                      <textarea
                        value={regenFeedback[key] ?? ""}
                        onChange={(e) =>
                          setRegenFeedback((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        rows={4}
                        placeholder={`What was wrong or missing?\n\ne.g. "The overview missed the London founding location and understated the data moat. Please also be more specific about the founding team roles."`}
                        className="px-3 py-2 w-full text-sm rounded-lg border border-violet-200 bg-white resize-y placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300"
                      />
                      {regenError[key] && (
                        <p className="mt-2 text-xs text-red-600">{regenError[key]}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => handleRegenerate(key)}
                          disabled={isRegenerating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg"
                        >
                          {isRegenerating && (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                          {isRegenerating ? "Regenerating…" : "Submit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegenOpen(null)}
                          disabled={isRegenerating}
                          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Regenerating overlay ── */}
                  {isRegenerating && (
                    <div className="flex items-center gap-2 px-5 py-3 border-t border-violet-100 bg-violet-50/60 text-sm text-violet-700">
                      <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      Regenerating {sectionLabel(key)}… (~15–30 s)
                    </div>
                  )}

                  {/* ── Editable content ── */}
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
