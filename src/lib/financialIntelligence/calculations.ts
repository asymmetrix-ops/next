import type { FiCompanyRow, FiMetricDef, FiMetricKey, FiMetricSourceType } from "./types";
import { isMetricSourceAllowed } from "./sourceTypes";
import { SHOW_ARR } from "@/lib/platformVisibility";

const FI_BENCHMARK_METRICS_ALL: FiMetricDef[] = [
  { key: "revenue_m_usd", label: "Revenue", higherIsBetter: true, format: "currency" },
  { key: "arr_m_usd", label: "ARR", higherIsBetter: true, format: "currency" },
  { key: "ev_usd", label: "EV", higherIsBetter: true, format: "currency" },
  { key: "no_of_clients", label: "Number of clients", higherIsBetter: true, format: "count" },
  {
    key: "revenue_per_employee",
    label: "Revenue per employee",
    higherIsBetter: true,
    format: "currency_k",
  },
  { key: "ebitda_m_usd", label: "EBITDA", higherIsBetter: true, format: "currency" },
  { key: "ebit_m_usd", label: "EBIT", higherIsBetter: true, format: "currency" },
  { key: "ebitda_margin", label: "EBITDA margin", higherIsBetter: true, format: "percent" },
  { key: "rev_growth_pc", label: "Revenue growth", higherIsBetter: true, format: "percent" },
  {
    key: "new_client_growth_pc",
    label: "New client growth",
    higherIsBetter: true,
    format: "percent",
  },
  { key: "rule_of_40", label: "Rule of 40", higherIsBetter: true, format: "percent" },
  { key: "nrr", label: "NRR", higherIsBetter: true, format: "percent" },
  {
    key: "revenue_multiple",
    label: "Revenue multiple",
    higherIsBetter: false,
    directionHint: "cheaper",
    format: "multiple",
  },
  {
    key: "ev_revenue_x",
    label: "EV / Revenue",
    higherIsBetter: false,
    directionHint: "cheaper",
    format: "multiple",
  },
  {
    key: "ev_ebitda_x",
    label: "EV / EBITDA",
    higherIsBetter: false,
    directionHint: "cheaper",
    format: "multiple",
  },
];

export const FI_BENCHMARK_METRICS: FiMetricDef[] = SHOW_ARR
  ? FI_BENCHMARK_METRICS_ALL
  : FI_BENCHMARK_METRICS_ALL.filter((metric) => metric.key !== "arr_m_usd");

export const FI_BENCHMARK_SECTIONS: Array<{
  id: string;
  label: string;
  keys: FiMetricKey[];
}> = [
  {
    id: "scale",
    label: "Scale",
    keys: [
      "revenue_m_usd",
      ...(SHOW_ARR ? (["arr_m_usd"] as FiMetricKey[]) : []),
      "ev_usd",
      "no_of_clients",
      "revenue_per_employee",
    ],
  },
  {
    id: "profitability",
    label: "Profitability",
    keys: ["ebitda_m_usd", "ebit_m_usd", "ebitda_margin"],
  },
  {
    id: "growth",
    label: "Growth & Expansion",
    keys: ["rev_growth_pc", "new_client_growth_pc", "rule_of_40", "nrr"],
  },
  {
    id: "valuation",
    label: "Valuation",
    keys: ["revenue_multiple", "ev_revenue_x", "ev_ebitda_x"],
  },
];

export function toMillions(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) >= 1_000_000) return value / 1_000_000;
  return value;
}

export function getMetricValue(row: FiCompanyRow, key: FiMetricKey): number | null {
  switch (key) {
    case "revenue_m_usd":
      return toMillions(row.revenue_m_usd);
    case "arr_m_usd":
      return toMillions(row.arr_m_usd);
    case "ebitda_m_usd":
      return toMillions(row.ebitda_m_usd);
    case "ebit_m_usd":
      return toMillions(row.ebit_m_usd);
    case "ev_usd":
      return toMillions(row.ev_usd);
    case "no_of_clients":
      return row.no_of_clients;
    case "revenue_per_employee":
      return row.revenue_per_employee;
    case "rev_growth_pc":
      return row.rev_growth_pc;
    case "new_client_growth_pc":
      return row.new_client_growth_pc;
    case "rule_of_40":
      if (row.rule_of_40 != null && Number.isFinite(row.rule_of_40)) return row.rule_of_40;
      if (row.rev_growth_pc != null && row.ebitda_margin != null) {
        return row.rev_growth_pc + row.ebitda_margin;
      }
      return null;
    case "nrr":
      return row.nrr;
    case "churn_pc":
      return row.churn_pc;
    case "upsell_pc":
      return row.upsell_pc;
    case "cross_sell_pc":
      return row.cross_sell_pc;
    case "price_increase_pc":
      return row.price_increase_pc;
    case "rev_expansion_pc":
      return row.rev_expansion_pc;
    case "ebitda_margin":
      return row.ebitda_margin;
    case "revenue_multiple":
      return row.revenue_multiple;
    case "ev_revenue_x":
      if (row.ev_revenue_x != null && Number.isFinite(row.ev_revenue_x)) return row.ev_revenue_x;
      {
        const revenue = toMillions(row.revenue_m_usd);
        const ev = toMillions(row.ev_usd);
        if (revenue != null && ev != null && revenue !== 0) return ev / revenue;
      }
      return null;
    case "ev_ebitda_x":
      return row.ev_ebitda_x;
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
