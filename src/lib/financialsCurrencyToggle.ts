import type { CompanyFinancialMetricsCardRow } from "@/lib/companyFinancialMetricsCard";
import {
  extractCurrencyField,
  hasReportedCurrencyToggle,
} from "@/lib/currencyField";
import { FINANCIAL_METRICS_FIELDS } from "@/lib/financialFieldMaps";
import type { NormalizedIncomeStatementRow } from "@/lib/incomeStatement";
import { platformCurrencyIdToCode } from "@/lib/platformCurrency";

export type CurrencyDisplayMode = "preferred" | "native";

export type FxToggleConfig = {
  preferredCode: string;
  nativeCode: string;
  preferredSymbol: string;
  nativeSymbol: string;
};

const TOGGLE_CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
};

export function currencyCodeToToggleSymbol(code: string): string {
  const normalized = code.trim().toUpperCase();
  return TOGGLE_CURRENCY_SYMBOLS[normalized] ?? normalized;
}

function normalizeCurrencyCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function resolveReportedCurrencyFromMetricRows(
  metricRows: CompanyFinancialMetricsCardRow[],
  preferred: string
): string | null {
  for (const row of metricRows) {
    if (!hasReportedCurrencyToggle(row, FINANCIAL_METRICS_FIELDS)) continue;

    for (const [field, displayField] of Object.entries(FINANCIAL_METRICS_FIELDS)) {
      const extracted = extractCurrencyField(row, field, displayField);
      const reported =
        extracted.reportedCurrency?.trim().toUpperCase() ??
        extracted.preferredCurrency?.trim().toUpperCase() ??
        null;
      if (reported && reported !== preferred) return reported;
      if (reported) return reported;
    }
  }

  return null;
}

/** Source / filing currency from display fields or native_currency_id (live API shape). */
function resolveSourceCurrencyFromMetricRows(
  metricRows: CompanyFinancialMetricsCardRow[]
): string | null {
  for (const row of metricRows) {
    const record = row as Record<string, unknown>;
    for (const [field, displayField] of Object.entries(FINANCIAL_METRICS_FIELDS)) {
      const fromReported = normalizeCurrencyCode(
        readCurrencyDisplay(record[`${field}_reported_currency_display`])
      );
      if (fromReported) return fromReported;

      const extracted = extractCurrencyField(record, field, displayField);
      const fromDisplay = normalizeCurrencyCode(extracted.preferredCurrency);
      if (fromDisplay) return fromDisplay;

      const nativeId = record[`${field}_native_currency_id`];
      const fromNativeId = platformCurrencyIdToCode(Number(nativeId));
      if (fromNativeId) return fromNativeId;
    }
  }
  return null;
}

function readCurrencyDisplay(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  return String(value);
}

export function resolveFxToggleConfig(
  metricRows: CompanyFinancialMetricsCardRow[],
  incomeRows: NormalizedIncomeStatementRow[],
  preferredCode: string
): FxToggleConfig | null {
  const preferred = preferredCode.trim().toUpperCase();
  if (!preferred) return null;

  const hasFinancialsData =
    metricRows.length > 0 || incomeRows.length > 0;
  if (!hasFinancialsData) return null;

  let nativeCode: string | null = resolveReportedCurrencyFromMetricRows(
    metricRows,
    preferred
  );

  for (const row of metricRows) {
    if (nativeCode) break;
    if (!row.metric_fx) continue;
    for (const fx of Object.values(row.metric_fx)) {
      if (fx?.fx_converted && fx.native_currency_code) {
        nativeCode = fx.native_currency_code;
        break;
      }
    }
    if (nativeCode) break;
  }

  if (!nativeCode) {
    for (const row of incomeRows) {
      for (const fx of [
        row.revenue_fx,
        row.ebitda_fx,
        row.ebit_fx,
        row.revenue_per_fte_fx,
      ]) {
        if (fx?.fx_converted && fx.native_currency_code) {
          nativeCode = fx.native_currency_code;
          break;
        }
      }
      if (nativeCode) break;
    }
  }

  if (!nativeCode) {
    nativeCode = resolveSourceCurrencyFromMetricRows(metricRows);
  }

  if (!nativeCode) {
    nativeCode = preferred;
  }

  return {
    preferredCode: preferred,
    nativeCode: nativeCode.trim().toUpperCase(),
    preferredSymbol: currencyCodeToToggleSymbol(preferred),
    nativeSymbol: currencyCodeToToggleSymbol(nativeCode),
  };
}
