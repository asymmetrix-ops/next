import type { FiCompanyRow, FiMetricKey, FiMetricSourceType } from "./types";

export type { FiMetricSourceType } from "./types";

export const FI_SOURCE_TYPES: FiMetricSourceType[] = [
  "Public",
  "Estimate",
  "Proprietary",
];

export const DEFAULT_FI_SOURCE_TYPES: FiMetricSourceType[] = [...FI_SOURCE_TYPES];

export const SOURCE_TYPE_COLORS: Record<FiMetricSourceType, string> = {
  Public: "#22c55e",
  Estimate: "#f59e0b",
  Proprietary: "#8b5cf6",
};

export function parseSourceType(value: unknown): FiMetricSourceType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "public") return "Public";
  if (normalized === "estimate") return "Estimate";
  if (normalized === "proprietary") return "Proprietary";
  return null;
}

export function isDefaultSourceTypes(types: FiMetricSourceType[]): boolean {
  if (types.length !== FI_SOURCE_TYPES.length) return false;
  return FI_SOURCE_TYPES.every((type) => types.includes(type));
}

export function sourceTypeColor(type: FiMetricSourceType | null | undefined): string {
  if (!type) return "var(--fg-4)";
  return SOURCE_TYPE_COLORS[type];
}

/** Map benchmark metric keys to company row source-type fields from the API. */
export function getMetricSourceType(
  row: FiCompanyRow,
  metricKey: FiMetricKey
): FiMetricSourceType | null {
  switch (metricKey) {
    case "rev_growth_pc":
      return row.rev_growth_source_type ?? null;
    case "rule_of_40":
      return row.rev_growth_source_type ?? row.ebitda_source_type ?? null;
    case "ebitda_margin":
    case "ebit_margin":
      return row.ebitda_source_type ?? null;
    case "ev_revenue_x":
    case "ev_ebitda_x":
      return row.ev_source_type ?? null;
    case "revenue_multiple":
      return row.revenue_source_type ?? null;
    default:
      return null;
  }
}

function isSingleMetricSourceAllowed(
  row: FiCompanyRow,
  metricKey: FiMetricKey,
  allowedSources: FiMetricSourceType[]
): boolean {
  const sourceType = getMetricSourceType(row, metricKey);
  if (sourceType == null) return true;
  return allowedSources.includes(sourceType);
}

/** Whether a row's metric value may enter peer median / percentile / rank math. */
export function isMetricSourceAllowed(
  row: FiCompanyRow,
  metricKey: FiMetricKey,
  allowedSources: FiMetricSourceType[]
): boolean {
  if (metricKey === "rule_of_40") {
    return (
      isSingleMetricSourceAllowed(row, "rev_growth_pc", allowedSources) &&
      isSingleMetricSourceAllowed(row, "ebitda_margin", allowedSources)
    );
  }
  return isSingleMetricSourceAllowed(row, metricKey, allowedSources);
}

export function getHeadlineMetricSourceType(
  row: FiCompanyRow,
  headlineKey: "revenue" | "ebitda" | "rev_growth"
): FiMetricSourceType | null {
  switch (headlineKey) {
    case "revenue":
      return row.revenue_source_type ?? null;
    case "ebitda":
      return row.ebitda_source_type ?? null;
    case "rev_growth":
      return row.rev_growth_source_type ?? null;
  }
}

export function isHeadlineSourceAllowed(
  row: FiCompanyRow,
  headlineKey: "revenue" | "ebitda" | "rev_growth",
  allowedSources: FiMetricSourceType[]
): boolean {
  const sourceType = getHeadlineMetricSourceType(row, headlineKey);
  if (sourceType == null) return true;
  return allowedSources.includes(sourceType);
}
