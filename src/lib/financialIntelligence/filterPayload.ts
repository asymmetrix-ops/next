import type { FilterState } from "@/app/financials-tsx/types";
import type { FiPeersRequest, FiSecondarySectorLookup, FiSectorLookup, SavedBenchmark } from "./types";

export interface FiFilterLookups {
  regionOptions: Array<{ id: number; name: string }>;
  countryOptions: Array<{ id: number; name: string }>;
  primarySectors: FiSectorLookup[];
  secondarySectors: FiSecondarySectorLookup[];
}

function rangeValue(filter: FilterState | undefined): { min?: number; max?: number } {
  if (!filter) return {};
  if (typeof filter.value === "object" && !Array.isArray(filter.value)) {
    return filter.value;
  }
  return {};
}

function enumValues(filter: FilterState | undefined): string[] {
  if (!filter) return [];
  if (Array.isArray(filter.value)) return filter.value.map(String);
  if (typeof filter.value === "string" && filter.value) return [filter.value];
  return [];
}

function numericEnumValues(filter: FilterState | undefined): number[] {
  if (!filter || !Array.isArray(filter.value)) return [];
  return filter.value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function toSentinel(value: number | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "0";
  return String(value);
}

export function resolveSectorIds(
  filters: FilterState[],
  primarySectors: FiSectorLookup[],
  secondarySectors: FiSectorLookup[]
): number[] {
  const ids = new Set<number>();

  for (const filterId of ["primary_sector", "secondary_sector"] as const) {
    const values = enumValues(filters.find((f) => f.id === filterId));
    const lookup = filterId === "primary_sector" ? primarySectors : secondarySectors;
    for (const name of values) {
      const match = lookup.find(
        (sector) => sector.sector_name.toLowerCase() === name.toLowerCase()
      );
      if (match) ids.add(match.id);
    }
  }

  return Array.from(ids);
}

export function resolveLocationIds(filters: FilterState[]): number[] {
  const ids = new Set<number>();

  for (const id of numericEnumValues(filters.find((f) => f.id === "country"))) {
    ids.add(id);
  }

  return Array.from(ids);
}

export function resolveRegions(
  filters: FilterState[],
  regionOptions: Array<{ id: number; name: string }> = []
): string[] {
  const filter = filters.find((f) => f.id === "region");
  if (!filter || !Array.isArray(filter.value)) return [];

  const names = new Set<string>();
  for (const item of filter.value) {
    if (typeof item === "string" && item.trim()) {
      names.add(item.trim());
      continue;
    }
    const id = typeof item === "number" ? item : Number(item);
    if (Number.isFinite(id) && id > 0) {
      const match = regionOptions.find((r) => r.id === id);
      if (match?.name) names.add(match.name);
    }
  }

  return Array.from(names);
}

export function hasActiveApiFilters(request: FiPeersRequest): boolean {
  if (request.sectors_id.length > 0) return true;
  if (request.regions.length > 0) return true;
  if (request.location_ids.length > 0) return true;
  if (Number(request.revenue_min_usd_m) > 0) return true;
  if (Number(request.revenue_max_usd_m) > 0) return true;
  if (Number(request.ebitda_margin_min) > 0) return true;
  if (Number(request.ebitda_margin_max) > 0) return true;
  if (Number(request.ev_min_usd_m) > 0) return true;
  if (Number(request.ev_max_usd_m) > 0) return true;
  return false;
}

export function buildPeersRequest(args: {
  targetCompanyId: number;
  filters: FilterState[];
  companyIdsInclude: number[];
  companyIdsExclude: number[];
  primarySectors: FiSectorLookup[];
  secondarySectors: FiSecondarySectorLookup[];
  regionOptions?: Array<{ id: number; name: string }>;
}): FiPeersRequest {
  const revenue = rangeValue(args.filters.find((f) => f.id === "revenue"));
  const ev = rangeValue(args.filters.find((f) => f.id === "ev"));
  const ebitdaMargin = rangeValue(args.filters.find((f) => f.id === "ebitda_margin"));

  return {
    target_company_id: args.targetCompanyId,
    sectors_id: resolveSectorIds(args.filters, args.primarySectors, args.secondarySectors),
    regions: resolveRegions(args.filters, args.regionOptions ?? []),
    location_ids: resolveLocationIds(args.filters),
    revenue_min_usd_m: toSentinel(revenue.min),
    revenue_max_usd_m: toSentinel(revenue.max),
    ebitda_margin_min: toSentinel(ebitdaMargin.min),
    ebitda_margin_max: toSentinel(ebitdaMargin.max),
    ev_min_usd_m: toSentinel(ev.min),
    ev_max_usd_m: toSentinel(ev.max),
    company_ids_include: [...args.companyIdsInclude],
    company_ids_exclude: [...args.companyIdsExclude],
  };
}

export function savedBenchmarkToFilters(
  saved: SavedBenchmark,
  lookups?: FiFilterLookups
): FilterState[] {
  const filters: FilterState[] = [];

  if (lookups) {
    if (saved.regions?.length > 0) {
      filters.push({ id: "region", value: [...saved.regions] });
    } else if (saved.location_ids.length > 0) {
      const regionIds = saved.location_ids.filter((id) =>
        lookups.regionOptions.some((r) => r.id === id)
      );
      if (regionIds.length > 0) {
        const regionNames = regionIds
          .map((id) => lookups.regionOptions.find((r) => r.id === id)?.name)
          .filter(Boolean) as string[];
        if (regionNames.length > 0) {
          filters.push({ id: "region", value: regionNames });
        }
      }
    }

    const countryIds = saved.location_ids.filter((id) =>
      lookups.countryOptions.some((c) => c.id === id)
    );
    if (countryIds.length > 0) {
      filters.push({ id: "country", value: countryIds });
    }
  }

  if (lookups && saved.sectors_id.length > 0) {
    const primaryNames: string[] = [];
    const secondaryNames: string[] = [];
    for (const id of saved.sectors_id) {
      const primary = lookups.primarySectors.find((s) => s.id === id);
      if (primary) {
        primaryNames.push(primary.sector_name);
        continue;
      }
      const secondary = lookups.secondarySectors.find((s) => s.id === id);
      if (secondary) secondaryNames.push(secondary.sector_name);
    }
    if (primaryNames.length > 0) {
      filters.push({ id: "primary_sector", value: primaryNames });
    }
    if (secondaryNames.length > 0) {
      filters.push({ id: "secondary_sector", value: secondaryNames });
    }
  }

  if (saved.revenue_min_usd_m != null || saved.revenue_max_usd_m != null) {
    filters.push({
      id: "revenue",
      value: {
        min: saved.revenue_min_usd_m ?? undefined,
        max: saved.revenue_max_usd_m ?? undefined,
      },
    });
  }

  if (saved.ev_min_usd_m != null || saved.ev_max_usd_m != null) {
    filters.push({
      id: "ev",
      value: {
        min: saved.ev_min_usd_m ?? undefined,
        max: saved.ev_max_usd_m ?? undefined,
      },
    });
  }

  if (saved.ebitda_margin_min != null || saved.ebitda_margin_max != null) {
    filters.push({
      id: "ebitda_margin",
      value: {
        min: saved.ebitda_margin_min ?? undefined,
        max: saved.ebitda_margin_max ?? undefined,
      },
    });
  }

  return filters;
}

export function peersRequestToSavedBenchmark(
  request: FiPeersRequest,
  label?: string
): SavedBenchmark {
  const parseNullable = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  return {
    target_company_id: request.target_company_id,
    sectors_id: request.sectors_id,
    regions: request.regions,
    location_ids: request.location_ids,
    revenue_min_usd_m: parseNullable(request.revenue_min_usd_m),
    revenue_max_usd_m: parseNullable(request.revenue_max_usd_m),
    ebitda_margin_min: parseNullable(request.ebitda_margin_min),
    ebitda_margin_max: parseNullable(request.ebitda_margin_max),
    ev_min_usd_m: parseNullable(request.ev_min_usd_m),
    ev_max_usd_m: parseNullable(request.ev_max_usd_m),
    company_ids_include: request.company_ids_include,
    company_ids_exclude: request.company_ids_exclude,
    saved_at: new Date().toISOString(),
    label,
  };
}

export function createDefaultPeersRequest(targetCompanyId: number): FiPeersRequest {
  return {
    target_company_id: targetCompanyId,
    sectors_id: [],
    regions: [],
    location_ids: [],
    revenue_min_usd_m: "0",
    revenue_max_usd_m: "0",
    ebitda_margin_min: "0",
    ebitda_margin_max: "0",
    ev_min_usd_m: "0",
    ev_max_usd_m: "0",
    company_ids_include: [],
    company_ids_exclude: [],
  };
}

export function peersRequestToSearchParams(request: FiPeersRequest): URLSearchParams {
  const params = new URLSearchParams();
  params.set("target_company_id", String(request.target_company_id));
  params.set("revenue_min_usd_m", request.revenue_min_usd_m);
  params.set("revenue_max_usd_m", request.revenue_max_usd_m);
  params.set("ebitda_margin_min", request.ebitda_margin_min);
  params.set("ebitda_margin_max", request.ebitda_margin_max);
  params.set("ev_min_usd_m", request.ev_min_usd_m);
  params.set("ev_max_usd_m", request.ev_max_usd_m);

  for (const id of request.sectors_id) {
    params.append("sectors_id[]", String(id));
  }
  for (const region of request.regions) {
    params.append("regions[]", region);
  }
  for (const id of request.location_ids) {
    params.append("location_ids[]", String(id));
  }
  for (const id of request.company_ids_include) {
    params.append("company_ids_include[]", String(id));
  }
  for (const id of request.company_ids_exclude) {
    params.append("company_ids_exclude[]", String(id));
  }

  return params;
}
