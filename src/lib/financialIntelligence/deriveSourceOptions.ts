import type { FiCompanyRow } from "./types";

export const FI_SOURCE_TYPE_FIELDS = [
  "revenue_source_type",
  "subscription_revenue_pc_source_type",
  "subscription_revenue_m_source_type",
  "ebitda_source_type",
  "ebitda_margin_source_type",
  "ebit_source_type",
  "ev_source_type",
  "no_of_clients_source_type",
  "revenue_per_client_source_type",
  "no_employees_source_type",
  "revenue_per_employee_source_type",
  "rev_growth_source_type",
  "new_client_growth_source_type",
  "rule_of_40_source_type",
  "nrr_source_type",
  "churn_source_type",
  "grr_source_type",
  "upsell_source_type",
  "cross_sell_source_type",
  "price_increase_source_type",
  "rev_expansion_source_type",
  "revenue_multiple_source_type",
] as const satisfies ReadonlyArray<keyof FiCompanyRow>;

/** Collect distinct Front_End_Display labels from peer/target rows (unfiltered baseline). */
export function deriveSourceOptions(rows: FiCompanyRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const field of FI_SOURCE_TYPE_FIELDS) {
      const value = row[field];
      if (typeof value === "string" && value.trim()) {
        set.add(value.trim());
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
