"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Currency } from "@/lib/fxRates";
import {
  DEFAULT_PLATFORM_CURRENCY,
  DEFAULT_PLATFORM_CURRENCY_ID,
  platformCurrencyCodeToId,
  readPlatformCurrencyClient,
  readPlatformCurrencyIdClient,
  writePlatformCurrencyClient,
} from "@/lib/platformCurrency";

type PlatformCurrencyContextType = {
  currency: Currency;
  currencyId: number;
  setCurrency: (currency: Currency) => void;
};

const PlatformCurrencyContext = createContext<
  PlatformCurrencyContextType | undefined
>(undefined);

export function PlatformCurrencyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>(
    DEFAULT_PLATFORM_CURRENCY
  );
  const [currencyId, setCurrencyIdState] = useState<number>(
    DEFAULT_PLATFORM_CURRENCY_ID
  );

  useEffect(() => {
    const nextCurrencyId = readPlatformCurrencyIdClient();
    setCurrencyIdState(nextCurrencyId);
    setCurrencyState(readPlatformCurrencyClient());
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    const nextCurrencyId = platformCurrencyCodeToId(next);
    setCurrencyState(next);
    setCurrencyIdState(nextCurrencyId);
    writePlatformCurrencyClient(next);
  }, []);

  return (
    <PlatformCurrencyContext.Provider
      value={{ currency, currencyId, setCurrency }}
    >
      {children}
    </PlatformCurrencyContext.Provider>
  );
}

export function usePlatformCurrency(): PlatformCurrencyContextType {
  const context = useContext(PlatformCurrencyContext);
  if (!context) {
    throw new Error(
      "usePlatformCurrency must be used within PlatformCurrencyProvider"
    );
  }
  return context;
}

/**
 * Shows everything below in a fixed currency without touching the visitor's saved
 * platform preference (e.g. the contributor benchmark, which follows the company's own currency).
 */
export function PlatformCurrencyOverride({
  currency,
  children,
}: {
  currency: Currency;
  children: React.ReactNode;
}) {
  return (
    <PlatformCurrencyContext.Provider
      value={{
        currency,
        currencyId: platformCurrencyCodeToId(currency),
        setCurrency: () => {},
      }}
    >
      {children}
    </PlatformCurrencyContext.Provider>
  );
}
