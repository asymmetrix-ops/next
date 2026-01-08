"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  CorporateEvent,
  CorporateEventsResponse,
  CorporateEventsFilters,
  BuyerInvestorType,
} from "@/types/corporateEvents";
import { CSVExporter } from "@/utils/csvExport";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
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

interface SectorCompany {
  id: number;
  name: string;
  locations_id: number;
  url: string;
  sectors: string[];
  primary_sectors: string[];
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
interface NewCompanyItem {
  id: number;
  name: string;
  url?: string;
  secondary_sectors?: string[];
  primary_sectors?: string[];
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

interface RankedEntity {
  name: string;
  count: number;
  id?: number;
  mostRecentTarget?: string;
  closedDate?: string;
  logoUrl?: string; // fully qualified (e.g., data:image/jpeg;base64,...)
}

function toStringSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Cleans strings like "{\"Investor A\",InvestorB}" into "Investor A, InvestorB"
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

// Extracts an array from various possible wrapper shapes (e.g., { items: [...] })
function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidates = [
      obj.items,
      (obj as { data?: unknown[] }).data,
      (obj as { results?: unknown[] }).results,
      (obj as { list?: unknown[] }).list,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as unknown[];
    }
  }
  return [];
}

// Flexible key lookup helpers for mapping varied API shapes
function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function getFirstMatchingValue(
  obj: Record<string, unknown>,
  candidateKeys: string[]
): unknown {
  const map: Record<string, string> = {};
  for (const k of Object.keys(obj)) {
    map[normalizeKey(k)] = k;
  }
  for (const key of candidateKeys) {
    const exact = obj[key];
    if (exact !== undefined) return exact;
    const normalized = normalizeKey(key);
    const realKey = map[normalized];
    if (realKey && obj[realKey] !== undefined) return obj[realKey];
  }
  return undefined;
}

function getFirstMatchingNumber(
  obj: Record<string, unknown>,
  candidateKeys: string[]
): number | undefined {
  const val = getFirstMatchingValue(obj, candidateKeys);
  return typeof val === "number"
    ? val
    : typeof val === "string" && val.trim() !== ""
    ? Number(val)
    : undefined;
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
          "buyer_investor", // e.g., Buyer_Investor from recent transactions endpoint
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
          "investment_amount_m", // from recent transactions endpoint
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
      // Target logo mapping (supports base64 or full URL)
      const rawTargetLogo = toStringSafe(
        getFirstMatchingValue(obj, [
          "Target_Logo",
          "target_logo",
          "targetLogo",
        ]) || ""
      );
      const targetLogoUrl = rawTargetLogo
        ? rawTargetLogo.startsWith("http") ||
          rawTargetLogo.startsWith("data:image")
          ? rawTargetLogo
          : `data:image/jpeg;base64,${rawTargetLogo}`
        : "";
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

function mapRankedEntities(raw: unknown): RankedEntity[] {
  const arr = extractArray(raw);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      const name = toStringSafe(
        getFirstMatchingValue(obj, [
          "name",
          "company",
          "investor",
          "acquirer",
          "label",
          "entity",
          "firm",
          "Acquirer",
        ])
      );
      const countRaw =
        getFirstMatchingNumber(obj, [
          "Deals_5y",
          "deals_5y",
          "count",
          "deals",
          "total",
          "n",
          "times",
          "occurrences",
        ]) ?? 0;
      const mostRecentTarget = toStringSafe(
        getFirstMatchingValue(obj, [
          "Most_Recent_Target",
          "most_recent_target",
          "Most_Recent_Acquisition",
          "most_recent_acquisition",
        ]) || ""
      );
      const closedDate = toStringSafe(
        getFirstMatchingValue(obj, [
          "Closed_Date",
          "closed_date",
          "date",
          "Announcement_Date",
          "announcement_date",
        ]) || ""
      );
      const acquirerId = getFirstMatchingNumber(obj, [
        "acquirer_company_id",
        "original_new_company_id",
        "new_company_id",
        "acquirer_id",
        "company_id",
        "id",
        "investor_company_id",
      ]);
      // Build logo URL if available (prefer prefixed, else base64 data)
      const rawLogo = toStringSafe(
        getFirstMatchingValue(obj, [
          "Acquirer_Logo_Url",
          "logo",
          "logo_url",
          "logoUrl",
        ]) || ""
      );
      const logoUrl = rawLogo
        ? rawLogo.startsWith("http") || rawLogo.startsWith("data:image")
          ? rawLogo
          : `data:image/jpeg;base64,${rawLogo}`
        : "";
      const count = typeof countRaw === "number" ? countRaw : 0;
      if (!name) return null;
      return {
        name,
        count,
        id: typeof acquirerId === "number" ? acquirerId : undefined,
        mostRecentTarget: mostRecentTarget || undefined,
        closedDate: closedDate || undefined,
        logoUrl: logoUrl || undefined,
      } as RankedEntity;
    })
    .filter(Boolean) as RankedEntity[];
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
  { id: "public", name: "Public Companies" },
  { id: "subsectors", name: "Sub-Sectors" },
  { id: "transactions", name: "Transactions" },
  { id: "insights", name: "Insights & Analysis" },
  { id: "all", name: "All Companies" },
] as const;

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

