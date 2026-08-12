import type { FinRow } from "@/app/financials-tsx/types";
import {
  FI_PEER_COLUMN_CATEGORIES,
} from "@/lib/financialIntelligence/fiPeerColumnCategories";
import type { CompanyColumnType } from "@/components/companies/companiesColumnCategories";
import { formatCompanyColumnDisplay } from "@/lib/companyTableData";
import {
  DEFAULT_PLATFORM_CURRENCY,
  platformCurrencyIdToCode,
  readPlatformCurrencyIdClient,
} from "@/lib/platformCurrency";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import {
  coerceExportCellValue,
  isNumericExportColumn,
  parseExportNumber,
  type ExportCellValue,
} from "./exportCellValue";
import { runGenericListExport } from "./runListExport";
import type { ExportColumnDef, ListExportRequest } from "./types";
import type { FiPeerAggregateMode } from "@/lib/financialIntelligence/types";
import type { Currency, FXRates } from "@/lib/fxRates";
import { CURRENCY_OPTIONS, convertCurrency, getFXRates } from "@/lib/fxRates";

const MULTIPLE_COLUMN_KEYS = new Set([
  "rev_multiple",
  "ev_revenue",
  "ev_ebitda",
  "ev_ebit",
]);

const PER_UNIT_CURRENCY_KEYS = new Set(["rev_per_client", "rev_per_employee"]);

const COUNT_COLUMN_KEYS = new Set(["num_clients", "num_employees"]);

interface FiBenchmarkExportFormatContext {
  currency: Currency;
  fxRates: FXRates | null;
  currencySymbol: string;
}

function resolveExportFormatContext(
  input: Pick<FinancialBenchmarkExportInput, "displayCurrency" | "fxRates">
): FiBenchmarkExportFormatContext {
  const currency = (input.displayCurrency ??
    resolveCurrencyCode()) as Currency;
  const currencySymbol =
    CURRENCY_OPTIONS.find((option) => option.value === currency)?.symbol ?? "$";
  return {
    currency,
    fxRates: input.fxRates ?? null,
    currencySymbol,
  };
}

function convertForDisplay(
  value: number,
  currency: Currency,
  fxRates: FXRates | null
): number {
  if (currency === "USD" || !fxRates) return value;
  return convertCurrency(value, currency, fxRates) ?? value;
}

/** Millions-scale numeric value for export (header carries the unit, e.g. Revenue (m)). */
function toMillionsExportNumber(
  value: unknown,
  ctx: FiBenchmarkExportFormatContext
): number | null {
  const num = parseExportNumber(value);
  if (num == null) return null;
  const converted = convertForDisplay(num, ctx.currency, ctx.fxRates);
  return Math.round(converted * 10) / 10;
}

function formatMillionsDisplay(
  value: unknown,
  ctx: FiBenchmarkExportFormatContext
): string {
  const num = toMillionsExportNumber(value, ctx);
  if (num == null) return EMPTY_DISPLAY;
  return String(num);
}

/** Per-unit currency columns are exported as plain numbers (no k/m suffix). */
function toPerUnitExportNumber(
  value: unknown,
  ctx: FiBenchmarkExportFormatContext
): number | null {
  const num = parseExportNumber(value);
  if (num == null) return null;
  const converted = convertForDisplay(num, ctx.currency, ctx.fxRates);
  return Math.round(converted);
}

function formatPerUnitDisplay(
  value: unknown,
  ctx: FiBenchmarkExportFormatContext
): string {
  const num = toPerUnitExportNumber(value, ctx);
  if (num == null) return EMPTY_DISPLAY;
  return String(num);
}

function formatNumericDisplay(value: unknown): string {
  const num = parseExportNumber(value);
  if (num == null) return EMPTY_DISPLAY;
  return String(Math.round(num * 10) / 10);
}

const COLUMN_TYPE_BY_KEY = new Map<string, CompanyColumnType>(
  FI_PEER_COLUMN_CATEGORIES.flatMap((category) =>
    category.columns.map((column) => [column.columnKey, column.type as CompanyColumnType])
  )
);

/** All-columns sheet uses `name` (Companies template convention). */
export const FI_BENCHMARK_EXPORT_CATEGORIES = FI_PEER_COLUMN_CATEGORIES.map(
  (category) => ({
    name: category.name,
    columns: category.columns.map((column) => ({
      columnKey: column.columnKey === "company" ? "name" : column.columnKey,
      label: column.label,
      type: column.type,
    })),
  })
);

const EXTRA_FI_BENCHMARK_COLUMNS: ExportColumnDef[] = [
  {
    key: "id",
    label: "ID",
    categoryName: "Identity",
    type: "number",
  },
  {
    key: "asymmetrix_url",
    label: "Asymmetrix URL",
    categoryName: "Identity",
    type: "url",
  },
];

