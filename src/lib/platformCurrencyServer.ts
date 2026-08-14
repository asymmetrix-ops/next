import { cookies } from "next/headers";
import type { Currency } from "@/lib/fxRates";
import {
  DEFAULT_PLATFORM_CURRENCY,
  DEFAULT_PLATFORM_CURRENCY_ID,
  parsePlatformCurrencyId,
  platformCurrencyIdToCode,
  PLATFORM_CURRENCY_COOKIE_KEY,
} from "@/lib/platformCurrency";

export async function readPlatformCurrencyIdServer(): Promise<number> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PLATFORM_CURRENCY_COOKIE_KEY)?.value;
  return parsePlatformCurrencyId(raw) ?? DEFAULT_PLATFORM_CURRENCY_ID;
}

export async function readPlatformCurrencyServer(): Promise<Currency> {
  const currencyId = await readPlatformCurrencyIdServer();
  return platformCurrencyIdToCode(currencyId) ?? DEFAULT_PLATFORM_CURRENCY;
}
