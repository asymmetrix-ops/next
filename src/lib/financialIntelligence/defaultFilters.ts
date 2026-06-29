import type { FilterState } from "@/app/financials-tsx/types";
import type { FiCompanyRow } from "./types";

export interface FiIdOption {
  id: number;
  name: string;
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
 * Suggested peer-set filters derived from the target row (pure FE).
 * Kept intentionally loose — aim for ~10–30 comparable peers, not exact matches.
 */
export function buildSuggestedFilters(
  target: FiCompanyRow,
  regionOptions: FiIdOption[]
): FilterState[] {
  const filters: FilterState[] = [];

  const regionId = matchIdOptionByName(target.location_region, regionOptions);
  if (regionId != null) {
    filters.push({ id: "region", value: [regionId] });
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
