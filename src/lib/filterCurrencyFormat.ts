import type { Currency } from "@/lib/fxRates";
import { CURRENCY_OPTIONS } from "@/lib/fxRates";

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_OPTIONS.find((option) => option.value === currency)?.symbol ?? "$";
}

export function isCurrencyFilterUnit(unit?: string): unit is "$m" | "$k" | "m" {
  return unit === "$m" || unit === "$k" || unit === "m";
}

export function localizeCurrencyFilterUnit(unit: string, symbol: string): string {
  if (unit === "$m" || unit === "m") return `${symbol}m`;
  if (unit === "$k") return `${symbol}k`;
  return unit;
}

export function localizeCurrencyPresetLabel(label: string, symbol: string): string {
  return label.replace(/\$/g, symbol);
}

function isMillionsCurrencyUnit(unit?: string): boolean {
  return unit === "$m" || unit === "m";
}

export { isMillionsCurrencyUnit };

export function formatFilterCurrencyValue(
  n: number,
  unit: string | undefined,
  symbol: string,
  options?: { isYearRange?: boolean }
): string {
  if (isMillionsCurrencyUnit(unit) && Math.abs(n) >= 1000) {
    return `${symbol}${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}b`;
  }
  if (isMillionsCurrencyUnit(unit)) {
    return `${symbol}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}m`;
  }
  if (unit === "$k") return `${symbol}${n}k`;
  if (unit === "%") return `${n}%`;
  if (unit === "x") return `${n}x`;
  if (unit === "yrs") return `${n}y`;
  if (options?.isYearRange) return String(n);
  return n.toLocaleString();
}
