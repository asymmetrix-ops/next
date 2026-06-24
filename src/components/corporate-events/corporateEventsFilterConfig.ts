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
};

export const EMPTY_CORPORATE_EVENTS_SUMMARY_STATS: CorporateEventsSummaryStats =
  {
    totalCount: 0,
    acquisitions: 0,
    investments: 0,
    ipos: 0,
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
    acquisitions?: number;
    investments?: number;
    ipos?: number;
  },
  fallbackTotal = 0
): CorporateEventsSummaryStats {
  return {
    totalCount:
      typeof data.itemTotal === "number" && Number.isFinite(data.itemTotal)
        ? data.itemTotal
        : fallbackTotal,
    acquisitions: data.acquisitions ?? 0,
    investments: data.investments ?? 0,
    ipos: data.ipos ?? 0,
  };
}
