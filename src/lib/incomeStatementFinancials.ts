import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatPercentValue } from "@/lib/companyTableData";
import type { EmployeeTimeSeriesPoint } from "@/lib/companyLinkedIn";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import { buildDualCurrencyDisplay, type FinancialMetricFxInfo } from "@/lib/fxDisplay";
import type { CurrencyDisplayMode } from "@/lib/financialsCurrencyToggle";
import {
  formatIncomeStatementPeriodLabel,
  readIncomeStatementReportedCurrency,
  readIncomeStatementReportedValue,
  resolveIncomeStatementCurrency,
  sortIncomeStatementRowsAsc,
  type NormalizedIncomeStatementRow,
} from "@/lib/incomeStatement";
import { resolveLinkedInEmployeeCountForYear } from "@/lib/companyLinkedIn";

export type IncomeStatementExportFormat =
  | "millions_from_units"
  | "percent"
  | "count"
  | "whole";

export type IncomeStatementCellValue = {
  display: string;
  nativeDisplay?: string | null;
  nativeRaw?: number | null;
  fxTooltip?: string | null;
};

export type IncomeStatementMetricRow = {
  key: string;
  label: string;
  values: string[];
  cells: IncomeStatementCellValue[];
  /** Unformatted numeric values aligned with `values` for spreadsheet export. */
  rawValues: (number | null)[];
  nativeRawValues: (number | null)[];
  exportFormat: IncomeStatementExportFormat;
  yoy: string;
};

export type IncomeStatementFinancialsViewModel = {
  title: string;
  currency: string;
  years: (number | null)[];
  columnLabels: string[];
  /** Unique key per period column (quarter, fiscal year, etc.). */
  columnKeys: string[];
  metrics: IncomeStatementMetricRow[];
  /** Income statement rows are sourced from public filings. */
  sourceType: FiMetricSourceType;
};

function computeMarginPct(
  numerator: number | null | undefined,
  revenue: number | null | undefined
): number | null {
  if (
    numerator == null ||
    revenue == null ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(revenue) ||
    revenue === 0
  ) {
    return null;
  }
  return (numerator / revenue) * 100;
}

function resolveMarginPct(
  row: NormalizedIncomeStatementRow,
  type: "ebitda" | "ebit"
): number | null {
  if (type === "ebitda") {
    if (row.ebitda == null) return null;
    const computed = computeMarginPct(row.ebitda, row.revenue);
    if (computed != null) return computed;
    return row.ebitda_margin_pc ?? null;
  }

  if (row.ebit == null) return null;
  const computed = computeMarginPct(row.ebit, row.revenue);
  if (computed != null) return computed;
  return row.ebit_margin_pc ?? null;
}

function formatMarginValue(
  row: NormalizedIncomeStatementRow,
  type: "ebitda" | "ebit"
): string {
  const margin = resolveMarginPct(row, type);
  if (margin == null) return "-";
  return formatPercentValue(margin);
}

function formatMoneyMillions(
  value: number | null | undefined,
  currency: string,
  fx?: FinancialMetricFxInfo | null,
  row?: NormalizedIncomeStatementRow,
  field?: "revenue" | "ebit" | "ebitda"
): IncomeStatementCellValue {
  if (value == null || !Number.isFinite(value)) {
    return { display: "-" };
  }
  const primary = appendMetricCurrency(
    Math.round(value / 1_000_000).toLocaleString(),
    currency
  );
  const dual = buildDualCurrencyDisplay(primary, fx, "money_from_units");
  if (dual.nativeDisplay) {
    return {
      display: dual.display,
      nativeDisplay: dual.nativeDisplay,
      nativeRaw: fx?.native_value ?? null,
      fxTooltip: dual.fxTooltip,
    };
  }

  if (row && field) {
    const reportedValue = readIncomeStatementReportedValue(row, field);
    const reportedCurrency = readIncomeStatementReportedCurrency(row, field);
    if (reportedValue != null && reportedCurrency) {
      const nativeDisplay = appendMetricCurrency(
        Math.round(reportedValue / 1_000_000).toLocaleString(),
        reportedCurrency
      );
      return {
        display: primary,
        nativeDisplay,
        nativeRaw: reportedValue,
      };
    }
  }

  const reportedCurrency = row?.reported_currency ?? row?.statement_currency;
  const platformCurrency = currency.trim().toUpperCase();
  if (
    reportedCurrency &&
    reportedCurrency.trim().toUpperCase() !== platformCurrency
  ) {
    const nativeDisplay = appendMetricCurrency(
      Math.round(value / 1_000_000).toLocaleString(),
      reportedCurrency
    );
    return {
      display: primary,
      nativeDisplay,
      nativeRaw: value,
    };
  }

  return { display: primary };
}

