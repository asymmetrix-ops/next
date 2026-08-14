"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { FXRates } from "@/lib/fxRates";
import { getFXRates } from "@/lib/fxRates";

const FiFxContext = createContext<FXRates | null>(null);

export function FiFxProvider({ children }: { children: React.ReactNode }) {
  const [fxRates, setFxRates] = useState<FXRates | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getFXRates().then((rates) => {
      if (!cancelled) setFxRates(rates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <FiFxContext.Provider value={fxRates}>{children}</FiFxContext.Provider>;
}

export function useFiFxRates(): FXRates | null {
  return useContext(FiFxContext);
}
