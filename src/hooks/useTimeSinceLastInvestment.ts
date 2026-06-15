"use client";

import { useEffect, useState } from "react";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import {
  fetchTimeSinceLastInvestment,
  readTimeSinceLastInvestmentDisplay,
} from "@/lib/timeSinceLastInvestment";

export function useTimeSinceLastInvestment(
  newCompanyId: string | number | null | undefined
) {
  const [display, setDisplay] = useState(EMPTY_DISPLAY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (newCompanyId == null || newCompanyId === "") {
      setDisplay(EMPTY_DISPLAY);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;

    void fetchTimeSinceLastInvestment(newCompanyId, token)
      .then((value) => {
        if (cancelled) return;
        setDisplay(readTimeSinceLastInvestmentDisplay(value));
      })
      .catch(() => {
        if (!cancelled) setDisplay(EMPTY_DISPLAY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [newCompanyId]);

  return { display, loading };
}
