"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  formatIaWriterError,
  formatThrownError,
  IA_WRITER_RUN_ANALYSIS_PATH,
} from "@/lib/iaWriterAnalysis";

type AnalysisSections = Record<string, string>;

type CompanyAnalysisResult = {
  company_id: number;
  company_name: string;
  sections_written: number;
  total_chars: number;
  sections: AnalysisSections;
  markdown?: string;
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

function formatSectionLabel(key: string): string {
  return (
    SECTION_ORDER.find((s) => s.key === key)?.label ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function orderedSectionKeys(sections: AnalysisSections): string[] {
  const known = SECTION_ORDER.map((s) => s.key).filter((k) => k in sections);
  const extra = Object.keys(sections).filter((k) => !known.includes(k));
  return [...known, ...extra];
}

export function CompanyAnalysisTab() {
  const [companyId, setCompanyId] = useState("");
  const [result, setResult] = useState<CompanyAnalysisResult | null>(null);
  const [editedSections, setEditedSections] = useState<AnalysisSections>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!submitting) {
      setElapsedSec(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [submitting]);

  const sectionKeys = useMemo(
    () => (result ? orderedSectionKeys(editedSections) : []),
    [result, editedSections]
  );

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedSections(new Set(sectionKeys));
  }, [sectionKeys]);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setEditedSections({});

    const id = parseInt(companyId.trim(), 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("Enter a valid company ID (positive number).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(IA_WRITER_RUN_ANALYSIS_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: id }),
      });
      let data: unknown = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          res.ok
            ? "Invalid JSON in response"
            : formatIaWriterError(
                { error: text.slice(0, 500) || res.statusText },
                res.status
              )
        );
      }
      if (!res.ok) {
        throw new Error(formatIaWriterError(data, res.status));
      }
      const parsed = data as CompanyAnalysisResult;
      setResult(parsed);
      setEditedSections({ ...(parsed.sections ?? {}) });
      setExpandedSections(new Set(["summary", "overview"]));
    } catch (err: unknown) {
      setError(formatThrownError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function updateSection(key: string, value: string) {
    setEditedSections((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Company Analysis</h2>
      <p className="mb-6 text-sm text-gray-500">
        Run IA writer analysis for a company. Analysis typically takes 5–7
        minutes — keep this tab open until it completes. Results can be reviewed
        and edited per section below.
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
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 text-white bg-black rounded disabled:opacity-50"
        >
          {submitting
            ? elapsedSec > 0
              ? `Running analysis… (${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")})`
              : "Running analysis…"
            : "Run analysis"}
        </button>
      </form>

      {submitting && (
        <p className="mb-6 text-sm text-amber-800 bg-amber-50 px-3 py-2 rounded border border-amber-200">
          Analysis in progress — this can take up to 7 minutes. Do not close or
          refresh the page.
        </p>
      )}

      {error && (
        <div className="p-3 mb-6 text-red-700 bg-red-50 rounded border border-red-300">
          <p className="font-medium">Analysis failed</p>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-2 justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {result.company_name}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Company ID {result.company_id}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 font-medium text-indigo-800 bg-indigo-50 rounded-full border border-indigo-100">
                  {result.sections_written} sections
                </span>
                <span className="px-3 py-1 font-medium rounded-full border text-slate-700 bg-slate-100 border-slate-200">
                  {result.total_chars.toLocaleString()} chars
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={expandAll}
                className="px-2 py-1 text-xs text-slate-600 rounded border border-slate-200 hover:bg-slate-50"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2 py-1 text-xs text-slate-600 rounded border border-slate-200 hover:bg-slate-50"
              >
                Collapse all
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {sectionKeys.map((key) => {
              const content = editedSections[key] ?? "";
              const isExpanded = expandedSections.has(key);
              const preview =
                content.length > 280
                  ? `${content.slice(0, 280).trim()}…`
                  : content;

              return (
                <article
                  key={key}
                  className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(key)}
                    className="flex gap-3 justify-between items-center px-5 py-4 w-full text-left bg-slate-50/80 hover:bg-slate-100/80"
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900">
                        {formatSectionLabel(key)}
                      </h4>
                      {!isExpanded && preview && (
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
                        className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden
                      >
                        ▼
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100">
                      <textarea
                        value={content}
                        onChange={(e) => updateSection(key, e.target.value)}
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
