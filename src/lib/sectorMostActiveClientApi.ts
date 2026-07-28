import type { AdvisorListItem } from "@/app/advisors/actions";
import type { InvestorListItem } from "@/app/investors/actions";
import type { Company } from "@/components/companies/CompanySection";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { ADVISORS_API_BASE } from "@/lib/advisorsApiBase";
import {
  advisorSearchPayloadToSearchParams,
  buildAdvisorSearchPayloadFromClauses,
} from "@/lib/advisorFilterBuilder";
import { parseAdvisorSectors } from "@/components/search/searchEntityLinkUtils";

const SECTOR_API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";
const PAGE_SIZE = 25;

export type SectorMostActiveInvestorKind = "pe" | "venture" | "strategic";

export interface SectorPagedResult<T> {
  items: T[];
  curPage: number;
  pageTotal: number;
  itemsTotal: number;
  nextPage: number | null;
  prevPage: number | null;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("asymmetrix_auth_token");
}

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

function getAdvisorPaginationNumber(raw: unknown, key: string): number | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const root = raw as Record<string, unknown>;
  const result1 = getNestedRecord(root, "result1");
  const advisorsCompanies = getNestedRecord(root, "Advisors_companies");
  const value = root[key] ?? result1?.[key] ?? advisorsCompanies?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return undefined;
}

function sectorInvestorEndpoint(kind: SectorMostActiveInvestorKind): string {
  if (kind === "pe") return `${SECTOR_API_BASE}/sectors_pe_investors`;
  if (kind === "venture") return `${SECTOR_API_BASE}/sectors_vc_investors`;
  return `${SECTOR_API_BASE}/sectors_strategic_acquirers`;
}

function mapRankedRow(obj: Record<string, unknown>) {
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
  const count =
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
  const mostRecentTargetRaw = getFirstMatchingValue(obj, [
    "Most_Recent_Target",
    "most_recent_target",
    "Most_Recent_Investment",
    "most_recent_investment",
    "Most_Recent_Acquisition",
    "most_recent_acquisition",
  ]);
  let mostRecentTarget = "";
  if (mostRecentTargetRaw && typeof mostRecentTargetRaw === "object") {
    const targetObj = mostRecentTargetRaw as Record<string, unknown>;
    mostRecentTarget = toStringSafe(
      getFirstMatchingValue(targetObj, [
        "name",
        "company_name",
        "target_name",
        "Target",
        "target",
      ]) || ""
    );
  } else {
    mostRecentTarget = toStringSafe(mostRecentTargetRaw || "");
  }
  const closedDate = toStringSafe(
    getFirstMatchingValue(obj, [
      "Closed_Date",
      "closed_date",
      "date",
      "Announcement_Date",
      "announcement_date",
      "Most_Recent_Announcement_Date",
      "most_recent_announcement_date",
    ]) || ""
  );
  const entityId = getFirstMatchingNumber(obj, [
    "acquirer_company_id",
    "original_new_company_id",
    "new_company_id",
    "acquirer_id",
    "company_id",
    "id",
    "investor_company_id",
    "vc_investor_company_id",
  ]);
  const rawLogo = toStringSafe(
    getFirstMatchingValue(obj, [
      "Acquirer_Logo_Url",
      "Investor_Logo_Url",
      "PE_Investor_Logo_Url",
      "VC_Investor_Logo_Url",
      "logo",
      "logo_url",
      "logoUrl",
      "linkedin_logo",
    ]) || ""
  );
  const logoUrl = resolveCompanyLogoSrc(rawLogo) ?? "";
  const country = toStringSafe(
    getFirstMatchingValue(obj, ["country", "Country", "hq_country"]) || ""
  );

  return {
    name,
    count,
    id: entityId,
    mostRecentTarget,
    closedDate,
    logoUrl,
    country,
  };
}

function mapRankedToInvestors(raw: unknown): InvestorListItem[] {
  return extractArray(raw)
    .map((item) => {
      const mapped = mapRankedRow((item || {}) as Record<string, unknown>);
      if (!mapped.name) return null;
      return {
        original_new_company_id: mapped.id,
        company_name: mapped.name,
        linkedin_logo: mapped.logoUrl || undefined,
        total_investments: mapped.count,
        number_of_active_investments: mapped.count,
        country: mapped.country || undefined,
        last_investment: mapped.closedDate
          ? { display: mapped.closedDate, date: mapped.closedDate }
          : null,
        years_since_last_investment: mapped.closedDate || undefined,
        description: mapped.mostRecentTarget
          ? `Most recent: ${mapped.mostRecentTarget}`
          : undefined,
      } satisfies InvestorListItem;
    })
    .filter(Boolean) as InvestorListItem[];
}

function mapRankedToCompanies(raw: unknown): Company[] {
  return extractArray(raw)
    .map((item) => {
      const mapped = mapRankedRow((item || {}) as Record<string, unknown>);
      if (!mapped.name || !mapped.id) return null;
      const descriptionParts = [
        mapped.count > 0 ? `${mapped.count.toLocaleString()} deals` : "",
        mapped.mostRecentTarget ? `Most recent: ${mapped.mostRecentTarget}` : "",
        mapped.closedDate || "",
      ].filter(Boolean);
      return {
        id: mapped.id,
        name: mapped.name,
        linkedin_logo: mapped.logoUrl || undefined,
        description: descriptionParts.join(" · ") || undefined,
        country: mapped.country || undefined,
      } satisfies Company;
    })
    .filter(Boolean) as Company[];
}

