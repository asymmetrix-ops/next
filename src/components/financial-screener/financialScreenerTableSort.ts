import type { FinancialScreenerItem } from "@/app/financials/actions";
import { isEmptyDisplayValue } from "@/lib/emptyDisplay";

export type ColumnSortKind = "text" | "number";

const NOT_SORTABLE = null;

export const FINANCIAL_SCREENER_COLUMN_SORT_KIND: Record<
  string,
  ColumnSortKind | null
> = {
  company: NOT_SORTABLE,
  description: NOT_SORTABLE,
  url: NOT_SORTABLE,
  sector: "text",
  sub_sector: "text",
  ownership: "text",
  hq: "text",
  fte: "number",
  financial_year: "number",
  revenue: "number",
  revenue_growth: "number",
  ebitda: "number",
  ebitda_margin: "number",
  ebit: "number",
  ev: "number",
  ev_revenue: "number",
  ev_ebit: "number",
  ev_ebitda: "number",
  rev_multiple: "number",
};

export function getColumnSortKind(columnKey: string): ColumnSortKind | null {
  return FINANCIAL_SCREENER_COLUMN_SORT_KIND[columnKey] ?? null;
}

const parseSortNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (isEmptyDisplayValue(text)) return null;
  const num = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
};

const parseSortText = (value: unknown): string => {
  if (value == null) return "";
  const text = String(value).trim().toLowerCase();
  return isEmptyDisplayValue(text) ? "" : text;
};

export function getSortValueForColumn(
  item: FinancialScreenerItem,
  columnKey: string
): number | string | null {
  const fin = item.financials ?? {};
  switch (columnKey) {
    case "sector":
      return parseSortText(item.primary_sectors?.[0]?.sector_name);
    case "sub_sector":
      return parseSortText(item.secondary_sectors?.[0]?.sector_name);
    case "ownership":
      return parseSortText(item.ownership_type);
    case "hq":
      return parseSortText(item.location?.country ?? item.location?.city);
    case "fte":
      return parseSortNumber(item.fte);
    case "financial_year":
      return parseSortNumber(item.financial_year);
    case "revenue":
      return parseSortNumber(fin.revenue_m);
    case "revenue_growth":
      return parseSortNumber(fin.rev_growth_pct);
    case "ebitda":
      return parseSortNumber(fin.ebitda_m);
    case "ebitda_margin":
      return parseSortNumber(fin.ebitda_margin_pct);
    case "ebit":
      return parseSortNumber(fin.ebit_m);
    case "ev":
      return parseSortNumber(fin.ev_m);
    case "ev_revenue":
      return parseSortNumber(fin.ev_revenue);
    case "ev_ebit":
      return parseSortNumber(fin.ev_ebit);
    case "ev_ebitda":
      return parseSortNumber(fin.ev_ebitda);
    case "rev_multiple":
      return parseSortNumber(fin.rev_multiple);
    default:
      return null;
  }
}

export function compareSortValues(
  a: number | string | null,
  b: number | string | null,
  dir: "asc" | "desc"
): number {
  const emptyA = a == null || a === "";
  const emptyB = b == null || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
  }
  return dir === "asc" ? cmp : -cmp;
}
