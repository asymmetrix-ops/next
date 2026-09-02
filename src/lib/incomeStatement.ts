import type { FinancialMetricFxInfo } from "@/lib/fxDisplay";
import { parseFinancialMetricFx, resolveCurrencyCode } from "@/lib/fxDisplay";
import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { extractCurrencyField } from "@/lib/currencyField";
import { FINANCIAL_METRICS_FIELDS } from "@/lib/financialFieldMaps";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";
import type { CurrencyMode } from "@/types/financials";

export type IncomeStatementApiEntry = {
  id: number;
  period_display_end_date?: string;
  period_end_date?: string;
  period_type?: string;
  period_year?: number | string | null;
  revenue?: number | string | null;
  ebit?: number | string | null;
  ebitda?: number | string | null;
  EBIT_margin_pc?: number | string | null;
  EBITDA_margin_pc?: number | string | null;
  FTE_count?: number | string | null;
  Revenue_per_FTE?: number | string | null;
  statement_currency?: string | null;
  Income_statement_currency?: string | null;
  currency?: string | null;
  cost_of_goods_sold_currency?: string | null;
  revenue_native_value?: number | string | null;
  revenue_native_currency_code?: string | null;
  revenue_native_currency_symbol?: string | null;
  revenue_fx_converted?: boolean;
  revenue_fx_rate?: number | string | null;
  revenue_fx_is_approximate?: boolean;
  ebitda_native_value?: number | string | null;
  ebitda_native_currency_code?: string | null;
  ebitda_native_currency_symbol?: string | null;
  ebitda_fx_converted?: boolean;
  ebitda_fx_rate?: number | string | null;
  ebitda_fx_is_approximate?: boolean;
  ebit_native_value?: number | string | null;
  ebit_native_currency_code?: string | null;
  ebit_native_currency_symbol?: string | null;
  ebit_fx_converted?: boolean;
  ebit_fx_rate?: number | string | null;
  ebit_fx_is_approximate?: boolean;
  Revenue_per_FTE_native_value?: number | string | null;
  Revenue_per_FTE_native_currency_code?: string | null;
  Revenue_per_FTE_native_currency_symbol?: string | null;
  Revenue_per_FTE_fx_converted?: boolean;
  Revenue_per_FTE_fx_rate?: number | string | null;
  Revenue_per_FTE_fx_is_approximate?: boolean;
};

export type NormalizedIncomeStatementRow = {
  id: number;
  period_display_end_date?: string;
  period_end_date?: string;
  period_type?: string;
  period_year?: number | null;
  revenue?: number | null;
  ebit?: number | null;
  ebitda?: number | null;
  ebit_margin_pc?: number | null;
  ebitda_margin_pc?: number | null;
  fte_count?: number | null;
  revenue_per_fte?: number | null;
  statement_currency?: string;
  revenue_fx?: FinancialMetricFxInfo | null;
  ebitda_fx?: FinancialMetricFxInfo | null;
  ebit_fx?: FinancialMetricFxInfo | null;
  revenue_per_fte_fx?: FinancialMetricFxInfo | null;
  /** Filing / reported currency for the period (not platform currency). */
  reported_currency?: string;
  cost_of_goods_sold_currency?: string;
};

function sanitizeCurrencyCode(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || /^\d+$/.test(trimmed)) return undefined;
  if (trimmed.toUpperCase() === "US$" || trimmed.toUpperCase() === "US") {
    return "USD";
  }
  return trimmed.toUpperCase();
}

