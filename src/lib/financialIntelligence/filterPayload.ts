import type { FilterState } from "@/app/financials-tsx/types";
import type { FiLocationRow, FiPeersRequest, FiSectorLookup, SavedBenchmark } from "./types";

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

export function resolveLocationIds(
  filters: FilterState[],
  locations: FiLocationRow[]
): number[] {
  const ids = new Set<number>();
  const regions = enumValues(filters.find((f) => f.id === "region"));
  const countries = enumValues(filters.find((f) => f.id === "country"));

  for (const location of locations) {
    const region = (location.Continental_Region || "").trim();
    const country = (location.Country || "").trim();

    if (regions.length > 0 && regions.includes(region)) {
      ids.add(location.id);
      continue;
    }
    if (countries.length > 0 && countries.includes(country)) {
      ids.add(location.id);
    }
  }

  return Array.from(ids);
}

export function hasActiveApiFilters(request: FiPeersRequest): boolean {
  if (request.sectors_id.length > 0) return true;
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
  secondarySectors: FiSectorLookup[];
  locations: FiLocationRow[];
}): FiPeersRequest {
  const revenue = rangeValue(args.filters.find((f) => f.id === "revenue"));
  const ev = rangeValue(args.filters.find((f) => f.id === "ev"));
  const ebitdaMargin = rangeValue(args.filters.find((f) => f.id === "ebitda_margin"));

  return {
    target_company_id: args.targetCompanyId,
    sectors_id: resolveSectorIds(args.filters, args.primarySectors, args.secondarySectors),
    location_ids: resolveLocationIds(args.filters, args.locations),
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

export function savedBenchmarkToFilters(saved: SavedBenchmark): FilterState[] {
  const filters: FilterState[] = [];

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
