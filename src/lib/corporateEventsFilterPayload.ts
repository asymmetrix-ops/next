import type {
  FilterBarState,
  FilterCombineLogic,
  FilterItem,
} from "@/components/companies/CompaniesFilterBar";
import type {
  BuyerInvestorType,
  CorporateEventsFilters,
} from "@/types/corporateEvents";

export type CorporateEventsSearchFilters = CorporateEventsFilters;

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

function hasDateRangeValue(
  value: unknown
): value is { from?: string; to?: string } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { from?: string; to?: string };
  return Boolean(rv.from || rv.to);
}

function resolveSectorIds(names: string[], sectors: SectorRef[]): number[] {
  const ids = names
    .map((name) => sectors.find((sector) => sector.sector_name === name)?.id)
    .filter((id): id is number => id != null);
  return Array.from(new Set(ids));
}

function parsePortfolioEntityValues(values: string[]): {
  filter_advisor_ids: number[];
  filter_company_ids: number[];
  filter_investor_ids: number[];
  filter_sector_ids: number[];
  filter_individual_ids: number[];
} {
  const result = {
    filter_advisor_ids: [] as number[],
    filter_company_ids: [] as number[],
    filter_investor_ids: [] as number[],
    filter_sector_ids: [] as number[],
    filter_individual_ids: [] as number[],
  };

  for (const rawValue of values) {
    const value = rawValue.includes("|")
      ? rawValue.split("|")[1] ?? rawValue
      : rawValue;
    const dashIdx = value.indexOf("-");
    if (dashIdx === -1) continue;
    const entityType = value.slice(0, dashIdx);
    const id = Number(value.slice(dashIdx + 1));
    if (!Number.isFinite(id)) continue;

    if (entityType === "advisor") result.filter_advisor_ids.push(id);
    else if (entityType === "company") result.filter_company_ids.push(id);
    else if (entityType === "investor") result.filter_investor_ids.push(id);
    else if (entityType === "sector") result.filter_sector_ids.push(id);
    else if (entityType === "individual") result.filter_individual_ids.push(id);
  }

  return result;
}

function buildFiltersFromFilterBar(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  userId?: number | null;
  page?: number;
  perPage?: number;
}): CorporateEventsSearchFilters {
  const { state, primarySectors, secondarySectors, userId = null, page = 1, perPage = 50 } =
    args;

  const filters: CorporateEventsSearchFilters = {
    Countries: [],
    Provinces: [],
    Cities: [],
    continentalRegions: [],
    subRegions: [],
    primary_sectors_ids: [],
    Secondary_sectors_ids: [],
    deal_types: [],
    Deal_Status: [],
    Funding_stage: [],
    Buyer_Investor_Types: [],
    Date_start: null,
    Date_end: null,
    search_query: state.searchText?.trim() || "",
    Page: page,
    Per_page: perPage,
    show_followed: false,
    user_id: userId,
    filter_advisor_ids: [],
    filter_company_ids: [],
    filter_investor_ids: [],
    filter_sector_ids: [],
    filter_individual_ids: [],
  };

  let hasPriorClause = false;

  for (const item of state.filters) {
    const v = item.value;
    if (v == null) continue;
    combineOp(item, hasPriorClause, state.filterLogic);
    hasPriorClause = true;

    if (item.id === "deal_type" && Array.isArray(v) && v.length > 0) {
      filters.deal_types = v as string[];
      continue;
    }
    if (item.id === "deal_status" && Array.isArray(v) && v.length > 0) {
      filters.Deal_Status = v as string[];
      continue;
    }
    if (item.id === "buyer_investor_type" && Array.isArray(v) && v.length > 0) {
      filters.Buyer_Investor_Types = v as BuyerInvestorType[];
      continue;
    }
    if (item.id === "funding_stage" && Array.isArray(v) && v.length > 0) {
      filters.Funding_stage = v as string[];
      continue;
    }
    if (item.id === "region" && Array.isArray(v) && v.length > 0) {
      filters.continentalRegions = v as string[];
      continue;
    }
    if (item.id === "sub_region" && Array.isArray(v) && v.length > 0) {
      filters.subRegions = v as string[];
      continue;
    }
    if (item.id === "country" && Array.isArray(v) && v.length > 0) {
      filters.Countries = v as string[];
      continue;
    }
    if (item.id === "state" && Array.isArray(v) && v.length > 0) {
      filters.Provinces = v as string[];
      continue;
    }
    if (item.id === "city" && Array.isArray(v) && v.length > 0) {
      filters.Cities = v as string[];
      continue;
    }
    if (item.id === "primary_sector" && Array.isArray(v) && v.length > 0) {
      filters.primary_sectors_ids = resolveSectorIds(v as string[], primarySectors);
      continue;
    }
    if (item.id === "secondary_sector" && Array.isArray(v) && v.length > 0) {
      filters.Secondary_sectors_ids = resolveSectorIds(
        v as string[],
        secondarySectors
      );
      continue;
    }
    if (item.id === "announcement_date" && hasDateRangeValue(v)) {
      filters.Date_start = v.from || null;
      filters.Date_end = v.to || null;
      continue;
    }
    if (item.id === "followed" && v === true) {
      filters.show_followed = true;
      continue;
    }
    if (item.id === "portfolio_entity" && Array.isArray(v) && v.length > 0) {
      const parsed = parsePortfolioEntityValues(v as string[]);
      filters.filter_advisor_ids = parsed.filter_advisor_ids;
      filters.filter_company_ids = parsed.filter_company_ids;
      filters.filter_investor_ids = parsed.filter_investor_ids;
      filters.filter_sector_ids = parsed.filter_sector_ids;
      filters.filter_individual_ids = parsed.filter_individual_ids;
    }
  }

  return filters;
}

