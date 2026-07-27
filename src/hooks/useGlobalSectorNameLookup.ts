"use client";

import { useEffect, useState } from "react";
import { normalizeSectorName } from "@/components/corporate-events/corporateEventsTableUtils";
import type { SectorNameLookup } from "@/lib/sectorLinks";
import { locationsService } from "@/lib/locationsService";

/** Primary + secondary sector catalog for name → id resolution (shared across profile tables). */
export function useGlobalSectorNameLookup(): SectorNameLookup {
  const [lookup, setLookup] = useState<SectorNameLookup>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next: SectorNameLookup = {};

        const primaries = await locationsService.getPrimarySectors();
        for (const primary of primaries) {
          const name = primary.sector_name?.trim();
          const id = primary.id;
          if (name && typeof id === "number" && id > 0) {
            next[normalizeSectorName(name)] = { id, importance: "Primary" };
          }
        }

        const secondaries =
          await locationsService.getAllSecondarySectorsWithPrimary();
        for (const secondary of secondaries) {
          const name = secondary.sector_name?.trim();
          const id = secondary.id;
          if (name && typeof id === "number" && id > 0) {
            next[normalizeSectorName(name)] = { id, importance: "Secondary" };
          }
        }

        if (!cancelled) setLookup(next);
      } catch (error) {
        console.warn("[useGlobalSectorNameLookup] Failed to load sector catalog", error);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return lookup;
}
