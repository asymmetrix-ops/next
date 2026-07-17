import type { FilterBarState, FilterCombineLogic, FilterItem } from "@/components/companies/CompaniesFilterBar";
import {
  advisorCountsPayloadToSearchParams,
  advisorSearchPayloadToRequestBody,
  advisorSearchPayloadToSearchParams,
  buildAdvisorSearchPayloadFromClauses,
  type AdvisorFilterClause,
  type AdvisorSearchPayload,
} from "@/lib/advisorFilterBuilder";

export type AdvisorsSearchFilters = AdvisorSearchPayload;

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

function buildClausesFromFilterBar(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
}): {
  clauses: AdvisorFilterClause[];
  portfolioOnly: boolean;
  primarySectorIds: number[];
  secondarySectorIds: number[];
} {
  const { state, primarySectors, secondarySectors } = args;
  const clauses: AdvisorFilterClause[] = [];
  let hasPriorClause = false;
  let portfolioOnly = false;
  let primarySectorIds: number[] = [];
  let secondarySectorIds: number[] = [];

  const pushClause = (clause: AdvisorFilterClause) => {
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
    if (item.id === "corporate_events" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "corporate_events_count",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "linkedin_members" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "linkedin_members_count",
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

  return { clauses, portfolioOnly, primarySectorIds, secondarySectorIds };
}

export const createDefaultAdvisorFilters = (): AdvisorsSearchFilters =>
  advisorSearchPayloadToRequestBody({
    filters_sql: "",
    events_loc_filter_sql: "",
    Primary_ids_str: "",
    Secondary_ids_str: "",
    advisor_role_ids_str: "",
    need_geo_count: "0",
    need_sector_count: "0",
    page: 1,
    per_page: 25,
    portfolio_only: false,
    include_sectors: true,
  });

export function buildAdvisorsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  page?: number;
  perPage?: number;
  advisorRoleId?: number;
}): AdvisorsSearchFilters {
  const {
    state,
    primarySectors,
    secondarySectors,
    page = 1,
    perPage = 25,
    advisorRoleId,
  } = args;
  const { clauses, portfolioOnly, primarySectorIds, secondarySectorIds } =
    buildClausesFromFilterBar({ state, primarySectors, secondarySectors });

  const payload = advisorSearchPayloadToRequestBody(
    buildAdvisorSearchPayloadFromClauses(clauses, {
      page,
      perPage,
      portfolioOnly,
      primarySectorIds,
      secondarySectorIds,
      needGeoCount: false,
      needSectorCount: false,
      endpoint: "sql_advisors_list",
    })
  );

  return {
    ...payload,
    advisor_role_ids_str:
      advisorRoleId != null && advisorRoleId > 0 ? String(advisorRoleId) : "",
  };
}

export function buildAdvisorsCountsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  page?: number;
  perPage?: number;
}): AdvisorsSearchFilters {
  const { state, primarySectors, secondarySectors, page = 1, perPage = 25 } = args;
  const { clauses, portfolioOnly, primarySectorIds, secondarySectorIds } =
    buildClausesFromFilterBar({ state, primarySectors, secondarySectors });

  return advisorSearchPayloadToRequestBody(
    buildAdvisorSearchPayloadFromClauses(clauses, {
      page,
      perPage,
      portfolioOnly,
      primarySectorIds,
      secondarySectorIds,
      needGeoCount: true,
      needSectorCount: true,
      endpoint: "sql_advisors_counts",
    })
  );
}

export function advisorsFiltersToSearchParams(
  filters: AdvisorsSearchFilters
): URLSearchParams {
  return advisorSearchPayloadToSearchParams(
    advisorSearchPayloadToRequestBody({
      ...filters,
      page: Math.max(1, filters.page || 1),
      per_page: filters.per_page > 0 ? filters.per_page : 25,
    })
  );
}

export function advisorsCountsFiltersToSearchParams(
  filters: AdvisorsSearchFilters
): URLSearchParams {
  return advisorCountsPayloadToSearchParams(
    advisorSearchPayloadToRequestBody({
      ...filters,
      page: 1,
      need_geo_count: "1",
      need_sector_count: "1",
    })
  );
}

export {
  advisorCountsPayloadToSearchParams,
  advisorSearchPayloadToRequestBody,
  advisorSearchPayloadToSearchParams,
};
