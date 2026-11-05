import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";
import { createFilterInstanceKey } from "@/components/companies/CompaniesFilterBar";
import { COMPANIES_TRANSACTION_STATUS_FILTER_OPTIONS } from "@/components/companies/companiesFilterConfig";
import {
  filterIdsNeedingLookups,
  parseListUrlFilters,
  type ListUrlSpec,
} from "@/lib/listUrlFilters";

/** Filters AsymmIQ (and any deep link) may set on Companies Search via `f.<id>` URL params. */
export const COMPANIES_URL_SPEC: ListUrlSpec = {
  filters: {
    region: "enum[]",
    sub_region: "enum[]",
    country: "enum[]",
    state: "enum[]",
    city: "enum[]",
    primary_sector: "enum[]",
    secondary_sector: "enum[]",
    ownership: "enum[]",
    transaction: "enum[]",
    headcount: "range",
    headcount_growth: "range",
    year_founded: "range",
    years_since_inv: "range",
    revenue: "range",
    ebitda: "range",
    enterprise_value: "range",
    rev_growth: "range",
    ebitda_margin: "range",
  },
  // Server sort keys of get_new_companies_dynamic_sql
  sortKeys: [
    "name",
    "linkedin_members",
    "linkedin_growth",
    "year_founded",
    "created_at",
    "revenue_m",
    "ebitda_m",
    "ev",
    "revenue_growth",
    "ebitda_margin",
    "rule_of_40",
    "arr_m",
  ],
};

/** Filters whose option names (sectors, ownership) need the lookup lists before they can be searched. */
export const COMPANIES_LOOKUP_FILTER_IDS = [
  "primary_sector",
  "secondary_sector",
  "ownership",
] as const;

/** Companies search preset: all transaction-status filter values selected (Deal Radar universe). */
export const COMPANIES_SEARCH_PRESET_DEAL_RADAR = "deal_radar";

export function buildDealRadarTransactionStatusFilterBarState(): FilterBarState {
  return {
    filters: [
      {
        id: "transaction",
        key: createFilterInstanceKey(),
        value: [...COMPANIES_TRANSACTION_STATUS_FILTER_OPTIONS],
      },
    ],
    viewId: null,
    searchText: "",
    filterLogic: "and",
  };
}

export function buildDealRadarCompaniesViewAllHref(): string {
  const params = new URLSearchParams();
  params.set("preset", COMPANIES_SEARCH_PRESET_DEAL_RADAR);
  return `/companies?${params.toString()}`;
}

export type CompaniesUrlBootstrap = {
  search?: string;
  filterBarState?: FilterBarState;
  /** Server sort requested by the URL (`sort=revenue_m:desc`). */
  sort?: { key: string; dir: "asc" | "desc" };
  /** True when sector/ownership names must be resolved to ids before the first search. */
  needsLookups?: boolean;
};

export function parseCompaniesUrlBootstrap(
  params: URLSearchParams
): CompaniesUrlBootstrap {
  const search = params.get("search")?.trim() || undefined;
  const preset = params.get("preset")?.trim();

  if (preset === COMPANIES_SEARCH_PRESET_DEAL_RADAR) {
    return {
      search,
      filterBarState: buildDealRadarTransactionStatusFilterBarState(),
    };
  }

  const parsed = parseListUrlFilters(params, COMPANIES_URL_SPEC);
  if (parsed.rejected.length > 0) {
    console.warn("[companies url] ignored params:", parsed.rejected);
  }
  if (!parsed.filterBarState && !parsed.sort) return { search };

  return {
    search,
    filterBarState: parsed.filterBarState ?? undefined,
    sort: parsed.sort ?? undefined,
    needsLookups:
      filterIdsNeedingLookups(parsed.filterBarState, COMPANIES_LOOKUP_FILTER_IDS)
        .length > 0,
  };
}

export function readCompaniesUrlBootstrap(): CompaniesUrlBootstrap | null {
  if (typeof window === "undefined") return null;
  return parseCompaniesUrlBootstrap(new URLSearchParams(window.location.search));
}
