import type { FilterCategory, FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  buildColumnLinkedFilterDefs,
  EXTRA_FILTER_DEFS,
} from "./corporateEventsColumnFilterMap";

export interface Country {
  locations_Country: string;
}

export interface Province {
  State__Province__County: string;
}

export interface City {
  City: string;
}

export interface PrimarySector {
  id: number;
  sector_name: string;
}

export interface SecondarySector {
  id: number;
  sector_name: string;
}

export type CorporateEventsSummaryStats = {
  totalCount: number;
  acquisitions: number;
  investments: number;
  ipos: number;
  sales: number;
  partnerships: number;
  strategicReviews: number;
  divestments: number;
  other: number;
};

export const EMPTY_CORPORATE_EVENTS_SUMMARY_STATS: CorporateEventsSummaryStats =
  {
    totalCount: 0,
    acquisitions: 0,
    investments: 0,
    ipos: 0,
    sales: 0,
    partnerships: 0,
    strategicReviews: 0,
    divestments: 0,
    other: 0,
  };

export type CorporateEventDealTab =
  | "all"
  | "acquisitions"
  | "investments"
  | "ipos"
  | "sales"
  | "partnerships"
  | "strategic_reviews"
  | "divestments"
  | "other";

export const CORPORATE_EVENT_DEAL_TAB_ORDER: Exclude<
  CorporateEventDealTab,
  "all"
>[] = [
  "acquisitions",
  "investments",
  "ipos",
  "sales",
  "partnerships",
  "strategic_reviews",
  "divestments",
  "other",
];

export const CORPORATE_EVENT_DEAL_TAB_CONFIG: Record<
  Exclude<CorporateEventDealTab, "all">,
  {
    label: string;
    dot: string;
    countKey: keyof Omit<CorporateEventsSummaryStats, "totalCount">;
    dealTypes: readonly string[];
  }
> = {
  acquisitions: {
    label: "Acquisitions",
    dot: "#3b82f6",
    countKey: "acquisitions",
    dealTypes: ["Acquisition"],
  },
  investments: {
    label: "Investments",
    dot: "#10b981",
    countKey: "investments",
    dealTypes: ["Investment"],
  },
  ipos: {
    label: "IPOs",
    dot: "#8b5cf6",
    countKey: "ipos",
    dealTypes: ["IPO"],
  },
  sales: {
    label: "Sales",
    dot: "#f59e0b",
    countKey: "sales",
    dealTypes: ["Sale"],
  },
  partnerships: {
    label: "Partnerships",
    dot: "#06b6d4",
    countKey: "partnerships",
    dealTypes: ["Partnership"],
  },
  strategic_reviews: {
    label: "Strategic Reviews",
    dot: "#6366f1",
    countKey: "strategicReviews",
    dealTypes: ["Strategic Review"],
  },
  divestments: {
    label: "Divestments",
    dot: "#ef4444",
    countKey: "divestments",
    dealTypes: ["Divestment"],
  },
  other: {
    label: "Other",
    dot: "#64748b",
    countKey: "other",
    dealTypes: [
      "MBO",
      "Restructuring",
      "Dual track",
      "Closing",
      "Grant",
      "Debt financing",
    ],
  },
};

export const DEAL_TYPE_OPTIONS = [
  "Acquisition",
  "Sale",
  "IPO",
  "MBO",
  "Investment",
  "Strategic Review",
  "Divestment",
  "Restructuring",
  "Dual track",
  "Closing",
  "Grant",
  "Debt financing",
  "Partnership",
];

export const DEAL_STATUS_OPTIONS = [
  "Completed",
  "In Market",
  "Not yet launched",
  "Strategic Review",
  "Deal Prep",
  "In Exclusivity",
];

export const BUYER_INVESTOR_TYPE_OPTIONS = [
  { value: "private_equity", label: "Private Equity" },
  { value: "venture_capital", label: "Venture Capital" },
  { value: "da_strategic", label: "Data & Analytics Strategic" },
  { value: "other_strategic", label: "Other Strategic" },
];

