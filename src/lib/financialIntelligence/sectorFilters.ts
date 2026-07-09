import type { FilterState } from "@/app/financials-tsx/types";
import { parseSectorsId } from "./mappers";
import type {
  FiSecondarySectorLookup,
  FiSectorLookup,
} from "./types";

export interface FiSectorFilterLookups {
  primarySectors: FiSectorLookup[];
  secondarySectors: FiSecondarySectorLookup[];
}

function sectorNameValues(filter: FilterState | undefined): string[] {
  if (!filter || !Array.isArray(filter.value)) return [];
  return filter.value.map(String).filter((name) => name.trim().length > 0);
}

function findPrimaryByName(
  name: string,
  primarySectors: FiSectorLookup[]
): FiSectorLookup | undefined {
  const needle = name.trim().toLowerCase();
  return primarySectors.find((s) => s.sector_name.trim().toLowerCase() === needle);
}

function findSecondaryByName(
  name: string,
  secondarySectors: FiSecondarySectorLookup[]
): FiSecondarySectorLookup | undefined {
  const needle = name.trim().toLowerCase();
  return secondarySectors.find((s) => s.sector_name.trim().toLowerCase() === needle);
}

/** Resolve chip label from the selected sector's true importance (Primary vs Secondary). */
export function resolveSectorFilterChipLabel(
  filter: Pick<FilterState, "id" | "value">,
  lookups: FiSectorFilterLookups
): string {
  const name = sectorNameValues(filter as FilterState)[0];
  if (!name) {
    return filter.id === "secondary_sector" ? "Secondary sector" : "Primary sector";
  }

  const inPrimary = Boolean(findPrimaryByName(name, lookups.primarySectors));
  const inSecondary = Boolean(findSecondaryByName(name, lookups.secondarySectors));

  if (inPrimary && !inSecondary) return "Primary sector";
  if (inSecondary && !inPrimary) return "Secondary sector";
  if (inPrimary) return "Primary sector";
  if (inSecondary) return "Secondary sector";

  return filter.id === "secondary_sector" ? "Secondary sector" : "Primary sector";
}

function resolveDerivedPrimary(
  secondary: FiSecondarySectorLookup,
  primarySectors: FiSectorLookup[]
): FiSectorLookup | null {
  if (secondary.related_primary_id) {
    const byId = primarySectors.find((s) => s.id === secondary.related_primary_id);
    if (byId) return byId;
  }

  if (secondary.related_primary_name) {
    const byName = findPrimaryByName(secondary.related_primary_name, primarySectors);
    if (byName) return byName;
    return {
      id: secondary.related_primary_id ?? 0,
      sector_name: secondary.related_primary_name,
    };
  }

  return null;
}

/**
 * Default sector filter: prefer direct Primary on the target, then Primary derived
 * from a Secondary, then Secondary as last resort.
 */
export function pickDefaultSectorFilter(
  sectorsId: string | null | undefined,
  lookups: FiSectorFilterLookups
): FilterState | null {
  const sectorIds = parseSectorsId(sectorsId);
  if (sectorIds.length === 0) return null;

  const directPrimaries: FiSectorLookup[] = [];
  const secondaries: FiSecondarySectorLookup[] = [];

  for (const id of sectorIds) {
    const primary = lookups.primarySectors.find((s) => s.id === id);
    if (primary) {
      directPrimaries.push(primary);
      continue;
    }
    const secondary = lookups.secondarySectors.find((s) => s.id === id);
    if (secondary) secondaries.push(secondary);
  }

  if (directPrimaries.length > 0) {
    return { id: "primary_sector", value: [directPrimaries[0].sector_name] };
  }

  for (const secondary of secondaries) {
    const derivedPrimary = resolveDerivedPrimary(secondary, lookups.primarySectors);
    if (derivedPrimary?.sector_name) {
      return { id: "primary_sector", value: [derivedPrimary.sector_name] };
    }
  }

  if (secondaries.length > 0) {
    return { id: "secondary_sector", value: [secondaries[0].sector_name] };
  }

  return null;
}
