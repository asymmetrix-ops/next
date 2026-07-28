import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatPercentValue } from "@/lib/companyTableData";
import type { EmployeeTimeSeriesPoint } from "@/lib/companyLinkedIn";
import {
  resolveIncomeStatementCurrency,
  selectIncomeStatementYearColumns,
  type NormalizedIncomeStatementRow,
} from "@/lib/incomeStatement";

export type IncomeStatementMetricRow = {
  key: string;
  label: string;
  values: string[];
};

export type IncomeStatementFinancialsViewModel = {
  title: string;
  currency: string;
  years: (number | null)[];
  columnLabels: string[];
  metrics: IncomeStatementMetricRow[];
};

function formatPeriodHeader(row: NormalizedIncomeStatementRow): string {
  const display = (row.period_display_end_date || "").replace(/[,\s]/g, "");
  if (display) return display;
  if (row.period_year != null) return `FY${row.period_year}`;
  return "-";
}

function formatRevenueMillions(value: number | null | undefined, currency: string): string {
  if (typeof value !== "number") return "-";
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

function formatYoYGrowth(
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

function resolveFteForYear(
  row: NormalizedIncomeStatementRow,
  employeeHistory: EmployeeTimeSeriesPoint[]
): number | null {
  if (row.fte_count != null) return row.fte_count;
  const year = row.period_year;
  if (year == null || employeeHistory.length === 0) return null;

  const pointsInYear = employeeHistory.filter((point) => {
    const pointYear = new Date(point.date).getFullYear();
    return pointYear === year;
  });
  if (pointsInYear.length === 0) return null;

  pointsInYear.sort((a, b) => a.date.localeCompare(b.date));
  return pointsInYear[pointsInYear.length - 1]?.employees_count ?? null;
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
  fallbackCurrency = ""
): IncomeStatementFinancialsViewModel | null {
  const columns = selectIncomeStatementYearColumns(rows, 3).map((row) =>
    enrichRowWithFte(row, employeeHistory)
  );
  if (columns.length === 0) return null;

  const currency = resolveIncomeStatementCurrency(columns, fallbackCurrency);

  const revenueValues = columns.map((row) =>
    formatRevenueMillions(row.revenue, currency)
  );
  const yoyValues = columns.map((row, index) => {
    if (index === 0) return "-";
    return formatYoYGrowth(row.revenue, columns[index - 1]?.revenue);
  });

  const metrics: IncomeStatementMetricRow[] = [
    { key: "revenue", label: "Revenue", values: revenueValues },
    { key: "revenue_yoy", label: "YoY Growth", values: yoyValues },
    {
      key: "ebitda",
      label: "EBITDA",
      values: columns.map((row) => formatRevenueMillions(row.ebitda, currency)),
    },
    {
      key: "ebitda_margin",
      label: "EBITDA %",
      values: columns.map((row) => formatPercentValue(row.ebitda_margin_pc)),
    },
    {
      key: "ebit",
      label: "EBIT",
      values: columns.map((row) => formatRevenueMillions(row.ebit, currency)),
    },
    {
      key: "ebit_margin",
      label: "EBIT %",
      values: columns.map((row) => formatPercentValue(row.ebit_margin_pc)),
    },
    {
      key: "fte",
      label: "FTE",
      values: columns.map((row) =>
        row.fte_count != null ? row.fte_count.toLocaleString() : "-"
      ),
    },
    {
      key: "revenue_per_fte",
      label: "Revenue / FTE",
      values: columns.map((row) =>
        formatRevenuePerFte(row.revenue_per_fte, currency)
      ),
    },
  ];

  return {
    title: "Income Statement",
    currency,
    years: columns.map((row) => row.period_year ?? null),
    columnLabels: columns.map(formatPeriodHeader),
    metrics,
  };
}