function formatRevenuePerFte(
  value: number | null | undefined,
  currency: string,
  fx?: FinancialMetricFxInfo | null
): IncomeStatementCellValue {
  if (typeof value !== "number") return { display: "-" };
  const primary = appendMetricCurrency(Math.round(value).toLocaleString(), currency);
  const dual = buildDualCurrencyDisplay(primary, fx, "money_whole");
  return {
    display: dual.display,
    nativeDisplay: dual.nativeDisplay,
    nativeRaw: fx?.native_value ?? null,
    fxTooltip: dual.fxTooltip,
  };
}

export function resolveIncomeStatementCellDisplay(
  cell: IncomeStatementCellValue,
  currencyMode: CurrencyDisplayMode = "preferred"
): string {
  if (currencyMode === "native" && cell.nativeDisplay) return cell.nativeDisplay;
  return cell.display;
}

export function resolveIncomeStatementMetricYoY(
  metric: IncomeStatementMetricRow,
  currencyMode: CurrencyDisplayMode = "preferred"
): string {
  if (currencyMode !== "native") return metric.yoy;

  const rawValues = metric.nativeRawValues;
  if (rawValues.length < 2) return metric.yoy;

  const prior = rawValues[rawValues.length - 2];
  const current = rawValues[rawValues.length - 1];
  if (prior == null || current == null) return metric.yoy;

  return formatYoYGrowth(current, prior);
}

