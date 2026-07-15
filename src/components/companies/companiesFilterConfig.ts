import type { FilterCategory, FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  buildColumnLinkedFilterDefs,
  EXTRA_FILTER_DEFS,
} from "@/components/companies/companiesColumnFilterMap";

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

export interface OwnershipType {
  id: number;
  ownership: string;
}

export type CompaniesOwnershipCounts = {
  totalCount: number;
  publicCompanies: number;
  peOwnedCompanies: number;
  vcOwnedCompanies: number;
  privateCompanies: number;
  subsidiaryCompanies: number;
  acquiredCompanies: number;
  otherCompanies: number;
};

export const EMPTY_OWNERSHIP_COUNTS: CompaniesOwnershipCounts = {
  totalCount: 0,
  publicCompanies: 0,
  peOwnedCompanies: 0,
  vcOwnedCompanies: 0,
  privateCompanies: 0,
  subsidiaryCompanies: 0,
  acquiredCompanies: 0,
  otherCompanies: 0,
};

export const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "lists",        name: "Lists" },
  { id: "location",     name: "Location" },
  { id: "sectors",      name: "Sectors" },
  { id: "company",      name: "Company details" },
  { id: "financial",    name: "Financial metrics" },
  { id: "subscription", name: "Subscription metrics" },
  { id: "other",        name: "Other metrics" },
];

export function buildCompaniesFilterDefs({
  continentalRegions,
  subRegions,
  countries,
  provinces,
  cities,
  primarySectors,
  secondarySectors,
  ownershipTypes,
}: {
  continentalRegions: string[];
  subRegions: string[];
  countries: Country[];
  provinces: Province[];
  cities: City[];
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
  ownershipTypes: OwnershipType[];
}): FilterDef[] {
  const overrides: Record<string, Partial<FilterDef>> = {
    region: { options: continentalRegions },
    sub_region: { options: subRegions },
    country: { options: countries.map((c) => c.locations_Country) },
    state: { options: provinces.map((p) => p.State__Province__County) },
    city: { options: cities.map((c) => c.City) },
    primary_sector: { options: primarySectors.map((s) => s.sector_name) },
    secondary_sector: { options: secondarySectors.map((s) => s.sector_name) },
    ownership: { options: ownershipTypes.map((o) => o.ownership) },
    transaction: {
      options: [
        "Rumoured in Market",
        "Transaction anticipated within 18 months",
        "Reported in Market",
        "Process on Hold",
      ],
    },
    year_founded: {
      min: 1800,
      max: 2030,
      presets: [
        ["Pre-2000", 1800, 1999],
        ["2000–2009", 2000, 2009],
        ["2010–2019", 2010, 2019],
        ["2020+", 2020, 2030],
      ],
    },
    headcount: {
      min: 0,
      max: 100000,
      presets: [
        ["<100", 0, 99],
        ["100–999", 100, 999],
        ["1k–9.9k", 1000, 9999],
        ["10k+", 10000, 100000],
      ],
    },
    headcount_growth: {
      unit: "%",
      min: -50,
      max: 200,
      presets: [
        ["Declining", -50, -1],
        ["0–9%", 0, 9],
        ["10–24%", 10, 24],
        ["25–49%", 25, 49],
        ["50%+", 50, 200],
      ],
    },
    years_since_inv: {
      unit: "yrs",
      min: 0,
      max: 20,
      presets: [
        ["0–2y", 0, 2],
        ["3–5y", 3, 5],
        ["6y+", 6, 20],
      ],
    },
    revenue: {
      unit: "$m",
      min: 0,
      max: 5000,
      presets: [
        ["<$10m", 0, 9],
        ["$10–49m", 10, 49],
        ["$50–99m", 50, 99],
        ["$100–499m", 100, 499],
        ["$500m+", 500, 5000],
      ],
    },
    ebitda: {
      unit: "$m",
      min: -100,
      max: 2000,
      presets: [
        ["Negative", -100, -1],
        ["$0–9m", 0, 9],
        ["$10–49m", 10, 49],
        ["$50–499m", 50, 499],
        ["$500m+", 500, 2000],
      ],
    },
    enterprise_value: {
      unit: "$m",
      min: 0,
      max: 50000,
      presets: [
        ["<$100m", 0, 99],
        ["$100–999m", 100, 999],
        ["$1–9.9b", 1000, 9999],
        ["$10b+", 10000, 50000],
      ],
    },
    rev_growth: {
      unit: "%",
      min: -50,
      max: 200,
      presets: [
        ["<0%", -50, -1],
        ["0–9%", 0, 9],
        ["10–24%", 10, 24],
        ["25–49%", 25, 49],
        ["50%+", 50, 200],
      ],
    },
    ebitda_margin: {
      unit: "%",
      min: -50,
      max: 80,
      presets: [
        ["<0%", -50, -1],
        ["0–19%", 0, 19],
        ["20–29%", 20, 29],
        ["30–39%", 30, 39],
        ["40%+", 40, 80],
      ],
    },
    rev_multiple: {
      unit: "x",
      min: 0,
      max: 30,
      presets: [
        ["<3x", 0, 2],
        ["3–6x", 3, 6],
        ["7x+", 7, 30],
      ],
    },
    rule_40: {
      unit: "%",
      min: 0,
      max: 150,
      presets: [
        ["<40%", 0, 39],
        ["40–59%", 40, 59],
        ["60%+", 60, 150],
      ],
    },
    arr: {
      unit: "$m",
      min: 0,
      max: 5000,
      presets: [
        ["<$10m", 0, 9],
        ["$10–49m", 10, 49],
        ["$50–99m", 50, 99],
        ["$100–499m", 100, 499],
        ["$500m+", 500, 5000],
      ],
    },
    arr_growth: {
      unit: "%",
      min: -20,
      max: 200,
      presets: [
        ["<0%", -20, -1],
        ["0–19%", 0, 19],
        ["20–39%", 20, 39],
        ["40%+", 40, 200],
      ],
    },
    churn: {
      unit: "%",
      min: 0,
      max: 50,
      presets: [
        ["<5%", 0, 4],
        ["5–9%", 5, 9],
        ["10–19%", 10, 19],
        ["20%+", 20, 50],
      ],
    },
    nrr: {
      unit: "%",
      min: 50,
      max: 200,
      presets: [
        ["<100%", 50, 99],
        ["100–109%", 100, 109],
        ["110–119%", 110, 119],
        ["120%+", 120, 200],
      ],
    },
    grr: {
      unit: "%",
      min: 50,
      max: 100,
      presets: [
        ["<90%", 50, 89],
        ["90–94%", 90, 94],
        ["95–99%", 95, 99],
        ["100%", 100, 100],
      ],
    },
    new_client_growth: {
      unit: "%",
      min: -20,
      max: 100,
      presets: [
        ["<0%", -20, -1],
        ["0–9%", 0, 9],
        ["10–24%", 10, 24],
        ["25%+", 25, 100],
      ],
    },
    has_mcp: {
      label: "MCP",
      fullLabel: "MCP",
    },
  };

  const columnLinked = buildColumnLinkedFilterDefs(overrides);
  const columnLinkedIds = new Set(columnLinked.map((def) => def.id));
  const extras: FilterDef[] = EXTRA_FILTER_DEFS.map((extra) => ({
    ...extra,
    ...overrides[extra.id],
  })).filter((def) => !columnLinkedIds.has(def.id));

  return [...extras, ...columnLinked];
}

