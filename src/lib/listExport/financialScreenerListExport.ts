import {
  FINANCIAL_SCREENER_COLUMN_CATEGORIES,
  type FinancialScreenerColumnType,
} from "@/components/financial-screener/financialScreenerColumnCategories";
import type { FinancialScreenerItem } from "@/app/financials/actions";
import { fetchFinancialScreenerServer } from "@/app/financials/actions";
import {
  applyClientFilters,
  type FinancialScreenerFilters,
} from "@/components/financial-screener/financialScreenerFilterPayload";
import { formatCompanyColumnDisplay } from "@/lib/companyTableData";
import type { CompanyColumnType } from "@/components/companies/companiesColumnCategories";
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
import {
  EXPORT_ALL_ENTITIES_CAP,
  type ExportColumnDef,
  type ListExportRequest,
} from "./types";

const EXPORT_PER_PAGE = 100;
const MAX_EXPORT_PAGES = 500;

const COLUMN_TYPE_BY_KEY = new Map<string, FinancialScreenerColumnType>(
  FINANCIAL_SCREENER_COLUMN_CATEGORIES.flatMap((category) =>
    category.columns.map((column) => [column.columnKey, column.type])
  )
);

/** Export categories align with the Companies XLSX template (`name` + `url` keys). */
export const FINANCIAL_SCREENER_EXPORT_CATEGORIES =
  FINANCIAL_SCREENER_COLUMN_CATEGORIES.map((category) => ({
    name: category.name,
    columns: category.columns.map((column) => ({
      columnKey: column.columnKey === "company" ? "name" : column.columnKey,
      label: column.label,
      type: column.type,
    })),
  }));

const EXTRA_FINANCIAL_SCREENER_COLUMNS: ExportColumnDef[] = [
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

const FORMAT_KEY_BY_COLUMN: Record<string, string> = {
  revenue: "revenue_m",
  ebitda: "ebitda_m",
  ebit: "ebit_m",
  rev_multiple: "revenue_multiple",
  revenue_growth: "rev_growth_pc",
  ebitda_margin: "ebitda_margin",
  ev_revenue: "ev_revenue_x",
  ev_ebit: "ev_ebit_x",
  ev_ebitda: "ev_ebitda_x",
};

function mapVisibleKeysForExport(keys: string[]): string[] {
  return keys.map((key) => (key === "company" ? "name" : key));
}

function normalizeSelectedCompanyIds(selectedIds: number[]): number[] {
  return selectedIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
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
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return EMPTY_DISPLAY;
    return trimmed;
  }
  return String(value);
}

export function financialScreenerItemToExportRow(
  item: FinancialScreenerItem
): Record<string, unknown> {
  const fin = item.financials ?? {};
  const primarySectors = (item.primary_sectors ?? [])
    .map((sector) => sector.sector_name?.trim())
    .filter(Boolean)
    .join(", ");
  const secondarySectors = (item.secondary_sectors ?? [])
    .map((sector) => sector.sector_name?.trim())
    .filter(Boolean)
    .join(", ");
  const hq = [item.location?.city, item.location?.country]
    .filter(Boolean)
    .join(", ");

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    url: item.url ?? "",
    sector: primarySectors || EMPTY_DISPLAY,
    sub_sector: secondarySectors || EMPTY_DISPLAY,
    ownership: item.ownership_type ?? "",
    fte: item.fte,
    hq,
    financial_year: item.financial_year,
    revenue: fin.revenue_m,
    revenue_growth: fin.rev_growth_pct,
    ebitda: fin.ebitda_m,
    ebitda_margin: fin.ebitda_margin_pct,
    ebit: fin.ebit_m,
    ev: fin.ev_m,
    ev_revenue: fin.ev_revenue,
    ev_ebit: fin.ev_ebit,
    ev_ebitda: fin.ev_ebitda,
    rev_multiple: fin.rev_multiple,
  };
}

