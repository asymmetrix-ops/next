import type { FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  ALL_ADVISORS_COLUMN_META,
  type AdvisorColumnMeta,
} from "./advisorsColumnCategories";

export const FILTER_PINNED_TOOLTIP =
  "Pinned automatically — a filter is active on this column.";

export const COLUMN_KEYS_WITHOUT_FILTERS = new Set([
  "name",
  "description",
  "follow",
  "sectors",
]);

export const FILTER_ID_TO_COLUMN_KEY: Record<string, string> = {
  country: "country",
  primary_sector: "sectors",
  secondary_sector: "sectors",
  corporate_events: "events_advised",
  linkedin_members: "linkedin_members",
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

  for (const filterId of filterIds) {
    const columnKey = getColumnKeyForFilterId(filterId);
    if (columnKey) keys.add(columnKey);
    if (filterId === "primary_sector" || filterId === "secondary_sector") {
      keys.add("sectors");
    }
    if (locationFilterIds.has(filterId)) {
      keys.add("country");
    }
  }

  return Array.from(keys).filter((key) =>
    ALL_ADVISORS_COLUMN_META.some((column) => column.columnKey === key)
  );
}

function mapColumnCategoryToFilterCategory(column: AdvisorColumnMeta): string {
  if (column.columnKey === "follow") return "portfolio";
  if (column.columnKey === "events_advised") return "portfolio";
  if (column.columnKey === "sectors") return "sectors";
  return "location";
}

function mapColumnTypeToFilter(
  column: AdvisorColumnMeta
): Pick<FilterDef, "type" | "editor" | "unit" | "min" | "max" | "presets"> {
  if (column.columnKey === "follow") {
    return { type: "Aa", editor: "boolean" };
  }
  if (column.type === "number") {
    return {
      type: "#",
      editor: "range",
      min: 0,
      max: column.columnKey === "linkedin_members" ? 100000 : 10000,
    };
  }
  return { type: "Aa", editor: "enum" };
}

export function filterDefFromColumnMeta(
  column: AdvisorColumnMeta,
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
    options: [],
    ...overrides,
  };
}

export function buildColumnLinkedFilterDefs(
  overrides: Record<string, Partial<FilterDef>> = {}
): FilterDef[] {
  return ALL_ADVISORS_COLUMN_META.map((column) => {
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
    id: "followed",
    label: "My Portfolio",
    fullLabel: "My Portfolio",
    category: "portfolio",
    type: "Aa",
    editor: "boolean",
  },
];
