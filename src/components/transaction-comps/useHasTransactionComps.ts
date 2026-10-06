"use client";

import { useEffect, useState } from "react";
import { fetchTransactionCompsServer } from "@/app/transaction-comps/actions";
import { DEFAULT_TRANSACTION_COMPS_QUERY } from "./transactionCompsTypes";

/**
 * Whether any transaction comps are tagged to the given sector / sub-sector.
 * `null` while loading, so callers can keep the comps UI hidden until it is known.
 */
export function useHasTransactionComps(scope: {
  primarySectorId?: number;
  secondarySectorId?: number;
}): boolean | null {
  const { primarySectorId, secondarySectorId } = scope;
  const [has, setHas] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const valid = (id?: number) => id != null && Number.isFinite(id) && id > 0;
    if (!valid(primarySectorId) && !valid(secondarySectorId)) {
      setHas(false);
      return;
    }
    setHas(null);
    fetchTransactionCompsServer({
      ...DEFAULT_TRANSACTION_COMPS_QUERY,
      perPage: 1,
      sectorIds: valid(primarySectorId) ? [primarySectorId as number] : [],
      secondarySectorIds: valid(secondarySectorId) ? [secondarySectorId as number] : [],
    })
      .then((res) => {
        if (!cancelled) setHas((res?.total ?? 0) > 0);
      })
      .catch(() => {
        if (!cancelled) setHas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [primarySectorId, secondarySectorId]);

  return has;
}
