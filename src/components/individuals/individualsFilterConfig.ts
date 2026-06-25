import type { FilterCategory, FilterDef } from "@/components/companies/CompaniesFilterBar";
import type { IndividualsResponse } from "@/types/individuals";
import {
  buildColumnLinkedFilterDefs,
  EXTRA_FILTER_DEFS,
} from "./individualsColumnFilterMap";

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

export interface JobTitleOption {
  id: number;
  job_title: string;
}

export type IndividualsSummaryCounts = {
  totalCount: number;
  currentRoles: number;
  pastRoles: number;
  ceos: number;
  chairs: number;
  founders: number;
};

export const EMPTY_INDIVIDUALS_SUMMARY_COUNTS: IndividualsSummaryCounts = {
  totalCount: 0,
  currentRoles: 0,
  pastRoles: 0,
  ceos: 0,
  chairs: 0,
  founders: 0,
};

export type IndividualRoleTab =
  | "all"
  | "ceos"
  | "current_roles"
  | "chair"
  | "past_roles"
  | "founder";

export const INDIVIDUAL_ROLE_TAB_ORDER: Exclude<IndividualRoleTab, "all">[] = [
  "ceos",
  "current_roles",
  "chair",
  "past_roles",
  "founder",
];

export const INDIVIDUAL_ROLE_TAB_CONFIG: Record<
  Exclude<IndividualRoleTab, "all">,
  {
    label: string;
    dot: string;
    countKey: keyof IndividualsSummaryCounts;
    jobTitleIds?: readonly number[];
    statuses?: readonly string[];
  }
> = {
  ceos: {
    label: "CEOs",
    dot: "#3b82f6",
    countKey: "ceos",
    jobTitleIds: [4],
  },
  current_roles: {
    label: "Current roles",
    dot: "#10b981",
    countKey: "currentRoles",
    statuses: ["Current"],
  },
  chair: {
    label: "Chair",
    dot: "#8b5cf6",
    countKey: "chairs",
    jobTitleIds: [5],
  },
  past_roles: {
    label: "Past roles",
    dot: "#64748b",
    countKey: "pastRoles",
    statuses: ["Past"],
  },
  founder: {
    label: "Founder",
    dot: "#f59e0b",
    countKey: "founders",
    jobTitleIds: [21],
  },
};

export const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "location", name: "Location" },
  { id: "sectors", name: "Sector" },
  { id: "roles", name: "Roles" },
  { id: "portfolio", name: "Portfolio" },
];

export const STATUS_FILTER_OPTIONS = ["Current", "Past"];

export function buildIndividualsFilterDefs({
  continentalRegions,
  subRegions,
  countries,
  provinces,
  cities,
  primarySectors,
  secondarySectors,
  jobTitles,
}: {
  continentalRegions: string[];
  subRegions: string[];
  countries: Country[];
  provinces: Province[];
  cities: City[];
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
  jobTitles: JobTitleOption[];
}): FilterDef[] {
  const overrides: Record<string, Partial<FilterDef>> = {
    region: { options: continentalRegions },
    sub_region: { options: subRegions },
    country: { options: countries.map((c) => c.locations_Country) },
    state: { options: provinces.map((p) => p.State__Province__County) },
    city: { options: cities.map((c) => c.City) },
    primary_sector: { options: primarySectors.map((s) => s.sector_name) },
    secondary_sector: { options: secondarySectors.map((s) => s.sector_name) },
    job_title: { options: jobTitles.map((title) => title.job_title) },
    status: { options: STATUS_FILTER_OPTIONS },
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

export function mapResponseToIndividualsSummaryCounts(
  data: IndividualsResponse | null | undefined
): IndividualsSummaryCounts {
  if (!data) return EMPTY_INDIVIDUALS_SUMMARY_COUNTS;
  return {
    totalCount: data.totalIndividuals || 0,
    currentRoles: data.currentRoles || 0,
    pastRoles: data.pastRoles || 0,
    ceos: data.ceos || 0,
    chairs: data.chairs || 0,
    founders: data.founders || 0,
  };
}
