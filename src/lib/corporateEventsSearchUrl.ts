import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";
import {
  parseListUrlFilters,
  type ListUrlSpec,
} from "@/lib/listUrlFilters";

/** Filters AsymmIQ (and any deep link) may set on Corporate Events via `f.<id>` URL params. */
export const CORPORATE_EVENTS_URL_SPEC: ListUrlSpec = {
  filters: {
    deal_type: "enum[]",
    deal_status: "enum[]",
    buyer_investor_type: "enum[]",
    funding_stage: "enum[]",
    region: "enum[]",
    sub_region: "enum[]",
    country: "enum[]",
    state: "enum[]",
    city: "enum[]",
    primary_sector: "enum[]",
    secondary_sector: "enum[]",
    product_type: "enum[]",
    announcement_date: "dateRange",
    investment_amount: "range",
    enterprise_value: "range",
  },
  sortKeys: [],
};

export type CorporateEventsUrlBootstrap = {
  filterBarState: FilterBarState;
};

export function parseCorporateEventsUrlBootstrap(
  params: URLSearchParams
): CorporateEventsUrlBootstrap | null {
  const parsed = parseListUrlFilters(params, CORPORATE_EVENTS_URL_SPEC);
  if (parsed.rejected.length > 0) {
    console.warn("[corporate events url] ignored params:", parsed.rejected);
  }
  return parsed.filterBarState ? { filterBarState: parsed.filterBarState } : null;
}
