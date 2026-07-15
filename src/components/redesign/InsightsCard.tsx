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
    if (htmlItems.length > 1) return htmlItems;
    if (htmlItems.length === 1) {
      const lines = htmlItems[0]
        .split(/\r?\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length > 1) return lines;
      return htmlItems;
    }
    const lines = trimmed
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : [trimmed];
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

function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = input;
    return (div.textContent || div.innerText || "").trim();
  }
  return input
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

// ── skeleton row ─────────────────────────────────────────────────────────────
/** Minimum list height for two insight rows (keeps pager from jumping). */
const INSIGHTS_LIST_MIN_HEIGHT = 220;
const INSIGHTS_ROW_SLOT_MIN_HEIGHT = 100;
const INSIGHTS_META_COL_WIDTH = 140;

const insightsRowGridStyle = (isLast = false): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `${INSIGHTS_META_COL_WIDTH}px 1fr`,
  gap: 16,
  padding: "14px 16px",
  borderBottom: isLast ? "none" : `1px solid ${T.hair}`,
  minWidth: 0,
});

const insightsMetaColStyle: React.CSSProperties = {
  minWidth: 0,
  maxWidth: INSIGHTS_META_COL_WIDTH,
};

/** Long content-type labels must wrap inside the meta column (Pill defaults to nowrap). */
const insightTagPillStyle: React.CSSProperties = {
  display: "inline-block",
  maxWidth: "100%",
  whiteSpace: "normal",
  wordBreak: "break-word",
  boxSizing: "border-box",
};

function SkeletonRow({
  flexSlot = false,
  isLast = false,
}: {
  flexSlot?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        ...insightsRowGridStyle(isLast),
        ...(flexSlot ? { flex: 1, minHeight: INSIGHTS_ROW_SLOT_MIN_HEIGHT } : {}),
      }}
    >
      <div style={{ height: 18, background: T.inset, borderRadius: 4 }} />
      <div style={{ height: 36, background: T.inset, borderRadius: 4 }} />
    </div>
  );
}

function InsightRowPlaceholder({ isLast = false }: { isLast?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        flex: 1,
        minHeight: INSIGHTS_ROW_SLOT_MIN_HEIGHT,
        borderBottom: isLast ? "none" : `1px solid ${T.hair}`,
      }}
    />
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
          <Link
            href={`/article/${article.id}`}
            prefetch={false}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              lineHeight: 1.45,
              flex: 1,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = T.azure;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = T.ink;
            }}
          >
            {headline}
          </Link>
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
            paddingLeft: 20,
            listStyleType: "disc",
            listStylePosition: "outside",
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: T.body,
                marginBottom: i < items.length - 1 ? 10 : 0,
                display: "list-item",
              }}
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
  isLast = false,
}: {
  article: ContentArticle;
  onViewSummary: (a: ContentArticle) => void;
  isLast?: boolean;
}) {
  const tone = badgeTone(article.Content_Type || "");
  const tag = article.Content_Type?.trim()
    ? titleCase(article.Content_Type.trim())
    : "Analysis";
  const date = article.Publication_Date ? formatDate(article.Publication_Date) : "";
  const headline = decodeHtmlEntities(article.Headline?.trim() || "");
  const strapline = decodeHtmlEntities(article.Strapline?.trim() || "");
  const showSummaryBtn = hasSummary(article);

  return (
    <div style={insightsRowGridStyle(isLast)}>
      <div style={insightsMetaColStyle}>
        <Pill tone={tone} style={insightTagPillStyle}>
          {tag}
        </Pill>
        <div
          style={{
            fontSize: 13,
            color: T.muted,
            fontVariantNumeric: "tabular-nums",
            marginTop: 8,
          }}
        >
          {date || "-"}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        {headline ? (
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              lineHeight: 1.4,
              color: T.ink,
              marginBottom: strapline ? 6 : 0,
            }}
          >
            {headline}
          </div>
        ) : null}
        {strapline ? (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: T.body,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {strapline}
          </div>
        ) : null}
        {!headline && !strapline ? (
          <div style={{ fontSize: 13, color: T.muted }}>-</div>
        ) : null}
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
            style={{ color: T.azure, fontSize: 13, fontWeight: 500, textDecoration: "none" }}
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
  /** 1-based index from API `showing_from` */
  rangeStart: number;
  /** 1-based index from API `showing_to` */
  rangeEnd: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  fillGridCell?: boolean;
  /** When set, "Browse all" links to I&A pre-filtered by this company */
  companyId?: number | null;
  companyName?: string;
  title?: string;
  browseAllHref?: string;
  emptyMessage?: string;
  /** Number of article rows rendered (API page size). */
  previewCount?: number;
};

