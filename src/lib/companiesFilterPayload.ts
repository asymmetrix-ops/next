import type {
  FilterBarState,
  FilterCombineLogic,
  FilterItem,
} from "@/components/companies/CompaniesFilterBar";
import {
  isRestrictiveYesNoDualFilter,
  normalizeYesNoDualFilterValue,
} from "@/lib/yesNoDualFilter";
import {
  buildFiltersSql,
  deriveBackendSignals,
  type CompanySearchPayload,
  type FilterClause,
  type FilterOperator,
} from "@/lib/filterBuilder";

export const COMPANIES_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";

type SectorRef = { id: number; sector_name: string };
type OwnershipTypeRef = { id: number; ownership: string };

function combineOp(
  item: FilterItem,
  hasPriorClause: boolean,
  defaultLogic: FilterCombineLogic
): FilterOperator {
  if (!hasPriorClause) return "AND";
  const logic = item.combineLogic ?? defaultLogic;
  return logic === "or" ? "OR" : "AND";
}

function hasRangeValue(value: unknown): value is { min?: number; max?: number } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { min?: number; max?: number };
  return rv.min !== undefined || rv.max !== undefined;
}

function hasDateRangeValue(
  value: unknown
): value is { from?: string; to?: string } {
  if (!value || typeof value !== "object") return false;
  const rv = value as { from?: string; to?: string };
  return Boolean(rv.from?.trim() || rv.to?.trim());
}

function pickCompanyDateAddedParams(
  source: Pick<CompanySearchPayload, "created_at_from" | "created_at_to">
): Pick<CompanySearchPayload, "created_at_from" | "created_at_to"> {
  return {
    ...(source.created_at_from?.trim()
      ? { created_at_from: source.created_at_from.trim() }
      : {}),
    ...(source.created_at_to?.trim()
      ? { created_at_to: source.created_at_to.trim() }
      : {}),
  };
}

function extractCreatedAtRange(state: FilterBarState): {
  created_at_from?: string;
  created_at_to?: string;
} {
  const dateAddedFilter = state.filters.find((item) => item.id === "date_added");
  if (!dateAddedFilter?.value || !hasDateRangeValue(dateAddedFilter.value)) {
    return {};
  }

  const { from, to } = dateAddedFilter.value;
  return pickCompanyDateAddedParams({
    created_at_from: from?.trim() || undefined,
    created_at_to: to?.trim() || undefined,
  });
}

export function buildCompaniesCountsSearchPayload(
  args: Omit<
    Parameters<typeof buildCompaniesSearchPayload>[0],
    "applyOwnershipTabFilter"
  >
): CompanySearchPayload {
  return buildCompaniesSearchPayload({
    ...args,
    applyOwnershipTabFilter: false,
  });
}

/** Normalize shared search/counts payload fields (filters_sql + top-level date params). */
export function normalizeCompanySearchPayload(
  filters: CompanySearchPayload = {}
): CompanySearchPayload {
  return {
    ...filters,
    query: filters.query?.trim() || null,
    filters_sql: filters.filters_sql || null,
    columns: filters.columns ?? [],
    has_financial_filters: Boolean(filters.has_financial_filters),
    has_year_filter: Boolean(filters.has_year_filter),
    ...pickCompanyDateAddedParams(filters),
  };
}

