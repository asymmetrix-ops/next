import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import {
  parseSourceType,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";

const API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/company_financial_metrics";

export type CompanyFinancialMetricsCardRow = {
  id: number;
  new_company_id: number;
  financial_year_int?: number | null;
  financial_year_text?: string | null;
  period_display?: string | null;
  Revenue_m?: number | string | null;
  Revenue_currency_display?: string | null;
  Revenue_source_label?: string | null;
  EBITDA_m?: number | string | null;
  EBITDA_currency_display?: string | null;
  EBITDA_source_label?: string | null;
  EV?: number | string | null;
  EV_currency_display?: string | null;
  EV_source_label?: string | null;
  Subscription_revenue_m?: number | string | null;
  Subscription_revenue_pc?: number | string | null;
  Subscription_revenue_currency_display?: string | null;
  Subscription_revenue_source_label?: string | null;
  Churn_pc?: number | string | null;
  Churn_source_label?: string | null;
  GRR_pc?: number | string | null;
  GRR_source_label?: string | null;
  NRR?: number | string | null;
  NRR_source_label?: string | null;
  New_client_growth_pc?: number | string | null;
  New_client_growth_source_label?: string | null;
  Upsell_pc?: number | string | null;
  Upsell_source_label?: string | null;
  Cross_sell_pc?: number | string | null;
  Cross_sell_source_label?: string | null;
  Price_increase_pc?: number | string | null;
  Price_increase_source_label?: string | null;
  Rev_expansion_pc?: number | string | null;
  Rev_expansion_source_label?: string | null;
  EBIT_m?: number | string | null;
  EBIT_currency_display?: string | null;
  EBIT_source_label?: string | null;
  No_of_Clients?: number | string | null;
  No_of_Clients_source_label?: string | null;
  Rev_per_client?: number | string | null;
  Rev_per_client_formatted?: string | null;
  Rev_per_client_source_label?: string | null;
  No_Employees?: number | string | null;
  No_Employees_source_label?: string | null;
  Revenue_per_employee?: number | string | null;
  Revenue_per_employee_formatted?: string | null;
  Revenue_per_employee_source_label?: string | null;
};

export type FinancialsMetricFormat =
  | "money_millions"
  | "percent"
  | "count"
  | "money_whole";

export type FinancialsMetricDef = {
  key: string;
  label: string;
  format: FinancialsMetricFormat;
  valueField: keyof CompanyFinancialMetricsCardRow;
  sourceField: keyof CompanyFinancialMetricsCardRow;
  currencyField?: keyof CompanyFinancialMetricsCardRow;
  formattedField?: keyof CompanyFinancialMetricsCardRow;
  /** When true, a decrease is shown as positive (green), e.g. Churn. */
  yoyInverse?: boolean;
};

export type FinancialsCardDef = {
  id: "financial" | "subscription" | "other";
  title: string;
  metrics: FinancialsMetricDef[];
};

export type FinancialsCellValue = {
  display: string;
  raw: number | null;
  sourceType: FiMetricSourceType | null;
};

export type FinancialsYoyValue = {
  display: string;
  percentChange: number;
  /** Visual sentiment after applying inverse rules. */
  sentiment: "positive" | "negative" | "neutral";
};

export type FinancialsMetricRow = {
  key: string;
  label: string;
  yoyInverse?: boolean;
  cellsByYear: Record<number, FinancialsCellValue>;
  yoy?: FinancialsYoyValue | null;
};

export type CompanyFinancialsViewModel = {
  years: number[];
  cards: Array<{
    id: FinancialsCardDef["id"];
    title: string;
    metrics: FinancialsMetricRow[];
  }>;
};

export const FINANCIALS_CARD_DEFS: FinancialsCardDef[] = [
  {
    id: "financial",
    title: "Financial Metrics",
    metrics: [
      {
        key: "revenue",
        label: "Revenue",
        format: "money_millions",
        valueField: "Revenue_m",
        sourceField: "Revenue_source_label",
        currencyField: "Revenue_currency_display",
      },
      {
        key: "ebitda",
        label: "EBITDA",
        format: "money_millions",
        valueField: "EBITDA_m",
        sourceField: "EBITDA_source_label",
        currencyField: "EBITDA_currency_display",
      },
      {
        key: "ev",
        label: "EV",
        format: "money_millions",
        valueField: "EV",
        sourceField: "EV_source_label",
        currencyField: "EV_currency_display",
      },
    ],
  },
  {
    id: "subscription",
    title: "Subscription Metrics",
    metrics: [
      {
        key: "subscription_revenue_m",
        label: "Subscription revenue (m)",
        format: "money_millions",
        valueField: "Subscription_revenue_m",
        sourceField: "Subscription_revenue_source_label",
        currencyField: "Subscription_revenue_currency_display",
      },
      {
        key: "subscription_revenue_pc",
        label: "Subscription revenue (pc)",
        format: "percent",
        valueField: "Subscription_revenue_pc",
        sourceField: "Subscription_revenue_source_label",
      },
      {
        key: "churn",
        label: "Churn",
        format: "percent",
        valueField: "Churn_pc",
        sourceField: "Churn_source_label",
        yoyInverse: true,
      },
      {
        key: "grr",
        label: "GRR",
        format: "percent",
        valueField: "GRR_pc",
        sourceField: "GRR_source_label",
      },
      {
        key: "nrr",
        label: "NRR",
        format: "percent",
        valueField: "NRR",
        sourceField: "NRR_source_label",
      },
      {
        key: "new_client_growth",
        label: "New Clients Revenue Growth",
        format: "percent",
        valueField: "New_client_growth_pc",
        sourceField: "New_client_growth_source_label",
      },
      {
        key: "upsell",
        label: "Upsell",
        format: "percent",
        valueField: "Upsell_pc",
        sourceField: "Upsell_source_label",
      },
      {
        key: "cross_sell",
        label: "Cross-sell",
        format: "percent",
        valueField: "Cross_sell_pc",
        sourceField: "Cross_sell_source_label",
      },
      {
        key: "price_increase",
        label: "Price Increase",
        format: "percent",
        valueField: "Price_increase_pc",
        sourceField: "Price_increase_source_label",
      },
      {
        key: "rev_expansion",
        label: "Revenue Expansion",
        format: "percent",
        valueField: "Rev_expansion_pc",
        sourceField: "Rev_expansion_source_label",
      },
    ],
  },
  {
    id: "other",
    title: "Other Metrics",
    metrics: [
      {
        key: "ebit",
        label: "EBIT (m)",
        format: "money_millions",
        valueField: "EBIT_m",
        sourceField: "EBIT_source_label",
        currencyField: "EBIT_currency_display",
      },
      {
        key: "clients",
        label: "Number of Clients",
        format: "count",
        valueField: "No_of_Clients",
        sourceField: "No_of_Clients_source_label",
      },
      {
        key: "rev_per_client",
        label: "Revenue per Client",
        format: "money_whole",
        valueField: "Rev_per_client",
        sourceField: "Rev_per_client_source_label",
        currencyField: "Revenue_currency_display",
        formattedField: "Rev_per_client_formatted",
      },
      {
        key: "employees",
        label: "Number of Employees",
        format: "count",
        valueField: "No_Employees",
        sourceField: "No_Employees_source_label",
      },
      {
        key: "rev_per_employee",
        label: "Revenue per Employee",
        format: "money_whole",
        valueField: "Revenue_per_employee",
        sourceField: "Revenue_per_employee_source_label",
        currencyField: "Revenue_currency_display",
        formattedField: "Revenue_per_employee_formatted",
      },
    ],
  },
];

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

type FinancialMetricsApiRow = CompanyFinancialMetricsCardRow & {
  Financial_Year?: number | string | null;
};

/** Maps Xano `company_financial_metrics` rows to the card view-model shape. */
function normalizeFinancialMetricsApiRow(
  row: FinancialMetricsApiRow
): CompanyFinancialMetricsCardRow {
  const calendarYear =
    toNumber(row.financial_year_text) ??
    toNumber(row.financial_year_int) ??
    toNumber(row.Financial_Year);

  return {
    ...row,
    financial_year_int: calendarYear,
    financial_year_text:
      row.financial_year_text ??
      (calendarYear != null ? String(calendarYear) : null),
    period_display: row.period_display ?? undefined,
  };
}

function resolveRowYear(row: CompanyFinancialMetricsCardRow): number | null {
  return toNumber(row.financial_year_int) ?? toNumber(row.financial_year_text);
}

function formatMillions(value: number, currency?: string | null): string {
  const abs = Math.abs(value);
  let compact: string;
  if (abs >= 1000) {
    const billions = value / 1000;
    compact =
      billions % 1 === 0
        ? `${Math.round(billions)}b`
        : `${billions.toFixed(1)}b`;
  } else if (abs >= 100) {
    compact = `${Math.round(value)}m`;
  } else {
    compact = `${value.toFixed(1)}m`;
  }
  return appendMetricCurrency(compact, currency ?? undefined);
}

function formatPercentValue(value: number): string {
  const rounded = value % 1 === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function formatCountValue(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatMoneyWhole(
  value: number,
  formatted: unknown,
  currency?: string | null
): string {
  if (typeof formatted === "string" && formatted.trim()) {
    return appendMetricCurrency(formatted.trim(), currency ?? undefined);
  }
  return appendMetricCurrency(formatCountValue(value), currency ?? undefined);
}

export function resolveFinancialsSourceType(
  label: unknown
): FiMetricSourceType | null {
  return parseSourceType(label);
}

function resolveRowCurrency(
  row: CompanyFinancialMetricsCardRow,
  currencyField?: keyof CompanyFinancialMetricsCardRow
): string | null {
  if (currencyField) {
    const direct = String(row[currencyField] ?? "").trim();
    if (direct) return direct;
  }

  for (const fallback of [
    row.Revenue_currency_display,
    row.EBITDA_currency_display,
    row.EV_currency_display,
    row.EBIT_currency_display,
  ]) {
    const trimmed = String(fallback ?? "").trim();
    if (trimmed) return trimmed;
  }

  return null;
}

function formatMetricValue(
  row: CompanyFinancialMetricsCardRow,
  metric: FinancialsMetricDef
): FinancialsCellValue {
  const raw = toNumber(row[metric.valueField]);
  const sourceType = resolveFinancialsSourceType(row[metric.sourceField]);
  const currency = metric.currencyField
    ? resolveRowCurrency(row, metric.currencyField)
    : null;

  if (raw == null) {
    return { display: "-", raw: null, sourceType };
  }

  switch (metric.format) {
    case "money_millions":
      return {
        display: formatMillions(raw, currency),
        raw,
        sourceType,
      };
    case "percent":
      return {
        display: formatPercentValue(raw),
        raw,
        sourceType,
      };
    case "count":
      return {
        display: formatCountValue(raw),
        raw,
        sourceType,
      };
    case "money_whole":
      return {
        display: formatMoneyWhole(
          raw,
          metric.formattedField ? row[metric.formattedField] : null,
          currency
        ),
        raw,
        sourceType,
      };
    default:
      return { display: "-", raw: null, sourceType };
  }
}

export function computeYoyValue(
  prior: FinancialsCellValue,
  current: FinancialsCellValue,
  inverse = false
): FinancialsYoyValue | null {
  if (prior.raw == null || current.raw == null || prior.raw === 0) {
    return null;
  }

  const percentChange =
    ((current.raw - prior.raw) / Math.abs(prior.raw)) * 100;
  if (!Number.isFinite(percentChange)) return null;

  const rounded =
    percentChange % 1 === 0
      ? Math.round(percentChange)
      : Math.round(percentChange * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  const display = `${sign}${rounded}%`;

  let sentiment: FinancialsYoyValue["sentiment"] = "neutral";
  if (rounded > 0) {
    sentiment = inverse ? "negative" : "positive";
  } else if (rounded < 0) {
    sentiment = inverse ? "positive" : "negative";
  }

  return { display, percentChange: rounded, sentiment };
}

export function getYoyComparisonYears(years: number[]): {
  priorYear: number;
  currentYear: number;
} | null {
  if (years.length < 2) return null;
  return {
    priorYear: years[years.length - 2],
    currentYear: years[years.length - 1],
  };
}

export function getVisibleYoyValue(
  metric: FinancialsMetricRow,
  years: number[],
  allowedSources: FiMetricSourceType[]
): FinancialsYoyValue | null {
  const comparison = getYoyComparisonYears(years);
  if (!comparison) return null;

  const priorCell = metric.cellsByYear[comparison.priorYear];
  const currentCell = metric.cellsByYear[comparison.currentYear];
  if (!priorCell || !currentCell) return null;

  if (
    !isFinancialsCellVisible(priorCell, allowedSources) ||
    !isFinancialsCellVisible(currentCell, allowedSources)
  ) {
    return null;
  }

  return computeYoyValue(
    priorCell,
    currentCell,
    Boolean(metric.yoyInverse)
  );
}

export function hasFinancialMetricsCardData(
  rows: CompanyFinancialMetricsCardRow[]
): boolean {
  return resolveFinancialsYears(rows).length > 0;
}

export function resolveFinancialsYears(
  rows: CompanyFinancialMetricsCardRow[]
): number[] {
  const years = Array.from(
    new Set(
      rows
        .map((row) => resolveRowYear(row))
        .filter((year): year is number => year != null)
    )
  ).sort((a, b) => a - b);

  if (years.length === 0) return [];
  if (years.length <= 3) return years;
  return years.slice(-3);
}

export function buildCompanyFinancialsViewModel(
  rows: CompanyFinancialMetricsCardRow[]
): CompanyFinancialsViewModel {
  const years = resolveFinancialsYears(rows);
  const rowsByYear = new Map<number, CompanyFinancialMetricsCardRow>();
  for (const row of rows) {
    const year = resolveRowYear(row);
    if (year != null) rowsByYear.set(year, row);
  }

  const yoyYears = getYoyComparisonYears(years);

  const cards = FINANCIALS_CARD_DEFS.map((card) => ({
    id: card.id,
    title: card.title,
    metrics: card.metrics.map((metric) => {
      const cellsByYear: Record<number, FinancialsCellValue> = {};
      for (const year of years) {
        const yearRow = rowsByYear.get(year);
        cellsByYear[year] = yearRow
          ? formatMetricValue(yearRow, metric)
          : { display: "-", raw: null, sourceType: null };
      }

      const yoy =
        yoyYears != null
          ? computeYoyValue(
              cellsByYear[yoyYears.priorYear],
              cellsByYear[yoyYears.currentYear],
              Boolean(metric.yoyInverse)
            )
          : null;

      return {
        key: metric.key,
        label: metric.label,
        yoyInverse: metric.yoyInverse,
        cellsByYear,
        yoy,
      };
    }),
  }));

  return { years, cards };
}

export async function fetchCompanyFinancialMetricsCard(
  companyId: string | number
): Promise<CompanyFinancialMetricsCardRow[]> {
  const numericId = Number(companyId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return [];
  }

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const params = new URLSearchParams();
  params.set("new_company_id", String(numericId));

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return (data as FinancialMetricsApiRow[]).map(normalizeFinancialMetricsApiRow);
}

export function formatFiscalYearHeader(year: number): string {
  return `FY${year}`;
}

export function isFinancialsCellVisible(
  cell: FinancialsCellValue,
  allowedSources: FiMetricSourceType[]
): boolean {
  if (cell.raw == null) return true;
  if (!cell.sourceType) return true;
  return allowedSources.includes(cell.sourceType);
}

export function getVisibleFinancialsCellDisplay(
  cell: FinancialsCellValue,
  allowedSources: FiMetricSourceType[]
): string {
  if (cell.raw == null) return "-";
  if (!isFinancialsCellVisible(cell, allowedSources)) return "-";
  return cell.display;
}
