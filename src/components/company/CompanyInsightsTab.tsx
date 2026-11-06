"use client";

import { useMemo, useState } from "react";
import { InsightsAnalysisCard } from "@/components/InsightsAnalysisCard";
import { getEffectiveContentType } from "@/lib/contentArticleDisplay";
import {
  COMPANY_INSIGHTS_PAGE,
  type CompanyInsights,
  type CompanyInsightsSection,
} from "@/lib/companyInsights";
import { trackKeyAction } from "@/lib/tracking";
import { T } from "@/components/redesign/primitives";
import type { ContentArticle } from "@/types/insightsAnalysis";

const TIME_RANGES = [
  { value: "", label: "Any time", days: 0 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "12m", label: "Last 12 months", days: 365 },
];

const SECTION_DETAIL: Record<CompanyInsightsSection, string> = {
  company: "company_insights",
  related: "related_insights",
  sector: "sector_insights",
};

function Section({
  title,
  section,
  items,
}: {
  title: string;
  section: CompanyInsightsSection;
  items: ContentArticle[];
}) {
  const [shown, setShown] = useState(COMPANY_INSIGHTS_PAGE);
  if (items.length === 0) return null;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.ink }}>
        {title}{" "}
        <span style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>{items.length}</span>
      </h2>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}
      >
        {items.slice(0, shown).map((a) => (
          <div
            key={a.id}
            style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a,button")) {
                trackKeyAction({
                  section: "content",
                  action: "article_opened",
                  actionDetail: SECTION_DETAIL[section],
                  targetType: "article",
                  targetId: a.id,
                });
              }
            }}
          >
            <InsightsAnalysisCard article={a} />
          </div>
        ))}
      </div>
      {shown < items.length && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => setShown((n) => n + COMPANY_INSIGHTS_PAGE)}
            style={{ border: `1px solid ${T.divider}`, background: "#fff", borderRadius: 999, padding: "8px 18px", fontWeight: 600, fontSize: 13, color: T.ink, cursor: "pointer", fontFamily: T.sans }}
          >
            Show more
          </button>
        </div>
      )}
    </section>
  );
}

export default function CompanyInsightsTab({
  insights,
  companyName,
}: {
  insights: CompanyInsights;
  companyName: string;
}) {
  const [type, setType] = useState("");
  const [range, setRange] = useState("");

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const a of [...insights.company, ...insights.related, ...insights.sector]) {
      const t = getEffectiveContentType(a);
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [insights]);

  const filtered = useMemo(() => {
    const days = TIME_RANGES.find((r) => r.value === range)?.days ?? 0;
    const cutoff = days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : "";
    const keep = (a: ContentArticle) =>
      (!type || getEffectiveContentType(a) === type) && (!cutoff || String(a.Publication_Date) >= cutoff);
    return {
      company: insights.company.filter(keep),
      related: insights.related.filter(keep),
      sector: insights.sector.filter(keep),
    };
  }, [insights, type, range]);

  const none = filtered.company.length + filtered.related.length + filtered.sector.length === 0;
  const selectStyle = { border: `1px solid ${T.divider}`, borderRadius: 999, padding: "8px 14px", fontSize: 13, background: "#fff", color: T.ink, fontFamily: T.sans } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "20px 0 40px", fontFamily: T.sans }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <select aria-label="Filter by content type" value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
          <option value="">All content types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Filter by time" value={range} onChange={(e) => setRange(e.target.value)} style={selectStyle}>
          {TIME_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <Section title={`${companyName} Insights & Analysis`} section="company" items={filtered.company} />
      <Section title="Related Insights & Analysis" section="related" items={filtered.related} />
      <Section title="Sector Insights & Analysis" section="sector" items={filtered.sector} />
      {none && <div style={{ color: T.muted, fontSize: 14 }}>No Insights & Analysis matches these filters.</div>}
    </div>
  );
}
