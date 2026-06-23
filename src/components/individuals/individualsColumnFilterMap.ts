import type { FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  ALL_INDIVIDUALS_COLUMN_META,
  type IndividualColumnMeta,
} from "./individualsColumnCategories";

export const FILTER_PINNED_TOOLTIP =
  "Pinned automatically — a filter is active on this column.";

export const COLUMN_KEYS_WITHOUT_FILTERS = new Set([
  "name",
  "current_company",
  "current_roles",
  "location",
]);

export const FILTER_ID_TO_COLUMN_KEY: Record<string, string> = {
  region: "location",
  sub_region: "location",
  country: "location",
  state: "location",
  city: "location",
  primary_sector: "current_roles",
  secondary_sector: "current_roles",
  job_title: "current_roles",
  status: "current_roles",
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

export function getColumnKeysForActiveFilters(filterIds: string[]): string[] {
  const keys = new Set<string>();
  const locationFilterIds = new Set([
    "region",
    "sub_region",
    "country",
    "state",
    "city",
  ]);
  const roleFilterIds = new Set([
    "primary_sector",
    "secondary_sector",
    "job_title",
    "status",
  ]);

  for (const filterId of filterIds) {
    const columnKey = getColumnKeyForFilterId(filterId);
    if (columnKey) keys.add(columnKey);
    if (locationFilterIds.has(filterId)) keys.add("location");
    if (roleFilterIds.has(filterId)) keys.add("current_roles");
  }

  return Array.from(keys).filter((key) =>
    ALL_INDIVIDUALS_COLUMN_META.some((column) => column.columnKey === key)
  );
}

function mapColumnCategoryToFilterCategory(column: IndividualColumnMeta): string {
  if (column.columnKey === "follow") return "portfolio";
  if (column.columnKey === "location") return "location";
  return "roles";
}

function mapColumnTypeToFilter(
  column: IndividualColumnMeta
): Pick<FilterDef, "type" | "editor" | "options"> {
  if (column.columnKey === "follow") {
    return { type: "Aa", editor: "boolean" };
  }
  return { type: "Aa", editor: "enum", options: [] };
}

export function filterDefFromColumnMeta(
  column: IndividualColumnMeta,
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
  return ALL_INDIVIDUALS_COLUMN_META.map((column) => {
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
    id: "state",
    label: "State/County/Province",
    fullLabel: "State/County/Province",
    category: "location",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "city",
    label: "City",
    fullLabel: "City",
    category: "location",
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
    id: "job_title",
    label: "Job Title",
    fullLabel: "Job Title",
    category: "roles",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "status",
    label: "Status",
    fullLabel: "Status",
    category: "roles",
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
