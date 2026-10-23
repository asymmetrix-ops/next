import type { FilterOperator, FilterValue } from "@/lib/filterBuilder";

export type InvestorFilterType =
  | "name_search"
  | "investor_type_ids"
  | "portfolio_companies_count"
  | "years_since_investment"
  | "country"
  | "province"
  | "city"
  | "continental_region"
  | "sub_region";

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

const GEO_FILTER_TYPES = new Set<InvestorFilterType>([
  "country",
  "province",
  "city",
  "continental_region",
  "sub_region",
]);

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

export function buildInvestorFilterClauseSql(
  clause: InvestorFilterClause
): string | null {
  const { type, value } = clause;

  if ("min" in value || "max" in value) {
    const { min, max } = value as { min?: number; max?: number };

    switch (type) {
      case "portfolio_companies_count":
        return buildRangeSql("nc.number_of_active_investments", min, max);
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
        return `nc.name ILIKE '%${safe}%'`;
      }
      case "investor_type_ids": {
        const ids = Array.isArray(val) ? (val as number[]) : [Number(val)];
        if (ids.length === 0) return null;
        return `nc.investor_type_id && ARRAY[${ids.join(",")}]::bigint[]`;
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
      default:
        return null;
    }
  }

  return null;
}

export function buildInvestorFiltersSql(clauses: InvestorFilterClause[]): string {
  let result = "";

  for (const clause of clauses) {
    const sql = buildInvestorFilterClauseSql(clause);
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

export function isGeoInvestorFilterType(type: InvestorFilterType): boolean {
  return GEO_FILTER_TYPES.has(type);
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
  const mainClauses = clauses.filter((clause) => !GEO_FILTER_TYPES.has(clause.type));
  const geoClauses = clauses.filter((clause) => GEO_FILTER_TYPES.has(clause.type));

  return {
    filters_sql: buildInvestorFiltersSql(mainClauses),
    geo_filter_sql: buildInvestorFiltersSql(geoClauses),
    PC_Primary_ids_str: (options.primarySectorIds ?? []).join(","),
    PC_Secondary_ids_str: (options.secondarySectorIds ?? []).join(","),
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