function orderRowsBySelectedIds(
  rows: Record<string, unknown>[],
  selectedIds: number[]
): Record<string, unknown>[] {
  const byId = new Map(
    rows
      .map((row) => [Number(row.id), row] as const)
      .filter(([id]) => Number.isFinite(id) && id > 0)
  );
  return selectedIds
    .map((id) => byId.get(id))
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

function resolveCurrencyCode(): string {
  return (
    platformCurrencyIdToCode(readPlatformCurrencyIdClient()) ??
    DEFAULT_PLATFORM_CURRENCY
  );
}

export function getFinancialScreenerCellValue(
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
    const id = Number(row.id);
    return Number.isFinite(id) && id > 0 ? getProfileUrl(id) : EMPTY_DISPLAY;
  }

  const textColumns = new Set([
    "name",
    "description",
    "url",
    "sector",
    "sub_sector",
    "ownership",
    "hq",
    "financial_year",
  ]);
  const raw = row[column.key];
  if (textColumns.has(column.key)) {
    return toPlainText(raw);
  }

  const columnType = (COLUMN_TYPE_BY_KEY.get(
    column.key === "name" ? "company" : column.key
  ) ?? column.type) as CompanyColumnType;
  const formatKey = FORMAT_KEY_BY_COLUMN[column.key] ?? column.key;

  return formatCompanyColumnDisplay(formatKey, columnType, raw, currency);
}

export function getFinancialScreenerCellExportValue(
  row: Record<string, unknown>,
  column: ExportColumnDef,
  currencyCode?: string
): ExportCellValue {
  const textColumns = new Set([
    "name",
    "description",
    "url",
    "sector",
    "sub_sector",
    "ownership",
    "hq",
    "financial_year",
    "asymmetrix_url",
  ]);

  if (textColumns.has(column.key)) {
    const display = getFinancialScreenerCellValue(row, column, currencyCode);
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

  const display = getFinancialScreenerCellValue(row, column, currencyCode);
  return coerceExportCellValue(column, display, raw);
}

async function fetchAllFinancialScreenerForExport(
  filters: FinancialScreenerFilters,
  expectedTotalCount?: number
): Promise<Record<string, unknown>[]> {
  const allItems: FinancialScreenerItem[] = [];
  let page = 1;
  let totalPages = 1;
  const resolvedTotalCount = expectedTotalCount ?? 0;

  while (page <= totalPages && page <= MAX_EXPORT_PAGES) {
    const response = await fetchFinancialScreenerServer({
      ...filters,
      page,
      per_page: EXPORT_PER_PAGE,
    });
    if (!response) {
      throw new Error("Failed to fetch financial screener for export");
    }

    allItems.push(...response.items);
    totalPages = response.pagination.total_pages;

    if (response.items.length === 0) break;
    if (resolvedTotalCount > 0 && allItems.length >= resolvedTotalCount) break;
    if (allItems.length >= EXPORT_ALL_ENTITIES_CAP) break;
    if (response.items.length < EXPORT_PER_PAGE) break;

    page += 1;
  }

  const filtered = applyClientFilters(
    allItems.slice(0, EXPORT_ALL_ENTITIES_CAP),
    filters
  );
  return filtered.map(financialScreenerItemToExportRow);
}

export async function exportFinancialScreenerList(
  request: ListExportRequest,
  filters: FinancialScreenerFilters,
  visibleColumnKeys: string[],
  expectedTotalCount?: number
): Promise<void> {
  let rows: Record<string, unknown>[];

  if (request.scope === "selected") {
    const selectedIds = normalizeSelectedCompanyIds(request.selectedIds ?? []);
    if (selectedIds.length === 0) return;

    const allRows = await fetchAllFinancialScreenerForExport(
      filters,
      expectedTotalCount
    );
    rows = orderRowsBySelectedIds(allRows, selectedIds);
  } else {
    rows = await fetchAllFinancialScreenerForExport(filters, expectedTotalCount);
  }

  if (rows.length === 0) return;

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Financial Screener",
      filePrefix: "FinancialScreener",
      categories: FINANCIAL_SCREENER_COLUMN_CATEGORIES.map((category) => ({
        name: category.name,
        columns: category.columns.map((column) => ({
          columnKey: column.columnKey,
          label: column.label,
          type: column.type,
        })),
      })),
      allColumnsCategories: FINANCIAL_SCREENER_EXPORT_CATEGORIES,
      visibleColumnKeys: mapVisibleKeysForExport(visibleColumnKeys),
      extraLeadingColumns: EXTRA_FINANCIAL_SCREENER_COLUMNS,
    },
    rows,
    getEntityName: (row) => String(row.name ?? "—"),
    getCellValue: getFinancialScreenerCellValue,
    getCellExportValue: getFinancialScreenerCellExportValue,
  });
}
