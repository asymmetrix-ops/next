import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import type { EmployeeTimeSeriesPoint } from "@/lib/companyLinkedIn";
import { resolveLinkedInEmployeeCountForYear } from "@/lib/companyLinkedIn";
import {
  resolveFinancialMetricSourceType,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";

const API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/company_financial_metrics";

/** Financials tab and export show the two most recent fiscal years plus YoY. */
export const FINANCIALS_DISPLAY_YEAR_COUNT = 2;

/** Income statement table may span up to three fiscal-year columns. */
export const FINANCIALS_TABLE_MAX_YEAR_COLUMNS = 3;

export type CompanyFinancialMetricsCardRow = {
  id: number;
  new_company_id: number;
  financial_year_int?: number | null;
  financial_year_text?: string | null;
  period_display?: string | null;
  Revenue_m?: number | string | null;
  Revenue_currency_display?: string | null;
  Revenue_source_label?: string | null;
  Rev_source?: number | string | null;
  EBITDA_m?: number | string | null;
  EBITDA_currency_display?: string | null;
  EBITDA_source_label?: string | null;
  EBITDA_source?: number | string | null;
  EV?: number | string | null;
  EV_currency_display?: string | null;
  EV_source_label?: string | null;
  EV_source?: number | string | null;
  Subscription_revenue_m?: number | string | null;
  Subscription_revenue_pc?: number | string | null;
  Subscription_revenue_currency_display?: string | null;
  Subscription_revenue_source_label?: string | null;
  Subscription_revenue_source?: number | string | null;
  Churn_pc?: number | string | null;
  Churn_source_label?: string | null;
  Churn_Source?: number | string | null;
  GRR_pc?: number | string | null;
  GRR_source_label?: string | null;
  GRR_source?: number | string | null;
  NRR?: number | string | null;
  NRR_source_label?: string | null;
  NRR_source?: number | string | null;
  New_client_growth_pc?: number | string | null;
  New_client_growth_source_label?: string | null;
  New_Client_Growth_Source?: number | string | null;
  Upsell_pc?: number | string | null;
  Upsell_source_label?: string | null;
  Upsell_source?: number | string | null;
  Cross_sell_pc?: number | string | null;
  Cross_sell_source_label?: string | null;
  Cross_sell_source?: number | string | null;
  Price_increase_pc?: number | string | null;
  Price_increase_source_label?: string | null;
  Price_increase_source?: number | string | null;
  Rev_expansion_pc?: number | string | null;
  Rev_expansion_source_label?: string | null;
  Rev_expansion_source?: number | string | null;
  Rev_Growth_PC?: number | string | null;
  Rev_growth_source_label?: string | null;
  Rev_Growth_source?: number | string | null;
  EBITDA_margin?: number | string | null;
  EBITDA_margin_source_label?: string | null;
  EBITDA_margin_source?: number | string | null;
  Rule_of_40?: number | string | null;
  Rule_of_40_source_label?: string | null;
  Rule_of_40_source?: number | string | null;
  Revenue_multiple?: number | string | null;
  Revenue_multiple_source_label?: string | null;
  Rev_x_source?: number | string | null;
  EBIT_m?: number | string | null;
  EBIT_currency_display?: string | null;
  EBIT_source_label?: string | null;
  EBIT_source?: number | string | null;
  No_of_Clients?: number | string | null;
  No_of_Clients_source_label?: string | null;
  No_Clients_source?: number | string | null;
  Rev_per_client?: number | string | null;
  Rev_per_client_formatted?: string | null;
  Rev_per_client_source_label?: string | null;
  Rev_per_client_source?: number | string | null;
  No_Employees?: number | string | null;
  No_Employees_source_label?: string | null;
  No_Employees_source?: number | string | null;
  Revenue_per_employee?: number | string | null;
  Revenue_per_employee_formatted?: string | null;
  Revenue_per_employee_source_label?: string | null;
  Rev_per_employee_source?: number | string | null;
  Income_statement_currency?: string | null;
};

export type FinancialsMetricFormat =
  | "money_millions"
  | "percent"
  | "count"
  | "money_whole"
  | "plain_number"
  | "multiple";

export type FinancialsMetricDef = {
  key: string;
  label: string;
  format: FinancialsMetricFormat;
  valueField: keyof CompanyFinancialMetricsCardRow;
  sourceField: keyof CompanyFinancialMetricsCardRow;
  sourceCodeField?: keyof CompanyFinancialMetricsCardRow;
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
        label: "Revenue (m)",
        format: "money_millions",
        valueField: "Revenue_m",
        sourceField: "Revenue_source_label",
        sourceCodeField: "Rev_source",
        currencyField: "Revenue_currency_display",
      },
      {
        key: "ebitda",
        label: "EBITDA (m)",
        format: "money_millions",
        valueField: "EBITDA_m",
        sourceField: "EBITDA_source_label",
        sourceCodeField: "EBITDA_source",
        currencyField: "EBITDA_currency_display",
      },
      {
        key: "ev",
        label: "Enterprise Value (m)",
        format: "money_millions",
        valueField: "EV",
        sourceField: "EV_source_label",
        sourceCodeField: "EV_source",
        currencyField: "EV_currency_display",
      },
      {
        key: "revenue_multiple",
        label: "Revenue multiple",
        format: "multiple",
        valueField: "Revenue_multiple",
        sourceField: "Revenue_multiple_source_label",
        sourceCodeField: "Rev_x_source",
      },
      {
        key: "rev_growth",
        label: "Revenue Growth",
        format: "percent",
        valueField: "Rev_Growth_PC",
        sourceField: "Rev_growth_source_label",
        sourceCodeField: "Rev_Growth_source",
      },
      {
        key: "ebitda_margin",
        label: "EBITDA margin",
        format: "percent",
        valueField: "EBITDA_margin",
        sourceField: "EBITDA_margin_source_label",
        sourceCodeField: "EBITDA_margin_source",
      },
      {
        key: "rule_of_40",
        label: "Rule of 40",
        format: "plain_number",
        valueField: "Rule_of_40",
        sourceField: "Rule_of_40_source_label",
        sourceCodeField: "Rule_of_40_source",
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
        sourceCodeField: "Subscription_revenue_source",
        currencyField: "Subscription_revenue_currency_display",
      },
      {
        key: "subscription_revenue_pc",
        label: "Subscription revenue (pc)",
        format: "percent",
        valueField: "Subscription_revenue_pc",
        sourceField: "Subscription_revenue_source_label",
        sourceCodeField: "Subscription_revenue_source",
      },
      {
        key: "churn",
        label: "Churn",
        format: "percent",
        valueField: "Churn_pc",
        sourceField: "Churn_source_label",
        sourceCodeField: "Churn_Source",
        yoyInverse: true,
      },
      {
        key: "grr",
        label: "GRR",
        format: "percent",
        valueField: "GRR_pc",
        sourceField: "GRR_source_label",
        sourceCodeField: "GRR_source",
      },
      {
        key: "nrr",
        label: "NRR",
        format: "percent",
        valueField: "NRR",
        sourceField: "NRR_source_label",
        sourceCodeField: "NRR_source",
      },
      {
        key: "new_client_growth",
        label: "New Clients Revenue Growth",
        format: "percent",
        valueField: "New_client_growth_pc",
        sourceField: "New_client_growth_source_label",
        sourceCodeField: "New_Client_Growth_Source",
      },
      {
        key: "upsell",
        label: "Upsell",
        format: "percent",
        valueField: "Upsell_pc",
        sourceField: "Upsell_source_label",
        sourceCodeField: "Upsell_source",
      },
      {
        key: "cross_sell",
        label: "Cross-sell",
        format: "percent",
        valueField: "Cross_sell_pc",
        sourceField: "Cross_sell_source_label",
        sourceCodeField: "Cross_sell_source",
      },
      {
        key: "price_increase",
        label: "Price Increase",
        format: "percent",
        valueField: "Price_increase_pc",
        sourceField: "Price_increase_source_label",
        sourceCodeField: "Price_increase_source",
      },
      {
        key: "rev_expansion",
        label: "Revenue Expansion",
        format: "percent",
        valueField: "Rev_expansion_pc",
        sourceField: "Rev_expansion_source_label",
        sourceCodeField: "Rev_expansion_source",
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
        sourceCodeField: "EBIT_source",
        currencyField: "EBIT_currency_display",
      },
      {
        key: "clients",
        label: "Number of Clients",
        format: "count",
        valueField: "No_of_Clients",
        sourceField: "No_of_Clients_source_label",
        sourceCodeField: "No_Clients_source",
      },
      {
        key: "rev_per_client",
        label: "Revenue per Client",
        format: "money_whole",
        valueField: "Rev_per_client",
        sourceField: "Rev_per_client_source_label",
        sourceCodeField: "Rev_per_client_source",
        currencyField: "Revenue_currency_display",
        formattedField: "Rev_per_client_formatted",
      },
      {
        key: "employees",
        label: "Number of Employees",
        format: "count",
        valueField: "No_Employees",
        sourceField: "No_Employees_source_label",
        sourceCodeField: "No_Employees_source",
      },
      {
        key: "rev_per_employee",
        label: "Revenue per Employee",
        format: "money_whole",
        valueField: "Revenue_per_employee",
        sourceField: "Revenue_per_employee_source_label",
        sourceCodeField: "Rev_per_employee_source",
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

export function resolveFinancialMetricsRowYear(
  row: CompanyFinancialMetricsCardRow
): number | null {
  return toNumber(row.financial_year_int) ?? toNumber(row.financial_year_text);
}

export function enrichFinancialMetricsRowWithLinkedInEmployees(
  row: CompanyFinancialMetricsCardRow,
  year: number,
  employeeHistory: EmployeeTimeSeriesPoint[]
): CompanyFinancialMetricsCardRow {
  const linkedInCount = resolveLinkedInEmployeeCountForYear(year, employeeHistory);
  if (linkedInCount == null) return row;

  const revenueM = toNumber(row.Revenue_m);
  const enriched: CompanyFinancialMetricsCardRow = {
    ...row,
    No_Employees: linkedInCount,
    No_Employees_source_label: "LinkedIn",
  };

  if (revenueM != null && linkedInCount > 0) {
    const revenuePerEmployee = (revenueM * 1_000_000) / linkedInCount;
    enriched.Revenue_per_employee = revenuePerEmployee;
    enriched.Revenue_per_employee_formatted =
      Math.round(revenuePerEmployee).toLocaleString("en-US");
    enriched.Revenue_per_employee_source_label = "LinkedIn";
  }

  return enriched;
}

function resolveRowYear(row: CompanyFinancialMetricsCardRow): number | null {
  return resolveFinancialMetricsRowYear(row);
}

function hasDefinedMetricValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/** Merges per-year rows; overlay values win when both rows define the same field. */
export function mergeFinancialMetricsCardRows(
  base: CompanyFinancialMetricsCardRow[],
  overlay: CompanyFinancialMetricsCardRow[]
): CompanyFinancialMetricsCardRow[] {
  const byYear = new Map<number, CompanyFinancialMetricsCardRow>();

  const mergeTwoRows = (
    primary: CompanyFinancialMetricsCardRow,
    secondary: CompanyFinancialMetricsCardRow
  ): CompanyFinancialMetricsCardRow => {
    const merged: CompanyFinancialMetricsCardRow = { ...secondary, ...primary };
    const record = merged as Record<string, unknown>;
    const primaryRecord = primary as Record<string, unknown>;
    const secondaryRecord = secondary as Record<string, unknown>;

    for (const key of Object.keys({ ...primaryRecord, ...secondaryRecord })) {
      const primaryValue = primaryRecord[key];
      const secondaryValue = secondaryRecord[key];
      record[key] = hasDefinedMetricValue(primaryValue)
        ? primaryValue
        : secondaryValue;
    }

    if (primary.id > 0) merged.id = primary.id;
    return merged;
  };

  const upsert = (
    row: CompanyFinancialMetricsCardRow,
    preferIncoming: boolean
  ) => {
    const year = resolveRowYear(row);
    if (year == null) return;

    const existing = byYear.get(year);
    if (!existing) {
      byYear.set(year, { ...row });
      return;
    }

    byYear.set(
      year,
      preferIncoming
        ? mergeTwoRows(row, existing)
        : mergeTwoRows(existing, row)
    );
  };

  for (const row of base) upsert(row, false);
  for (const row of overlay) upsert(row, true);

  return Array.from(byYear.entries())
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([, row]) => row);
}

export function resolveLatestFinancialMetricsRow(
  rows: CompanyFinancialMetricsCardRow[]
): CompanyFinancialMetricsCardRow | null {
  const years = resolveFinancialsYears(rows);
  if (years.length === 0) return null;

  const latestYear = years[years.length - 1];
  return (
    rows.find((row) => resolveRowYear(row) === latestYear) ?? rows[rows.length - 1] ?? null
  );
}

function formatMillions(value: number, currency?: string | null): string {
  const abs = Math.abs(value);
  const compact =
    abs >= 100
      ? Math.round(value).toLocaleString("en-US")
      : value.toFixed(1);
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

/** Prefer Revenue (m) ÷ clients; API formatted values are often 1000× too large. */
function resolveRevPerClientDollars(
  row: CompanyFinancialMetricsCardRow
): number | null {
  const revenueM = toNumber(row.Revenue_m);
  const clients = toNumber(row.No_of_Clients);
  if (revenueM != null && clients != null && clients > 0) {
    return (revenueM * 1_000_000) / clients;
  }
  return toNumber(row.Rev_per_client);
}

export function resolveFinancialsSourceType(
  label: unknown,
  code?: unknown
): FiMetricSourceType | null {
  return resolveFinancialMetricSourceType(label, code);
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
    if (trimmed && trimmed !== "0" && !/^\d+$/.test(trimmed)) return trimmed;
  }

  return null;
}

function formatMetricValue(
  row: CompanyFinancialMetricsCardRow,
  metric: FinancialsMetricDef
): FinancialsCellValue {
  const raw =
    metric.key === "rev_per_client"
      ? resolveRevPerClientDollars(row)
      : toNumber(row[metric.valueField]);
  const sourceType = resolveFinancialsSourceType(
    row[metric.sourceField],
    metric.sourceCodeField ? row[metric.sourceCodeField] : undefined
  );
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
          metric.key === "rev_per_client" || !metric.formattedField
            ? null
            : row[metric.formattedField],
          currency
        ),
        raw,
        sourceType,
      };
    case "plain_number":
      return {
        display:
          raw % 1 === 0
            ? Math.round(raw).toLocaleString("en-US")
            : String(raw),
        raw,
        sourceType,
      };
    case "multiple":
      return {
        display:
          raw % 1 === 0 ? `${Math.round(raw)}x` : `${raw.toFixed(1)}x`,
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
  if (years.length <= FINANCIALS_DISPLAY_YEAR_COUNT) return years;
  return years.slice(-FINANCIALS_DISPLAY_YEAR_COUNT);
}