export function InsightsCard({
  articles,
  loading,
  totalCount,
  rangeStart,
  rangeEnd,
  canPrev,
  canNext,
  onPrev,
  onNext,
  fillGridCell = false,
  companyId,
  companyName,
  title = "Recent Insights & Analysis",
  browseAllHref,
  emptyMessage = "No insights available for this company.",
  previewCount = 2,
}: Props) {
  const isEmpty = !loading && totalCount === 0;
  const rangeLabel =
    totalCount > 0 ? `${rangeStart}–${rangeEnd} of ${totalCount}` : "0 of 0";

  const [summaryArticle, setSummaryArticle] = useState<ContentArticle | null>(null);
  const handleViewSummary = useCallback((a: ContentArticle) => setSummaryArticle(a), []);
  const handleCloseModal = useCallback(() => setSummaryArticle(null), []);

  const resolvedBrowseAllHref =
    browseAllHref ??
    (companyId != null && companyId > 0
      ? `/insights-analysis?company_id=${companyId}${
          companyName?.trim()
            ? `&company_name=${encodeURIComponent(companyName.trim())}`
            : ""
        }`
      : "/insights-analysis");

  return (
    <>
    {summaryArticle && (
      <SummaryModal article={summaryArticle} onClose={handleCloseModal} />
    )}
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>{title}</LinkedH>

      <div
        style={{
          flex: fillGridCell ? 1 : undefined,
          minHeight: fillGridCell ? 0 : INSIGHTS_LIST_MIN_HEIGHT,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <>
            <SkeletonRow flexSlot />
            <SkeletonRow flexSlot isLast />
          </>
        ) : isEmpty ? (
          <div
            style={{
              flex: fillGridCell ? 1 : undefined,
              minHeight: fillGridCell ? INSIGHTS_ROW_SLOT_MIN_HEIGHT : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px",
              color: T.muted,
              fontSize: 13,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          <>
            {Array.from({ length: previewCount }).map((_, slotIndex) => {
              const article = articles[slotIndex];
              const isLastSlot = slotIndex === previewCount - 1;
              if (article) {
                return (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    onViewSummary={handleViewSummary}
                    isLast={isLastSlot}
                  />
                );
              }
              return (
                <InsightRowPlaceholder
                  key={`insights-row-pad-${slotIndex}`}
                  isLast={isLastSlot}
                />
              );
            })}
          </>
        )}
      </div>

      {/* footer pager — top border is the sole separator above the footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderTop: `1px solid ${T.hair}`,
          fontFamily: T.sans,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PagerBtn label="‹" enabled={canPrev} onClick={onPrev} ariaLabel="Previous insights" />
          <PagerBtn label="›" enabled={canNext} onClick={onNext} ariaLabel="Next insights" />
          <span style={{ color: T.muted, fontSize: 13 }}>
            {loading ? "-" : `Showing ${rangeLabel}`}
          </span>
        </div>
        <Link
          href={resolvedBrowseAllHref}
          prefetch={false}
          style={{ color: T.azure, fontWeight: 500, textDecoration: "none" }}
        >
          Browse all{loading || totalCount === 0 ? "" : ` ${totalCount}`} →
        </Link>
      </div>
    </LinkPanel>
    </>
  );
}
