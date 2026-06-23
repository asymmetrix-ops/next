import type { FilterOperator, FilterValue } from "@/lib/filterBuilder";

export type AdvisorFilterType =
  | "name_search"
  | "corporate_events_count"
  | "linkedin_members_count"
  | "country"
  | "province"
  | "city"
  | "continental_region"
  | "sub_region";

export interface AdvisorFilterClause {
  id: string;
  type: AdvisorFilterType;
  value: FilterValue;
  op: FilterOperator;
}

export type AdvisorSqlEndpoint = "sql_advisors_list" | "sql_advisors_counts";

export interface AdvisorSearchPayload {
  filters_sql: string;
  events_loc_filter_sql: string;
  Primary_ids_str: string;
  Secondary_ids_str: string;
  need_geo_count: string;
  need_sector_count: string;
  page: number;
  per_page: number;
  portfolio_only: boolean;
}

export function getLinkedinAliasForEndpoint(endpoint?: AdvisorSqlEndpoint): "ll" | "ld" {
  return endpoint === "sql_advisors_list" || endpoint === "sql_advisors_counts"
    ? "ll"
    : "ld";
}

function buildLinkedinEmployeeExpr(linkedinAlias: "ll" | "ld"): string {
  return `COALESCE(${linkedinAlias}.linkedin_employee, (nc.linkedin_data->>'LinkedIn_Employee')::int)`;
}

const EVENTS_LOC_FILTER_TYPES = new Set<AdvisorFilterType>([
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

export function buildAdvisorFilterClauseSql(
  clause: AdvisorFilterClause,
  linkedinAlias: "ll" | "ld" = "ld"
): string | null {
  const { type, value } = clause;

  if ("min" in value || "max" in value) {
    const { min, max } = value as { min?: number; max?: number };

    if (type === "corporate_events_count") {
      return buildRangeSql("nc.events_advised", min, max);
    }
    if (type === "linkedin_members_count") {
      return buildRangeSql(buildLinkedinEmployeeExpr(linkedinAlias), min, max);
    }
    return null;
  }

  if ("value" in value) {
    const val = (value as { value: string | number | string[] | number[] }).value;

    switch (type) {
      case "name_search": {
        const safe = String(val).replace(/'/g, "''");
        return `LOWER(nc.name) ILIKE ANY (ARRAY['%${safe}%'])`;
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

export function buildAdvisorFiltersSql(
  clauses: AdvisorFilterClause[],
  linkedinAlias: "ll" | "ld" = "ld"
): string {
  let result = "";

  for (const clause of clauses) {
    const sql = buildAdvisorFilterClauseSql(clause, linkedinAlias);
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

export function buildAdvisorSearchPayloadFromClauses(
  clauses: AdvisorFilterClause[],
  options: {
    page?: number;
    perPage?: number;
    portfolioOnly?: boolean;
    primarySectorIds?: number[];
    secondarySectorIds?: number[];
    needGeoCount?: boolean;
    needSectorCount?: boolean;
    endpoint?: AdvisorSqlEndpoint;
  } = {}
): AdvisorSearchPayload {
  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage && options.perPage > 0 ? options.perPage : 25;
  const linkedinAlias = getLinkedinAliasForEndpoint(options.endpoint);
  const mainClauses = clauses.filter(
    (clause) => !EVENTS_LOC_FILTER_TYPES.has(clause.type)
  );
  const locClauses = clauses.filter((clause) =>
    EVENTS_LOC_FILTER_TYPES.has(clause.type)
  );

  return {
    filters_sql: buildAdvisorFiltersSql(mainClauses, linkedinAlias),
    events_loc_filter_sql: buildAdvisorFiltersSql(locClauses, linkedinAlias),
    Primary_ids_str: (options.primarySectorIds ?? []).join(","),
    Secondary_ids_str: (options.secondarySectorIds ?? []).join(","),
    need_geo_count: options.needGeoCount ? "1" : "0",
    need_sector_count: options.needSectorCount ? "1" : "0",
    page,
    per_page: perPage,
    portfolio_only: Boolean(options.portfolioOnly),
  };
}

export function advisorSearchPayloadToRequestBody(
  payload: AdvisorSearchPayload
): AdvisorSearchPayload {
  return {
    filters_sql: payload.filters_sql || "",
    events_loc_filter_sql: payload.events_loc_filter_sql || "",
    Primary_ids_str: payload.Primary_ids_str || "",
    Secondary_ids_str: payload.Secondary_ids_str || "",
    need_geo_count: payload.need_geo_count || "0",
    need_sector_count: payload.need_sector_count || "0",
    page: payload.page,
    per_page: payload.per_page,
    portfolio_only: payload.portfolio_only,
  };
}

/** Serialize payload for GET advisors list/counts endpoints (query string). */
export function advisorSearchPayloadToSearchParams(
  payload: AdvisorSearchPayload
): URLSearchParams {
  const normalized = advisorSearchPayloadToRequestBody(payload);
  const params = new URLSearchParams();

  params.append("page", String(Math.max(1, normalized.page || 1)));
  params.append("per_page", String(normalized.per_page > 0 ? normalized.per_page : 25));
  params.append("filters_sql", normalized.filters_sql);
  params.append("events_loc_filter_sql", normalized.events_loc_filter_sql);
  params.append("Primary_ids_str", normalized.Primary_ids_str);
  params.append("Secondary_ids_str", normalized.Secondary_ids_str);
  params.append("need_geo_count", normalized.need_geo_count);
  params.append("need_sector_count", normalized.need_sector_count);
  params.append("portfolio_only", String(Boolean(normalized.portfolio_only)));

  return params;
}

/** Serialize payload for GET get_all_advisors_counts — same SQL fields, need_* flags set to 1. */
export function advisorCountsPayloadToSearchParams(
  payload: AdvisorSearchPayload
): URLSearchParams {
  return advisorSearchPayloadToSearchParams({
    ...advisorSearchPayloadToRequestBody(payload),
    page: 1,
    need_geo_count: "1",
    need_sector_count: "1",
  });
}
