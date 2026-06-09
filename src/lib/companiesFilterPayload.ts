import type {
  FilterBarState,
  FilterCombineLogic,
  FilterItem,
} from "@/components/companies/CompaniesFilterBar";
import {
  buildFiltersSql,
  deriveBackendSignals,
  type CompanySearchPayload,
  type FilterClause,
  type FilterOperator,
  type FilterType,
} from "@/lib/filterBuilder";

type SectorRef = { id: number; sector_name: string };
type OwnershipTypeRef = { id: number; ownership: string };

const RANGE_FILTER_ID_TO_TYPE: Record<string, FilterType> = {
  headcount: "linkedin_members_min",
  revenue: "revenue_m",
  ebitda: "ebitda_m",
  enterprise_value: "ev",
  rev_growth: "revenue_growth",
  ebitda_margin: "ebitda_margin",
  rev_multiple: "revenue_multiple",
  rule_40: "rule_of_40",
  arr: "arr_m",
  arr_growth: "arr_pc",
  churn: "churn",
  grr: "grr",
  nrr: "nrr",
  new_client_growth: "new_client_growth",
  upsell: "upsell",
  cross_sell: "cross_sell",
  price_increase: "price_increase",
  rev_expansion: "rev_expansion",
  ebit: "ebit_m",
  num_clients: "no_clients",
  rev_per_client: "rev_per_client",
  num_employees: "no_employees",
  rev_per_employee: "rev_per_employee",
};

const ENUM_FILTER_ID_TO_TYPE: Record<string, FilterType> = {
  region: "continental_region",
  sub_region: "sub_region",
  country: "country",
  state: "province",
  city: "city",
};

function clauseOp(
  index: number,
  itemOp: FilterCombineLogic | undefined,
  defaultLogic: FilterCombineLogic
): FilterOperator {
  if (index === 0) return "AND";
  const logic = itemOp ?? defaultLogic;
  return logic === "or" ? "OR" : "AND";
}

function hasRangeValue(value: unknown): value is { min?: number; max?: number } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { min?: number; max?: number };
  return rv.min !== undefined || rv.max !== undefined;
}

/** Map a plain filter item (ownership, location, range, etc.) to SQL clauses.
 *  portfolio / sector / business_focus are handled upstream — return [] here. */
function filterItemToClauses(
  item: FilterItem,
  op: FilterOperator,
  data: { ownershipTypes: OwnershipTypeRef[] }
): FilterClause[] {
  const v = item.value;
  if (v == null) return [];

  const base = { id: item.key, op };

  if (item.id === "ownership") {
    const names = Array.isArray(v) ? (v as string[]) : [];
    const ids = names
      .map((name) => data.ownershipTypes.find((o) => o.ownership === name)?.id)
      .filter((id): id is number => id != null);
    if (ids.length === 0) return [];
    return [
      {
        ...base,
        type: "ownership_type",
        value: { value: ids.length === 1 ? ids[0] : ids },
      },
    ];
  }

  if (item.id === "transaction") {
    const statuses = Array.isArray(v) ? (v as string[]) : [];
    return statuses.map((status, index) => ({
      id: `${item.key}-${index}`,
      type: "transaction_status" as FilterType,
      value: { value: status },
      op: index === 0 ? op : ("OR" as FilterOperator),
    }));
  }

  if (item.id === "year_founded" && hasRangeValue(v)) {
    const clauses: FilterClause[] = [];
    if (v.min !== undefined) {
      clauses.push({
        id: `${item.key}-min`,
        type: "year_founded_min",
        value: { min: v.min },
        op: clauses.length === 0 ? op : "AND",
      });
    }
    if (v.max !== undefined) {
      clauses.push({
        id: `${item.key}-max`,
        type: "year_founded_max",
        value: { max: v.max },
        op: clauses.length === 0 ? op : "AND",
      });
    }
    return clauses;
  }

  const rangeType = RANGE_FILTER_ID_TO_TYPE[item.id];
  if (rangeType && hasRangeValue(v)) {
    return [{ ...base, type: rangeType, value: { min: v.min, max: v.max } }];
  }

  const enumType = ENUM_FILTER_ID_TO_TYPE[item.id];
  if (enumType && Array.isArray(v) && v.length > 0) {
    return [{ ...base, type: enumType, value: { value: v as string[] } }];
  }

  return [];
}

