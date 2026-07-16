// ─── TYPES ───────────────────────────────────────────────────────────────────

export type FilterOperator = "AND" | "OR";

export type FilterType =
  | "name_search"
  | "keywords"
  | "country"
  | "province"
  | "city"
  | "continental_region"
  | "sub_region"
  | "ownership_type"
  | "transaction_status"
  | "year_founded_min"
  | "year_founded_max"
  | "linkedin_members_min"
  | "linkedin_members_max"
  | "linkedin_growth_min"
  | "linkedin_growth_max"
  | "portfolio_companies"
  | "primary_sector_ids"
  | "secondary_sector_ids"
  | "business_focus_exclude"
  | "business_focus_include"
  | "revenue_m"
  | "ebitda_m"
  | "ev"
  | "revenue_multiple"
  | "revenue_growth"
  | "ebitda_margin"
  | "rule_of_40"
  | "churn"
  | "grr"
  | "nrr"
  | "new_client_growth"
  | "upsell"
  | "cross_sell"
  | "price_increase"
  | "rev_expansion"
  | "ebit_m"
  | "no_clients"
  | "rev_per_client"
  | "no_employees"
  | "rev_per_employee"
  | "years_since_investment"
  | "financial_year_range"
  | "linkedin_growth_range"
  | "has_mcp";

export type FilterValue =
  | { min?: number; max?: number }
  | { value: string | number | string[] | number[] };

export interface FilterClause {
  id: string;
  type: FilterType;
  value: FilterValue;
  op: FilterOperator;
}

// ─── SQL FIELD MAP ───────────────────────────────────────────────────────────

const FINANCIAL_FIELD_MAP: Record<string, string> = {
  revenue_m: '"Revenue_m"',
  ebitda_m: '"EBITDA_m"',
  ev: '"EV"',
  revenue_multiple: '"Revenue_multiple"',
  revenue_growth: '"Rev_Growth_PC"',
  ebitda_margin: '"EBITDA_margin"',
  rule_of_40: '"Rule_of_40"',
  churn: '"Churn_pc"',
  grr: '"GRR_pc"',
  nrr: '"NRR"',
  new_client_growth: '"New_client_growth_pc"',
  upsell: '"Upsell_pc"',
  cross_sell: '"Cross_sell_pc"',
  price_increase: '"Price_increase_pc"',
  rev_expansion: '"Rev_expansion_pc"',
  ebit_m: '"EBIT_m"',
  no_clients: '"No_of_Clients"',
  rev_per_client: '"Rev_per_client"',
  no_employees: '"No_Employees"',
  rev_per_employee: '"Revenue_per_employee"',
  financial_year_range: '"Financial_Year"',
};

const FINANCIAL_TYPES = new Set(Object.keys(FINANCIAL_FIELD_MAP));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const esc = (s: string) => `'${String(s).replace(/'/g, "''")}'`;

const inList = (values: string[] | number[]) =>
  (values as string[]).map((v) => esc(String(v))).join(",");

function buildRangeSql(field: string, min?: number, max?: number): string | null {
  const hasMin = min != null && !Number.isNaN(min);
  const hasMax = max != null && !Number.isNaN(max);
  if (hasMin && hasMax) {
    return `(${field} IS NOT NULL AND ${field} BETWEEN ${min} AND ${max})`;
  }
  if (hasMin) return `(${field} IS NOT NULL AND ${field} >= ${min})`;
  if (hasMax) return `(${field} IS NOT NULL AND ${field} <= ${max})`;
  return null;
}

// ─── CORE BUILDER ────────────────────────────────────────────────────────────

