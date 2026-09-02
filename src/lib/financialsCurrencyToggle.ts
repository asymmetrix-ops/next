import type { CompanyFinancialMetricsCardRow } from "@/lib/companyFinancialMetricsCard";
import {
  extractCurrencyField,
  hasReportedCurrencyToggle,
} from "@/lib/currencyField";
import { FINANCIAL_METRICS_FIELDS } from "@/lib/financialFieldMaps";
import type { NormalizedIncomeStatementRow } from "@/lib/incomeStatement";

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
    }
  }

  return null;
}

export function resolveFxToggleConfig(
  metricRows: CompanyFinancialMetricsCardRow[],
  incomeRows: NormalizedIncomeStatementRow[],
  preferredCode: string
): FxToggleConfig | null {
  const preferred = preferredCode.trim().toUpperCase();
  if (!preferred) return null;

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

  if (!nativeCode || nativeCode === preferred) return null;

  return {
    preferredCode: preferred,
    nativeCode,
    preferredSymbol: currencyCodeToToggleSymbol(preferred),
    nativeSymbol: currencyCodeToToggleSymbol(nativeCode),
  };
}