export const OTHER_OWNERSHIP_TYPES = [
  { id: 6, ownership: "Consortium" },
  { id: 8, ownership: "Foundation" },
  { id: 9, ownership: "Public Benefit Corporation" },
  { id: 10, ownership: "Family Office" },
  { id: 11, ownership: "Not-For-Profit" },
  { id: 12, ownership: "Industry Association" },
  { id: 13, ownership: "Inter-Governmental Organisation" },
  { id: 14, ownership: "University" },
  { id: 15, ownership: "Charity" },
  { id: 16, ownership: "Government" },
  { id: 17, ownership: "Fund" },
  { id: 18, ownership: "Partnership" },
  { id: 20, ownership: "ICO" },
  { id: 21, ownership: "Employee-Owned" },
  { id: 22, ownership: "Closed" },
] as const;

export const OTHER_OWNERSHIP_TYPE_IDS = OTHER_OWNERSHIP_TYPES.map((item) => item.id);

export const OTHER_OWNERSHIP_TOOLTIP_LABELS = OTHER_OWNERSHIP_TYPES.map(
  (item) => item.ownership
)
  .slice()
  .sort((a, b) => a.localeCompare(b));

export const OWNERSHIP_OTHER_TOOLTIP_STYLES = `
  .ownership-tab-other-tooltip-wrap {
    position: relative;
    display: inline-flex;
  }
  .ownership-tab-other-tooltip {
    position: absolute;
    left: 0;
    top: calc(100% + 6px);
    z-index: 60;
    min-width: 220px;
    max-width: 300px;
    padding: 10px 12px;
    background: #1e293b;
    color: #f8fafc;
    border-radius: 8px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.2);
    font-size: 12px;
    line-height: 1.45;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: opacity 0.1s ease, transform 0.1s ease, visibility 0.1s;
  }
  .ownership-tab-other-tooltip-wrap:hover .ownership-tab-other-tooltip,
  .ownership-tab-other-tooltip-wrap:focus-within .ownership-tab-other-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  .ownership-tab-other-tooltip ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ownership-tab-other-tooltip li + li {
    margin-top: 3px;
  }
`;

export type OwnershipTab =
  | "all"
  | "public"
  | "pe"
  | "vc"
  | "private"
  | "subsidiary"
  | "acquired"
  | "other";

export const OWNERSHIP_TAB_CONFIG: Record<
  Exclude<OwnershipTab, "all">,
  {
    label: string;
    dot: string;
    countKey: keyof CompaniesOwnershipCounts;
    ownershipTypeIds: readonly number[];
  }
> = {
  public: {
    label: "Public",
    dot: "#7c3aed",
    countKey: "publicCompanies",
    ownershipTypeIds: [7],
  },
  pe: {
    label: "PE-owned",
    dot: "#0ea5e9",
    countKey: "peOwnedCompanies",
    ownershipTypeIds: [1],
  },
  vc: {
    label: "VC-backed",
    dot: "#10b981",
    countKey: "vcOwnedCompanies",
    ownershipTypeIds: [3],
  },
  private: {
    label: "Private",
    dot: "#f59e0b",
    countKey: "privateCompanies",
    ownershipTypeIds: [2],
  },
  subsidiary: {
    label: "Subsidiary",
    dot: "#6366f1",
    countKey: "subsidiaryCompanies",
    ownershipTypeIds: [5],
  },
  acquired: {
    label: "Acquired",
    dot: "#ec4899",
    countKey: "acquiredCompanies",
    ownershipTypeIds: [4],
  },
  other: {
    label: "Other",
    dot: "#78716c",
    countKey: "otherCompanies",
    ownershipTypeIds: OTHER_OWNERSHIP_TYPE_IDS,
  },
};