export function buildCompaniesSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  ownershipTypes: OwnershipTypeRef[];
  ownershipTypeIds?: number[];
  portfolioCompanyIds?: number[];
  hybridBusinessFocusIds?: number[];
  columns?: string[];
  page?: number;
  perPage?: number;
}): CompanySearchPayload {
  const {
    state,
    primarySectors,
    secondarySectors,
    ownershipTypes,
    ownershipTypeIds,
    portfolioCompanyIds = [],
    hybridBusinessFocusIds = [],
    columns = [],
    page = 1,
    perPage = 20,
  } = args;

  let minGrowthPercent: string | number = "0";
  let maxGrowthPercent: string | number = "0";
  let timeFrame = "";

  const clauses: FilterClause[] = [];

  for (const item of state.filters) {
    const v = item.value;
    if (v == null) continue;

    const op = clauseOp(clauses.length, undefined, state.filterLogic);

    // ── Portfolio ──────────────────────────────────────────────────────────
    if (item.id === "followed" && v === true) {
      clauses.push({
        id: item.key,
        type: "portfolio_companies",
        value: { value: portfolioCompanyIds.length > 0 ? portfolioCompanyIds : [-1] },
        op,
      });
      continue;
    }

    // ── Business focus ─────────────────────────────────────────────────────
    if (item.id === "business_focus" && typeof v === "string") {
      if (v === "Pure-play D&A" && hybridBusinessFocusIds.length > 0) {
        clauses.push({
          id: item.key,
          type: "business_focus_exclude",
          value: { value: hybridBusinessFocusIds },
          op,
        });
      } else if (v === "Has non-D&A" && hybridBusinessFocusIds.length > 0) {
        clauses.push({
          id: item.key,
          type: "business_focus_include",
          value: { value: hybridBusinessFocusIds },
          op,
        });
      }
      continue;
    }

    // ── Primary sectors ────────────────────────────────────────────────────
    if (item.id === "primary_sector" && Array.isArray(v)) {
      const ids = (v as string[])
        .map((name) => primarySectors.find((s) => s.sector_name === name)?.id)
        .filter((id): id is number => id != null);
      if (ids.length > 0) {
        clauses.push({
          id: item.key,
          type: "primary_sector_ids",
          value: { value: ids },
          op,
        });
      }
      continue;
    }

    // ── Secondary sectors ──────────────────────────────────────────────────
    if (item.id === "secondary_sector" && Array.isArray(v)) {
      const ids = (v as string[])
        .map((name) => secondarySectors.find((s) => s.sector_name === name)?.id)
        .filter((id): id is number => id != null);
      if (ids.length > 0) {
        clauses.push({
          id: item.key,
          type: "secondary_sector_ids",
          value: { value: ids },
          op,
        });
      }
      continue;
    }

    // ── Headcount growth — structured param, not SQL ───────────────────────
    if (item.id === "headcount_growth" && hasRangeValue(v)) {
      if (v.min !== undefined) minGrowthPercent = v.min;
      if (v.max !== undefined) maxGrowthPercent = v.max;
      timeFrame = "Last Year";
      continue;
    }

    // ── Everything else ────────────────────────────────────────────────────
    clauses.push(...filterItemToClauses(item, op, { ownershipTypes }));
  }

  // Tab-level ownership gate (e.g. PE tab)
  if (ownershipTypeIds && ownershipTypeIds.length > 0) {
    clauses.push({
      id: "ownership-tab",
      type: "ownership_type",
      value: { value: ownershipTypeIds },
      op: clauses.length === 0 ? "AND" : "AND",
    });
  }

  const { has_financial_filters, has_year_filter } = deriveBackendSignals(clauses);
  const filters_sql = buildFiltersSql(clauses) || null;
  const query = state.searchText?.trim() || null;

  return {
    query,
    columns,
    Offset: page,
    Per_page: perPage,
    filters_sql,
    has_financial_filters,
    has_year_filter,
    min_growth_percent: minGrowthPercent,
    max_growth_percent: maxGrowthPercent,
    time_frame: timeFrame,
  };
}

