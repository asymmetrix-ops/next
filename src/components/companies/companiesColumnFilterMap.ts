import type { FilterDef, FilterTypeIcon } from "./CompaniesFilterBar";
import {
  ALL_COMPANIES_COLUMN_META,
  type CompanyColumnMeta,
  type CompanyColumnType,
} from "./companiesColumnCategories";

export const FILTER_PINNED_TOOLTIP =
  "Pinned automatically — a filter is active on this column.";

/**
 * Columns that intentionally have no filter.
 * Includes identity/free-text columns and text columns with no backend filter
 * support (no matching case in buildFiltersFromState / no API param).
 * Location-flavored text columns (hq) are covered by city/state/country filters.
 */
export const COLUMN_KEYS_WITHOUT_FILTERS = new Set([
  "logo",
  "name",
  "description",
  // Portfolio filter is provided via EXTRA_FILTER_DEFS (id: followed)
  "follow",
  // URL columns — not filterable
  "website",
  "linkedin_url",
  // Text fields with no backend filter endpoint
  "hq",
  "investors",
  "lifecycle_stage",
  "product_type",
  "data_collection_method",
  "revenue_model",
]);

/**
 * Filter id → table column key. Filters without a column (region, business focus) are omitted.
 * Filter ids match buildFiltersFromState switch cases where API-backed.
 */
export const FILTER_ID_TO_COLUMN_KEY: Record<string, string> = {
  region: "hq",
  sub_region: "hq",
  country: "hq",
  state: "state",
  city: "city",
  primary_sector: "primary_sectors",
  secondary_sector: "secondary_sectors",
  ownership: "ownership",
  transaction: "transaction_status",
  date_added: "created_at",
  headcount: "linkedin_members",
  headcount_growth: "linkedin_growth",
  years_since_inv: "years_since_last_investment",
  followed: "follow",
  revenue: "revenue_m",
  ebitda: "ebitda_m",
  enterprise_value: "enterprise_value",
  rev_growth: "revenue_growth",
  ebitda_margin: "ebitda_margin",
  rev_multiple: "revenue_multiple",
  rule_40: "rule_of_40",
  subscription_revenue_pc: "subscription_revenue_pc",
  subscription_revenue_m: "subscription_revenue_m",
  arr_m: "arr_m",
  churn: "churn_pc",
  nrr: "nrr",
  grr: "grr_pc",
  new_client_growth: "new_client_growth_pc",
  website: "website",
  year_founded: "year_founded",
  linkedin_url: "linkedin_url",
  investors: "investors",
  lifecycle_stage: "lifecycle_stage",
  product_type: "product_type",
  data_collection_method: "data_collection_method",
  revenue_model: "revenue_model",
  upsell: "upsell_pc",
  cross_sell: "cross_sell_pc",
  price_increase: "price_increase_pc",
  rev_expansion: "rev_expansion_pc",
  ebit: "ebit_m",
  num_clients: "no_of_clients",
  rev_per_client: "rev_per_client",
  num_employees: "no_employees",
  rev_per_employee: "rev_per_employee",
  financial_year: "financial_year",
};

export const COLUMN_KEY_TO_FILTER_ID: Record<string, string> = Object.fromEntries(
  Object.entries(FILTER_ID_TO_COLUMN_KEY).map(([filterId, columnKey]) => [
    columnKey,
    filterId,
  ])
);

const COLUMN_META_BY_KEY = new Map(
  ALL_COMPANIES_COLUMN_META.map((column) => [column.columnKey, column])
);

const FILTER_ID_TO_META: Record<string, CompanyColumnMeta> = {};
for (const [filterId, columnKey] of Object.entries(FILTER_ID_TO_COLUMN_KEY)) {
  const meta = COLUMN_META_BY_KEY.get(columnKey);
  if (meta) FILTER_ID_TO_META[filterId] = meta;
}

export function getColumnKeyForFilterId(filterId: string): string | undefined {
  return FILTER_ID_TO_COLUMN_KEY[filterId];
}

export function getFilterIdForColumnKey(columnKey: string): string | undefined {
  return COLUMN_KEY_TO_FILTER_ID[columnKey];
}

const CANONICAL_FILTER_COLUMN_KEYS = ALL_COMPANIES_COLUMN_META.map(
  (column) => column.columnKey
);

export function getColumnKeysForActiveFilters(
  filterIds: string[],
  ownershipTabActive = false
): string[] {
  const keys = new Set<string>();
  for (const filterId of filterIds) {
    const columnKey = getColumnKeyForFilterId(filterId);
    if (columnKey) keys.add(columnKey);
  }
  if (ownershipTabActive) {
    keys.add("ownership");
  }
  return Array.from(keys).filter((key) =>
    CANONICAL_FILTER_COLUMN_KEYS.includes(key)
  );
}

