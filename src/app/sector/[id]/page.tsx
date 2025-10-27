"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
// import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
import {
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

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
  { id: "funding", name: "Funding" },
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
                items.slice(0, 25).map((it) => (
                  <tr
                    key={`${title}-${it.name}`}
                    className={`transition-colors duration-150 hover:bg-slate-50/50 ${
                      it.id ? "cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (it.id) {
                        window.location.href = `/company/${it.id}`;
                      }
                    }}
                  >
                    <td className="py-3 pr-4">
                      {it.id ? (
                        <a
                          href={`/company/${it.id}`}
                          className="flex gap-3 items-center"
                        >
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
                ))
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
        // If ownershipFilter is 'public', filter on the server to keep page sizes consistent
        if (ownershipFilter === "public") {
          params.append("Ownership_types_ids[]", String(1));
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
        // Assuming ownership type id for Public is 1
        params.append("Ownership_types_ids[]", String(1));

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

  function TransactionsGrid({
    transactions,
  }: {
    transactions: TransactionRecord[];
  }) {
    const hasItems = Array.isArray(transactions) && transactions.length > 0;
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
            <span className="text-slate-900">Transactions</span>
          </div>
        </div>
        <div className="px-5 pt-5 pb-6">
          {!hasItems ? (
            <div className="py-10 text-center text-slate-500">
              Not available
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {transactions.slice(0, 60).map((t, idx) => {
                const announcementDate = t.date ? new Date(t.date) : null;
                const valueDisplay = t.value ? `$${t.value}M` : null;
                return (
                  <div
                    key={`tx-card-${idx}`}
                    className="p-4 bg-white rounded-xl border transition-colors duration-150 hover:border-slate-300 border-slate-200"
                  >
                    <div className="flex gap-3 items-center">
                      {t.targetLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.targetLogoUrl}
                          alt={t.target}
                          className="object-contain w-8 h-8 rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            const fallback = (e.target as HTMLImageElement)
                              .nextElementSibling as HTMLElement | null;
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
                            <p className="mt-1 text-xs text-slate-500">
                              {announcementDate.toLocaleDateString(undefined, {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              })}
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-900">
                        {t.buyer || "-"}
                      </p>
                      {valueDisplay && (
                        <p className="mt-1 text-xs text-slate-500">
                          {valueDisplay}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 space-x-2">
                      {t.type && (
                        <span
                          className={`inline-block px-2 py-1 border rounded text-xs ${(() => {
                            const colors: Record<string, string> = {
                              acquisition:
                                "bg-red-50 text-red-700 border-red-200",
                              merger:
                                "bg-blue-50 text-blue-700 border-blue-200",
                              ipo: "bg-green-50 text-green-700 border-green-200",
                              funding_round:
                                "bg-purple-50 text-purple-700 border-purple-200",
                              lbo: "bg-orange-50 text-orange-700 border-orange-200",
                              recapitalization:
                                "bg-pink-50 text-pink-700 border-pink-200",
                            };
                            return (
                              colors[
                                (t.type || "")
                                  .toLowerCase()
                                  .replace(/\s+/g, "_")
                              ] || "bg-gray-50 text-gray-700 border-gray-200"
                            );
                          })()}`}
                        >
                          {t.type.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                <p className="text-sm text-slate-500">
                  Market Intelligence Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
                <span>Market Open</span>
              </div>
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
          <TransactionsGrid
            transactions={mapRecentTransactions(splitRecentRaw)}
          />
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
