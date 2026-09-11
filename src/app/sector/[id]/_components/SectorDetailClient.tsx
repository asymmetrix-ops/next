"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScopedCompaniesPanel } from "@/components/companies/ScopedCompaniesPanel";
import { ScopedCorporateEventsPanel } from "@/components/corporate-events/ScopedCorporateEventsPanel";
import CompactPagination from "@/components/ui/CompactPagination";
import {
  SectorMostActiveTab,
  type MostActiveSubTabId,
} from "@/components/sector/SectorMostActiveTab";
import {
  mapRankedEntities,
  renderMostRecentTargetValue,
  toStringSafe,
  extractArray,
  getFirstMatchingValue,
  getFirstMatchingNumber,
  type RankedEntity,
} from "@/lib/sectorMostActiveRanked";
import { locationsService } from "@/lib/locationsService";
import {
  getArticleByline,
  isNewsArticle,
  normalizeContentArticles,
} from "@/lib/contentArticleDisplay";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import {
  ContentArticle,
  InsightsAnalysisResponse,
  InsightsAnalysisFilters,
} from "@/types/insightsAnalysis";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import { exportMarketMapBucket } from "@/lib/listExport/marketMapExport";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import {
  getContentTypeAccentColor,
  getContentTypeBadgeStyle,
} from "@/lib/contentTypeBadge";
import { getInsightsTypeTone } from "@/lib/tagColors";
import { TransactionStatusPill } from "@/components/tags/TransactionStatusPill";

// ── Design tokens — exact values from ui_kits/landing/landing.css "--lp-*" ──
// (same convention as src/app/sectors/page.tsx)
const LINE = "#E4E8F2";
const LINE_2 = "#EFF2F8";
const INK = "#0A0E1A";
const INK_2 = "#1E2536";
const INK_3 = "#3D4657";
const BODY = "#566078";
const MUTED = "#6B7488";
const MUTED_SOFT = "#8A93A8";
const EMPTY = "#6B7488";
const TINT = "#F5F7FD";
const BLUE_50 = "#F1F4FE";
const BLUE_200 = "#C6D1FB";
const BLUE_600 = "#2A46EA";
const BLUE_700 = "#1F35C4";
const R_LG = 16;
const R_SM = 8;
const SH_SM = "0 1px 3px rgba(16, 28, 70, 0.06), 0 1px 2px rgba(16, 28, 70, 0.04)";
const SH_XS = "0 1px 2px rgba(16, 28, 70, 0.05)";

// Semantic ownership colors (matches CompanySection.tsx OwnershipChip / sectors/page.tsx)
const OWNERSHIP_DOT: Record<string, string> = {
  public: "#7A5BD0",
  private_equity_owned: "#3D5BF3",
  venture_capital_backed: "#17A05C",
  private: "#E0A32E",
};

function contentTypeFilterDot(contentType: string): string {
  const tone = getInsightsTypeTone(contentType);
  return tone.dot || tone.text;
}

// Types for API integration
interface SectorData {
  id: number;
  created_at: number;
  sector_name: string;
  Sector_importance: string;
  Related_to_primary_sectors: string[];
  company_ids: string;
  Sector_thesis: string;
}

interface SectorTotalsRow {
  id: number;
  sector_name: string;
  Number_of_Companies: number;
  Number_of_PE?: number;
  Number_of_VC?: number;
  Number_of_Public?: number;
  Number_of_Private?: number;
  Number_of_Subsidiaries_Acquired?: number;
}

interface SectorStatistics {
  // New shape: array with totals row
  Total_number_of_companies: number | Array<SectorTotalsRow>;
  // Legacy fields (may still be present)
  Number_Of_Public_Companies?: number;
  Number_Of_PE_Companies?: number;
  "Number_of_VC-owned_companies"?: number;
  Number_of_private_companies?: number;
  Number_of_subsidiaries?: number;
  Sector: SectorData;
  // Optional dashboard fields (new JSON the user provided)
  resent_trasnactions?: unknown[]; // note: source may have a misspelling
  recent_transactions?: unknown[]; // normalized alt key just in case
  strategic_acquirers?: unknown[];
  pe_investors?: unknown[];
  market_map?: unknown;
}

const normalizeContentTypeLabel = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const inferContentTypeFromHeadline = (headline: unknown): string | undefined => {
  const normalizedHeadline = normalizeContentTypeLabel(headline);
  if (!normalizedHeadline) return undefined;

  const parts = normalizedHeadline.split(/\s*[–—-]\s*/);
  const candidate = (parts[0] || "").trim().toLowerCase();

  const known = new Map<string, string>([
    ["company analysis", "Company Analysis"],
    ["deal analysis", "Deal Analysis"],
    ["deal perspective", "Deal Perspective"],
    ["market commentary", "Market Commentary"],
    ["sector analysis", "Sector Analysis"],
    ["hot take", "Hot Take"],
    ["executive interview", "Executive Interview"],
  ]);

  return known.get(candidate);
};

const getEffectiveContentType = (article: ContentArticle): string | undefined => {
  const anyArticle = article as ContentArticle & {
    content_type?: unknown;
    ContentType?: unknown;
    contentType?: unknown;
  };

  return (
    normalizeContentTypeLabel(anyArticle.Content_Type) ||
    normalizeContentTypeLabel(anyArticle.content_type) ||
    normalizeContentTypeLabel(anyArticle.ContentType) ||
    normalizeContentTypeLabel(anyArticle.contentType) ||
    inferContentTypeFromHeadline(anyArticle.Headline)
  );
};

interface SectorCompany {
  id: number;
  name: string;
  locations_id: number;
  url: string;
  sectors: string[];
  primary_sectors: SectorLinkItem[];
  description: string;
  linkedin_employee: number;
  linkedin_employee_latest: number;
  linkedin_employee_old: number;
  linkedin_logo: string;
  country: string;
  ownership_type_id: number;
  ownership: string;
  is_that_investor: boolean;
  companies_investors: Array<{
    company_name: string;
    original_new_company_id: number;
  }>;
}

// Response shape for the new companies endpoint used on sector page
type SectorLinkItem =
  | string
  | {
      sector_name?: string;
      Sector_name?: string;
      name?: string;
      id?: number;
      sector_id?: number;
      sectorId?: number;
    };

const getSectorLabel = (sector: SectorLinkItem): string => {
  const name =
    typeof sector === "string"
      ? sector
      : sector?.sector_name || sector?.Sector_name || sector?.name;
  return String(name ?? "").trim();
};

// Sub-sectors
interface SubSector {
  id: number;
  sector_name: string;
  Sector_importance: string;
}

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

// Data mapping helpers for dashboard JSON
interface TransactionRecord {
  date: string;
  buyer: string;
  seller?: string;
  target: string;
  value?: string;
  type?: string;
  targetLogoUrl?: string;
  eventId?: number;
  targetCompanyId?: number;
}

function cleanInvestorSetString(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1);
    return inner
      .split(",")
      .map((part) => part.trim().replace(/^\"|\"$/g, ""))
      .filter((s) => s.length > 0)
      .join(", ");
  }
  return raw;
}

