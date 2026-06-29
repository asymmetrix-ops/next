import type { FiCompanyRow, FiMetricDef, FiMetricKey, FiMetricSourceType } from "./types";
import { isMetricSourceAllowed } from "./sourceTypes";

export const FI_BENCHMARK_METRICS: FiMetricDef[] = [
  { key: "rev_growth_pc", label: "Revenue growth", higherIsBetter: true, format: "percent" },
  { key: "rule_of_40", label: "Rule of 40", higherIsBetter: true, format: "percent" },
  { key: "ebitda_margin", label: "EBITDA margin", higherIsBetter: true, format: "percent" },
  { key: "ebit_margin", label: "EBIT margin", higherIsBetter: true, format: "percent" },
  { key: "ev_revenue_x", label: "EV / Revenue", higherIsBetter: false, format: "multiple" },
  { key: "ev_ebitda_x", label: "EV / EBITDA", higherIsBetter: false, format: "multiple" },
  { key: "revenue_multiple", label: "Revenue multiple", higherIsBetter: false, format: "multiple" },
];

export const FI_BENCHMARK_SECTIONS: Array<{
  id: string;
  label: string;
  keys: FiMetricKey[];
}> = [
  { id: "growth", label: "Growth", keys: ["rev_growth_pc", "rule_of_40"] },
  {
    id: "profitability",
    label: "Profitability",
    keys: ["ebitda_margin", "ebit_margin"],
  },
  {
    id: "valuation",
    label: "Valuation",
    keys: ["ev_revenue_x", "ev_ebitda_x", "revenue_multiple"],
  },
];

export function toMillions(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) >= 1_000_000) return value / 1_000_000;
  return value;
}

export function getMetricValue(row: FiCompanyRow, key: FiMetricKey): number | null {
  switch (key) {
    case "rev_growth_pc":
      return row.rev_growth_pc;
    case "rule_of_40":
      if (row.rule_of_40 != null && Number.isFinite(row.rule_of_40)) return row.rule_of_40;
      if (row.rev_growth_pc != null && row.ebitda_margin != null) {
        return row.rev_growth_pc + row.ebitda_margin;
      }
      return null;
    case "ebitda_margin":
      return row.ebitda_margin;
    case "ebit_margin": {
      const revenue = toMillions(row.revenue_m_usd);
      const ebit = toMillions(row.ebit_m_usd);
      if (revenue == null || ebit == null || revenue === 0) return null;
      return (ebit / revenue) * 100;
    }
    case "ev_revenue_x":
      return row.ev_revenue_x;
    case "ev_ebitda_x":
      return row.ev_ebitda_x;
    case "revenue_multiple":
      return row.revenue_multiple;
    default:
      return null;
  }
}

/** Peer metric value for benchmark math — null when source type is filtered out. */
export function getPeerMetricValueForCalc(
  peer: FiCompanyRow,
  key: FiMetricKey,
  allowedSources: FiMetricSourceType[]
): number | null {
  if (!isMetricSourceAllowed(peer, key, allowedSources)) return null;
  return getMetricValue(peer, key);
}

export function quantile(values: number[], q: number): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function computeDistributionStats(peerValues: number[]): {
  min: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
} {
  const sorted = peerValues.filter((v) => Number.isFinite(v));
  if (sorted.length === 0) {
    return { min: null, max: null, q1: null, q3: null };
  }
  return {
    min: Math.min(...sorted),
    max: Math.max(...sorted),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
  };
}

export function peerMedian(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function computePercentile(
  targetValue: number,
  peerValues: number[],
  higherIsBetter: boolean
): number | null {
  const peers = peerValues.filter((v) => Number.isFinite(v));
  const n = peers.length;
  if (n === 0) return null;

  const rank = higherIsBetter
    ? peers.filter((v) => v < targetValue).length
    : peers.filter((v) => v > targetValue).length;

  return Math.round((rank / n) * 100);
}

/** Rank among target + peers (1 = best). */
export function computeRank(
  targetValue: number,
  peerValues: number[],
  higherIsBetter: boolean
): { rank: number; total: number } | null {
  const peers = peerValues.filter((v) => Number.isFinite(v));
  if (peers.length === 0) return null;

  const sorted = [...peers, targetValue].sort((a, b) =>
    higherIsBetter ? b - a : a - b
  );
  const rank = sorted.indexOf(targetValue) + 1;
  return { rank, total: sorted.length };
}

export function computeCompositePercentile(
  target: FiCompanyRow,
  peers: FiCompanyRow[],
  allowedSources: FiMetricSourceType[] = ["Public", "Estimate", "Proprietary"]
): number | null {
  const scores: number[] = [];

  for (const metric of FI_BENCHMARK_METRICS) {
    const targetValue = getMetricValue(target, metric.key);
    if (targetValue == null) continue;

    const peerValues = peers
      .map((peer) => getPeerMetricValueForCalc(peer, metric.key, allowedSources))
      .filter((v): v is number => v != null && Number.isFinite(v));

    const percentile = computePercentile(targetValue, peerValues, metric.higherIsBetter);
    if (percentile != null) scores.push(percentile);
  }

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
}

export function histogramBins(
  values: number[],
  binCount = 8
): { min: number; max: number; count: number }[] {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return [];

  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  if (min === max) {
    return [{ min, max, count: filtered.length }];
  }

  const step = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    min: min + i * step,
    max: min + (i + 1) * step,
    count: 0,
  }));

  for (const value of filtered) {
    let idx = Math.floor((value - min) / step);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count += 1;
  }

  return bins;
}
