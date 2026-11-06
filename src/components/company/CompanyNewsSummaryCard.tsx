"use client";

import Link from "next/link";
import { T } from "@/components/redesign/primitives";
import { decodeHtmlEntities } from "@/lib/contentArticleDisplay";
import { formatShortDate, type CompanyNewsSummary } from "@/lib/companyNews";
import { dotPillStyleFromTone, getNewsSubtypeTone } from "@/lib/tagColors";
import { trackCompanyNewsOpen } from "@/components/company/CompanyNewsTab";

/** Summary tab: the 5 newest news articles for the company, "View all news" opens the News tab. */
export default function CompanyNewsSummaryCard({
  summary,
  onViewAll,
}: {
  summary: CompanyNewsSummary;
  onViewAll: () => void;
}) {
  return (
    <div
      className="company-grid-news"
      style={{
        background: T.panel,
        border: `1px solid ${T.divider}`,
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
        boxSizing: "border-box",
        fontFamily: T.sans,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.ink }}>News</h3>
        <span style={{ fontSize: 12.5, color: T.muted }}>
          {summary.total.toLocaleString()} {summary.total === 1 ? "article" : "articles"}
        </span>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
        {summary.items.map((a) => {
          const tone = a.news_type ? getNewsSubtypeTone(a.news_type) : null;
          return (
            <li key={a.id} style={{ padding: "10px 0", borderTop: `1px solid ${T.divider}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {tone && a.news_type ? (
                  <span style={dotPillStyleFromTone(tone)}>{a.news_type}</span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>News</span>
                )}
                <span style={{ fontSize: 12, color: T.muted }}>{formatShortDate(a.publication_date)}</span>
              </div>
              <Link
                href={`/article/${a.id}`}
                onClick={() => trackCompanyNewsOpen(a.id, "summary_card")}
                style={{ fontSize: 13.5, lineHeight: 1.4, fontWeight: 600, color: T.ink, textDecoration: "none" }}
              >
                {decodeHtmlEntities(a.headline)}
              </Link>
            </li>
          );
        })}
      </ul>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${T.divider}`,
          paddingTop: 12,
          fontSize: 12.5,
          color: T.muted,
        }}
      >
        <span>
          Showing {summary.shown} of {summary.total}
        </span>
        <button
          type="button"
          onClick={onViewAll}
          style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.azure }}
        >
          View all news
        </button>
      </div>
    </div>
  );
}
