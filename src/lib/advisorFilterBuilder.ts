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

export type AdvisorSortDirection = "asc" | "desc";

export interface AdvisorSearchPayload {
  filters_sql: string;
  events_loc_filter_sql: string;
  Primary_ids_str: string;
  Secondary_ids_str: string;
  /** Comma-separated role ids for list filtering (empty = all advisors). */
  advisor_role_ids_str: string;
  need_geo_count: string;
  need_sector_count: string;
  page: number;
  per_page: number;
  portfolio_only: boolean;
  sort_column?: string | null;
  sort_direction?: AdvisorSortDirection;
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

const arrToPgBigint = (ids: number[]) =>
  ids.length ? `{${ids.join(",")}}` : "";

const LINKEDIN_MEMBERS_EXPR = `COALESCE(
  (SELECT linkedin_employee FROM x2_64
   WHERE company_id = aa.new_company_advised
   ORDER BY linkedin_emp_date DESC NULLS LAST, id DESC
   LIMIT 1),
  (nc.linkedin_data ->> 'LinkedIn_Employee')::int
)`;

function eventsCountExpr(hasGeo: boolean, hasSector: boolean): string {
  if (hasGeo) return "ev.events_cnt_geo";
  if (hasSector) return "sect_ev.events_cnt_sector";
  return "aa.events_cnt_all";
}

function buildRangeSql(field: string, min?: number, max?: number): string | null {
  const parts: string[] = [];
  const hasMin = min != null && !Number.isNaN(min);
  const hasMax = max != null && !Number.isNaN(max);
  if (hasMin) parts.push(`${field} >= ${min}`);
  if (hasMax) parts.push(`${field} <= ${max}`);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : `(${parts.join(" AND ")})`;
}

function buildEventsLocClauseSql(clause: AdvisorFilterClause): string | null {
  const { type, value } = clause;
  if (!("value" in value)) return null;

  const val = (value as { value: string | number | string[] | number[] }).value;

  switch (type) {
    case "country":
      return Array.isArray(val)
        ? `l."Country" IN (${inList(val as string[])})`
        : `l."Country" = ${esc(String(val))}`;
    case "province":
      return Array.isArray(val)
        ? `l."State__Province__County" IN (${inList(val as string[])})`
        : `l."State__Province__County" = ${esc(String(val))}`;
    case "city":
      return Array.isArray(val)
        ? `l."City" IN (${inList(val as string[])})`
        : `l."City" = ${esc(String(val))}`;
    case "continental_region":
      return Array.isArray(val)
        ? `l."Continental_Region" IN (${inList(val as string[])})`
        : `l."Continental_Region" = ${esc(String(val))}`;
    case "sub_region":
      return Array.isArray(val)
        ? `TRIM(l."geographical_sub_region") IN (${inList(val as string[])})`
        : `TRIM(l."geographical_sub_region") = ${esc(String(val))}`;
    default:
      return null;
  }
}

function buildEventsLocFilterSql(locClauses: AdvisorFilterClause[]): string {
  const parts = locClauses
    .map((clause) => buildEventsLocClauseSql(clause))
    .filter((sql): sql is string => Boolean(sql));
  return parts.join(" AND ");
}

function buildGeoExistsSql(eventsLocFilterSql: string): string {
  return `EXISTS (
  SELECT 1
  FROM   unnest(aa.event_ids_all) e
  JOIN   x2_32 tc ON tc.corporate_events_id = e AND tc.counterparty_type = 17
  JOIN   x2_45 tgt_nc ON tgt_nc.id = tc.new_company_counterparty
  LEFT   JOIN x2_42 l ON l.id = tgt_nc.locations_id
  WHERE  1=1 AND ${eventsLocFilterSql}
)`;
}

function buildMainClauseSql(
  clause: AdvisorFilterClause,
  eventsCountCol: string
): string | null {
  const { type, value } = clause;

  if ("min" in value || "max" in value) {
    const { min, max } = value as { min?: number; max?: number };

    if (type === "corporate_events_count") {
      return buildRangeSql(eventsCountCol, min, max);
    }
    if (type === "linkedin_members_count") {
      return buildRangeSql(LINKEDIN_MEMBERS_EXPR, min, max);
    }
    return null;
  }

  if ("value" in value) {
    const val = (value as { value: string | number | string[] | number[] }).value;

    if (type === "name_search") {
      const words = String(val)
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `'%${word.replace(/'/g, "''")}%'`);
      if (!words.length) return null;
      return `LOWER(nc.name) ILIKE ANY (ARRAY[${words.join(",")}])`;
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

function buildFiltersSqlFromClauses(
  clauses: AdvisorFilterClause[],
  eventsCountCol: string,
  eventsLocFilterSql: string
): string {
  const firstLocIndex = clauses.findIndex((clause) =>
    EVENTS_LOC_FILTER_TYPES.has(clause.type)
  );
  const filterParts: { sql: string; op: FilterOperator }[] = [];

  clauses.forEach((clause, index) => {
    if (EVENTS_LOC_FILTER_TYPES.has(clause.type)) {
      if (index === firstLocIndex && eventsLocFilterSql) {
        filterParts.push({
          sql: buildGeoExistsSql(eventsLocFilterSql),
          op: clause.op,
        });
      }
      return;
    }

    const sql = buildMainClauseSql(clause, eventsCountCol);
    if (sql) {
      filterParts.push({ sql, op: clause.op });
    }
  });

  return combineFilterParts(filterParts);
}

/** @deprecated Location SQL now uses the `l` alias; endpoint no longer affects SQL shape. */
export function getLinkedinAliasForEndpoint(): "ll" | "ld" {
  return "ll";
}

export function buildAdvisorFilterClauseSql(
  clause: AdvisorFilterClause
): string | null {
  if (EVENTS_LOC_FILTER_TYPES.has(clause.type)) {
    return buildEventsLocClauseSql(clause);
  }
  return buildMainClauseSql(clause, "aa.events_cnt_all");
}

export function buildAdvisorFiltersSql(
  clauses: AdvisorFilterClause[]
): string {
  const locClauses = clauses.filter((clause) =>
    EVENTS_LOC_FILTER_TYPES.has(clause.type)
  );
  const eventsLocFilterSql = buildEventsLocFilterSql(locClauses);
  return buildFiltersSqlFromClauses(clauses, "aa.events_cnt_all", eventsLocFilterSql);
}

export function buildAdvisorSearchPayloadFromClauses(
  clauses: AdvisorFilterClause[],
  options: {
    page?: number;
    perPage?: number;
    portfolioOnly?: boolean;
    primarySectorIds?: number[];
    secondarySectorIds?: number[];
  } = {}
): AdvisorSearchPayload {
  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage && options.perPage > 0 ? options.perPage : 25;

  const locClauses = clauses.filter((clause) =>
    EVENTS_LOC_FILTER_TYPES.has(clause.type)
  );
  const hasGeo = locClauses.length > 0;
  const events_loc_filter_sql = buildEventsLocFilterSql(locClauses);

  const primarySectorIds = options.primarySectorIds ?? [];
  const secondarySectorIds = options.secondarySectorIds ?? [];
  const hasSector = primarySectorIds.length > 0 || secondarySectorIds.length > 0;
  const eventsCountCol = eventsCountExpr(hasGeo, hasSector);

  return {
    filters_sql: buildFiltersSqlFromClauses(
      clauses,
      eventsCountCol,
      events_loc_filter_sql
    ),
    events_loc_filter_sql,
    Primary_ids_str: arrToPgBigint(primarySectorIds),
    Secondary_ids_str: arrToPgBigint(secondarySectorIds),
    advisor_role_ids_str: "",
    need_geo_count: hasGeo ? "1" : "0",
    need_sector_count: hasSector ? "1" : "0",
    page,
    per_page: perPage,
    portfolio_only: Boolean(options.portfolioOnly),
  };
}

export function advisorSearchPayloadToRequestBody(
  payload: AdvisorSearchPayload
): AdvisorSearchPayload {
  const normalized: AdvisorSearchPayload = {
    filters_sql: payload.filters_sql || "",
    events_loc_filter_sql: payload.events_loc_filter_sql || "",
    Primary_ids_str: payload.Primary_ids_str || "",
    Secondary_ids_str: payload.Secondary_ids_str || "",
    advisor_role_ids_str: payload.advisor_role_ids_str || "",
    need_geo_count: payload.need_geo_count || "0",
    need_sector_count: payload.need_sector_count || "0",
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
  params.append("advisor_role_ids_str", normalized.advisor_role_ids_str);
  params.append("need_geo_count", normalized.need_geo_count);
  params.append("need_sector_count", normalized.need_sector_count);
  params.append("portfolio_only", String(Boolean(normalized.portfolio_only)));

  if (normalized.sort_column) {
    params.append("sort_column", normalized.sort_column);
    params.append("sort_direction", normalized.sort_direction ?? "desc");
  }

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
