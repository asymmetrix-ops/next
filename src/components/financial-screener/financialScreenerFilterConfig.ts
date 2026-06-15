import type { FilterDef } from "@/components/companies/CompaniesFilterBar";
import type {
  Country,
  PrimarySector,
  SecondarySector,
  OwnershipType,
} from "@/components/companies/companiesFilterConfig";
import { buildFinancialScreenerFilterDefsFromColumns } from "./financialScreenerColumnFilterMap";

export type FinancialScreenerOwnershipTab =
  | "all"
  | "public"
  | "pe"
  | "vc"
  | "private";

export interface FinancialScreenerOwnershipCounts {
  totalCount: number;
  publicCompanies: number;
  peOwnedCompanies: number;
  vcOwnedCompanies: number;
  privateCompanies: number;
}

export const EMPTY_FINANCIAL_SCREENER_OWNERSHIP_COUNTS: FinancialScreenerOwnershipCounts =
  {
    totalCount: 0,
    publicCompanies: 0,
    peOwnedCompanies: 0,
    vcOwnedCompanies: 0,
    privateCompanies: 0,
  };

export const FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG: Record<
  Exclude<FinancialScreenerOwnershipTab, "all">,
  {
    label: string;
    countKey: keyof FinancialScreenerOwnershipCounts;
    dot: string;
    apiValue: string;
  }
> = {
  public: {
    label: "Public",
    countKey: "publicCompanies",
    dot: "#8b5cf6",
    apiValue: "Public",
  },
  pe: {
    label: "PE-owned",
    countKey: "peOwnedCompanies",
    dot: "#38bdf8",
    apiValue: "Private Equity",
  },
  vc: {
    label: "VC-owned",
    countKey: "vcOwnedCompanies",
    dot: "#f59e0b",
    apiValue: "Venture Capital",
  },
  private: {
    label: "Private",
    countKey: "privateCompanies",
    dot: "#64748b",
    apiValue: "Private",
  },
};

export const FINANCIAL_SCREENER_FILTER_CATEGORIES = [
  { id: "location", name: "Location" },
  { id: "sectors", name: "Sectors" },
  { id: "company", name: "Company details" },
  { id: "financial", name: "Financial metrics" },
];

export type {
  Country,
  PrimarySector,
  SecondarySector,
  OwnershipType,
};

const FTE_PRESETS: [string, number, number][] = [
  ["≥ 50", 50, Number.MAX_SAFE_INTEGER],
  ["≥ 100", 100, Number.MAX_SAFE_INTEGER],
  ["≥ 250", 250, Number.MAX_SAFE_INTEGER],
  ["≥ 500", 500, Number.MAX_SAFE_INTEGER],
  ["≥ 1,000", 1000, Number.MAX_SAFE_INTEGER],
  ["≥ 5,000", 5000, Number.MAX_SAFE_INTEGER],
];

const REVENUE_PRESETS: [string, number, number][] = [
  ["≥ $10m", 10, Number.MAX_SAFE_INTEGER],
  ["≥ $50m", 50, Number.MAX_SAFE_INTEGER],
  ["≥ $100m", 100, Number.MAX_SAFE_INTEGER],
  ["≥ $500m", 500, Number.MAX_SAFE_INTEGER],
  ["≥ $1b", 1000, Number.MAX_SAFE_INTEGER],
];

const EBITDA_MARGIN_PRESETS: [string, number, number][] = [
  ["≥ 10%", 10, 100],
  ["≥ 20%", 20, 100],
  ["≥ 30%", 30, 100],
  ["≥ 40%", 40, 100],
];

const REV_GROWTH_PRESETS: [string, number, number][] = [
  ["≥ 5%", 5, Number.MAX_SAFE_INTEGER],
  ["≥ 10%", 10, Number.MAX_SAFE_INTEGER],
  ["≥ 20%", 20, Number.MAX_SAFE_INTEGER],
  ["≥ 30%", 30, Number.MAX_SAFE_INTEGER],
];

export function buildFinancialScreenerFilterDefs(args: {
  countries: Country[];
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
  ownershipTypes: OwnershipType[];
}): FilterDef[] {
  const { countries, primarySectors, secondarySectors, ownershipTypes } = args;

  const locationDefs: FilterDef[] = [
    {
      id: "country",
      label: "HQ",
      fullLabel: "HQ country",
      category: "location",
      type: "Aa",
      editor: "enum",
      options: countries.map((c) => c.locations_Country).filter(Boolean),
    },
  ];

  const sectorDefs: FilterDef[] = [
    {
      id: "primary_sector",
      label: "Sector",
      fullLabel: "Primary sector",
      category: "sectors",
      type: "Aa",
      editor: "enum",
      options: primarySectors.map((s) => s.sector_name).filter(Boolean),
    },
    {
      id: "secondary_sector",
      label: "Sub sector",
      fullLabel: "Sub sector",
      category: "sectors",
      type: "Aa",
      editor: "enum",
      options: secondarySectors.map((s) => s.sector_name).filter(Boolean),
    },
  ];

  const companyDefs: FilterDef[] = [
    {
      id: "fte",
      label: "FTE",
      fullLabel: "FTE",
      category: "company",
      type: "#",
      editor: "range",
      min: 0,
      presets: FTE_PRESETS,
    },
    {
      id: "ownership",
      label: "Ownership",
      fullLabel: "Ownership",
      category: "company",
      type: "Aa",
      editor: "enum",
      options: ownershipTypes.map((o) => o.ownership).filter(Boolean),
    },
  ];

  const columnFilterDefs = buildFinancialScreenerFilterDefsFromColumns();
  const overrides: Record<string, Partial<FilterDef>> = {
    revenue: { presets: REVENUE_PRESETS, category: "financial" },
    ebitda: { presets: REVENUE_PRESETS, category: "financial" },
    enterprise_value: { presets: REVENUE_PRESETS, category: "financial" },
    ebit: { presets: REVENUE_PRESETS, category: "financial" },
    ebitda_margin: { presets: EBITDA_MARGIN_PRESETS, category: "financial" },
    rev_growth: { presets: REV_GROWTH_PRESETS, category: "financial" },
    rev_multiple: { category: "financial" },
    ev_revenue: { category: "financial" },
    ev_ebit: { category: "financial" },
    ev_ebitda: { category: "financial" },
    financial_year: { category: "financial", editor: "enum" },
  };

  const financialDefs = columnFilterDefs.map((def) => ({
    ...def,
    ...(overrides[def.id] ?? {}),
  }));

  return [...locationDefs, ...sectorDefs, ...companyDefs, ...financialDefs];
}

export function mapApiCountsToOwnershipCounts(
  counts: Partial<{
    total: number;
    public: number;
    pe_owned: number;
    vc_owned: number;
    private: number;
  }>
): FinancialScreenerOwnershipCounts {
  return {
    totalCount: counts.total ?? 0,
    publicCompanies: counts.public ?? 0,
    peOwnedCompanies: counts.pe_owned ?? 0,
    vcOwnedCompanies: counts.vc_owned ?? 0,
    privateCompanies: counts.private ?? 0,
  };
}
