"use client";
/**
 * InsightsCard — redesign/InsightsCard.jsx converted to TypeScript.
 * Two-column article rows (tag + date | headline + "Open report →")
 * with prev/next pager footer.
 */
import React from "react";
import Link from "next/link";
import { ContentArticle } from "@/types/insightsAnalysis";
import { LinkPanel, LinkedH, Pill, T } from "./primitives";

// ── helpers ───────────────────────────────────────────────────────────────────
function badgeTone(
  contentType: string
): "coral" | "azure" | "emerald" | "neutral" {
  const ct = contentType.toLowerCase().trim();
  if (ct === "company analysis" || ct === "company update") return "coral";
  if (ct === "sector analysis") return "azure";
  if (ct === "deal analysis" || ct === "deal perspective") return "emerald";
  return "neutral";
}

function titleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ── skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 16,
        padding: "14px 18px",
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div style={{ height: 18, background: T.inset, borderRadius: 4 }} />
      <div style={{ height: 36, background: T.inset, borderRadius: 4 }} />
    </div>
  );
}

// ── placeholder row (empty state) ────────────────────────────────────────────
const DEMO_ARTICLES = [
  {
    tag: "Company Update",
    tone: "coral" as const,
    date: "Apr 10, 2026",
    body: "Morningstar reports strong Q1 driven by PitchBook and Indexes; management flagged accelerating demand for private-markets data and a disciplined approach to GenAI-driven research automation.",
  },
  {
    tag: "Sector Analysis",
    tone: "azure" as const,
    date: "Mar 22, 2026",
    body: "Private markets data vendors trade at premium multiples; Morningstar is increasingly viewed as a private-markets pure-play proxy via its PitchBook segment.",
  },
];

function DemoRow({ item }: { item: (typeof DEMO_ARTICLES)[number] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 16,
        padding: "14px 18px",
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div>
        <Pill tone={item.tone}>{item.tag}</Pill>
        <div
          style={{
            fontSize: 11.5,
            color: T.muted,
            fontFamily: T.mono,
            marginTop: 8,
          }}
        >
          {item.date}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: T.body }}>
          {item.body}
        </div>
        <div
          style={{
            color: T.azure,
            fontSize: 12.5,
            fontWeight: 500,
            marginTop: 8,
            opacity: 0.45,
          }}
        >
          Open report →
        </div>
      </div>
    </div>
  );
}

// ── article row ──────────────────────────────────────────────────────────────
function ArticleRow({ article }: { article: ContentArticle }) {
  const tone = badgeTone(article.Content_Type || "");
  const tag = article.Content_Type?.trim()
    ? titleCase(article.Content_Type.trim())
    : "Analysis";
  const date = article.Publication_Date ? formatDate(article.Publication_Date) : "";
  const headline = [article.Headline?.trim(), article.Strapline?.trim()]
    .filter(Boolean)
    .join(" ") || "—";

  return (
    <Link
      href={`/article/${article.id}`}
      prefetch={false}
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 16,
        padding: "14px 18px",
        borderBottom: `1px solid ${T.hair}`,
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div>
        <Pill tone={tone}>{tag}</Pill>
        <div
          style={{
            fontSize: 11.5,
            color: T.muted,
            fontFamily: T.mono,
            marginTop: 8,
          }}
        >
          {date || "—"}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: T.body }}>
          {headline}
        </div>
        <div
          style={{
            color: T.azure,
            fontSize: 12.5,
            fontWeight: 500,
            marginTop: 8,
          }}
        >
          Open report →
        </div>
      </div>
    </Link>
  );
}

// ── pager button ─────────────────────────────────────────────────────────────
function PagerBtn({
  label,
  enabled,
  onClick,
  ariaLabel,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: `1px solid ${T.divider}`,
        background: T.panel,
        color: T.body,
        fontFamily: T.sans,
        fontSize: 14,
        lineHeight: 1,
        cursor: enabled ? "pointer" : "default",
        opacity: enabled ? 1 : 0.35,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

// ── main component ───────────────────────────────────────────────────────────
type Props = {
  articles: ContentArticle[];
  loading: boolean;
  totalCount: number;
  pageOffset: number;
  rangeEnd: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Shown in header + footer when there are no real articles yet */
  emptyStateTotal?: number;
  fillGridCell?: boolean;
};

export function InsightsCard({
  articles,
  loading,
  totalCount,
  pageOffset,
  rangeEnd,
  canPrev,
  canNext,
  onPrev,
  onNext,
  emptyStateTotal = 17,
  fillGridCell = false,
}: Props) {
  const isEmpty = !loading && totalCount === 0;
  const displayTotal = isEmpty ? emptyStateTotal : totalCount;
  const rangeLabel = isEmpty
    ? `1–2 of ${emptyStateTotal}`
    : `${pageOffset + 1}–${rangeEnd} of ${totalCount}`;
  const headerRight = loading ? "…" : `${Math.min(2, displayTotal)} of ${displayTotal}`;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH right={<span style={{ fontFamily: T.mono }}>{headerRight}</span>}>
        Recent insights &amp; analysis
      </LinkedH>

      {/* rows */}
      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : isEmpty ? (
        DEMO_ARTICLES.map((item) => <DemoRow key={item.tag} item={item} />)
      ) : (
        articles.map((a) => <ArticleRow key={a.id} article={a} />)
      )}

      {/* footer pager */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px",
          borderTop: `1px solid ${T.hair}`,
          fontFamily: T.sans,
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PagerBtn label="‹" enabled={canPrev} onClick={onPrev} ariaLabel="Previous insights" />
          <PagerBtn label="›" enabled={canNext} onClick={onNext} ariaLabel="Next insights" />
          <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 11.5 }}>
            {loading ? "—" : `Showing ${rangeLabel}`}
          </span>
        </div>
        <Link
          href="/insights-analysis"
          prefetch={false}
          style={{ color: T.azure, fontWeight: 500, textDecoration: "none" }}
        >
          Browse all {loading ? "—" : displayTotal} →
        </Link>
      </div>
    </LinkPanel>
  );
}
