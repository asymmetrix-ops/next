/** Sort behaviour per Companies Search column (functional spec). */

import { isEmptyDisplayValue } from "@/lib/emptyDisplay";
import {
  COMPANY_COLUMN_FIELD_ALIASES,
  getFieldAliasesForColumn,
} from "./companiesColumnFields";

export type ColumnSortKind = "text" | "number";

const NOT_SORTABLE = null;

export const COLUMN_SORT_KIND: Record<string, ColumnSortKind | null> = {
  logo: NOT_SORTABLE,
  name: NOT_SORTABLE,
  description: NOT_SORTABLE,
  website: NOT_SORTABLE,
  follow: NOT_SORTABLE,
  primary_sectors: "text",
  secondary_sectors: "text",
  ownership: "text",
  linkedin_members: "number",
  year_founded: "number",
  hq: "text",
  city: "text",
  state: "text",
  linkedin_url: NOT_SORTABLE,
  linkedin_growth: "number",
  investors: "text",
  years_since_last_investment: NOT_SORTABLE,
  lifecycle_stage: "text",
  product_type: "text",
  data_collection_method: "text",
  revenue_model: "text",
  transaction_status: "text",
  created_at: "text",
  revenue_m: "number",
  ebitda_m: "number",
  enterprise_value: "number",
  revenue_multiple: "number",
  revenue_growth: "number",
  ebitda_margin: "number",
  rule_of_40: "number",
  arr_pc: "number",
  arr_m: "number",
  churn_pc: "number",
  grr_pc: "number",
  nrr: "number",
  new_client_growth_pc: "number",
  upsell_pc: "number",
  cross_sell_pc: "number",
  price_increase_pc: "number",
  rev_expansion_pc: "number",
  ebit_m: "number",
  no_of_clients: "number",
  rev_per_client: "number",
  no_employees: "number",
  rev_per_employee: "number",
  financial_year: "number",
};

export function getColumnSortKind(columnKey: string): ColumnSortKind | null {
  return COLUMN_SORT_KIND[columnKey] ?? null;
}

const isEmptySortValue = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === "string") return isEmptyDisplayValue(value);
  return false;
};

export const parseSortNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (isEmptySortValue(text)) return null;
  const num = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
};

export const parseSortText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => parseSortText(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return parseSortText(
      rec.sector_name ?? rec.name ?? rec.ownership ?? rec.display ?? rec.label
    );
  }
  return String(value).trim().toLowerCase();
};

const SORT_FIELD_ALIASES: Record<string, string[]> = Object.fromEntries(
  Object.entries(COMPANY_COLUMN_FIELD_ALIASES).map(([key, aliases]) => [
    key,
    [...aliases],
  ])
);

const readMergedField = (
  row: Record<string, unknown>,
  aliases: string[]
): unknown => {
  for (const alias of aliases) {
    const parts = alias.split(".");
    let current: unknown = row;
    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current != null && current !== "") return current;
  }
  return undefined;
};

export function getSortValueForColumn(
  row: Record<string, unknown>,
  columnKey: string
): string | number | null {
  const aliases = SORT_FIELD_ALIASES[columnKey] ?? getFieldAliasesForColumn(columnKey);
  const raw = readMergedField(row, aliases);
  const kind = getColumnSortKind(columnKey);

  if (kind === "number") {
    return parseSortNumber(raw);
  }
  if (kind === "text") {
    if (
      (columnKey === "primary_sectors" || columnKey === "secondary_sectors") &&
      Array.isArray(raw)
    ) {
      return parseSortText(raw);
    }
    return parseSortText(raw);
  }
  return null;
}

export function compareSortValues(
  a: string | number | null,
  b: string | number | null,
  direction: "asc" | "desc"
): number {
  const aEmpty = a == null || a === "";
  const bEmpty = b == null || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
  }

  return direction === "asc" ? cmp : -cmp;
}
