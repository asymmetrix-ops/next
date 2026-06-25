import type { FilterCategory, FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  buildColumnLinkedFilterDefs,
  EXTRA_FILTER_DEFS,
} from "./advisorsColumnFilterMap";

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

export type AdvisorsRoleCounts = {
  totalCount: number;
  financialAdvisors: number;
  commercialDueDiligence: number;
  vendorDueDiligence: number;
  managementTeamAdvisory: number;
  nomad: number;
};

export const EMPTY_ADVISORS_ROLE_COUNTS: AdvisorsRoleCounts = {
  totalCount: 0,
  financialAdvisors: 0,
  commercialDueDiligence: 0,
  vendorDueDiligence: 0,
  managementTeamAdvisory: 0,
  nomad: 0,
};

export type AdvisorRoleTab =
  | "all"
  | "financial_advisor"
  | "commercial_due_diligence"
  | "vendor_due_diligence"
  | "management_team_advisory"
  | "nomad";

export const ADVISOR_ROLE_TAB_ORDER: Exclude<AdvisorRoleTab, "all">[] = [
  "financial_advisor",
  "commercial_due_diligence",
  "vendor_due_diligence",
  "management_team_advisory",
  "nomad",
];

export const ADVISOR_ROLE_TAB_CONFIG: Record<
  Exclude<AdvisorRoleTab, "all">,
  {
    label: string;
    dot: string;
    countKey: keyof Omit<AdvisorsRoleCounts, "totalCount">;
    roleId: number;
  }
> = {
  financial_advisor: {
    label: "Financial Advisors",
    dot: "#3b82f6",
    countKey: "financialAdvisors",
    roleId: 21,
  },
  commercial_due_diligence: {
    label: "Commercial Due Diligence",
    dot: "#8b5cf6",
    countKey: "commercialDueDiligence",
    roleId: 25,
  },
  vendor_due_diligence: {
    label: "Vendor Due Diligence",
    dot: "#06b6d4",
    countKey: "vendorDueDiligence",
    roleId: 27,
  },
  management_team_advisory: {
    label: "Management Team Advisory",
    dot: "#f59e0b",
    countKey: "managementTeamAdvisory",
    roleId: 28,
  },
  nomad: {
    label: "NOMAD",
    dot: "#10b981",
    countKey: "nomad",
    roleId: 31,
  },
};

export const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "location", name: "Location" },
  { id: "sectors", name: "Sector" },
  { id: "portfolio", name: "Portfolio" },
];

export function buildAdvisorsFilterDefs({
  continentalRegions,
  subRegions,
  countries,
  provinces,
  cities,
  primarySectors,
  secondarySectors,
}: {
  continentalRegions: string[];
  subRegions: string[];
  countries: Country[];
  provinces: Province[];
  cities: City[];
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
}): FilterDef[] {
  const overrides: Record<string, Partial<FilterDef>> = {
    region: { options: continentalRegions },
    sub_region: { options: subRegions },
    country: { options: countries.map((c) => c.locations_Country) },
    state: { options: provinces.map((p) => p.State__Province__County) },
    city: { options: cities.map((c) => c.City) },
    primary_sector: { options: primarySectors.map((s) => s.sector_name) },
    secondary_sector: { options: secondarySectors.map((s) => s.sector_name) },
    corporate_events: {
      min: 0,
      max: 10000,
      presets: [
        ["1–10", 1, 10],
        ["11–50", 11, 50],
        ["51–200", 51, 200],
        ["200+", 200, 10000],
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

export function mapCountsToAdvisorsRoleCounts(
  data: Record<string, unknown> | undefined,
  totalCount = 0
): AdvisorsRoleCounts {
  const read = (key: string) => {
    const direct = data?.[key];
    if (typeof direct === "number" && Number.isFinite(direct)) return direct;
    const nested = (data?.lambda as Record<string, unknown> | undefined)
      ?.companiesByRole as Record<string, unknown> | undefined;
    const nestedVal = nested?.[key];
    return typeof nestedVal === "number" && Number.isFinite(nestedVal)
      ? nestedVal
      : 0;
  };

  const resolvedTotal =
    typeof data?.totalCount === "number" && Number.isFinite(data.totalCount) && data.totalCount > 0
      ? data.totalCount
      : typeof data?.itemsTotal === "number" && Number.isFinite(data.itemsTotal) && data.itemsTotal > 0
        ? data.itemsTotal
        : typeof data?.total_count === "number" && Number.isFinite(data.total_count) && data.total_count > 0
          ? data.total_count
          : totalCount;

  return {
    totalCount: resolvedTotal,
    financialAdvisors: read("financialAdvisors"),
    commercialDueDiligence: read("commercialDueDiligence"),
    vendorDueDiligence: read("vendorDueDiligence"),
    managementTeamAdvisory: read("managementTeamAdvisory"),
    nomad: read("nomad"),
  };
}
