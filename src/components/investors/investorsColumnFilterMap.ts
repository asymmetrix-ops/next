import type { FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  ALL_INVESTORS_COLUMN_META,
  type InvestorColumnMeta,
} from "./investorsColumnCategories";

export const FILTER_PINNED_TOOLTIP =
  "Pinned automatically — a filter is active on this column.";

export const COLUMN_KEYS_WITHOUT_FILTERS = new Set([
  "logo",
  "name",
  "description",
  "follow",
  "website",
  "linkedin_url",
  "hq",
  "sub_region",
  "state",
  "city",
]);

export const FILTER_ID_TO_COLUMN_KEY: Record<string, string> = {
  region: "hq",
  sub_region: "sub_region",
  country: "country",
  state: "state",
  city: "city",
  primary_sector: "primary_sectors",
  secondary_sector: "primary_sectors",
  investor_type: "type",
  portfolio_companies: "portfolio_companies",
  years_since_inv: "years_since_last_investment",
  followed: "follow",
};

export const COLUMN_KEY_TO_FILTER_ID: Record<string, string> = Object.fromEntries(
  Object.entries(FILTER_ID_TO_COLUMN_KEY).map(([filterId, columnKey]) => [
    columnKey,
    filterId,
  ])
);

export function getColumnKeyForFilterId(filterId: string): string | undefined {
  return FILTER_ID_TO_COLUMN_KEY[filterId];
}

export function getFilterIdForColumnKey(columnKey: string): string | undefined {
  return COLUMN_KEY_TO_FILTER_ID[columnKey];
}

export function getColumnKeysForActiveFilters(
  filterIds: string[],
  investorTypeTabActive = false
): string[] {
  const keys = new Set<string>();
  for (const filterId of filterIds) {
    const columnKey = getColumnKeyForFilterId(filterId);
    if (columnKey) keys.add(columnKey);
    if (filterId === "secondary_sector") {
      keys.add("primary_sectors");
    }
  }
  if (investorTypeTabActive) {
    keys.add("type");
  }
  return Array.from(keys).filter((key) =>
    ALL_INVESTORS_COLUMN_META.some((column) => column.columnKey === key)
  );
}

function mapColumnCategoryToFilterCategory(column: InvestorColumnMeta): string {
  if (column.columnKey === "follow") return "portfolio";
  if (
    column.columnKey === "primary_sectors" ||
    column.columnKey === "portfolio_companies" ||
    column.columnKey === "years_since_last_investment"
  ) {
    return column.columnKey === "primary_sectors" ? "sectors" : "portfolio";
  }
  if (column.columnKey === "type") return "investor_type";
  return "location";
}

function mapColumnTypeToFilter(
  column: InvestorColumnMeta
): Pick<FilterDef, "type" | "editor" | "unit" | "min" | "max" | "presets" | "options"> {
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
  if (column.type === "number") {
    return {
      type: "#",
      editor: "range",
      min: 0,
      max: 10000,
    };
  }
  return { type: "Aa", editor: "enum", options: [] };
}

export function filterDefFromColumnMeta(
  column: InvestorColumnMeta,
  overrides?: Partial<FilterDef>
): FilterDef | null {
  if (COLUMN_KEYS_WITHOUT_FILTERS.has(column.columnKey)) return null;

  const filterId = getFilterIdForColumnKey(column.columnKey) ?? column.id;
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
  return ALL_INVESTORS_COLUMN_META.map((column) => {
    const filterId = getFilterIdForColumnKey(column.columnKey) ?? column.id;
    return filterDefFromColumnMeta(column, overrides[filterId]);
  }).filter((def): def is FilterDef => def != null);
}

export const EXTRA_FILTER_DEFS: Pick<
  FilterDef,
  "id" | "label" | "fullLabel" | "category" | "type" | "editor" | "options"
>[] = [
  {
    id: "region",
    label: "Continental Region",
    fullLabel: "Continental Region",
    category: "hq",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "sub_region",
    label: "Sub-Region",
    fullLabel: "Sub-Region",
    category: "hq",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "country",
    label: "Country",
    fullLabel: "Country",
    category: "hq",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "state",
    label: "State/County/Province",
    fullLabel: "State/County/Province",
    category: "hq",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "city",
    label: "City",
    fullLabel: "City",
    category: "hq",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "primary_sector",
    label: "Primary Sectors",
    fullLabel: "Primary Sectors",
    category: "sectors",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "secondary_sector",
    label: "Secondary Sectors",
    fullLabel: "Secondary Sectors",
    category: "sectors",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "investor_type",
    label: "By Type",
    fullLabel: "Investor Type",
    category: "investor_type",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "followed",
    label: "My Portfolio",
    fullLabel: "My Portfolio",
    category: "portfolio",
    type: "Aa",
    editor: "boolean",
  },
];
