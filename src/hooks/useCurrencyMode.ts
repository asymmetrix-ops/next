import { useCallback, useState } from "react";
import type { CurrencyMode } from "@/types/financials";

export function useCurrencyMode(initial: CurrencyMode = "preferred") {
  const [mode, setMode] = useState<CurrencyMode>(initial);
  const toggle = useCallback(
    () => setMode((current) => (current === "preferred" ? "reported" : "preferred")),
    []
  );
  return { mode, setMode, toggle };
}
