import type { CurrencyMode, CurrencyToggleField } from "@/types/financials";

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function readCurrencyDisplay(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  return String(value);
}

export function extractCurrencyField(
  row: Record<string, unknown>,
  field: string,
  displayField: string
): CurrencyToggleField {
  return {
    preferredValue: toNumber(row[field]),
    preferredCurrency: readCurrencyDisplay(row[displayField]),
    reportedValue: toNumber(row[`${field}_reported_value`]),
    reportedCurrency: readCurrencyDisplay(row[`${field}_reported_currency_display`]),
    converted: !!row[`${field}_converted`],
    isApproximate: !!row[`${field}_is_approximate`],
  };
}

export function resolveDisplay(
  field: CurrencyToggleField,
  mode: CurrencyMode
): { value: number | null; currency: string | null } {
  if (mode === "reported") {
    return {
      value: field.reportedValue,
      currency: field.reportedCurrency ?? field.preferredCurrency,
    };
  }
  return {
    value: field.preferredValue,
    currency: field.preferredCurrency,
  };
}

export function hasReportedCurrencyToggle(
  row: Record<string, unknown> | null | undefined,
  fieldMap: Record<string, string>
): boolean {
  if (!row) return false;

  for (const [field, displayField] of Object.entries(fieldMap)) {
    const extracted = extractCurrencyField(row, field, displayField);
    if (!extracted.converted) continue;

    const reportedCurrency =
      extracted.reportedCurrency ?? extracted.preferredCurrency;
    const preferredCurrency = extracted.preferredCurrency;
    if (
      reportedCurrency &&
      preferredCurrency &&
      reportedCurrency.trim().toUpperCase() !==
        preferredCurrency.trim().toUpperCase()
    ) {
      return true;
    }
    if (extracted.reportedValue != null && extracted.preferredValue != null) {
      return true;
    }
  }

  return false;
}
