import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";

export type FinancialMetricFxInfo = {
  native_value?: number | null;
  native_currency_code?: string | null;
  fx_converted?: boolean;
  fx_rate?: number | null;
  fx_is_approximate?: boolean;
};

export type FinancialMetricFxInput = {
  native_value?: unknown;
  native_currency_code?: string | null;
  fx_converted?: boolean;
  fx_rate?: unknown;
  fx_is_approximate?: boolean;
};

export type DualCurrencyDisplay = {
  display: string;
  nativeDisplay?: string | null;
  fxTooltip?: string | null;
};

function parseNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function resolveCurrencyFromSymbol(symbol?: string | null): string | null {
  const trimmed = symbol?.trim();
  if (!trimmed) return null;
  if (trimmed === "$") return "USD";
  if (trimmed === "£") return "GBP";
  if (trimmed === "€") return "EUR";
  if (trimmed === "¥") return "JPY";
  return null;
}

export function resolveCurrencyCode(
  code?: string | null,
  symbol?: string | null
): string | null {
  const trimmedCode = code?.trim();
  if (trimmedCode) return trimmedCode.toUpperCase();
  return resolveCurrencyFromSymbol(symbol);
}

export function parseFinancialMetricFx(
  raw: FinancialMetricFxInput | null | undefined
): FinancialMetricFxInfo | null {
  if (!raw) return null;

  const native_value = parseNumeric(raw.native_value);
  const native_currency_code = resolveCurrencyCode(raw.native_currency_code);
  const fx_converted = raw.fx_converted === true;
  const fx_rate = parseNumeric(raw.fx_rate);
  const fx_is_approximate = raw.fx_is_approximate === true;

  if (!fx_converted || native_value == null || !native_currency_code) {
    return null;
  }

  return {
    native_value,
    native_currency_code,
    fx_converted,
    fx_rate,
    fx_is_approximate,
  };
}

export function buildFxTooltip(fx: FinancialMetricFxInfo | null | undefined): string | null {
  if (!fx?.fx_converted || fx.fx_rate == null) return null;
  const rounded =
    fx.fx_rate % 1 === 0
      ? String(Math.round(fx.fx_rate))
      : String(Math.round(fx.fx_rate * 10000) / 10000);
  return fx.fx_is_approximate
    ? `Converted at ${rounded} (approximate rate)`
    : `Converted at ${rounded}`;
}

function formatMillionsValue(value: number, currency?: string | null): string {
  const abs = Math.abs(value);
  const compact =
    abs >= 100
      ? Math.round(value).toLocaleString("en-US")
      : value.toFixed(1);
  return appendMetricCurrency(compact, currency ?? undefined);
}

function formatWholeMoneyValue(value: number, currency?: string | null): string {
  return appendMetricCurrency(Math.round(value).toLocaleString("en-US"), currency ?? undefined);
}

export type FxDisplayFormat =
  | "money_millions"
  | "money_whole"
  | "money_from_units";

export function formatNativeMoneyDisplay(
  fx: FinancialMetricFxInfo | null | undefined,
  format: FxDisplayFormat
): string | null {
  if (!fx?.fx_converted || fx.native_value == null || !fx.native_currency_code) {
    return null;
  }

  switch (format) {
    case "money_millions":
      return formatMillionsValue(fx.native_value, fx.native_currency_code);
    case "money_whole":
      return formatWholeMoneyValue(fx.native_value, fx.native_currency_code);
    case "money_from_units":
      return formatMillionsValue(fx.native_value / 1_000_000, fx.native_currency_code);
    default:
      return null;
  }
}

export function buildDualCurrencyDisplay(
  primaryDisplay: string,
  fx: FinancialMetricFxInfo | null | undefined,
  format: FxDisplayFormat
): DualCurrencyDisplay {
  const nativeDisplay = formatNativeMoneyDisplay(fx, format);
  if (!nativeDisplay || primaryDisplay === "-") {
    return { display: primaryDisplay };
  }

  return {
    display: primaryDisplay,
    nativeDisplay,
    fxTooltip: buildFxTooltip(fx),
  };
}