function mapAdvisorListItems(raw: unknown): AdvisorListItem[] {
  return getAdvisorListRoot(raw)
    .map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      const name = toStringSafe(
        getFirstMatchingValue(obj, ["name", "advisor", "Advisor"])
      );
      if (!name) return null;

      const rawLogo = toStringSafe(
        getFirstMatchingValue(obj, ["linkedin_logo", "Linkedin_Logo", "logo_url"]) ||
          ""
      );
      const logoUrl = resolveCompanyLogoSrc(rawLogo) ?? "";
      const sectorsValue = getFirstMatchingValue(obj, [
        "sectors",
        "target_sectors",
        "Target_Sectors",
      ]);
      const sectors = parseAdvisorSectors(sectorsValue).map((sector) => ({
        id: sector.id,
        name: sector.name,
      }));

      return {
        id: getFirstMatchingNumber(obj, ["id", "advisor_id", "company_id"]) ?? 0,
        name,
        country:
          toStringSafe(getFirstMatchingValue(obj, ["country", "Country"]) || "") ||
          undefined,
        events_advised:
          getFirstMatchingNumber(obj, ["events_advised", "events_cnt_sector"]) ?? 0,
        sectors,
        sectors_count:
          getFirstMatchingNumber(obj, ["sectors_count", "sectorsCount"]) ??
          sectors.length,
        linkedin_logo: logoUrl || undefined,
      } satisfies AdvisorListItem;
    })
    .filter(Boolean) as AdvisorListItem[];
}

function buildPagedResult<T>(
  items: T[],
  page: number,
  raw: unknown,
  fallbackTotal?: number
): SectorPagedResult<T> {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const itemsTotal =
    getAdvisorPaginationNumber(raw, "itemsTotal") ??
    (typeof root.total === "number" ? root.total : undefined) ??
    fallbackTotal ??
    items.length;
  const pageTotal =
    getAdvisorPaginationNumber(raw, "pageTotal") ??
    (typeof root.total_pages === "number" ? root.total_pages : undefined) ??
    (itemsTotal > 0 ? Math.ceil(itemsTotal / PAGE_SIZE) : 1);
  const curPage =
    getAdvisorPaginationNumber(raw, "curPage") ?? page;
  const nextPage = curPage < pageTotal ? curPage + 1 : null;
  const prevPage = curPage > 1 ? curPage - 1 : null;

  return {
    items,
    curPage,
    pageTotal: Math.max(1, pageTotal),
    itemsTotal,
    nextPage,
    prevPage,
  };
}

async function fetchSectorRankedPage(
  kind: SectorMostActiveInvestorKind,
  sectorId: number,
  page: number
): Promise<SectorPagedResult<InvestorListItem> | null> {
  const token = getAuthToken();
  if (!token) return null;

  const qs = new URLSearchParams();
  qs.set("Sector_id", String(sectorId));
  qs.set("limit", String(PAGE_SIZE));
  qs.set("offset", String((page - 1) * PAGE_SIZE));

  const resp = await fetch(`${sectorInvestorEndpoint(kind)}?${qs.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  const items = mapRankedToInvestors(data);
  return buildPagedResult(items, page, data);
}

async function fetchSectorStrategicPage(
  sectorId: number,
  page: number
): Promise<SectorPagedResult<Company> | null> {
  const token = getAuthToken();
  if (!token) return null;

  const qs = new URLSearchParams();
  qs.set("Sector_id", String(sectorId));
  qs.set("limit", String(PAGE_SIZE));
  qs.set("offset", String((page - 1) * PAGE_SIZE));

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

  if (!resp.ok) return null;

  const data = await resp.json();
  const items = mapRankedToCompanies(data);
  return buildPagedResult(items, page, data);
}

async function fetchSectorAdvisorsPage(
  sectorId: number,
  page: number,
  sectorImportance?: string
): Promise<SectorPagedResult<AdvisorListItem> | null> {
  const token = getAuthToken();
  if (!token) return null;

  const isSecondarySector = (sectorImportance || "")
    .toLowerCase()
    .includes("secondary");

  const qs = advisorSearchPayloadToSearchParams({
    ...buildAdvisorSearchPayloadFromClauses([], {
      page,
      perPage: PAGE_SIZE,
      portfolioOnly: false,
      primarySectorIds: isSecondarySector ? [] : [sectorId],
      secondarySectorIds: isSecondarySector ? [sectorId] : [],
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

  if (!resp.ok) return null;

  const data = await resp.json();
  const items = mapAdvisorListItems(data);
  return buildPagedResult(items, page, data, items.length);
}

export async function fetchSectorMostActiveInvestors(
  kind: Extract<SectorMostActiveInvestorKind, "pe" | "venture">,
  sectorId: number,
  page: number = 1
): Promise<SectorPagedResult<InvestorListItem> | null> {
  return fetchSectorRankedPage(kind, sectorId, page);
}

export async function fetchSectorMostActiveStrategicAcquirers(
  sectorId: number,
  page: number = 1
): Promise<SectorPagedResult<Company> | null> {
  return fetchSectorStrategicPage(sectorId, page);
}

export async function fetchSectorMostActiveAdvisors(
  sectorId: number,
  page: number = 1,
  sectorImportance?: string
): Promise<SectorPagedResult<AdvisorListItem> | null> {
  return fetchSectorAdvisorsPage(sectorId, page, sectorImportance);
}
