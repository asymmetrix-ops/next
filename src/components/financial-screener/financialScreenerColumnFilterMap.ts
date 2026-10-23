import type { FilterDef } from "@/components/companies/CompaniesFilterBar";
import {
  ALL_FINANCIAL_SCREENER_COLUMN_META,
  type FinancialScreenerColumnMeta,
  type FinancialScreenerColumnType,
} from "./financialScreenerColumnCategories";

export const FILTER_PINNED_TOOLTIP =
  "Pinned automatically — a filter is active on this column.";

export const FILTER_ID_TO_COLUMN_KEY: Record<string, string> = {
  primary_sector: "sector",
  secondary_sector: "sub_sector",
  country: "hq",
  fte: "fte",
  ownership: "ownership",
  revenue: "revenue",
  rev_growth: "revenue_growth",
  ebitda: "ebitda",
  ebitda_margin: "ebitda_margin",
  ebit: "ebit",
  enterprise_value: "ev",
  ev_revenue: "ev_revenue",
  ev_ebit: "ev_ebit",
  ev_ebitda: "ev_ebitda",
  rev_multiple: "rev_multiple",
  financial_year: "financial_year",
};

export const COLUMN_KEY_TO_FILTER_ID: Record<string, string> = Object.fromEntries(
  Object.entries(FILTER_ID_TO_COLUMN_KEY).map(([filterId, columnKey]) => [
    columnKey,
    filterId,
  ])
);

const COLUMN_META_BY_KEY = new Map(
  ALL_FINANCIAL_SCREENER_COLUMN_META.map((column) => [column.columnKey, column])
);

const FILTER_ID_TO_META: Record<string, FinancialScreenerColumnMeta> = {};
for (const [filterId, columnKey] of Object.entries(FILTER_ID_TO_COLUMN_KEY)) {
  const meta = COLUMN_META_BY_KEY.get(columnKey);
  if (meta) FILTER_ID_TO_META[filterId] = meta;
}

function columnTypeToFilterType(type: FinancialScreenerColumnType): FilterDef["type"] {
  switch (type) {
    case "currency":
      return "$";
    case "percent":
      return "%";
    case "number":
    case "multiple":
      return "#";
    default:
      return "Aa";
  }
}

export function getColumnKeysForActiveFilters(
  filterIds: string[],
  ownershipTabActive: boolean
): string[] {
  const keys = new Set<string>();
  for (const filterId of filterIds) {
    const columnKey = FILTER_ID_TO_COLUMN_KEY[filterId];
    if (columnKey) keys.add(columnKey);
  }
  if (ownershipTabActive) {
    keys.add("ownership");
  }
  return Array.from(keys);
}

export function buildFinancialScreenerFilterDefsFromColumns(): FilterDef[] {
  const defs: FilterDef[] = [];
  for (const [filterId, meta] of Object.entries(FILTER_ID_TO_META)) {
    if (filterId === "primary_sector" || filterId === "secondary_sector") continue;
    if (filterId === "country" || filterId === "ownership") continue;
    if (filterId === "fte") continue;

    const editor: FilterDef["editor"] =
      meta.type === "text" || meta.type === "paragraph"
        ? "enum"
        : "range";

    defs.push({
      id: filterId,
      label: meta.label,
      fullLabel: meta.label,
      category:
        meta.columnKey === "financial_year"
          ? "financial"
          : "financial",
      type: columnTypeToFilterType(meta.type),
      editor,
      unit: meta.type === "currency" ? "m" : meta.type === "percent" ? "%" : undefined,
    });
  }
  return defs;
}
