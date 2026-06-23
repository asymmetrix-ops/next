import { isEmptyDisplayValue } from "@/lib/emptyDisplay";
import {
  getInvestorFieldAliasesForColumn,
  INVESTOR_COLUMN_FIELD_ALIASES,
} from "./investorsColumnFields";

export type ColumnSortKind = "text" | "number";

const NOT_SORTABLE = null;

export const INVESTOR_COLUMN_SORT_KIND: Record<string, ColumnSortKind | null> = {
  logo: NOT_SORTABLE,
  name: NOT_SORTABLE,
  type: "text",
  description: NOT_SORTABLE,
  follow: NOT_SORTABLE,
  portfolio_companies: "number",
  primary_sectors: "text",
  linkedin_members: "number",
  country: "text",
  hq: "text",
  website: NOT_SORTABLE,
  linkedin_url: NOT_SORTABLE,
  year_founded: "number",
  total_investments: "number",
  years_since_last_investment: "number",
  sub_region: "text",
  state: "text",
  city: "text",
};

export function getInvestorColumnSortKind(
  columnKey: string
): ColumnSortKind | null {
  return INVESTOR_COLUMN_SORT_KIND[columnKey] ?? null;
}

const readMergedField = (
  row: Record<string, unknown>,
  aliases: readonly string[]
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

export const parseInvestorSortNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const days = rec.days_since;
    if (days != null) {
      const parsedDays = Number(days);
      if (Number.isFinite(parsedDays)) return parsedDays;
    }
  }
  const text = String(value).trim();
  if (isEmptyDisplayValue(text)) return null;
  const num = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
};

export const parseInvestorSortText = (value: unknown): string => {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => parseInvestorSortText(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return parseInvestorSortText(rec.display ?? rec.name ?? rec.sector_name);
  }
  return String(value).trim().toLowerCase();
};

export function getInvestorSortValueForColumn(
  row: Record<string, unknown>,
  columnKey: string
): string | number | null {
  const aliases =
    INVESTOR_COLUMN_FIELD_ALIASES[columnKey] ??
    getInvestorFieldAliasesForColumn(columnKey);
  const raw = readMergedField(row, aliases);
  const kind = getInvestorColumnSortKind(columnKey);

  if (kind === "number") {
    if (columnKey === "years_since_last_investment") {
      const rec =
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : null;
      const days = rec?.days_since;
      if (days != null) {
        const parsedDays = Number(days);
        if (Number.isFinite(parsedDays)) return parsedDays;
      }
    }
    return parseInvestorSortNumber(raw);
  }
  if (kind === "text") {
    return parseInvestorSortText(raw);
  }
  return null;
}

export function compareInvestorSortValues(
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
    cmp = String(a).localeCompare(String(b));
  }
  return direction === "asc" ? cmp : -cmp;
}
