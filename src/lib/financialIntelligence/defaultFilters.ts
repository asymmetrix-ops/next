import type { FilterState } from "@/app/financials-tsx/types";
import { pickDefaultSectorFilter } from "./sectorFilters";
import type { FiCompanyRow, FiSecondarySectorLookup, FiSectorLookup } from "./types";

export interface FiDefaultFilterLookups {
  primarySectors: FiSectorLookup[];
  secondarySectors: FiSecondarySectorLookup[];
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
 * Default peer-set filters: Region, Primary sector (preferred), Revenue bucket.
 * Derived from the target row (pure FE).
 */
export function buildDefaultFilters(
  target: FiCompanyRow,
  args: FiDefaultFilterLookups
): FilterState[] {
  const filters: FilterState[] = [];

  const region = (target.location_region || "").trim();
  if (region) {
    filters.push({ id: "region", value: [region] });
  }

  const sectorFilter = pickDefaultSectorFilter(target.sectors_id, args);
  if (sectorFilter) {
    filters.push(sectorFilter);
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