export function formatYoYGrowth(
  current: number | null | undefined,
  prior: number | null | undefined
): string {
  if (typeof current !== "number" || typeof prior !== "number" || prior === 0) {
    return "-";
  }
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  if (!Number.isFinite(pct)) return "-";
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function computeLatestYoY(
  columns: NormalizedIncomeStatementRow[],
  rawValue: (row: NormalizedIncomeStatementRow) => number | null | undefined
): string {
  if (columns.length < 2) return "-";
  const prior = rawValue(columns[columns.length - 2]);
  const current = rawValue(columns[columns.length - 1]);
  return formatYoYGrowth(current, prior);
}

function buildMetricRow(
  key: string,
  label: string,
  columns: NormalizedIncomeStatementRow[],
  formatValue: (row: NormalizedIncomeStatementRow) => IncomeStatementCellValue,
  rawValue: (row: NormalizedIncomeStatementRow) => number | null | undefined,
  exportFormat: IncomeStatementExportFormat
): IncomeStatementMetricRow {
  const rawValues = columns.map((row) => {
    const value = rawValue(row);
    return value != null && Number.isFinite(value) ? value : null;
  });
  const cells = columns.map(formatValue);
  const nativeRawValues = cells.map((cell) =>
    cell.nativeRaw != null && Number.isFinite(cell.nativeRaw) ? cell.nativeRaw : null
  );

  return {
    key,
    label,
    values: cells.map((cell) => cell.display),
    cells,
    rawValues,
    nativeRawValues,
    exportFormat,
    yoy: computeLatestYoY(columns, rawValue),
  };
}

function resolveFteForYear(
  row: NormalizedIncomeStatementRow,
  employeeHistory: EmployeeTimeSeriesPoint[]
): number | null {
  if (row.fte_count != null) return row.fte_count;
  const year = row.period_year;
  if (year == null) return null;
  return resolveLinkedInEmployeeCountForYear(year, employeeHistory);
}

function enrichRowWithFte(
  row: NormalizedIncomeStatementRow,
  employeeHistory: EmployeeTimeSeriesPoint[]
): NormalizedIncomeStatementRow {
  const fte = resolveFteForYear(row, employeeHistory);
  if (fte == null) return row;
  return {
    ...row,
    fte_count: fte,
    revenue_per_fte:
      row.revenue_per_fte ??
      (row.revenue != null && fte > 0 ? row.revenue / fte : null),
  };
}

export function buildIncomeStatementFinancialsViewModel(
  rows: NormalizedIncomeStatementRow[],
  employeeHistory: EmployeeTimeSeriesPoint[] = [],
  platformCurrency = ""
): IncomeStatementFinancialsViewModel | null {
  // Rows are already merged/year-deduped via resolveDisplayIncomeStatementRows
  // on the company page — use them directly so profile-only years (e.g. FY2024) are kept.
  const columns = sortIncomeStatementRowsAsc(
    rows.map((row) => enrichRowWithFte(row, employeeHistory))
  );
  if (columns.length === 0) return null;

  const currency =
    platformCurrency.trim() ||
    resolveIncomeStatementCurrency(columns, platformCurrency);

  const metrics: IncomeStatementMetricRow[] = [
    buildMetricRow(
      "revenue",
      "Revenue (m)",
      columns,
      (row) =>
        formatMoneyMillions(row.revenue, currency, row.revenue_fx, row, "revenue"),
      (row) => row.revenue ?? null,
      "millions_from_units"
    ),
    buildMetricRow(
      "ebitda",
      "EBITDA (m)",
      columns,
      (row) =>
        formatMoneyMillions(row.ebitda, currency, row.ebitda_fx, row, "ebitda"),
      (row) => row.ebitda ?? null,
      "millions_from_units"
    ),
    buildMetricRow(
      "ebitda_margin",
      "EBITDA %",
      columns,
      (row) => ({ display: formatMarginValue(row, "ebitda") }),
      (row) => resolveMarginPct(row, "ebitda"),
      "percent"
    ),
    buildMetricRow(
      "ebit",
      "EBIT (m)",
      columns,
      (row) => formatMoneyMillions(row.ebit, currency, row.ebit_fx, row, "ebit"),
      (row) => row.ebit ?? null,
      "millions_from_units"
    ),
    buildMetricRow(
      "ebit_margin",
      "EBIT %",
      columns,
      (row) => ({ display: formatMarginValue(row, "ebit") }),
      (row) => resolveMarginPct(row, "ebit"),
      "percent"
    ),
    buildMetricRow(
      "fte",
      "FTE",
      columns,
      (row) => ({
        display:
          row.fte_count != null ? row.fte_count.toLocaleString() : "-",
      }),
      (row) => row.fte_count ?? null,
      "count"
    ),
    buildMetricRow(
      "revenue_per_fte",
      "Revenue / FTE",
      columns,
      (row) =>
        formatRevenuePerFte(row.revenue_per_fte, currency, row.revenue_per_fte_fx),
      (row) => row.revenue_per_fte ?? null,
      "whole"
    ),
  ];

  return {
    title: "Income Statement",
    currency,
    years: columns.map((row) => row.period_year ?? null),
    columnLabels: columns.map(formatIncomeStatementPeriodLabel),
    columnKeys: columns.map(
      (row) =>
        `${row.period_type ?? "period"}:${row.period_end_date ?? row.id}`
    ),
    metrics,
    sourceType: "Public",
  };
}

/** Aligns income-statement values to the shared financials table year columns. */
export function remapIncomeStatementToTableYears(
  model: IncomeStatementFinancialsViewModel,
  tableYears: number[]
): IncomeStatementFinancialsViewModel {
  const indexByYear = new Map<number, number>();
  model.years.forEach((year, index) => {
    if (year != null) indexByYear.set(year, index);
  });

  return {
    ...model,
    years: tableYears,
    columnLabels: tableYears.map((year) => `FY ${year}`),
    columnKeys: tableYears.map((year) => `fiscal_year:${year}`),
    metrics: model.metrics.map((metric) => ({
      ...metric,
      values: tableYears.map((year) => {
        const index = indexByYear.get(year);
        return index != null ? (metric.values[index] ?? "-") : "-";
      }),
      cells: tableYears.map((year) => {
        const index = indexByYear.get(year);
        return index != null
          ? (metric.cells[index] ?? { display: "-" })
          : { display: "-" };
      }),
      rawValues: tableYears.map((year) => {
        const index = indexByYear.get(year);
        return index != null ? (metric.rawValues[index] ?? null) : null;
      }),
      nativeRawValues: tableYears.map((year) => {
        const index = indexByYear.get(year);
        return index != null ? (metric.nativeRawValues[index] ?? null) : null;
      }),
    })),
  };
}
