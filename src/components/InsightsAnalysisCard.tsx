"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { ContentArticle } from "@/types/insightsAnalysis";

interface InsightsAnalysisCardProps {
  article: ContentArticle;
  /**
   * Optional link override (e.g. add tracking query params).
   * Defaults to `/article/${article.id}`.
   */
  href?: string;
  /**
   * When true, shows companies and sector metadata.
   * On contextual surfaces (company / corporate event detail pages),
   * we typically hide this to keep the card compact.
   */
  showMeta?: boolean;
  /**
   * When true, places the content type badge below the publication date
   * instead of in the header row. This allows the title to span full width.
   */
  badgeBelowDate?: boolean;
  /**
   * Meta rendering style.
   * - text: legacy "Companies: a, b, c" (compact)
   * - badges: badge grid with truncation ("+N more")
   */
  metaStyle?: "text" | "badges";
}

const formatDate = (dateString: string) => {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

const decodeHtmlEntities = (input: string): string => {
  if (!input) return "";

  // Prefer DOM-based decoding when running in the browser
  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = input;
    return (div.textContent || div.innerText || "").trim();
  }

  // Fallback for server-side: handle common entities
  return input
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
};

const stripHtmlToText = (html: string | undefined | null): string => {
  if (!html) return "";

  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    // Remove heading elements so section titles don't appear in the card preview
    div.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((el) => el.remove());
    const text = (div.textContent || div.innerText || "").trim();
    return text.replace(/\s+/g, " ").trim();
  }

  // Server-side fallback: strip heading tags + their content first, then remaining tags
  return html
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatSectors = (
  sectors: Array<Array<{ sector_name: string }>> | undefined
) => {
  if (!Array.isArray(sectors) || sectors.length === 0) return "Not available";
  const allSectors = sectors
    .filter(Boolean)
    .flat()
    .filter(Boolean)
    .map((s) => decodeHtmlEntities(s?.sector_name || ""))
    .filter((name): name is string => Boolean(name && name.trim().length));
  return allSectors.length ? allSectors.join(", ") : "Not available";
};

const formatCompanies = (
  companies: ContentArticle["companies_mentioned"] | undefined
) => {
  if (!Array.isArray(companies) || companies.length === 0)
    return "Not available";
  const names = companies
    .filter(Boolean)
    .map((c) => decodeHtmlEntities(c?.name || ""))
    .filter((name): name is string => Boolean(name && name.trim().length));
  return names.length ? names.join(", ") : "Not available";
};

const getCompanyNames = (
  companies: ContentArticle["companies_mentioned"] | undefined
): string[] => {
  if (!Array.isArray(companies) || companies.length === 0) return [];
  return companies
    .filter(Boolean)
    .map((c) => decodeHtmlEntities(c?.name || ""))
    .filter((name): name is string => Boolean(name && name.trim().length));
};

const getSectorNames = (
  sectors: Array<Array<{ sector_name: string }>> | undefined
): string[] => {
  if (!Array.isArray(sectors) || sectors.length === 0) return [];
  return sectors
    .filter(Boolean)
    .flat()
    .filter(Boolean)
    .map((s) => decodeHtmlEntities(s?.sector_name || ""))
    .filter((name): name is string => Boolean(name && name.trim().length));
};

const renderBadgeList = (
  names: string[],
  badgeClassName: string,
  maxShown = 3
) => {
  const unique = Array.from(new Set(names));
  const shown = unique.slice(0, maxShown);
  const remaining = Math.max(0, unique.length - shown.length);

  return (
    <div className="badge-container">
      {shown.map((n) => (
        <span key={n} className={badgeClassName}>
          {n}
        </span>
      ))}
      {remaining > 0 && <span className="more-badge">+{remaining} more</span>}
    </div>
  );
};

const normalizeContentTypeLabel = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;
  const trimmed = decodeHtmlEntities(raw).trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