function mapRecentTransactions(raw: unknown): TransactionRecord[] {
  const arr = extractArray(raw);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      const date = toStringSafe(
        getFirstMatchingValue(obj, [
          "deal_date",
          "date",
          "announcement_date",
          "closed_date",
          "deal date",
        ])
      );
      const buyerRaw = toStringSafe(
        getFirstMatchingValue(obj, [
          "buyer_name",
          "acquirer",
          "buyer",
          "acquirer_name",
          "buyer company",
          "acquirer company",
          "buyer_company",
          "acquirer_company",
          "buyer_investor",
        ])
      );
      const buyer = cleanInvestorSetString(buyerRaw);
      const seller = toStringSafe(
        getFirstMatchingValue(obj, [
          "seller_name",
          "seller",
          "seller company",
          "seller_company",
        ]) || ""
      );
      const target = toStringSafe(
        getFirstMatchingValue(obj, [
          "target_name",
          "company",
          "target",
          "asset",
          "target company",
          "target_company",
          "target_company_name",
          "company_name",
          "name",
        ])
      );
      const targetCompanyId = getFirstMatchingNumber(obj, [
        "Target_company_id",
        "target_company_id",
        "company_id",
        "target_id",
      ]);
      const value = toStringSafe(
        getFirstMatchingValue(obj, [
          "value_usd",
          "value",
          "deal_value",
          "amount",
          "deal size",
          "deal_value_usd",
          "investment_amount_m",
        ])
      );
      const type = toStringSafe(
        getFirstMatchingValue(obj, [
          "type",
          "deal_type",
          "transaction_type",
          "category",
          "structure",
        ])
      );
      const eventId = getFirstMatchingNumber(obj, [
        "Corporate_event_id",
        "corporate_event_id",
        "Event_id",
        "event_id",
        "id",
      ]);
      const rawTargetLogo = toStringSafe(
        getFirstMatchingValue(obj, [
          "Target_Logo",
          "target_logo",
          "targetLogo",
        ]) || ""
      );
      const targetLogoUrl = resolveCompanyLogoSrc(rawTargetLogo) ?? "";
      if (!buyer && !target) return null;
      return {
        date,
        buyer,
        seller,
        target,
        value,
        type,
        targetLogoUrl: targetLogoUrl || undefined,
        eventId: typeof eventId === "number" ? eventId : undefined,
        targetCompanyId:
          typeof targetCompanyId === "number" ? targetCompanyId : undefined,
      } as TransactionRecord;
    })
    .filter(Boolean) as TransactionRecord[];
}

function mapMarketMapToCompanies(raw: unknown): SectorCompany[] {
  if (!raw) return [];
  // Support Xano response wrapper: { market_map: { ... } }
  const normalizedRaw =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? ((raw as { market_map?: unknown })?.market_map ?? raw)
      : raw;
  const toTypeFromBucket = (bucket: string): string => {
    const b = (bucket || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\bcompanies\b/g, "")
      .trim();
    if (b.includes("public")) return "public";
    if (b.includes("private equity") || b.includes("privateequity") || b.includes("pe"))
      return "private_equity_owned";
    if (b.includes("venture") || b.includes("vc"))
      return "venture_capital_backed";
    return "private";
  };
  const toTypeFromOwnership = (ownership: string): string => {
    const o = (ownership || "").toLowerCase();
    if (o.includes("public")) return "public";
    if (o.includes("private equity")) return "private_equity_owned";
    if (o.includes("venture")) return "venture_capital_backed";
    return "private";
  };

  const adaptCompany = (
    c: Record<string, unknown>,
    bucketHint?: string
  ): SectorCompany => {
    // Handle ID extraction - could be number or string
    let idVal: number = 0;
    if (typeof c.id === "number") {
      idVal = c.id;
    } else if (typeof c.id === "string") {
      const parsed = parseInt(c.id, 10);
      idVal = isNaN(parsed) ? 0 : parsed;
    } else if ((c as { original_new_company_id?: number }).original_new_company_id) {
      idVal = (c as { original_new_company_id?: number }).original_new_company_id!;
    }
    const ownership = toStringSafe(c.ownership);
    const primarySectors = Array.isArray(
      (c as { primary_sectors?: string[] }).primary_sectors
    )
      ? ((c as { primary_sectors?: string[] }).primary_sectors as string[])
      : [];
    const company = {
      id: idVal,
      name: toStringSafe(c.name ?? c.company_name),
      locations_id: 0,
      url: toStringSafe(c.url),
      sectors: Array.isArray((c as { sectors?: string[] }).sectors)
        ? ((c as { sectors?: string[] }).sectors as string[])
        : [],
      primary_sectors: primarySectors,
      description: toStringSafe(c.description),
      linkedin_employee:
        (c as { linkedin_employee?: number }).linkedin_employee ??
        (c as { linkedin_members?: number }).linkedin_members ??
        0,
      linkedin_employee_latest:
        (c as { linkedin_employee_latest?: number }).linkedin_employee_latest ??
        (c as { linkedin_employee?: number }).linkedin_employee ??
        0,
      linkedin_employee_old:
        (c as { linkedin_employee_old?: number }).linkedin_employee_old ??
        (c as { linkedin_members_old?: number }).linkedin_members_old ??
        0,
      linkedin_logo: toStringSafe(c.linkedin_logo),
      country: toStringSafe(c.country),
      ownership_type_id:
        (c as { ownership_type_id?: number }).ownership_type_id ?? 0,
      ownership,
      is_that_investor:
        (c as { is_that_investor?: boolean }).is_that_investor ?? false,
      companies_investors: ((
        c as {
          companies_investors?: Array<{
            company_name: string;
            original_new_company_id: number;
          }>;
        }
      ).companies_investors ?? []) as Array<{
        company_name: string;
        original_new_company_id: number;
      }>,
    } as SectorCompany & { bucket?: string; company_type?: string };

    // Attach hints for downstream categorization
    (company as unknown as { bucket?: string }).bucket = toStringSafe(
      (c as { bucket?: string }).bucket ?? bucketHint ?? ""
    );
    (company as unknown as { company_type?: string }).company_type =
      toTypeFromBucket(
        toStringSafe((c as { bucket?: string }).bucket ?? bucketHint ?? "")
      ) || toTypeFromOwnership(ownership);

    return company;
  };

  const out: SectorCompany[] = [];

  // If raw is a non-array object whose values are arrays (bucket -> items)
  if (
    normalizedRaw &&
    !Array.isArray(normalizedRaw) &&
    typeof normalizedRaw === "object"
  ) {
    const obj = normalizedRaw as Record<string, unknown>;
    let treated = false;
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        treated = true;
        for (const cRaw of value as Array<unknown>) {
          const c = (cRaw || {}) as Record<string, unknown>;
          out.push(adaptCompany(c, key));
        }
      }
    }
    if (treated) return out;
  }

  // Otherwise, treat as array (possibly wrapped)
  const arr = Array.isArray(normalizedRaw)
    ? (normalizedRaw as Array<unknown>)
    : (extractArray(normalizedRaw) as Array<unknown>);
  if (!Array.isArray(arr)) return out;

  if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null) {
    const first = arr[0] as Record<string, unknown>;
    const hasGrouped =
      Array.isArray(first.companies) ||
      Array.isArray(first.items) ||
      (first.bucket &&
        (Array.isArray(first["companies"]) || Array.isArray(first["items"])));
    if (hasGrouped) {
      for (const group of arr as Array<Record<string, unknown>>) {
        const bucket = toStringSafe((group as { bucket?: string }).bucket);
        const companiesArr =
          (group.companies as Array<unknown> | undefined) ||
          (group.items as Array<unknown> | undefined) ||
          [];
        for (const cRaw of companiesArr) {
          const c = (cRaw || {}) as Record<string, unknown>;
          out.push(adaptCompany(c, bucket));
        }
      }
      return out;
    }
  }

  for (const cRaw of arr) {
    const c = (cRaw || {}) as Record<string, unknown>;
    out.push(adaptCompany(c, toStringSafe((c as { bucket?: string }).bucket)));
  }
  return out;
}

// (Removed truncateDescription helper; no longer used)

// Company Logo Component
// (Removed CompanyLogo; grid renders inline image directly)

// (Removed unused CompanyDescription for the new layout)

// (Removed unused CompanyCard for the new layout)

// Tabs
const TABS = [
  { id: "overview", name: "Overview" },
  { id: "most_active", name: "Most Active" },
  { id: "public", name: "Public Companies" },
  { id: "subsectors", name: "Sub-Sectors" },
  { id: "transactions", name: "Transactions" },
  { id: "insights", name: "Insights & Analysis" },
  { id: "all", name: "All Companies" },
] as const;

const OWNERSHIP_URL_FILTER_MAP: Record<string, number[]> = {
  public: [7],
  private_equity_owned: [1],
  venture_capital_backed: [3],
  private: [2],
};

