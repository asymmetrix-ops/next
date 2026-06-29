import type { FilterState } from "@/app/financials-tsx/types";
import { parseSectorsId } from "./mappers";
import type { FiCompanyRow, FiSectorLookup } from "./types";

export interface FiIdOption {
  id: number;
  name: string;
}

export interface FiDefaultFilterLookups {
  regionOptions: FiIdOption[];
  primarySectors: FiSectorLookup[];
  secondarySectors: FiSectorLookup[];
}

function matchIdOptionByName(
  name: string | null | undefined,
  options: FiIdOption[]
): number | null {
  const needle = (name || "").trim().toLowerCase();
  if (!needle) return null;
  return options.find((o) => o.name.trim().toLowerCase() === needle)?.id ?? null;
}

/** Logarithmic revenue bracket — looser bands for larger companies. */
export function revenueBracket(rev: number): { min: number; max: number } {
  if (rev < 10) return { min: 0, max: 25 };
  if (rev < 50) return { min: 10, max: 100 };
  if (rev < 200) return { min: 50, max: 500 };
  if (rev < 1000) return { min: 200, max: 2000 };
  if (rev < 5000) return { min: 500, max: 10000 };
  return { min: 1000, max: 999999 };
}

/**
 * Default peer-set filters: Region, Primary sector, Revenue bucket.
 * Derived from the target row (pure FE).
 */
export function buildDefaultFilters(
  target: FiCompanyRow,
  args: FiDefaultFilterLookups
): FilterState[] {
  const filters: FilterState[] = [];

  const regionId = matchIdOptionByName(target.location_region, args.regionOptions);
  if (regionId != null) {
    filters.push({ id: "region", value: [regionId] });
  }

  const sectorIds = parseSectorsId(target.sectors_id);
  if (sectorIds.length > 0) {
    const primaryNames: string[] = [];
    for (const id of sectorIds) {
      const primary = args.primarySectors.find((s) => s.id === id);
      if (primary) primaryNames.push(primary.sector_name);
    }
    if (primaryNames.length > 0) {
      filters.push({ id: "primary_sector", value: [primaryNames[0]] });
    } else {
      const secondaryNames: string[] = [];
      for (const id of sectorIds) {
        const secondary = args.secondarySectors.find((s) => s.id === id);
        if (secondary) secondaryNames.push(secondary.sector_name);
      }
      if (secondaryNames.length > 0) {
        filters.push({ id: "secondary_sector", value: [secondaryNames[0]] });
      }
    }
  }

  const rev = target.revenue_m_usd;
  if (rev != null && Number.isFinite(rev) && rev > 0) {
    const bracket = revenueBracket(rev);
    filters.push({
      id: "revenue",
      value: {
        min: bracket.min,
        max: bracket.max,
      },
    });
  }

  return filters;
}

/** @deprecated Use buildDefaultFilters */
export const buildSuggestedFilters = buildDefaultFilters;
