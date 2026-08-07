import type { Currency } from "@/lib/fxRates";

export const DEFAULT_PLATFORM_CURRENCY: Currency = "USD";
export const DEFAULT_PLATFORM_CURRENCY_ID = 15;

export const PLATFORM_CURRENCY_COOKIE_KEY = "asymmetrix_platform_currency_id";

export const PLATFORM_CURRENCY_OPTIONS: Currency[] = ["USD", "EUR", "GBP"];

export const PLATFORM_CURRENCY_BY_CODE: Record<Currency, number> = {
  USD: 15,
  EUR: 6,
  GBP: 7,
};

export const PLATFORM_CURRENCY_BY_ID: Record<number, Currency> = {
  15: "USD",
  6: "EUR",
  7: "GBP",
};

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function isPlatformCurrency(value: string | null): value is Currency {
  return value === "USD" || value === "EUR" || value === "GBP";
}

export function isPlatformCurrencyId(value: number): boolean {
  return value in PLATFORM_CURRENCY_BY_ID;
}

export function platformCurrencyIdToCode(
  currencyId: number
): Currency | null {
  return PLATFORM_CURRENCY_BY_ID[currencyId] ?? null;
}

export function platformCurrencyCodeToId(currency: Currency): number {
  return PLATFORM_CURRENCY_BY_CODE[currency];
}

export function parsePlatformCurrencyId(
  value: string | null | undefined
): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || !isPlatformCurrencyId(parsed)) {
    return null;
  }
  return parsed;
}

function readPlatformCurrencyIdFromCookieString(
  cookieHeader: string | null | undefined
): number {
  if (!cookieHeader) return DEFAULT_PLATFORM_CURRENCY_ID;

  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${PLATFORM_CURRENCY_COOKIE_KEY}=([^;]+)`)
  );
  return (
    parsePlatformCurrencyId(match?.[1] ? decodeURIComponent(match[1]) : null) ??
    DEFAULT_PLATFORM_CURRENCY_ID
  );
}

export function readPlatformCurrencyIdClient(): number {
  if (typeof document === "undefined") return DEFAULT_PLATFORM_CURRENCY_ID;
  return readPlatformCurrencyIdFromCookieString(document.cookie);
}

export function readPlatformCurrencyClient(): Currency {
  return (
    platformCurrencyIdToCode(readPlatformCurrencyIdClient()) ??
    DEFAULT_PLATFORM_CURRENCY
  );
}

export function writePlatformCurrencyIdClient(currencyId: number): void {
  if (typeof document === "undefined") return;
  if (!isPlatformCurrencyId(currencyId)) return;

  document.cookie = `${PLATFORM_CURRENCY_COOKIE_KEY}=${currencyId}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function writePlatformCurrencyClient(currency: Currency): void {
  writePlatformCurrencyIdClient(platformCurrencyCodeToId(currency));
}
