import type { FiMetricFormat } from "./types";
import type { Currency, FXRates } from "@/lib/fxRates";
import { convertCurrency } from "@/lib/fxRates";

/** FI monetary fields are stored in USD; convert for display when platform currency differs. */
export function convertFiMetricForDisplay(
  value: number | null,
  format: FiMetricFormat,
  currency: Currency,
  fxRates: FXRates | null
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (currency === "USD" || !fxRates) return value;
  if (format === "currency" || format === "currency_k") {
    return convertCurrency(value, currency, fxRates);
  }
  return value;
}
