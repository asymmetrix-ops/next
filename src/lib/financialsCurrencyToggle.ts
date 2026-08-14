import type { CompanyFinancialMetricsCardRow } from "@/lib/companyFinancialMetricsCard";
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

export function resolveFxToggleConfig(
  metricRows: CompanyFinancialMetricsCardRow[],
  incomeRows: NormalizedIncomeStatementRow[],
  preferredCode: string
): FxToggleConfig | null {
  const preferred = preferredCode.trim().toUpperCase();
  if (!preferred) return null;

  let nativeCode: string | null = null;

  for (const row of metricRows) {
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
