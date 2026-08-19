"use client";
/**
 * InsightsCard — redesign/InsightsCard.jsx converted to TypeScript.
 * Two-column article rows (tag + date | headline + "Open report →")
 * with prev/next pager footer.
 */
import React, { useState, useCallback } from "react";
import Link from "next/link";
import { ContentArticle } from "@/types/insightsAnalysis";
import { hasInsightSummary } from "@/lib/insightSummary";
import { InsightSummaryModal } from "@/components/insights/InsightSummaryModal";
import {
  decodeHtmlEntities,
  getArticleByline,
  getArticleCorrections,
  isNewsArticle,
} from "@/lib/contentArticleDisplay";
import { ArticleCorrectionNotice } from "@/components/ArticleCorrectionNotice";
import { LinkPanel, LinkedH, Pill, T } from "./primitives";

// ── helpers ───────────────────────────────────────────────────────────────────
function badgeTone(
  contentType: string
): "coral" | "azure" | "emerald" | "neutral" {
  const ct = contentType.toLowerCase().trim();
  if (ct === "news") return "neutral";
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

function decodeHtmlEntitiesLocal(input: string): string {
  return decodeHtmlEntities(input);
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
  const isNews = isNewsArticle(article);
  const tag = article.Content_Type?.trim()
    ? titleCase(article.Content_Type.trim())
    : "Analysis";
  const date = article.Publication_Date ? formatDate(article.Publication_Date) : "";
  const headline = decodeHtmlEntitiesLocal(article.Headline?.trim() || "");
  const strapline = decodeHtmlEntitiesLocal(article.Strapline?.trim() || "");
  const byline = getArticleByline(article);
  const corrections = getArticleCorrections(article);
  const showSummaryBtn = !isNews && hasInsightSummary(article.summary);

  return (
    <div
      style={{
        ...insightsRowGridStyle(isLast),
        ...(isNews
          ? {
              borderLeft: `3px solid #e11d48`,
              paddingLeft: 13,
              background: "linear-gradient(90deg, #fffafb 0%, transparent 100%)",
            }
          : {}),
      }}
    >
      <div style={insightsMetaColStyle}>
        <Pill tone={tone} style={insightTagPillStyle}>
          {tag}
        </Pill>
        {isNews && byline ? (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: T.muted,
              fontStyle: "italic",
              marginTop: 8,
            }}
          >
            {byline}
          </div>
        ) : null}
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
              WebkitLineClamp: isNews ? 3 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {strapline}
          </div>
        ) : null}
        {!isNews && byline ? (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: T.muted,
              fontStyle: "italic",
              marginTop: strapline ? 6 : 0,
            }}
          >
            {byline}
          </div>
        ) : null}
        {corrections.length > 0 ? (
          <ArticleCorrectionNotice corrections={corrections} variant="card" />
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
            {isNews ? "Read more →" : "Open report →"}
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
      <InsightSummaryModal
        article={summaryArticle}
        onClose={handleCloseModal}
      />
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