const TEXT_COLUMN_KEYS = new Set([
  "name",
  "sector",
  "hq",
  "ownership",
  "financial_year",
  "asymmetrix_url",
]);

function mapVisibleKeysForExport(keys: string[]): string[] {
  return keys.map((key) => (key === "company" ? "name" : key));
}

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/company/${id}`;
}

function toPlainText(value: unknown): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : EMPTY_DISPLAY;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || EMPTY_DISPLAY;
  }
  return String(value);
}

function resolveCurrencyCode(): string {
  return (
    platformCurrencyIdToCode(readPlatformCurrencyIdClient()) ??
    DEFAULT_PLATFORM_CURRENCY
  );
}

function finNumericField(
  value: number | undefined,
  treatZeroAsEmpty = false
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (treatZeroAsEmpty && value === 0) return null;
  return value;
}

export function finRowToExportRow(row: FinRow): Record<string, unknown> {
  const id =
    row.companyId != null && Number.isFinite(row.companyId) && row.companyId > 0
      ? row.companyId
      : null;

  return {
    id,
    name: row.name?.trim() || EMPTY_DISPLAY,
    asymmetrix_url: id ? getProfileUrl(id) : null,
    financial_year: row.financial_year ?? null,
    sector: [row.primary, row.secondary].filter(Boolean).join(" / ") || null,
    hq: row.hq?.trim() || row.country?.trim() || null,
    ownership: row.ownership || null,
    revenue: finNumericField(row.revenue),
    ebitda: finNumericField(row.ebitda),
    ev: finNumericField(row.ev),
    rev_multiple: finNumericField(row.rev_multiple),
    rev_growth: finNumericField(row.rev_growth),
    ebitda_margin: finNumericField(row.ebitda_margin),
    rule_of_40: finNumericField(row.rule_of_40),
    ev_revenue: finNumericField(row.ev_revenue),
    ev_ebitda: finNumericField(row.ev_ebitda),
    ev_ebit: finNumericField(row.ev_ebit),
    ebit: finNumericField(row.ebit),
    subscription_revenue_pc: finNumericField(row.subscription_revenue_pc),
    subscription_revenue_m: finNumericField(row.subscription_revenue_m),
    churn: finNumericField(row.churn),
    grr: finNumericField(row.grr),
    nrr: finNumericField(row.nrr),
    new_clients_rev: finNumericField(row.new_clients_rev),
    upsell: finNumericField(row.upsell),
    cross_sell: finNumericField(row.cross_sell),
    price_increase: finNumericField(row.price_increase),
    revenue_expansion: finNumericField(row.revenue_expansion),
    num_clients: finNumericField(row.num_clients),
    rev_per_client: finNumericField(row.rev_per_client),
    num_employees: finNumericField(row.num_employees),
    rev_per_employee: finNumericField(row.rev_per_employee),
  };
}

function columnTypeForExport(column: ExportColumnDef): CompanyColumnType {
  const lookupKey = column.key === "name" ? "company" : column.key;
  return (COLUMN_TYPE_BY_KEY.get(lookupKey) ?? column.type) as CompanyColumnType;
}

export function getFinancialBenchmarkCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef,
  formatContext?: FiBenchmarkExportFormatContext,
  currencyCode?: string
): string {
  if (formatContext) {
    const raw = row[column.key];
    const columnType = columnTypeForExport(column);

    if (column.key === "id") {
      const id = Number(row.id);
      return Number.isFinite(id) && id > 0 ? String(id) : EMPTY_DISPLAY;
    }

    if (column.key === "asymmetrix_url") {
      const url = row.asymmetrix_url;
      return typeof url === "string" && url.trim() ? url.trim() : EMPTY_DISPLAY;
    }

    if (TEXT_COLUMN_KEYS.has(column.key)) {
      return toPlainText(raw);
    }

    if (columnType === "currency") {
      return PER_UNIT_CURRENCY_KEYS.has(column.key)
        ? formatPerUnitDisplay(raw, formatContext)
        : formatMillionsDisplay(raw, formatContext);
    }

    if (columnType === "percent" || column.key === "rule_of_40") {
      return formatNumericDisplay(raw);
    }

    if (columnType === "number" && MULTIPLE_COLUMN_KEYS.has(column.key)) {
      return formatNumericDisplay(raw);
    }

    if (COUNT_COLUMN_KEYS.has(column.key)) {
      const num = parseExportNumber(raw);
      return num != null
        ? Math.round(num).toLocaleString("en-US")
        : EMPTY_DISPLAY;
    }
  }

  const currency = currencyCode ?? resolveCurrencyCode();

  if (column.key === "id") {
    const id = Number(row.id);
    return Number.isFinite(id) && id > 0 ? String(id) : EMPTY_DISPLAY;
  }

  if (column.key === "asymmetrix_url") {
    const url = row.asymmetrix_url;
    return typeof url === "string" && url.trim() ? url.trim() : EMPTY_DISPLAY;
  }

  const raw = row[column.key];
  if (TEXT_COLUMN_KEYS.has(column.key)) {
    return toPlainText(raw);
  }

  return formatCompanyColumnDisplay(
    column.key === "name" ? "company" : column.key,
    columnTypeForExport(column),
    raw,
    currency
  );
}

function getFinancialBenchmarkNumericExportValue(
  row: Record<string, unknown>,
  column: ExportColumnDef,
  formatContext: FiBenchmarkExportFormatContext
): ExportCellValue {
  const raw = row[column.key];
  const columnType = columnTypeForExport(column);

  if (columnType === "currency") {
    return PER_UNIT_CURRENCY_KEYS.has(column.key)
      ? toPerUnitExportNumber(raw, formatContext)
      : toMillionsExportNumber(raw, formatContext);
  }

  if (
    columnType === "percent" ||
    column.key === "rule_of_40" ||
    (columnType === "number" && MULTIPLE_COLUMN_KEYS.has(column.key))
  ) {
    return parseExportNumber(raw);
  }

  if (COUNT_COLUMN_KEYS.has(column.key)) {
    return parseExportNumber(raw);
  }

  return null;
}

export function getFinancialBenchmarkCellExportValue(
  row: Record<string, unknown>,
  column: ExportColumnDef,
  formatContext?: FiBenchmarkExportFormatContext,
  currencyCode?: string
): ExportCellValue {
  if (formatContext) {
    if (column.key === "id") {
      const id = Number(row.id);
      return Number.isFinite(id) && id > 0 ? id : null;
    }

    if (TEXT_COLUMN_KEYS.has(column.key) || column.key === "asymmetrix_url") {
      const display = getFinancialBenchmarkCellValue(
        row,
        column,
        formatContext,
        currencyCode
      );
      if (
        display === EMPTY_DISPLAY ||
        display === "-" ||
        display.trim() === ""
      ) {
        return null;
      }
      return display;
    }

    return getFinancialBenchmarkNumericExportValue(row, column, formatContext);
  }

  if (TEXT_COLUMN_KEYS.has(column.key)) {
    const display = getFinancialBenchmarkCellValue(row, column, undefined, currencyCode);
    return coerceExportCellValue(column, display);
  }

  if (column.key === "id") {
    const id = Number(row.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  const raw = row[column.key];
  if (isNumericExportColumn(column)) {
    const numeric = parseExportNumber(raw);
    if (numeric != null) return numeric;
  }

  const display = getFinancialBenchmarkCellValue(
    row,
    column,
    undefined,
    currencyCode
  );
  return coerceExportCellValue(column, display, raw);
}

function categoriesForVisibleExport() {
  return FI_PEER_COLUMN_CATEGORIES.map((category) => ({
    ...category,
    columns: category.columns.map((column) => ({
      ...column,
      columnKey: column.columnKey === "company" ? "name" : column.columnKey,
    })),
  }));
}

export interface FinancialBenchmarkExportInput {
  targetRow: FinRow;
  aggregateRow: FinRow;
  peerRows: FinRow[];
  visibleColumnKeys: string[];
  peerAggregateMode?: FiPeerAggregateMode;
  displayCurrency?: Currency;
  fxRates?: FXRates | null;
}

export async function exportFinancialBenchmarkList(
  request: ListExportRequest,
  input: FinancialBenchmarkExportInput
): Promise<void> {
  const rows = [
    finRowToExportRow(input.targetRow),
    finRowToExportRow(input.aggregateRow),
    ...input.peerRows.map(finRowToExportRow),
  ];

  if (rows.length === 0) return;

  const fxRates = input.fxRates ?? (await getFXRates());
  const formatContext = resolveExportFormatContext({
    displayCurrency: input.displayCurrency,
    fxRates,
  });

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Financial Benchmark",
      filePrefix: "FinancialBenchmark",
      categories: categoriesForVisibleExport().map((category) => ({
        name: category.name,
        columns: category.columns.map((column) => ({
          columnKey: column.columnKey,
          label: column.label,
          type: column.type,
        })),
      })),
      allColumnsCategories: FI_BENCHMARK_EXPORT_CATEGORIES,
      visibleColumnKeys: mapVisibleKeysForExport(input.visibleColumnKeys),
      extraLeadingColumns: EXTRA_FI_BENCHMARK_COLUMNS,
    },
    rows,
    getEntityName: (row) => String(row.name ?? "—"),
    getCellValue: (row, column) =>
      getFinancialBenchmarkCellValue(row, column, formatContext),
    getCellExportValue: (row, column) =>
      getFinancialBenchmarkCellExportValue(row, column, formatContext),
  });
}
