/**
 * Benchmark vs peers — data shape for FinMetricsIncomeCard.
 * Returns null until peer aggregate API is wired; tab stays hidden when null.
 */

export type BenchmarkComparisonRow = {
  label: string;
  companyValue: string;
  peerMedian: string;
};

export type BenchmarkPeersData = {
  companyName: string;
  rows: BenchmarkComparisonRow[];
  /** e.g. "Peers: S&P Global, MSCI, FactSet… Median across 5 firms." */
  footnote?: string;
};

export type BenchmarkPeersInput = {
  companyName: string;
  // Future: peer financial aggregates from Xano / competitors API
};

/** Build benchmark table data. Returns null when no peer data is available. */
export function buildBenchmarkPeersData(
  input: BenchmarkPeersInput
): BenchmarkPeersData | null {
  // No backend data yet — wire API here using input.companyName when ready.
  void input;
  return null;
}

/** Compare numeric fragments in display strings for ▲/▼ pill tone. */
export function benchmarkDeltaTone(
  companyValue: string,
  peerMedian: string
): "up" | "down" | "neutral" {
  const num = (s: string) => {
    const m = String(s).match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };
  const a = num(companyValue);
  const b = num(peerMedian);
  if (a == null || b == null) return "neutral";
  if (a > b) return "up";
  if (a < b) return "down";
  return "neutral";
}
