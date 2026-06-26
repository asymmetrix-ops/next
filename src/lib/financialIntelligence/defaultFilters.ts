import type { FilterState } from "@/app/financials-tsx/types";
import { parseSectorsId } from "./mappers";
import type { FiCompanyRow, FiSectorLookup } from "./types";

export interface FiIdOption {
  id: number;
  name: string;
}

/** Revenue preset buckets per product spec (USD millions). */
export const REVENUE_PRESET_BUCKETS: Array<{
  label: string;
  min: number;
  max: number;
}> = [
  { label: "<$10m", min: 0, max: 10 },
  { label: "$10–49m", min: 10, max: 49 },
  { label: "$50–99m", min: 50, max: 99 },
  { label: "$100–499m", min: 100, max: 499 },
  { label: "$500m+", min: 500, max: 5000 },
];

export function revenuePresetForValue(revenueUsdM: number | null | undefined): {
  min: number;
  max?: number;
} | null {
  if (revenueUsdM == null || !Number.isFinite(revenueUsdM) || revenueUsdM <= 0) {
    return null;
  }

  for (const bucket of REVENUE_PRESET_BUCKETS) {
    if (revenueUsdM >= bucket.min && revenueUsdM <= bucket.max) {
      return { min: bucket.min, max: bucket.max };
    }
  }

  const last = REVENUE_PRESET_BUCKETS[REVENUE_PRESET_BUCKETS.length - 1];
  if (revenueUsdM > last.max) {
    return { min: last.min, max: undefined };
  }

  return null;
}

function matchIdOptionByName(
  name: string | null | undefined,
  options: FiIdOption[]
): number | null {
  const needle = (name || "").trim().toLowerCase();
  if (!needle) return null;
  return options.find((o) => o.name.trim().toLowerCase() === needle)?.id ?? null;
}

function primaryAndSecondarySectorNames(
  target: FiCompanyRow,
  primarySectors: FiSectorLookup[],
  secondarySectors: FiSectorLookup[]
): { primary: string | null; secondary: string | null } {
  const ids = parseSectorsId(target.sectors_id);
  let primary: string | null = null;
  let secondary: string | null = null;

  for (const id of ids) {
    const match = primarySectors.find((s) => s.id === id);
    if (match) {
      primary = match.sector_name;
      break;
    }
  }
  for (const id of ids) {
    const match = secondarySectors.find((s) => s.id === id);
    if (match) {
      secondary = match.sector_name;
      break;
    }
  }

  return { primary, secondary };
}

/** Auto-derived peer-set filters from target company HQ / sector / revenue. */
export function buildDefaultFiltersFromTarget(
  target: FiCompanyRow,
  args: {
    regionOptions: FiIdOption[];
    countryOptions: FiIdOption[];
    primarySectors: FiSectorLookup[];
    secondarySectors: FiSectorLookup[];
  }
): FilterState[] {
  const filters: FilterState[] = [];

  const regionId = matchIdOptionByName(target.location_region, args.regionOptions);
  if (regionId != null) {
    filters.push({ id: "region", value: [regionId] });
  }

  const countryId = matchIdOptionByName(target.location_country, args.countryOptions);
  if (countryId != null) {
    filters.push({ id: "country", value: [countryId] });
  }

  const { primary, secondary } = primaryAndSecondarySectorNames(
    target,
    args.primarySectors,
    args.secondarySectors
  );
  if (primary) {
    filters.push({ id: "primary_sector", value: [primary] });
  } else if (secondary) {
    filters.push({ id: "secondary_sector", value: [secondary] });
  }

  const revenueBucket = revenuePresetForValue(target.revenue_m_usd);
  if (revenueBucket) {
    filters.push({ id: "revenue", value: revenueBucket });
  }

  return filters;
}