export function buildCompanyFinancialsViewModel(
  rows: CompanyFinancialMetricsCardRow[],
  employeeHistory: EmployeeTimeSeriesPoint[] = []
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
        const rawRow = rowsByYear.get(year);
        const yearRow =
          rawRow && employeeHistory.length > 0
            ? enrichFinancialMetricsRowWithLinkedInEmployees(
                rawRow,
                year,
                employeeHistory
              )
            : rawRow;
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

function unwrapFinancialMetricsApiRows(data: unknown): FinancialMetricsApiRow[] {
  if (Array.isArray(data)) {
    return data as FinancialMetricsApiRow[];
  }
  if (typeof data === "object" && data != null) {
    const wrapped = (data as { financial_metrics?: unknown }).financial_metrics;
    if (Array.isArray(wrapped)) {
      return wrapped as FinancialMetricsApiRow[];
    }
  }
  return [];
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
  return unwrapFinancialMetricsApiRows(data).map(normalizeFinancialMetricsApiRow);
}

export function formatFiscalYearHeader(year: number): string {
  return `FY${year}`;
}

/** Union of income-statement and metrics years for shared table column alignment (max 3). */
export function resolveFinancialsTableColumnYears(
  incomeYears: Array<number | null | undefined>,
  metricsYears: number[] = []
): number[] {
  const years = new Set<number>();
  for (const year of incomeYears) {
    if (year != null && Number.isFinite(year)) years.add(year);
  }
  for (const year of metricsYears) {
    years.add(year);
  }
  const sorted = Array.from(years).sort((a, b) => a - b);
  if (sorted.length <= FINANCIALS_TABLE_MAX_YEAR_COLUMNS) return sorted;
  return sorted.slice(-FINANCIALS_TABLE_MAX_YEAR_COLUMNS);
}

/** Union of income-statement and metrics years, oldest → newest, max 2. */
export function resolveUnifiedFinancialYears(
  metricsYears: number[],
  incomeYears: Array<number | null | undefined> = []
): number[] {
  const years = new Set<number>(metricsYears);
  for (const year of incomeYears) {
    if (year != null && Number.isFinite(year)) years.add(year);
  }
  const sorted = Array.from(years).sort((a, b) => a - b);
  if (sorted.length <= FINANCIALS_DISPLAY_YEAR_COUNT) return sorted;
  return sorted.slice(-FINANCIALS_DISPLAY_YEAR_COUNT);
}

/** Shared grid template so all financial tables align column-for-column. */
export function buildFinancialsTableGridTemplate(
  yearCount: number,
  includeYoyColumn: boolean,
  options?: { fixedWidth?: boolean }
): string {
  const fixedWidth = options?.fixedWidth ?? false;
  const labelCol = fixedWidth ? "180px" : "minmax(180px, 1.4fr)";
  const yearColumns = fixedWidth
    ? `repeat(${yearCount}, 88px)`
    : `repeat(${yearCount}, minmax(88px, 1fr))`;
  const yoyCol = fixedWidth ? "72px" : "minmax(72px, 0.7fr)";
  return includeYoyColumn
    ? `${labelCol} ${yearColumns} ${yoyCol}`
    : `${labelCol} ${yearColumns}`;
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
