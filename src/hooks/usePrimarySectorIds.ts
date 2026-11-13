"use client";

import { useEffect, useState } from "react";
import { locationsService } from "@/lib/locationsService";

let primaryIdsRequest: Promise<Set<number> | null> | null = null;

// One request per page load, shared by every caller
function loadPrimarySectorIds(): Promise<Set<number> | null> {
  if (!primaryIdsRequest) {
    primaryIdsRequest = locationsService
      .getPrimarySectors()
      .then((sectors) => {
        const ids = (Array.isArray(sectors) ? sectors : [])
          .map((sector) => sector?.id)
          .filter((id): id is number => typeof id === "number");
        return ids.length > 0 ? new Set(ids) : null;
      })
      .catch(() => null)
      .then((ids) => {
        if (!ids) primaryIdsRequest = null;
        return ids;
      });
  }
  return primaryIdsRequest;
}

// IDs of every primary sector, null until loaded or if loading fails
export function usePrimarySectorIds(enabled = true): Set<number> | null {
  const [ids, setIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void loadPrimarySectorIds().then((loaded) => {
      if (!cancelled) setIds(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return ids;
}
