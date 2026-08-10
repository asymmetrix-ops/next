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
  currencyCode?: string
): string {
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

export function getFinancialBenchmarkCellExportValue(
  row: Record<string, unknown>,
  column: ExportColumnDef,
  currencyCode?: string
): ExportCellValue {
  if (TEXT_COLUMN_KEYS.has(column.key)) {
    const display = getFinancialBenchmarkCellValue(row, column, currencyCode);
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

  const display = getFinancialBenchmarkCellValue(row, column, currencyCode);
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
    getCellValue: getFinancialBenchmarkCellValue,
    getCellExportValue: getFinancialBenchmarkCellExportValue,
  });
}
