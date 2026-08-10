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
  revenue_per_client: "revenue_per_client_source_type",
  no_employees: "no_employees_source_type",
  revenue_per_employee: "revenue_per_employee_source_type",
  rev_growth_pc: "rev_growth_source_type",
  new_client_growth_pc: "new_client_growth_source_type",
  rule_of_40: "rule_of_40_source_type",
  subscription_revenue_pc: "subscription_revenue_pc_source_type",
  subscription_revenue_m: "subscription_revenue_m_source_type",
  nrr: "nrr_source_type",
  churn_pc: "churn_source_type",
  grr_pc: "grr_source_type",
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

/** Fuzzy match on API display labels (e.g. "Company Provided", "Trusted Third Party"). */
function parseSourceLabelFuzzy(value: unknown): FiMetricSourceType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "linkedin") return "Public";
  if (normalized.includes("public") || normalized.includes("filing")) {
    return "Public";
  }
  if (
    normalized.includes("proprietary") ||
    normalized.includes("asymmetrix") ||
    normalized.includes("company provided") ||
    normalized.includes("company_provided") ||
    normalized.includes("company-provided") ||
    normalized.includes("third party") ||
    normalized.includes("third_party") ||
    normalized.includes("trusted third")
  ) {
    return "Proprietary";
  }
  if (
    normalized.includes("estimate") ||
    normalized.includes("model") ||
    normalized.includes("analyst") ||
    normalized.includes("human")
  ) {
    return "Estimate";
  }
  return null;
}

/** Map Xano numeric source ids (and descriptive strings) to FI filter buckets. */
function parseSourceCode(code: unknown): FiMetricSourceType | null {
  if (code == null || code === "") return null;

  const asString = typeof code === "string" ? code.trim() : String(code);
  const exact = parseSourceType(asString);
  if (exact) return exact;

  if (typeof code === "string" && Number.isNaN(Number(code))) {
    return parseSourceLabelFuzzy(code);
  }

  const n = typeof code === "number" ? code : parseInt(asString, 10);
  if (!Number.isFinite(n)) return null;
  switch (n) {
    case 1:
      return "Public";
    case 2:
    case 3:
    case 5:
      return "Proprietary";
    case 4:
    case 6:
      return "Estimate";
    default:
      return null;
  }
}

const SOURCE_TYPE_BY_COLOR: Record<string, FiMetricSourceType> = {
  "#2db7ff": "Proprietary",
  "#0f172a": "Public",
  "#9ca3af": "Estimate",
};

/** Resolve a card/API source label, numeric code, or legend color to a filter type. */
export function resolveFinancialMetricSourceType(
  label?: unknown,
  code?: unknown,
  color?: unknown
): FiMetricSourceType | null {
  const fromLabel = parseSourceType(label) ?? parseSourceLabelFuzzy(label);
  if (fromLabel) return fromLabel;

  const fromCode = parseSourceCode(code);
  if (fromCode) return fromCode;

  if (typeof color === "string") {
    const byColor = SOURCE_TYPE_BY_COLOR[color.trim().toLowerCase()];
    if (byColor) return byColor;
  }

  return null;
}

export function isDefaultSourceTypes(types: FiMetricSourceType[]): boolean {
  if (types.length !== FI_SOURCE_TYPES.length) return false;
  return FI_SOURCE_TYPES.every((type) => types.includes(type));
}

export function sourceTypeColor(type: FiMetricSourceType | string | null | undefined): string {
  if (!type) return "var(--fg-4)";
  const bucket =
    (typeof type === "string" ? resolveFinancialMetricSourceType(type) : type) ??
    parseSourceType(type);
  if (bucket) return SOURCE_TYPE_COLORS[bucket];
  return "var(--fg-4)";
}

export function sourceLabelDescription(label: string): string {
  const bucket = resolveFinancialMetricSourceType(label);
  if (bucket) return SOURCE_TYPE_DESCRIPTIONS[bucket];
  return label;
}

export function resolveSourceLabelBucket(
  label: string | null | undefined
): FiMetricSourceType | null {
  if (!label) return null;
  return resolveFinancialMetricSourceType(label);
}

/** Map benchmark metric keys to company row source-type fields from the API. */
export function getMetricSourceType(
  row: FiCompanyRow,
  metricKey: FiMetricKey
): string | null {
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
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isSourceLabelAllowed(
  label: string | null,
  allowedSources: FiMetricSourceType[]
): boolean {
  if (label == null) return true;
  if (allowedSources.includes(label as FiMetricSourceType)) return true;
  const bucket = resolveFinancialMetricSourceType(label);
  return bucket != null && allowedSources.includes(bucket);
}

function isSingleMetricSourceAllowed(
  row: FiCompanyRow,
  metricKey: FiMetricKey,
  allowedSources: FiMetricSourceType[]
): boolean {
  return isSourceLabelAllowed(getMetricSourceType(row, metricKey), allowedSources);
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
): string | null {
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
  return isSourceLabelAllowed(
    getHeadlineMetricSourceType(row, headlineKey),
    allowedSources
  );
}