function mapColumnCategoryToFilterCategory(
  column: CompanyColumnMeta
): string {
  if (column.columnKey === "follow") {
    return "lists";
  }
  if (
    column.columnKey === "primary_sectors" ||
    column.columnKey === "secondary_sectors"
  ) {
    return "sectors";
  }
  if (
    column.columnKey === "city" ||
    column.columnKey === "state" ||
    column.columnKey === "hq"
  ) {
    return "location";
  }
  if (
    [
      "revenue_m",
      "ebitda_m",
      "enterprise_value",
      "revenue_multiple",
      "revenue_growth",
      "ebitda_margin",
      "rule_of_40",
    ].includes(column.columnKey)
  ) {
    return "financial";
  }
  if (
    [
      "subscription_revenue_pc",
      "subscription_revenue_m",
      "churn_pc",
      "grr_pc",
      "nrr",
      "new_client_growth_pc",
      "upsell_pc",
      "cross_sell_pc",
      "price_increase_pc",
      "rev_expansion_pc",
    ].includes(column.columnKey)
  ) {
    return "subscription";
  }
  if (column.columnKey === "arr_m") {
    return "arr";
  }
  if (
    [
      "ebit_m",
      "no_of_clients",
      "rev_per_client",
      "no_employees",
      "rev_per_employee",
      "financial_year",
    ].includes(column.columnKey)
  ) {
    return "other";
  }
  return "company";
}

function mapColumnTypeToFilter(
  column: CompanyColumnMeta
): Pick<
  FilterDef,
  "type" | "editor" | "unit" | "min" | "max" | "presets" | "options"
> {
  const typeIcon = (t: CompanyColumnType): FilterTypeIcon => {
    if (t === "currency") return "$";
    if (t === "percent") return "%";
    if (t === "number") return "#";
    if (t === "date") return "date";
    return "Aa";
  };

  if (column.columnKey === "follow") {
    return { type: "Aa", editor: "boolean" };
  }

  if (column.columnKey === "years_since_last_investment") {
    return {
      type: "#",
      editor: "range",
      unit: "yrs",
      min: 0,
      max: 20,
    };
  }

  if (column.columnKey === "created_at") {
    return { type: "date", editor: "date_range" };
  }

  if (column.type === "number" || column.type === "currency") {
    const unit =
      column.type === "currency"
        ? "$m"
        : column.columnKey.includes("_pc")
          ? "%"
          : column.columnKey === "revenue_multiple"
            ? "x"
            : undefined;
    return {
      type: typeIcon(column.type),
      editor: "range",
      unit,
      min: 0,
      max: unit === "%" ? 200 : unit === "x" ? 30 : 10000,
    };
  }

  if (column.type === "percent") {
    return {
      type: "%",
      editor: "range",
      unit: "%",
      min: -50,
      max: 200,
    };
  }

  if (column.type === "date") {
    return { type: "date", editor: "range", min: 1990, max: 2030 };
  }

  return { type: "Aa", editor: "enum", options: [] };
}

export function filterDefFromColumnMeta(
  column: CompanyColumnMeta,
  overrides?: Partial<FilterDef>
): FilterDef | null {
  if (COLUMN_KEYS_WITHOUT_FILTERS.has(column.columnKey)) return null;

  const filterId =
    getFilterIdForColumnKey(column.columnKey) ?? column.id;
  const editorConfig = mapColumnTypeToFilter(column);

  return {
    id: filterId,
    label: column.label,
    fullLabel: column.label,
    category: mapColumnCategoryToFilterCategory(column),
    ...editorConfig,
    ...overrides,
  };
}

export function buildColumnLinkedFilterDefs(
  overrides: Record<string, Partial<FilterDef>> = {}
): FilterDef[] {
  return ALL_COMPANIES_COLUMN_META.map((column) => {
    const filterId =
      getFilterIdForColumnKey(column.columnKey) ?? column.id;
    return filterDefFromColumnMeta(column, overrides[filterId]);
  }).filter((def): def is FilterDef => def != null);
}

/** Extra filters that do not map to a single column. */
export const EXTRA_FILTER_DEFS: Pick<
  FilterDef,
  "id" | "label" | "fullLabel" | "category" | "type" | "editor" | "options"
>[] = [
  {
    id: "region",
    label: "Region",
    fullLabel: "Continental Region",
    category: "location",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "sub_region",
    label: "Sub-Region",
    fullLabel: "Sub-Region",
    category: "location",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "country",
    label: "Country",
    fullLabel: "Country",
    category: "location",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "business_focus",
    label: "Business focus",
    fullLabel: "Business Focus",
    category: "sectors",
    type: "Aa",
    editor: "segmented",
    options: ["Pure-play D&A", "Has non-D&A", "Either"],
  },
  {
    id: "followed",
    label: "My Portfolio",
    fullLabel: "My Portfolio",
    category: "lists",
    type: "Aa",
    editor: "boolean",
  },
];

export function getFilterMeta(filterId: string): CompanyColumnMeta | undefined {
  return FILTER_ID_TO_META[filterId];
}