function parseNumeric(value?: number | string | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseIncomeStatementBlocks(
  blocks: Array<{ income_statements?: IncomeStatementApiEntry[] | string }> | undefined
): IncomeStatementApiEntry[] {
  return (blocks || []).flatMap((block) => {
    const raw = block?.income_statements as unknown;
    if (!raw) return [] as IncomeStatementApiEntry[];
    if (typeof raw === "string") {
      try {
        const decoded = JSON.parse(
          raw.replace(/\\u0022/g, '"')
        ) as unknown;
        return Array.isArray(decoded)
          ? (decoded as IncomeStatementApiEntry[])
          : [];
      } catch {
        return [] as IncomeStatementApiEntry[];
      }
    }
    return (raw as IncomeStatementApiEntry[]) || [];
  });
}

function normalizeIncomeStatementFx(
  row: IncomeStatementApiEntry,
  prefix: "revenue" | "ebitda" | "ebit" | "Revenue_per_FTE"
): FinancialMetricFxInfo | null {
  const nativeValueKey = `${prefix}_native_value` as keyof IncomeStatementApiEntry;
  const nativeCodeKey = `${prefix}_native_currency_code` as keyof IncomeStatementApiEntry;
  const nativeSymbolKey = `${prefix}_native_currency_symbol` as keyof IncomeStatementApiEntry;
  const fxConvertedKey = `${prefix}_fx_converted` as keyof IncomeStatementApiEntry;
  const fxRateKey = `${prefix}_fx_rate` as keyof IncomeStatementApiEntry;
  const fxApproxKey = `${prefix}_fx_is_approximate` as keyof IncomeStatementApiEntry;

  return parseFinancialMetricFx({
    native_value: row[nativeValueKey],
    native_currency_code: resolveCurrencyCode(
      row[nativeCodeKey] as string | null | undefined,
      row[nativeSymbolKey] as string | null | undefined
    ),
    fx_converted: row[fxConvertedKey] as boolean | undefined,
    fx_rate: row[fxRateKey],
    fx_is_approximate: row[fxApproxKey] as boolean | undefined,
  });
}

function normalizeRow(row: IncomeStatementApiEntry): NormalizedIncomeStatementRow {
  const revenue = parseNumeric(row.revenue);
  const fteCount = parseNumeric(row.FTE_count);
  const revenuePerFte = parseNumeric(row.Revenue_per_FTE);
  const filingCurrency =
    sanitizeCurrencyCode(row.cost_of_goods_sold_currency) ||
    sanitizeCurrencyCode(row.statement_currency) ||
    sanitizeCurrencyCode(row.Income_statement_currency) ||
    sanitizeCurrencyCode(row.currency);

  const normalized: NormalizedIncomeStatementRow = {
    id: row.id,
    period_display_end_date: row.period_display_end_date,
    period_end_date: row.period_end_date,
    period_type: row.period_type?.trim() || undefined,
    period_year: parseNumeric(row.period_year) ?? null,
    revenue: revenue ?? null,
    ebit: parseNumeric(row.ebit) ?? null,
    ebitda: parseNumeric(row.ebitda) ?? null,
    ebit_margin_pc: parseNumeric(row.EBIT_margin_pc) ?? null,
    ebitda_margin_pc: parseNumeric(row.EBITDA_margin_pc) ?? null,
    fte_count: fteCount ?? null,
    revenue_per_fte:
      revenuePerFte ??
      (revenue != null && fteCount != null && fteCount > 0
        ? revenue / fteCount
        : null),
    statement_currency: filingCurrency,
    reported_currency: filingCurrency,
    cost_of_goods_sold_currency: filingCurrency,
    revenue_fx: normalizeIncomeStatementFx(row, "revenue"),
    ebitda_fx: normalizeIncomeStatementFx(row, "ebitda"),
    ebit_fx: normalizeIncomeStatementFx(row, "ebit"),
    revenue_per_fte_fx: normalizeIncomeStatementFx(row, "Revenue_per_FTE"),
  };

  return copyIncomeStatementReportedFields(normalized, row);
}

function parseQuarterYearFromDisplay(display: string): { year: number; quarter: number } | null {
  const compact = display.replace(/[\s,]/g, "");
  const match =
    compact.match(/^Q([1-4])(20\d{2})$/i) ||
    compact.match(/^Q([1-4])[-/](20\d{2})$/i) ||
    compact.match(/^Q\s?([1-4])\s?[-/]?\s?(20\d{2})$/i);
  if (!match) return null;
  return { quarter: Number(match[1]), year: Number(match[2]) };
}

function parseFiscalYearFromDisplay(display: string): number | null {
  const compact = display.replace(/[\s,]/g, "");
  const fyMatch = compact.match(/^FY(20\d{2})$/i);
  if (fyMatch) return Number(fyMatch[1]);
  const yearMatch = compact.match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : null;
}

/** Comparable UTC timestamp for column ordering (oldest → newest, left → right). */
export function incomeStatementPeriodSortKey(
  row: NormalizedIncomeStatementRow
): number {
  if (row.period_end_date) {
    const parsed = Date.parse(row.period_end_date);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const display = (row.period_display_end_date || "").trim();
  if (display) {
    const quarter = parseQuarterYearFromDisplay(display);
    if (quarter) {
      // End-of-quarter month/day for stable ordering vs fiscal years.
      const monthIndex = quarter.quarter * 3 - 1;
      return Date.UTC(quarter.year, monthIndex + 1, 0);
    }

    const fiscalYear = parseFiscalYearFromDisplay(display);
    if (fiscalYear != null) {
      return Date.UTC(fiscalYear, 11, 31);
    }
  }

  if (row.period_year != null) {
    const periodType = (row.period_type || "").toLowerCase();
    if (periodType.includes("quarter")) {
      return Date.UTC(row.period_year, 11, 31);
    }
    return Date.UTC(row.period_year, 11, 31);
  }

  return 0;
}

/** Oldest → newest (left-to-right in the table). */
export function sortIncomeStatementRowsAsc(
  rows: NormalizedIncomeStatementRow[]
): NormalizedIncomeStatementRow[] {
  return [...rows].sort(
    (a, b) => incomeStatementPeriodSortKey(a) - incomeStatementPeriodSortKey(b)
  );
}

function periodSortKey(row: NormalizedIncomeStatementRow): number {
  return incomeStatementPeriodSortKey(row);
}

/** Parses API income-statement blocks and returns up to 3 most recent periods. */
export function normalizeIncomeStatementRows(
  blocks: Array<{ income_statements?: IncomeStatementApiEntry[] | string }> | undefined,
  limit = 3
): NormalizedIncomeStatementRow[] {
  const sorted = sortIncomeStatementRowsAsc(
    parseIncomeStatementBlocks(blocks).map(normalizeRow)
  );
  return sorted.slice(-limit);
}

/** Normalizes rows from `company_income_statement_card` (flat array). */
export function normalizeIncomeStatementApiRows(
  rows: IncomeStatementApiEntry[] | undefined,
  limit = INCOME_STATEMENT_DISPLAY_YEAR_COUNT
): NormalizedIncomeStatementRow[] {
  return selectIncomeStatementYearColumns(
    (rows || []).map(normalizeRow),
    limit
  );
}

/** Normalizes full income-statement history (all periods, deduped). */
export function dedupeIncomeStatementPeriods(
  rows: NormalizedIncomeStatementRow[]
): NormalizedIncomeStatementRow[] {
  const byPeriod = new Map<string, NormalizedIncomeStatementRow>();

  for (const row of rows) {
    const key = incomeStatementPeriodKey(row);
    const existing = byPeriod.get(key);
    if (!existing || row.id >= existing.id) {
      byPeriod.set(key, row);
    }
  }

  return sortIncomeStatementRowsAsc(Array.from(byPeriod.values()));
}

function incomeStatementPeriodKey(row: NormalizedIncomeStatementRow): string {
  const endDate = row.period_end_date?.trim();
  const periodType = (row.period_type || "").trim().toLowerCase();
  if (endDate && periodType) return `${periodType}:${endDate}`;
  if (endDate) return endDate;
  const display = (row.period_display_end_date || "")
    .replace(/[\s,]/g, "")
    .toLowerCase();
  if (display) return display;
  return `id:${row.id}`;
}

/** Normalizes full income-statement history (all periods from API). */
export function normalizeIncomeStatementHistoryRows(
  rows: IncomeStatementApiEntry[] | undefined
): NormalizedIncomeStatementRow[] {
  return dedupeIncomeStatementPeriods((rows || []).map(normalizeRow));
}

export function hasIncomeStatementValues(
  rows: NormalizedIncomeStatementRow[]
): boolean {
  return rows.some(
    (row) =>
      row.revenue != null ||
      row.ebit != null ||
      row.ebitda != null ||
      row.ebit_margin_pc != null ||
      row.ebitda_margin_pc != null
  );
}

function resolvePeriodYear(row: NormalizedIncomeStatementRow): number | null {
  if (row.period_year != null) return row.period_year;
  if (row.period_end_date) {
    const y = new Date(row.period_end_date).getFullYear();
    return Number.isFinite(y) ? y : null;
  }
  const display = (row.period_display_end_date || "").trim();
  const quarter = parseQuarterYearFromDisplay(display);
  if (quarter) return quarter.year;
  return parseFiscalYearFromDisplay(display);
}

/** Income statement may show up to three fiscal years when available. */
export const INCOME_STATEMENT_DISPLAY_YEAR_COUNT = 3;

/** Picks up to N fiscal-year columns, preferring fiscal_year over quarterly for the same year. */
export function selectIncomeStatementYearColumns(
  rows: NormalizedIncomeStatementRow[],
  limit: number | null = INCOME_STATEMENT_DISPLAY_YEAR_COUNT
): NormalizedIncomeStatementRow[] {
  const byYear = new Map<number, NormalizedIncomeStatementRow>();

  for (const row of rows) {
    const year = resolvePeriodYear(row);
    if (year == null) continue;
    const existing = byYear.get(year);
    if (!existing) {
      byYear.set(year, row);
      continue;
    }
    const rowIsFy = row.period_type === "fiscal_year";
    const existingIsFy = existing.period_type === "fiscal_year";
    if (rowIsFy && !existingIsFy) {
      byYear.set(year, row);
    } else if (rowIsFy === existingIsFy) {
      const rowKey = periodSortKey(row);
      const existingKey = periodSortKey(existing);
      if (rowKey >= existingKey) byYear.set(year, row);
    }
  }

  const sortedEntries = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);
  const selected =
    limit == null
      ? sortedEntries
      : sortedEntries.slice(-Math.max(0, limit));

  return sortIncomeStatementRowsAsc(selected.map(([, row]) => row));
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  fiscal_year: "FY",
  fy: "FY",
  full_year: "FY",
  h1: "H1",
  h2: "H2",
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4: "Q4",
};

/** Human-readable period label that reflects period_type (FY/H1/H2/Q1-4), not just the year. */
export function formatIncomeStatementPeriodLabel(
  row: NormalizedIncomeStatementRow
): string {
  const rawDisplay = (row.period_display_end_date || "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (rawDisplay) return rawDisplay;

  const periodType = (row.period_type || "").trim().toLowerCase();
  const label = PERIOD_TYPE_LABELS[periodType];
  if (label && row.period_year != null) return `${label} ${row.period_year}`;
  if (row.period_year != null) return `FY ${row.period_year}`;
  return "-";
}

export function resolveIncomeStatementCurrency(
  rows: NormalizedIncomeStatementRow[],
  fallback?: string
): string {
  const explicit = sanitizeCurrencyCode(fallback);
  if (explicit) return explicit;
  for (const row of rows) {
    const code = sanitizeCurrencyCode(row.statement_currency);
    if (code) return code;
  }
  return "";
}

export type IncomeStatementMoneyField = "revenue" | "ebit" | "ebitda";

const INCOME_STATEMENT_MONEY_FIELDS: IncomeStatementMoneyField[] = [
  "revenue",
  "ebit",
  "ebitda",
];

const FINANCIAL_METRIC_TO_INCOME_FIELD = {
  Revenue_m: "revenue",
  EBIT_m: "ebit",
  EBITDA_m: "ebitda",
} as const satisfies Record<string, IncomeStatementMoneyField>;

type FinancialMetricAmountField = keyof typeof FINANCIAL_METRIC_TO_INCOME_FIELD;

function asIncomeStatementRecord(
  row: NormalizedIncomeStatementRow
): Record<string, unknown> {
  return row as unknown as Record<string, unknown>;
}

function copyIncomeStatementReportedFields(
  normalized: NormalizedIncomeStatementRow,
  row: IncomeStatementApiEntry
): NormalizedIncomeStatementRow {
  const target = asIncomeStatementRecord(normalized);
  const source = row as unknown as Record<string, unknown>;

  for (const field of INCOME_STATEMENT_MONEY_FIELDS) {
    for (const suffix of [
      "_reported_value",
      "_reported_currency_display",
      "_converted",
      "_is_approximate",
    ] as const) {
      const key = `${field}${suffix}`;
      if (source[key] != null) target[key] = source[key];
    }
  }

  return normalized;
}

export function readIncomeStatementReportedValue(
  row: NormalizedIncomeStatementRow,
  field: IncomeStatementMoneyField
): number | null | undefined {
  const raw = asIncomeStatementRecord(row)[`${field}_reported_value`];
  if (raw == null) return undefined;
  const parsed = parseNumeric(raw as number | string | null | undefined);
  return parsed ?? null;
}

export function readIncomeStatementReportedCurrency(
  row: NormalizedIncomeStatementRow,
  field: IncomeStatementMoneyField
): string | undefined {
  const raw = asIncomeStatementRecord(row)[`${field}_reported_currency_display`];
  return (
    sanitizeCurrencyCode(typeof raw === "string" ? raw : undefined) ||
    row.reported_currency ||
    row.statement_currency
  );
}

function buildIncomeStatementFxFromReported(
  reportedUnits: number | null | undefined,
  reportedCurrency?: string,
  isApproximate = false
): FinancialMetricFxInfo | null {
  const currency = sanitizeCurrencyCode(reportedCurrency);
  if (reportedUnits == null || !currency) return null;
  return {
    native_value: reportedUnits,
    native_currency_code: currency,
    fx_converted: true,
    fx_is_approximate: isApproximate,
  };
}

function metricFxToIncomeStatementFx(
  fx: FinancialMetricFxInfo | null | undefined
): FinancialMetricFxInfo | null {
  if (!fx?.fx_converted || fx.native_value == null || !fx.native_currency_code) {
    return null;
  }
  const nativeUnits =
    Math.abs(fx.native_value) < 1_000_000
      ? fx.native_value * 1_000_000
      : fx.native_value;
  return {
    ...fx,
    native_value: nativeUnits,
  };
}

function attachFinancialMetricCurrencyField(
  incomeRow: NormalizedIncomeStatementRow,
  metricsRow: FinancialMetricsIncomeRow,
  metricField: FinancialMetricAmountField
): NormalizedIncomeStatementRow {
  const incomeField = FINANCIAL_METRIC_TO_INCOME_FIELD[metricField];
  const displayField = FINANCIAL_METRICS_FIELDS[metricField];
  if (!displayField) return incomeRow;

  const rawMetrics = metricsRow as unknown as Record<string, unknown>;
  const pair = extractCurrencyField(rawMetrics, metricField, displayField);
  const preferredUnits = millionsToRaw(pair.preferredValue ?? metricsRow[metricField]);
  const reportedUnits = millionsToRaw(pair.reportedValue);
  const reportedCurrency =
    sanitizeCurrencyCode(pair.reportedCurrency ?? undefined) ||
    sanitizeCurrencyCode(metricsRow.Income_statement_currency);

  const next = { ...incomeRow };
  const record = asIncomeStatementRecord(next);
  next[incomeField] = preferredUnits;

  if (reportedUnits != null) {
    record[`${incomeField}_reported_value`] = reportedUnits;
  }
  if (reportedCurrency) {
    record[`${incomeField}_reported_currency_display`] = reportedCurrency;
    next.reported_currency = reportedCurrency;
    next.statement_currency = reportedCurrency;
    next.cost_of_goods_sold_currency = reportedCurrency;
  }
  if (pair.converted) {
    record[`${incomeField}_converted`] = true;
  }
  if (pair.isApproximate) {
    record[`${incomeField}_is_approximate`] = true;
  }

  const fxKey =
    incomeField === "revenue"
      ? "revenue_fx"
      : incomeField === "ebit"
        ? "ebit_fx"
        : "ebitda_fx";
  const metricFx = metricFxToIncomeStatementFx(
    metricsRow.metric_fx?.[incomeField] ?? null
  );
  const reportedFx =
    pair.converted && reportedUnits != null && reportedCurrency
      ? buildIncomeStatementFxFromReported(
          reportedUnits,
          reportedCurrency,
          pair.isApproximate
        )
      : null;

  next[fxKey] = next[fxKey] ?? metricFx ?? reportedFx;

  return next;
}

function mergeIncomeStatementCurrencyMetadata(
  primary: NormalizedIncomeStatementRow,
  supplement: NormalizedIncomeStatementRow
): NormalizedIncomeStatementRow {
  const merged: NormalizedIncomeStatementRow = { ...primary };
  const mergedRecord = asIncomeStatementRecord(merged);
  const supplementRecord = asIncomeStatementRecord(supplement);

  for (const field of INCOME_STATEMENT_MONEY_FIELDS) {
    const fxKey =
      field === "revenue"
        ? "revenue_fx"
        : field === "ebit"
          ? "ebit_fx"
          : "ebitda_fx";

    if (!merged[fxKey] && supplement[fxKey]) {
      merged[fxKey] = supplement[fxKey];
    }

    for (const suffix of [
      "_reported_value",
      "_reported_currency_display",
      "_converted",
      "_is_approximate",
    ] as const) {
      const key = `${field}${suffix}`;
      if (mergedRecord[key] == null && supplementRecord[key] != null) {
        mergedRecord[key] = supplementRecord[key];
      }
    }
  }

  merged.reported_currency =
    merged.reported_currency ||
    supplement.reported_currency ||
    merged.statement_currency ||
    supplement.statement_currency;
  merged.statement_currency =
    merged.reported_currency ||
    merged.statement_currency ||
    supplement.statement_currency;
  merged.cost_of_goods_sold_currency =
    merged.cost_of_goods_sold_currency ||
    supplement.cost_of_goods_sold_currency ||
    merged.reported_currency;

  return merged;
}

function resolveIncomeStatementFx(
  row: NormalizedIncomeStatementRow,
  field: IncomeStatementMoneyField
): FinancialMetricFxInfo | null | undefined {
  if (field === "revenue") return row.revenue_fx;
  if (field === "ebit") return row.ebit_fx;
  return row.ebitda_fx;
}

function formatIncomeMoneyFromUnits(
  value: number | null | undefined,
  currency?: string
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return appendMetricCurrency(
    formatMetricMillionsPlain(value / 1_000_000),
    currency
  );
}

/** Profile + card income statement values respecting platform vs reported currency. */
export function formatIncomeStatementMoneyDisplay(
  row: NormalizedIncomeStatementRow,
  field: IncomeStatementMoneyField,
  currencyMode: CurrencyMode,
  preferredCurrency: string
): string {
  const preferredValue = row[field];
  const platformCurrency = preferredCurrency.trim().toUpperCase();

  if (currencyMode === "preferred") {
    return formatIncomeMoneyFromUnits(preferredValue, platformCurrency);
  }

  const fx = resolveIncomeStatementFx(row, field);
  if (fx?.fx_converted && fx.native_value != null) {
    return formatIncomeMoneyFromUnits(
      fx.native_value,
      sanitizeCurrencyCode(fx.native_currency_code) ??
        readIncomeStatementReportedCurrency(row, field) ??
        platformCurrency
    );
  }

  const reportedValue = readIncomeStatementReportedValue(row, field);
  const reportedCurrency = readIncomeStatementReportedCurrency(row, field);
  if (reportedValue != null) {
    return formatIncomeMoneyFromUnits(
      reportedValue,
      reportedCurrency ?? platformCurrency
    );
  }

  return formatIncomeMoneyFromUnits(
    preferredValue,
    reportedCurrency ?? row.reported_currency ?? row.statement_currency ?? platformCurrency
  );
}

type FinancialMetricsIncomeRow = {
  id?: number;
  financial_year_int?: number | null;
  financial_year_text?: string | null;
  Revenue_m?: number | string | null;
  Revenue_currency_display?: string | null;
  Revenue_source_label?: string | null;
  EBITDA_m?: number | string | null;
  EBITDA_currency_display?: string | null;
  EBITDA_source_label?: string | null;
  EBIT_m?: number | string | null;
  EBIT_currency_display?: string | null;
  EBIT_source_label?: string | null;
  Income_statement_currency?: string | null;
  metric_fx?: Partial<
    Record<
      IncomeStatementMoneyField,
      {
        native_value?: number | null;
        native_currency_code?: string | null;
        fx_converted?: boolean;
        fx_is_approximate?: boolean;
      }
    >
  >;
};

function isEstimateSourceLabel(label: unknown): boolean {
  if (typeof label !== "string") return false;
  return label.trim().toLowerCase() === "estimate";
}

/** Resolves income-statement currency from a financial-metrics card row. */
export function resolveFinancialMetricsIncomeCurrency(
  row: FinancialMetricsIncomeRow
): string | undefined {
  return (
    sanitizeCurrencyCode(row.Income_statement_currency) ||
    sanitizeCurrencyCode(row.Revenue_currency_display) ||
    sanitizeCurrencyCode(row.EBIT_currency_display) ||
    sanitizeCurrencyCode(row.EBITDA_currency_display) ||
    undefined
  );
}

/** First valid income-statement currency across financial-metrics card rows. */
export function resolveFinancialMetricsCardCurrency(
  rows: FinancialMetricsIncomeRow[]
): string {
  for (const row of rows) {
    const code = resolveFinancialMetricsIncomeCurrency(row);
    if (code) return code;
  }
  return "";
}

function millionsToRaw(value: number | string | null | undefined): number | null {
  const millions = parseNumeric(value);
  if (millions == null) return null;
  return millions * 1_000_000;
}

/**
 * Builds income-statement-shaped rows from multi-year financial metrics card data.
 * Excludes rows whose values are all forward-looking "Estimate" figures — the income
 * statement should only reflect actual/reported periods, not projections.
 */
export function buildIncomeStatementFromFinancialMetrics(
  rows: FinancialMetricsIncomeRow[]
): NormalizedIncomeStatementRow[] {
  return rows.flatMap((row, index) => {
    const year =
      parseNumeric(row.financial_year_int) ??
      parseNumeric(row.financial_year_text);
    if (year == null) return [];

    const revenue = millionsToRaw(row.Revenue_m);
    const ebit = millionsToRaw(row.EBIT_m);
    const ebitda = millionsToRaw(row.EBITDA_m);
    if (revenue == null && ebit == null && ebitda == null) return [];

    const allEstimate =
      (revenue == null || isEstimateSourceLabel(row.Revenue_source_label)) &&
      (ebit == null || isEstimateSourceLabel(row.EBIT_source_label)) &&
      (ebitda == null || isEstimateSourceLabel(row.EBITDA_source_label));
    if (allEstimate) return [];

    let incomeRow: NormalizedIncomeStatementRow = {
      id: row.id ?? index,
      period_type: "fiscal_year",
      period_year: year,
      period_display_end_date: `FY${year}`,
      revenue,
      ebit,
      ebitda,
      reported_currency: sanitizeCurrencyCode(row.Income_statement_currency),
      statement_currency: sanitizeCurrencyCode(row.Income_statement_currency),
      cost_of_goods_sold_currency: sanitizeCurrencyCode(row.Income_statement_currency),
    };

    incomeRow = attachFinancialMetricCurrencyField(incomeRow, row, "Revenue_m");
    incomeRow = attachFinancialMetricCurrencyField(incomeRow, row, "EBIT_m");
    incomeRow = attachFinancialMetricCurrencyField(incomeRow, row, "EBITDA_m");

    return [incomeRow];
  });
}

function applyIncomeStatementCurrency(
  rows: NormalizedIncomeStatementRow[],
  fallbackCurrency?: string
): NormalizedIncomeStatementRow[] {
  const resolvedFallback = sanitizeCurrencyCode(fallbackCurrency);
  if (!resolvedFallback) return rows;

  return sortIncomeStatementRowsAsc(
    rows.map((row) => ({
      ...row,
      // Preserve filing/reported currency; only fill when missing.
      statement_currency: row.statement_currency ?? resolvedFallback,
      reported_currency: row.reported_currency ?? row.statement_currency ?? resolvedFallback,
    }))
  );
}

function buildConvertedIncomeStatementBaseRows({
  apiRows = [],
  profileRows = [],
  financialMetricsRows = [],
}: {
  apiRows?: NormalizedIncomeStatementRow[];
  profileRows?: NormalizedIncomeStatementRow[];
  financialMetricsRows?: FinancialMetricsIncomeRow[];
}): NormalizedIncomeStatementRow[] {
  const fromMetrics = buildIncomeStatementFromFinancialMetrics(financialMetricsRows);
  const metricsByYear = new Map<number, NormalizedIncomeStatementRow>();
  for (const row of fromMetrics) {
    const year = resolvePeriodYear(row);
    if (year != null) metricsByYear.set(year, row);
  }

  const enrichedMetrics = fromMetrics.map((row) => {
    const year = resolvePeriodYear(row);
    if (year == null) return row;
    const apiMatch = apiRows.find(
      (candidate) =>
        candidate.period_type === "fiscal_year" && resolvePeriodYear(candidate) === year
    );
    return apiMatch ? mergeIncomeStatementCurrencyMetadata(row, apiMatch) : row;
  });

  const metricFiscalYears = new Set(metricsByYear.keys());
  const supplementalApi = apiRows.filter((row) => {
    if (row.period_type !== "fiscal_year") return true;
    const year = resolvePeriodYear(row);
    return year == null || !metricFiscalYears.has(year);
  });

  const hasApiData = enrichedMetrics.length > 0 || apiRows.length > 0;
  if (!hasApiData) return profileRows;

  return dedupeIncomeStatementPeriods([...enrichedMetrics, ...supplementalApi]);
}

/** Merges profile and card income-statement API rows (excludes financial metrics estimates). */
export function resolveDisplayIncomeStatementRows({
  apiRows = [],
  historyRows = [],
  profileRows = [],
  financialMetricsRows = [],
  limit = INCOME_STATEMENT_DISPLAY_YEAR_COUNT,
  fallbackCurrency,
}: {
  apiRows?: NormalizedIncomeStatementRow[];
  /** Full `income_statement_history` from the card API — fills fiscal years beyond metrics. */
  historyRows?: NormalizedIncomeStatementRow[];
  profileRows?: NormalizedIncomeStatementRow[];
  financialMetricsRows?: FinancialMetricsIncomeRow[];
  limit?: number | null;
  fallbackCurrency?: string;
}): NormalizedIncomeStatementRow[] {
  const combinedApiRows = dedupeIncomeStatementPeriods([
    ...apiRows,
    ...historyRows,
  ]);
  const merged = selectIncomeStatementYearColumns(
    buildConvertedIncomeStatementBaseRows({
      apiRows: combinedApiRows,
      profileRows,
      financialMetricsRows,
    }),
    limit
  );

  return applyIncomeStatementCurrency(merged, fallbackCurrency);
}

/** Full period history for the Financials tab (quarters + fiscal years, deduped). */
export function resolveDisplayIncomeStatementHistoryRows({
  apiRows = [],
  historyRows = [],
  profileRows = [],
  financialMetricsRows = [],
  fallbackCurrency,
}: {
  apiRows?: NormalizedIncomeStatementRow[];
  historyRows?: NormalizedIncomeStatementRow[];
  profileRows?: NormalizedIncomeStatementRow[];
  financialMetricsRows?: FinancialMetricsIncomeRow[];
  fallbackCurrency?: string;
}): NormalizedIncomeStatementRow[] {
  const combinedApiRows = dedupeIncomeStatementPeriods([
    ...apiRows,
    ...historyRows,
  ]);
  const merged = buildConvertedIncomeStatementBaseRows({
    apiRows: combinedApiRows,
    profileRows,
    financialMetricsRows,
  });

  return applyIncomeStatementCurrency(merged, fallbackCurrency);
}
