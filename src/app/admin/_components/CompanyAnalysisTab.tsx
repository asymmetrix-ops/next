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

export function CompanyAnalysisTab() {
  const [companyId, setCompanyId] = useState("");
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [sections, setSections] = useState<AnalysisSections>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
        body: JSON.stringify({ company_id: id }),
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

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Company Analysis</h2>
      <p className="mb-6 text-sm text-gray-500">
        Runs the full IA writer pipeline for a company (5–7 min). Keep this tab
        open.
      </p>

      <form onSubmit={onSubmit} className="mb-8 flex flex-wrap items-end gap-4">
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
      </form>

      {loading && (
        <div className="p-4 mb-6 text-sm rounded border border-amber-200 bg-amber-50 text-amber-900">
          <p className="font-medium">Analysis in progress</p>
          <p className="mt-1 text-amber-700">
            The server is running the pipeline and will return the full result
            when done. This can take up to 7 minutes — do not close or refresh
            the page.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 mb-6 bg-red-50 rounded border border-red-300">
          <p className="font-medium text-red-700">Analysis failed</p>
          <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap break-words">
            {error}
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-2 justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {result.company_name || "Company"}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Company ID {result.company_id}
                </p>
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
            <div className="flex gap-2 mt-4">
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
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="flex gap-3 justify-between items-center px-5 py-4 w-full text-left bg-slate-50/80 hover:bg-slate-100/80"
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900">
                        {sectionLabel(key)}
                      </h4>
                      {!isOpen && preview && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {preview}
                        </p>
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