function SectorThesisCard({
  sectorData,
}: {
  sectorData: SectorStatistics | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle both old (nested) and new (flat) API response formats
  const sectorName = 
    (sectorData as { sector_name?: string })?.sector_name || // New flat format
    sectorData?.Sector?.sector_name;    // Old nested format
  const thesisHtml = 
    (sectorData as { Sector_thesis?: string })?.Sector_thesis || // New flat format
    sectorData?.Sector?.Sector_thesis;    // Old nested format

  const normalizedThesisHtml = useMemo(() => {
    if (!thesisHtml) return "";
    const looksEncoded =
      thesisHtml.includes("&lt;") &&
      thesisHtml.includes("&gt;");
    const result = looksEncoded
      ? thesisHtml
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
      : thesisHtml;
    
    if (result.includes('<ul>') || result.includes('<li>')) {
      // HTML contains ul/li tags
    }
    
    return result;
  }, [thesisHtml]);

  // Check if content exceeds container height
  useEffect(() => {
    if (contentRef.current && containerRef.current && thesisHtml) {
      const contentHeight = contentRef.current.scrollHeight;
      const containerHeight = containerRef.current.clientHeight;
      // Show button if content is taller than available container space
      setShowButton(contentHeight > containerHeight - 48); // -48 for button height + margin
    }
  }, [thesisHtml]);

  return (
    <div 
      className="bg-white rounded-xl border shadow-lg border-slate-200/60 flex flex-col"
      style={{ height: isExpanded ? 'auto' : '535px' }}
    >
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
                <path d="M12 19V6M5 12h14" />
              </svg>
            </span>
            <span className="font-semibold text-slate-900">Sector Thesis</span>
          </div>
          {sectorName && (
            <span className="text-xs px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
              {sectorName}
            </span>
          )}
        </div>
      </div>
      <div 
        ref={containerRef}
        className="px-5 py-5 flex flex-col flex-1 overflow-hidden"
      >
        {thesisHtml ? (
          <>
            <div
              ref={contentRef}
              className="sector-thesis-content text-slate-700 flex-1"
              style={{
                fontSize: '14px',
                lineHeight: '1.7',
                overflow: isExpanded ? 'visible' : 'hidden',
              }}
              dangerouslySetInnerHTML={{ __html: normalizedThesisHtml }}
            />
            {showButton && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors self-start flex-shrink-0"
              >
                {isExpanded ? 'See Less' : 'See More'}
              </button>
            )}
            {/* Inline styles for this specific component */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  .sector-thesis-content ul { 
                    list-style-type: disc !important; 
                    list-style: disc !important; 
                    margin: 0 0 1rem 0 !important; 
                    padding-left: 1.5rem !important; 
                    display: block !important;
                  }
                  .sector-thesis-content ol { 
                    list-style-type: decimal !important; 
                    list-style: decimal !important; 
                    margin: 0 0 1rem 0 !important; 
                    padding-left: 1.5rem !important; 
                    display: block !important;
                  }
                  .sector-thesis-content li { 
                    margin-bottom: 0.5rem !important; 
                    display: list-item !important;
                    list-style-type: inherit !important;
                    list-style-position: outside !important;
                  }
                  .sector-thesis-content ul ul { 
                    margin-top: 0.5rem !important; 
                    margin-bottom: 0.5rem !important; 
                    padding-left: 1.25rem !important; 
                  }
                  .sector-thesis-content p { margin: 0 0 1rem 0; }
                  .sector-thesis-content h1, .sector-thesis-content h2, .sector-thesis-content h3, .sector-thesis-content h4, .sector-thesis-content h5, .sector-thesis-content h6 { margin: 1.25rem 0 0.75rem; font-weight: 700; }
                  .sector-thesis-content a { color: #2563eb; text-decoration: underline; }
                `,
              }}
            />
          </>
        ) : (
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              A detailed sector thesis is not yet available for
              {sectorName ? ` the ${sectorName} sector.` : " this sector."}
            </p>
            <p>
              You can still use the market map, recent transactions, and investor
              activity on this page to understand how this space is evolving.
            </p>
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
}: {
  title: string;
  items: RankedEntity[];
  accent: "blue" | "purple";
  badgeLabel: string;
  mostRecentHeader?: string;
  showBadge?: boolean;
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
      </div>
      <div className="px-5 pb-5">
        <div className="overflow-auto" style={{ maxHeight: "28rem" }}>
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
                    Not available
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
                            {it.mostRecentTarget || "N/A"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {it.closedDate || "N/A"}
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
  );
}

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
    <div className="bg-white rounded-xl border shadow-lg border-slate-200/60" style={{ height: '535px' }}>
      <div className="px-5 py-4 border-b border-slate-100">
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
      <div className="px-5 pb-5">
        <div className="overflow-auto" style={{ maxHeight: "28rem" }}>
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
                    Not available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarketMapGrid({ companies }: { companies: SectorCompany[] }) {
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
      logo_url: c.linkedin_logo
        ? `data:image/jpeg;base64,${c.linkedin_logo}`
        : "",
      sub_sector:
        Array.isArray(c.primary_sectors) && c.primary_sectors.length > 0
          ? c.primary_sectors[0]
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
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-3 items-center">
                  {getIcon(type)}
                  <h3 className="font-semibold text-slate-900">
                    {titleFor(type)}
                  </h3>
                  <span className="inline-flex px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {list.length}
                  </span>
                </div>
                <a
                  href={`?tab=all&ownership=${encodeURIComponent(type)}`}
                  className="px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  View All
                </a>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
  // Market map is server-fetched and passed in via props.
  // Keep it as a stable value (no client re-fetch / no setter needed).
  const splitMarketMapRaw: unknown = initialMarketMap || null;
  const [splitRecentRaw, setSplitRecentRaw] = useState<unknown>(
    initialRecentTransactions || null
  );
  // Sub-sectors
  const [subSectors, setSubSectors] = useState<SubSector[]>([]);
  const [subSectorsLoading, setSubSectorsLoading] = useState(false);
  const [subSectorsError, setSubSectorsError] = useState<string | null>(null);
  // All Companies (reusing companies page logic, filtered by primary sector id)
  interface AllCompanyItem {
    id: number;
    name: string;
    description: string;
    primary_sectors: string[];
    secondary_sectors: string[];
    ownership: string;
    country: string;
    linkedin_logo: string; // base64
    linkedin_members: number;
  }
  interface AllCompaniesFilters {
    countries: string[];
    provinces: string[];
    cities: string[];
    continentalRegions?: string[];
    subRegions?: string[];
    secondarySectors: number[];
    hybridBusinessFocuses: number[];
    ownershipTypes: number[];
    linkedinMembersMin: number | null;
    linkedinMembersMax: number | null;
    searchQuery: string;
  }
  const [allCompanies, setAllCompanies] = useState<AllCompanyItem[]>([]);
  const [allCompaniesLoading, setAllCompaniesLoading] = useState(false);
  const [allCompaniesError, setAllCompaniesError] = useState<string | null>(
    null
  );
  const [allCompaniesPagination, setAllCompaniesPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 25,
    pageTotal: 0,
  });
  const [allExpandedDescriptions, setAllExpandedDescriptions] = useState<
    Record<number, boolean>
  >({});

  // All Companies - filter state and options (mirrors Companies page, excluding Primary Sectors)
  const [allShowFilters, setAllShowFilters] = useState(false);
  const [allSearchTerm, setAllSearchTerm] = useState("");

  // Options
  const [allCountries, setAllCountries] = useState<
    Array<{ locations_Country: string }>
  >([]);
  const [allContinentalRegions, setAllContinentalRegions] = useState<string[]>(
    []
  );
  const [allSubRegions, setAllSubRegions] = useState<string[]>([]);
  const [allProvinces, setAllProvinces] = useState<
    Array<{ State__Province__County: string }>
  >([]);
  const [allCities, setAllCities] = useState<Array<{ City: string }>>([]);
  const [allSecondarySectors, setAllSecondarySectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);
  const [allHybridBusinessFocuses, setAllHybridBusinessFocuses] = useState<
    Array<{ id: number; business_focus: string }>
  >([]);
  const [allOwnershipTypes, setAllOwnershipTypes] = useState<
    Array<{ id: number; ownership: string }>
  >([]);

  // Selected
  const [selCountries, setSelCountries] = useState<string[]>([]);
  const [selContinentalRegions, setSelContinentalRegions] = useState<string[]>(
    []
  );
  const [selSubRegions, setSelSubRegions] = useState<string[]>([]);
  const [selProvinces, setSelProvinces] = useState<string[]>([]);
  const [selCities, setSelCities] = useState<string[]>([]);
  const [selSecondarySectors, setSelSecondarySectors] = useState<number[]>([]);
  const [selHybridBusinessFocuses, setSelHybridBusinessFocuses] = useState<
    number[]
  >([]);
  const [selOwnershipTypes, setSelOwnershipTypes] = useState<number[]>([]);
  const [selLinkedinMin, setSelLinkedinMin] = useState<number | null>(null);
  const [selLinkedinMax, setSelLinkedinMax] = useState<number | null>(null);

  // Current filters for pagination reuse
  const [allCompaniesCurrentFilters, setAllCompaniesCurrentFilters] = useState<
    AllCompaniesFilters | undefined
  >(undefined);

  // Loading flags
  const [loadingAllCountries, setLoadingAllCountries] = useState(false);
  const [loadingAllProvinces, setLoadingAllProvinces] = useState(false);
  const [loadingAllCities, setLoadingAllCities] = useState(false);
  const [loadingAllSecondarySectors, setLoadingAllSecondarySectors] =
    useState(false);
  const [loadingAllHybridFocus, setLoadingAllHybridFocus] = useState(false);
  const [loadingAllOwnershipTypes, setLoadingAllOwnershipTypes] =
    useState(false);

  // Public Companies (reuse companies API with primary sector filter and ownership Public)
  const [publicCompanies, setPublicCompanies] = useState<AllCompanyItem[]>([]);
  const [publicCompaniesLoading, setPublicCompaniesLoading] = useState(false);
  const [publicCompaniesError, setPublicCompaniesError] = useState<
    string | null
  >(null);
  const [publicCompaniesPagination, setPublicCompaniesPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 25,
    pageTotal: 0,
  });
  const [publicExpandedDescriptions, setPublicExpandedDescriptions] = useState<
    Record<number, boolean>
  >({});

  // Ownership type id mapping (from API)
  const [ownershipTypeIds, setOwnershipTypeIds] = useState<
    Record<string, number>
  >({});
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await locationsService.getOwnershipTypes();
        if (!cancelled && Array.isArray(list)) {
          const map: Record<string, number> = {};
          for (const o of list) {
            const id = (o as { id?: number }).id;
            const name = (o as { ownership?: string }).ownership || "";
            if (typeof id === "number" && name) {
              const key = name.trim().toLowerCase();
              map[key] = id;
            }
          }
          setOwnershipTypeIds(map);
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load secondary->primary mapping once (not required in the new overview layout)
  // useEffect(() => {
  //   let cancelled = false;
  //   const load = async () => {
  //     try {
  //       const allSecondary =
  //         await locationsService.getAllSecondarySectorsWithPrimary();
  //       if (!cancelled && Array.isArray(allSecondary)) {
  //         const map: Record<string, string> = {};
  //         for (const sec of allSecondary) {
  //           const secName = (sec as { sector_name?: string }).sector_name;
  //           const primary = (sec as any)?.related_primary_sector as
  //             | { sector_name?: string }
  //             | undefined;
  //           const primaryName = primary?.sector_name;
  //           if (secName && primaryName) {
  //             map[(secName || "").trim().toLowerCase()] = primaryName;
  //           }
  //         }
  //         setSecondaryToPrimaryMap(map);
  //       }
  //     } catch (e) {
  //       console.warn("[Sector] Failed to load secondary->primary map", e);
  //     }
  //   };
  //   load();
  //   return () => {
  //     cancelled = true;
  //   };
  // }, []);

  // Note: fetchSectorData and fetchSplitDatasets removed - now using /api/sector/[id]/overview route

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

        // Prepare sector id
        const sectorIdNum = Number(sectorId);

        // Companies endpoint (sector-scoped) - GET with query params
        // Backend expects Offset as the page number (1-based)
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
        // Parsed companies payload
        // Keep parsed payload for mapping dashboard datasets
        setCompaniesApiPayload(rawJson);

        // Adapt response items to SectorCompany shape used by this page
        const raw = rawJson as unknown as
          | NewCompaniesAPIResult
          // Fallbacks for potential alternative shapes
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
          // prefer SQL-derived total when provided
          (typeof sqlTotal === "number" ? sqlTotal : undefined) ??
          // then explicit Count when available
          (raw as { Count?: number })?.Count ??
          // itemsReceived may represent total when pageTotal is 1
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
            ? (c.secondary_sectors as string[])
            : [],
          primary_sectors: Array.isArray(c.primary_sectors)
            ? c.primary_sectors
            : [],
          description: c.description || "",
          linkedin_employee:
            // support multiple possible fields
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
        // Normalize offset to be a 0-based item start index for internal use
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

  // Note: fetchSplitDatasets removed - now part of /api/sector/[id]/overview route

  // Fetch All Companies via generic companies endpoint filtered by primary sector id
  const fetchAllCompaniesForSector = useCallback(
    async (page: number = 1, filters?: AllCompaniesFilters) => {
      setAllCompaniesLoading(true);
      setAllCompaniesError(null);

      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const Sector_id = Number(sectorId);
        if (Number.isNaN(Sector_id)) {
          throw new Error("Invalid sector id");
        }

        const perPage = 25;
        const offset = page; // companies page uses 1-based Offset

        const params = new URLSearchParams();
        params.append("Offset", String(offset));
        params.append("Per_page", String(perPage));
        // Always send default values; override with filters when provided
        params.append("Min_linkedin_members", "0");
        params.append("Max_linkedin_members", "0");
        params.append("Horizontals_ids", "");
        params.append("Primary_sectors_ids[]", String(Sector_id));
        // Apply ownership filter from URL to keep page sizes consistent
        if (ownershipFilter) {
          // Explicit mapping per product requirements
          const ownershipMap: Record<string, number> = {
            public: 7,
            private_equity_owned: 1,
            venture_capital_backed: 3,
            private: 2,
          };
          const mappedId = ownershipMap[ownershipFilter];
          if (mappedId) {
            params.append("Ownership_types_ids[]", String(mappedId));
          }
        }

        // Merge with current filters when none provided (pagination)
        const filtersToUse = filters ?? allCompaniesCurrentFilters;
        if (filters !== undefined) {
          setAllCompaniesCurrentFilters(filters);
        }
        if (filtersToUse) {
          if ((filtersToUse.continentalRegions || []).length > 0) {
            params.append(
              "Continental_Region",
              (filtersToUse.continentalRegions || []).join(",")
            );
          }
          if ((filtersToUse.subRegions || []).length > 0) {
            params.append(
              "geographical_sub_region",
              (filtersToUse.subRegions || []).join(",")
            );
          }
          if ((filtersToUse.countries || []).length > 0) {
            (filtersToUse.countries || []).forEach((v) =>
              params.append("Countries[]", v)
            );
          }
          if ((filtersToUse.provinces || []).length > 0) {
            (filtersToUse.provinces || []).forEach((v) =>
              params.append("Provinces[]", v)
            );
          }
          if ((filtersToUse.cities || []).length > 0) {
            (filtersToUse.cities || []).forEach((v) =>
              params.append("Cities[]", v)
            );
          }
          if ((filtersToUse.secondarySectors || []).length > 0) {
            (filtersToUse.secondarySectors || []).forEach((id) =>
              params.append("Secondary_sectors_ids[]", String(id))
            );
          }
          if ((filtersToUse.ownershipTypes || []).length > 0) {
            (filtersToUse.ownershipTypes || []).forEach((id) =>
              params.append("Ownership_types_ids[]", String(id))
            );
          }
          if ((filtersToUse.hybridBusinessFocuses || []).length > 0) {
            (filtersToUse.hybridBusinessFocuses || []).forEach((id) =>
              params.append("Hybrid_Data_ids[]", String(id))
            );
          }
          params.set(
            "Min_linkedin_members",
            String(filtersToUse.linkedinMembersMin ?? 0)
          );
          params.set(
            "Max_linkedin_members",
            String(filtersToUse.linkedinMembersMax ?? 0)
          );
          if (filtersToUse.searchQuery) {
            params.append("query", filtersToUse.searchQuery);
          }
        }

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API request failed: ${response.status} ${response.statusText} - ${errorText}`
          );
        }
        const data = JSON.parse(await response.text()) as {
          result1?: {
            items?: AllCompanyItem[];
            itemsReceived?: number;
            curPage?: number;
            nextPage?: number | null;
            prevPage?: number | null;
            offset?: number;
            perPage?: number;
            pageTotal?: number;
          };
        };
        const r1 = data.result1 || {};
        setAllCompanies(r1.items || []);
        setAllCompaniesPagination({
          itemsReceived: r1.itemsReceived || 0,
          curPage: r1.curPage || 1,
          nextPage: r1.nextPage || null,
          prevPage: r1.prevPage || null,
          offset: r1.offset || 0,
          perPage: r1.perPage || perPage,
          pageTotal: r1.pageTotal || 0,
        });
      } catch (err) {
        setAllCompaniesError(
          err instanceof Error ? err.message : "Failed to fetch companies"
        );
      } finally {
        setAllCompaniesLoading(false);
      }
    },
    [sectorId, ownershipFilter, allCompaniesCurrentFilters]
  );

  // Fetch Public Companies for sector (ownership type Public)
  const fetchPublicCompaniesForSector = useCallback(
    async (page: number = 1) => {
      setPublicCompaniesLoading(true);
      setPublicCompaniesError(null);

      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const Sector_id = Number(sectorId);
        if (Number.isNaN(Sector_id)) {
          throw new Error("Invalid sector id");
        }

        const perPage = 25;
        const offset = page; // API expects 1-based page

        const params = new URLSearchParams();
        params.append("Offset", String(offset));
        params.append("Per_page", String(perPage));
        params.append("Min_linkedin_members", "0");
        params.append("Max_linkedin_members", "0");
        params.append("Horizontals_ids", "");
        params.append("Primary_sectors_ids[]", String(Sector_id));
        // Explicit mapping: Public ownership type id is 7
        params.append("Ownership_types_ids[]", String(7));

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API request failed: ${response.status} ${response.statusText} - ${errorText}`
          );
        }
        const data = JSON.parse(await response.text()) as {
          result1?: {
            items?: AllCompanyItem[];
            itemsReceived?: number;
            curPage?: number;
            nextPage?: number | null;
            prevPage?: number | null;
            offset?: number;
            perPage?: number;
            pageTotal?: number;
          };
        };
        const r1 = data.result1 || {};
        setPublicCompanies(r1.items || []);
        setPublicCompaniesPagination({
          itemsReceived: r1.itemsReceived || 0,
          curPage: r1.curPage || 1,
          nextPage: r1.nextPage || null,
          prevPage: r1.prevPage || null,
          offset: r1.offset || 0,
          perPage: r1.perPage || perPage,
          pageTotal: r1.pageTotal || 0,
        });
      } catch (err) {
        setPublicCompaniesError(
          err instanceof Error ? err.message : "Failed to fetch companies"
        );
      } finally {
        setPublicCompaniesLoading(false);
      }
    },
    [sectorId]
  );

  useEffect(() => {
    if (activeTab === "all") {
      fetchAllCompaniesForSector(1);
    }
  }, [activeTab, fetchAllCompaniesForSector]);

  // Load All Companies filter options when All tab is first opened
  useEffect(() => {
    if (activeTab !== "all") return;
    let cancelled = false;
    const loadOpts = async () => {
      try {
        setLoadingAllCountries(true);
        setLoadingAllHybridFocus(true);
        setLoadingAllOwnershipTypes(true);
        const [countries, continents, subs, hybrid, ownership] =
          await Promise.all([
            locationsService.getCountries(),
            locationsService.getContinentalRegions(),
            locationsService.getSubRegions(),
            locationsService.getHybridBusinessFocuses(),
            locationsService.getOwnershipTypes(),
          ]);
        if (!cancelled) {
          setAllCountries(countries || []);
          setAllContinentalRegions(Array.isArray(continents) ? continents : []);
          setAllSubRegions(Array.isArray(subs) ? subs : []);
          setAllHybridBusinessFocuses(hybrid || []);
          setAllOwnershipTypes(ownership || []);
        }
      } catch {
        // ignore
      } finally {
        setLoadingAllCountries(false);
        setLoadingAllHybridFocus(false);
        setLoadingAllOwnershipTypes(false);
      }
      try {
        setLoadingAllSecondarySectors(true);
        const secs = await locationsService.getAllSecondarySectorsWithPrimary();
        if (!cancelled) {
          setAllSecondarySectors(
            Array.isArray(secs)
              ? (secs as Array<{ id: number; sector_name: string }>)
              : []
          );
        }
      } catch {
        // ignore
      } finally {
        setLoadingAllSecondarySectors(false);
      }
    };
    loadOpts();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Dependent options for provinces/cities
  useEffect(() => {
    const loadProvinces = async () => {
      if (selCountries.length === 0) {
        setAllProvinces([]);
        setSelProvinces([]);
        return;
      }
      try {
        setLoadingAllProvinces(true);
        const prov = await locationsService.getProvinces(selCountries);
        setAllProvinces(prov || []);
        setSelProvinces([]);
      } catch {
        // ignore
      } finally {
        setLoadingAllProvinces(false);
      }
    };
    loadProvinces();
  }, [selCountries]);

  useEffect(() => {
    const loadCities = async () => {
      if (selCountries.length === 0) {
        setAllCities([]);
        setSelCities([]);
        return;
      }
      try {
        setLoadingAllCities(true);
        const cities = await locationsService.getCities(
          selCountries,
          selProvinces
        );
        setAllCities(cities || []);
        setSelCities([]);
      } catch {
        // ignore
      } finally {
        setLoadingAllCities(false);
      }
    };
    loadCities();
  }, [selCountries, selProvinces]);

  // Fetch overview datasets directly from Xano with PROGRESSIVE rendering.
  // Each request updates UI immediately when it completes - no waiting for slowest one.
  const fetchOverviewDataProgressive = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("asymmetrix_auth_token") : null;
    if (!token) {
      setError("Authentication required");
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const qs = new URLSearchParams();
    qs.append("Sector_id", sectorId);

    // Fire all requests simultaneously but process each independently as it completes
    // This shows data progressively rather than waiting for the slowest request
    
    // Sector details (fastest ~50ms) - shows header/title immediately
    fetch(`https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors/${sectorId}`, {
      method: "GET",
      headers,
    })
      .then(async (resp) => {
        if (resp.ok) {
          const data = await resp.json();
          setSectorData(data as SectorStatistics);
        }
      })
      .catch((e) => console.error("❌ Sector fetch failed:", e));

    // Recent transactions (~2.5s)
    fetch(`https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_resent_trasnactions?${qs.toString()}&top_15=true`, {
      method: "GET",
      headers,
    })
      .then(async (resp) => {
        if (resp.ok) {
          const data = await resp.json();
          setSplitRecentRaw(data);
        }
      })
      .catch((e) => console.error("❌ Recent transactions fetch failed:", e));

    // Overview data (slowest ~3.5s) - contains strategic + PE (market map moved to sectors_market_map)
    fetch(`https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/overview_data?${qs.toString()}`, {
      method: "GET",
      headers,
    })
      .then(async (resp) => {
        if (resp.ok) {
          const data = await resp.json();
          if (data?.strategic_acquirers) setSplitStrategicRaw(data.strategic_acquirers);
          if (data?.pe_investors) setSplitPERaw(data.pe_investors);
        }
      })
      .catch((e) => console.error("❌ Overview fetch failed:", e));
  }, [sectorId]);

  // Kick off ONLY overview tab data load on initial mount (lazy load other tabs)
  // Skip if we already have initial server-side data
  useEffect(() => {
    if (!sectorId) return;
    // Only fetch if we don't have initial data
    const hasInitialData = initialSectorData && initialMarketMap && initialStrategicAcquirers && initialPEInvestors && initialRecentTransactions;
    if (!hasInitialData) {
      fetchOverviewDataProgressive();
    }
  }, [sectorId, fetchOverviewDataProgressive, initialSectorData, initialMarketMap, initialStrategicAcquirers, initialPEInvestors, initialRecentTransactions]);

  useEffect(() => {
    if (activeTab === "public") {
      fetchPublicCompaniesForSector(1);
    }
  }, [activeTab, fetchPublicCompaniesForSector]);

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

  // Type for target company from API response (with _new_company structure)
  interface TargetCompanyWithLocation {
    id?: number;
    name?: string;
    country?: string;
    primary_sectors?: Array<string | { sector_name?: string; id?: number }>;
    secondary_sectors?: Array<string | { sector_name?: string; id?: number }>;
    _location?: {
      Country?: string;
    };
    _sectors_primary?: Array<{ sector_name?: string; id?: number }>;
    _sectors_secondary?: Array<{ sector_name?: string; id?: number }>;
  }

  interface TargetCounterpartyWithUnderscore {
    _new_company?: TargetCompanyWithLocation;
    new_company?: TargetCompanyWithLocation;
    new_company_counterparty?: number;
    id?: number;
  }

  // Comprehensive Transactions Tab Component
  function SectorTransactionsTab({ sectorId }: { sectorId: string }) {
    const hasInitialLoaded = useRef(false);
    // State for filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<CorporateEventsFilters>({
      Countries: [],
      Provinces: [],
      Cities: [],
      primary_sectors_ids: [], // Will be auto-populated with current sector
      Secondary_sectors_ids: [],
      deal_types: [],
      Deal_Status: [],
      Buyer_Investor_Types: [],
      Funding_stage: [],
      Date_start: null,
      Date_end: null,
      search_query: "",
      Page: 1,
      Per_page: 50,
    });

    // State for each filter
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [selectedContinentalRegions, setSelectedContinentalRegions] =
      useState<string[]>([]);
    const [selectedSubRegions, setSelectedSubRegions] = useState<string[]>([]);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedSecondarySectors, setSelectedSecondarySectors] = useState<
      number[]
    >([]);
    const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
    const [selectedDealStatuses, setSelectedDealStatuses] = useState<string[]>(
      []
    );
    const [selectedBuyerInvestorTypes, setSelectedBuyerInvestorTypes] =
      useState<BuyerInvestorType[]>([]);
    const [selectedFundingStages, setSelectedFundingStages] = useState<
      string[]
    >([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");

    // State for API data
    const [countries, setCountries] = useState<
      Array<{ locations_Country: string }>
    >([]);
    const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
    const [subRegions, setSubRegions] = useState<string[]>([]);
    const [provinces, setProvinces] = useState<
      Array<{ State__Province__County: string }>
    >([]);
    const [cities, setCities] = useState<Array<{ City: string }>>([]);
    const [secondarySectors, setSecondarySectors] = useState<
      Array<{ id: number; sector_name: string }>
    >([]);
    const [fundingStages, setFundingStages] = useState<string[]>([]);

    // Loading states
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [loadingSecondarySectors, setLoadingSecondarySectors] =
      useState(false);
    const [loadingFundingStages, setLoadingFundingStages] = useState(false);

    // State for corporate events data
    const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>(
      []
    );
    const [pagination, setPagination] = useState({
      itemsReceived: 0,
      curPage: 1,
      nextPage: null as number | null,
      prevPage: null as number | null,
      offset: 0,
      perPage: 50,
      pageTotal: 0,
    });
    const [summaryData, setSummaryData] = useState({
      acquisitions: 0,
      investments: 0,
      ipos: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [showExportLimitModal, setShowExportLimitModal] = useState(false);
    const [exportsLeft, setExportsLeft] = useState(0);

    // Convert API data to dropdown options format
    const countryOptions = countries.map((country) => ({
      value: country.locations_Country,
      label: country.locations_Country,
    }));

    const provinceOptions = provinces.map((province) => ({
      value: province.State__Province__County,
      label: province.State__Province__County,
    }));

    const cityOptions = cities.map((city) => ({
      value: city.City,
      label: city.City,
    }));

    const secondarySectorOptions = secondarySectors.map((sector) => ({
      value: sector.id,
      label: sector.sector_name,
    }));

    const fundingStageOptions = fundingStages.map((stage) => ({
      value: stage,
      label: stage,
    }));

    const buyerInvestorTypeOptions = [
      { value: "private_equity", label: "Private Equity" },
      { value: "venture_capital", label: "Venture Capital" },
      { value: "da_strategic", label: "Data & Analytics Strategic" },
      { value: "other_strategic", label: "Other Strategic" },
    ];

    const buyerInvestorTypeLabel = (value: string) => {
      const found = buyerInvestorTypeOptions.find((o) => o.value === value);
      return found ? found.label : value;
    };

    // Hardcoded options for Deal Types
    const eventTypeOptions = [
      { value: "Acquisition", label: "Acquisition" },
      { value: "Sale", label: "Sale" },
      { value: "IPO", label: "IPO" },
      { value: "MBO", label: "MBO" },
      { value: "Investment", label: "Investment" },
      { value: "Strategic Review", label: "Strategic Review" },
      { value: "Divestment", label: "Divestment" },
      { value: "Restructuring", label: "Restructuring" },
      { value: "Dual track", label: "Dual track" },
      { value: "Closing", label: "Closing" },
      { value: "Grant", label: "Grant" },
      { value: "Debt financing", label: "Debt financing" },
      { value: "Partnership", label: "Partnership" },
    ];

    // Hardcoded options for Deal Status
    const dealStatusOptions = [
      { value: "Completed", label: "Completed" },
      { value: "In Market", label: "In Market" },
      { value: "Not yet launched", label: "Not yet launched" },
      { value: "Strategic Review", label: "Strategic Review" },
      { value: "Deal Prep", label: "Deal Prep" },
      { value: "In Exclusivity", label: "In Exclusivity" },
    ];

    // Fetch functions
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true);
        const countriesData = await locationsService.getCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setLoadingCountries(false);
      }
    };

    const fetchContinentalRegions = async () => {
      try {
        const list = await locationsService.getContinentalRegions();
        if (Array.isArray(list)) setContinentalRegions(list);
      } catch {
        // silent fail
      }
    };

    const fetchSubRegions = async () => {
      try {
        const list = await locationsService.getSubRegions();
        if (Array.isArray(list)) setSubRegions(list);
      } catch {
        // silent fail
      }
    };

    const fetchProvinces = async () => {
      if (selectedCountries.length === 0) {
        setProvinces([]);
        return;
      }
      try {
        setLoadingProvinces(true);
        const provincesData = await locationsService.getProvinces(
          selectedCountries
        );
        setProvinces(provincesData);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };

    const fetchCities = async () => {
      if (selectedCountries.length === 0 || selectedProvinces.length === 0) {
        setCities([]);
        return;
      }
      try {
        setLoadingCities(true);
        const citiesData = await locationsService.getCities(
          selectedCountries,
          selectedProvinces
        );
        setCities(citiesData);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };

    const fetchSecondarySectors = async () => {
      try {
        setLoadingSecondarySectors(true);
        // Fetch all secondary sectors (not filtered by primary in this case)
        const sectorsData =
          await locationsService.getAllSecondarySectorsWithPrimary();
        setSecondarySectors(
          sectorsData as Array<{ id: number; sector_name: string }>
        );
      } catch (error) {
        console.error("Error fetching secondary sectors:", error);
      } finally {
        setLoadingSecondarySectors(false);
      }
    };

    const fetchFundingStages = async () => {
      try {
        setLoadingFundingStages(true);
        const stages = await locationsService.getFundingStages();
        setFundingStages(stages);
      } catch (error) {
        console.error("Error fetching funding stages:", error);
      } finally {
        setLoadingFundingStages(false);
      }
    };

    const fetchCorporateEvents = async (filters: CorporateEventsFilters) => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setError("Authentication required");
          return;
        }

        // Convert filters to URL parameters for GET request
        const params = new URLSearchParams();

        // Add page and per_page
        params.append("Page", filters.Page.toString());
        params.append("Per_page", filters.Per_page.toString());

        // Add search query
        if (filters.search_query)
          params.append("search_query", filters.search_query);

        // Add location filters
        if (filters.Countries.length > 0) {
          params.append("Countries", filters.Countries.join(","));
        }
        if (filters.Provinces.length > 0) {
          params.append("Provinces", filters.Provinces.join(","));
        }
        if (filters.Cities.length > 0) {
          params.append("Cities", filters.Cities.join(","));
        }

        // Add region grouping filters
        if (
          (filters as Partial<CorporateEventsFilters>).continentalRegions &&
          (filters as Partial<CorporateEventsFilters>).continentalRegions!
            .length > 0
        ) {
          params.append(
            "Continental_Region",
            (
              filters as Partial<CorporateEventsFilters>
            ).continentalRegions!.join(",")
          );
        }
        if (
          (filters as Partial<CorporateEventsFilters>).subRegions &&
          (filters as Partial<CorporateEventsFilters>).subRegions!.length > 0
        ) {
          params.append(
            "geographical_sub_region",
            (filters as Partial<CorporateEventsFilters>).subRegions!.join(",")
          );
        }

        // Add sector filters - PRIMARY SECTOR IS AUTO-FILTERED BY CURRENT SECTOR
        if (filters.primary_sectors_ids.length > 0) {
          filters.primary_sectors_ids.forEach((id) => {
            params.append("primary_sectors_ids[]", id.toString());
          });
        }
        if (filters.Secondary_sectors_ids.length > 0) {
          filters.Secondary_sectors_ids.forEach((id) => {
            params.append("Secondary_sectors_ids[]", id.toString());
          });
        }

        // Add event types as array params (API expects bracketed keys)
        if (filters.deal_types.length > 0) {
          filters.deal_types.forEach((dealType) => {
            params.append("deal_types[]", dealType);
          });
        }

        // Add deal statuses
        if (filters.Deal_Status.length > 0) {
          params.append("Deal_Status", filters.Deal_Status.join(","));
        }

        if (filters.Funding_stage && filters.Funding_stage.length > 0) {
          params.append("Funding_stage", filters.Funding_stage.join(","));
        }

        if (
          filters.Buyer_Investor_Types &&
          filters.Buyer_Investor_Types.length > 0
        ) {
          params.append(
            "Buyer_Investor_Types",
            filters.Buyer_Investor_Types.join(",")
          );
        }

        // Add date filters
        if (filters.Date_start) {
          params.append("Date_start", filters.Date_start);
        }
        if (filters.Date_end) {
          params.append("Date_end", filters.Date_end);
        }

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events?${params.toString()}`;

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

        const data: CorporateEventsResponse = await response.json();

        setCorporateEvents(data.items);
        setPagination({
          itemsReceived: data.itemsReceived,
          curPage: data.curPage,
          nextPage: data.nextPage,
          prevPage: data.prevPage,
          offset: data.offset,
          perPage: filters.Per_page,
          pageTotal: data.pageTotal,
        });
        setSummaryData({
          acquisitions: data.acquisitions,
          investments: data.investments,
          ipos: data.ipos,
        });
      } catch (error) {
        console.error("Error fetching corporate events:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch corporate events"
        );
      } finally {
        setLoading(false);
      }
    };

    // Initial data fetch (guarded to avoid double-load in React Strict Mode)
    useEffect(() => {
      if (hasInitialLoaded.current) return;
      hasInitialLoaded.current = true;

      fetchCountries();
      fetchContinentalRegions();
      fetchSubRegions();
      fetchSecondarySectors();
      fetchFundingStages();
      // Auto-populate primary sector filter with current sector ID
      const sectorIdNum = parseInt(sectorId);
      if (!isNaN(sectorIdNum)) {
        const initialFilters = {
          ...filters,
          primary_sectors_ids: [sectorIdNum],
        };
        setFilters(initialFilters);
        fetchCorporateEvents(initialFilters);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sectorId]);

    // Fetch provinces when countries change
    useEffect(() => {
      fetchProvinces();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCountries]);

    // Fetch cities when provinces change
    useEffect(() => {
      fetchCities();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProvinces]);

    // Handle search
    const handleSearch = () => {
      const sectorIdNum = parseInt(sectorId);
      const updatedFilters = {
        ...filters,
        search_query: searchTerm,
        Countries: selectedCountries,
        continentalRegions: selectedContinentalRegions,
        subRegions: selectedSubRegions,
        Provinces: selectedProvinces,
        Cities: selectedCities,
        primary_sectors_ids: !isNaN(sectorIdNum) ? [sectorIdNum] : [],
        Secondary_sectors_ids: selectedSecondarySectors,
        deal_types: selectedEventTypes,
        Deal_Status: selectedDealStatuses,
        Buyer_Investor_Types: selectedBuyerInvestorTypes,
        Funding_stage: selectedFundingStages,
        Date_start: dateStart || null,
        Date_end: dateEnd || null,
        Page: 1,
      };
      setFilters(updatedFilters);
      fetchCorporateEvents(updatedFilters);
    };

    // Handle page change
    const handlePageChange = (page: number) => {
      const updatedFilters = { ...filters, Page: page };
      setFilters(updatedFilters);
      fetchCorporateEvents(updatedFilters);
    };

    // Build filter parameters for export API
    const buildFilterParams = (): URLSearchParams => {
      const params = new URLSearchParams();

      // Add search query
      if (searchTerm.trim()) {
        params.append("search_query", searchTerm.trim());
      }

      // Add location filters as comma-separated values
      if (selectedCountries.length > 0) {
        params.append("Countries", selectedCountries.join(","));
      }

      if (selectedProvinces.length > 0) {
        params.append("Provinces", selectedProvinces.join(","));
      }

      if (selectedCities.length > 0) {
        params.append("Cities", selectedCities.join(","));
      }

      // Add region grouping filters
      if (selectedContinentalRegions.length > 0) {
        params.append("Continental_Region", selectedContinentalRegions.join(","));
      }

      if (selectedSubRegions.length > 0) {
        params.append("geographical_sub_region", selectedSubRegions.join(","));
      }

      // Always include the current sector in primary sectors
      const sectorIdNum = parseInt(sectorId);
      if (!isNaN(sectorIdNum)) {
        params.append("primary_sectors_ids[]", sectorIdNum.toString());
      }

      // Add secondary sectors
      if (selectedSecondarySectors.length > 0) {
        selectedSecondarySectors.forEach((id) => {
          params.append("Secondary_sectors_ids[]", id.toString());
        });
      }

      // Add event types as array params (API expects bracketed keys)
      if (selectedEventTypes.length > 0) {
        selectedEventTypes.forEach((dealType) => {
          params.append("deal_types[]", dealType);
        });
      }

      // Add deal statuses as comma-separated values
      if (selectedDealStatuses.length > 0) {
        params.append("Deal_Status", selectedDealStatuses.join(","));
      }

      // Add funding stages as comma-separated values
      if (selectedFundingStages.length > 0) {
        params.append("Funding_stage", selectedFundingStages.join(","));
      }

      // Add buyer / investor types
      if (selectedBuyerInvestorTypes.length > 0) {
        params.append("Buyer_Investor_Types", selectedBuyerInvestorTypes.join(","));
      }

      // Add date filters
      if (dateStart) {
        params.append("Date_start", dateStart);
      }

      if (dateEnd) {
        params.append("Date_end", dateEnd);
      }

      return params;
    };

    // Handle CSV export - fetches all matching events from export API
    const handleExportCSV = async () => {
      try {
        // Check export limit first
        const limitCheck = await checkExportLimit();
        if (!limitCheck.canExport) {
          setExportsLeft(limitCheck.exportsLeft);
          setShowExportLimitModal(true);
          return;
        }

        setExporting(true);

        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setError("Authentication required");
          setExporting(false);
          return;
        }

        // Build filter parameters
        const params = buildFilterParams();

        // Call the export API endpoint
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/export_corporate_events_csv?${params.toString()}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Check if it's an export limit error
          if (response.status === 403 || response.status === 429) {
            const limitCheck = await checkExportLimit();
            setExportsLeft(limitCheck.exportsLeft);
            setShowExportLimitModal(true);
            setExporting(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Export the data using the CSV exporter (same as corporate events page)
        CSVExporter.exportCorporateEventsFromApiResponse(
          data,
          `sector_${sectorId}_transactions`
        );
      } catch (error) {
        console.error("Error exporting corporate events:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to export corporate events"
        );
      } finally {
        setExporting(false);
      }
    };

    // Generate pagination buttons
    const generatePaginationButtons = () => {
      const buttons = [];
      const currentPage = pagination.curPage;
      const totalPages = pagination.pageTotal;

      // Previous button
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

      // Page numbers
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
        // Show first page
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

        // Show current page and neighbors
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

        // Show last page
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

      // Next button
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
        <div className="p-6 bg-white rounded-xl border shadow-lg border-slate-200/60">
          {showFilters && (
            <h2 className="mb-4 text-xl font-bold text-slate-900">Filters</h2>
          )}

          {showFilters && (
            <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3">
              {/* Corporate Event Type Column */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Corporate Event Type
                </h3>
                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  By Type
                </label>
                <SearchableSelect
                  options={eventTypeOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedEventTypes.includes(value)
                    ) {
                      setSelectedEventTypes([...selectedEventTypes, value]);
                    }
                  }}
                  placeholder="Select Type"
                  disabled={false}
                  style={{}}
                />
                {selectedEventTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEventTypes.map((eventType) => (
                      <span
                        key={eventType}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                      >
                        {eventType}
                        <button
                          onClick={() =>
                            setSelectedEventTypes(
                              selectedEventTypes.filter((t) => t !== eventType)
                            )
                          }
                          className="font-bold text-blue-700 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Deal Status
                </label>
                <SearchableSelect
                  options={dealStatusOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedDealStatuses.includes(value)
                    ) {
                      setSelectedDealStatuses([...selectedDealStatuses, value]);
                    }
                  }}
                  placeholder="Select Deal Status"
                  disabled={false}
                  style={{}}
                />
                {selectedDealStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDealStatuses.map((status) => (
                      <span
                        key={status}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-red-700 bg-red-50 rounded"
                      >
                        {status}
                        <button
                          onClick={() =>
                            setSelectedDealStatuses(
                              selectedDealStatuses.filter((s) => s !== status)
                            )
                          }
                          className="font-bold text-red-700 hover:text-red-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Buyer / Investor Type
                </label>
                <SearchableSelect
                  options={buyerInvestorTypeOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedBuyerInvestorTypes.includes(
                        value as BuyerInvestorType
                      )
                    ) {
                      setSelectedBuyerInvestorTypes([
                        ...selectedBuyerInvestorTypes,
                        value as BuyerInvestorType,
                      ]);
                    }
                  }}
                  placeholder="Select Buyer / Investor Type"
                  disabled={false}
                  style={{}}
                />
                {selectedBuyerInvestorTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedBuyerInvestorTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-800 bg-blue-50 rounded"
                      >
                        {buyerInvestorTypeLabel(type)}
                        <button
                          onClick={() =>
                            setSelectedBuyerInvestorTypes(
                              selectedBuyerInvestorTypes.filter((t) => t !== type)
                            )
                          }
                          className="font-bold text-blue-800 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Column */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Location
                </h3>

                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  By Continental Region
                </label>
                <SearchableSelect
                  options={continentalRegions.map((r) => ({
                    value: r,
                    label: r,
                  }))}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedContinentalRegions.includes(value)
                    ) {
                      setSelectedContinentalRegions([
                        ...selectedContinentalRegions,
                        value,
                      ]);
                    }
                  }}
                  placeholder="Select Continental Region"
                  disabled={false}
                  style={{}}
                />
                {selectedContinentalRegions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedContinentalRegions.map((r) => (
                      <span
                        key={r}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                      >
                        {r}
                        <button
                          onClick={() =>
                            setSelectedContinentalRegions(
                              selectedContinentalRegions.filter((x) => x !== r)
                            )
                          }
                          className="font-bold text-blue-700 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Sub-Region
                </label>
                <SearchableSelect
                  options={subRegions.map((r) => ({ value: r, label: r }))}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedSubRegions.includes(value)
                    ) {
                      setSelectedSubRegions([...selectedSubRegions, value]);
                    }
                  }}
                  placeholder="Select Sub-Region"
                  disabled={false}
                  style={{}}
                />
                {selectedSubRegions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSubRegions.map((r) => (
                      <span
                        key={r}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded"
                      >
                        {r}
                        <button
                          onClick={() =>
                            setSelectedSubRegions(
                              selectedSubRegions.filter((x) => x !== r)
                            )
                          }
                          className="font-bold text-orange-700 hover:text-orange-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Country
                </label>
                <SearchableSelect
                  options={countryOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedCountries.includes(value)
                    ) {
                      setSelectedCountries([...selectedCountries, value]);
                    }
                  }}
                  placeholder={
                    loadingCountries ? "Loading..." : "Select Country"
                  }
                  disabled={loadingCountries}
                  style={{}}
                />
                {selectedCountries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCountries.map((country) => (
                      <span
                        key={country}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                      >
                        {country}
                        <button
                          onClick={() =>
                            setSelectedCountries(
                              selectedCountries.filter((c) => c !== country)
                            )
                          }
                          className="font-bold text-blue-700 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Province
                </label>
                <SearchableSelect
                  options={provinceOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedProvinces.includes(value)
                    ) {
                      setSelectedProvinces([...selectedProvinces, value]);
                    }
                  }}
                  placeholder={
                    loadingProvinces
                      ? "Loading..."
                      : selectedCountries.length === 0
                      ? "Select country first"
                      : "Select Province"
                  }
                  disabled={loadingProvinces || selectedCountries.length === 0}
                  style={{}}
                />
                {selectedProvinces.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedProvinces.map((province) => (
                      <span
                        key={province}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                      >
                        {province}
                        <button
                          onClick={() =>
                            setSelectedProvinces(
                              selectedProvinces.filter((p) => p !== province)
                            )
                          }
                          className="font-bold text-green-700 hover:text-green-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By City
                </label>
                <SearchableSelect
                  options={cityOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedCities.includes(value)
                    ) {
                      setSelectedCities([...selectedCities, value]);
                    }
                  }}
                  placeholder={
                    loadingCities
                      ? "Loading..."
                      : selectedCountries.length === 0
                      ? "Select country first"
                      : "Select City"
                  }
                  disabled={loadingCities || selectedCountries.length === 0}
                  style={{}}
                />
                {selectedCities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded"
                      >
                        {city}
                        <button
                          onClick={() =>
                            setSelectedCities(
                              selectedCities.filter((c) => c !== city)
                            )
                          }
                          className="font-bold text-orange-700 hover:text-orange-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sector Column */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Sector
                </h3>

                <div className="p-3 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Primary Sector:</strong> Filtered by current sector
                  </p>
                </div>

                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  By Secondary Sectors
                </label>
                <SearchableSelect
                  options={secondarySectorOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "number" &&
                      value &&
                      !selectedSecondarySectors.includes(value)
                    ) {
                      setSelectedSecondarySectors([
                        ...selectedSecondarySectors,
                        value,
                      ]);
                    }
                  }}
                  placeholder={
                    loadingSecondarySectors
                      ? "Loading..."
                      : "Select Secondary Sector"
                  }
                  disabled={loadingSecondarySectors}
                  style={{}}
                />
                {selectedSecondarySectors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSecondarySectors.map((sectorId) => {
                      const sector = secondarySectors.find(
                        (s) => s.id === sectorId
                      );
                      return (
                        <span
                          key={sectorId}
                          className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                        >
                          {sector?.sector_name || `Sector ${sectorId}`}
                          <button
                            onClick={() =>
                              setSelectedSecondarySectors(
                                selectedSecondarySectors.filter(
                                  (s) => s !== sectorId
                                )
                              )
                            }
                            className="font-bold text-green-700 hover:text-green-900"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Funding Stage
                </label>
                <SearchableSelect
                  options={fundingStageOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedFundingStages.includes(value)
                    ) {
                      setSelectedFundingStages([...selectedFundingStages, value]);
                    }
                  }}
                  placeholder={
                    loadingFundingStages ? "Loading funding stages..." : "Select Funding Stage"
                  }
                  disabled={loadingFundingStages}
                  style={{}}
                />
                {selectedFundingStages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFundingStages.map((stage) => (
                      <span
                        key={stage}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-emerald-700 bg-emerald-50 rounded"
                      >
                        {stage}
                        <button
                          onClick={() =>
                            setSelectedFundingStages(
                              selectedFundingStages.filter((s) => s !== stage)
                            )
                          }
                          className="font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Date Filters */}
                <h3 className="mt-6 mb-4 text-lg font-semibold text-slate-900">
                  Announcement Date
                </h3>
                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  Start
                </label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="px-3 py-2 w-full rounded-md border border-slate-300"
                />

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  End
                </label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="px-3 py-2 w-full rounded-md border border-slate-300"
                />
              </div>
            </div>
          )}

          {/* Search Row */}
          <div className="mt-4">
            {showFilters && (
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Search Corporate Events
              </h3>
            )}
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Enter search terms here"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 max-w-md rounded-md border border-slate-300"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="mt-4 text-sm text-blue-600 underline hover:text-blue-800"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>

          {error && (
            <div className="p-3 mt-4 text-red-700 bg-red-50 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Statistics Block */}
        {summaryData.acquisitions > 0 && (
          <div className="p-6 bg-white rounded-xl border shadow-lg border-slate-200/60">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Corporate Events
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <span className="text-sm text-slate-600">Acquisitions:</span>
                <p className="text-2xl font-bold text-slate-900">
                  {summaryData.acquisitions?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-600">Investments:</span>
                <p className="text-2xl font-bold text-slate-900">
                  {summaryData.investments?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-600">IPOs:</span>
                <p className="text-2xl font-bold text-slate-900">
                  {summaryData.ipos?.toLocaleString() || "0"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Export Button - Show when there are results */}
        {corporateEvents.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleExportCSV}
              className="px-6 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
              disabled={loading || exporting}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        )}

        {/* Results Table */}
        {loading && (
          <div className="py-10 text-center text-slate-600">
            Loading corporate events...
          </div>
        )}

        {!loading && corporateEvents.length === 0 && (
          <div className="py-10 text-center text-slate-600">
            No corporate events found.
          </div>
        )}

        {!loading && corporateEvents.length > 0 && (
          <div className="overflow-x-auto p-6 bg-white rounded-xl border shadow-lg border-slate-200/60">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="p-3 text-sm font-semibold text-left text-slate-900">
                    Event Details
                  </th>
                  <th className="p-3 text-sm font-semibold text-left text-slate-900">
                    Parties
                  </th>
                  <th className="p-3 text-sm font-semibold text-left text-slate-900">
                    Deal Details
                  </th>
                  <th className="p-3 text-sm font-semibold text-left text-slate-900">
                    Advisors
                  </th>
                  <th className="p-3 text-sm font-semibold text-left text-slate-900">
                    Sectors
                  </th>
                </tr>
              </thead>
              <tbody>
                {corporateEvents.map((event: CorporateEvent, index: number) => {
                  // API returns _new_company (with underscore), not new_company
                  const targetCounterparty = event.target_counterparty as unknown as TargetCounterpartyWithUnderscore;
                  const target: TargetCompanyWithLocation | undefined = 
                    targetCounterparty?._new_company ?? 
                    targetCounterparty?.new_company;
                  const targetCounterpartyId =
                    event.target_counterparty?.new_company_counterparty;
                  const targetName = target?.name || "Not Available";
                  const targetHref = targetCounterpartyId
                    ? `/company/${targetCounterpartyId}`
                    : "";
                  const targetCountry = (target?._location?.Country ?? 
                                        target?.country) || "Not Available";

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

                  const formatCurrency = (
                    amount: string | undefined,
                    currency: string | undefined
                  ) => {
                    if (!amount || !currency) return "Not available";
                    const n = Number(amount);
                    if (Number.isNaN(n)) return "Not available";
                    return `${currency}${n.toLocaleString(undefined, {
                      maximumFractionDigits: 3,
                    })}m`;
                  };

                  const renderSectorLinks = (
                    sectors:
                      | Array<string | { sector_name?: string; id?: number }>
                      | undefined
                  ): React.ReactNode => {
                    if (!Array.isArray(sectors) || sectors.length === 0) {
                      return "Not available";
                    }
                    const nodes: React.ReactNode[] = [];
                    sectors.forEach((sector, index) => {
                      const name =
                        typeof sector === "string"
                          ? sector
                          : sector?.sector_name;
                      if (!name) return;
                      const sectorId =
                        typeof sector === "object" && sector
                          ? (sector as { id?: number }).id
                          : undefined;
                      nodes.push(
                        sectorId ? (
                          <a
                            key={`${sectorId}-${name}-${index}`}
                            href={`/sector/${sectorId}`}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {name}
                          </a>
                        ) : (
                          <span key={`${name}-${index}`}>{name}</span>
                        )
                      );
                      if (index < sectors.length - 1) {
                        nodes.push(<span key={`sep-${index}`}>, </span>);
                      }
                    });
                    return nodes.length > 0 ? nodes : "Not available";
                  };

                  const fundingStage =
                    (
                      event.investment_data?.Funding_stage ||
                      event.investment_data?.funding_stage ||
                      ""
                    ).trim();
                  const isPartnership = /partnership/i.test(
                    event.deal_type || ""
                  );
                  const primarySectorsSource =
                    (target?.primary_sectors as
                      | Array<string | { sector_name?: string; id?: number }>
                      | undefined) ??
                    ((target as unknown as {
                      _sectors_primary?: Array<{
                        sector_name?: string;
                        id?: number;
                      }>;
                    })?._sectors_primary as
                      | Array<{ sector_name?: string; id?: number }>
                      | undefined);
                  const secondarySectorsSource =
                    (target?.secondary_sectors as
                      | Array<string | { sector_name?: string; id?: number }>
                      | undefined) ??
                    ((target as unknown as {
                      _sectors_secondary?: Array<{
                        sector_name?: string;
                        id?: number;
                      }>;
                    })?._sectors_secondary as
                      | Array<{ sector_name?: string; id?: number }>
                      | undefined);

                  return (
                    <tr
                      key={event.id || index}
                      className="border-b border-slate-100"
                    >
                      {/* Event Details */}
                      <td className="p-3 align-top break-words">
                        <div className="mb-1">
                          <a
                            href={`/corporate-event/${event.id}`}
                            className="font-medium text-blue-600 underline hover:text-blue-800"
                          >
                            {event.description || "Not Available"}
                          </a>
                        </div>
                        <div className="text-xs text-slate-600">
                          Date: {formatDate(event.announcement_date)}
                        </div>
                        <div className="text-xs text-slate-600">
                          Target HQ: {targetCountry}
                        </div>
                      </td>
                      {/* Parties */}
                      <td className="p-3 align-top break-words">
                        <div className="mb-1 text-xs text-slate-600">
                          <strong>
                            {(event as { target_label?: string }).target_label ||
                              (isPartnership ? "Target(s)" : "Target")}
                            :
                          </strong>{" "}
                          {(() => {
                            // Use new targets array if available
                            const targets = (
                              event as {
                                targets?: Array<{
                                  id: number;
                                  name: string;
                                  route: string;
                                }>;
                              }
                            ).targets;
                            if (Array.isArray(targets) && targets.length > 0) {
                              const displayTargets = isPartnership
                                ? targets
                                : targets.slice(0, 1);
                              return displayTargets.map((tgt, i, arr) => {
                                const href =
                                  tgt.route === "investor" ||
                                  tgt.route === "investors"
                                    ? `/investors/${tgt.id}`
                                    : `/company/${tgt.id}`;
                                return (
                                  <span key={`tgt-${tgt.id}`}>
                                    <a
                                      href={href}
                                      className="text-blue-600 underline hover:text-blue-800"
                                    >
                                      {tgt.name}
                                    </a>
                                    {i < arr.length - 1 && ", "}
                                  </span>
                                );
                              });
                            }
                            // Fallback to legacy target_counterparty
                            if (targetHref) {
                              return (
                                <a
                                  href={targetHref}
                                  className="text-blue-600 underline hover:text-blue-800"
                                >
                                  {targetName}
                                </a>
                              );
                            }
                            return <span>{targetName}</span>;
                          })()}
                        </div>
                        {!isPartnership && (
                          <div className="text-xs text-slate-600">
                            {(() => {
                              const list = Array.isArray(
                                event.other_counterparties
                              )
                                ? event.other_counterparties.filter((cp) =>
                                    /investor|acquirer/i.test(
                                      cp._counterparty_type
                                        ?.counterparty_status || ""
                                    )
                                  )
                                : [];
                              if (list.length === 0) {
                                return (
                                  <>
                                    <strong>Buyer(s):</strong> Not Available
                                  </>
                                );
                              }
                              const statuses = list
                                .map((cp) =>
                                  (
                                    cp._counterparty_type?.counterparty_status ||
                                    ""
                                  ).toLowerCase()
                                )
                                .join(" ");
                              const hasAcquirer = /acquirer/.test(statuses);
                              const label = hasAcquirer
                                ? "Buyer(s)"
                                : "Investor(s)";
                              return (
                                <>
                                  <strong>{label}:</strong>{" "}
                                  {list.map((counterparty, subIndex) => {
                                    const nc = counterparty._new_company as
                                      | {
                                          id?: number;
                                          name?: string;
                                          _is_that_investor?: boolean;
                                          _is_that_data_analytic_company?: boolean;
                                          _url?: string;
                                          _investor_profile_id?: number;
                                        }
                                      | undefined;
                                    const name = (nc?.name || "Unknown").trim();
                                    const investorProfileId =
                                      nc?._investor_profile_id;
                                    const cpId =
                                      (counterparty as {
                                        new_company_counterparty?: number;
                                      }).new_company_counterparty || nc?.id;
                                    let url = "";
                                    if (nc?._is_that_investor) {
                                      url =
                                        typeof investorProfileId === "number" &&
                                        investorProfileId > 0
                                          ? `/investors/${investorProfileId}`
                                          : typeof cpId === "number"
                                          ? `/investors/${cpId}`
                                          : "";
                                    } else if (
                                      nc?._is_that_data_analytic_company
                                    ) {
                                      url =
                                        typeof cpId === "number"
                                          ? `/company/${cpId}`
                                          : "";
                                    } else if (
                                      typeof nc?._url === "string" &&
                                      nc?._url
                                    ) {
                                      url = nc!._url.replace(
                                        /\/(?:investor)\//,
                                        "/investors/"
                                      );
                                    }
                                    return (
                                      <span key={`buyer-${counterparty.id}-${subIndex}`}>
                                        {url ? (
                                          <a
                                            href={url}
                                            className="text-blue-600 underline hover:text-blue-800"
                                          >
                                            {name}
                                          </a>
                                        ) : (
                                          <span>{name}</span>
                                        )}
                                        {subIndex < list.length - 1 && ", "}
                                      </span>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </div>
                        )}
                        {!isPartnership && (
                          <div className="text-xs text-slate-600">
                            <strong>Seller(s):</strong>{" "}
                            {Array.isArray(event.other_counterparties) &&
                            event.other_counterparties.length > 0
                              ? (() => {
                                  const sellers =
                                    event.other_counterparties.filter((cp) => {
                                      const status =
                                        cp._counterparty_type
                                          ?.counterparty_status || "";
                                      return /divestor|seller|vendor/i.test(
                                        status
                                      );
                                    });
                                  if (sellers.length === 0)
                                    return <span>Not Available</span>;
                                  return sellers.map((counterparty, subIndex) => {
                                    const nc = counterparty._new_company as
                                      | {
                                          id?: number;
                                          name?: string;
                                          _is_that_investor?: boolean;
                                          _is_that_data_analytic_company?: boolean;
                                          _url?: string;
                                          _investor_profile_id?: number;
                                        }
                                      | undefined;
                                    const name = (nc?.name || "Unknown").trim();
                                    const investorProfileId =
                                      nc?._investor_profile_id;
                                    const cpId =
                                      (
                                        counterparty as {
                                          new_company_counterparty?: number;
                                        }
                                      ).new_company_counterparty || nc?.id;
                                    let url = "";
                                    if (nc?._is_that_investor) {
                                      url =
                                        typeof investorProfileId === "number" &&
                                        investorProfileId > 0
                                          ? `/investors/${investorProfileId}`
                                          : typeof cpId === "number"
                                          ? `/investors/${cpId}`
                                          : "";
                                    } else if (
                                      nc?._is_that_data_analytic_company
                                    ) {
                                      url =
                                        typeof cpId === "number"
                                          ? `/company/${cpId}`
                                          : "";
                                    } else if (
                                      typeof nc?._url === "string" &&
                                      nc?._url
                                    ) {
                                      url = nc!._url.replace(
                                        /\/(?:investor)\//,
                                        "/investors/"
                                      );
                                    }
                                    return (
                                      <span key={subIndex}>
                                        {url ? (
                                          <a
                                            href={url}
                                            className="text-blue-600 underline hover:text-blue-800"
                                          >
                                            {name}
                                          </a>
                                        ) : (
                                          <span>{name}</span>
                                        )}
                                        {subIndex < sellers.length - 1 && ", "}
                                      </span>
                                    );
                                  });
                                })()
                              : "Not Available"}
                          </div>
                        )}
                      </td>
                      {/* Deal Details */}
                      <td className="p-3 align-top break-words">
                        <div className="mb-1 text-xs text-slate-600">
                          <strong>Deal Type:</strong>{" "}
                          {event.deal_type ? (
                            <span className="inline-flex flex-wrap gap-1 align-middle">
                              <span className="inline-block px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded">
                                {event.deal_type}
                              </span>
                              {fundingStage && (
                                <span className="inline-block px-2 py-1 text-xs text-green-700 bg-green-50 rounded">
                                  {fundingStage}
                                </span>
                              )}
                            </span>
                          ) : (
                            "Not Available"
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong>Amount (m):</strong>{" "}
                          {formatCurrency(
                            event.investment_data?.investment_amount_m,
                            event.investment_data?.currency?.Currency
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong>EV (m):</strong>{" "}
                          {formatCurrency(
                            event.ev_data?.enterprise_value_m,
                            event.ev_data?.currency?.Currency
                          )}
                        </div>
                      </td>
                      {/* Advisors */}
                      <td className="p-3 align-top break-words">
                        <div className="text-xs text-slate-600">
                          <strong>Advisors:</strong>{" "}
                          {Array.isArray(event.advisors) &&
                          event.advisors.length > 0
                            ? event.advisors.map((advisor, idx) => {
                                const nc = advisor._new_company;
                                const name = nc?.name || "Unknown";
                                // Advisor pages use `new_comp_id` (i.e., new_company id).
                                // Some API shapes omit `_new_company.id`, so fall back to `new_company_advised`.
                                const id =
                                  nc?.id ??
                                  (advisor as unknown as { new_company_advised?: number })
                                    .new_company_advised;
                                return (
                                  <span key={id || idx}>
                                    {id ? (
                                      <a
                                        href={`/advisor/${id}`}
                                        className="text-blue-600 underline hover:text-blue-800"
                                      >
                                        {name}
                                      </a>
                                    ) : (
                                      name
                                    )}
                                    {idx < event.advisors!.length - 1 && ", "}
                                  </span>
                                );
                              })
                            : "Not Available"}
                        </div>
                      </td>
                      {/* Sectors */}
                      <td className="p-3 align-top break-words">
                        <div className="text-xs text-slate-600">
                          <strong>Primary:</strong>{" "}
                          {renderSectorLinks(primarySectorsSource)}
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong>Secondary:</strong>{" "}
                          {renderSectorLinks(secondarySectorsSource)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pageTotal > 1 && (
          <div className="flex gap-2 justify-center items-center mt-6">
            {generatePaginationButtons()}
          </div>
        )}

        {/* CSS for pagination */}
        <style jsx>{`
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
        `}</style>

      <ExportLimitModal
        isOpen={showExportLimitModal}
        onClose={() => setShowExportLimitModal(false)}
        exportsLeft={exportsLeft}
        totalExports={EXPORT_LIMIT}
      />
      </div>
    );
  }

  // Sector Insights & Analysis Tab Component
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

    const handleArticleClick = (articleId: number) => {
      router.push(`/article/${articleId}`);
    };

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

    const formatSectors = (
      sectors: Array<Array<{ sector_name: string }>> | undefined
    ) => {
      if (!sectors || sectors.length === 0) return "Not available";
      const allSectors = sectors
        .flat()
        .filter((s) => s && s.sector_name)
        .map((s) => s.sector_name);
      return allSectors.length > 0 ? allSectors.join(", ") : "Not available";
    };

    const formatCompanies = (
      companies: ContentArticle["companies_mentioned"] | undefined
    ) => {
      if (!companies || companies.length === 0) return "Not available";
      const validCompanies = companies
        .filter((c) => c && c.name)
        .map((c) => c.name);
      return validCompanies.length > 0 ? validCompanies.join(", ") : "Not available";
    };

    const badgeClassFor = (contentType?: string): string => {
      const t = (contentType || "").toLowerCase();
      if (t === "company analysis") return "badge badge-company-analysis";
      if (t === "deal analysis") return "badge badge-deal-analysis";
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
          <div className="space-y-4 max-w-md">
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
            {articles.map((article: ContentArticle, index: number) => (
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
                  handleArticleClick(article.id);
                }}
              >
                <h3 className="article-title">
                  {article.Headline || "Not Available"}
                </h3>
                <p className="article-date">
                  {formatDate(article.Publication_Date)}
                </p>
                {article.Content_Type && (
                  <div className="article-badge-row">
                    <span className={badgeClassFor(article.Content_Type)}>
                      {article.Content_Type}
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
            ))}
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
                {sectorData ? (
                  <SectorThesisCard sectorData={sectorData} />
                ) : (
                  <div className="bg-white rounded-xl border shadow-lg border-slate-200/60 p-5 animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:w-1/2">
                {recentTransactions.length > 0 ? (
                  <RecentTransactionsCard transactions={recentTransactions} />
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
                />
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
                />
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
              <MarketMapGrid companies={marketMapCompanies} />
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
                    <span className="text-slate-900">All Companies</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {allCompaniesPagination.itemsReceived.toLocaleString()}{" "}
                    total
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {ownershipFilter && (
                  <div className="px-3 py-2 mb-3 bg-blue-50 rounded border border-blue-200">
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
                          fetchAllCompaniesForSector(1);
                        }
                      }}
                      className="ml-3 text-sm font-semibold text-blue-700 underline hover:text-blue-900"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
                <div className="p-4 mb-3 bg-white rounded-xl border shadow-lg border-slate-200/60">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold text-slate-900">
                      Filters
                    </h3>
                    <button
                      onClick={() => setAllShowFilters(!allShowFilters)}
                      className="text-sm text-blue-600 underline"
                    >
                      {allShowFilters ? "Hide Filters" : "Show Filters"}
                    </button>
                  </div>
                  {allShowFilters && (
                    <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-3">
                      <div>
                        <h4 className="mb-3 text-sm font-semibold text-slate-900">
                          Location
                        </h4>
                        <span className="block mb-1 text-sm text-slate-700">
                          By Continental Region
                        </span>
                        <SearchableSelect
                          options={allContinentalRegions.map((r) => ({
                            value: r,
                            label: r,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "string" &&
                              v &&
                              !selContinentalRegions.includes(v)
                            ) {
                              setSelContinentalRegions([
                                ...selContinentalRegions,
                                v,
                              ]);
                            }
                          }}
                          placeholder="Select Continental Region"
                        />
                        {selContinentalRegions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selContinentalRegions.map((r) => (
                              <span
                                key={r}
                                className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                              >
                                {r}
                                <button
                                  onClick={() =>
                                    setSelContinentalRegions(
                                      selContinentalRegions.filter(
                                        (x) => x !== r
                                      )
                                    )
                                  }
                                  className="font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="block mt-3 mb-1 text-sm text-slate-700">
                          By Sub-Region
                        </span>
                        <SearchableSelect
                          options={allSubRegions.map((r) => ({
                            value: r,
                            label: r,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "string" &&
                              v &&
                              !selSubRegions.includes(v)
                            ) {
                              setSelSubRegions([...selSubRegions, v]);
                            }
                          }}
                          placeholder="Select Sub-Region"
                        />
                        {selSubRegions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selSubRegions.map((r) => (
                              <span
                                key={r}
                                className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                              >
                                {r}
                                <button
                                  onClick={() =>
                                    setSelSubRegions(
                                      selSubRegions.filter((x) => x !== r)
                                    )
                                  }
                                  className="font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="block mt-3 mb-1 text-sm text-slate-700">
                          By Country
                        </span>
                        <SearchableSelect
                          options={allCountries.map((c) => ({
                            value: c.locations_Country,
                            label: c.locations_Country,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "string" &&
                              v &&
                              !selCountries.includes(v)
                            ) {
                              setSelCountries([...selCountries, v]);
                            }
                          }}
                          placeholder={
                            loadingAllCountries
                              ? "Loading countries..."
                              : "Select Country"
                          }
                          disabled={loadingAllCountries}
                        />
                        {selCountries.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selCountries.map((r) => (
                              <span
                                key={r}
                                className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                              >
                                {r}
                                <button
                                  onClick={() =>
                                    setSelCountries(
                                      selCountries.filter((x) => x !== r)
                                    )
                                  }
                                  className="font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="block mt-3 mb-1 text-sm text-slate-700">
                          By State/County/Province
                        </span>
                        <SearchableSelect
                          options={allProvinces.map((p) => ({
                            value: p.State__Province__County,
                            label: p.State__Province__County,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "string" &&
                              v &&
                              !selProvinces.includes(v)
                            ) {
                              setSelProvinces([...selProvinces, v]);
                            }
                          }}
                          placeholder={
                            loadingAllProvinces
                              ? "Loading provinces..."
                              : selCountries.length === 0
                              ? "Select country first"
                              : "Select Province"
                          }
                          disabled={
                            loadingAllProvinces || selCountries.length === 0
                          }
                        />
                        {selProvinces.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selProvinces.map((r) => (
                              <span
                                key={r}
                                className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                              >
                                {r}
                                <button
                                  onClick={() =>
                                    setSelProvinces(
                                      selProvinces.filter((x) => x !== r)
                                    )
                                  }
                                  className="font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="block mt-3 mb-1 text-sm text-slate-700">
                          By City
                        </span>
                        <SearchableSelect
                          options={allCities.map((c) => ({
                            value: c.City,
                            label: c.City,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "string" &&
                              v &&
                              !selCities.includes(v)
                            ) {
                              setSelCities([...selCities, v]);
                            }
                          }}
                          placeholder={
                            loadingAllCities
                              ? "Loading cities..."
                              : selCountries.length === 0
                              ? "Select country first"
                              : "Select City"
                          }
                          disabled={
                            loadingAllCities || selCountries.length === 0
                          }
                        />
                        {selCities.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selCities.map((r) => (
                              <span
                                key={r}
                                className="inline-flex gap-1 items-center px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded"
                              >
                                {r}
                                <button
                                  onClick={() =>
                                    setSelCities(
                                      selCities.filter((x) => x !== r)
                                    )
                                  }
                                  className="font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-3 text-sm font-semibold text-slate-900">
                          Sectors
                        </h4>
                        <span className="block mb-1 text-sm text-slate-700">
                          By Secondary Sectors
                        </span>
                        <SearchableSelect
                          options={allSecondarySectors.map((s) => ({
                            value: s.id,
                            label: s.sector_name,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "number" &&
                              v &&
                              !selSecondarySectors.includes(v)
                            ) {
                              setSelSecondarySectors([
                                ...selSecondarySectors,
                                v,
                              ]);
                            }
                          }}
                          placeholder={
                            loadingAllSecondarySectors
                              ? "Loading sectors..."
                              : "Select Secondary Sector"
                          }
                          disabled={loadingAllSecondarySectors}
                        />
                        {selSecondarySectors.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selSecondarySectors.map((id) => {
                              const s = allSecondarySectors.find(
                                (x) => x.id === id
                              );
                              return (
                                <span
                                  key={id}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                                >
                                  {s?.sector_name || `Sector ${id}`}
                                  <button
                                    onClick={() =>
                                      setSelSecondarySectors(
                                        selSecondarySectors.filter(
                                          (x) => x !== id
                                        )
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className="block mt-3 mb-1 text-sm text-slate-700">
                          Hybrid Business Focus
                        </span>
                        <SearchableSelect
                          options={allHybridBusinessFocuses.map((f) => ({
                            value: f.id,
                            label: f.business_focus,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "number" &&
                              v &&
                              !selHybridBusinessFocuses.includes(v)
                            ) {
                              setSelHybridBusinessFocuses([
                                ...selHybridBusinessFocuses,
                                v,
                              ]);
                            }
                          }}
                          placeholder={
                            loadingAllHybridFocus
                              ? "Loading business focuses..."
                              : "Select Business Focus"
                          }
                          disabled={loadingAllHybridFocus}
                        />
                        {selHybridBusinessFocuses.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selHybridBusinessFocuses.map((id) => {
                              const f = allHybridBusinessFocuses.find(
                                (x) => x.id === id
                              );
                              return (
                                <span
                                  key={id}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-amber-700 bg-amber-50 rounded"
                                >
                                  {f?.business_focus || `Focus ${id}`}
                                  <button
                                    onClick={() =>
                                      setSelHybridBusinessFocuses(
                                        selHybridBusinessFocuses.filter(
                                          (x) => x !== id
                                        )
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-3 text-sm font-semibold text-slate-900">
                          Company Details
                        </h4>
                        <span className="block mb-1 text-sm text-slate-700">
                          By Ownership Type
                        </span>
                        <SearchableSelect
                          options={allOwnershipTypes.map((o) => ({
                            value: o.id,
                            label: o.ownership,
                          }))}
                          value=""
                          onChange={(v) => {
                            if (
                              typeof v === "number" &&
                              v &&
                              !selOwnershipTypes.includes(v)
                            ) {
                              setSelOwnershipTypes([...selOwnershipTypes, v]);
                            }
                          }}
                          placeholder={
                            loadingAllOwnershipTypes
                              ? "Loading ownership types..."
                              : "Select Ownership Type"
                          }
                          disabled={loadingAllOwnershipTypes}
                        />
                        {selOwnershipTypes.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selOwnershipTypes.map((id) => {
                              const o = allOwnershipTypes.find(
                                (x) => x.id === id
                              );
                              return (
                                <span
                                  key={id}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-purple-700 bg-purple-50 rounded"
                                >
                                  {o?.ownership || `Ownership ${id}`}
                                  <button
                                    onClick={() =>
                                      setSelOwnershipTypes(
                                        selOwnershipTypes.filter(
                                          (x) => x !== id
                                        )
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className="block mt-3 mb-1 text-sm text-slate-700">
                          LinkedIn Members Range
                        </span>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            className="px-3 py-2 w-full text-sm rounded border"
                            placeholder="Min"
                            value={selLinkedinMin ?? ""}
                            onChange={(e) =>
                              setSelLinkedinMin(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                          <input
                            type="number"
                            className="px-3 py-2 w-full text-sm rounded border"
                            placeholder="Max"
                            value={selLinkedinMax ?? ""}
                            onChange={(e) =>
                              setSelLinkedinMax(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-900">
                      Search for Company
                    </h4>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        className="px-3 py-2 w-full max-w-md text-sm rounded border"
                        placeholder="Enter company name here"
                        value={allSearchTerm}
                        onChange={(e) => setAllSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const f: AllCompaniesFilters = {
                              countries: selCountries,
                              provinces: selProvinces,
                              cities: selCities,
                              continentalRegions: selContinentalRegions,
                              subRegions: selSubRegions,
                              secondarySectors: selSecondarySectors,
                              hybridBusinessFocuses: selHybridBusinessFocuses,
                              ownershipTypes: selOwnershipTypes,
                              linkedinMembersMin: selLinkedinMin,
                              linkedinMembersMax: selLinkedinMax,
                              searchQuery: allSearchTerm,
                            };
                            fetchAllCompaniesForSector(1, f);
                          }
                        }}
                      />
                      <button
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                        onClick={() => {
                          const f: AllCompaniesFilters = {
                            countries: selCountries,
                            provinces: selProvinces,
                            cities: selCities,
                            continentalRegions: selContinentalRegions,
                            subRegions: selSubRegions,
                            secondarySectors: selSecondarySectors,
                            hybridBusinessFocuses: selHybridBusinessFocuses,
                            ownershipTypes: selOwnershipTypes,
                            linkedinMembersMin: selLinkedinMin,
                            linkedinMembersMax: selLinkedinMax,
                            searchQuery: allSearchTerm,
                          };
                          fetchAllCompaniesForSector(1, f);
                        }}
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
                {allCompaniesLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading companies...
                  </div>
                ) : allCompaniesError ? (
                  <div className="py-4 text-center text-red-600">
                    {allCompaniesError}
                  </div>
                ) : allCompanies.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No companies found for this sector.
                  </div>
                ) : (
                  <div className="overflow-x-hidden">
                    <table className="w-full text-sm table-fixed">
                      <thead className="bg-slate-50/80">
                        <tr className="hover:bg-slate-50/80">
                          <th className="py-3 font-semibold text-left text-slate-700 w-[8%]">
                            Logo
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[17%]">
                            Name
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[20%]">
                            Description
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[16%]">
                            Primary Sector(s)
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[14%]">
                            Sub-Sector(s)
                          </th>
                          <th className="py-3 px-3 font-semibold text-center text-slate-700 w-[7%]">
                            LinkedIn Members
                          </th>
                          <th className="py-3 px-3 font-semibold text-center text-slate-700 w-[7%]">
                            Country
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ownershipFilter &&
                        !ownershipTypeIds[
                          ownershipFilter
                            .replace(/_/g, " ")
                            .replace(
                              "venture capital backed",
                              "venture capital"
                            )
                            .replace("private equity owned", "private equity")
                            .trim()
                        ]
                          ? allCompanies.filter((c) => {
                              const own = (c.ownership || "").toLowerCase();
                              if (ownershipFilter === "public")
                                return own.includes("public");
                              if (ownershipFilter === "private_equity_owned")
                                return own.includes("private equity");
                              if (ownershipFilter === "venture_capital_backed")
                                return own.includes("venture");
                              if (ownershipFilter === "private")
                                return (
                                  !own.includes("public") &&
                                  !own.includes("private equity") &&
                                  !own.includes("venture")
                                );
                              return true;
                            })
                          : allCompanies
                        ).map((c) => {
                          const primaryDisplay = Array.isArray(
                            c.primary_sectors
                          )
                            ? c.primary_sectors
                            : [];
                          const expanded = !!allExpandedDescriptions[c.id];
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/50">
                              <td className="py-3 pr-4">
                                {c.linkedin_logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`data:image/jpeg;base64,${c.linkedin_logo}`}
                                    alt={`${c.name} logo`}
                                    className="object-contain w-12 h-8 rounded"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="flex justify-center items-center w-12 h-8 text-[10px] text-slate-500 bg-slate-100 rounded">
                                    No Logo
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pr-4 align-middle whitespace-normal break-words">
                                <a
                                  href={`/company/${c.id}`}
                                  className="font-medium text-blue-600 underline"
                                >
                                  {c.name}
                                </a>
                              </td>
                              <td className="py-3 pr-4 align-top whitespace-normal break-words text-slate-700">
                                {c.description ? (
                                  <>
                                    <div
                                      style={
                                        expanded
                                          ? {}
                                          : {
                                              display: "-webkit-box",
                                              WebkitLineClamp: 4,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              minHeight: "5rem",
                                            }
                                      }
                                    >
                                      {c.description}
                                    </div>
                                    {c.description.length > 160 && (
                                      <button
                                        className="mt-1 text-xs text-blue-600 underline hover:text-blue-800"
                                        onClick={() =>
                                          setAllExpandedDescriptions(
                                            (prev) => ({
                                              ...prev,
                                              [c.id]: !expanded,
                                            })
                                          )
                                        }
                                      >
                                        {expanded ? "Read Less" : "Read More"}
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                              <td className="py-3 pr-4 align-middle whitespace-normal break-words text-slate-700">
                                {primaryDisplay.length > 0
                                  ? primaryDisplay.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 align-middle whitespace-normal break-words text-slate-700">
                                {Array.isArray(c.secondary_sectors) &&
                                c.secondary_sectors.length > 0
                                  ? c.secondary_sectors.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-center text-slate-700">
                                {typeof c.linkedin_members === "number"
                                  ? c.linkedin_members.toLocaleString()
                                  : "0"}
                              </td>
                              <td className="py-3 pr-4 text-center text-slate-700">
                                {c.country || "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* All Companies Filters (same as Companies search, minus Primary Sectors) */}
              {false && (
                <div className="px-5 pb-2">
                  <div className="p-4 bg-white rounded-xl border shadow-lg border-slate-200/60">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-semibold text-slate-900">
                        Filters
                      </h3>
                      <button
                        onClick={() => setAllShowFilters(!allShowFilters)}
                        className="text-sm text-blue-600 underline"
                      >
                        {allShowFilters ? "Hide Filters" : "Show Filters"}
                      </button>
                    </div>
                    {allShowFilters && (
                      <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-3">
                        {/* Location */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-slate-900">
                            Location
                          </h4>
                          <span className="block mb-1 text-sm text-slate-700">
                            By Continental Region
                          </span>
                          <SearchableSelect
                            options={allContinentalRegions.map((r) => ({
                              value: r,
                              label: r,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "string" &&
                                v &&
                                !selContinentalRegions.includes(v)
                              ) {
                                setSelContinentalRegions([
                                  ...selContinentalRegions,
                                  v,
                                ]);
                              }
                            }}
                            placeholder="Select Continental Region"
                          />
                          {selContinentalRegions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selContinentalRegions.map((r) => (
                                <span
                                  key={r}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                                >
                                  {r}
                                  <button
                                    onClick={() =>
                                      setSelContinentalRegions(
                                        selContinentalRegions.filter(
                                          (x) => x !== r
                                        )
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <span className="block mt-3 mb-1 text-sm text-slate-700">
                            By Sub-Region
                          </span>
                          <SearchableSelect
                            options={allSubRegions.map((r) => ({
                              value: r,
                              label: r,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "string" &&
                                v &&
                                !selSubRegions.includes(v)
                              ) {
                                setSelSubRegions([...selSubRegions, v]);
                              }
                            }}
                            placeholder="Select Sub-Region"
                          />
                          {selSubRegions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selSubRegions.map((r) => (
                                <span
                                  key={r}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                                >
                                  {r}
                                  <button
                                    onClick={() =>
                                      setSelSubRegions(
                                        selSubRegions.filter((x) => x !== r)
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <span className="block mt-3 mb-1 text-sm text-slate-700">
                            By Country
                          </span>
                          <SearchableSelect
                            options={allCountries.map((c) => ({
                              value: c.locations_Country,
                              label: c.locations_Country,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "string" &&
                                v &&
                                !selCountries.includes(v)
                              ) {
                                setSelCountries([...selCountries, v]);
                              }
                            }}
                            placeholder={
                              loadingAllCountries
                                ? "Loading countries..."
                                : "Select Country"
                            }
                            disabled={loadingAllCountries}
                          />
                          {selCountries.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selCountries.map((r) => (
                                <span
                                  key={r}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                                >
                                  {r}
                                  <button
                                    onClick={() =>
                                      setSelCountries(
                                        selCountries.filter((x) => x !== r)
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <span className="block mt-3 mb-1 text-sm text-slate-700">
                            By State/County/Province
                          </span>
                          <SearchableSelect
                            options={allProvinces.map((p) => ({
                              value: p.State__Province__County,
                              label: p.State__Province__County,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "string" &&
                                v &&
                                !selProvinces.includes(v)
                              ) {
                                setSelProvinces([...selProvinces, v]);
                              }
                            }}
                            placeholder={
                              loadingAllProvinces
                                ? "Loading provinces..."
                                : selCountries.length === 0
                                ? "Select country first"
                                : "Select Province"
                            }
                            disabled={
                              loadingAllProvinces || selCountries.length === 0
                            }
                          />
                          {selProvinces.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selProvinces.map((r) => (
                                <span
                                  key={r}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                                >
                                  {r}
                                  <button
                                    onClick={() =>
                                      setSelProvinces(
                                        selProvinces.filter((x) => x !== r)
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <span className="block mt-3 mb-1 text-sm text-slate-700">
                            By City
                          </span>
                          <SearchableSelect
                            options={allCities.map((c) => ({
                              value: c.City,
                              label: c.City,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "string" &&
                                v &&
                                !selCities.includes(v)
                              ) {
                                setSelCities([...selCities, v]);
                              }
                            }}
                            placeholder={
                              loadingAllCities
                                ? "Loading cities..."
                                : selCountries.length === 0
                                ? "Select country first"
                                : "Select City"
                            }
                            disabled={
                              loadingAllCities || selCountries.length === 0
                            }
                          />
                          {selCities.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selCities.map((r) => (
                                <span
                                  key={r}
                                  className="inline-flex gap-1 items-center px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded"
                                >
                                  {r}
                                  <button
                                    onClick={() =>
                                      setSelCities(
                                        selCities.filter((x) => x !== r)
                                      )
                                    }
                                    className="font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sectors */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-slate-900">
                            Sectors
                          </h4>
                          <span className="block mb-1 text-sm text-slate-700">
                            By Secondary Sectors
                          </span>
                          <SearchableSelect
                            options={allSecondarySectors.map((s) => ({
                              value: s.id,
                              label: s.sector_name,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "number" &&
                                v &&
                                !selSecondarySectors.includes(v)
                              ) {
                                setSelSecondarySectors([
                                  ...selSecondarySectors,
                                  v,
                                ]);
                              }
                            }}
                            placeholder={
                              loadingAllSecondarySectors
                                ? "Loading sectors..."
                                : "Select Secondary Sector"
                            }
                            disabled={loadingAllSecondarySectors}
                          />
                          {selSecondarySectors.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selSecondarySectors.map((id) => {
                                const s = allSecondarySectors.find(
                                  (x) => x.id === id
                                );
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                                  >
                                    {s?.sector_name || `Sector ${id}`}
                                    <button
                                      onClick={() =>
                                        setSelSecondarySectors(
                                          selSecondarySectors.filter(
                                            (x) => x !== id
                                          )
                                        )
                                      }
                                      className="font-bold"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <span className="block mt-3 mb-1 text-sm text-slate-700">
                            Hybrid Business Focus
                          </span>
                          <SearchableSelect
                            options={allHybridBusinessFocuses.map((f) => ({
                              value: f.id,
                              label: f.business_focus,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "number" &&
                                v &&
                                !selHybridBusinessFocuses.includes(v)
                              ) {
                                setSelHybridBusinessFocuses([
                                  ...selHybridBusinessFocuses,
                                  v,
                                ]);
                              }
                            }}
                            placeholder={
                              loadingAllHybridFocus
                                ? "Loading business focuses..."
                                : "Select Business Focus"
                            }
                            disabled={loadingAllHybridFocus}
                          />
                          {selHybridBusinessFocuses.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selHybridBusinessFocuses.map((id) => {
                                const f = allHybridBusinessFocuses.find(
                                  (x) => x.id === id
                                );
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex gap-1 items-center px-2 py-1 text-xs text-amber-700 bg-amber-50 rounded"
                                  >
                                    {f?.business_focus || `Focus ${id}`}
                                    <button
                                      onClick={() =>
                                        setSelHybridBusinessFocuses(
                                          selHybridBusinessFocuses.filter(
                                            (x) => x !== id
                                          )
                                        )
                                      }
                                      className="font-bold"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Company Details */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-slate-900">
                            Company Details
                          </h4>
                          <span className="block mb-1 text-sm text-slate-700">
                            By Ownership Type
                          </span>
                          <SearchableSelect
                            options={allOwnershipTypes.map((o) => ({
                              value: o.id,
                              label: o.ownership,
                            }))}
                            value=""
                            onChange={(v) => {
                              if (
                                typeof v === "number" &&
                                v &&
                                !selOwnershipTypes.includes(v)
                              ) {
                                setSelOwnershipTypes([...selOwnershipTypes, v]);
                              }
                            }}
                            placeholder={
                              loadingAllOwnershipTypes
                                ? "Loading ownership types..."
                                : "Select Ownership Type"
                            }
                            disabled={loadingAllOwnershipTypes}
                          />
                          {selOwnershipTypes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selOwnershipTypes.map((id) => {
                                const o = allOwnershipTypes.find(
                                  (x) => x.id === id
                                );
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex gap-1 items-center px-2 py-1 text-xs text-purple-700 bg-purple-50 rounded"
                                  >
                                    {o?.ownership || `Ownership ${id}`}
                                    <button
                                      onClick={() =>
                                        setSelOwnershipTypes(
                                          selOwnershipTypes.filter(
                                            (x) => x !== id
                                          )
                                        )
                                      }
                                      className="font-bold"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <span className="block mt-3 mb-1 text-sm text-slate-700">
                            LinkedIn Members Range
                          </span>
                          <div className="flex gap-3">
                            <input
                              type="number"
                              className="px-3 py-2 w-full text-sm rounded border"
                              placeholder="Min"
                              value={selLinkedinMin ?? ""}
                              onChange={(e) =>
                                setSelLinkedinMin(
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            />
                            <input
                              type="number"
                              className="px-3 py-2 w-full text-sm rounded border"
                              placeholder="Max"
                              value={selLinkedinMax ?? ""}
                              onChange={(e) =>
                                setSelLinkedinMax(
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Search */}
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold text-slate-900">
                        Search for Company
                      </h4>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          className="px-3 py-2 w-full max-w-md text-sm rounded border"
                          placeholder="Enter company name here"
                          value={allSearchTerm}
                          onChange={(e) => setAllSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const f: AllCompaniesFilters = {
                                countries: selCountries,
                                provinces: selProvinces,
                                cities: selCities,
                                continentalRegions: selContinentalRegions,
                                subRegions: selSubRegions,
                                secondarySectors: selSecondarySectors,
                                hybridBusinessFocuses: selHybridBusinessFocuses,
                                ownershipTypes: selOwnershipTypes,
                                linkedinMembersMin: selLinkedinMin,
                                linkedinMembersMax: selLinkedinMax,
                                searchQuery: allSearchTerm,
                              };
                              fetchAllCompaniesForSector(1, f);
                            }
                          }}
                        />
                        <button
                          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                          onClick={() => {
                            const f: AllCompaniesFilters = {
                              countries: selCountries,
                              provinces: selProvinces,
                              cities: selCities,
                              continentalRegions: selContinentalRegions,
                              subRegions: selSubRegions,
                              secondarySectors: selSecondarySectors,
                              hybridBusinessFocuses: selHybridBusinessFocuses,
                              ownershipTypes: selOwnershipTypes,
                              linkedinMembersMin: selLinkedinMin,
                              linkedinMembersMax: selLinkedinMax,
                              searchQuery: allSearchTerm,
                            };
                            fetchAllCompaniesForSector(1, f);
                          }}
                        >
                          Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {allCompaniesPagination.pageTotal > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <button
                  disabled={!allCompaniesPagination.prevPage}
                  onClick={() =>
                    allCompaniesPagination.prevPage &&
                    fetchAllCompaniesForSector(allCompaniesPagination.prevPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {allCompaniesPagination.curPage} of{" "}
                  {allCompaniesPagination.pageTotal}
                </span>
                <button
                  disabled={!allCompaniesPagination.nextPage}
                  onClick={() =>
                    allCompaniesPagination.nextPage &&
                    fetchAllCompaniesForSector(allCompaniesPagination.nextPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "public" ? (
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
                    <span className="text-slate-900">Public Companies</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {publicCompaniesPagination.itemsReceived.toLocaleString()}{" "}
                    total
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {publicCompaniesLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading companies...
                  </div>
                ) : publicCompaniesError ? (
                  <div className="py-4 text-center text-red-600">
                    {publicCompaniesError}
                  </div>
                ) : publicCompanies.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No companies found for this sector.
                  </div>
                ) : (
                  <div className="overflow-x-hidden">
                    <table className="w-full text-sm table-fixed">
                      <thead className="bg-slate-50/80">
                        <tr className="hover:bg-slate-50/80">
                          <th className="py-3 font-semibold text-left text-slate-700 w-[8%]">
                            Logo
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[17%]">
                            Name
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[20%]">
                            Description
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[16%]">
                            Primary Sector(s)
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[14%]">
                            Sub-Sector(s)
                          </th>
                          <th className="py-3 px-3 font-semibold text-center text-slate-700 w-[7%]">
                            LinkedIn Members
                          </th>
                          <th className="py-3 px-3 font-semibold text-center text-slate-700 w-[7%]">
                            Country
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {publicCompanies.map((c) => {
                          const primaryDisplay = Array.isArray(
                            c.primary_sectors
                          )
                            ? c.primary_sectors
                            : [];
                          const expanded = !!publicExpandedDescriptions[c.id];
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/50">
                              <td className="py-3 pr-4">
                                {c.linkedin_logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`data:image/jpeg;base64,${c.linkedin_logo}`}
                                    alt={`${c.name} logo`}
                                    className="object-contain w-12 h-8 rounded"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="flex justify-center items-center w-12 h-8 text-[10px] text-slate-500 bg-slate-100 rounded">
                                    No Logo
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pr-4 align-middle whitespace-normal break-words">
                                <a
                                  href={`/company/${c.id}`}
                                  className="font-medium text-blue-600 underline"
                                >
                                  {c.name}
                                </a>
                              </td>
                              <td className="py-3 pr-4 align-top whitespace-normal break-words text-slate-700">
                                {c.description ? (
                                  <>
                                    <div
                                      style={
                                        expanded
                                          ? {}
                                          : {
                                              display: "-webkit-box",
                                              WebkitLineClamp: 4,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              minHeight: "5rem",
                                            }
                                      }
                                    >
                                      {c.description}
                                    </div>
                                    {c.description.length > 160 && (
                                      <button
                                        className="mt-1 text-xs text-blue-600 underline hover:text-blue-800"
                                        onClick={() =>
                                          setPublicExpandedDescriptions(
                                            (prev) => ({
                                              ...prev,
                                              [c.id]: !expanded,
                                            })
                                          )
                                        }
                                      >
                                        {expanded ? "Read Less" : "Read More"}
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                              <td className="py-3 pr-4 align-middle whitespace-normal break-words text-slate-700">
                                {primaryDisplay.length > 0
                                  ? primaryDisplay.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 align-middle whitespace-normal break-words text-slate-700">
                                {Array.isArray(c.secondary_sectors) &&
                                c.secondary_sectors.length > 0
                                  ? c.secondary_sectors.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-center text-slate-700">
                                {typeof c.linkedin_members === "number"
                                  ? c.linkedin_members.toLocaleString()
                                  : "0"}
                              </td>
                              <td className="py-3 pr-4 text-center text-slate-700">
                                {c.country || "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {publicCompaniesPagination.pageTotal > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <button
                  disabled={!publicCompaniesPagination.prevPage}
                  onClick={() =>
                    publicCompaniesPagination.prevPage &&
                    fetchPublicCompaniesForSector(
                      publicCompaniesPagination.prevPage
                    )
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {publicCompaniesPagination.curPage} of{" "}
                  {publicCompaniesPagination.pageTotal}
                </span>
                <button
                  disabled={!publicCompaniesPagination.nextPage}
                  onClick={() =>
                    publicCompaniesPagination.nextPage &&
                    fetchPublicCompaniesForSector(
                      publicCompaniesPagination.nextPage
                    )
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
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
        ) : activeTab === "transactions" ? (
          <SectorTransactionsTab sectorId={sectorId} />
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
