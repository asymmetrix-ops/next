"use client";

/**
 * Unified Insights & Analysis report card.
 *
 * Matches the "New Design" mockup's `.grid` > `.ic` article card: a 3px
 * content-type accent bar, a top row with a content-type dot-chip (plus
 * series part pips / "Part N of M" chip + prev/next controls for series
 * articles), a clamped headline (with an optional inline HQ country flag),
 * a byline/date row, a clamped summary (rendered as an italic pull-quote
 * for Executive Interview articles), a "coverage" section (Companies /
 * Sectors, truncated to a handful of names + "+N more"), and a footer row
 * with a neutral entity-count chip and a "Read {verb} →" link.
 *
 * Handles all three legacy shapes from this single component: the plain
 * article-card, the news-card, and the multi-part series card (folding in
 * the part-navigation behaviour previously in SeriesArticleCard.tsx).
 */
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentArticle } from "@/types/insightsAnalysis";
import { T } from "@/components/redesign/primitives";
import {
  decodeHtmlEntities,
  getArticleByline,
  getEffectiveContentType,
  isNewsArticle,
} from "@/lib/contentArticleDisplay";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import { COUNTRY_FLAG_INLINE_SIZE_PX } from "@/lib/dealRadar";
import { getInsightHqCountryIso2 } from "@/lib/insightCountry";

const INSIGHT_FLAG_SIZE_PX = COUNTRY_FLAG_INLINE_SIZE_PX * 1.5;
const MAX_NAMES_SHOWN = 4;

// ── Content-type → accent color/dot/verb (mirrors src/lib/contentTypeBadge.ts) ──
type AccentSet = { fg: string; bg: string; border: string };

const ACCENT_AZURE: AccentSet = { fg: T.azure, bg: T.azureSoft, border: "#E2E8FD" };
const ACCENT_LAVENDER: AccentSet = { fg: T.lavender, bg: T.lavenderSoft, border: "#E2D5F8" };
const ACCENT_EMERALD: AccentSet = { fg: T.emerald, bg: T.emeraldSoft, border: "#C8EBD9" };
const ACCENT_CORAL: AccentSet = { fg: T.coral, bg: T.coralSoft, border: "#F8D4CD" };
const ACCENT_WARN: AccentSet = { fg: T.warn, bg: T.warnSoft, border: "#FBE8B8" };
const ACCENT_NEUTRAL: AccentSet = { fg: T.muted, bg: T.inset, border: T.divider };

function getAccentSet(contentType?: string): AccentSet {
  const t = (contentType || "").toLowerCase();
  if (t === "company analysis" || t === "company update") return ACCENT_AZURE;
  if (t === "sector analysis") return ACCENT_LAVENDER;
  if (t === "executive interview") return ACCENT_EMERALD;
  if (t === "news") return ACCENT_CORAL;
  if (
    t === "deal analysis" ||
    t === "deal perspective" ||
    t === "hot take" ||
    t === "market commentary"
  )
    return ACCENT_WARN;
  return ACCENT_NEUTRAL;
}

function getReadMoreVerb(contentType?: string): string {
  const t = (contentType || "").toLowerCase();
  if (t === "executive interview") return "interview";
  if (t === "news") return "more";
  return "report";
}

// Corporate event content sometimes omits `Content_Type`; infer it from the headline prefix
// (e.g. "Company Analysis – Premialab") so styling matches the company page cards.
function inferContentTypeFromHeadline(headline: unknown): string | undefined {
  if (typeof headline !== "string") return undefined;
  const h = decodeHtmlEntities(headline).trim();
  if (!h) return undefined;
  const candidate = (h.split(/\s*[–—-]\s*/)[0] || "").trim().toLowerCase();
  const known = new Map<string, string>([
    ["company analysis", "Company Analysis"],
    ["deal analysis", "Deal Analysis"],
    ["sector analysis", "Sector Analysis"],
    ["hot take", "Hot Take"],
    ["executive interview", "Executive Interview"],
  ]);
  return known.get(candidate);
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

function getCompanyNames(
  companies: ContentArticle["companies_mentioned"] | undefined
): string[] {
  if (!Array.isArray(companies) || companies.length === 0) return [];
  return companies
    .filter(Boolean)
    .map((c) => decodeHtmlEntities(c?.name || ""))
    .filter((name): name is string => Boolean(name && name.trim().length));
}

function getSectorNames(
  sectors: Array<Array<{ sector_name: string }>> | undefined
): string[] {
  if (!Array.isArray(sectors) || sectors.length === 0) return [];
  return sectors
    .filter(Boolean)
    .flat()
    .filter(Boolean)
    .map((s) => decodeHtmlEntities(s?.sector_name || ""))
    .filter((name): name is string => Boolean(name && name.trim().length));
}

/** "A, B, C, D +3 more" — truncates to `max` names, joined by comma. */
function truncatedList(names: string[], max = MAX_NAMES_SHOWN): string {
  const unique = Array.from(new Set(names));
  if (unique.length === 0) return "-";
  const shown = unique.slice(0, max);
  const remaining = unique.length - shown.length;
  return remaining > 0
    ? `${shown.join(", ")} +${remaining} more`
    : shown.join(", ");
}

const coverageRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  fontSize: 12.5,
  lineHeight: 1.45,
};

