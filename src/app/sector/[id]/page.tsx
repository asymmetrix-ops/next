"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "@/types/corporateEvents";
import { CSVExporter } from "@/utils/csvExport";
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
  const toTypeFromBucket = (bucket: string): string => {
    const b = (bucket || "").toLowerCase();
    if (b.includes("public")) return "public";
    if (b.includes("private equity") || b.includes("pe"))
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
    const idVal =
      (c.id as number | undefined) ||
      (c as { original_new_company_id?: number }).original_new_company_id ||
      0;
    const ownership = toStringSafe(c.ownership);
    const primarySectors = Array.isArray(
      (c as { primary_sectors?: string[] }).primary_sectors
    )
      ? ((c as { primary_sectors?: string[] }).primary_sectors as string[])
      : [];
    const company = {
      id: typeof idVal === "number" ? idVal : 0,
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
  if (raw && !Array.isArray(raw) && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
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
  const arr = Array.isArray(raw)
    ? (raw as Array<unknown>)
    : (extractArray(raw) as Array<unknown>);
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
  const sectorName = sectorData?.Sector?.sector_name;
  const thesisHtml = sectorData?.Sector?.Sector_thesis;

  return (
    <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
      <div className="px-5 py-4 border-b border-slate-100">
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
      <div className="px-5 py-5">
        {thesisHtml ? (
          <div
            className="max-w-none prose prose-sm text-slate-700"
            dangerouslySetInnerHTML={{ __html: thesisHtml }}
          />
        ) : (
          <div className="text-sm text-slate-500">Not available</div>
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
          <table className="min-w-full text-sm">
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
    <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
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
          <table className="min-w-full text-sm">
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
const SectorDetailPage = () => {
  const params = useParams();
  const sectorId = params.id as string;

  const [sectorData, setSectorData] = useState<SectorStatistics | null>(null);
  const [companies, setCompanies] = useState<SectorCompany[]>([]);
  const [companiesTotal, setCompaniesTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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
  // Split datasets fetched from dedicated endpoints
  const [splitStrategicRaw, setSplitStrategicRaw] = useState<unknown>(null);
  const [splitPERaw, setSplitPERaw] = useState<unknown>(null);
  const [splitMarketMapRaw, setSplitMarketMapRaw] = useState<unknown>(null);
  const [splitRecentRaw, setSplitRecentRaw] = useState<unknown>(null);
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

  // Fetch sector data
  const fetchSectorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      if (!token) {
        setError("Authentication required");
        return;
      }

      const params = new URLSearchParams();
      params.append("Sector_id", sectorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Get_Sector?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        if (response.status === 404) {
          throw new Error("Sector not found");
        }
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: SectorStatistics = await response.json();
      setSectorData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch sector data"
      );
      console.error("Error fetching sector data:", err);
    } finally {
      setLoading(false);
    }
  }, [sectorId]);

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

        // Companies endpoint (sector-scoped) - GET with query params (0-based Offset)
        const offsetForApi = Math.max(0, page - 1);
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
        const computedOffset = r1b?.offset ?? offsetForApi * computedPerPage;
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

  // Fetch split datasets (market map, strategic acquirers, PE investors)
  const fetchSplitDatasets = useCallback(async () => {
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) return;
      const Sector_id = Number(sectorId);
      if (Number.isNaN(Sector_id)) return;

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      } as HeadersInit;
      const qs = new URLSearchParams();
      qs.append("Sector_id", String(Sector_id));

      const [mmRes, stratRes, peRes, recentRes] = await Promise.all([
        fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_market_map?${qs.toString()}`,
          { method: "GET", headers, credentials: "include" }
        ),
        fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_strategic_acquirers?${qs.toString()}`,
          { method: "GET", headers, credentials: "include" }
        ),
        fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_pe_investors?${qs.toString()}`,
          { method: "GET", headers, credentials: "include" }
        ),
        fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_resent_trasnactions?${(() => {
            const q = new URLSearchParams(qs);
            q.set("top_15", "true");
            return q.toString();
          })()}`,
          { method: "GET", headers, credentials: "include" }
        ),
      ]);

      const [mmJson, stratJson, peJson, recentJson] = await Promise.all([
        mmRes.ok ? mmRes.json() : Promise.resolve(null),
        stratRes.ok ? stratRes.json() : Promise.resolve(null),
        peRes.ok ? peRes.json() : Promise.resolve(null),
        recentRes.ok ? recentRes.json() : Promise.resolve(null),
      ]);

      setSplitMarketMapRaw(mmJson);
      setSplitStrategicRaw(stratJson);
      setSplitPERaw(peJson);
      setSplitRecentRaw(recentJson);

      // split datasets loaded (no console)
    } catch {
      // ignore
    }
  }, [sectorId]);

  // Fetch All Companies via generic companies endpoint filtered by primary sector id
  const fetchAllCompaniesForSector = useCallback(
    async (page: number = 1) => {
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
        params.append("Min_linkedin_members", "0");
        params.append("Max_linkedin_members", "0");
        params.append("Horizontals_ids", "");
        params.append("Primary_sectors_ids[]", String(Sector_id));
        // Apply ownership filter on the server to keep page sizes consistent
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
    [sectorId, ownershipFilter]
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

  useEffect(() => {
    if (sectorId) {
      fetchSectorData();
    }
  }, [fetchSectorData, sectorId]);

  useEffect(() => {
    if (sectorData) {
      fetchCompanies(1);
      // Fire off split dataset fetches in parallel
      fetchSplitDatasets();
    }
  }, [sectorData, fetchCompanies, fetchSplitDatasets]);

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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666" }}>
            Loading sector data...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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

  if (!sectorData) {
    return null;
  }

  // Update page title when sector data is loaded
  if (typeof document !== "undefined") {
    const titleName = (sectorData as { Sector?: { sector_name?: string } })
      ?.Sector?.sector_name;
    if (titleName) {
      document.title = `Asymmetrix – ${titleName}`;
    }
  }

  // Normalize statistics to support both new and legacy API shapes
  const totalsRow: SectorTotalsRow | null = Array.isArray(
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
    (typeof (sectorData as unknown as { Total_number_of_companies?: unknown })
      .Total_number_of_companies === "number"
      ? (sectorData as unknown as { Total_number_of_companies: number })
          .Total_number_of_companies
      : 0);

  // Removed statistics card; keep totals only when needed elsewhere

  // Map optional dashboard datasets from the preferred source (companies API), fallback to sector API
  const preferredSource =
    splitStrategicRaw || splitPERaw || splitMarketMapRaw || splitRecentRaw
      ? {
          // Compose a virtual preferred source from split endpoints where available
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
          // fallback fields from companies API and sector API
          ...((companiesApiPayload as Record<string, unknown> | null) || {}),
          ...((sectorData as unknown as Record<string, unknown> | null) || {}),
        }
      : companiesApiPayload ?? sectorData;
  const recentTransactions: TransactionRecord[] = mapRecentTransactions(
    extractArray(
      (preferredSource as unknown as { resent_trasnactions?: unknown })
        ?.resent_trasnactions ??
        (preferredSource as unknown as { recent_transactions?: unknown })
          ?.recent_transactions ??
        []
    )
  );
  const strategicAcquirers: RankedEntity[] = mapRankedEntities(
    extractArray(
      (preferredSource as unknown as { strategic_acquirers?: unknown })
        ?.strategic_acquirers ?? []
    )
  );
  const peInvestors: RankedEntity[] = mapRankedEntities(
    extractArray(
      (preferredSource as unknown as { pe_investors?: unknown })
        ?.pe_investors ?? []
    )
  );

  const marketMapCompanies: SectorCompany[] = (() => {
    const raw = (preferredSource as unknown as { market_map?: unknown })
      ?.market_map;
    const mapped = mapMarketMapToCompanies(raw);
    return mapped.length > 0 ? mapped : companies;
  })();

  // Comprehensive Transactions Tab Component
  function SectorTransactionsTab({ sectorId }: { sectorId: string }) {
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

    // Loading states
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [loadingSecondarySectors, setLoadingSecondarySectors] =
      useState(false);

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

        // Add event types
        if (filters.deal_types.length > 0) {
          params.append("deal_types", filters.deal_types.join(","));
        }

        // Add deal statuses
        if (filters.Deal_Status.length > 0) {
          params.append("Deal_Status", filters.Deal_Status.join(","));
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

    // Initial data fetch
    useEffect(() => {
      fetchCountries();
      fetchContinentalRegions();
      fetchSubRegions();
      fetchSecondarySectors();
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

    // Handle CSV export
    const handleExportCSV = () => {
      if (corporateEvents.length > 0) {
        CSVExporter.exportCorporateEvents(
          corporateEvents,
          `sector_${sectorId}_transactions`
        );
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
              disabled={loading}
            >
              {loading ? "Exporting..." : "Export CSV"}
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
            <table className="w-full">
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
                  const target = event.target_counterparty?.new_company;
                  const targetCounterpartyId =
                    event.target_counterparty?.new_company_counterparty;
                  const targetName = target?.name || "Not Available";
                  const targetHref = targetCounterpartyId
                    ? `/company/${targetCounterpartyId}`
                    : "";
                  const targetCountry = target?.country || "Not Available";

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

                  return (
                    <tr
                      key={event.id || index}
                      className="border-b border-slate-100"
                    >
                      {/* Event Details */}
                      <td className="p-3 align-top">
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
                      <td className="p-3 align-top">
                        <div className="mb-1 text-xs text-slate-600">
                          <strong>Target:</strong>{" "}
                          {targetHref ? (
                            <a
                              href={targetHref}
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              {targetName}
                            </a>
                          ) : (
                            <span>{targetName}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong>Buyer(s)/Investor(s):</strong>{" "}
                          {Array.isArray(event.other_counterparties) &&
                          event.other_counterparties.length > 0
                            ? event.other_counterparties
                                .filter((cp) =>
                                  /investor|acquirer/i.test(
                                    cp._counterparty_type
                                      ?.counterparty_status || ""
                                  )
                                )
                                .map((cp) => cp._new_company?.name || "Unknown")
                                .join(", ") || "Not Available"
                            : "Not Available"}
                        </div>
                      </td>
                      {/* Deal Details */}
                      <td className="p-3 align-top">
                        <div className="mb-1 text-xs text-slate-600">
                          <strong>Investment Type:</strong>{" "}
                          {event.deal_type ? (
                            <span className="inline-block px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded">
                              {event.deal_type}
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
                      <td className="p-3 align-top">
                        <div className="text-xs text-slate-600">
                          <strong>Advisors:</strong>{" "}
                          {Array.isArray(event.advisors) &&
                          event.advisors.length > 0
                            ? event.advisors.map((advisor, idx) => {
                                const nc = advisor._new_company;
                                const name = nc?.name || "Unknown";
                                const id = nc?.id;
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
                      <td className="p-3 align-top">
                        <div className="text-xs text-slate-600">
                          <strong>Primary:</strong>{" "}
                          {target?.primary_sectors
                            ? Array.isArray(target.primary_sectors) &&
                              target.primary_sectors.length > 0
                              ? target.primary_sectors
                                  .map((s) =>
                                    typeof s === "string"
                                      ? s
                                      : (s as { sector_name?: string })
                                          .sector_name
                                  )
                                  .join(", ")
                              : "Not available"
                            : target?._sectors_primary &&
                              Array.isArray(target._sectors_primary) &&
                              target._sectors_primary.length > 0
                            ? target._sectors_primary
                                .map((s) => s.sector_name)
                                .join(", ")
                            : "Not available"}
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong>Secondary:</strong>{" "}
                          {target?.secondary_sectors
                            ? Array.isArray(target.secondary_sectors) &&
                              target.secondary_sectors.length > 0
                              ? target.secondary_sectors
                                  .map((s) =>
                                    typeof s === "string"
                                      ? s
                                      : (s as { sector_name?: string })
                                          .sector_name
                                  )
                                  .join(", ")
                              : "Not available"
                            : target?._sectors_secondary &&
                              Array.isArray(target._sectors_secondary) &&
                              target._sectors_secondary.length > 0
                            ? target._sectors_secondary
                                .map((s) => s.sector_name)
                                .join(", ")
                            : "Not available"}
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

    // Fetch content types
    useEffect(() => {
      const run = async () => {
        try {
          const token = localStorage.getItem("asymmetrix_auth_token");
          if (!token) return;
          const resp = await fetch(
            "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/content_types_for_articles",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (!resp.ok) return;
          const data = (await resp.json()) as Array<{
            Content_Content_Type1: string;
          }>;
          const values = Array.from(
            new Set(
              (Array.isArray(data) ? data : [])
                .map((d) => (d?.Content_Content_Type1 || "").trim())
                .filter(Boolean)
            )
          );
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
      const allSectors = sectors.flat().map((s) => s.sector_name);
      return allSectors.join(", ");
    };

    const formatCompanies = (
      companies: ContentArticle["companies_mentioned"] | undefined
    ) => {
      if (!companies || companies.length === 0) return "Not available";
      return companies.map((c) => c.name).join(", ");
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
          <div className="p-3 mb-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Results are pre-filtered by the current
              sector
            </p>
          </div>

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
                  {(sectorData as { Sector?: { sector_name?: string } })?.Sector
                    ?.sector_name || "Sector"}
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
            {/* Top Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectorThesisCard sectorData={sectorData} />
              <RecentTransactionsCard transactions={recentTransactions} />
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MostActiveTableCard
                title="Most Active Strategic Acquirers"
                items={strategicAcquirers}
                accent="blue"
                badgeLabel="Strategic Acquirer"
                mostRecentHeader="Most Recent Acquisition"
                showBadge={false}
              />
              <MostActiveTableCard
                title="Most Active Private Equity Investors"
                items={peInvestors}
                accent="purple"
                badgeLabel="Private Equity"
                mostRecentHeader="Most Recent Investment."
                showBadge={false}
              />
            </div>

            {/* Bottom Row */}
            <MarketMapGrid companies={marketMapCompanies} />

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
                    {pagination.prevPage && (
                      <button
                        className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 hover:bg-blue-50"
                        onClick={() => handlePageChange(pagination.prevPage!)}
                      >
                        ← Previous
                      </button>
                    )}
                    {pagination.nextPage && (
                      <button
                        className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 hover:bg-blue-50"
                        onClick={() => handlePageChange(pagination.nextPage!)}
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {companiesLoading && (
              <div className="text-center text-slate-500">
                Loading companies...
              </div>
            )}
            {!companiesLoading && companies.length === 0 && (
              <div className="text-center text-slate-500">
                No companies found in this sector.
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
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50/80">
                        <tr className="hover:bg-slate-50/80">
                          <th className="py-3 font-semibold text-left text-slate-700 w-[8%]">
                            Logo
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[14%]">
                            Name
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[36%]">
                            Description
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[16%]">
                            Primary Sector(s)
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[12%]">
                            Sectors
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[7%]">
                            LinkedIn Members
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[7%]">
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
                              <td className="py-3 pr-4">
                                <a
                                  href={`/company/${c.id}`}
                                  className="font-medium text-blue-600 underline"
                                >
                                  {c.name}
                                </a>
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {c.description || "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {primaryDisplay.length > 0
                                  ? primaryDisplay.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {Array.isArray(c.secondary_sectors) &&
                                c.secondary_sectors.length > 0
                                  ? c.secondary_sectors.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {typeof c.linkedin_members === "number"
                                  ? c.linkedin_members.toLocaleString()
                                  : "0"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
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
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50/80">
                        <tr className="hover:bg-slate-50/80">
                          <th className="py-3 font-semibold text-left text-slate-700 w-[8%]">
                            Logo
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[14%]">
                            Name
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[36%]">
                            Description
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[16%]">
                            Primary Sector(s)
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[12%]">
                            Sectors
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[7%]">
                            LinkedIn Members
                          </th>
                          <th className="py-3 font-semibold text-left text-slate-700 w-[7%]">
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
                              <td className="py-3 pr-4">
                                <a
                                  href={`/company/${c.id}`}
                                  className="font-medium text-blue-600 underline"
                                >
                                  {c.name}
                                </a>
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {c.description || "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {primaryDisplay.length > 0
                                  ? primaryDisplay.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {Array.isArray(c.secondary_sectors) &&
                                c.secondary_sectors.length > 0
                                  ? c.secondary_sectors.join(", ")
                                  : "N/A"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {typeof c.linkedin_members === "number"
                                  ? c.linkedin_members.toLocaleString()
                                  : "0"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
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

const SectorPage = () => {
  return <SectorDetailPage />;
};

export default SectorPage;