export function buildFilterClauseSql(clause: FilterClause): string | null {
  const { type, value } = clause;

  if ("min" in value || "max" in value) {
    const { min, max } = value as { min?: number; max?: number };

    if (FINANCIAL_TYPES.has(type)) {
      const field = `fm.${FINANCIAL_FIELD_MAP[type]}`;
      return buildRangeSql(field, min, max);
    }

    switch (type) {
      case "linkedin_members_min":
      case "linkedin_members_max": {
        const expr = `COALESCE(ld.linkedin_employee, (nc.linkedin_data->>'LinkedIn_Employee')::int)`;
        return buildRangeSql(expr, min, max);
      }
      case "linkedin_growth_min":
      case "linkedin_growth_max":
      case "linkedin_growth_range":
        return buildRangeSql(`nc.linkedin_growth_1y_pct`, min, max);
      case "year_founded_min":
        return min != null ? `yr."Year"::int >= ${min}` : null;
      case "year_founded_max":
        return max != null ? `yr."Year"::int <= ${max}` : null;
      case "years_since_investment": {
        const minDays = min != null ? min * 365 : undefined;
        const maxDays = max != null ? max * 365 : undefined;
        const hasMin = minDays != null && !Number.isNaN(minDays);
        const hasMax = maxDays != null && !Number.isNaN(maxDays);
        if (hasMin && hasMax) {
          return `(ysli.days_since BETWEEN ${minDays} AND ${maxDays})`;
        }
        if (hasMin) return `(ysli.days_since >= ${minDays})`;
        if (hasMax) return `(ysli.days_since <= ${maxDays})`;
        return null;
      }
      default:
        return null;
    }
  }

  if ("value" in value) {
    const val = (value as { value: string | number | string[] | number[] }).value;

    switch (type) {
      case "name_search": {
        const safe = String(val).replace(/'/g, "''");
        return `(nc.name ILIKE '%${safe}%' OR CAST(nc."Former_name" AS text) ILIKE '%${safe}%')`;
      }
      case "keywords": {
        const safe = String(val).replace(/'/g, "''");
        return `(EXISTS (SELECT 1 FROM x2_30 s WHERE s.id = ANY(nc.sectors_id) AND s.sector_name ILIKE '%${safe}%') OR nc.description ILIKE '%${safe}%')`;
      }
      case "country":
        return Array.isArray(val)
          ? `loc."Country" IN (${inList(val as string[])})`
          : `loc."Country" = ${esc(String(val))}`;
      case "province":
        return Array.isArray(val)
          ? `loc."State__Province__County" IN (${inList(val as string[])})`
          : `loc."State__Province__County" = ${esc(String(val))}`;
      case "city":
        return Array.isArray(val)
          ? `loc."City" IN (${inList(val as string[])})`
          : `loc."City" = ${esc(String(val))}`;
      case "continental_region":
        return Array.isArray(val)
          ? `loc."Continental_Region" IN (${inList(val as string[])})`
          : `loc."Continental_Region" = ${esc(String(val))}`;
      case "sub_region":
        return Array.isArray(val)
          ? `loc."geographical_sub_region" IN (${inList(val as string[])})`
          : `loc."geographical_sub_region" = ${esc(String(val))}`;
      case "ownership_type":
        return Array.isArray(val)
          ? `nc.ownership_type_id IN (${(val as number[]).join(",")})`
          : `nc.ownership_type_id = ${Number(val)}`;
      case "transaction_status":
        return `LOWER(nc."Transaction_status") = LOWER(${esc(String(val))})`;

      case "portfolio_companies": {
        const ids = Array.isArray(val) ? (val as number[]) : [];
        if (ids.length === 0) return `1 = 0`;
        return `nc.id = ANY(ARRAY[${ids.join(",")}]::bigint[])`;
      }

      case "primary_sector_ids": {
        const ids = Array.isArray(val) ? (val as number[]) : [];
        if (ids.length === 0) return null;
        return `nc.sectors_id && (
    SELECT COALESCE(array_agg(s2.id), ARRAY[]::bigint[])
    FROM x2_30 s2
    WHERE s2.id = ANY(ARRAY[${ids.join(",")}]::bigint[])
       OR s2."Related_to_primary_sectors" && ARRAY[${ids.join(",")}]::bigint[]
  )`;
      }

      case "secondary_sector_ids": {
        const ids = Array.isArray(val) ? (val as number[]) : [];
        if (ids.length === 0) return null;
        return `nc.sectors_id && ARRAY[${ids.join(",")}]::bigint[]`;
      }

      case "business_focus_exclude": {
        const ids = Array.isArray(val) ? (val as number[]) : [];
        if (ids.length === 0) return null;
        return `NOT (nc.primary_business_focus_id && ARRAY[${ids.join(",")}]::bigint[])`;
      }

      case "business_focus_include": {
        const ids = Array.isArray(val) ? (val as number[]) : [];
        if (ids.length === 0) return null;
        return `nc.primary_business_focus_id && ARRAY[${ids.join(",")}]::bigint[]`;
      }

      case "has_mcp":
        return Number(val) === 0 ? `nc.has_mcp = false` : `nc.has_mcp = true`;

      default:
        return null;
    }
  }

  return null;
}

export function buildFiltersSql(clauses: FilterClause[]): string {
  let result = "";

  for (const clause of clauses) {
    const sql = buildFilterClauseSql(clause);
    if (!sql) continue;

    if (!result) {
      result = sql;
      continue;
    }

    if (clause.op === "OR") {
      result = `(${result} OR ${sql})`;
    } else {
      result = `${result} AND ${sql}`;
    }
  }

  return result;
}

export function deriveBackendSignals(clauses: FilterClause[]) {
  const types = new Set(clauses.map((c) => c.type));

  const has_financial_filters = clauses.some((c) => FINANCIAL_TYPES.has(c.type));

  const has_year_filter =
    types.has("year_founded_min") || types.has("year_founded_max");

  return { has_financial_filters, has_year_filter };
}

// ─── PAYLOAD TYPE ─────────────────────────────────────────────────────────────

export interface CompanySearchPayload {
  query?: string | null;
  columns?: string[];
  Offset?: number;
  Per_page?: number;
  filters_sql?: string | null;
  has_financial_filters?: boolean;
  has_year_filter?: boolean;
  sort_column?: string | null;
  sort_direction?: "asc" | "desc" | null;
  /** Top-level date-added range — handled by Xano, not filters_sql. */
  created_at_from?: string;
  created_at_to?: string;
}

export function buildApiPayload(
  clauses: FilterClause[],
  structured: Omit<
    CompanySearchPayload,
    "filters_sql" | "has_financial_filters" | "has_year_filter"
  >
): CompanySearchPayload {
  const filtersSql = buildFiltersSql(clauses);
  const { has_financial_filters, has_year_filter } = deriveBackendSignals(clauses);

  return {
    ...structured,
    filters_sql: filtersSql || null,
    has_financial_filters,
    has_year_filter,
  };
}
