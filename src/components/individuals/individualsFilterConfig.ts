import type { FilterCategory, FilterDef } from "@/components/companies/CompaniesFilterBar";
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
};

export const EMPTY_INDIVIDUALS_SUMMARY_COUNTS: IndividualsSummaryCounts = {
  totalCount: 0,
};

export type IndividualRoleTab =
  | "all"
  | "ceo"
  | "cfo"
  | "partner"
  | "founder"
  | "co_founder"
  | "executive_director"
  | "non_executive_director";

export const INDIVIDUAL_ROLE_TAB_ORDER: Exclude<IndividualRoleTab, "all">[] = [
  "ceo",
  "cfo",
  "partner",
  "founder",
  "co_founder",
  "executive_director",
  "non_executive_director",
];

// Role tabs are resolved by job title NAME against the runtime job-titles
// list (see JobTitleOption / fetchJobTitlesServer) rather than hardcoded ids,
// since the id-per-tab list this replaced was brittle to look up and verify.
export const INDIVIDUAL_ROLE_TAB_CONFIG: Record<
  Exclude<IndividualRoleTab, "all">,
  {
    label: string;
    dot: string;
    jobTitle: string;
  }
> = {
  ceo: { label: "CEO", dot: "#3b82f6", jobTitle: "CEO" },
  cfo: { label: "CFO", dot: "#10b981", jobTitle: "CFO" },
  partner: { label: "Partner", dot: "#8b5cf6", jobTitle: "Partner" },
  founder: { label: "Founder", dot: "#f59e0b", jobTitle: "Founder" },
  co_founder: { label: "Co-Founder", dot: "#ec4899", jobTitle: "Co-Founder" },
  executive_director: {
    label: "Executive Director",
    dot: "#0ea5e9",
    jobTitle: "Executive Director",
  },
  non_executive_director: {
    label: "Non-Executive Director",
    dot: "#64748b",
    jobTitle: "Non-Executive Director",
  },
};

/** Resolve a role tab's job title name to its runtime id (case/whitespace-insensitive). */
export function findJobTitleId(
  jobTitles: JobTitleOption[],
  jobTitleName: string
): number | null {
  const target = jobTitleName.trim().toLowerCase();
  const match = jobTitles.find(
    (title) => title.job_title.trim().toLowerCase() === target
  );
  return match ? match.id : null;
}

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

function readCount(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

/** Map get_individuals_counts API response to a total-count summary. */
export function mapIndividualsCountsResponse(
  raw: Record<string, unknown> | null | undefined
): IndividualsSummaryCounts {
  if (!raw) return EMPTY_INDIVIDUALS_SUMMARY_COUNTS;
  return {
    totalCount: readCount(
      raw,
      "totalIndividuals",
      "total_individuals",
      "totalCount",
      "total_count"
    ),
  };
}
