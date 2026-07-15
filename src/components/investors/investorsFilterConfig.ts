import type { FilterCategory, FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  buildColumnLinkedFilterDefs,
  EXTRA_FILTER_DEFS,
} from "./investorsColumnFilterMap";

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

export interface InvestorTypeOption {
  id: number;
  sector_name?: string;
  name?: string;
  investor_type?: string;
}

export type InvestorTypeTab =
  | "all"
  | "accelerator"
  | "asset_management"
  | "family_office"
  | "hedge_fund"
  | "private_equity"
  | "sovereign_wealth"
  | "venture_capital";

export type InvestorsTypeCounts = {
  totalCount: number;
  acceleratorCount: number;
  assetManagementCount: number;
  familyOfficeCount: number;
  hedgeFundCount: number;
  privateEquityCount: number;
  sovereignWealthCount: number;
  ventureCapitalCount: number;
};

export const EMPTY_INVESTOR_TYPE_COUNTS: InvestorsTypeCounts = {
  totalCount: 0,
  acceleratorCount: 0,
  assetManagementCount: 0,
  familyOfficeCount: 0,
  hedgeFundCount: 0,
  privateEquityCount: 0,
  sovereignWealthCount: 0,
  ventureCapitalCount: 0,
};

export const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "hq", name: "HQ of Portfolio Companies" },
  { id: "sectors", name: "Sector Invested In" },
  { id: "investor_type", name: "Investor Type" },
  { id: "portfolio", name: "Portfolio" },
];

export const INVESTOR_TYPE_TAB_ORDER: Exclude<InvestorTypeTab, "all">[] = [
  "accelerator",
  "asset_management",
  "family_office",
  "hedge_fund",
  "private_equity",
  "sovereign_wealth",
  "venture_capital",
];

export const INVESTOR_TYPE_TAB_CONFIG: Record<
  Exclude<InvestorTypeTab, "all">,
  {
    label: string;
    dot: string;
    countKey: keyof InvestorsTypeCounts;
    matchTerms: string[];
  }
> = {
  accelerator: {
    label: "Accelerator",
    dot: "#8b5cf6",
    countKey: "acceleratorCount",
    matchTerms: ["accelerator"],
  },
  asset_management: {
    label: "Asset Management",
    dot: "#0ea5e9",
    countKey: "assetManagementCount",
    matchTerms: ["asset management", "asset manager"],
  },
  family_office: {
    label: "Family Office",
    dot: "#f59e0b",
    countKey: "familyOfficeCount",
    matchTerms: ["family office"],
  },
  hedge_fund: {
    label: "Hedge Fund",
    dot: "#ec4899",
    countKey: "hedgeFundCount",
    matchTerms: ["hedge fund"],
  },
  private_equity: {
    label: "Private Equity",
    dot: "#10b981",
    countKey: "privateEquityCount",
    matchTerms: ["private equity"],
  },
  sovereign_wealth: {
    label: "Sovereign Wealth",
    dot: "#6366f1",
    countKey: "sovereignWealthCount",
    matchTerms: ["sovereign wealth"],
  },
  venture_capital: {
    label: "Venture Capital",
    dot: "#14b8a6",
    countKey: "ventureCapitalCount",
    matchTerms: ["venture capital"],
  },
};

export function getInvestorTypeLabel(type: InvestorTypeOption): string {
  return (
    type.sector_name ||
    type.name ||
    type.investor_type ||
    String(type.id)
  ).trim();
}

export function matchInvestorTypeTab(
  label: string,
  tab: Exclude<InvestorTypeTab, "all">
): boolean {
  const normalized = label.toLowerCase();
  return INVESTOR_TYPE_TAB_CONFIG[tab].matchTerms.some((term) =>
    normalized.includes(term)
  );
}

export function getInvestorTypeIdsForTab(
  tab: Exclude<InvestorTypeTab, "all">,
  investorTypes: InvestorTypeOption[]
): number[] {
  return investorTypes
    .filter((type) => matchInvestorTypeTab(getInvestorTypeLabel(type), tab))
    .map((type) => type.id);
}

export function buildInvestorsFilterDefs({
  continentalRegions,
  subRegions,
  countries,
  provinces,
  cities,
  primarySectors,
  secondarySectors,
  investorTypes,
}: {
  continentalRegions: string[];
  subRegions: string[];
  countries: Country[];
  provinces: Province[];
  cities: City[];
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
  investorTypes: InvestorTypeOption[];
}): FilterDef[] {
  const overrides: Record<string, Partial<FilterDef>> = {
    region: { options: continentalRegions },
    sub_region: { options: subRegions },
    country: { options: countries.map((c) => c.locations_Country) },
    state: { options: provinces.map((p) => p.State__Province__County) },
    city: { options: cities.map((c) => c.City) },
    primary_sector: { options: primarySectors.map((s) => s.sector_name) },
    secondary_sector: { options: secondarySectors.map((s) => s.sector_name) },
    investor_type: {
      options: investorTypes.map((type) => getInvestorTypeLabel(type)),
    },
    portfolio_companies: {
      min: 0,
      max: 10000,
      presets: [
        ["1–5", 1, 5],
        ["6–20", 6, 20],
        ["21–50", 21, 50],
        ["50+", 51, 10000],
      ],
    },
    total_investments: {
      min: 0,
      max: 10000,
      presets: [
        ["1–5", 1, 5],
        ["6–20", 6, 20],
        ["21–50", 21, 50],
        ["50+", 51, 10000],
      ],
    },
    linkedin_members: {
      min: 0,
      max: 100000,
      presets: [
        ["<100", 0, 99],
        ["100–999", 100, 999],
        ["1k–9.9k", 1000, 9999],
        ["10k+", 10000, 100000],
      ],
    },
    years_since_inv: {
      unit: "yrs",
      min: 0,
      max: 20,
      presets: [
        ["< 1 year", 0, 0.99],
        ["1–3 years", 1, 3],
        ["3+ years", 3, 20],
      ],
    },
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

export function mapSummaryToInvestorTypeCounts(
  summary: Record<string, unknown> | undefined,
  totalCount: number
): InvestorsTypeCounts {
  const read = (key: string) => {
    const value = summary?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };

  return {
    totalCount,
    acceleratorCount: read("acceleratorCount"),
    assetManagementCount: read("assetManagementCount"),
    familyOfficeCount: read("familyOfficeCount"),
    hedgeFundCount: read("hedgeFundCount"),
    privateEquityCount: read("privateEquityCount"),
    sovereignWealthCount: read("sovereignWealthCount"),
    ventureCapitalCount: read("ventureCapitalCount"),
  };
}