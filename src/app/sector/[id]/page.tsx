"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// import { locationsService } from "@/lib/locationsService";
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
}

interface RankedEntity {
  name: string;
  count: number;
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
      const buyer = toStringSafe(
        getFirstMatchingValue(obj, [
          "buyer_name",
          "acquirer",
          "buyer",
          "acquirer_name",
          "buyer company",
          "acquirer company",
          "buyer_company",
          "acquirer_company",
        ])
      );
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
      const value = toStringSafe(
        getFirstMatchingValue(obj, [
          "value_usd",
          "value",
          "deal_value",
          "amount",
          "deal size",
          "deal_value_usd",
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
      if (!buyer && !target) return null;
      return { date, buyer, seller, target, value, type } as TransactionRecord;
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
        ])
      );
      const countRaw = getFirstMatchingNumber(obj, [
        "count",
        "deals",
        "total",
        "n",
        "times",
        "occurrences",
      ]);
      const count = typeof countRaw === "number" ? countRaw : 0;
      if (!name) return null;
      return { name, count } as RankedEntity;
    })
    .filter(Boolean) as RankedEntity[];
}

function mapMarketMapToCompanies(raw: unknown): SectorCompany[] {
  if (!raw) return [];
  // Supported shapes:
  // 1) Array of groups: { name/label, companies/items: [{ id, name, linkedin_logo, country, ... }] }
  // 2) Flat array of companies
  // 3) Wrapped arrays: { items: [...] } / { data: [...] } / { results: [...] } / { list: [...] }
  const result: SectorCompany[] = [];
  const arr = Array.isArray(raw)
    ? (raw as Array<unknown>)
    : (extractArray(raw) as Array<unknown>);
  if (Array.isArray(arr)) {
    if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null) {
      const maybeGroup = arr[0] as Record<string, unknown>;
      const hasGroupCompanies =
        Array.isArray(maybeGroup.companies) || Array.isArray(maybeGroup.items);
      if (hasGroupCompanies) {
        for (const group of arr as Array<Record<string, unknown>>) {
          const companiesArr =
            (group.companies as Array<unknown> | undefined) ||
            (group.items as Array<unknown> | undefined) ||
            [];
          for (const cRaw of companiesArr) {
            const c = (cRaw || {}) as Record<string, unknown>;
            const idVal =
              (c.id as number | undefined) ??
              (c as { original_new_company_id?: number })
                .original_new_company_id ??
              0;
            result.push({
              id: typeof idVal === "number" ? idVal : 0,
              name: toStringSafe(c.name ?? c.company_name),
              locations_id: 0,
              url: toStringSafe(c.url),
              sectors: Array.isArray((c as { sectors?: string[] }).sectors)
                ? ((c as { sectors?: string[] }).sectors as string[])
                : [],
              primary_sectors: Array.isArray(
                (c as { primary_sectors?: string[] }).primary_sectors
              )
                ? ((c as { primary_sectors?: string[] })
                    .primary_sectors as string[])
                : [],
              description: toStringSafe(c.description),
              linkedin_employee:
                (c as { linkedin_employee?: number }).linkedin_employee ??
                (c as { linkedin_members?: number }).linkedin_members ??
                0,
              linkedin_employee_latest:
                (c as { linkedin_employee_latest?: number })
                  .linkedin_employee_latest ??
                (c as { linkedin_employee?: number }).linkedin_employee ??
                0,
              linkedin_employee_old:
                (c as { linkedin_employee_old?: number })
                  .linkedin_employee_old ??
                (c as { linkedin_members_old?: number }).linkedin_members_old ??
                0,
              linkedin_logo: toStringSafe(c.linkedin_logo),
              country: toStringSafe(c.country),
              ownership_type_id:
                (c as { ownership_type_id?: number }).ownership_type_id ?? 0,
              ownership: toStringSafe(c.ownership),
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
            });
          }
        }
        return result;
      }
      // Else treat as flat array of companies
    }
    for (const cRaw of arr) {
      const c = (cRaw || {}) as Record<string, unknown>;
      const idVal =
        (c.id as number | undefined) ??
        (c as { original_new_company_id?: number }).original_new_company_id ??
        0;
      result.push({
        id: typeof idVal === "number" ? idVal : 0,
        name: toStringSafe(c.name ?? c.company_name),
        locations_id: 0,
        url: toStringSafe(c.url),
        sectors: Array.isArray((c as { sectors?: string[] }).sectors)
          ? ((c as { sectors?: string[] }).sectors as string[])
          : [],
        primary_sectors: Array.isArray(
          (c as { primary_sectors?: string[] }).primary_sectors
        )
          ? ((c as { primary_sectors?: string[] }).primary_sectors as string[])
          : [],
        description: toStringSafe(c.description),
        linkedin_employee:
          (c as { linkedin_employee?: number }).linkedin_employee ??
          (c as { linkedin_members?: number }).linkedin_members ??
          0,
        linkedin_employee_latest:
          (c as { linkedin_employee_latest?: number })
            .linkedin_employee_latest ??
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
        ownership: toStringSafe(c.ownership),
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
      });
    }
  }
  return result;
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
              onClick={() => setActiveTab(tab.id)}
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

