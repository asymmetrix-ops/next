import type { FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  ALL_CORPORATE_EVENTS_COLUMN_META,
  type CorporateEventColumnMeta,
} from "./corporateEventsColumnCategories";

export const FILTER_PINNED_TOOLTIP =
  "Pinned automatically — a filter is active on this column.";

export const COLUMN_KEYS_WITHOUT_FILTERS = new Set([
  "description",
  "parties",
  "advisors",
]);

export const FILTER_ID_TO_COLUMN_KEY: Record<string, string> = {
  country: "target_hq",
  primary_sector: "primary_sectors",
  secondary_sector: "secondary_sectors",
  deal_type: "deal_type",
  deal_status: "deal_type",
  funding_stage: "funding_stage",
  buyer_investor_type: "parties",
  announcement_date: "announcement_date",
  investment_amount: "investment_amount",
  enterprise_value: "enterprise_value",
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
      keys.add("primary_sectors");
      keys.add("secondary_sectors");
    }
    if (locationFilterIds.has(filterId)) {
      keys.add("target_hq");
    }
  }

  return Array.from(keys).filter((key) =>
    ALL_CORPORATE_EVENTS_COLUMN_META.some((column) => column.columnKey === key)
  );
}

function mapColumnCategoryToFilterCategory(
  column: CorporateEventColumnMeta
): string {
  if (column.columnKey === "deal_type" || column.columnKey === "funding_stage") {
    return "event";
  }
  if (
    column.columnKey === "primary_sectors" ||
    column.columnKey === "secondary_sectors"
  ) {
    return "sectors";
  }
  if (column.columnKey === "target_hq") return "location";
  if (column.columnKey === "announcement_date") return "event";
  if (
    column.columnKey === "investment_amount" ||
    column.columnKey === "enterprise_value"
  ) {
    return "event";
  }
  return "event";
}

function mapColumnTypeToFilter(
  column: CorporateEventColumnMeta
): Pick<FilterDef, "type" | "editor" | "unit" | "min" | "max" | "presets"> {
  if (column.columnKey === "announcement_date") {
    return { type: "date", editor: "date_range" };
  }
  if (column.type === "number") {
    return {
      type: "#",
      editor: "range",
      min: 0,
      max: 100000,
    };
  }
  return { type: "Aa", editor: "enum" };
}

export function filterDefFromColumnMeta(
  column: CorporateEventColumnMeta,
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
  return ALL_CORPORATE_EVENTS_COLUMN_META.map((column) => {
    const filterId = getFilterIdForColumnKey(column.columnKey) ?? column.id;
    return filterDefFromColumnMeta(column, overrides[filterId]);
  }).filter((def): def is FilterDef => def != null);
}

export const EXTRA_FILTER_DEFS: Pick<
  FilterDef,
  "id" | "label" | "fullLabel" | "category" | "type" | "editor" | "options"
>[] = [
  {
    id: "deal_type",
    label: "Deal Type",
    fullLabel: "Deal Type",
    category: "event",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "deal_status",
    label: "Deal Status",
    fullLabel: "Deal Status",
    category: "event",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "buyer_investor_type",
    label: "Buyer / Investor Type",
    fullLabel: "Buyer / Investor Type",
    category: "event",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "funding_stage",
    label: "Funding Stage",
    fullLabel: "Funding Stage",
    category: "event",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "announcement_date",
    label: "Announcement Date",
    fullLabel: "Announcement Date",
    category: "event",
    type: "date",
    editor: "date_range",
    options: [],
  },
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
    label: "State / Province",
    fullLabel: "State / Province",
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
    label: "Primary Sector",
    fullLabel: "Primary Sector",
    category: "sectors",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "secondary_sector",
    label: "Secondary Sector",
    fullLabel: "Secondary Sector",
    category: "sectors",
    type: "Aa",
    editor: "enum",
    options: [],
  },
  {
    id: "followed",
    label: "Followed Only",
    fullLabel: "Followed Only",
    category: "portfolio",
    type: "Aa",
    editor: "boolean",
    options: [],
  },
  {
    id: "portfolio_entity",
    label: "Followed Entity",
    fullLabel: "Followed Entity",
    category: "portfolio",
    type: "Aa",
    editor: "enum",
    options: [],
  },
];
