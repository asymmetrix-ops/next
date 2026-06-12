import { useCallback, useEffect, useState } from "react";
import {
  TIME_SINCE_LAST_INVESTMENT_EMPTY,
  fetchTimeSinceLastInvestment,
  formatTimeSinceLastInvestmentDisplay,
} from "@/lib/timeSinceLastInvestment";

export function useTimeSinceLastInvestment(newCompanyId: string | undefined) {
  const [display, setDisplay] = useState(TIME_SINCE_LAST_INVESTMENT_EMPTY);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!newCompanyId) {
      setDisplay(TIME_SINCE_LAST_INVESTMENT_EMPTY);
      return;
    }

    setLoading(true);
    try {
      const value = await fetchTimeSinceLastInvestment(newCompanyId);
      setDisplay(
        value
          ? formatTimeSinceLastInvestmentDisplay(value)
          : TIME_SINCE_LAST_INVESTMENT_EMPTY
      );
    } catch {
      setDisplay(TIME_SINCE_LAST_INVESTMENT_EMPTY);
    } finally {
      setLoading(false);
    }
  }, [newCompanyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { display, loading, refetch };
}