function TabNavigation({
  activeTab,
  setActiveTab,
  counts,
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
  counts: Partial<Record<(typeof TABS)[number]["id"], number>>;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: "0 20px",
        background: "#fff",
        borderBottom: `1px solid ${LINE}`,
        position: "sticky",
        top: 0,
        zIndex: 30,
        overflowX: "auto",
      }}
    >
      {TABS.map((tab) => {
        const on = activeTab === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.set("tab", tab.id);
                window.history.replaceState({}, "", url.toString());
              }
            }}
            style={{
              position: "relative",
              border: "none",
              background: "transparent",
              fontSize: 13.5,
              fontWeight: on ? 800 : 600,
              color: on ? INK : MUTED,
              padding: "14px 15px 13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {tab.name}
            {typeof count === "number" && (
              <b
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: on ? BLUE_700 : MUTED_SOFT,
                  background: on ? BLUE_50 : TINT,
                  borderRadius: 999,
                  padding: "2px 7px",
                }}
              >
                {count.toLocaleString()}
              </b>
            )}
            {on && (
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: -1,
                  height: 2.5,
                  background: BLUE_600,
                  borderRadius: "2px 2px 0 0",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function RecentInsightsCard({ sectorId }: { sectorId: string }) {
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const sectorIdNum = Number(sectorId);
        if (Number.isNaN(sectorIdNum)) return;

        const params = new URLSearchParams();
        params.append("primary_sectors_ids[]", String(sectorIdNum));

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/articles_based_on_sectors?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const arr: ContentArticle[] = Array.isArray(data) ? data : [];
        const sorted = arr.sort((a, b) =>
          new Date(b.Publication_Date).getTime() -
          new Date(a.Publication_Date).getTime()
        );
        setArticles(sorted);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    if (sectorId) fetchArticles();
  }, [sectorId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: R_LG,
        boxShadow: SH_SM,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: 535,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 16px",
          borderBottom: `1px solid ${LINE_2}`,
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: INK }}>
          Recent Insights &amp; Analysis
        </h2>
        <a
          href="?tab=insights"
          style={{
            marginLeft: "auto",
            fontSize: 12.5,
            fontWeight: 700,
            color: BLUE_600,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          View all →
        </a>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "14px 16px", color: MUTED, fontSize: 13 }}>
            Loading…
          </div>
        ) : articles.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: MUTED,
              fontSize: 13,
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            No insights available for this sector yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", height: "100%" }}>
            {articles.map((article) => (
              <a
                key={article.id}
                href={`/article/${article.id}`}
                style={{
                  display: "block",
                  padding: "13px 16px",
                  borderBottom: `1px solid ${LINE_2}`,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = BLUE_50)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                  {article.Content_Type && (
                    <span
                      style={{
                        flexShrink: 0,
                        ...getContentTypeBadgeStyle(article.Content_Type),
                      }}
                    >
                      {article.Content_Type}
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>
                    {formatDate(article.Publication_Date)}
                  </span>
                </div>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: INK,
                    lineHeight: 1.35,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {article.Headline || "Untitled"}
                </h3>
                {article.Strapline && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: BODY,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {article.Strapline}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function MostActiveTableCard({
  title,
  items,
  accent,
  mostRecentHeader,
  onViewAll,
}: {
  title: string;
  items: RankedEntity[];
  accent: "blue" | "purple";
  badgeLabel: string;
  mostRecentHeader?: string;
  showBadge?: boolean;
  onViewAll?: () => void;
}) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const isInvestorTable = title.toLowerCase().includes("private equity");
  const countBg = accent === "purple" ? "#F1EBFC" : BLUE_50;
  const countFg = accent === "purple" ? "#523793" : BLUE_700;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: R_LG,
        boxShadow: SH_SM,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 16px",
          borderBottom: `1px solid ${LINE_2}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: INK }}>
          {title}
        </h2>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              fontSize: 12.5,
              fontWeight: 700,
              color: BLUE_600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            View all →
          </button>
        )}
      </div>
      <div style={{ maxHeight: 330, overflow: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  background: TINT,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: MUTED,
                  textAlign: "left",
                  padding: "9px 14px",
                  borderBottom: `1px solid ${LINE}`,
                  whiteSpace: "nowrap",
                }}
              >
                {isInvestorTable ? "Investor" : "Acquirer"}
              </th>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  background: TINT,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: MUTED,
                  textAlign: "center",
                  padding: "9px 14px",
                  borderBottom: `1px solid ${LINE}`,
                  whiteSpace: "nowrap",
                }}
              >
                Deals
              </th>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  background: TINT,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: MUTED,
                  textAlign: "left",
                  padding: "9px 14px",
                  borderBottom: `1px solid ${LINE}`,
                  whiteSpace: "nowrap",
                }}
              >
                {mostRecentHeader ?? "Most Recent"}
              </th>
            </tr>
          </thead>
          <tbody>
            {!hasItems ? (
              <tr>
                <td colSpan={3} style={{ padding: "24px 14px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                  <span style={{ color: EMPTY }}>—</span>
                </td>
              </tr>
            ) : (
              items.slice(0, 25).map((it, i) => {
                const linkUrl = isInvestorTable
                  ? `/investors/${it.id}`
                  : `/company/${it.id}`;
                return (
                  <tr
                    key={`${title}-${it.name}-${i}`}
                    style={{ cursor: it.id ? "pointer" : "default" }}
                    onClick={() => {
                      if (it.id) window.location.href = linkUrl;
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = BLUE_50)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${LINE_2}`, verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {it.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.logoUrl}
                            alt={it.name}
                            style={{ width: 30, height: 30, borderRadius: R_SM, border: `1px solid ${LINE}`, objectFit: "contain" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: R_SM,
                              border: `1px solid ${LINE}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 800,
                              color: MUTED_SOFT,
                              flexShrink: 0,
                            }}
                          >
                            {(it.name || "?").charAt(0)}
                          </div>
                        )}
                        {it.id ? (
                          <a
                            href={linkUrl}
                            style={{ fontSize: 13.5, fontWeight: 700, color: BLUE_600, textDecoration: "none" }}
                          >
                            {it.name}
                          </a>
                        ) : (
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: INK_2 }}>{it.name}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${LINE_2}`, textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 28,
                          height: 24,
                          padding: "0 8px",
                          borderRadius: 999,
                          background: countBg,
                          color: countFg,
                          fontSize: 12.5,
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatNumber(it.count)}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${LINE_2}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: INK_2 }}>
                        {renderMostRecentTargetValue(it)}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11.5, color: MUTED }}>
                        {it.closedDate || <span style={{ color: EMPTY }}>—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Most Active tab ── (see @/components/sector/SectorMostActiveTab)

// ── End Most Active tab ──────────────────────────────────────────────────────

function RecentTransactionsCard({
  transactions,
}: {
  transactions: TransactionRecord[];
}) {
  const hasItems = Array.isArray(transactions) && transactions.length > 0;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: R_LG,
        boxShadow: SH_SM,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: 535,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 16px",
          borderBottom: `1px solid ${LINE_2}`,
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: INK }}>
          Recent transactions
        </h2>
        <a
          href="?tab=transactions"
          style={{
            marginLeft: "auto",
            fontSize: 12.5,
            fontWeight: 700,
            color: BLUE_600,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          View all →
        </a>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr>
              {["Target", "Buyer/Investor", "Type", "Value"].map((h) => (
                <th
                  key={h}
                  style={{
                    position: "sticky",
                    top: 0,
                    background: TINT,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: MUTED,
                    textAlign: "left",
                    padding: "9px 14px",
                    borderBottom: `1px solid ${LINE}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!hasItems ? (
              <tr>
                <td colSpan={4} style={{ padding: "24px 14px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                  <span style={{ color: EMPTY }}>—</span>
                </td>
              </tr>
            ) : (
              transactions.slice(0, 25).map((t, idx) => {
                const valueDisplay = t.value ? `$${t.value}M` : null;
                const href = t.eventId
                  ? `/corporate-event/${t.eventId}`
                  : t.targetCompanyId
                  ? `/company/${t.targetCompanyId}`
                  : undefined;
                return (
                  <tr
                    key={`tx-${idx}`}
                    style={{ cursor: href ? "pointer" : "default" }}
                    onClick={() => {
                      if (href) window.location.href = href;
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BLUE_50)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${LINE_2}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {t.targetLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.targetLogoUrl}
                            alt={t.target}
                            style={{ width: 30, height: 30, borderRadius: R_SM, border: `1px solid ${LINE}`, objectFit: "contain", flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: R_SM,
                              border: `1px solid ${LINE}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 800,
                              color: MUTED_SOFT,
                              flexShrink: 0,
                            }}
                          >
                            {(t.target || "?").charAt(0)}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: href ? BLUE_600 : INK_2 }}>
                            {t.target || <span style={{ color: EMPTY }}>—</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>
                            {t.date || <span style={{ color: EMPTY }}>—</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${LINE_2}`, color: INK_3 }}>
                      {t.buyer || <span style={{ color: EMPTY }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${LINE_2}`, color: INK_3 }}>
                      {t.type ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: TINT,
                            color: INK_3,
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}
                        >
                          {t.type.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span style={{ color: EMPTY }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        borderBottom: `1px solid ${LINE_2}`,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                        color: INK_2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {valueDisplay || <span style={{ color: EMPTY }}>—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Total counts per type from API (public_count, pe_count, vc_count, private_count)
interface MarketMapCounts {
  public?: number;
  private_equity_owned?: number;
  venture_capital_backed?: number;
  private?: number;
}

function MarketMapGrid({
  companies,
  counts: countsProp,
  onExportBucket,
  exportingBucket,
}: {
  companies: SectorCompany[];
  counts?: MarketMapCounts;
  onExportBucket?: (bucketType: string, bucketLabel: string) => void;
  exportingBucket?: string | null;
}) {
  const labelFor = (type: string) =>
    type === "public"
      ? "Public"
      : type === "private_equity_owned"
      ? "Private Equity Owned"
      : type === "venture_capital_backed"
      ? "Venture Capital Backed"
      : "Private";

  const enhanced = companies.map((c) => {
    const computedType =
      (c as unknown as { company_type?: string }).company_type ||
      (typeof c.ownership === "string" &&
      c.ownership.toLowerCase().includes("public")
        ? "public"
        : (c as unknown as { is_that_investor?: boolean }).is_that_investor
        ? "private_equity_owned"
        : "private");
    const ownershipText =
      (c.ownership && c.ownership.trim()) || labelFor(computedType);
    return {
      id: c.id,
      name: c.name,
      logo_url: resolveCompanyLogoSrc(c.linkedin_logo) ?? "",
      sub_sector:
        Array.isArray(c.primary_sectors) && c.primary_sectors.length > 0
          ? getSectorLabel(c.primary_sectors[0] as SectorLinkItem)
          : "",
      company_type: computedType,
      ownership_text: ownershipText,
    };
  });

  const categorized = {
    public: enhanced.filter((x) => x.company_type === "public"),
    private_equity_owned: enhanced.filter(
      (x) => x.company_type === "private_equity_owned"
    ),
    venture_capital_backed: enhanced.filter(
      (x) => x.company_type === "venture_capital_backed"
    ),
    private: enhanced.filter((x) => x.company_type === "private"),
  } as Record<
    string,
    Array<{
      id: number;
      name: string;
      logo_url: string;
      sub_sector: string;
      ownership_text?: string;
    }>
  >;

  const titleFor = (type: string) =>
    type === "public"
      ? "Public"
      : type === "private_equity_owned"
      ? "PE-owned"
      : type === "venture_capital_backed"
      ? "VC-backed"
      : "Private & other";

  const dotFor = (type: string) => OWNERSHIP_DOT[type] || MUTED_SOFT;

  const bucketOrder = [
    "public",
    "private_equity_owned",
    "venture_capital_backed",
    "private",
  ] as const;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        alignItems: "start",
      }}
    >
      {bucketOrder.map((type) => {
        const list = categorized[type] || [];
        const count = countsProp?.[type as keyof MarketMapCounts] ?? list.length;
        return (
          <div
            key={type}
            style={{
              background: "#fff",
              border: `1px solid ${LINE}`,
              borderRadius: R_LG,
              boxShadow: SH_SM,
              padding: "0 14px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 0 10px",
                borderBottom: `1px solid ${LINE_2}`,
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dotFor(type),
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: INK_2 }}>
                {titleFor(type)}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: MUTED,
                  background: TINT,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {formatNumber(count)}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                {onExportBucket && (
                  <button
                    type="button"
                    onClick={() => onExportBucket(type, titleFor(type))}
                    disabled={exportingBucket === type}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: BLUE_600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      opacity: exportingBucket === type ? 0.5 : 1,
                    }}
                  >
                    {exportingBucket === type ? "Exporting…" : "Export CSV"}
                  </button>
                )}
                <a
                  href={`?tab=all&ownership=${encodeURIComponent(type)}`}
                  style={{ fontSize: 11.5, fontWeight: 700, color: BLUE_600, textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  View all
                </a>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 14 }}>
              {list.length === 0 ? (
                <div style={{ padding: "10px 8px", fontSize: 12.5, color: EMPTY }}>
                  No companies
                </div>
              ) : (
                <>
                  {list.slice(0, 8).map((company) => (
                    <a
                      key={company.id}
                      href={`/company/${company.id}`}
                      title={company.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "6px 8px",
                        borderRadius: R_SM,
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = BLUE_50)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {company.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${LINE}`, objectFit: "contain", flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            border: `1px solid ${LINE}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 7.5,
                            fontWeight: 800,
                            color: MUTED_SOFT,
                            flexShrink: 0,
                          }}
                        >
                          {company.name.charAt(0)}
                        </div>
                      )}
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: INK_3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {company.name}
                      </span>
                    </a>
                  ))}
                  {list.length > 8 && (
                    <a
                      href={`?tab=all&ownership=${encodeURIComponent(type)}`}
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        color: BLUE_600,
                        padding: "6px 8px",
                        textDecoration: "none",
                      }}
                    >
                      +{list.length - 8} more
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Main Sector Detail Component
interface SectorDetailPageProps {
  initialSectorData?: unknown;
  initialMarketMap?: unknown;
  initialStrategicAcquirers?: unknown;
  initialPEInvestors?: unknown;
  initialRecentTransactions?: unknown;
}

const SectorDetailPage = ({
  initialSectorData,
  initialMarketMap,
  initialStrategicAcquirers,
  initialPEInvestors,
  initialRecentTransactions,
}: SectorDetailPageProps) => {
  const params = useParams();
  const sectorId = params.id as string;

  const [sectorData, setSectorData] = useState<SectorStatistics | null>(
    initialSectorData as SectorStatistics | null
  );

  // Debug log on mount to inspect initial data
  useEffect(() => {
    if (initialSectorData) {
      try {
        type SectorApiItem = {
          Sector_thesis?: unknown;
          Sector?: { Sector_thesis?: unknown };
        };

        const items: SectorApiItem[] = Array.isArray(initialSectorData)
          ? (initialSectorData as SectorApiItem[])
          : ([initialSectorData] as SectorApiItem[]);

        const first = items[0] ?? {};
        // Debug: Sector thesis data available from server
        console.debug("Sector thesis sample (client effect):", {
          flatThesis: first.Sector_thesis,
          nestedThesis: first.Sector?.Sector_thesis,
        });
      } catch {
        // Debug: Sector thesis debug failed
      }
    }
  }, [initialSectorData]);
  const [error, setError] = useState<string | null>(null);
  // const [secondaryToPrimaryMap, setSecondaryToPrimaryMap] = useState<Record<string, string>>({});
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("tab") || "overview").toString();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [mostActiveSubTab, setMostActiveSubTab] =
    useState<MostActiveSubTabId>("strategics");

  const goToMostActiveSubTab = (subTab: MostActiveSubTabId) => {
    setActiveTab("most_active");
    setMostActiveSubTab(subTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "most_active");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const [ownershipFilter, setOwnershipFilter] = useState<string | null>(
    searchParams?.get("ownership") || null
  );
  // Debug states removed
  const companiesApiPayload: unknown = null;
  // Split datasets fetched from dedicated endpoints (initialized with server-side data if available)
  const [splitStrategicRaw, setSplitStrategicRaw] = useState<unknown>(
    initialStrategicAcquirers || null
  );
  const [splitPERaw, setSplitPERaw] = useState<unknown>(initialPEInvestors || null);
  // Market map - now client-fetched for instant page navigation
  const [splitMarketMapRaw, setSplitMarketMapRaw] = useState<unknown>(initialMarketMap || null);
  const [splitRecentRaw, setSplitRecentRaw] = useState<unknown>(
    initialRecentTransactions || null
  );
  // Track if overview data has finished loading (to distinguish "loading" from "no data")
  const [overviewDataLoaded, setOverviewDataLoaded] = useState(false);
  // Sub-sectors
  const [subSectors, setSubSectors] = useState<SubSector[]>([]);
  const [subSectorsLoading, setSubSectorsLoading] = useState(false);
  const [subSectorsError, setSubSectorsError] = useState<string | null>(null);
  const [mmExportingBucket, setMmExportingBucket] = useState<string | null>(null);
  const [mmShowExportLimitModal, setMmShowExportLimitModal] = useState(false);
  const [mmExportsLeft, setMmExportsLeft] = useState(0);

  // Fetch all overview data via Next.js API route (cached for 5 min).
  // Single request aggregates all Xano calls server-side → faster for users far from Xano.
  // First request: ~6s (slowest Xano endpoint). Subsequent requests: <200ms (from cache).
  const fetchOverviewData = useCallback(async () => {
    try {
      // Use Next.js API route - it handles auth via cookies and caches the response
      const resp = await fetch(`/api/sector/${sectorId}/overview`, {
        method: "GET",
        credentials: "include", // Send cookies for auth
      });

      if (!resp.ok) {
        if (resp.status === 401) {
          setError("Authentication required");
        } else if (resp.status === 503) {
          setError("Sector data is not available yet. Please try again later.");
        } else {
          console.error("❌ Overview fetch failed:", resp.status);
          setError("Failed to load sector data.");
        }
        setOverviewDataLoaded(true);
        return;
      }

      const data = await resp.json();
      
      // Update all state at once from aggregated response
      if (data.sectorData) {
        setSectorData(data.sectorData as SectorStatistics);
      }
      if (data.splitDatasets) {
        const { marketMap, strategic, pe, recentTransactions } = data.splitDatasets;
        if (marketMap) setSplitMarketMapRaw(marketMap);
        if (strategic) setSplitStrategicRaw(strategic);
        if (pe) setSplitPERaw(pe);
        if (recentTransactions) setSplitRecentRaw(recentTransactions);
      }

      // Log server timing for debugging
      if (data.timings) {
        console.log("📊 Server fetch timings:", data.timings);
      }
      
      // Mark data as loaded (for empty state handling)
      setOverviewDataLoaded(true);
    } catch (e) {
      console.error("❌ Overview fetch failed:", e);
      setOverviewDataLoaded(true); // Also mark as loaded on error
    }
  }, [sectorId]);

  // Kick off data loading on mount
  useEffect(() => {
    if (!sectorId) return;
    fetchOverviewData();
  }, [sectorId, fetchOverviewData]);

  // Fetch Sub-Sectors for this sector
  const fetchSubSectors = useCallback(async () => {
    setSubSectorsLoading(true);
    setSubSectorsError(null);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setSubSectorsError("Authentication required");
        return;
      }
      const Sector_id = Number(sectorId);
      if (Number.isNaN(Sector_id)) {
        setSubSectorsError("Invalid sector id");
        return;
      }
      const qs = new URLSearchParams();
      qs.set("sectors_id", String(Sector_id));
      const resp = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sub_sectors?${qs.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(
          `API request failed: ${resp.status} ${resp.statusText} - ${text}`
        );
      }
      const json = await resp.json();
      const arr = extractArray(json);
      const mapped: SubSector[] = (arr as Array<Record<string, unknown>>)
        .map((item) => {
          const id =
            getFirstMatchingNumber(item, [
              "id",
              "sector_id",
              "secondary_sector_id",
            ]) ?? 0;
          const sectorName = toStringSafe(
            getFirstMatchingValue(item, ["sector_name", "name"]) || ""
          );
          if (!id && !sectorName) return null;
          return {
            id,
            sector_name: sectorName,
            Sector_importance: "Secondary",
          } as SubSector;
        })
        .filter(Boolean) as SubSector[];
      setSubSectors(mapped);
    } catch (e) {
      setSubSectorsError(
        e instanceof Error ? e.message : "Failed to fetch sub-sectors"
      );
    } finally {
      setSubSectorsLoading(false);
    }
  }, [sectorId]);

  // Recompute derived datasets when sources change
  useEffect(() => {
    const source =
      splitStrategicRaw || splitPERaw || splitMarketMapRaw || splitRecentRaw
        ? {
            ...(splitStrategicRaw
              ? { strategic_acquirers: splitStrategicRaw as unknown }
              : {}),
            ...(splitPERaw ? { pe_investors: splitPERaw as unknown } : {}),
            ...(splitMarketMapRaw
              ? { market_map: splitMarketMapRaw as unknown }
              : {}),
            ...(splitRecentRaw
              ? { resent_trasnactions: splitRecentRaw as unknown }
              : {}),
            ...((companiesApiPayload as Record<string, unknown> | null) || {}),
            ...((sectorData as unknown as Record<string, unknown> | null) ||
              {}),
          }
        : companiesApiPayload ?? sectorData;
    if (!source) return;
    try {
      const rawRecent =
        (source as unknown as { resent_trasnactions?: unknown })
          .resent_trasnactions ??
        (source as unknown as { recent_transactions?: unknown })
          .recent_transactions;
      const rawStrategic = (
        source as unknown as {
          strategic_acquirers?: unknown;
        }
      ).strategic_acquirers;
      const rawPE = (source as unknown as { pe_investors?: unknown })
        .pe_investors;
      const rawMarketMap = (source as unknown as { market_map?: unknown })
        .market_map;
      // Touch variables to avoid unused warnings
      void rawRecent;
      void rawStrategic;
      void rawPE;
      void rawMarketMap;
    } catch {
      // ignore
    }
  }, [
    companiesApiPayload,
    sectorData,
    splitStrategicRaw,
    splitPERaw,
    splitMarketMapRaw,
    splitRecentRaw,
  ]);

  // Link navigation is handled via anchors in the new layout

  // (Removed generatePaginationButtons; simplified pagination in new layout)

  // Keep tab and ownership in sync with URL query params when they change
  useEffect(() => {
    const qpTab = (searchParams?.get("tab") || "overview").toString();
    if (qpTab !== activeTab) {
      setActiveTab(qpTab);
    }
    const qpOwnership = searchParams?.get("ownership") || null;
    setOwnershipFilter(qpOwnership);
  }, [searchParams, activeTab]);

  // Load Sub-Sectors when the tab is active
  useEffect(() => {
    if (activeTab === "subsectors") {
      fetchSubSectors();
    }
  }, [activeTab, fetchSubSectors]);

  // Clear Market Map pre-filter when navigating away from All Companies tab
  useEffect(() => {
    if (activeTab !== "all" && ownershipFilter) {
      try {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("ownership");
          window.history.replaceState({}, "", url.toString());
        }
      } finally {
        setOwnershipFilter(null);
      }
    }
  }, [activeTab, ownershipFilter]);

  // Map optional dashboard datasets from the preferred source (companies API), fallback to sector API.
  // Heavy mapping work is wrapped in useMemo so it does not repeat on every render.
  const preferredSource = useMemo(() => {
    if (splitStrategicRaw || splitPERaw || splitMarketMapRaw || splitRecentRaw) {
      return {
        ...(splitStrategicRaw
          ? { strategic_acquirers: splitStrategicRaw as unknown }
          : {}),
        ...(splitPERaw ? { pe_investors: splitPERaw as unknown } : {}),
        ...(splitMarketMapRaw
          ? { market_map: splitMarketMapRaw as unknown }
          : {}),
        ...(splitRecentRaw
          ? { resent_trasnactions: splitRecentRaw as unknown }
          : {}),
        ...((companiesApiPayload as Record<string, unknown> | null) || {}),
        ...((sectorData as unknown as Record<string, unknown> | null) || {}),
      };
    }
    return (companiesApiPayload as Record<string, unknown> | null) ?? sectorData;
  }, [
    splitStrategicRaw,
    splitPERaw,
    splitMarketMapRaw,
    splitRecentRaw,
    companiesApiPayload,
    sectorData,
  ]);

  const recentTransactions: TransactionRecord[] = useMemo(() => {
    if (!preferredSource) return [];
    const raw = (preferredSource as { resent_trasnactions?: unknown })
      ?.resent_trasnactions;
    const alt = (preferredSource as { recent_transactions?: unknown })
      ?.recent_transactions;
    return mapRecentTransactions(extractArray(raw ?? alt ?? []));
  }, [preferredSource]);

  const strategicAcquirers: RankedEntity[] = useMemo(() => {
    if (!preferredSource) return [];
    const raw = (preferredSource as { strategic_acquirers?: unknown })
      ?.strategic_acquirers;
    return mapRankedEntities(extractArray(raw ?? []));
  }, [preferredSource]);

  const peInvestors: RankedEntity[] = useMemo(() => {
    if (!preferredSource) return [];
    const raw = (preferredSource as { pe_investors?: unknown })?.pe_investors;
    return mapRankedEntities(extractArray(raw ?? []));
  }, [preferredSource]);

  const marketMapCompanies: SectorCompany[] = useMemo(() => {
    if (!preferredSource) return [];
    const raw = (preferredSource as { market_map?: unknown })?.market_map;
    return mapMarketMapToCompanies(raw);
  }, [preferredSource]);

  // Total counts per type from market_map API (prefer cached totals over visible item counts)
  const marketMapCounts: MarketMapCounts | undefined = useMemo(() => {
    if (!preferredSource) return undefined;
    const raw = (preferredSource as { market_map?: unknown })?.market_map;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const o = raw as Record<string, unknown>;

    const countsRecord =
      o["counts"] && typeof o["counts"] === "object" && !Array.isArray(o["counts"])
        ? (o["counts"] as Record<string, unknown>)
        : undefined;

    const countsFromCache = {
      public:
        getFirstMatchingNumber(countsRecord || {}, ["public"]) ??
        getFirstMatchingNumber(o, ["public_total_count", "Public_total_count"]),
      private_equity_owned:
        getFirstMatchingNumber(countsRecord || {}, ["pe"]) ??
        getFirstMatchingNumber(o, ["pe_total_count", "Pe_total_count"]),
      venture_capital_backed:
        getFirstMatchingNumber(countsRecord || {}, ["vc"]) ??
        getFirstMatchingNumber(o, ["vc_total_count", "Vc_total_count"]),
      private:
        getFirstMatchingNumber(countsRecord || {}, ["private"]) ??
        getFirstMatchingNumber(o, ["private_total_count", "Private_total_count"]),
    };

    if (
      countsFromCache.public !== undefined ||
      countsFromCache.private_equity_owned !== undefined ||
      countsFromCache.venture_capital_backed !== undefined ||
      countsFromCache.private !== undefined
    ) {
      return countsFromCache;
    }

    // New format fallback: {public: [...], pe: [...], vc: [...], private: [...]}.
    // These are only the preview items, so use them only when cached totals are unavailable.
    const publicArr = Array.isArray(o["public"]) ? o["public"] : undefined;
    const peArr = Array.isArray(o["pe"]) ? o["pe"] : undefined;
    const vcArr = Array.isArray(o["vc"]) ? o["vc"] : undefined;
    const privateArr = Array.isArray(o["private"]) ? o["private"] : undefined;

    if (publicArr || peArr || vcArr || privateArr) {
      return {
        public: publicArr?.length ?? 0,
        private_equity_owned: peArr?.length ?? 0,
        venture_capital_backed: vcArr?.length ?? 0,
        private: privateArr?.length ?? 0,
      };
    }

    // Legacy format: explicit count fields
    return {
      public: getFirstMatchingNumber(o, ["public_count", "Public_count"]),
      private_equity_owned: getFirstMatchingNumber(o, ["pe_count", "Pe_count"]),
      venture_capital_backed: getFirstMatchingNumber(o, [
        "vc_count",
        "Vc_count",
      ]),
      private: getFirstMatchingNumber(o, ["private_count", "Private_count"]),
    };
  }, [preferredSource]);

  const sectorDisplayName = useMemo(() => {
    if (!sectorData) return "";
    return (
      (sectorData as { sector_name?: string })?.sector_name ||
      (sectorData as { Sector?: { sector_name?: string } })?.Sector
        ?.sector_name ||
      ""
    );
  }, [sectorData]);

  const handleExportMarketMapBucket = useCallback(
    async (bucketType: string, bucketLabel: string) => {
      const sectorIdNum = Number(sectorId);
      if (!Number.isFinite(sectorIdNum) || sectorIdNum <= 0) return;

      const limitCheck = await checkExportLimit();
      if (!limitCheck.canExport) {
        setMmExportsLeft(limitCheck.exportsLeft);
        setMmShowExportLimitModal(true);
        return;
      }

      setMmExportingBucket(bucketType);
      try {
        await exportMarketMapBucket({
          sectorId: sectorIdNum,
          sectorName: sectorDisplayName || `sector-${sectorIdNum}`,
          bucketType,
          bucketLabel,
          expectedCount: marketMapCounts?.[bucketType as keyof MarketMapCounts],
        });
      } catch (exportError) {
        console.error("Market map export failed:", exportError);
      } finally {
        setMmExportingBucket(null);
      }
    },
    [sectorId, sectorDisplayName, marketMapCounts]
  );

  // Only block rendering for critical errors (auth/not found)
  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#e53e3e" }}>
            {error === "Authentication required" ? (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Authentication Required
                </h1>
                <p style={{ marginBottom: "24px" }}>
                  Please log in to view sector details.
                </p>
                <a
                  href="/login"
                  style={{
                    color: "#2A46EA",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  Go to Login
                </a>
              </div>
            ) : error === "Sector not found" ? (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Sector Not Found
                </h1>
                <p style={{ marginBottom: "24px" }}>
                  The sector you&apos;re looking for doesn&apos;t exist or has
                  been removed.
                </p>
                <a
                  href="/sectors"
                  style={{
                    color: "#2A46EA",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Sectors
                </a>
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Error Loading Sector
                </h1>
                <p style={{ marginBottom: "24px" }}>{error}</p>
                <a
                  href="/sectors"
                  style={{
                    color: "#2A46EA",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Sectors
                </a>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Update page title when sector data is loaded
  if (typeof document !== "undefined" && sectorData) {
    const titleName = 
      (sectorData as { sector_name?: string })?.sector_name || // New flat format
      (sectorData as { Sector?: { sector_name?: string } })?.Sector?.sector_name; // Old nested format
    if (titleName) {
      document.title = `Asymmetrix – ${titleName}`;
    }
  }

  // Normalize statistics to support both new and legacy API shapes
  const totalsRow: SectorTotalsRow | null =
    sectorData &&
    Array.isArray(
      (sectorData as unknown as { Total_number_of_companies?: unknown })
        .Total_number_of_companies
    )
      ? (
          sectorData as unknown as {
            Total_number_of_companies: SectorTotalsRow[];
          }
        ).Total_number_of_companies[0] || null
      : null;

  // Removed statistics card; keep totals only when needed elsewhere

  function SectorInsightsTab({ sectorId }: { sectorId: string }) {
    const router = useRouter();
    const [filters, setFilters] = useState<InsightsAnalysisFilters>({
      search_query: "",
      primary_sectors_ids: [],
      Secondary_sectors_ids: [],
      Countries: [],
      Provinces: [],
      Cities: [],
      Offset: 1,
      Per_page: 10,
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [contentTypes, setContentTypes] = useState<string[]>([]);
    const [articles, setArticles] = useState<ContentArticle[]>([]);
    const [pagination, setPagination] = useState({
      itemsReceived: 0,
      itemsTotal: 0,
      curPage: 1,
      nextPage: null as number | null,
      prevPage: null as number | null,
      offset: 0,
      perPage: 10,
      pageTotal: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInsightsAnalysis = async (filters: InsightsAnalysisFilters) => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setError("Authentication required");
          return;
        }

        const params = new URLSearchParams();
        params.append("Offset", String(filters.Offset));
        params.append("Per_page", String(filters.Per_page));
        if (filters.search_query)
          params.append("search_query", filters.search_query);
        if (filters.Countries?.length)
          params.append("Countries", filters.Countries.join(","));
        if (filters.Provinces?.length)
          params.append("Provinces", filters.Provinces.join(","));
        if (filters.Cities?.length)
          params.append("Cities", filters.Cities.join(","));
        if (filters.primary_sectors_ids?.length)
          params.append(
            "primary_sectors_ids",
            filters.primary_sectors_ids.join(",")
          );
        if (filters.Secondary_sectors_ids?.length)
          params.append(
            "Secondary_sectors_ids",
            filters.Secondary_sectors_ids.join(",")
          );
        const ct = (filters.Content_Type || filters.content_type || "").trim();
        if (ct) params.append("content_type", ct);

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles?${params.toString()}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: InsightsAnalysisResponse = await response.json();

        setArticles(normalizeContentArticles(data.items || []));
        setPagination({
          itemsReceived: data.itemsReceived,
          itemsTotal: data.itemsTotal,
          curPage: data.curPage,
          nextPage: data.nextPage,
          prevPage: data.prevPage,
          offset: data.offset,
          perPage: filters.Per_page,
          pageTotal: data.pageTotal,
        });
      } catch (error) {
        console.error("Error fetching insights analysis:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch insights analysis"
        );
      } finally {
        setLoading(false);
      }
    };

    // Initial data fetch with sector pre-filter
    useEffect(() => {
      const sectorIdNum = parseInt(sectorId);
      if (!isNaN(sectorIdNum)) {
        const initialFilters = {
          ...filters,
          primary_sectors_ids: [sectorIdNum],
        };
        setFilters(initialFilters);
        fetchInsightsAnalysis(initialFilters);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sectorId]);

    // Fetch content types (cached via locationsService)
    useEffect(() => {
      const run = async () => {
        try {
          const values = await locationsService.getContentTypesForArticles();
          setContentTypes(values);
        } catch {
          // ignore
        }
      };
      run();
    }, []);

    const handleSearch = () => {
      const sectorIdNum = parseInt(sectorId);
      const updatedFilters = {
        ...filters,
        search_query: searchTerm,
        primary_sectors_ids: !isNaN(sectorIdNum) ? [sectorIdNum] : [],
        Offset: 1,
      };
      setFilters(updatedFilters);
      fetchInsightsAnalysis(updatedFilters);
    };

    const handlePageChange = (page: number) => {
      const updatedFilters = { ...filters, Offset: page };
      setFilters(updatedFilters);
      fetchInsightsAnalysis(updatedFilters);
    };

    const formatDate = (dateString: string) => {
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
    };

    const formatSectors = (
      sectors: Array<Array<{ sector_name: string }>> | undefined
    ) => {
      if (!sectors || sectors.length === 0) return "-";
      const allSectors = sectors
        .flat()
        .filter((s) => s && s.sector_name)
        .map((s) => s.sector_name);
      return allSectors.length > 0 ? allSectors.join(", ") : "-";
    };

    const formatCompanies = (
      companies: ContentArticle["companies_mentioned"] | undefined
    ) => {
      if (!companies || companies.length === 0) return "-";
      const validCompanies = companies
        .filter((c) => c && c.name)
        .map((c) => c.name);
      return validCompanies.length > 0 ? validCompanies.join(", ") : "-";
    };

    const rangeStart = pagination.pageTotal > 0 ? pagination.offset + 1 : 0;
    const rangeEnd = Math.min(
      pagination.offset + pagination.perPage,
      pagination.itemsTotal
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Search + content-type filter */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${LINE}`,
            borderRadius: R_LG,
            boxShadow: SH_SM,
            padding: "13px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", width: 280 }}>
            <input
              type="text"
              placeholder="Search insights…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              style={{
                width: "100%",
                height: 38,
                padding: "0 14px",
                borderRadius: 999,
                border: `1px solid ${LINE}`,
                fontSize: 13,
                color: INK,
              }}
            />
          </div>
          <select
            value={filters.Content_Type || ""}
            onChange={(e) => {
              const updated = {
                ...filters,
                Content_Type: e.target.value || undefined,
                content_type: e.target.value || undefined,
                Offset: 1,
              };
              setFilters(updated);
              fetchInsightsAnalysis(updated);
            }}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 999,
              border: `1px solid ${LINE}`,
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: INK_3,
            }}
          >
            <option value="">All content types</option>
            {contentTypes.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSearch}
            style={{
              height: 38,
              padding: "0 20px",
              borderRadius: 999,
              border: "none",
              background: BLUE_600,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>
          {error && (
            <span style={{ fontSize: 12.5, color: "#A62E22" }}>{error}</span>
          )}
        </div>

        {/* Content-type segments (dot-keyed) */}
        {contentTypes.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {["All", ...contentTypes].map((ct) => {
              const value = ct === "All" ? "" : ct;
              const on = (filters.Content_Type || "") === value;
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...filters,
                      Content_Type: value || undefined,
                      content_type: value || undefined,
                      Offset: 1,
                    };
                    setFilters(updated);
                    fetchInsightsAnalysis(updated);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 34,
                    padding: "0 14px",
                    borderRadius: 999,
                    border: `1px solid ${on ? INK : LINE}`,
                    background: on ? INK : "#fff",
                    color: on ? "#fff" : INK_3,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {ct !== "All" && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: contentTypeFilterDot(ct),
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {ct}
                </button>
              );
            })}
          </div>
        )}

        {/* Results panel */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${LINE}`,
            borderRadius: R_LG,
            boxShadow: SH_SM,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
              Loading articles…
            </div>
          ) : articles.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
              No articles found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {articles.map((article: ContentArticle, index: number) => {
                const effectiveContentType = getEffectiveContentType(article);
                const isNews = isNewsArticle({ Content_Type: effectiveContentType });
                const byline = isNews ? getArticleByline(article) : "";

                return (
                  <a
                    key={article.id || index}
                    href={`/article/${article.id}`}
                    style={{
                      display: "block",
                      padding: "13px 16px",
                      borderBottom: `1px solid ${LINE_2}`,
                      borderTop: `3px solid ${getContentTypeAccentColor(effectiveContentType)}`,
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BLUE_50)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={(e) => {
                      if (
                        e.defaultPrevented ||
                        e.button !== 0 ||
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.altKey
                      )
                        return;
                      e.preventDefault();
                      router.push(`/article/${article.id}`);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                      {effectiveContentType && (
                        <span style={getContentTypeBadgeStyle(effectiveContentType)}>
                          {effectiveContentType}
                        </span>
                      )}
                      <span style={{ fontSize: 11.5, color: MUTED }}>
                        {formatDate(article.Publication_Date)}
                      </span>
                    </div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: INK, lineHeight: 1.35 }}>
                      {article.Headline || "-"}
                    </h3>
                    {article.Transaction_status && (
                      <div style={{ marginBottom: 6 }}>
                        <TransactionStatusPill status={article.Transaction_status} />
                      </div>
                    )}
                    {byline ? (
                      <p style={{ margin: "0 0 4px", fontSize: 12, color: MUTED, fontStyle: "italic" }}>
                        {byline}
                      </p>
                    ) : null}
                    <p style={{ margin: "0 0 8px", fontSize: 12.5, lineHeight: 1.5, color: BODY }}>
                      {article.Strapline || "No summary available"}
                    </p>
                    <div style={{ fontSize: 12, color: MUTED }}>
                      <span style={{ fontWeight: 600, color: INK_3 }}>Companies: </span>
                      {formatCompanies(article.companies_mentioned)}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>
                      <span style={{ fontWeight: 600, color: INK_3 }}>Sectors: </span>
                      {formatSectors(article.sectors)}
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Pagination footer */}
          {pagination.pageTotal > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 14,
                padding: "11px 16px",
                background: "#fff",
                borderTop: `1px solid ${LINE_2}`,
                fontSize: 13,
                color: MUTED,
              }}
            >
              <div>
                Showing {rangeStart}–{rangeEnd} of {pagination.itemsTotal}
              </div>
              <div style={{ justifySelf: "center" }}>
                <CompactPagination
                  curPage={pagination.curPage}
                  pageTotal={pagination.pageTotal}
                  onPageChange={handlePageChange}
                />
              </div>
              <div />
            </div>
          )}
        </div>
      </div>
    );
  }

  const sectorNameForDisplay =
    (sectorData as { sector_name?: string })?.sector_name ||
    (sectorData as { Sector?: { sector_name?: string } })?.Sector?.sector_name ||
    "Sector";

  const tabCounts: Partial<Record<(typeof TABS)[number]["id"], number>> = {
    subsectors: subSectors.length > 0 ? subSectors.length : undefined,
    all: totalsRow?.Number_of_Companies,
    public: totalsRow?.Number_of_Public,
  };

  return (
    <div style={{ minHeight: "100vh", background: TINT }}>
      <Header />
      <div style={{ background: "#fff", borderBottom: `1px solid ${LINE}`, padding: "18px 20px 16px" }}>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>
          <a href="/sectors" style={{ fontWeight: 600, color: BLUE_600, textDecoration: "none" }}>
            Sectors
          </a>
          {" / "}
          {sectorData ? sectorNameForDisplay : "…"}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "-0.028em",
                color: INK,
                lineHeight: 1.1,
              }}
            >
              {sectorData ? (
                sectorNameForDisplay
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    height: 28,
                    width: 260,
                    background: LINE_2,
                    borderRadius: 6,
                  }}
                />
              )}
            </h1>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {sectorData && (sectorData as { id?: number })?.id != null && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 36,
                  padding: "0 10px 0 14px",
                  borderRadius: 999,
                  border: `1px solid ${LINE}`,
                  background: "#fff",
                }}
              >
                <InlineFollowButton
                  followKey="followed_sectors"
                  entityId={(sectorData as unknown as { id: number }).id}
                  label={sectorNameForDisplay}
                  showLabel
                  icon="star"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} counts={tabCounts} />

      <main style={{ padding: "18px 20px 40px" }}>
        {activeTab === "overview" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Top row: Recent Insights + Recent Transactions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              <RecentInsightsCard sectorId={sectorId} />
              {recentTransactions.length > 0 ? (
                <RecentTransactionsCard transactions={recentTransactions} />
              ) : (
                <div
                  style={{
                    background: "#fff",
                    border: `1px solid ${LINE}`,
                    borderRadius: R_LG,
                    boxShadow: SH_SM,
                    padding: 16,
                    height: 535,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <h2 style={{ margin: "0 0 12px", fontSize: 14.5, fontWeight: 800, color: INK }}>
                    Recent transactions
                  </h2>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: MUTED,
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {overviewDataLoaded
                      ? "No recent transactions data available for this sector"
                      : "Loading…"}
                  </div>
                </div>
              )}
            </div>

            {/* Market map cards */}
            {marketMapCompanies.length > 0 ? (
              <MarketMapGrid
                companies={marketMapCompanies}
                counts={marketMapCounts}
                onExportBucket={handleExportMarketMapBucket}
                exportingBucket={mmExportingBucket}
              />
            ) : (
              <div
                style={{
                  background: "#fff",
                  border: `1px solid ${LINE}`,
                  borderRadius: R_LG,
                  boxShadow: SH_SM,
                  padding: 16,
                  textAlign: "center",
                  color: MUTED,
                  fontSize: 13,
                }}
              >
                {overviewDataLoaded
                  ? "No market map data available for this sector"
                  : "Loading…"}
              </div>
            )}

            {/* Most Active preview row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              {strategicAcquirers.length > 0 ? (
                <MostActiveTableCard
                  title="Most Active Strategic Acquirers"
                  items={strategicAcquirers}
                  accent="blue"
                  badgeLabel="Strategic Acquirer"
                  mostRecentHeader="Most Recent Acquisition"
                  showBadge={false}
                  onViewAll={() => goToMostActiveSubTab("strategics")}
                />
              ) : (
                <div
                  style={{
                    background: "#fff",
                    border: `1px solid ${LINE}`,
                    borderRadius: R_LG,
                    boxShadow: SH_SM,
                    padding: 16,
                    textAlign: "center",
                    color: MUTED,
                    fontSize: 13,
                  }}
                >
                  {overviewDataLoaded
                    ? "No strategic acquirers data available for this sector"
                    : "Loading…"}
                </div>
              )}
              {peInvestors.length > 0 ? (
                <MostActiveTableCard
                  title="Most Active Private Equity Investors"
                  items={peInvestors}
                  accent="purple"
                  badgeLabel="Private Equity"
                  mostRecentHeader="Most Recent Investment"
                  showBadge={false}
                  onViewAll={() => goToMostActiveSubTab("pe")}
                />
              ) : (
                <div
                  style={{
                    background: "#fff",
                    border: `1px solid ${LINE}`,
                    borderRadius: R_LG,
                    boxShadow: SH_SM,
                    padding: 16,
                    textAlign: "center",
                    color: MUTED,
                    fontSize: 13,
                  }}
                >
                  {overviewDataLoaded
                    ? "No private equity investors data available for this sector"
                    : "Loading…"}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "all" ? (
          !Number.isNaN(Number(sectorId)) && Number(sectorId) > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ownershipFilter && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    height: 38,
                    padding: "0 8px 0 14px",
                    borderRadius: 999,
                    background: BLUE_50,
                    border: `1px solid ${BLUE_200}`,
                    fontSize: 13,
                    color: BLUE_700,
                    width: "fit-content",
                  }}
                >
                  Viewing a pre-filtered list:{" "}
                  <b style={{ color: INK, fontWeight: 700 }}>
                    {ownershipFilter === "public"
                      ? "Public Companies"
                      : ownershipFilter === "private_equity_owned"
                      ? "Private Equity Owned"
                      : ownershipFilter === "venture_capital_backed"
                      ? "Venture Capital Backed"
                      : "Private Companies"}
                  </b>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        if (typeof window !== "undefined") {
                          const url = new URL(window.location.href);
                          url.searchParams.delete("ownership");
                          url.searchParams.set("tab", "all");
                          window.history.replaceState({}, "", url.toString());
                        }
                      } finally {
                        setOwnershipFilter(null);
                      }
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      border: "none",
                      borderRadius: "50%",
                      background: "rgba(42,70,234,.12)",
                      color: BLUE_700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                </div>
              )}
              <ScopedCompaniesPanel
                primarySectorId={Number(sectorId)}
                fixedOwnershipTypeIds={
                  ownershipFilter
                    ? OWNERSHIP_URL_FILTER_MAP[ownershipFilter]
                    : undefined
                }
                hideOwnershipTabs={Boolean(ownershipFilter)}
                embedded
                uncappedExport
                columnsStorageScope="session"
                columnsStorageKey={`sector-all-companies-${sectorId}`}
              />
            </div>
          ) : null
        ) : activeTab === "public" ? (
          !Number.isNaN(Number(sectorId)) && Number(sectorId) > 0 ? (
            <ScopedCompaniesPanel
              primarySectorId={Number(sectorId)}
              fixedOwnershipTypeIds={[7]}
              hideOwnershipTabs
              embedded
              uncappedExport
              lockSectorScope
              columnsStorageScope="session"
              columnsStorageKey={`sector-public-companies-${sectorId}`}
            />
          ) : null
        ) : activeTab === "subsectors" ? (
          <div>
            {subSectorsLoading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
                Loading sub-sectors…
              </div>
            ) : subSectorsError ? (
              <div style={{ padding: "16px 0", textAlign: "center", color: "#A62E22", fontSize: 13 }}>
                {subSectorsError}
              </div>
            ) : subSectors.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
                No sub-sectors found.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {subSectors.map((s) => (
                  <a
                    key={s.id}
                    href={`/sub-sector/${s.id}`}
                    style={{
                      background: "#fff",
                      border: `1px solid ${LINE}`,
                      borderRadius: R_LG,
                      boxShadow: SH_XS,
                      padding: "14px 15px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      textDecoration: "none",
                    }}
                    title={s.sector_name}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1.3,
                        color: BLUE_600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {s.sector_name}
                    </h3>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "most_active" ? (
          <SectorMostActiveTab
            sectorId={sectorId}
            sectorImportance={
              sectorData?.Sector?.Sector_importance ||
              toStringSafe(
                (sectorData as unknown as { Sector_importance?: unknown })
                  ?.Sector_importance
              )
            }
            activeSubTab={mostActiveSubTab}
            setActiveSubTab={setMostActiveSubTab}
          />
        ) : activeTab === "transactions" ? (
          <ScopedCorporateEventsPanel primarySectorId={Number(sectorId)} embedded />
        ) : activeTab === "insights" ? (
          <SectorInsightsTab sectorId={sectorId} />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 260,
              background: "#fff",
              border: `1px solid ${LINE}`,
              borderRadius: R_LG,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: INK }}>
                {activeTab.charAt(0).toUpperCase() +
                  activeTab.slice(1).replace("_", " ")}{" "}
                Section
              </h3>
              <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>This section is coming soon</p>
            </div>
          </div>
        )}
      </main>
      <ExportLimitModal
        isOpen={mmShowExportLimitModal}
        onClose={() => setMmShowExportLimitModal(false)}
        exportsLeft={mmExportsLeft}
        totalExports={EXPORT_LIMIT}
      />
      <Footer />
    </div>
  );
};

export default SectorDetailPage;
