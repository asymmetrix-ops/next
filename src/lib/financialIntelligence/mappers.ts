import type { FinRow } from "@/app/financials-tsx/types";
import type { SectorMedian } from "@/app/financials-tsx/types";
import {
  FI_BENCHMARK_METRICS,
  computeDistributionStats,
  computePercentile,
  computeRank,
  getMetricValue,
  getPeerMetricValueForCalc,
  peerMedian,
  toMillions,
} from "./calculations";
import {
  DEFAULT_FI_SOURCE_TYPES,
  getMetricSourceType,
  getHeadlineMetricSourceType,
  isHeadlineSourceAllowed,
  type FiMetricSourceType,
} from "./sourceTypes";
import type {
  FiBenchmarkMetricRow,
  FiCompanyRow,
  FiHeadlineMetric,
  FiSectorLookup,
} from "./types";

const BRAND_COLORS = [
  "#0370AA",
  "#0788C8",
  "#15A2EA",
  "#02527D",
  "#54C7FF",
  "#128A5C",
  "#7B5CD9",
];

export function parseSectorsId(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .replace(/[{}]/g, "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function resolveSectorNames(
  sectorsId: string,
  primarySectors: FiSectorLookup[],
  secondarySectors: FiSectorLookup[]
): { primary: string; secondary: string } {
  const ids = parseSectorsId(sectorsId);
  const primaryNames: string[] = [];
  const secondaryNames: string[] = [];

  for (const id of ids) {
    const primary = primarySectors.find((s) => s.id === id);
    if (primary) {
      primaryNames.push(primary.sector_name);
      continue;
    }
    const secondary = secondarySectors.find((s) => s.id === id);
    if (secondary) secondaryNames.push(secondary.sector_name);
  }

  return {
    primary: primaryNames[0] ?? secondaryNames[0] ?? "—",
    secondary: secondaryNames[0] ?? primaryNames[1] ?? "—",
  };
}

export function companyColor(companyId: number): string {
  return BRAND_COLORS[companyId % BRAND_COLORS.length];
}

export function mapCompanyToFinRow(
  row: FiCompanyRow,
  primarySectors: FiSectorLookup[],
  secondarySectors: FiSectorLookup[]
): FinRow {
  const sectors = resolveSectorNames(row.sectors_id, primarySectors, secondarySectors);
  const revenue = toMillions(row.revenue_m_usd);
  const ebitda = toMillions(row.ebitda_m_usd);
  const ebit = toMillions(row.ebit_m_usd);
  const ev = toMillions(row.ev_usd);

  const ruleOf40 =
    row.rule_of_40 ??
    (row.rev_growth_pc != null && row.ebitda_margin != null
      ? row.rev_growth_pc + row.ebitda_margin
      : undefined);

  const evEbit =
    ev != null && ebit != null && ebit !== 0 ? ev / ebit : undefined;

  return {
    name: row.company_name,
    primary: sectors.primary,
    secondary: sectors.secondary,
    country: row.location_country || "—",
    hq: row.location_country || "—",
    ownership: "Private",
    color: companyColor(row.company_id),
    fte: 0,
    revenue: revenue ?? 0,
    rev_growth: row.rev_growth_pc ?? 0,
    ebitda: ebitda ?? 0,
    ebitda_margin: row.ebitda_margin ?? 0,
    ebit: ebit ?? 0,
    ev: ev ?? 0,
    ev_revenue: row.ev_revenue_x ?? (revenue && ev ? ev / revenue : 0),
    ev_ebitda: row.ev_ebitda_x ?? (ebitda && ev ? ev / ebitda : 0),
    ev_ebit: evEbit ?? 0,
    rev_multiple: row.revenue_multiple ?? row.ev_revenue_x ?? 0,
    trend: [],
    rule_of_40: ruleOf40,
    financial_year: row.financial_year ? String(row.financial_year) : undefined,
  };
}

export function buildPeerSectorMedian(peers: FiCompanyRow[]): SectorMedian {
  const finRows = peers.map((peer) => mapCompanyToFinRow(peer, [], []));
  const pick = (key: keyof SectorMedian) => {
    const values = finRows
      .map((row) => row[key])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return peerMedian(values) ?? 0;
  };

  return {
    fte: pick("fte"),
    revenue: pick("revenue"),
    rev_growth: pick("rev_growth"),
    ebitda: pick("ebitda"),
    ebitda_margin: pick("ebitda_margin"),
    ebit: pick("ebit"),
    ev: pick("ev"),
    ev_revenue: pick("ev_revenue"),
    ev_ebit: pick("ev_ebit"),
    ev_ebitda: pick("ev_ebitda"),
    rev_multiple: pick("rev_multiple"),
  };
}

export function buildBenchmarkMetricRows(
  target: FiCompanyRow,
  peers: FiCompanyRow[],
  allowedSources: FiMetricSourceType[] = DEFAULT_FI_SOURCE_TYPES
): FiBenchmarkMetricRow[] {
  return FI_BENCHMARK_METRICS.map((metric) => {
    const targetValue = getMetricValue(target, metric.key);
    const peerValues = peers
      .map((peer) => getPeerMetricValueForCalc(peer, metric.key, allowedSources))
      .filter((v): v is number => v != null && Number.isFinite(v));
    const median = peerMedian(peerValues);
    const percentile =
      targetValue != null
        ? computePercentile(targetValue, peerValues, metric.higherIsBetter)
        : null;
    const deltaVsMedian =
      targetValue != null && median != null ? targetValue - median : null;
    const rankResult =
      targetValue != null
        ? computeRank(targetValue, peerValues, metric.higherIsBetter)
        : null;
    const { min, max, q1, q3 } = computeDistributionStats(peerValues);

    return {
      key: metric.key,
      label: metric.label,
      targetValue,
      peerMedian: median,
      peerValues,
      min,
      max,
      q1,
      q3,
      percentile,
      rank: rankResult?.rank ?? null,
      rankTotal: rankResult?.total ?? null,
      deltaVsMedian,
      higherIsBetter: metric.higherIsBetter,
      format: metric.format,
      targetSourceType: getMetricSourceType(target, metric.key),
    };
  });
}

export function buildHeadlineMetrics(
  target: FiCompanyRow,
  peers: FiCompanyRow[],
  allowedSources: FiMetricSourceType[] = DEFAULT_FI_SOURCE_TYPES
): FiHeadlineMetric[] {
  const defs: Array<{
    key: "revenue" | "ebitda" | "rev_growth";
    label: string;
    getValue: (row: FiCompanyRow) => number | null;
    format: "percent" | "currency";
    higherIsBetter: boolean;
  }> = [
    {
      key: "revenue",
      label: "Revenue",
      getValue: (row) => toMillions(row.revenue_m_usd),
      format: "currency",
      higherIsBetter: true,
    },
    {
      key: "ebitda",
      label: "EBITDA",
      getValue: (row) => toMillions(row.ebitda_m_usd),
      format: "currency",
      higherIsBetter: true,
    },
    {
      key: "rev_growth",
      label: "Revenue growth",
      getValue: (row) => row.rev_growth_pc,
      format: "percent",
      higherIsBetter: true,
    },
  ];

  return defs.map((def) => {
    const targetValue = def.getValue(target);
    const peerValues = peers
      .map((peer) =>
        isHeadlineSourceAllowed(peer, def.key, allowedSources) ? def.getValue(peer) : null
      )
      .filter((v): v is number => v != null && Number.isFinite(v));
    const median = peerMedian(peerValues);
    const percentile =
      targetValue != null
        ? computePercentile(targetValue, peerValues, def.higherIsBetter)
        : null;
    const deltaVsMedian =
      targetValue != null && median != null ? targetValue - median : null;

    return {
      key: def.key,
      label: def.label,
      targetValue,
      targetSourceType: getHeadlineMetricSourceType(target, def.key),
      peerMedian: median,
      peerValues,
      percentile,
      deltaVsMedian,
      higherIsBetter: def.higherIsBetter,
      format: def.format,
    };
  });
}

export function vintageTooltip(
  peerYear: number,
  targetYear: number,
  peerMonth?: number | null,
  targetMonth?: number | null
): string {
  const fmtPeriod = (year: number, month?: number | null) => {
    if (year <= 0) return "unknown period";
    if (month != null && month >= 1 && month <= 12) {
      return `FY${year} (YE month ${month})`;
    }
    return `FY${year}`;
  };

  const peerLabel = fmtPeriod(peerYear, peerMonth);
  const targetLabel = fmtPeriod(targetYear, targetMonth);

  if (peerYear < targetYear) {
    return `This company's latest financials are from ${peerLabel}; target uses ${targetLabel}.`;
  }
  if (peerYear > targetYear) {
    return `This company's latest financials are from ${peerLabel} (more recent than target ${targetLabel}).`;
  }
  if (
    peerMonth != null &&
    targetMonth != null &&
    peerMonth !== targetMonth
  ) {
    return `Year-end month differs: peer ${peerLabel} vs target ${targetLabel}.`;
  }
  return `Financial period: ${peerLabel} vs target ${targetLabel}.`;
}
