import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatPercentValue } from "@/lib/companyTableData";
import type { EmployeeTimeSeriesPoint } from "@/lib/companyLinkedIn";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import {
  resolveIncomeStatementCurrency,
  sortIncomeStatementRowsAsc,
  type NormalizedIncomeStatementRow,
} from "@/lib/incomeStatement";
import { resolveLinkedInEmployeeCountForYear } from "@/lib/companyLinkedIn";

export type IncomeStatementMetricRow = {
  key: string;
  label: string;
  values: string[];
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

function formatPeriodHeader(row: NormalizedIncomeStatementRow): string {
  const raw = (row.period_display_end_date || "").trim();
  if (raw) return raw.replace(/,/g, "").replace(/\s+/g, " ").trim();
  if (row.period_year != null) return `FY ${row.period_year}`;
  return "-";
}

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
  currency: string
): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return appendMetricCurrency(
    Math.round(value / 1_000_000).toLocaleString(),
    currency
  );
}

function formatRevenuePerFte(
  value: number | null | undefined,
  currency: string
): string {
  if (typeof value !== "number") return "-";
  return appendMetricCurrency(Math.round(value).toLocaleString(), currency);
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
  formatValue: (row: NormalizedIncomeStatementRow) => string,
  rawValue: (row: NormalizedIncomeStatementRow) => number | null | undefined
): IncomeStatementMetricRow {
  return {
    key,
    label,
    values: columns.map(formatValue),
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
      (row) => formatMoneyMillions(row.revenue, currency),
      (row) => row.revenue ?? null
    ),
    buildMetricRow(
      "ebitda",
      "EBITDA (m)",
      columns,
      (row) => formatMoneyMillions(row.ebitda, currency),
      (row) => row.ebitda ?? null
    ),
    buildMetricRow(
      "ebitda_margin",
      "EBITDA %",
      columns,
      (row) => formatMarginValue(row, "ebitda"),
      (row) => resolveMarginPct(row, "ebitda")
    ),
    buildMetricRow(
      "ebit",
      "EBIT (m)",
      columns,
      (row) => formatMoneyMillions(row.ebit, currency),
      (row) => row.ebit ?? null
    ),
    buildMetricRow(
      "ebit_margin",
      "EBIT %",
      columns,
      (row) => formatMarginValue(row, "ebit"),
      (row) => resolveMarginPct(row, "ebit")
    ),
    buildMetricRow(
      "fte",
      "FTE",
      columns,
      (row) =>
        row.fte_count != null ? row.fte_count.toLocaleString() : "-",
      (row) => row.fte_count ?? null
    ),
    buildMetricRow(
      "revenue_per_fte",
      "Revenue / FTE",
      columns,
      (row) => formatRevenuePerFte(row.revenue_per_fte, currency),
      (row) => row.revenue_per_fte ?? null
    ),
  ];

  return {
    title: "Income Statement",
    currency,
    years: columns.map((row) => row.period_year ?? null),
    columnLabels: columns.map(formatPeriodHeader),
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
    })),
  };
}
