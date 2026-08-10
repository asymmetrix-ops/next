import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import type { ExportColumnDef } from "./types";

/** Cell payload for spreadsheet export — numbers are written as Excel numerics. */
export type ExportCellValue = string | number | null;

export const EXCEL_NUM_FMT = {
  millions: "#,##0",
  millionsDecimal: "#,##0.0",
  percent: '0.0"%"',
  count: "#,##0",
  whole: "#,##0",
  decimal: "#,##0.0",
  multiple: '0.0"x"',
  integer: "0",
} as const;

const PERCENT_COLUMN_KEY_SUFFIXES = ["_pc", "_percent", "_margin"];
const MONEY_MILLIONS_COLUMN_KEYS = new Set([
  "revenue_m",
  "ebitda_m",
  "enterprise_value",
  "ev",
  "ebit_m",
  "arr_m",
  "subscription_revenue_m",
  "investment_amount",
]);
const MULTIPLE_COLUMN_KEYS = new Set([
  "revenue_multiple",
  "ev_revenue_x",
  "ev_ebitda_x",
  "ev_revenue",
  "ev_ebit",
  "ev_ebitda",
  "rev_multiple",
]);
const COUNT_COLUMN_KEYS = new Set([
  "id",
  "linkedin_members",
  "no_of_clients",
  "no_employees",
  "no_clients",
  "fte",
  "events_advised",
  "portfolio_companies",
]);

export function parseExportNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "-" || trimmed === EMPTY_DISPLAY) return null;

  const normalized = trimmed
    .replace(/,/g, "")
    .replace(/[%x$£€¥]/gi, "")
    .replace(/\s+/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPercentColumn(column: ExportColumnDef): boolean {
  if (column.type === "percent") return true;
  const key = column.key.toLowerCase();
  if (key.includes("margin") || key === "nrr" || key === "rule_of_40") return true;
  return PERCENT_COLUMN_KEY_SUFFIXES.some((suffix) => key.endsWith(suffix));
}

function isMoneyMillionsColumn(column: ExportColumnDef): boolean {
  if (column.type === "currency") return true;
  return MONEY_MILLIONS_COLUMN_KEYS.has(column.key);
}

function isMultipleColumn(column: ExportColumnDef): boolean {
  if (column.type === "multiple") return true;
  return MULTIPLE_COLUMN_KEYS.has(column.key);
}

function isCountColumn(column: ExportColumnDef): boolean {
  if (column.type === "number" && COUNT_COLUMN_KEYS.has(column.key)) return true;
  return column.key === "id";
}

export function isNumericExportColumn(column: ExportColumnDef): boolean {
  if (
    column.type === "number" ||
    column.type === "percent" ||
    column.type === "currency" ||
    column.type === "multiple"
  ) {
    return true;
  }
  return (
    isPercentColumn(column) ||
    isMoneyMillionsColumn(column) ||
    isMultipleColumn(column) ||
    isCountColumn(column)
  );
}

export function excelNumFmtForExportColumn(
  column: ExportColumnDef
): string | undefined {
  if (isMultipleColumn(column)) return EXCEL_NUM_FMT.multiple;
  if (isPercentColumn(column)) return EXCEL_NUM_FMT.percent;
  if (isMoneyMillionsColumn(column)) return EXCEL_NUM_FMT.millionsDecimal;
  if (isCountColumn(column)) return EXCEL_NUM_FMT.count;
  if (column.type === "number") return EXCEL_NUM_FMT.decimal;
  return undefined;
}

export function coerceExportCellValue(
  column: ExportColumnDef,
  display: string,
  raw?: unknown
): ExportCellValue {
  if (display === EMPTY_DISPLAY || display === "-" || display.trim() === "") {
    return null;
  }

  if (!isNumericExportColumn(column)) {
    return display;
  }

  const fromRaw = raw !== undefined ? parseExportNumber(raw) : null;
  if (fromRaw != null) return fromRaw;

  const fromDisplay = parseExportNumber(display);
  if (fromDisplay != null) return fromDisplay;

  return display;
}

export function writeExportCell(
  cell: import("exceljs").Cell,
  value: ExportCellValue,
  numFmt?: string
): void {
  if (value == null) {
    cell.value = null;
    return;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    cell.value = value;
    if (numFmt) cell.numFmt = numFmt;
    return;
  }

  cell.value = value;
}