// Corporate event content sometimes omits `Content_Type`; infer it from the headline prefix
// (e.g. "Company Analysis – Premialab") so styling matches the company page cards.
const inferContentTypeFromHeadline = (headline: unknown): string | undefined => {
  const h = normalizeContentTypeLabel(headline);
  if (!h) return undefined;

  // Split on en dash/em dash/hyphen with surrounding spaces (common editorial patterns)
  const parts = h.split(/\s*[–—-]\s*/);
  const candidate = (parts[0] || "").trim();
  const c = candidate.toLowerCase();

  const known = new Map<string, string>([
    ["company analysis", "Company Analysis"],
    ["deal analysis", "Deal Analysis"],
    ["sector analysis", "Sector Analysis"],
    ["hot take", "Hot Take"],
    ["executive interview", "Executive Interview"],
  ]);
  return known.get(c) || undefined;
};

const transactionStatusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  lineHeight: 1,
  padding: "5px 10px",
  borderRadius: 9999,
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase" as const,
  backgroundColor: "#dcfce7",
  color: "#166534",
  border: "1.5px solid #4ade80",
  flexShrink: 0,
  whiteSpace: "nowrap" as const,
};

const badgeClassFor = (contentType?: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    display: "inline-block",
    fontSize: 12,
    lineHeight: 1,
    padding: "6px 10px",
    borderRadius: 9999,
    border: "1px solid transparent",
    fontWeight: 600,
  };

  const t = (contentType || "").toLowerCase();
  if (t === "company analysis") {
    return {
      ...base,
      backgroundColor: "#ecfdf5",
      color: "#065f46",
      borderColor: "#a7f3d0",
    };
  }
  if (t === "deal analysis") {
    return {
      ...base,
      backgroundColor: "#eff6ff",
      color: "#1e40af",
      borderColor: "#bfdbfe",
    };
  }
  if (t === "sector analysis") {
    return {
      ...base,
      backgroundColor: "#f5f3ff",
      color: "#5b21b6",
      borderColor: "#ddd6fe",
    };
  }
  if (t === "hot take") {
    return {
      ...base,
      backgroundColor: "#fff7ed",
      color: "#9a3412",
      borderColor: "#fed7aa",
    };
  }
  if (t === "executive interview") {
    return {
      ...base,
      backgroundColor: "#f0fdf4",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  return {
    ...base,
    backgroundColor: "#f3f4f6",
    color: "#374151",
    borderColor: "#e5e7eb",
  };
};

export const InsightsAnalysisCard: React.FC<InsightsAnalysisCardProps> = ({
  article,
  href,
  showMeta = true,
  badgeBelowDate = false,
  metaStyle = "text",
}) => {
  const router = useRouter();
  const resolvedHref = href || `/article/${article.id}`;

  // Robust content type detection across backend shapes
  const effectiveContentType = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyA = article as any;
    return (
      normalizeContentTypeLabel(anyA?.Content_Type) ||
      normalizeContentTypeLabel(anyA?.content_type) ||
      normalizeContentTypeLabel(anyA?.ContentType) ||
      normalizeContentTypeLabel(anyA?.contentType) ||
      inferContentTypeFromHeadline(anyA?.Headline)
    );
  }, [article]);

  const plainHeadline = React.useMemo(
    () => decodeHtmlEntities(article.Headline),
    [article.Headline]
  );

  const plainStrapline = React.useMemo(
    () => decodeHtmlEntities(article.Strapline),
    [article.Strapline]
  );

  const plainBody = React.useMemo(
    () => stripHtmlToText(article.Body),
    [article.Body]
  );

  const companyNames = React.useMemo(
    () => getCompanyNames(article.companies_mentioned),
    [article.companies_mentioned]
  );

  const sectorNames = React.useMemo(
    () => getSectorNames(article.sectors),
    [article.sectors]
  );

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
    router.push(resolvedHref);
  };

  return (
    <a
      href={resolvedHref}
      onClick={handleClick}
      className="content-card"
      style={{
        display: "block",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 4px 10px rgba(15, 23, 42, 0.08)",
        border: "1px solid #e2e8f0",
        padding: 20,
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        overflow: "hidden",
        wordWrap: "break-word",
        overflowWrap: "break-word",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget.style.transform = "translateY(-2px)");
        e.currentTarget.style.boxShadow =
          "0 10px 30px rgba(15, 23, 42, 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 4px 10px rgba(15, 23, 42, 0.08)";
      }}
    >
      <div className="card-header">
        {badgeBelowDate ? (
          <>
            {/* Title (full width, never squeezed) */}
            <h3
              className="card-title"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 8px 0",
                lineHeight: 1.3,
                wordWrap: "break-word",
                overflowWrap: "break-word",
                maxWidth: "100%",
              }}
            >
              {plainHeadline || "Not available"}
            </h3>

            {/* Transaction status badge – sits below the title */}
            {article.Transaction_status && (
              <div style={{ marginBottom: 8 }}>
                <span style={transactionStatusBadgeStyle}>
                  {article.Transaction_status}
                </span>
              </div>
            )}

            {/* Date */}
            <p
              className="card-date"
              style={{
                fontSize: 13,
                color: "#6b7280",
                margin: "0 0 10px 0",
                fontWeight: 500,
              }}
            >
              {formatDate(article.Publication_Date)}
            </p>

            {/* Badge (below date) */}
            {effectiveContentType && (
              <div className="content-type-row" style={{ marginBottom: 10 }}>
                <span style={badgeClassFor(effectiveContentType)}>
                  {effectiveContentType}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Header row: Title + Badge */}
            <div
              className="title-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 8,
                flexWrap: "wrap",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <h3
                className="card-title"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                  margin: 0,
                  lineHeight: 1.3,
                  flex: 1,
                  minWidth: 0,
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {plainHeadline || "Not available"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                {effectiveContentType && (
                  <span style={{ ...badgeClassFor(effectiveContentType), flexShrink: 0 }}>
                    {effectiveContentType}
                  </span>
                )}
                {article.Transaction_status && (
                  <span style={transactionStatusBadgeStyle}>
                    {article.Transaction_status}
                  </span>
                )}
              </div>
            </div>

            {/* Date */}
            <p
              className="card-date"
              style={{
                fontSize: 13,
                color: "#6b7280",
                margin: "0 0 10px 0",
                fontWeight: 500,
              }}
            >
              {formatDate(article.Publication_Date)}
            </p>
          </>
        )}
      </div>

      <div className="card-body">
        {/* Strapline */}
        {plainStrapline && (
          <p
            className="strapline"
            style={{
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.5,
              margin: "0 0 10px 0",
              fontWeight: 500,
              wordWrap: "break-word",
              overflowWrap: "break-word",
              maxWidth: "100%",
            }}
          >
            {plainStrapline}
          </p>
        )}

        {/* First three lines of main content body */}
        {plainBody && (
          <p
            className="description"
            style={{
              fontSize: 14,
              color: "#4b5563",
              lineHeight: 1.6,
              margin: "0 0 12px 0",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              maxWidth: "100%",
            }}
          >
            {plainBody}
          </p>
        )}

        {/* Optional meta (companies and sectors) */}
        {showMeta && metaStyle === "text" && (
          <div
            className="meta-text"
            style={{
              marginBottom: 10,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {companyNames.length > 0 && (
              <div
                style={{
                  marginBottom: 8,
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginRight: 6,
                  }}
                >
                  Companies:
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {formatCompanies(article.companies_mentioned)}
                </span>
              </div>
            )}
            {sectorNames.length > 0 && (
              <div
                style={{
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginRight: 6,
                  }}
                >
                  Sectors:
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {formatSectors(article.sectors)}
                </span>
              </div>
            )}
          </div>
        )}

        {showMeta && metaStyle === "badges" && (
          <div className="meta-badges">
            {companyNames.length > 0 && (
              <div className="meta-section">
                <div className="meta-label">Companies</div>
                {renderBadgeList(companyNames, "company-badge")}
              </div>
            )}
            {sectorNames.length > 0 && (
              <div className="meta-section">
                <div className="meta-label">Sectors</div>
                {renderBadgeList(sectorNames, "sector-badge")}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        {/* Read more */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#2563eb",
              textDecoration: "underline",
            }}
          >
            Read More
          </span>
        </div>
      </div>
    </a>
  );
};

export default InsightsAnalysisCard;