export function buildCompaniesSearchPayload(args: {
  state: FilterBarState;
  primarySectors: SectorRef[];
  secondarySectors: SectorRef[];
  ownershipTypes: OwnershipTypeRef[];
  ownershipTypeIds?: number[];
  /** When false, tab-level ownershipTypeIds are not applied (e.g. companies_counts). Default true. */
  applyOwnershipTabFilter?: boolean;
  /** Fixed primary sector scope (sector detail pages). Applied as AND before user filters. */
  scopedPrimarySectorIds?: number[];
  /** Fixed secondary sector scope (sub-sector pages). Applied as AND before user filters. */
  scopedSecondarySectorIds?: number[];
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
    applyOwnershipTabFilter = true,
    scopedPrimarySectorIds = [],
    scopedSecondarySectorIds = [],
    portfolioCompanyIds = [],
    hybridBusinessFocusIds = [],
    columns = [],
    page = 1,
    perPage = 20,
  } = args;

  const clauses: FilterClause[] = [];
  let hasPriorClause = false;

  const pushScopeClause = (clause: FilterClause) => {
    clauses.push(clause);
    hasPriorClause = true;
  };

  if (scopedPrimarySectorIds.length > 0) {
    pushScopeClause({
      id: "scoped-primary-sector",
      type: "primary_sector_ids",
      value: { value: scopedPrimarySectorIds },
      op: "AND",
    });
  }

  if (scopedSecondarySectorIds.length > 0) {
    pushScopeClause({
      id: "scoped-secondary-sector",
      type: "secondary_sector_ids",
      value: { value: scopedSecondarySectorIds },
      op: "AND",
    });
  }

  for (const item of state.filters) {
    const v = item.value;
    if (v == null) continue;

    const op = combineOp(item, hasPriorClause, state.filterLogic);
    const pushClause = (clause: FilterClause) => {
      clauses.push(clause);
      hasPriorClause = true;
    };

    // ── LOCATION ───────────────────────────────────────────────────────────
    if (item.id === "region" && Array.isArray(v)) {
      pushClause({
        id: item.key,
        type: "continental_region",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "sub_region" && Array.isArray(v)) {
      pushClause({
        id: item.key,
        type: "sub_region",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "country" && Array.isArray(v)) {
      pushClause({
        id: item.key,
        type: "country",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "city" && Array.isArray(v)) {
      pushClause({
        id: item.key,
        type: "city",
        value: { value: v as string[] },
        op,
      });
      continue;
    }
    if (item.id === "state" && Array.isArray(v)) {
      pushClause({
        id: item.key,
        type: "province",
        value: { value: v as string[] },
        op,
      });
      continue;
    }

    // ── SECTORS & PORTFOLIO ────────────────────────────────────────────────
    if (item.id === "followed" && v === true) {
      pushClause({
        id: item.key,
        type: "portfolio_companies",
        value: {
          value: portfolioCompanyIds.length > 0 ? portfolioCompanyIds : [-1],
        },
        op,
      });
      continue;
    }
    if (item.id === "has_mcp") {
      const mcpValue = normalizeYesNoDualFilterValue(v);
      if (!isRestrictiveYesNoDualFilter(mcpValue)) {
        continue;
      }
      pushClause({
        id: item.key,
        type: "has_mcp",
        value: { value: mcpValue.yes ? 1 : 0 },
        op,
      });
      continue;
    }
    if (item.id === "business_focus" && typeof v === "string") {
      if (v === "Pure-play D&A" && hybridBusinessFocusIds.length > 0) {
        pushClause({
          id: item.key,
          type: "business_focus_exclude",
          value: { value: hybridBusinessFocusIds },
          op,
        });
      } else if (v === "Has non-D&A" && hybridBusinessFocusIds.length > 0) {
        pushClause({
          id: item.key,
          type: "business_focus_include",
          value: { value: hybridBusinessFocusIds },
          op,
        });
      }
      continue;
    }
    if (item.id === "primary_sector" && Array.isArray(v)) {
      const ids = (v as string[])
        .map((name) => primarySectors.find((s) => s.sector_name === name)?.id)
        .filter((id): id is number => id != null);
      if (ids.length > 0) {
        pushClause({
          id: item.key,
          type: "primary_sector_ids",
          value: { value: ids },
          op,
        });
      }
      continue;
    }
    if (item.id === "secondary_sector" && Array.isArray(v)) {
      const ids = (v as string[])
        .map((name) => secondarySectors.find((s) => s.sector_name === name)?.id)
        .filter((id): id is number => id != null);
      if (ids.length > 0) {
        pushClause({
          id: item.key,
          type: "secondary_sector_ids",
          value: { value: ids },
          op,
        });
      }
      continue;
    }

    // ── COMPANY DETAILS ────────────────────────────────────────────────────
    if (item.id === "ownership" && Array.isArray(v)) {
      const ids = (v as string[])
        .map((name) => ownershipTypes.find((o) => o.ownership === name)?.id)
        .filter((id): id is number => id != null);
      if (ids.length > 0) {
        pushClause({
          id: item.key,
          type: "ownership_type",
          value: { value: ids },
          op,
        });
      }
      continue;
    }
    if (item.id === "headcount" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "linkedin_members_min",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "year_founded" && hasRangeValue(v)) {
      if (v.min != null) {
        pushClause({
          id: `${item.key}-min`,
          type: "year_founded_min",
          value: { min: v.min },
          op,
        });
      }
      if (v.max != null) {
        pushClause({
          id: `${item.key}-max`,
          type: "year_founded_max",
          value: { max: v.max },
          op: "AND",
        });
      }
      continue;
    }
    if (item.id === "headcount_growth" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "linkedin_growth_range",
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
    if (item.id === "transaction" && Array.isArray(v)) {
      (v as string[]).forEach((status, i) => {
        pushClause({
          id: `${item.key}-${i}`,
          type: "transaction_status",
          value: { value: status },
          op: i === 0 ? op : "OR",
        });
      });
      continue;
    }
    if (item.id === "date_added" && hasDateRangeValue(v)) {
      continue;
    }

    // ── FINANCIAL METRICS ──────────────────────────────────────────────────
    if (item.id === "revenue" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "revenue_m",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "ebitda" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "ebitda_m",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "enterprise_value" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "ev",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "rev_multiple" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "revenue_multiple",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "rev_growth" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "revenue_growth",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "ebitda_margin" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "ebitda_margin",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "rule_40" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "rule_of_40",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }

    // ── SUBSCRIPTION METRICS ───────────────────────────────────────────────
    if (item.id === "churn" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "churn",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "grr" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "grr",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "nrr" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "nrr",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "new_client_growth" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "new_client_growth",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "upsell" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "upsell",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "cross_sell" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "cross_sell",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "price_increase" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "price_increase",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "rev_expansion" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "rev_expansion",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }

    // ── OTHER METRICS ──────────────────────────────────────────────────────
    if (item.id === "ebit" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "ebit_m",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "num_clients" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "no_clients",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "rev_per_client" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "rev_per_client",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "num_employees" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "no_employees",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "rev_per_employee" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "rev_per_employee",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
    if (item.id === "financial_year" && hasRangeValue(v)) {
      pushClause({
        id: item.key,
        type: "financial_year_range",
        value: { min: v.min, max: v.max },
        op,
      });
      continue;
    }
  }

  // Tab-level ownership gate (e.g. PE tab) — omitted for companies_counts
  if (
    applyOwnershipTabFilter &&
    ownershipTypeIds &&
    ownershipTypeIds.length > 0
  ) {
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
  const createdAtRange = extractCreatedAtRange(state);

  return {
    query,
    columns,
    Offset: page,
    Per_page: perPage,
    filters_sql,
    has_financial_filters,
    has_year_filter,
    ...createdAtRange,
  };
}

function appendSharedCompanyFilterParams(
  params: URLSearchParams,
  payload: CompanySearchPayload
): void {
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

  if (payload.created_at_from?.trim()) {
    params.append("created_at_from", payload.created_at_from.trim());
  }
  if (payload.created_at_to?.trim()) {
    params.append("created_at_to", payload.created_at_to.trim());
  }

  (payload.columns ?? []).forEach((col) => {
    params.append("columns[]", col);
  });
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
  appendSharedCompanyFilterParams(params, payload);

  return params;
}

/** Serialize payload for GET companies_counts — filters_sql + created_at_from/to, no pagination. */
export function companyCountsPayloadToSearchParams(
  payload: CompanySearchPayload
): URLSearchParams {
  const params = new URLSearchParams();
  appendSharedCompanyFilterParams(params, normalizeCompanySearchPayload(payload));
  return params;
}

/** Locked MCP = Yes filters for MCP Guest browse-only company list. */
export function buildMcpGuestCompaniesFilters(): CompanySearchPayload {
  return buildCompaniesSearchPayload({
    state: {
      filters: [
        {
          id: "has_mcp",
          key: "mcp-guest-locked",
          value: { yes: true, no: false },
        },
      ],
      viewId: null,
      searchText: "",
      filterLogic: "and",
    },
    primarySectors: [],
    secondarySectors: [],
    ownershipTypes: [],
  });
}

/** Same MCP lock for companies_counts (no ownership tab filter). */
export function buildMcpGuestCompaniesCountsFilters(): CompanySearchPayload {
  return buildCompaniesCountsSearchPayload({
    state: {
      filters: [
        {
          id: "has_mcp",
          key: "mcp-guest-locked",
          value: { yes: true, no: false },
        },
      ],
      viewId: null,
      searchText: "",
      filterLogic: "and",
    },
    primarySectors: [],
    secondarySectors: [],
    ownershipTypes: [],
  });
}

export type { CompanySearchPayload, FilterClause };
