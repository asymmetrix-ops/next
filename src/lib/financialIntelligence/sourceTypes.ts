import type { FiCompanyRow, FiMetricKey, FiMetricSourceType } from "./types";

export type { FiMetricSourceType } from "./types";

export const FI_SOURCE_TYPES: FiMetricSourceType[] = [
  "Public",
  "Estimate",
  "Proprietary",
];

export const DEFAULT_FI_SOURCE_TYPES: FiMetricSourceType[] = [...FI_SOURCE_TYPES];

export const SOURCE_TYPE_COLORS: Record<FiMetricSourceType, string> = {
  Proprietary: "#2DB7FF",
  Public: "#0F172A",
  Estimate: "#9CA3AF",
};

/** Display order for the data-source legend (matches product design). */
export const FI_SOURCE_TYPES_UI_ORDER: FiMetricSourceType[] = [
  "Proprietary",
  "Public",
  "Estimate",
];

export const SOURCE_TYPE_DESCRIPTIONS: Record<FiMetricSourceType, string> = {
  Proprietary: "Asymmetrix research & primary data",
  Public: "Public filings & disclosures",
  Estimate: "Modelled / estimated figures",
};

const METRIC_SOURCE_FIELD: Partial<
  Record<FiMetricKey, keyof FiCompanyRow>
> = {
  revenue_m_usd: "revenue_source_type",
  ebitda_m_usd: "ebitda_source_type",
  ebit_m_usd: "ebit_source_type",
  ev_usd: "ev_source_type",
  no_of_clients: "no_of_clients_source_type",
  revenue_per_employee: "revenue_per_employee_source_type",
  rev_growth_pc: "rev_growth_source_type",
  new_client_growth_pc: "new_client_growth_source_type",
  rule_of_40: "rule_of_40_source_type",
  nrr: "nrr_source_type",
  churn_pc: "churn_source_type",
  upsell_pc: "upsell_source_type",
  cross_sell_pc: "cross_sell_source_type",
  price_increase_pc: "price_increase_source_type",
  rev_expansion_pc: "rev_expansion_source_type",
  ebitda_margin: "ebitda_source_type",
  revenue_multiple: "revenue_multiple_source_type",
  ev_revenue_x: "ev_source_type",
  ev_ebitda_x: "ev_source_type",
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
  if (metricKey === "rule_of_40") {
    return (
      row.rule_of_40_source_type ??
      row.rev_growth_source_type ??
      row.ebitda_source_type ??
      null
    );
  }

  const field = METRIC_SOURCE_FIELD[metricKey];
  if (!field) return null;
  const value = row[field];
  return typeof value === "string" ? (value as FiMetricSourceType) : null;
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
