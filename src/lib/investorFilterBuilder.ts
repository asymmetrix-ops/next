import type { FilterOperator, FilterValue } from "@/lib/filterBuilder";

export type InvestorFilterType =
  | "name_search"
  | "investor_type_ids"
  | "portfolio_companies_count"
  | "total_investments_count"
  | "linkedin_members_count"
  | "years_since_investment"
  | "investor_continental_region"
  | "investor_country"
  | "investor_province"
  | "investor_city"
  | "investor_sub_region"
  | "portfolio_continental_region"
  | "portfolio_sub_region"
  | "portfolio_country"
  | "portfolio_province"
  | "portfolio_city";

export interface InvestorFilterClause {
  id: string;
  type: InvestorFilterType;
  value: FilterValue;
  op: FilterOperator;
}

export type InvestorSortDirection = "asc" | "desc";

export interface InvestorSearchPayload {
  filters_sql: string;
  geo_filter_sql: string;
  PC_Primary_ids_str: string;
  PC_Secondary_ids_str: string;
  page: number;
  per_page: number;
  portfolio_only: boolean;
  sort_column?: string | null;
  sort_direction?: InvestorSortDirection;
}

const PORTFOLIO_GEO_FILTER_TYPES = new Set<InvestorFilterType>([
  "portfolio_country",
  "portfolio_province",
  "portfolio_city",
  "portfolio_continental_region",
  "portfolio_sub_region",
]);

const esc = (s: string) => `'${String(s).replace(/'/g, "''")}'`;

const arrToPgBigint = (ids: number[]) =>
  ids.length ? `{${ids.join(",")}}` : "";

const inList = (values: string[] | number[]) =>
  (values as string[]).map((v) => esc(String(v))).join(",");

const LINKEDIN_MEMBERS_EXPR = `COALESCE(
  ld.linkedin_employee,
  (nc.linkedin_data ->> 'LinkedIn_Employee')::int
)`;

const DAYS_SINCE_EXPR = `(SELECT days_since FROM x2_139
  WHERE new_company_id = inv.original_new_company_id LIMIT 1)`;

const TOTAL_INVESTMENTS_EXPR = `(
  cardinality(inv."Active_DA_Portfolio_Companies_id")
  + cardinality(inv."Past_DA_Portfolio_Companies_id")
)`;

function buildRangeSql(field: string, min?: number, max?: number): string | null {
  const parts: string[] = [];
  const hasMin = min != null && !Number.isNaN(min);
  const hasMax = max != null && !Number.isNaN(max);
  if (hasMin) parts.push(`${field} >= ${min}`);
  if (hasMax) parts.push(`${field} <= ${max}`);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : `(${parts.join(" AND ")})`;
}

function buildPortfolioGeoClauseSql(clause: InvestorFilterClause): string | null {
  const { type, value } = clause;
  if (!("value" in value)) return null;

  const val = (value as { value: string | number | string[] | number[] }).value;

  switch (type) {
    case "portfolio_country":
      return Array.isArray(val)
        ? `l."Country" IN (${inList(val as string[])})`
        : `l."Country" = ${esc(String(val))}`;
    case "portfolio_province":
      return Array.isArray(val)
        ? `l."State__Province__County" IN (${inList(val as string[])})`
        : `l."State__Province__County" = ${esc(String(val))}`;
    case "portfolio_city":
      return Array.isArray(val)
        ? `l."City" IN (${inList(val as string[])})`
        : `l."City" = ${esc(String(val))}`;
    case "portfolio_continental_region":
      return Array.isArray(val)
        ? `l."Continental_Region" IN (${inList(val as string[])})`
        : `l."Continental_Region" = ${esc(String(val))}`;
    case "portfolio_sub_region":
      return Array.isArray(val)
        ? `TRIM(l."geographical_sub_region") IN (${inList(val as string[])})`
        : `TRIM(l."geographical_sub_region") = ${esc(String(val))}`;
    default:
      return null;
  }
}

function buildInvestorGeoClauseSql(clause: InvestorFilterClause): string | null {
  const { type, value } = clause;
  if (!("value" in value)) return null;

  const val = (value as { value: string | number | string[] | number[] }).value;

  switch (type) {
    case "investor_country":
      return Array.isArray(val)
        ? `loc."Country" IN (${inList(val as string[])})`
        : `loc."Country" = ${esc(String(val))}`;
    case "investor_province":
      return Array.isArray(val)
        ? `loc."State__Province__County" IN (${inList(val as string[])})`
        : `loc."State__Province__County" = ${esc(String(val))}`;
    case "investor_city":
      return Array.isArray(val)
        ? `loc."City" IN (${inList(val as string[])})`
        : `loc."City" = ${esc(String(val))}`;
    case "investor_continental_region":
      return Array.isArray(val)
        ? `loc."Continental_Region" IN (${inList(val as string[])})`
        : `loc."Continental_Region" = ${esc(String(val))}`;
    case "investor_sub_region":
      return Array.isArray(val)
        ? `TRIM(loc."geographical_sub_region") IN (${inList(val as string[])})`
        : `TRIM(loc."geographical_sub_region") = ${esc(String(val))}`;
    default:
      return null;
  }
}

