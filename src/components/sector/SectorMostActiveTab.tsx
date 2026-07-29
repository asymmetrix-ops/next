"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import { SEARCH_MULTI_VALUE_STYLES } from "@/components/search/SearchEntityMultiValueCell";
import {
  parseAdvisedEntities,
  parseAdvisorSectors,
  type AdvisedEntityRef,
} from "@/components/search/searchEntityLinkUtils";
import { AdvisedEntitiesList } from "@/components/advisors/AdvisedEntitiesList";
import { ADVISORS_API_BASE } from "@/lib/advisorsApiBase";
import {
  advisorSearchPayloadToSearchParams,
  buildAdvisorSearchPayloadFromClauses,
} from "@/lib/advisorFilterBuilder";
import {
  type RankedEntity,
  mapRankedEntities,
  renderMostRecentTargetValue,
  extractArray,
  toStringSafe,
  getFirstMatchingValue,
  getFirstMatchingNumber,
} from "@/lib/sectorMostActiveRanked";

const SECTOR_API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";

export const MOST_ACTIVE_SUB_TABS = [
  { id: "strategics", label: "Strategic Acquirers" },
  { id: "pe", label: "PE Investors" },
  { id: "venture", label: "Venture Investors" },
  { id: "advisors", label: "Advisors" },
] as const;

export type MostActiveSubTabId = (typeof MOST_ACTIVE_SUB_TABS)[number]["id"];

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

interface AdvisorEntity {
  name: string;
  totalDealsAdvised: number;
  id?: number;
  country?: string;
  sectors: Array<{ id: number; name: string }>;
  sectorsCount?: number;
  advisedEntities: AdvisedEntityRef[];
  advisedEntitiesCount?: number;
  logoUrl?: string;
}

