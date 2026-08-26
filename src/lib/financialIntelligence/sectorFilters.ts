import type { FilterState } from "@/app/financials-tsx/types";
import { parseSectorsId } from "./mappers";
import type {
  FiCompanyRow,
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
function pickDefaultSectorFilterFromIds(
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
    return {
      id: "primary_sector",
      value: directPrimaries.map((sector) => sector.sector_name),
    };
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

/** Fallback when sector ids are unavailable but sector objects include names. */
export function pickDefaultSectorFilterFromEntries(
  entries: unknown,
  lookups: FiSectorFilterLookups
): FilterState | null {
  if (!Array.isArray(entries)) return null;

  const primaryNames: string[] = [];
  const secondaryNames: string[] = [];

  for (const item of entries) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const name = String(obj.sector_name ?? obj.name ?? "").trim();
    if (!name) continue;
    const importance = String(obj.Sector_importance ?? obj.sector_importance ?? "Primary").trim();
    if (importance === "Primary") primaryNames.push(name);
    else secondaryNames.push(name);
  }

  if (primaryNames.length > 0) {
    return { id: "primary_sector", value: primaryNames };
  }

  for (const name of secondaryNames) {
    const secondary = findSecondaryByName(name, lookups.secondarySectors);
    if (secondary) {
      const derivedPrimary = resolveDerivedPrimary(secondary, lookups.primarySectors);
      if (derivedPrimary?.sector_name) {
        return { id: "primary_sector", value: [derivedPrimary.sector_name] };
      }
    }
    return { id: "secondary_sector", value: [name] };
  }

  return null;
}

export function pickDefaultSectorFilter(
  sectorsId: string | null | undefined,
  lookups: FiSectorFilterLookups,
  sectorEntries?: unknown
): FilterState | null {
  const fromIds = pickDefaultSectorFilterFromIds(sectorsId, lookups);
  if (fromIds) return fromIds;
  if (sectorEntries != null) {
    return pickDefaultSectorFilterFromEntries(sectorEntries, lookups);
  }
  return null;
}

/** All primary sector IDs for the target — sent to the peers API as sectors_id[]. */
export function resolveTargetPrimarySectorIds(
  target: Pick<FiCompanyRow, "sectors_id" | "primary_sector_ids" | "primary_sector_names">,
  primarySectors: FiSectorLookup[],
  secondarySectors: FiSecondarySectorLookup[]
): number[] {
  if (target.primary_sector_ids?.length) {
    return Array.from(new Set(target.primary_sector_ids.filter((id) => id > 0)));
  }

  const ids = new Set<number>();
  for (const id of parseSectorsId(target.sectors_id)) {
    if (primarySectors.some((sector) => sector.id === id)) {
      ids.add(id);
    }
  }
  if (ids.size > 0) return Array.from(ids);

  const names = (target.primary_sector_names ?? []).filter((name) => name.trim());
  for (const name of names) {
    const match = findPrimaryByName(name, primarySectors);
    if (match) ids.add(match.id);
  }
  if (ids.size > 0) return Array.from(ids);

  for (const id of parseSectorsId(target.sectors_id)) {
    const secondary = secondarySectors.find((sector) => sector.id === id);
    if (secondary?.related_primary_id && secondary.related_primary_id > 0) {
      ids.add(secondary.related_primary_id);
    }
  }

  return Array.from(ids);
}
