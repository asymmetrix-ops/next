import type { FiMetricFormat } from "./types";
import type { Currency, FXRates } from "@/lib/fxRates";
import { convertCurrency } from "@/lib/fxRates";

/** Format FI monetary metrics. Values from peers/target are already converted by the backend. */
export function convertFiMetricForDisplay(
  value: number | null,
  format: FiMetricFormat,
  _currency: Currency,
  _fxRates: FXRates | null,
  options?: { convertFromUsd?: boolean }
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (!options?.convertFromUsd) return value;
  if (_currency === "USD" || !_fxRates) return value;
  if (format === "currency" || format === "currency_k") {
    return convertCurrency(value, _currency, _fxRates);
  }
  return value;
}