function MostActiveSubTabNav({
  active,
  onChange,
}: {
  active: MostActiveSubTabId;
  onChange: (id: MostActiveSubTabId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
      {MOST_ACTIVE_SUB_TABS.map((st) => (
        <button
          key={st.id}
          onClick={() => onChange(st.id)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 whitespace-nowrap ${
            active === st.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {st.label}
        </button>
      ))}
    </div>
  );
}

function MostActiveFullTable({
  items,
  accent,
  columnOneLabel,
  mostRecentHeader,
}: {
  items: RankedEntity[];
  accent: "blue" | "purple" | "green";
  columnOneLabel: string;
  mostRecentHeader: string;
}) {
  const accentMap = {
    blue: {
      gradient: "from-blue-500 to-indigo-500",
      countBg: "bg-blue-50 text-blue-700",
    },
    purple: {
      gradient: "from-purple-500 to-pink-500",
      countBg: "bg-purple-50 text-purple-700",
    },
    green: {
      gradient: "from-emerald-500 to-teal-500",
      countBg: "bg-emerald-50 text-emerald-700",
    },
  };
  const cls = accentMap[accent];
  const isInvestorTable = accent !== "blue";

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <BuildingOfficeIcon className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-500 text-sm">No data available yet</p>
      </div>
    );
  }

  return (
    <>
      <style>{SEARCH_TABLE_STYLES}</style>
      <div className="company-section company-section-embedded sector-most-active-section">
        <div className="company-table-scroll">
          <table className="company-table">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="py-3 px-4 text-left font-semibold text-slate-600 w-10">#</th>
            <th className="py-3 px-4 text-left font-semibold text-slate-600">{columnOneLabel}</th>
            <th className="py-3 px-4 text-center font-semibold text-slate-600 w-24">Deals</th>
            <th className="py-3 px-4 text-left font-semibold text-slate-600">{mostRecentHeader}</th>
            <th className="py-3 px-4 text-left font-semibold text-slate-600 w-36">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((it, i) => {
            const linkUrl = isInvestorTable
              ? `/investors/${it.id}`
              : `/company/${it.id}`;
            return (
              <tr
                key={`${it.name}-${i}`}
                className={`hover:bg-slate-50/60 transition-colors duration-100 ${it.id ? "cursor-pointer" : ""}`}
                onClick={() => { if (it.id) window.location.href = linkUrl; }}
              >
                <td className="py-3 px-4 text-slate-400 font-medium">{i + 1}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {it.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.logoUrl}
                        alt={it.name}
                        className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = "none";
                          const fb = t.nextElementSibling as HTMLElement | null;
                          if (fb) fb.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`${it.logoUrl ? "hidden" : "flex"} justify-center items-center w-8 h-8 rounded-lg text-white bg-gradient-to-br flex-shrink-0 ${cls.gradient}`}
                    >
                      <BuildingOfficeIcon className="w-4 h-4" />
                    </div>
                    {it.id ? (
                      <a
                        href={linkUrl}
                        className="font-medium text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {it.name}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-900">{it.name}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${cls.countBg}`}
                  >
                    {formatNumber(it.count)}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                  {renderMostRecentTargetValue(it)}
                </td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                  {it.closedDate || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AdvisorsFullTable({ items }: { items: AdvisorEntity[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <BuildingOfficeIcon className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-500 text-sm font-medium">No advisor data available yet</p>
        <p className="text-slate-400 text-xs mt-1 max-w-sm">
          Data will appear here when Corporate Events with advisors are available for this sector.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{SEARCH_MULTI_VALUE_STYLES}</style>
      <div className="company-section company-section-embedded sector-most-active-section">
        <div className="company-table-scroll">
          <table className="company-table">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-3 px-4 text-left font-semibold text-slate-600 w-10">#</th>
              <th className="py-3 px-4 text-left font-semibold text-slate-600 w-16">Logo</th>
              <th className="py-3 px-4 text-left font-semibold text-slate-600">Advisor Name</th>
              <th className="py-3 px-4 text-left font-semibold text-slate-600">Country</th>
              <th className="py-3 px-4 text-center font-semibold text-slate-600 w-48">
                Total No. Deals Advised
              </th>
              <th className="py-3 px-4 text-left font-semibold text-slate-600">
                Companies Advised
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, i) => {
              const linkUrl = it.id ? `/advisor/${it.id}` : undefined;
              return (
                <tr
                  key={`${it.name}-${i}`}
                  className="hover:bg-slate-50/60 transition-colors duration-100"
                >
                  <td className="py-3 px-4 text-slate-400 font-medium">{i + 1}</td>
                  <td className="py-3 px-4">
                    {it.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.logoUrl}
                        alt={it.name}
                        className="w-8 h-8 rounded-lg object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex justify-center items-center w-8 h-8 rounded-lg text-white bg-gradient-to-br from-amber-500 to-orange-500 flex-shrink-0">
                        <BuildingOfficeIcon className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {linkUrl ? (
                      <a href={linkUrl} className="font-medium text-blue-600 hover:underline">
                        {it.name}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-900">{it.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {it.country || "-"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold bg-amber-50 text-amber-700">
                      {formatNumber(it.totalDealsAdvised)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-[360px]">
                    <AdvisedEntitiesList items={it.advisedEntities} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const MOST_ACTIVE_SUB_TAB_CONFIG: Record<
  MostActiveSubTabId,
  { title: string; description: string }
> = {
  strategics: {
    title: "Most Active Strategic Acquirers",
    description:
      "Companies that have made the most acquisitions within this sector, ranked by deal count.",
  },
  pe: {
    title: "Most Active Private Equity Investors",
    description:
      "Private equity firms that have been most active in investing within this sector.",
  },
  venture: {
    title: "Most Active Venture Investors",
    description:
      "Venture capital firms (Financial Services / Venture Capital) most active in this sector.",
  },
  advisors: {
    title: "Most Active Advisors",
    description:
      "Advisory firms that have advised on the most transactions where this sector is the primary sector. All-time.",
  },
};

interface MostActivePagedState {
  items: RankedEntity[];
  currentPage: number;
  totalPages: number;
  total: number;
  loading: boolean;
}

interface MostActiveAdvisorsPagedState {
  items: AdvisorEntity[];
  currentPage: number;
  totalPages: number;
  total: number;
  loading: boolean;
}

const MOST_ACTIVE_INITIAL_STATE: MostActivePagedState = {
  items: [],
  currentPage: 1,
  totalPages: 1,
  total: 0,
  loading: false,
};

const MOST_ACTIVE_ADVISORS_INITIAL_STATE: MostActiveAdvisorsPagedState = {
  items: [],
  currentPage: 1,
  totalPages: 1,
  total: 0,
  loading: false,
};

function MostActivePagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getNestedRecord(
  raw: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const value = raw[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getAdvisorListRoot(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const result1 = getNestedRecord(root, "result1");
  const advisorsCompanies = getNestedRecord(root, "Advisors_companies");
  return extractArray(
    root.items
      ? { items: root.items }
      : result1?.items
      ? { items: result1.items }
      : advisorsCompanies?.items
      ? { items: advisorsCompanies.items }
      : raw
  );
}

function getAdvisorPaginationNumber(
  raw: unknown,
  key: string
): number | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const root = raw as Record<string, unknown>;
  const result1 = getNestedRecord(root, "result1");
  const advisorsCompanies = getNestedRecord(root, "Advisors_companies");
  const value = root[key] ?? result1?.[key] ?? advisorsCompanies?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return undefined;
}

function mapAdvisorEntities(raw: unknown): AdvisorEntity[] {
  const arr = getAdvisorListRoot(raw);
  return arr
    .map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      const name = toStringSafe(getFirstMatchingValue(obj, ["name", "advisor", "Advisor"]));
      if (!name) return null;

      const rawLogo = toStringSafe(
        getFirstMatchingValue(obj, ["linkedin_logo", "Linkedin_Logo", "logo_url"]) || ""
      );
      const logoUrl = resolveCompanyLogoSrc(rawLogo) ?? "";

      const sectorsValue = getFirstMatchingValue(obj, [
        "sectors",
        "target_sectors",
        "Target_Sectors",
      ]);
      const sectors = parseAdvisorSectors(sectorsValue);
      const sectorsCount =
        getFirstMatchingNumber(obj, ["sectors_count", "sectorsCount"]) ??
        sectors.length;

      const advisedEntitiesValue = getFirstMatchingValue(obj, [
        "advised_entities",
        "advisedEntities",
      ]);
      const advisedEntities = parseAdvisedEntities(advisedEntitiesValue);
      const advisedEntitiesCount =
        getFirstMatchingNumber(obj, [
          "advised_entities_count",
          "advisedEntitiesCount",
        ]) ?? advisedEntities.length;

      return {
        id: getFirstMatchingNumber(obj, ["id", "advisor_id", "company_id"]),
        name,
        country: toStringSafe(getFirstMatchingValue(obj, ["country", "Country"]) || "") || undefined,
        totalDealsAdvised:
          getFirstMatchingNumber(obj, ["events_advised", "events_cnt_sector"]) ?? 0,
        sectors,
        sectorsCount,
        advisedEntities,
        advisedEntitiesCount,
        logoUrl: logoUrl || undefined,
      } as AdvisorEntity;
    })
    .filter(Boolean) as AdvisorEntity[];
}

export function SectorMostActiveTab({
  sectorId,
  sectorImportance,
  activeSubTab,
  setActiveSubTab,
}: {
  sectorId: string;
  sectorImportance?: string;
  activeSubTab: MostActiveSubTabId;
  setActiveSubTab: (id: MostActiveSubTabId) => void;
}) {
  const [strategicsState, setStrategicsState] = useState<MostActivePagedState>(
    MOST_ACTIVE_INITIAL_STATE
  );
  const [peState, setPeState] = useState<MostActivePagedState>(
    MOST_ACTIVE_INITIAL_STATE
  );
  const [vcState, setVcState] = useState<MostActivePagedState>(
    MOST_ACTIVE_INITIAL_STATE
  );
  const [advisorsState, setAdvisorsState] =
    useState<MostActiveAdvisorsPagedState>(MOST_ACTIVE_ADVISORS_INITIAL_STATE);

  const fetchStrategics = useCallback(
    async (page: number) => {
      setStrategicsState((prev) => ({ ...prev, loading: true }));
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        if (!token) {
          setStrategicsState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const sectorIdNum = Number(sectorId);
        if (Number.isNaN(sectorIdNum)) {
          setStrategicsState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const qs = new URLSearchParams();
        qs.set("Sector_id", String(sectorIdNum));
        qs.set("limit", "25");
        qs.set("offset", String((page - 1) * 25));

        const resp = await fetch(
          `${SECTOR_API_BASE}/sectors_strategic_acquirers?${qs.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!resp.ok) {
          setStrategicsState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const data = await resp.json() as {
          items?: unknown[];
          total?: number;
          total_pages?: number;
        };
        const items = extractArray(data);
        setStrategicsState({
          items: mapRankedEntities(items),
          currentPage: page,
          totalPages: data.total_pages ?? 1,
          total: data.total ?? items.length,
          loading: false,
        });
      } catch {
        setStrategicsState((prev) => ({ ...prev, loading: false }));
      }
    },
    [sectorId]
  );

  const fetchPEInvestors = useCallback(
    async (page: number) => {
      setPeState((prev) => ({ ...prev, loading: true }));
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        if (!token) {
          setPeState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const sectorIdNum = Number(sectorId);
        if (Number.isNaN(sectorIdNum)) {
          setPeState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const qs = new URLSearchParams();
        qs.set("Sector_id", String(sectorIdNum));
        qs.set("limit", "25");
        qs.set("offset", String((page - 1) * 25));

        const resp = await fetch(
          `${SECTOR_API_BASE}/sectors_pe_investors?${qs.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!resp.ok) {
          setPeState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const data = await resp.json() as {
          items?: unknown[];
          total?: number;
          total_pages?: number;
        };
        const items = extractArray(data);
        setPeState({
          items: mapRankedEntities(items),
          currentPage: page,
          totalPages: data.total_pages ?? 1,
          total: data.total ?? items.length,
          loading: false,
        });
      } catch {
        setPeState((prev) => ({ ...prev, loading: false }));
      }
    },
    [sectorId]
  );

  const fetchVCInvestors = useCallback(
    async (page: number) => {
      setVcState((prev) => ({ ...prev, loading: true }));
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        if (!token) {
          setVcState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const sectorIdNum = Number(sectorId);
        if (Number.isNaN(sectorIdNum)) {
          setVcState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const qs = new URLSearchParams();
        qs.set("Sector_id", String(sectorIdNum));
        qs.set("limit", "25");
        qs.set("offset", String((page - 1) * 25));

        const resp = await fetch(
          `${SECTOR_API_BASE}/sectors_vc_investors?${qs.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!resp.ok) {
          setVcState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const data = await resp.json() as {
          items?: unknown[];
          total?: number;
          total_pages?: number;
        };
        const items = extractArray(data);
        setVcState({
          items: mapRankedEntities(items),
          currentPage: page,
          totalPages: data.total_pages ?? 1,
          total: data.total ?? items.length,
          loading: false,
        });
      } catch {
        setVcState((prev) => ({ ...prev, loading: false }));
      }
    },
    [sectorId]
  );

  const fetchAdvisors = useCallback(
    async (page: number) => {
      setAdvisorsState((prev) => ({ ...prev, loading: true }));
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        if (!token) {
          setAdvisorsState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const sectorIdNum = Number(sectorId);
        if (Number.isNaN(sectorIdNum)) {
          setAdvisorsState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const isSecondarySector = (sectorImportance || "")
          .toLowerCase()
          .includes("secondary");
        const qs = advisorSearchPayloadToSearchParams({
          ...buildAdvisorSearchPayloadFromClauses([], {
            page,
            perPage: 25,
            portfolioOnly: false,
            primarySectorIds: isSecondarySector ? [] : [sectorIdNum],
            secondarySectorIds: isSecondarySector ? [sectorIdNum] : [],
            endpoint: "sql_advisors_list",
          }),
          include_sectors: true,
        });

        const resp = await fetch(
          `${ADVISORS_API_BASE}/get_all_advisors_list?${qs.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!resp.ok) {
          setAdvisorsState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const data = await resp.json();
        const items = mapAdvisorEntities(data);
        const total = getAdvisorPaginationNumber(data, "itemsTotal") ?? items.length;
        const totalPages =
          getAdvisorPaginationNumber(data, "pageTotal") ??
          (total > 0 ? Math.ceil(total / 25) : 1);

        setAdvisorsState({
          items,
          currentPage: getAdvisorPaginationNumber(data, "curPage") ?? page,
          totalPages: Math.max(1, totalPages),
          total,
          loading: false,
        });
      } catch {
        setAdvisorsState((prev) => ({ ...prev, loading: false }));
      }
    },
    [sectorId, sectorImportance]
  );

  // Fetch on first activation and whenever sectorId changes
  useEffect(() => {
    if (activeSubTab === "strategics") {
      fetchStrategics(1);
    } else if (activeSubTab === "pe") {
      fetchPEInvestors(1);
    } else if (activeSubTab === "venture") {
      fetchVCInvestors(1);
    } else if (activeSubTab === "advisors") {
      fetchAdvisors(1);
    }
  }, [
    activeSubTab,
    sectorId,
    fetchAdvisors,
    fetchPEInvestors,
    fetchStrategics,
    fetchVCInvestors,
  ]);

  const config = MOST_ACTIVE_SUB_TAB_CONFIG[activeSubTab];

  const renderSkeleton = () => (
    <div className="space-y-3 py-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="w-6 h-4 bg-slate-200 rounded" />
          <div className="w-8 h-8 bg-slate-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 h-4 bg-slate-200 rounded" />
          <div className="w-10 h-8 bg-slate-200 rounded-full" />
          <div className="w-32 h-4 bg-slate-200 rounded" />
          <div className="w-20 h-4 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <MostActiveSubTabNav active={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                activeSubTab === "strategics"
                  ? "bg-blue-50"
                  : activeSubTab === "pe"
                  ? "bg-purple-50"
                  : activeSubTab === "venture"
                  ? "bg-emerald-50"
                  : "bg-amber-50"
              }`}
            >
              <BuildingOfficeIcon
                className={`w-4 h-4 ${
                  activeSubTab === "strategics"
                    ? "text-blue-600"
                    : activeSubTab === "pe"
                    ? "text-purple-600"
                    : activeSubTab === "venture"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">{config.title}</h3>
            {((activeSubTab === "strategics" && strategicsState.total > 0) ||
              (activeSubTab === "pe" && peState.total > 0) ||
              (activeSubTab === "venture" && vcState.total > 0) ||
              (activeSubTab === "advisors" && advisorsState.total > 0)) && (
              <span className="ml-auto text-sm text-slate-500 tabular-nums">
                {activeSubTab === "strategics"
                  ? strategicsState.total
                  : activeSubTab === "pe"
                  ? peState.total
                  : activeSubTab === "venture"
                  ? vcState.total
                  : advisorsState.total} total
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 ml-11">{config.description}</p>
        </div>

        <div className="px-6 py-4">
          {activeSubTab === "strategics" && (
            <>
              {strategicsState.loading ? (
                renderSkeleton()
              ) : (
                <>
                  <MostActiveFullTable
                    items={strategicsState.items}
                    accent="blue"
                    columnOneLabel="Acquirer"
                    mostRecentHeader="Most Recent Acquisition"
                  />
                  <MostActivePagination
                    currentPage={strategicsState.currentPage}
                    totalPages={strategicsState.totalPages}
                    onPageChange={fetchStrategics}
                  />
                </>
              )}
            </>
          )}
          {activeSubTab === "pe" && (
            <>
              {peState.loading ? (
                renderSkeleton()
              ) : (
                <>
                  <MostActiveFullTable
                    items={peState.items}
                    accent="purple"
                    columnOneLabel="Investor"
                    mostRecentHeader="Most Recent Investment"
                  />
                  <MostActivePagination
                    currentPage={peState.currentPage}
                    totalPages={peState.totalPages}
                    onPageChange={fetchPEInvestors}
                  />
                </>
              )}
            </>
          )}
          {activeSubTab === "venture" && (
            <>
              {vcState.loading ? (
                renderSkeleton()
              ) : (
                <>
                  <MostActiveFullTable
                    items={vcState.items}
                    accent="green"
                    columnOneLabel="Investor"
                    mostRecentHeader="Most Recent Investment"
                  />
                  <MostActivePagination
                    currentPage={vcState.currentPage}
                    totalPages={vcState.totalPages}
                    onPageChange={fetchVCInvestors}
                  />
                </>
              )}
            </>
          )}
          {activeSubTab === "advisors" && (
            <>
              {advisorsState.loading ? (
                renderSkeleton()
              ) : (
                <>
                  <AdvisorsFullTable items={advisorsState.items} />
                  <MostActivePagination
                    currentPage={advisorsState.currentPage}
                    totalPages={advisorsState.totalPages}
                    onPageChange={fetchAdvisors}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
