"use client";

import { useEffect, useState } from "react";
import { fetchCompanyCapitalRadar } from "@/lib/capitalRadar";
import type { CapitalRadarResponse } from "@/types/capital-radar";

export function useCapitalRadar(companyId: number | string | null | undefined) {
  const [data, setData] = useState<CapitalRadarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!companyId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchCompanyCapitalRadar(companyId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { data, isLoading, error };
}
