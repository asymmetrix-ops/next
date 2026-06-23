import type { FilterBarState, FilterCombineLogic, FilterItem } from "@/components/companies/CompaniesFilterBar";
import type { InvestorTypeTab } from "@/components/investors/investorsFilterConfig";
import {
  getInvestorTypeIdsForTab,
  getInvestorTypeLabel,
  type InvestorTypeOption,
} from "@/components/investors/investorsFilterConfig";
import {
  buildInvestorSearchPayloadFromClauses,
  investorSearchPayloadToRequestBody,
  investorSearchPayloadToSearchParams,
  type InvestorFilterClause,
  type InvestorSearchPayload,
} from "@/lib/investorFilterBuilder";

export type InvestorsSearchFilters = InvestorSearchPayload;

type SectorRef = { id: number; sector_name: string };

function combineOp(
  item: FilterItem,
  hasPriorClause: boolean,
  defaultLogic: FilterCombineLogic
): "AND" | "OR" {
  if (!hasPriorClause) return "AND";
  const logic = item.combineLogic ?? defaultLogic;
  return logic === "or" ? "OR" : "AND";
}

function hasRangeValue(value: unknown): value is { min?: number; max?: number } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { min?: number; max?: number };
  return rv.min !== undefined || rv.max !== undefined;
}

function resolveSectorIds(names: string[], sectors: SectorRef[]): number[] {
  const ids = names
    .map((name) => sectors.find((sector) => sector.sector_name === name)?.id)
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

function resolveInvestorTypeIds(
  labels: string[],
  investorTypes: InvestorTypeOption[]
): number[] {
  const ids = labels
    .map((label) =>
      investorTypes.find((type) => getInvestorTypeLabel(type) === label)?.id
    )
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

export const createDefaultInvestorFilters = (): InvestorsSearchFilters =>
  investorSearchPayloadToRequestBody({
    filters_sql: "",
    geo_filter_sql: "",
    PC_Primary_ids_str: "",
    PC_Secondary_ids_str: "",
    page: 1,
    per_page: 50,
    portfolio_only: false,
  });

export function buildInvestorsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  investorTypes: InvestorTypeOption[];
  investorTypeTab?: InvestorTypeTab;
  applyInvestorTypeTabFilter?: boolean;
  investorTypeIds?: number[];
  page?: number;
  perPage?: number;
}): InvestorsSearchFilters {
  const {
    state,
    primarySectors,
    secondarySectors,
    investorTypes,
    investorTypeTab = "all",
    applyInvestorTypeTabFilter = true,
    investorTypeIds,
    page = 1,
    perPage = 50,
  } = args;

  const clauses: InvestorFilterClause[] = [];
  let hasPriorClause = false;
  let portfolioOnly = false;
  let primarySectorIds: number[] = [];
  let secondarySectorIds: number[] = [];

  const pushClause = (clause: InvestorFilterClause) => {
    clauses.push(clause);
    hasPriorClause = true;
  };

  const searchText = state.searchText?.trim();
  if (searchText) {
    pushClause({
      id: "search-text",
      type: "name_search",
      value: { value: searchText },
      op: "AND",
    });
  }

  for (const item of state.filters) {
    const v = item.value;
    if (v == null) continue;

    const op = combineOp(item, hasPriorClause, state.filterLogic);

    if (item.id === "region" && Array.isArray(v) && v.length > 0) {
      pushClause({
        id: item.key,
        type: "continental_region",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "sub_region" && Array.isArray(v) && v.length > 0) {
      pushClause({
        id: item.key,
        type: "sub_region",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "country" && Array.isArray(v) && v.length > 0) {
      pushClause({
        id: item.key,
        type: "country",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "state" && Array.isArray(v) && v.length > 0) {
      pushClause({
        id: item.key,
        type: "province",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "city" && Array.isArray(v) && v.length > 0) {
      pushClause({
        id: item.key,
        type: "city",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "primary_sector" && Array.isArray(v) && v.length > 0) {
      primarySectorIds = resolveSectorIds(v as string[], primarySectors);
      continue;
    }
    if (item.id === "secondary_sector" && Array.isArray(v) && v.length > 0) {
      secondarySectorIds = resolveSectorIds(v as string[], secondarySectors);
      continue;
    }
    if (item.id === "investor_type" && Array.isArray(v) && v.length > 0) {
      const ids = resolveInvestorTypeIds(v as string[], investorTypes);
      if (ids.length > 0) {
        pushClause({
          id: item.key,
          type: "investor_type_ids",
          value: { value: ids },
          op,
        });
      }
      continue;
    }
    if (item.id === "portfolio_companies" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "portfolio_companies_count",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "years_since_inv" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "years_since_investment",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "followed" && v === true) {
      portfolioOnly = true;
      continue;
    }
  }

  if (applyInvestorTypeTabFilter) {
    const tabIds =
      investorTypeIds ??
      (investorTypeTab !== "all"
        ? getInvestorTypeIdsForTab(investorTypeTab, investorTypes)
        : []);
    if (tabIds.length > 0) {
      pushClause({
        id: "investor-type-tab",
        type: "investor_type_ids",
        value: { value: tabIds },
        op: hasPriorClause ? "AND" : "AND",
      });
    }
  }

  return investorSearchPayloadToRequestBody(
    buildInvestorSearchPayloadFromClauses(clauses, {
      page,
      perPage,
      portfolioOnly,
      primarySectorIds,
      secondarySectorIds,
    })
  );
}

export { investorSearchPayloadToRequestBody, investorSearchPayloadToSearchParams };
