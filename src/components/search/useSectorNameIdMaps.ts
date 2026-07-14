"use client";

import { useEffect, useState } from "react";
import { normalizeSectorName } from "@/components/corporate-events/corporateEventsTableUtils";
import { locationsService } from "@/lib/locationsService";

export type SectorNameIdMaps = {
  primaryNameToId: Record<string, number>;
  secondaryNameToId: Record<string, number>;
  loaded: boolean;
};

const EMPTY_MAPS: SectorNameIdMaps = {
  primaryNameToId: {},
  secondaryNameToId: {},
  loaded: false,
};

export function useSectorNameIdMaps(): SectorNameIdMaps {
  const [maps, setMaps] = useState<SectorNameIdMaps>(EMPTY_MAPS);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const primaryNameToId: Record<string, number> = {};
        const secondaryNameToId: Record<string, number> = {};

        const allSecondary =
          await locationsService.getAllSecondarySectorsWithPrimary();
        if (Array.isArray(allSecondary)) {
          for (const sector of allSecondary) {
            const secName = (sector as { sector_name?: string }).sector_name;
            const secId = (sector as { id?: number }).id;
            const primary = (
              sector as { related_primary_sector?: { sector_name?: string; id?: number } }
            ).related_primary_sector;
            const primaryName = primary?.sector_name;
            const primaryId = primary?.id;

            if (secName && typeof secId === "number") {
              secondaryNameToId[normalizeSectorName(secName)] = secId;
            }
            if (primaryName && typeof primaryId === "number") {
              primaryNameToId[normalizeSectorName(primaryName)] = primaryId;
            }
          }
        }

        const primaries = await locationsService.getPrimarySectors();
        if (Array.isArray(primaries)) {
          for (const primary of primaries) {
            const name = (primary as { sector_name?: string }).sector_name;
            const id = (primary as { id?: number }).id;
            if (name && typeof id === "number") {
              primaryNameToId[normalizeSectorName(name)] = id;
            }
          }
        }

        if (!cancelled) {
          setMaps({
            primaryNameToId,
            secondaryNameToId,
            loaded: true,
          });
        }
      } catch (error) {
        console.warn("[Sector maps] Failed to load sector name lookup", error);
        if (!cancelled) {
          setMaps({ primaryNameToId: {}, secondaryNameToId: {}, loaded: true });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return maps;
}
