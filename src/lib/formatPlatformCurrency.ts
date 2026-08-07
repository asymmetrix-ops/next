import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";
import type { Currency } from "@/lib/fxRates";
import { EMPTY_DISPLAY, isEmptyDisplayValue } from "@/lib/emptyDisplay";
import { DEFAULT_PLATFORM_CURRENCY } from "@/lib/platformCurrency";

function parseMetricNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";

export function formatPlatformMetricMillions(
  value: unknown,
  currencyCode: string = DEFAULT_PLATFORM_CURRENCY
): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (typeof value === "string" && isEmptyDisplayValue(value)) return EMPTY_DISPLAY;

  const formatted = formatMetricMillionsPlain(value);
  if (formatted === EMPTY_DISPLAY) return EMPTY_DISPLAY;

  return appendMetricCurrency(formatted, currencyCode);
}

export function formatPlatformDealMillions(
  value: unknown,
  currencyCode: Currency = DEFAULT_PLATFORM_CURRENCY
): string {
  if (value == null || value === "") return "Not available";

  const num = parseMetricNumber(value);
  if (num == null) return "Not available";

  return appendMetricCurrency(
    num.toLocaleString(undefined, { maximumFractionDigits: 3 }),
    currencyCode
  );
}
