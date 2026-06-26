import { FI_BENCHMARK_METRICS, getMetricValue } from "./calculations";
import type {
  FiBenchmarkMetricRow,
  FiCompanyRow,
  FiHeadlineMetric,
} from "./types";

function escapeCsvField(value: string): string {
  const s = String(value ?? "").trim();
  if (s.includes('"') || s.includes("\n") || s.includes(",")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvCell(value: string | number | null | undefined): string {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) {
    return "";
  }
  return escapeCsvField(String(value));
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",");
}

export interface BenchmarkCsvInput {
  target: FiCompanyRow;
  peers: FiCompanyRow[];
  benchmarkRows: FiBenchmarkMetricRow[];
  headlineMetrics: FiHeadlineMetric[];
  compositePercentile: number | null;
  exportedAt?: Date;
}

export function buildBenchmarkCsv(input: BenchmarkCsvInput): string {
  const {
    target,
    peers,
    benchmarkRows,
    headlineMetrics,
    compositePercentile,
    exportedAt = new Date(),
  } = input;

  const lines: string[] = [];

  lines.push("Financial Benchmark Export");
  lines.push(csvRow(["Target Company", target.company_name]));
  lines.push(csvRow(["Target Company ID", target.company_id]));
  lines.push(csvRow(["Target Country", target.location_country]));
  lines.push(csvRow(["Target Region", target.location_region]));
  lines.push(csvRow(["Target Financial Year", target.financial_year || ""]));
  lines.push(csvRow(["Peer Count", peers.length]));
  lines.push(csvRow(["Composite Percentile", compositePercentile ?? ""]));
  lines.push(csvRow(["Exported At", exportedAt.toISOString()]));
  lines.push("");

  lines.push("Headline Metrics");
  lines.push(
    csvRow([
      "Metric",
      "Target Value",
      "Peer Median",
      "Percentile",
      "Delta vs Median",
    ])
  );
  for (const row of headlineMetrics) {
    lines.push(
      csvRow([
        row.label,
        row.targetValue,
        row.peerMedian,
        row.percentile,
        row.deltaVsMedian,
      ])
    );
  }
  lines.push("");

  lines.push("Benchmark Metrics");
  lines.push(
    csvRow([
      "Metric",
      "Target Value",
      "Peer Median",
      "Percentile",
      "Rank",
      "Rank Total",
      "Delta vs Median",
    ])
  );
  for (const row of benchmarkRows) {
    lines.push(
      csvRow([
        row.label,
        row.targetValue,
        row.peerMedian,
        row.percentile,
        row.rank,
        row.rankTotal,
        row.deltaVsMedian,
      ])
    );
  }
  lines.push("");

  const peerMetricHeaders = FI_BENCHMARK_METRICS.map((m) => m.label);
  lines.push("Peer Companies");
  lines.push(
    csvRow([
      "Company",
      "Company ID",
      "Country",
      "Region",
      "Financial Year",
      "Revenue ($m)",
      "EBITDA ($m)",
      "EV ($m)",
      ...peerMetricHeaders,
      "Manually Added",
    ])
  );

  for (const peer of peers) {
    const metricValues = FI_BENCHMARK_METRICS.map((m) =>
      getMetricValue(peer, m.key)
    );
    lines.push(
      csvRow([
        peer.company_name,
        peer.company_id,
        peer.location_country,
        peer.location_region,
        peer.financial_year || "",
        peer.revenue_m_usd,
        peer.ebitda_m_usd,
        peer.ev_usd,
        ...metricValues,
        peer.is_manually_added ? "Yes" : "No",
      ])
    );
  }

  lines.push("");
  lines.push("Target Company (reference row)");
  lines.push(
    csvRow([
      target.company_name,
      target.company_id,
      target.location_country,
      target.location_region,
      target.financial_year || "",
      target.revenue_m_usd,
      target.ebitda_m_usd,
      target.ev_usd,
      ...FI_BENCHMARK_METRICS.map((m) => getMetricValue(target, m.key)),
      "No",
    ])
  );

  return lines.join("\n");
}

export function downloadBenchmarkCsv(
  filename: string,
  content: string
): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportBenchmarkToCsv(input: BenchmarkCsvInput): void {
  const slug = input.target.company_name
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const date = (input.exportedAt ?? new Date()).toISOString().slice(0, 10);
  const filename = `financial-benchmark-${slug || input.target.company_id}-${date}.csv`;
  downloadBenchmarkCsv(filename, buildBenchmarkCsv(input));
}