/** Serialize payload for GET Get_new_companies (query string). */
export function companySearchPayloadToSearchParams(
  payload: CompanySearchPayload,
  options?: { page?: number; perPage?: number }
): URLSearchParams {
  const params = new URLSearchParams();
  const page = options?.page ?? payload.Offset ?? 1;
  const perPageRaw = options?.perPage ?? payload.Per_page ?? 20;
  const perPage = perPageRaw > 0 ? perPageRaw : 20;

  params.append("Offset", String(page));
  params.append("Per_page", String(perPage));

  if (payload.query?.trim()) {
    params.append("query", payload.query.trim());
  }

  if (payload.filters_sql) {
    params.append("filters_sql", payload.filters_sql);
  }

  params.append(
    "has_financial_filters",
    String(Boolean(payload.has_financial_filters))
  );
  params.append("has_year_filter", String(Boolean(payload.has_year_filter)));

  (payload.columns ?? []).forEach((col) => {
    params.append("columns[]", col);
  });

  params.append(
    "min_growth_percent",
    String(payload.min_growth_percent ?? "0")
  );
  params.append(
    "max_growth_percent",
    String(payload.max_growth_percent ?? "0")
  );
  if (payload.time_frame?.trim()) {
    params.append("time_frame", payload.time_frame.trim());
  }

  return params;
}

/** Legacy counts endpoint adapter — sends structured params as best-effort zeros/empties
 *  since the new payload folds everything into filters_sql. */
export function buildCountsRequestFromPayload(
  payload: CompanySearchPayload
): Record<string, unknown> {
  const num = (value: string | number | null | undefined): string => {
    if (value == null || value === "") return "0";
    const n = typeof value === "number" ? value : Number.parseFloat(String(value));
    return Number.isFinite(n) ? String(n) : "0";
  };

  return {
    query: payload.query ?? null,
    Primary_sectors_ids: [],
    Secondary_sectors_ids: [],
    Ownership_types_ids: [],
    Countries: [],
    Provinces: [],
    Cities: [],
    exclude_business_focus: null,
    Hybrid_Data_ids: [],
    Continental_Region: "",
    geographical_sub_region: "",
    Revenue_min: "0",
    Revenue_max: "0",
    EBITDA_min: "0",
    EBITDA_max: "0",
    Enterprise_Value_min: "0",
    Enterprise_Value_max: "0",
    Revenue_Multiple_min: "0",
    Revenue_Multiple_max: "0",
    Revenue_Growth_min: "0",
    Revenue_Growth_max: "0",
    EBITDA_Margin_min: "0",
    EBITDA_Margin_max: "0",
    Rule_of_40_min: "0",
    Rule_of_40_max: "0",
    ARR_min: "0",
    ARR_max: "0",
    ARR_pc_min: "0",
    ARR_pc_max: "0",
    Churn_min: "0",
    Churn_max: "0",
    GRR_min: "0",
    GRR_max: "0",
    NRR_min: "0",
    NRR_max: "0",
    New_Clients_Revenue_Growth_min: "0",
    New_Clients_Revenue_Growth_max: "0",
    keywords_search: "",
    min_growth_percent: num(payload.min_growth_percent),
    max_growth_percent: num(payload.max_growth_percent),
    Year_founded_min: "0",
    Year_founded_max: "0",
    transaction_status: [],
    filter_mode: "",
  };
}

export type { CompanySearchPayload, FilterClause };