const coverageLabelStyle: React.CSSProperties = {
  flexShrink: 0,
  fontWeight: 600,
  color: T.ink,
};

const coverageValueStyle: React.CSSProperties = {
  color: T.muted,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
};

interface InsightsAnalysisCardProps {
  article: ContentArticle;
}

export const InsightsAnalysisCard: React.FC<InsightsAnalysisCardProps> = ({
  article,
}) => {
  const router = useRouter();

  const isSeries = Boolean(article.is_series && article.series);
  const isNews = isNewsArticle(article);

  const sortedParts = useMemo(
    () =>
      isSeries
        ? [...(article.series?.parts || [])].sort(
            (a, b) => a.part_number - b.part_number
          )
        : [],
    [isSeries, article.series]
  );

  const initialIndex = useMemo(() => {
    if (!isSeries) return 0;
    const byId = sortedParts.findIndex((p) => p.id === article.id);
    if (byId >= 0) return byId;
    const byPartNumber = sortedParts.findIndex(
      (p) => p.part_number === article.series?.current_part
    );
    return byPartNumber >= 0 ? byPartNumber : 0;
  }, [isSeries, sortedParts, article.id, article.series]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activePart = isSeries ? sortedParts[activeIndex] ?? sortedParts[0] : undefined;
  const canGoPrev = isSeries && activeIndex > 0;
  const canGoNext = isSeries && activeIndex < sortedParts.length - 1;

  const effectiveContentType =
    getEffectiveContentType(article) ||
    inferContentTypeFromHeadline(article.Headline) ||
    "";
  const isInterview = effectiveContentType.toLowerCase() === "executive interview";
  const accent = getAccentSet(effectiveContentType);
  const readMoreVerb = getReadMoreVerb(effectiveContentType);

  const linkedArticleId = activePart?.id ?? article.id;
  const displayHeadline = decodeHtmlEntities(
    activePart?.headline || article.Headline || ""
  );
  const displayDate = activePart?.publication_date || article.Publication_Date;
  const byline = isNews ? getArticleByline(article) : "";
  const plainSummary = decodeHtmlEntities(article.Strapline || "");

  const hqCountryIso2 = getInsightHqCountryIso2(
    article as unknown as Record<string, unknown>
  );

  const companyNames = getCompanyNames(article.companies_mentioned);
  const sectorNames = getSectorNames(article.sectors);
  const companyCount = companyNames.length;

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    router.push(`/article/${linkedArticleId}`);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoPrev) setActiveIndex((i) => i - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoNext) setActiveIndex((i) => i + 1);
  };

  return (
    <a
      href={`/article/${linkedArticleId}`}
      onClick={handleCardClick}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        background: T.panel,
        borderRadius: T.rLg,
        border: `1px solid ${T.divider}`,
        boxShadow:
          "0 1px 3px rgba(16, 28, 70, 0.06), 0 1px 2px rgba(16, 28, 70, 0.04)",
        textDecoration: "none",
        color: "inherit",
        overflow: "hidden",
        fontFamily: T.sans,
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = T.cardHoverShadow;
        e.currentTarget.style.borderColor = T.cardHoverBorder;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 1px 3px rgba(16, 28, 70, 0.06), 0 1px 2px rgba(16, 28, 70, 0.04)";
        e.currentTarget.style.borderColor = T.divider;
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, flexShrink: 0, background: accent.fg }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "14px 16px 16px",
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Top row: content-type chip (+ series controls) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {effectiveContentType ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.01em",
                color: accent.fg,
                background: accent.bg,
                border: `1px solid ${accent.border}`,
                borderRadius: 999,
                padding: "4px 10px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: accent.fg,
                  flexShrink: 0,
                }}
              />
              {effectiveContentType}
            </span>
          ) : (
            <span />
          )}

          {isSeries && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {sortedParts.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  aria-label="Previous part in series"
                  style={seriesArrowStyle(canGoPrev)}
                >
                  ‹
                </button>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase" as const,
                  color: T.lavender,
                  background: T.lavenderSoft,
                  border: `1px solid ${T.lavender}33`,
                  borderRadius: 999,
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {sortedParts.length > 1 && (
                  <span style={{ display: "inline-flex", gap: 3 }}>
                    {sortedParts.map((part, idx) => (
                      <span
                        key={part.id}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 999,
                          background:
                            idx === activeIndex ? T.lavender : "#E2E8FD",
                        }}
                      />
                    ))}
                  </span>
                )}
                Part {activePart?.part_number ?? article.series?.current_part} of{" "}
                {article.series?.total_parts}
              </span>
              {sortedParts.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  aria-label="Next part in series"
                  style={seriesArrowStyle(canGoNext)}
                >
                  ›
                </button>
              )}
            </div>
          )}
        </div>

        {/* Headline */}
        <h3
          style={{
            margin: 0,
            fontSize: 16.5,
            fontWeight: 700,
            color: T.ink,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {displayHeadline || "-"}
          {hqCountryIso2 ? (
            <span style={{ display: "inline-block", marginLeft: 8, verticalAlign: "middle" }}>
              <CountryFlagImg iso2={hqCountryIso2} size={INSIGHT_FLAG_SIZE_PX} />
            </span>
          ) : null}
        </h3>

        {/* Byline / date row */}
        <p style={{ margin: 0, fontSize: 12.5, color: T.muted, fontWeight: 500 }}>
          {isNews && byline ? `${formatDate(displayDate)} · ${byline}` : formatDate(displayDate)}
        </p>

        {/* Transaction status */}
        {article.Transaction_status && (
          <span
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 10.5,
              lineHeight: 1,
              padding: "5px 10px",
              borderRadius: 999,
              border: `1.5px solid ${T.emerald}`,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase" as const,
              background: T.emeraldSoft,
              color: T.emerald,
              whiteSpace: "nowrap",
            }}
          >
            {article.Transaction_status}
          </span>
        )}

        {/* Summary */}
        {isInterview ? (
          <blockquote
            style={{
              margin: 0,
              padding: "2px 0 2px 12px",
              borderLeft: `3px solid ${T.emeraldSoft}`,
              fontStyle: "italic",
              fontSize: 13.5,
              color: T.body,
              lineHeight: 1.55,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {plainSummary || "No summary available"}
          </blockquote>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: T.body,
              lineHeight: 1.55,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {plainSummary || "No summary available"}
          </p>
        )}

        {/* Coverage */}
        {(companyNames.length > 0 || sectorNames.length > 0) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              paddingTop: 8,
              marginTop: "auto",
              borderTop: `1px solid ${T.hair}`,
            }}
          >
            {companyNames.length > 0 && (
              <div style={coverageRowStyle}>
                <span style={coverageLabelStyle}>Companies:</span>
                <span style={coverageValueStyle}>
                  {truncatedList(companyNames)}
                </span>
              </div>
            )}
            {sectorNames.length > 0 && (
              <div style={coverageRowStyle}>
                <span style={coverageLabelStyle}>Sectors:</span>
                <span style={coverageValueStyle}>
                  {truncatedList(sectorNames)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            paddingTop:
              companyNames.length > 0 || sectorNames.length > 0 ? 4 : 8,
            marginTop:
              companyNames.length > 0 || sectorNames.length > 0
                ? 0
                : "auto",
            borderTop:
              companyNames.length > 0 || sectorNames.length > 0
                ? "none"
                : `1px solid ${T.hair}`,
          }}
        >
          {companyCount > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 11.5,
                fontWeight: 600,
                color: T.muted,
                background: T.inset,
                borderRadius: 999,
                padding: "4px 10px",
                whiteSpace: "nowrap",
              }}
            >
              {companyCount} {companyCount === 1 ? "company" : "companies"}
            </span>
          ) : (
            <span />
          )}
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: T.azure,
              whiteSpace: "nowrap",
            }}
          >
            Read {readMoreVerb} →
          </span>
        </div>
      </div>
    </a>
  );
};

function seriesArrowStyle(enabled: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 999,
    border: `1px solid ${T.lavender}55`,
    background: T.panel,
    color: T.lavender,
    fontSize: 14,
    lineHeight: 1,
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    opacity: enabled ? 1 : 0.35,
    flexShrink: 0,
  };
}

export default InsightsAnalysisCard;
