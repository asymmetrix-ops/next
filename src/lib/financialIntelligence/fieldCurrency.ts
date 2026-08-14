import { platformCurrencyIdToCode } from "@/lib/platformCurrency";
import type { FiCompanyRow, FiMetricKey } from "./types";

/** Backend monetary field prefixes (`apply_preferred_currency_conversion`). */
export type FiMonetaryField =
  | "revenue"
  | "subscription_revenue"
  | "ebitda"
  | "ebit"
  | "ev"
  | "revenue_per_employee";

export const FI_METRIC_KEY_TO_MONETARY_FIELD: Partial<
  Record<FiMetricKey, FiMonetaryField>
> = {
  revenue_m_usd: "revenue",
  ebitda_m_usd: "ebitda",
  ebit_m_usd: "ebit",
  ev_usd: "ev",
  subscription_revenue_m: "subscription_revenue",
  revenue_per_employee: "revenue_per_employee",
};

/** FinRow column id → backend monetary field prefix. */
export const FIN_ROW_COLUMN_TO_MONETARY_FIELD: Partial<
  Record<string, FiMonetaryField>
> = {
  revenue: "revenue",
  ebitda: "ebitda",
  ebit: "ebit",
  ev: "ev",
  subscription_revenue_m: "subscription_revenue",
  rev_per_employee: "revenue_per_employee",
};

function readRowString(row: FiCompanyRow, key: string): string | null {
  const value = (row as unknown as Record<string, unknown>)[key];
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toUpperCase();
}

function readRowBoolean(row: FiCompanyRow, key: string): boolean | undefined {
  const value = (row as unknown as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : undefined;
}

function readRowNativeCurrencyId(row: FiCompanyRow, key: string): number | null {
  const value = (row as unknown as Record<string, unknown>)[key];
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** Resolve the currency code to use when formatting a converted monetary field. */
export function resolveFiMetricDisplayCurrency(
  row: FiCompanyRow,
  field: FiMonetaryField,
  fallbackCode: string
): string {
  const fallback = fallbackCode.trim().toUpperCase() || "USD";

  const explicit = readRowString(row, `${field}_currency_code`);
  if (explicit) return explicit;

  const converted = readRowBoolean(row, `${field}_converted`);
  if (converted === true) return fallback;

  const nativeId = readRowNativeCurrencyId(row, `${field}_native_currency_id`);
  if (nativeId != null) {
    return platformCurrencyIdToCode(nativeId) ?? fallback;
  }

  return fallback;
}

export function resolveFiMetricKeyDisplayCurrency(
  row: FiCompanyRow,
  metricKey: FiMetricKey,
  fallbackCode: string
): string {
  const field = FI_METRIC_KEY_TO_MONETARY_FIELD[metricKey];
  if (!field) return fallbackCode.trim().toUpperCase() || "USD";
  return resolveFiMetricDisplayCurrency(row, field, fallbackCode);
}

export function buildFiFieldCurrencyCodes(
  row: FiCompanyRow,
  fallbackCode: string
): Partial<Record<string, string>> {
  const codes: Partial<Record<string, string>> = {};
  for (const [columnId, field] of Object.entries(FIN_ROW_COLUMN_TO_MONETARY_FIELD)) {
    if (!field) continue;
    codes[columnId] = resolveFiMetricDisplayCurrency(row, field, fallbackCode);
  }
  return codes;
}

export function readPreferredCurrencyCode(
  payload: Record<string, unknown>,
  fallbackCode: string
): string {
  const explicit = payload.preferred_currency_code;
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim().toUpperCase();
  }
  const id = payload.preferred_currency_id;
  if (id != null && id !== "") {
    const code = platformCurrencyIdToCode(Number(id));
    if (code) return code;
  }
  return fallbackCode.trim().toUpperCase() || "USD";
}