function RankedListCard({
  title,
  items,
}: {
  title: string;
  items: RankedEntity[];
}) {
  const hasItems = Array.isArray(items) && items.length > 0;
  return (
    <div className="h-full bg-white rounded-xl border shadow-lg border-slate-200/60">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="font-semibold text-slate-900">{title}</div>
      </div>
      <div className="px-5 py-4">
        {!hasItems ? (
          <div className="text-sm text-slate-500">Not available</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.slice(0, 10).map((it) => (
              <li
                key={`${title}-${it.name}`}
                className="flex justify-between items-center py-2"
              >
                <span className="pr-3 text-sm truncate text-slate-800">
                  {it.name}
                </span>
                <span className="px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded-full border border-blue-200">
                  {formatNumber(it.count)}
                </span>
              </li>
            ))}
          </ul>
        )}
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
  return (
    <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="font-semibold text-slate-900">Recent Transactions</div>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        {!hasItems ? (
          <div className="text-sm text-slate-500">Not available</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Buyer</th>
                <th className="py-2 pr-4 font-medium">Target</th>
                <th className="py-2 pr-4 font-medium">Value</th>
                <th className="py-2 pr-4 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 10).map((t, idx) => (
                <tr key={`tx-${idx}`} className="text-slate-800">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {t.date || "-"}
                  </td>
                  <td className="py-2 pr-4">{t.buyer || "-"}</td>
                  <td className="py-2 pr-4">{t.target || "-"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {t.value || "-"}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {t.type || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MarketMapGrid({ companies }: { companies: SectorCompany[] }) {
  return (
    <div className="p-5 bg-white rounded-xl border shadow-lg border-slate-200/60">
      <div className="mb-4 font-semibold text-slate-900">Market Map</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {companies.map((c) => (
          <a
            key={c.id}
            href={`/company/${c.id}`}
            className="p-3 rounded-lg border transition-colors group border-slate-200 hover:border-blue-300"
          >
            <div className="flex gap-3 items-center">
              <div className="flex overflow-hidden justify-center items-center w-12 h-10 rounded bg-slate-100">
                {c.linkedin_logo ? (
                  <Image
                    src={`data:image/jpeg;base64,${c.linkedin_logo}`}
                    alt={`${c.name} logo`}
                    width={48}
                    height={40}
                    className="object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">No Logo</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-blue-700 truncate group-hover:underline">
                  {c.name}
                </div>
                <div className="text-xs truncate text-slate-500">
                  {c.country || "N/A"}
                </div>
              </div>
            </div>
          </a>
        ))}
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
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [debugResponse, setDebugResponse] = useState<string>("");
  const [debugSectorResponse, setDebugSectorResponse] = useState<string>("");
  const [companiesApiPayload, setCompaniesApiPayload] = useState<unknown>(null);
  // Split datasets fetched from dedicated endpoints
  const [splitStrategicRaw, setSplitStrategicRaw] = useState<unknown>(null);
  const [splitPERaw, setSplitPERaw] = useState<unknown>(null);
  const [splitMarketMapRaw, setSplitMarketMapRaw] = useState<unknown>(null);

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
      // Store full sector response for on-page debugging
      try {
        setDebugSectorResponse(JSON.stringify(data, null, 2));
      } catch {
        // ignore stringify errors
      }
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

        // Parse and log full response for debugging in browser console
        const rawJson = await response.json();
        console.log("[Sector] Get_Sector_s_new_companies response", {
          url,
          params: Object.fromEntries(params.entries()),
          json: rawJson,
        });

        // Store response for display on page
        setDebugResponse(JSON.stringify(rawJson, null, 2));
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

      const [mmRes, stratRes, peRes] = await Promise.all([
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
      ]);

      const [mmJson, stratJson, peJson] = await Promise.all([
        mmRes.ok ? mmRes.json() : Promise.resolve(null),
        stratRes.ok ? stratRes.json() : Promise.resolve(null),
        peRes.ok ? peRes.json() : Promise.resolve(null),
      ]);

      setSplitMarketMapRaw(mmJson);
      setSplitStrategicRaw(stratJson);
      setSplitPERaw(peJson);

      console.log("[Sector] Split datasets loaded", {
        market_map: mmJson,
        strategic_acquirers: stratJson,
        pe_investors: peJson,
      });
    } catch (e) {
      console.warn("[Sector] Failed to load split datasets", e);
    }
  }, [sectorId]);

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

  const handlePageChange = useCallback(
    (page: number) => {
      fetchCompanies(page);
    },
    [fetchCompanies]
  );

  // Console debug for specific dashboard sections (prefer companies API payload if present)
  useEffect(() => {
    const source =
      splitStrategicRaw || splitPERaw || splitMarketMapRaw
        ? {
            ...(splitStrategicRaw
              ? { strategic_acquirers: splitStrategicRaw as unknown }
              : {}),
            ...(splitPERaw ? { pe_investors: splitPERaw as unknown } : {}),
            ...(splitMarketMapRaw
              ? { market_map: splitMarketMapRaw as unknown }
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

      console.log("[Sector] Raw – recent transactions (preferred):", rawRecent);
      console.log(
        "[Sector] Raw – strategic acquirers (preferred):",
        rawStrategic
      );
      console.log("[Sector] Raw – PE investors (preferred):", rawPE);
      console.log("[Sector] Raw – market map (preferred):", rawMarketMap);

      const mappedRecent = mapRecentTransactions(extractArray(rawRecent ?? []));
      const mappedStrategic = mapRankedEntities(
        extractArray(rawStrategic ?? [])
      );
      const mappedPE = mapRankedEntities(extractArray(rawPE ?? []));
      const mappedMarket = mapMarketMapToCompanies(rawMarketMap);

      console.log("[Sector] Mapped – recentTransactions:", mappedRecent);
      console.log("[Sector] Mapped – strategicAcquirers:", mappedStrategic);
      console.log("[Sector] Mapped – peInvestors:", mappedPE);
      console.log("[Sector] Mapped – marketMapCompanies:", {
        count: mappedMarket.length || companies.length,
        sample: (mappedMarket.length ? mappedMarket : companies).slice(0, 8),
      });
    } catch (e) {
      console.warn("[Sector] Debug logging failed:", e);
    }
  }, [
    companiesApiPayload,
    sectorData,
    companies,
    splitStrategicRaw,
    splitPERaw,
    splitMarketMapRaw,
  ]);

  // Link navigation is handled via anchors in the new layout

  // (Removed generatePaginationButtons; simplified pagination in new layout)

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
  if (typeof document !== "undefined" && sectorData?.Sector?.sector_name) {
    document.title = `Asymmetrix – ${sectorData.Sector.sector_name}`;
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

  const publicCompaniesStat =
    sectorData.Number_Of_Public_Companies ?? totalsRow?.Number_of_Public ?? 0;
  const peCompaniesStat =
    sectorData.Number_Of_PE_Companies ?? totalsRow?.Number_of_PE ?? 0;
  const vcOwnedCompaniesStat =
    sectorData["Number_of_VC-owned_companies"] ?? totalsRow?.Number_of_VC ?? 0;
  const privateCompaniesStat =
    sectorData.Number_of_private_companies ?? totalsRow?.Number_of_Private ?? 0;
  const subsidiariesStat =
    sectorData.Number_of_subsidiaries ??
    totalsRow?.Number_of_Subsidiaries_Acquired ??
    0;

  // Map optional dashboard datasets from the preferred source (companies API), fallback to sector API
  const preferredSource =
    splitStrategicRaw || splitPERaw || splitMarketMapRaw
      ? {
          // Compose a virtual preferred source from split endpoints where available
          ...(splitStrategicRaw
            ? { strategic_acquirers: splitStrategicRaw as unknown }
            : {}),
          ...(splitPERaw ? { pe_investors: splitPERaw as unknown } : {}),
          ...(splitMarketMapRaw
            ? { market_map: splitMarketMapRaw as unknown }
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

  const marketMapCompanies: SectorCompany[] = ((): SectorCompany[] => {
    const raw = (preferredSource as unknown as { market_map?: unknown })
      ?.market_map;
    const mapped = mapMarketMapToCompanies(raw);
    return mapped.length > 0 ? mapped : companies;
  })();

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
                  {sectorData.Sector.sector_name}
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

        {activeTab !== "overview" ? (
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
        ) : (
          <div className="space-y-8">
            {/* Top Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Stats card */}
              <div className="p-5 bg-white rounded-xl border shadow-lg border-slate-200/60">
                <div className="mb-4 font-semibold text-slate-900">
                  Sector Statistics
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Total companies</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(totalCompaniesStat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Public companies</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(publicCompaniesStat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">PE companies</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(peCompaniesStat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">VC-owned companies</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(vcOwnedCompaniesStat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Private companies</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(privateCompaniesStat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Subsidiaries</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(subsidiariesStat)}
                    </span>
                  </div>
                </div>
              </div>

              <SectorThesisCard sectorData={sectorData} />
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RankedListCard
                title="Most Active Strategic Acquirers"
                items={strategicAcquirers}
              />
              <RankedListCard
                title="Most Active Private Equity Investors"
                items={peInvestors}
              />
            </div>

            {/* Bottom Row */}
            <MarketMapGrid companies={marketMapCompanies} />

            {/* Recent Transactions */}
            <RecentTransactionsCard transactions={recentTransactions} />

            {/* Debug Response Display */}
            {debugResponse && (
              <div className="p-5 bg-white rounded-xl border shadow-lg border-slate-200/60">
                <div className="mb-4 font-semibold text-slate-900">
                  API Response Debug (Get_Sector_s_new_companies)
                </div>
                <pre className="overflow-x-auto overflow-y-auto p-4 max-h-96 text-xs rounded-lg bg-slate-50">
                  {debugResponse}
                </pre>
              </div>
            )}

            {/* Debug Sector Response Display */}
            {debugSectorResponse && (
              <div className="p-5 bg-white rounded-xl border shadow-lg border-slate-200/60">
                <div className="mb-4 font-semibold text-slate-900">
                  API Response Debug (Get_Sector)
                </div>
                <pre className="overflow-x-auto overflow-y-auto p-4 max-h-96 text-xs rounded-lg bg-slate-50">
                  {debugSectorResponse}
                </pre>
              </div>
            )}

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
