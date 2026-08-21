"use client";

import {
  createContext,
  useCallback,
  useContext,
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
  const [currency, setCurrencyState] = useState<Currency>(() =>
    typeof window === "undefined"
      ? DEFAULT_PLATFORM_CURRENCY
      : readPlatformCurrencyClient()
  );
  const [currencyId, setCurrencyIdState] = useState<number>(() =>
    typeof window === "undefined"
      ? DEFAULT_PLATFORM_CURRENCY_ID
      : readPlatformCurrencyIdClient()
  );

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
