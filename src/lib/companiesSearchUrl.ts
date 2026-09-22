import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";
import { createFilterInstanceKey } from "@/components/companies/CompaniesFilterBar";
import { COMPANIES_TRANSACTION_STATUS_FILTER_OPTIONS } from "@/components/companies/companiesFilterConfig";

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

  return { search };
}

export function readCompaniesUrlBootstrap(): CompaniesUrlBootstrap | null {
  if (typeof window === "undefined") return null;
  return parseCompaniesUrlBootstrap(new URLSearchParams(window.location.search));
}
