import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";
import type { Currency } from "@/lib/fxRates";
import { EMPTY_DISPLAY, isEmptyDisplayValue } from "@/lib/emptyDisplay";
import { DEFAULT_PLATFORM_CURRENCY } from "@/lib/platformCurrency";

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

  const formatted = formatMetricMillionsPlain(value);
  if (formatted === EMPTY_DISPLAY) return "Not available";

  return appendMetricCurrency(formatted, currencyCode);
}
