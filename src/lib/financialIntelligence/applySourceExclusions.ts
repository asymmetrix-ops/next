import { FI_BENCHMARK_SCORECARD_KEYS } from "./calculations";
import {
  FI_SOURCE_TYPES,
  isDefaultSourceTypes,
  isMetricSourceAllowed,
  resolveFinancialMetricSourceType,
} from "./sourceTypes";
import type { FiCompanyRow, FiMetricKey, FiMetricSourceType } from "./types";

const METRIC_ROW_FIELDS: Partial<Record<FiMetricKey, keyof FiCompanyRow>> = {
  revenue_m_usd: "revenue_m_usd",
  ebitda_m_usd: "ebitda_m_usd",
  ebit_m_usd: "ebit_m_usd",
  ev_usd: "ev_usd",
  revenue_multiple: "revenue_multiple",
  rev_growth_pc: "rev_growth_pc",
  ebitda_margin: "ebitda_margin",
  rule_of_40: "rule_of_40",
  subscription_revenue_pc: "subscription_revenue_pc",
  subscription_revenue_m: "subscription_revenue_m",
  churn_pc: "churn_pc",
  grr_pc: "grr_pc",
  upsell_pc: "upsell_pc",
  cross_sell_pc: "cross_sell_pc",
  price_increase_pc: "price_increase_pc",
  rev_expansion_pc: "rev_expansion_pc",
  nrr: "nrr",
  new_client_growth_pc: "new_client_growth_pc",
  no_of_clients: "no_of_clients",
  revenue_per_client: "revenue_per_client",
  no_employees: "no_employees",
  revenue_per_employee: "revenue_per_employee",
  ev_revenue_x: "ev_revenue_x",
  ev_ebitda_x: "ev_ebitda_x",
};

/** Map excluded API bucket keys (Public / Proprietary / Estimate) to allowed source types. */
export function excludedLabelsToAllowedSources(
  excludedLabels: string[]
): FiMetricSourceType[] {
  if (excludedLabels.length === 0) return [...FI_SOURCE_TYPES];

  const excluded = new Set<FiMetricSourceType>();
  for (const label of excludedLabels) {
    const bucket = resolveFinancialMetricSourceType(label);
    if (bucket) excluded.add(bucket);
  }

  if (excluded.size === 0) return [...FI_SOURCE_TYPES];
  return FI_SOURCE_TYPES.filter((type) => !excluded.has(type));
}

/** Null metric values whose source bucket is not in the allowed set. */
export function filterCompanyRowByAllowedSources(
  row: FiCompanyRow,
  allowedSources: FiMetricSourceType[]
): FiCompanyRow {
  if (isDefaultSourceTypes(allowedSources)) return row;

  const next: FiCompanyRow = { ...row };

  for (const key of FI_BENCHMARK_SCORECARD_KEYS) {
    const field = METRIC_ROW_FIELDS[key];
    if (!field) continue;

    const current = next[field];
    if (current == null || current === "") continue;

    if (!isMetricSourceAllowed(next, key, allowedSources)) {
      next[field] = null as never;
    }
  }

  return next;
}

export function filterCompanyRowsByAllowedSources(
  rows: FiCompanyRow[],
  allowedSources: FiMetricSourceType[]
): FiCompanyRow[] {
  if (isDefaultSourceTypes(allowedSources)) return rows;
  return rows.map((row) => filterCompanyRowByAllowedSources(row, allowedSources));
}

/** Null metric values whose source bucket is excluded (mirrors backend per-field filtering). */
export function applyExcludedSourceLabelsToRow(
  row: FiCompanyRow,
  excludedLabels: string[]
): FiCompanyRow {
  if (excludedLabels.length === 0) return row;
  return filterCompanyRowByAllowedSources(
    row,
    excludedLabelsToAllowedSources(excludedLabels)
  );
}

export function applyExcludedSourceLabelsToRows(
  rows: FiCompanyRow[],
  excludedLabels: string[]
): FiCompanyRow[] {
  if (excludedLabels.length === 0) return rows;
  return rows.map((row) => applyExcludedSourceLabelsToRow(row, excludedLabels));
}
