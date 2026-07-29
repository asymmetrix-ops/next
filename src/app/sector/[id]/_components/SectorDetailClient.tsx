"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScopedCompaniesPanel } from "@/components/companies/ScopedCompaniesPanel";
import { ScopedCorporateEventsPanel } from "@/components/corporate-events/ScopedCorporateEventsPanel";
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
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import {
  ContentArticle,
  InsightsAnalysisResponse,
  InsightsAnalysisFilters,
} from "@/types/insightsAnalysis";

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

interface NewCompanyItem {
  id: number;
  name: string;
  url?: string;
  secondary_sectors?: SectorLinkItem[];
  primary_sectors?: SectorLinkItem[];
  description?: string;
  linkedin_members?: number;
  linkedin_members_old?: number;
  linkedin_logo?: string;
  country?: string;
  ownership_type_id?: number;
  ownership?: string;
}

interface NewCompaniesAPIResult {
  result1?: {
    items?: Array<NewCompanyItem>;
    itemsReceived?: number;
    curPage?: number;
    nextPage?: number | null;
    prevPage?: number | null;
    offset?: number;
    perPage?: number;
    pageTotal?: number;
  };
}

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
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
}) {
  return (
    <div className="mb-8">
      <div className="border-b border-slate-200">
        <nav className="flex overflow-x-auto space-x-8">
          {TABS.map((tab) => (
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
              className={`relative py-4 px-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.name}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </nav>
      </div>
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

  const getBadgeStyle = (contentType?: string): React.CSSProperties => {
    const t = (contentType || "").toLowerCase();
    if (t === "company analysis") return { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" };
    if (t === "deal analysis") return { background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" };
    if (t === "sector analysis") return { background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe" };
    if (t === "hot take") return { background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa" };
    if (t === "executive interview") return { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" };
    return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
  };

  return (
    <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 flex flex-col overflow-hidden" style={{ height: "535px" }}>
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <span className="inline-flex justify-center items-center w-8 h-8 bg-blue-50 rounded-lg">
              <svg
                className="w-4 h-4 text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <span className="font-semibold text-slate-900">Recent Insights &amp; Analysis</span>
          </div>
          <a
            href="?tab=insights"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex-shrink-0"
          >
            View All
          </a>
        </div>
      </div>
      <div className="px-5 py-4 flex-1 overflow-hidden">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5 pb-3 border-b border-slate-100 last:border-0">
                <div className="h-3.5 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-4/5"></div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No insights available for this sector yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-y-auto overflow-x-hidden h-full">
            {articles.map((article) => (
              <a
                key={article.id}
                href={`/article/${article.id}`}
                className="block py-3 first:pt-0 group hover:bg-slate-50/50 -mx-5 px-5 transition-colors duration-150"
              >
                <div className="flex items-center gap-2 mb-1">
                  {article.Content_Type && (
                    <span
                      className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none flex-shrink-0"
                      style={getBadgeStyle(article.Content_Type)}
                    >
                      {article.Content_Type}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatDate(article.Publication_Date)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1 group-hover:text-blue-700 transition-colors line-clamp-1">
                  {article.Headline || "Untitled"}
                </h3>
                {article.Strapline && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
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
  badgeLabel,
  mostRecentHeader,
  showBadge = true,
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
  const accentClasses =
    accent === "purple"
      ? {
          gradient: "from-purple-500 to-pink-500",
          badge: "bg-purple-50 text-purple-700 border-purple-200",
          countBg: "bg-blue-50 text-blue-600",
        }
      : {
          gradient: "from-blue-500 to-indigo-500",
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          countBg: "bg-indigo-50 text-indigo-600",
        };
  const isInvestorTable = title.toLowerCase().includes("private equity");

  return (
    <div className="h-full bg-white rounded-xl border shadow-lg border-slate-200/60">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex gap-3 items-center justify-between">
          <div className="flex gap-3 items-center text-xl">
            <span className="inline-flex justify-center items-center w-8 h-8 rounded-lg bg-slate-50">
              <BuildingOfficeIcon
                className={`w-4 h-4 text-${
                  accent === "purple" ? "purple" : "blue"
                }-600`}
              />
            </span>
            <span className="text-base font-semibold text-slate-900 sm:text-lg">
              {title}
            </span>
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors whitespace-nowrap"
            >
              View All →
            </button>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="overflow-auto md:max-h-[28rem]" style={{ maxHeight: "28rem" }}>
          {/* Mobile: card list */}
          <div className="block space-y-3 md:hidden">
            {!hasItems ? (
              <div className="py-6 text-sm text-center text-slate-500">
                -
              </div>
            ) : (
              items.slice(0, 25).map((it) => {
                const linkUrl = isInvestorTable
                  ? `/investors/${it.id}`
                  : `/company/${it.id}`;
                const content = (
                  <>
                    <div className="flex gap-3 items-center min-w-0 flex-1">
                      {it.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.logoUrl}
                          alt={it.name}
                          className="object-contain w-8 h-8 rounded-lg flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback =
                              target.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`${
                          it.logoUrl ? "hidden" : "flex"
                        } justify-center items-center w-8 h-8 rounded-lg text-white text-xs font-semibold bg-gradient-to-br flex-shrink-0 ${
                          accentClasses.gradient
                        }`}
                      >
                        <BuildingOfficeIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {it.name}
                        </p>
                        {showBadge && badgeLabel && (
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 border rounded text-xs ${accentClasses.badge}`}
                          >
                            {badgeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">Deals</span>
                      <div
                        className={`inline-flex justify-center items-center w-8 h-8 rounded-full flex-shrink-0 ${accentClasses.countBg}`}
                      >
                        <span className="text-sm font-bold">
                          {formatNumber(it.count)}
                        </span>
                      </div>
                      <div className="text-right min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {renderMostRecentTargetValue(
                            it,
                            "text-blue-600 hover:underline"
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {it.closedDate || "-"}
                        </p>
                      </div>
                    </div>
                  </>
                );
                return it.id ? (
                  <a
                    key={`${title}-${it.name}`}
                    href={linkUrl}
                    className="block p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    key={`${title}-${it.name}`}
                    className="block p-3 rounded-lg border border-slate-200 bg-slate-50/50"
                  >
                    {content}
                  </div>
                );
              })
            )}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-auto" style={{ maxHeight: "28rem" }}>
            <table className="min-w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: "38%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "38%" }} />
              </colgroup>
              <thead className="bg-slate-50/80">
                <tr className="hover:bg-slate-50/80">
                  <th className="py-3 font-semibold text-left text-slate-700">
                    {isInvestorTable ? "Investor" : "Acquirer"}
                  </th>
                  <th className="py-3 font-semibold text-center text-slate-700">
                    Deals
                  </th>
                  <th className="py-3 font-semibold text-left text-slate-700">
                    {mostRecentHeader ?? "Most Recent"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!hasItems ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-sm text-center text-slate-500"
                    >
                      -
                    </td>
                  </tr>
                ) : (
                  items.slice(0, 25).map((it) => {
                    const linkUrl = isInvestorTable
                      ? `/investors/${it.id}`
                      : `/company/${it.id}`;
                    return (
                      <tr
                        key={`${title}-${it.name}`}
                        className={`transition-colors duration-150 hover:bg-slate-50/50 ${
                          it.id ? "cursor-pointer" : ""
                        }`}
                        onClick={() => {
                          if (it.id) {
                            window.location.href = linkUrl;
                          }
                        }}
                      >
                        <td className="py-3 pr-4">
                          {it.id ? (
                            <a href={linkUrl} className="flex gap-3 items-center">
                              {it.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={it.logoUrl}
                                  alt={it.name}
                                  className="object-contain w-8 h-8 rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback =
                                      target.nextElementSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className={`${
                                  it.logoUrl ? "hidden" : "flex"
                                } justify-center items-center w-8 h-8 rounded-lg text-white text-xs font-semibold bg-gradient-to-br ${
                                  accentClasses.gradient
                                }`}
                              >
                                <BuildingOfficeIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-medium text-blue-600 underline">
                                  {it.name}
                                </span>
                                {showBadge && badgeLabel && (
                                  <span
                                    className={`inline-block mt-1 px-2 py-0.5 border rounded text-xs ${accentClasses.badge}`}
                                  >
                                    {badgeLabel}
                                  </span>
                                )}
                              </div>
                            </a>
                          ) : (
                            <div className="flex gap-3 items-center">
                              {it.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={it.logoUrl}
                                  alt={it.name}
                                  className="object-contain w-8 h-8 rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback =
                                      target.nextElementSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className={`${
                                  it.logoUrl ? "hidden" : "flex"
                                } justify-center items-center w-8 h-8 rounded-lg text-white text-xs font-semibold bg-gradient-to-br ${
                                  accentClasses.gradient
                                }`}
                              >
                                <BuildingOfficeIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {it.name}
                                </p>
                                {showBadge && badgeLabel && (
                                  <span
                                    className={`inline-block mt-1 px-2 py-0.5 border rounded text-xs ${accentClasses.badge}`}
                                  >
                                    {badgeLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <div
                            className={`inline-flex justify-center items-center w-8 h-8 rounded-full ${accentClasses.countBg}`}
                          >
                            <span className="text-sm font-bold">
                              {formatNumber(it.count)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {renderMostRecentTargetValue(it)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {it.closedDate || "-"}
                            </p>
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

  const getDealTypeBadge = (dealType?: string) => {
    const colors: Record<string, string> = {
      acquisition: "bg-red-50 text-red-700 border-red-200",
      merger: "bg-blue-50 text-blue-700 border-blue-200",
      ipo: "bg-green-50 text-green-700 border-green-200",
      funding_round: "bg-purple-50 text-purple-700 border-purple-200",
      lbo: "bg-orange-50 text-orange-700 border-orange-200",
      recapitalization: "bg-pink-50 text-pink-700 border-pink-200",
    };
    return (
      colors[(dealType || "").toLowerCase().replace(/\s+/g, "_")] ||
      "bg-gray-50 text-gray-700 border-gray-200"
    );
  };

  const getStatusBadge = (status?: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-50 text-green-700 border-green-200",
      announced: "bg-blue-50 text-blue-700 border-blue-200",
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      terminated: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      colors[(status || "").toLowerCase()] ||
      "bg-gray-50 text-gray-700 border-gray-200"
    );
  };

  return (
    <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 flex flex-col overflow-hidden" style={{ height: '535px' }}>
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-3 items-center text-xl">
          <span className="inline-flex justify-center items-center w-8 h-8 bg-orange-50 rounded-lg">
            <svg
              className="w-4 h-4 text-orange-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12h18M12 3v18" />
            </svg>
          </span>
          <span className="text-slate-900">Recent Transactions</span>
        </div>
      </div>
      <div className="px-5 pb-5 flex-1 overflow-hidden">
        <div className="overflow-auto h-full">
          {/* Mobile: card list */}
          <div className="block space-y-3 md:hidden">
            {!hasItems ? (
              <div className="py-6 text-sm text-center text-slate-500">
                -
              </div>
            ) : (
              transactions.slice(0, 25).map((t, idx) => {
                const announcementDate = t.date ? new Date(t.date) : null;
                const valueDisplay = t.value ? `$${t.value}M` : null;
                const href = t.eventId
                  ? `/corporate-event/${t.eventId}`
                  : t.targetCompanyId
                  ? `/company/${t.targetCompanyId}`
                  : undefined;
                const content = (
                  <>
                    <div className="flex gap-3 items-start min-w-0">
                      {t.targetLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.targetLogoUrl}
                          alt={t.target}
                          className="object-contain w-8 h-8 rounded-lg flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback =
                              target.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`${
                          t.targetLogoUrl ? "hidden" : "flex"
                        } justify-center items-center w-8 h-8 text-xs font-semibold text-white bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex-shrink-0`}
                      >
                        {(t.target || "?").charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 break-words">
                          {t.target || "-"}
                        </p>
                        {announcementDate &&
                          !Number.isNaN(announcementDate.getTime()) && (
                            <div className="flex gap-1 items-center mt-0.5">
                              <svg
                                className="w-3 h-3 text-slate-400 flex-shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <rect
                                  x="3"
                                  y="4"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                              </svg>
                              <p className="text-xs text-slate-500">
                                {announcementDate.toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "2-digit",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                      <p className="text-xs font-semibold text-slate-500">
                        Buyer/Investor
                      </p>
                      <p className="text-sm font-medium text-slate-900 break-words">
                        {t.buyer || "-"}
                      </p>
                      {valueDisplay && (
                        <p className="text-xs text-slate-500">{valueDisplay}</p>
                      )}
                    </div>
                    {(t.type || t.seller) && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                        {t.type && (
                          <span
                            className={`inline-block px-2 py-1 border rounded text-xs ${getDealTypeBadge(
                              t.type
                            )}`}
                          >
                            {t.type.replace(/_/g, " ")}
                          </span>
                        )}
                        {t.seller && (
                          <span
                            className={`inline-block px-2 py-1 border rounded text-xs ${getStatusBadge(
                              t.seller
                            )}`}
                          >
                            {t.seller}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                );
                return href ? (
                  <a
                    key={`tx-${idx}`}
                    href={href}
                    className="block p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    key={`tx-${idx}`}
                    className="block p-3 rounded-lg border border-slate-200 bg-slate-50/50"
                  >
                    {content}
                  </div>
                );
              })
            )}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-auto h-full">
            <table className="min-w-full text-sm table-fixed">
              <thead className="bg-slate-50/80">
                <tr className="hover:bg-slate-50/80">
                  <th className="py-3 w-1/2 font-semibold text-left text-slate-700">
                    Target
                  </th>
                  <th className="py-3 font-semibold text-left text-slate-700">
                    Buyer/Investor
                  </th>
                  <th className="py-3 font-semibold text-left text-slate-700">
                    Deal Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {hasItems ? (
                  transactions.slice(0, 25).map((t, idx) => {
                    const announcementDate = t.date ? new Date(t.date) : null;
                    const valueDisplay = t.value ? `$${t.value}M` : null;
                    const href = t.eventId
                      ? `/corporate-event/${t.eventId}`
                      : t.targetCompanyId
                      ? `/company/${t.targetCompanyId}`
                      : undefined;
                    return (
                      <tr
                        key={`tx-${idx}`}
                        className={`transition-colors duration-150 hover:bg-slate-50/50 ${
                          href ? "cursor-pointer" : ""
                        }`}
                        onClick={() => {
                          if (href) {
                            window.location.href = href;
                          }
                        }}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex gap-3 items-center">
                            {t.targetLogoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={t.targetLogoUrl}
                                alt={t.target}
                                className="object-contain w-8 h-8 rounded-lg"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const fallback =
                                    target.nextElementSibling as HTMLElement | null;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={`${
                                t.targetLogoUrl ? "hidden" : "flex"
                              } justify-center items-center w-8 h-8 text-xs font-semibold text-white bg-gradient-to-br from-orange-500 to-red-500 rounded-lg`}
                            >
                              {(t.target || "?").charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {t.target || "-"}
                              </p>
                              {announcementDate &&
                                !Number.isNaN(announcementDate.getTime()) && (
                                  <div className="flex gap-1 items-center mt-1">
                                    <svg
                                      className="w-3 h-3 text-slate-400"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <rect
                                        x="3"
                                        y="4"
                                        width="18"
                                        height="18"
                                        rx="2"
                                      />
                                      <path d="M16 2v4M8 2v4M3 10h18" />
                                    </svg>
                                    <p className="text-xs text-slate-500">
                                      {announcementDate.toLocaleDateString(
                                        undefined,
                                        {
                                          month: "short",
                                          day: "2-digit",
                                          year: "numeric",
                                        }
                                      )}
                                    </p>
                                  </div>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium text-slate-900">
                              {t.buyer || "-"}
                            </p>
                            {valueDisplay && (
                              <p className="mt-1 text-xs text-slate-500">
                                {valueDisplay}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="space-y-1">
                            {t.type && (
                              <span
                                className={`inline-block px-2 py-1 border rounded text-xs ${getDealTypeBadge(
                                  t.type
                                )}`}
                              >
                                {t.type.replace(/_/g, " ")}
                              </span>
                            )}
                            {t.seller && (
                              <span
                                className={`inline-block px-2 py-1 border rounded text-xs ${getStatusBadge(
                                  t.seller
                                )} ml-1`}
                              >
                                {t.seller}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-sm text-center text-slate-500"
                    >
                      -
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
}: {
  companies: SectorCompany[];
  counts?: MarketMapCounts;
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

  const getIcon = (type: string) => {
    if (type === "public")
      return (
        <svg
          className="w-4 h-4 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      );
    if (type === "private_equity_owned")
      return (
        <svg
          className="w-4 h-4 text-purple-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 1v22M3 8h18M3 16h18" />
        </svg>
      );
    if (type === "venture_capital_backed")
      return (
        <svg
          className="w-4 h-4 text-green-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    return (
      <svg
        className="w-4 h-4 text-gray-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    );
  };

  const titleFor = (type: string) =>
    type === "public"
      ? "Public Companies"
      : type === "private_equity_owned"
      ? "Private Equity Owned"
      : type === "venture_capital_backed"
      ? "Venture Capital Backed"
      : "Private Companies";

  const colorFor = (type: string) =>
    type === "public"
      ? "from-blue-500 to-blue-600"
      : type === "private_equity_owned"
      ? "from-purple-500 to-purple-600"
      : type === "venture_capital_backed"
      ? "from-green-500 to-green-600"
      : "from-gray-500 to-gray-600";

  return (
    <div className="bg-gradient-to-br from-white rounded-xl border-0 shadow-lg to-slate-50/50">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex gap-3 items-center text-xl">
          <span className="inline-flex justify-center items-center w-8 h-8 bg-indigo-50 rounded-lg">
            <svg
              className="w-5 h-5 text-indigo-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </span>
          <span className="text-slate-900">Market Map</span>
        </div>
      </div>
      <div className="px-5 pt-6 pb-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Object.entries(categorized).map(([type, list]) => (
            <div key={type} className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <div className="flex gap-3 items-center min-w-0">
                  {getIcon(type)}
                  <h3 className="font-semibold text-slate-900 truncate">
                    {titleFor(type)}
                  </h3>
                  <span className="inline-flex flex-shrink-0 px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {countsProp?.[type as keyof MarketMapCounts] ?? list.length}
                  </span>
                </div>
                <a
                  href={`?tab=all&ownership=${encodeURIComponent(type)}`}
                  className="flex-shrink-0 px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  View All
                </a>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {list.slice(0, 12).map((company) => (
                  <a
                    key={company.id}
                    href={`/company/${company.id}`}
                    className="relative p-3 bg-white rounded-xl border transition-all duration-200 group border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    title={company.name}
                  >
                    {company.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="object-contain w-10 h-10"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallback =
                            target.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-8 h-8 bg-gradient-to-r ${colorFor(
                        type
                      )} rounded-lg flex items-center justify-center text-white text-xs font-semibold mb-2 ${
                        company.logo_url ? "hidden" : "flex"
                      }`}
                    >
                      {company.name.charAt(0)}
                    </div>
                    <p className="mt-2 text-[11px] leading-tight text-slate-700 truncate">
                      {company.name}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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
  const [companies, setCompanies] = useState<SectorCompany[]>([]);
  const [companiesTotal, setCompaniesTotal] = useState<number | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });
  const [selectedPerPage, setSelectedPerPage] = useState(50);
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
  const [companiesApiPayload, setCompaniesApiPayload] = useState<unknown>(null);
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

  // Fetch companies data (include companies whose secondary sectors map to this primary sector)
  const fetchCompanies = useCallback(
    async (page: number = 1, perPageOverride?: number) => {
      setCompaniesLoading(true);
      const perPageToUse = perPageOverride || selectedPerPage;

      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setError("Authentication required");
          setCompaniesLoading(false);
          return;
        }

        const sectorIdNum = Number(sectorId);
        const offsetForApi = Math.max(1, page);
        const params = new URLSearchParams();
        params.append("Offset", String(offsetForApi));
        params.append("Per_page", String(perPageToUse));
        if (!Number.isNaN(sectorIdNum)) {
          params.append("Sector_id", String(sectorIdNum));
        }

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Get_Sector_s_new_companies?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required");
          }
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const rawJson = await response.json();
        setCompaniesApiPayload(rawJson);

        const raw = rawJson as unknown as
          | NewCompaniesAPIResult
          | { items?: NewCompanyItem[] }
          | (NewCompanyItem[] & { Count?: number })
          | ({ result1?: { items?: NewCompanyItem[] } } & { Count?: number })
          | { sql_count?: Array<{ total_companies?: number }> };

        let items: NewCompanyItem[] = [];
        if (Array.isArray((raw as NewCompaniesAPIResult)?.result1?.items)) {
          items = ((raw as NewCompaniesAPIResult).result1!.items ||
            []) as NewCompanyItem[];
        } else if (Array.isArray((raw as { items?: NewCompanyItem[] }).items)) {
          items = ((raw as { items?: NewCompanyItem[] }).items ||
            []) as NewCompanyItem[];
        } else if (Array.isArray(raw)) {
          items = raw as NewCompanyItem[];
        }
        const r1 = (raw as NewCompaniesAPIResult)?.result1;
        const sqlTotal = (
          raw as { sql_count?: Array<{ total_companies?: number }> }
        ).sql_count?.[0]?.total_companies;
        const overallCount: number =
          (typeof sqlTotal === "number" ? sqlTotal : undefined) ??
          (raw as { Count?: number })?.Count ??
          (typeof r1?.itemsReceived === "number"
            ? r1!.itemsReceived
            : undefined) ??
          items.length;
        const adapted: SectorCompany[] = items.map((c) => ({
          id: c.id,
          name: c.name,
          locations_id: 0,
          url: c.url || "",
          sectors: Array.isArray(
            (c as unknown as { sectors?: string[] }).sectors
          )
            ? ((c as unknown as { sectors?: string[] }).sectors as string[])
            : Array.isArray(c.secondary_sectors)
            ? (c.secondary_sectors as SectorLinkItem[])
                .map(getSectorLabel)
                .filter((s) => s.length > 0)
            : [],
          primary_sectors: Array.isArray(c.primary_sectors)
            ? c.primary_sectors
            : [],
          description: c.description || "",
          linkedin_employee:
            (c as unknown as { linkedin_employee?: number })
              .linkedin_employee ??
            (c as unknown as { linkedin_members?: number }).linkedin_members ??
            0,
          linkedin_employee_latest:
            (c as unknown as { linkedin_employee_latest?: number })
              .linkedin_employee_latest ??
            (c as unknown as { linkedin_employee?: number })
              .linkedin_employee ??
            (c as unknown as { linkedin_members?: number }).linkedin_members ??
            0,
          linkedin_employee_old:
            (c as unknown as { linkedin_employee_old?: number })
              .linkedin_employee_old ??
            (c as unknown as { linkedin_members_old?: number })
              .linkedin_members_old ??
            0,
          linkedin_logo: c.linkedin_logo || "",
          country: c.country || "",
          ownership_type_id: c.ownership_type_id || 0,
          ownership: c.ownership || "",
          is_that_investor:
            (c as unknown as { is_that_investor?: boolean }).is_that_investor ??
            false,
          companies_investors:
            (
              c as unknown as {
                companies_investors?: Array<{
                  company_name: string;
                  original_new_company_id: number;
                }>;
              }
            ).companies_investors || [],
        }));

        setCompanies(adapted);
        setCompaniesTotal(
          typeof overallCount === "number" ? overallCount : adapted.length
        );
        const r1b = (raw as NewCompaniesAPIResult)?.result1;
        const computedCurPage = r1b?.curPage ?? page;
        const computedPerPage = r1b?.perPage ?? perPageToUse;
        const computedOffset =
          typeof r1b?.offset === "number"
            ? Math.max(0, (r1b.offset - 1) * computedPerPage)
            : Math.max(0, (computedCurPage - 1) * computedPerPage);
        setPagination({
          itemsReceived: r1b?.itemsReceived || adapted.length,
          curPage: computedCurPage,
          nextPage: r1b?.nextPage ?? null,
          prevPage: r1b?.prevPage ?? null,
          offset: computedOffset,
          perPage: computedPerPage,
          pageTotal:
            r1b?.pageTotal ||
            Math.max(
              1,
              Math.ceil((overallCount || adapted.length) / computedPerPage)
            ),
        });
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setCompaniesLoading(false);
      }
    },
    [sectorId, selectedPerPage]
  );

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
        } else {
          console.error("❌ Overview fetch failed:", resp.status);
        }
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

  const handlePageChange = useCallback(
    (page: number) => {
      fetchCompanies(page);
    },
    [fetchCompanies]
  );

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
    companies,
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
    if (!preferredSource) return companies;
    const raw = (preferredSource as { market_map?: unknown })?.market_map;
    const mapped = mapMarketMapToCompanies(raw);
    return mapped.length > 0 ? mapped : companies;
  }, [preferredSource, companies]);

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
                    color: "#0075df",
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
                    color: "#0075df",
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
                    color: "#0075df",
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

  const totalCompaniesStat =
    totalsRow?.Number_of_Companies ??
    (typeof (
      sectorData as unknown as { Total_number_of_companies?: unknown } | null
    )?.Total_number_of_companies === "number"
      ? (
          sectorData as unknown as {
            Total_number_of_companies: number;
          }
        ).Total_number_of_companies
      : 0);

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

        setArticles(data.items);
        setPagination({
          itemsReceived: data.itemsReceived,
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

    const badgeClassFor = (contentType?: string): string => {
      const t = (contentType || "").toLowerCase();
      if (t === "company analysis") return "badge badge-company-analysis";
      if (t === "deal analysis") return "badge badge-deal-analysis";
      if (t === "deal perspective") return "badge badge-deal-perspective";
      if (t === "market commentary") return "badge badge-market-commentary";
      if (t === "sector analysis") return "badge badge-sector-analysis";
      if (t === "hot take") return "badge badge-hot-take";
      if (t === "executive interview") return "badge badge-executive-interview";
      return "badge";
    };

    const generatePaginationButtons = () => {
      const buttons = [];
      const currentPage = pagination.curPage;
      const totalPages = pagination.pageTotal;

      buttons.push(
        <button
          key="prev"
          className="pagination-button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!pagination.prevPage}
        >
          &lt;
        </button>
      );

      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
          buttons.push(
            <button
              key={i}
              className={`pagination-button ${
                i === currentPage ? "active" : ""
              }`}
              onClick={() => handlePageChange(i)}
            >
              {i.toString()}
            </button>
          );
        }
      } else {
        buttons.push(
          <button
            key={1}
            className={`pagination-button ${currentPage === 1 ? "active" : ""}`}
            onClick={() => handlePageChange(1)}
          >
            1
          </button>
        );

        if (currentPage > 3) {
          buttons.push(
            <span key="ellipsis1" className="pagination-ellipsis">
              ...
            </span>
          );
        }

        for (
          let i = Math.max(2, currentPage - 1);
          i <= Math.min(totalPages - 1, currentPage + 1);
          i++
        ) {
          if (i > 1 && i < totalPages) {
            buttons.push(
              <button
                key={i}
                className={`pagination-button ${
                  i === currentPage ? "active" : ""
                }`}
                onClick={() => handlePageChange(i)}
              >
                {i.toString()}
              </button>
            );
          }
        }

        if (currentPage < totalPages - 2) {
          buttons.push(
            <span key="ellipsis2" className="pagination-ellipsis">
              ...
            </span>
          );
        }

        buttons.push(
          <button
            key={totalPages}
            className={`pagination-button ${
              currentPage === totalPages ? "active" : ""
            }`}
            onClick={() => handlePageChange(totalPages)}
          >
            {totalPages.toString()}
          </button>
        );
      }

      buttons.push(
        <button
          key="next"
          className="pagination-button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!pagination.nextPage}
        >
          &gt;
        </button>
      );

      return buttons;
    };

    return (
      <div className="space-y-6">
        {/* Filters Section */}
        <div className="p-8 bg-white rounded-xl border shadow-lg border-slate-200/60">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Enter search term here"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-3 w-full rounded-md border border-slate-300"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
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
                className="px-4 py-3 w-full rounded-md border border-slate-300"
              >
                <option value="">All Content Types</option>
                {contentTypes.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 w-full font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {error && (
            <div className="p-3 mt-4 text-red-700 bg-red-50 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {loading && (
          <div className="py-10 text-center text-slate-600">
            Loading articles...
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="py-10 text-center text-slate-600">
            No articles found.
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="insights-analysis-cards">
            {articles.map((article: ContentArticle, index: number) => {
              const effectiveContentType = getEffectiveContentType(article);

              return (
                <a
                  key={article.id || index}
                  href={`/article/${article.id}`}
                  className="article-card"
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
                  <h3 className="article-title">
                    {article.Headline || "-"}
                  </h3>
                  <p className="article-date">
                    {formatDate(article.Publication_Date)}
                  </p>
                  {article.Transaction_status && (
                    <div className="article-transaction-status-row">
                      <span className="article-transaction-status-badge">
                        {article.Transaction_status}
                      </span>
                    </div>
                  )}
                  {effectiveContentType && (
                    <div className="article-badge-row">
                      <span className={badgeClassFor(effectiveContentType)}>
                        {effectiveContentType}
                      </span>
                    </div>
                  )}
                  <p className="article-summary">
                    {article.Strapline || "No summary available"}
                  </p>
                  <div className="article-meta">
                    <span className="article-meta-label">Companies:</span>
                    <span className="article-meta-value">
                      {formatCompanies(article.companies_mentioned)}
                    </span>
                  </div>
                  <div className="article-meta">
                    <span className="article-meta-label">Sectors:</span>
                    <span className="article-meta-value">
                      {formatSectors(article.sectors)}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pageTotal > 1 && (
          <div className="flex gap-2 justify-center items-center mt-6">
            {generatePaginationButtons()}
          </div>
        )}

        {/* CSS Styles */}
        <style jsx>{`
          .insights-analysis-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 24px;
            padding: 0;
            margin-bottom: 24px;
          }
          .article-card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 16px;
            border: 1px solid #e2e8f0;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            display: block;
            text-decoration: none;
            color: inherit;
          }
          .article-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
          .article-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a202c;
            margin: 0 0 8px 0;
            line-height: 1.3;
          }
          .article-date {
            font-size: 14px;
            color: #6b7280;
            margin: 0 0 16px 0;
            font-weight: 500;
          }
          .article-transaction-status-row {
            margin: -6px 0 10px 0;
            display: block;
          }
          .article-transaction-status-badge {
            display: inline-flex;
            align-items: center;
            font-size: 11px;
            line-height: 1;
            padding: 5px 10px;
            border-radius: 9999px;
            border: 1.5px solid #4ade80;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            background: #dcfce7;
            color: #166534;
            white-space: nowrap;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .article-badge-row {
            margin: -8px 0 16px 0;
            display: block;
          }
          .badge {
            display: inline-block;
            font-size: 12px;
            line-height: 1;
            padding: 6px 10px;
            border-radius: 9999px;
            border: 1px solid transparent;
            font-weight: 600;
          }
          .badge-company-analysis {
            background: #ecfdf5;
            color: #065f46;
            border-color: #a7f3d0;
          }
          .badge-deal-analysis {
            background: #eff6ff;
            color: #1e40af;
            border-color: #bfdbfe;
          }
          .badge-deal-perspective {
            background: #ecfeff;
            color: #155e75;
            border-color: #a5f3fc;
          }
          .badge-market-commentary {
            background: #fefce8;
            color: #854d0e;
            border-color: #fde68a;
          }
          .badge-sector-analysis {
            background: #f5f3ff;
            color: #5b21b6;
            border-color: #ddd6fe;
          }
          .badge-hot-take {
            background: #fff7ed;
            color: #9a3412;
            border-color: #fed7aa;
          }
          .badge-executive-interview {
            background: #f0fdf4;
            color: #166534;
            border-color: #bbf7d0;
          }
          .article-summary {
            font-size: 14px;
            color: #374151;
            line-height: 1.6;
            margin: 0 0 16px 0;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .article-meta {
            margin-bottom: 12px;
          }
          .article-meta:last-child {
            margin-bottom: 0;
          }
          .article-meta-label {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin-right: 8px;
          }
          .article-meta-value {
            font-size: 13px;
            color: #6b7280;
            line-height: 1.4;
          }
          .pagination-button {
            padding: 8px 12px;
            border: none;
            background: none;
            color: #000;
            cursor: pointer;
            font-size: 14px;
            transition: color 0.2s;
          }
          .pagination-button:hover {
            color: #0075df;
          }
          .pagination-button.active {
            color: #0075df;
            text-decoration: underline;
            font-weight: 500;
          }
          .pagination-button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            color: #666;
          }
          .pagination-ellipsis {
            padding: 8px 12px;
            color: #000;
            font-size: 14px;
          }
          @media (max-width: 768px) {
            .insights-analysis-cards {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br to-blue-50 from-slate-50">
      <Header />
      <header className="bg-white border-b shadow-sm border-slate-200/60">
        <div className="px-6 py-4 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <BuildingOfficeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {sectorData ? (
                    (sectorData as { sector_name?: string })?.sector_name || // New flat format
                    (sectorData as { Sector?: { sector_name?: string } })?.Sector?.sector_name || // Old nested format
                    "Sector"
                  ) : (
                    <span className="inline-block h-7 w-48 bg-slate-200 animate-pulse rounded"></span>
                  )}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex justify-center items-center w-8 h-8 rounded-full bg-slate-200">
                <BuildingOfficeIcon className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 w-full">
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "overview" ? (
          <div className="space-y-8">
            {/* Top Row - Changed from grid to flex */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/2">
                <RecentInsightsCard sectorId={sectorId} />
              </div>
              <div className="lg:w-1/2">
                {recentTransactions.length > 0 ? (
                  <RecentTransactionsCard transactions={recentTransactions} />
                ) : overviewDataLoaded ? (
                  <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h3>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-slate-500 text-sm">No recent transactions data available for this sector</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5 animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-16 bg-slate-200 rounded"></div>
                      <div className="h-16 bg-slate-200 rounded"></div>
                      <div className="h-16 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              ) : overviewDataLoaded ? (
                <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Most Active Strategic Acquirers</h3>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm">No strategic acquirers data available for this sector</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-12 bg-slate-200 rounded"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                  </div>
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
              ) : overviewDataLoaded ? (
                <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Most Active Private Equity Investors</h3>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm">No private equity investors data available for this sector</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-12 bg-slate-200 rounded"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row */}
            {marketMapCompanies.length > 0 ? (
              <MarketMapGrid
                companies={marketMapCompanies}
                counts={marketMapCounts}
              />
            ) : overviewDataLoaded ? (
              <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Market Map</h3>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm">No market map data available for this sector</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-24 bg-slate-200 rounded"></div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug blocks removed */}

            {/* Pagination controls */}
            {pagination.pageTotal > 1 && (
              <div className="flex gap-3 justify-between items-center">
                <div className="text-sm text-slate-600">
                  Showing {pagination.offset + 1} -{" "}
                  {Math.min(
                    pagination.offset + pagination.perPage,
                    companiesTotal ?? totalCompaniesStat
                  )}{" "}
                  of {formatNumber(companiesTotal ?? totalCompaniesStat)}{" "}
                  companies
                  {pagination.pageTotal > 1 && (
                    <span className="ml-2">
                      (Page {pagination.curPage} of {pagination.pageTotal})
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-slate-600">Show</label>
                  <select
                    value={selectedPerPage}
                    onChange={(e) => {
                      const newPerPage = parseInt(e.target.value);
                      setSelectedPerPage(newPerPage);
                      fetchCompanies(1, newPerPage);
                    }}
                    className="px-2 py-1 text-sm bg-white rounded-md border border-slate-300"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                  </select>
                  <span className="text-sm text-slate-600">per page</span>
                  <div className="flex gap-2 items-center ml-4">
                    <button
                      className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                      onClick={() =>
                        handlePageChange(
                          Math.max(1, (pagination.curPage || 1) - 1)
                        )
                      }
                      disabled={(pagination.curPage || 1) <= 1}
                    >
                      ← Previous
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                      onClick={() =>
                        handlePageChange(
                          Math.min(
                            pagination.pageTotal || 1,
                            (pagination.curPage || 1) + 1
                          )
                        )
                      }
                      disabled={
                        (pagination.curPage || 1) >= (pagination.pageTotal || 1)
                      }
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {companiesLoading && (
              <div className="text-center text-slate-500">
                Loading companies...
              </div>
            )}
          </div>
        ) : activeTab === "all" ? (
          !Number.isNaN(Number(sectorId)) && Number(sectorId) > 0 ? (
            <div className="space-y-4">
              {ownershipFilter && (
                <div className="px-3 py-2 bg-blue-50 rounded border border-blue-200">
                  <span className="text-sm text-blue-900">
                    Viewing a pre-filtered list:{" "}
                    <strong>
                      {ownershipFilter === "public"
                        ? "Public Companies"
                        : ownershipFilter === "private_equity_owned"
                        ? "Private Equity Owned"
                        : ownershipFilter === "venture_capital_backed"
                        ? "Venture Capital Backed"
                        : "Private Companies"}
                    </strong>
                  </span>
                  <button
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
                    className="ml-3 text-sm font-semibold text-blue-700 underline hover:text-blue-900"
                  >
                    Clear filter
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
                enableColumnControl={false}
                enableFilterControl={false}
                enableExport={false}
                enableRowSelection
                columnsStorageScope="session"
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
              columnsStorageScope="session"
            />
          ) : null
        ) : activeTab === "subsectors" ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center text-xl">
                    <span className="inline-flex justify-center items-center w-8 h-8 bg-indigo-50 rounded-lg">
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    <span className="text-slate-900">Sub-Sectors</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {subSectors.length.toLocaleString()} total
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {subSectorsLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading sub-sectors...
                  </div>
                ) : subSectorsError ? (
                  <div className="py-4 text-center text-red-600">
                    {subSectorsError}
                  </div>
                ) : subSectors.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No sub-sectors found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {subSectors.map((s) => (
                      <a
                        key={s.id}
                        href={`/sub-sector/${s.id}`}
                        className="inline-flex max-w-full text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 truncate hover:bg-blue-100 hover:border-blue-300 transition-colors duration-150"
                        title={s.sector_name}
                      >
                        {s.sector_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
          <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-slate-200">
            <div className="text-center">
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                {activeTab.charAt(0).toUpperCase() +
                  activeTab.slice(1).replace("_", " ")}{" "}
                Section
              </h3>
              <p className="text-slate-500">This section is coming soon</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SectorDetailPage;