function buildMainFilterClauseSql(clause: InvestorFilterClause): string | null {
  const { type, value } = clause;

  if ("min" in value || "max" in value) {
    const { min, max } = value as { min?: number; max?: number };

    switch (type) {
      case "portfolio_companies_count":
        return buildRangeSql("pcs.active_pc_count", min, max);
      case "total_investments_count":
        return buildRangeSql(TOTAL_INVESTMENTS_EXPR, min, max);
      case "linkedin_members_count":
        return buildRangeSql(LINKEDIN_MEMBERS_EXPR, min, max);
      case "years_since_investment": {
        const minDays = min != null ? Math.round(min * 365) : undefined;
        const maxDays = max != null ? Math.round(max * 365) : undefined;
        return buildRangeSql(DAYS_SINCE_EXPR, minDays, maxDays);
      }
      default:
        return null;
    }
  }

  if ("value" in value) {
    const val = (value as { value: string | number | string[] | number[] }).value;

    switch (type) {
      case "name_search": {
        const safe = String(val).trim().replace(/'/g, "''").toLowerCase();
        if (!safe) return null;
        return `LOWER(nc.name) ILIKE '%${safe}%'`;
      }
      case "investor_type_ids": {
        const ids = (Array.isArray(val) ? val : [Number(val)])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0);
        if (!ids.length) return null;
        if (ids.length === 1) return `${ids[0]} = ANY(inv.sectors_id)`;
        return `(${ids.map((id) => `${id} = ANY(inv.sectors_id)`).join(" OR ")})`;
      }
      default:
        return null;
    }
  }

  return null;
}

function combineFilterParts(parts: { sql: string; op: FilterOperator }[]): string {
  let result = "";

  for (const part of parts) {
    if (!result) {
      result = part.sql;
      continue;
    }

    if (part.op === "OR") {
      result = `(${result} OR ${part.sql})`;
    } else {
      result = `${result} AND ${part.sql}`;
    }
  }

  return result;
}

function buildPortfolioGeoFilterSql(geoClauses: InvestorFilterClause[]): string {
  return geoClauses
    .map((clause) => buildPortfolioGeoClauseSql(clause))
    .filter((sql): sql is string => Boolean(sql))
    .join(" AND ");
}

function buildFiltersSqlFromClauses(clauses: InvestorFilterClause[]): string {
  const filterParts: { sql: string; op: FilterOperator }[] = [];

  for (const clause of clauses) {
    if (PORTFOLIO_GEO_FILTER_TYPES.has(clause.type)) continue;

    const sql =
      buildMainFilterClauseSql(clause) ?? buildInvestorGeoClauseSql(clause);
    if (sql) {
      filterParts.push({ sql, op: clause.op });
    }
  }

  return combineFilterParts(filterParts);
}

/** @deprecated Use portfolio vs investor filter types instead. */
export function isGeoInvestorFilterType(type: InvestorFilterType): boolean {
  return PORTFOLIO_GEO_FILTER_TYPES.has(type);
}

export function buildInvestorFilterClauseSql(
  clause: InvestorFilterClause
): string | null {
  if (PORTFOLIO_GEO_FILTER_TYPES.has(clause.type)) {
    return buildPortfolioGeoClauseSql(clause);
  }
  return buildMainFilterClauseSql(clause) ?? buildInvestorGeoClauseSql(clause);
}

export function buildInvestorFiltersSql(clauses: InvestorFilterClause[]): string {
  return buildFiltersSqlFromClauses(clauses);
}

export function buildInvestorSearchPayloadFromClauses(
  clauses: InvestorFilterClause[],
  options: {
    page?: number;
    perPage?: number;
    portfolioOnly?: boolean;
    primarySectorIds?: number[];
    secondarySectorIds?: number[];
  } = {}
): InvestorSearchPayload {
  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage && options.perPage > 0 ? options.perPage : 50;
  const geoClauses = clauses.filter((clause) =>
    PORTFOLIO_GEO_FILTER_TYPES.has(clause.type)
  );

  return {
    filters_sql: buildFiltersSqlFromClauses(clauses),
    geo_filter_sql: buildPortfolioGeoFilterSql(geoClauses),
    PC_Primary_ids_str: arrToPgBigint(options.primarySectorIds ?? []),
    PC_Secondary_ids_str: arrToPgBigint(options.secondarySectorIds ?? []),
    page,
    per_page: perPage,
    portfolio_only: Boolean(options.portfolioOnly),
  };
}

export function investorSearchPayloadToRequestBody(
  payload: InvestorSearchPayload
): InvestorSearchPayload {
  const normalized: InvestorSearchPayload = {
    filters_sql: payload.filters_sql || "",
    geo_filter_sql: payload.geo_filter_sql || "",
    PC_Primary_ids_str: payload.PC_Primary_ids_str || "",
    PC_Secondary_ids_str: payload.PC_Secondary_ids_str || "",
    page: payload.page,
    per_page: payload.per_page,
    portfolio_only: payload.portfolio_only,
  };

  if (payload.sort_column) {
    normalized.sort_column = payload.sort_column;
    normalized.sort_direction = payload.sort_direction ?? "desc";
  }

  return normalized;
}

/** Serialize payload for GET investors_with_d_a_list (query string). */
export function investorSearchPayloadToSearchParams(
  payload: InvestorSearchPayload
): URLSearchParams {
  const normalized = investorSearchPayloadToRequestBody(payload);
  const params = new URLSearchParams();

  params.append("page", String(Math.max(1, normalized.page || 1)));
  params.append("per_page", String(normalized.per_page > 0 ? normalized.per_page : 50));
  params.append("filters_sql", normalized.filters_sql);
  params.append("geo_filter_sql", normalized.geo_filter_sql);
  params.append("PC_Primary_ids_str", normalized.PC_Primary_ids_str);
  params.append("PC_Secondary_ids_str", normalized.PC_Secondary_ids_str);
  params.append("portfolio_only", String(Boolean(normalized.portfolio_only)));

  if (normalized.sort_column) {
    params.append("sort_column", normalized.sort_column);
    params.append("sort_direction", normalized.sort_direction ?? "desc");
  }

  return params;
}
