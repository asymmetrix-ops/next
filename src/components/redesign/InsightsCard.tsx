"use client";
/**
 * InsightsCard — redesign/InsightsCard.jsx converted to TypeScript.
 * Two-column article rows (tag + date | headline + "Open report →")
 * with prev/next pager footer.
 */
import React, { useState, useCallback } from "react";
import Link from "next/link";
import { ContentArticle } from "@/types/insightsAnalysis";
import { LinkPanel, LinkedH, Pill, T } from "./primitives";

// ── Summary parsing (mirrors article page logic) ──────────────────────────────
function extractSummaryItemsFromHtml(html: string): string[] {
  const trimmed = (html || "").trim();
  if (!trimmed) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<div id="__sr__">${trimmed}</div>`,
      "text/html"
    );
    const root = doc.getElementById("__sr__");
    if (!root) return [trimmed];
    const liEls = Array.from(root.querySelectorAll("li"));
    if (liEls.length > 0)
      return liEls.map((li) => (li.innerHTML || "").trim()).filter(Boolean);
    const pEls = Array.from(root.querySelectorAll("p"));
    if (pEls.length > 0)
      return pEls.map((p) => (p.innerHTML || "").trim()).filter(Boolean);
    const children = Array.from(root.children);
    if (children.length > 0)
      return children.map((el) => (el.innerHTML || "").trim()).filter(Boolean);
    const text = (root.textContent || "").trim();
    return text ? [text] : [];
  } catch {
    return [trimmed];
  }
}

function parseSummaryItems(val: unknown): string[] {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) {
    const items = (val as unknown[])
      .map((x) => (typeof x === "string" ? x : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
    return items
      .flatMap((s) => (s.includes("<") ? extractSummaryItemsFromHtml(s) : [s]))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseSummaryItems(parsed);
    } catch { /* not JSON */ }
    const htmlItems = extractSummaryItemsFromHtml(trimmed);
    if (htmlItems.length > 0) return htmlItems;
    return [trimmed];
  }
  return [];
}

function hasSummary(article: ContentArticle): boolean {
  return parseSummaryItems(article.summary).length > 0;
}

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
        padding: "14px 16px",
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
        padding: "14px 16px",
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div>
        <Pill tone={item.tone}>{item.tag}</Pill>
        <div
          style={{
            fontSize: 12,
            color: T.muted,
            fontVariantNumeric: "tabular-nums",
            marginTop: 8,
          }}
        >
          {item.date}
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: T.body,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "calc(1.55em * 3)",
          }}
        >
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

// ── Summary modal ─────────────────────────────────────────────────────────────
function SummaryModal({
  article,
  onClose,
}: {
  article: ContentArticle;
  onClose: () => void;
}) {
  const items = parseSummaryItems(article.summary);
  const headline = article.Headline?.trim() || "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,17,21,0.45)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.panel,
          borderRadius: 12,
          padding: "24px 28px",
          width: "100%",
          maxWidth: 560,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          fontFamily: T.sans,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              lineHeight: 1.45,
              flex: 1,
            }}
          >
            {headline}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: T.muted,
              lineHeight: 1,
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Summary label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.muted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          Summary
        </div>

        {/* Bullet items */}
        <ul
          style={{
            margin: 0,
            padding: "0 0 0 18px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{ fontSize: 13, lineHeight: 1.6, color: T.body }}
              dangerouslySetInnerHTML={{ __html: item }}
            />
          ))}
        </ul>

        {/* Footer link */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.hair}` }}>
          <Link
            href={`/article/${article.id}`}
            prefetch={false}
            style={{
              color: T.azure,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Open full report →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── article row ──────────────────────────────────────────────────────────────
function ArticleRow({
  article,
  onViewSummary,
}: {
  article: ContentArticle;
  onViewSummary: (a: ContentArticle) => void;
}) {
  const tone = badgeTone(article.Content_Type || "");
  const tag = article.Content_Type?.trim()
    ? titleCase(article.Content_Type.trim())
    : "Analysis";
  const date = article.Publication_Date ? formatDate(article.Publication_Date) : "";
  const headline = [article.Headline?.trim(), article.Strapline?.trim()]
    .filter(Boolean)
    .join(" ") || "—";
  const showSummaryBtn = hasSummary(article);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 16,
        padding: "14px 16px",
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div>
        <Pill tone={tone}>{tag}</Pill>
        <div
          style={{
            fontSize: 12,
            color: T.muted,
            fontVariantNumeric: "tabular-nums",
            marginTop: 8,
          }}
        >
          {date || "—"}
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: T.body,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "calc(1.55em * 3)",
          }}
        >
          {headline}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 8,
          }}
        >
          <Link
            href={`/article/${article.id}`}
            prefetch={false}
            style={{ color: T.azure, fontSize: 12.5, fontWeight: 500, textDecoration: "none" }}
          >
            Open report →
          </Link>
          {showSummaryBtn && (
            <button
              type="button"
              onClick={() => onViewSummary(article)}
              style={{
                background: "none",
                border: `1px solid ${T.divider}`,
                borderRadius: 4,
                cursor: "pointer",
                color: T.body,
                fontSize: 11.5,
                fontWeight: 500,
                fontFamily: T.sans,
                padding: "2px 8px",
                lineHeight: 1.5,
              }}
            >
              View summary
            </button>
          )}
        </div>
      </div>
    </div>
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

  const [summaryArticle, setSummaryArticle] = useState<ContentArticle | null>(null);
  const handleViewSummary = useCallback((a: ContentArticle) => setSummaryArticle(a), []);
  const handleCloseModal = useCallback(() => setSummaryArticle(null), []);

  return (
    <>
    {summaryArticle && (
      <SummaryModal article={summaryArticle} onClose={handleCloseModal} />
    )}
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH
        showArrow={false}
        right={
          <Link
            href="/insights-analysis"
            prefetch={false}
            style={{
              color: T.azure,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            →
          </Link>
        }
      >
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
        articles.map((a) => (
          <ArticleRow key={a.id} article={a} onViewSummary={handleViewSummary} />
        ))
      )}

      {/* footer pager */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderTop: `1px solid ${T.hair}`,
          fontFamily: T.sans,
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PagerBtn label="‹" enabled={canPrev} onClick={onPrev} ariaLabel="Previous insights" />
          <PagerBtn label="›" enabled={canNext} onClick={onNext} ariaLabel="Next insights" />
          <span style={{ color: T.muted, fontSize: 12 }}>
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
    </>
  );
}