export const createDefaultCorporateEventFilters =
  (): CorporateEventsSearchFilters => ({
    Countries: [],
    Provinces: [],
    Cities: [],
    primary_sectors_ids: [],
    Secondary_sectors_ids: [],
    deal_types: [],
    Deal_Status: [],
    Funding_stage: [],
    Date_start: null,
    Date_end: null,
    search_query: "",
    Page: 1,
    Per_page: 50,
    show_followed: false,
    filter_advisor_ids: [],
    filter_company_ids: [],
    filter_investor_ids: [],
    filter_sector_ids: [],
    filter_individual_ids: [],
  });

export function buildCorporateEventsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  userId?: number | null;
  page?: number;
  perPage?: number;
}): CorporateEventsSearchFilters {
  return buildFiltersFromFilterBar(args);
}

export function buildCorporateEventsCountsSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  userId?: number | null;
  page?: number;
  perPage?: number;
}): CorporateEventsSearchFilters {
  return buildFiltersFromFilterBar(args);
}

export function corporateEventsFiltersToSearchParams(
  filters: CorporateEventsSearchFilters
): URLSearchParams {
  const params = new URLSearchParams();
  const page = Math.max(1, filters.Page || 1);
  const perPage = filters.Per_page > 0 ? filters.Per_page : 50;

  params.append("Page", String(page));
  params.append("Per_page", String(perPage));

  const hasSpecificEntityFilters =
    (filters.filter_advisor_ids?.length ?? 0) > 0 ||
    (filters.filter_company_ids?.length ?? 0) > 0 ||
    (filters.filter_investor_ids?.length ?? 0) > 0 ||
    (filters.filter_sector_ids?.length ?? 0) > 0 ||
    (filters.filter_individual_ids?.length ?? 0) > 0;

  if (filters.show_followed || hasSpecificEntityFilters) {
    params.append("show_followed", "true");
    if (filters.user_id != null && Number.isFinite(filters.user_id)) {
      params.append("user_id", String(filters.user_id));
    }
    (filters.filter_advisor_ids ?? []).forEach((id) =>
      params.append("filter_advisor_ids[]", String(id))
    );
    (filters.filter_company_ids ?? []).forEach((id) =>
      params.append("filter_company_ids[]", String(id))
    );
    (filters.filter_investor_ids ?? []).forEach((id) =>
      params.append("filter_investor_ids[]", String(id))
    );
    (filters.filter_sector_ids ?? []).forEach((id) =>
      params.append("filter_sector_ids[]", String(id))
    );
    (filters.filter_individual_ids ?? []).forEach((id) =>
      params.append("filter_individual_ids[]", String(id))
    );
  }

  if (filters.search_query) {
    params.append("search_query", filters.search_query);
  }

  if (filters.Countries.length > 0) {
    params.append("Countries", filters.Countries.join(","));
  }
  if (filters.Provinces.length > 0) {
    params.append("Provinces", filters.Provinces.join(","));
  }
  if (filters.Cities.length > 0) {
    params.append("Cities", filters.Cities.join(","));
  }
  if (filters.continentalRegions && filters.continentalRegions.length > 0) {
    params.append("Continental_Region", filters.continentalRegions.join(","));
  }
  if (filters.subRegions && filters.subRegions.length > 0) {
    params.append("geographical_sub_region", filters.subRegions.join(","));
  }

  filters.primary_sectors_ids.forEach((id) =>
    params.append("primary_sectors_ids[]", String(id))
  );
  filters.Secondary_sectors_ids.forEach((id) =>
    params.append("Secondary_sectors_ids[]", String(id))
  );

  if (filters.deal_types.length > 0) {
    params.append("deal_types", filters.deal_types.join(","));
  }
  if (filters.Deal_Status.length > 0) {
    params.append("Deal_Status", filters.Deal_Status.join(","));
  }
  if (filters.Funding_stage && filters.Funding_stage.length > 0) {
    params.append("Funding_stage", filters.Funding_stage.join(","));
  }
  if (filters.Buyer_Investor_Types && filters.Buyer_Investor_Types.length > 0) {
    params.append(
      "Buyer_Investor_Types",
      filters.Buyer_Investor_Types.join(",")
    );
  }
  if (filters.Date_start) {
    params.append("Date_start", filters.Date_start);
  }
  if (filters.Date_end) {
    params.append("Date_end", filters.Date_end);
  }

  return params;
}