export const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "event", name: "Event" },
  { id: "location", name: "Location" },
  { id: "sectors", name: "Sector" },
  { id: "portfolio", name: "Portfolio" },
];

export function buildCorporateEventsFilterDefs({
  continentalRegions,
  subRegions,
  countries,
  provinces,
  cities,
  primarySectors,
  secondarySectors,
  fundingStages,
  portfolioEntityOptions = [],
}: {
  continentalRegions: string[];
  subRegions: string[];
  countries: Country[];
  provinces: Province[];
  cities: City[];
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
  fundingStages: string[];
  portfolioEntityOptions?: string[];
}): FilterDef[] {
  const overrides: Record<string, Partial<FilterDef>> = {
    deal_type: { options: DEAL_TYPE_OPTIONS },
    deal_status: { options: DEAL_STATUS_OPTIONS },
    buyer_investor_type: {
      options: BUYER_INVESTOR_TYPE_OPTIONS.map((option) => option.value),
    },
    funding_stage: { options: fundingStages },
    region: { options: continentalRegions },
    sub_region: { options: subRegions },
    country: { options: countries.map((c) => c.locations_Country) },
    state: { options: provinces.map((p) => p.State__Province__County) },
    city: { options: cities.map((c) => c.City) },
    primary_sector: { options: primarySectors.map((s) => s.sector_name) },
    secondary_sector: { options: secondarySectors.map((s) => s.sector_name) },
    portfolio_entity: { options: portfolioEntityOptions },
  };

  const columnLinked = buildColumnLinkedFilterDefs(overrides);
  const columnLinkedIds = new Set(columnLinked.map((def) => def.id));
  const extras: FilterDef[] = EXTRA_FILTER_DEFS.map((extra) => ({
    ...extra,
    ...overrides[extra.id],
  })).filter((def) => !columnLinkedIds.has(def.id));

  const merged = [...columnLinked, ...extras];
  const seen = new Set<string>();
  return merged.filter((def) => {
    if (seen.has(def.id)) return false;
    seen.add(def.id);
    return true;
  });
}

export function mapResponseToCorporateEventsSummaryStats(
  data: {
    itemTotal?: number;
    total_rows?: number;
    acquisitions?: number;
    investments?: number;
    ipos?: number;
    sales?: number;
    partnerships?: number;
    strategic_reviews?: number;
    divestments?: number;
    other?: number;
  },
  fallbackTotal = 0
): CorporateEventsSummaryStats {
  const totalCount =
    typeof data.total_rows === "number" && Number.isFinite(data.total_rows) && data.total_rows > 0
      ? data.total_rows
      : typeof data.itemTotal === "number" && Number.isFinite(data.itemTotal) && data.itemTotal > 0
        ? data.itemTotal
        : fallbackTotal;

  return {
    totalCount,
    acquisitions: data.acquisitions ?? 0,
    investments: data.investments ?? 0,
    ipos: data.ipos ?? 0,
    sales: data.sales ?? 0,
    partnerships: data.partnerships ?? 0,
    strategicReviews: data.strategic_reviews ?? 0,
    divestments: data.divestments ?? 0,
    other: data.other ?? 0,
  };
}

export function mapCorporateEventsCountsResponse(
  data: Record<string, unknown> | undefined
): CorporateEventsSummaryStats {
  return mapResponseToCorporateEventsSummaryStats({
    total_rows:
      typeof data?.total_rows === "number" ? data.total_rows : undefined,
    acquisitions:
      typeof data?.acquisitions === "number" ? data.acquisitions : undefined,
    investments:
      typeof data?.investments === "number" ? data.investments : undefined,
    ipos: typeof data?.ipos === "number" ? data.ipos : undefined,
    sales: typeof data?.sales === "number" ? data.sales : undefined,
    partnerships:
      typeof data?.partnerships === "number" ? data.partnerships : undefined,
    strategic_reviews:
      typeof data?.strategic_reviews === "number"
        ? data.strategic_reviews
        : undefined,
    divestments:
      typeof data?.divestments === "number" ? data.divestments : undefined,
    other: typeof data?.other === "number" ? data.other : undefined,
  });
}
