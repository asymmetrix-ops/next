/**
 * The metrics shown on the company profile cards (Financial / Subscription / Other Metrics):
 * names and order live here once. The profile cards and the contributor portal both read this
 * list, so a metric added or renamed here shows up in both places.
 */
export type CardMetricUnit = "$m" | "$" | "%" | "x" | "#";

export type CardMetric = {
  /** Contributor form key */
  key: string;
  /** Name on the card (no trailing colon) */
  label: string;
  unit: CardMetricUnit;
  /** Key sent on the change request `new` payload */
  payloadKey: string;
  /** Keys the current record may expose this value under, first match wins */
  readKeys: string[];
  placeholder: string;
};

export type CardMetricGroup = {
  title: "Financial Metrics" | "Subscription Metrics" | "Other Metrics";
  color: string;
  metrics: CardMetric[];
};

export const FINANCIAL_METRIC_CARD_GROUPS: CardMetricGroup[] = [
  {
    title: "Financial Metrics",
    color: "#1d4ed8",
    metrics: [
      { key: "revenue_m", label: "Revenue (m)", unit: "$m", payloadKey: "Revenue_m", readKeys: ["Revenue_m", "revenue_m"], placeholder: "e.g. 125" },
      { key: "ebitda_m", label: "EBITDA (m)", unit: "$m", payloadKey: "EBITDA_m", readKeys: ["EBITDA_m", "ebitda_m"], placeholder: "e.g. 24" },
      { key: "enterprise_value_m", label: "Enterprise Value (m)", unit: "$m", payloadKey: "EV", readKeys: ["EV", "ev", "Enterprise_Value_m", "enterprise_value_m"], placeholder: "e.g. 420" },
      { key: "revenue_multiple", label: "Revenue multiple", unit: "x", payloadKey: "Revenue_multiple", readKeys: ["Revenue_multiple", "revenue_multiple"], placeholder: "e.g. 3.8" },
      { key: "revenue_growth", label: "Revenue Growth", unit: "%", payloadKey: "Rev_Growth_PC", readKeys: ["Rev_Growth_PC", "revenue_growth", "rev_growth_pc"], placeholder: "e.g. 18" },
      { key: "ebitda_margin", label: "EBITDA margin", unit: "%", payloadKey: "EBITDA_margin", readKeys: ["EBITDA_margin", "ebitda_margin"], placeholder: "e.g. 22" },
      { key: "rule_of_40", label: "Rule of 40", unit: "#", payloadKey: "Rule_of_40", readKeys: ["Rule_of_40", "rule_of_40"], placeholder: "e.g. 40" },
    ],
  },
  {
    title: "Subscription Metrics",
    color: "#0f766e",
    metrics: [
      { key: "subscription_revenue_pc", label: "Subscription revenue %", unit: "%", payloadKey: "Subscription_revenue_pc", readKeys: ["Subscription_revenue_pc", "ARR_pc", "recurring_revenue", "arr_pc"], placeholder: "e.g. 85" },
      { key: "subscription_revenue_m", label: "Subscription revenue (m)", unit: "$m", payloadKey: "Subscription_revenue_m", readKeys: ["Subscription_revenue_m"], placeholder: "e.g. 90" },
      { key: "arr_m", label: "ARR (m)", unit: "$m", payloadKey: "ARR_value_m", readKeys: ["ARR_m", "arr_m"], placeholder: "e.g. 90" },
      { key: "churn", label: "Churn", unit: "%", payloadKey: "Churn_pc", readKeys: ["Churn_pc", "churn", "churn_pc"], placeholder: "e.g. 4" },
      { key: "grr", label: "GRR", unit: "%", payloadKey: "GRR_pc", readKeys: ["GRR_pc", "grr", "grr_pc"], placeholder: "e.g. 92" },
      { key: "upsell", label: "Upsell", unit: "%", payloadKey: "Upsell_pc", readKeys: ["Upsell_pc", "upsell"], placeholder: "e.g. 8" },
      { key: "cross_sell", label: "Cross-sell", unit: "%", payloadKey: "Cross_sell_pc", readKeys: ["Cross_sell_pc", "cross_sell"], placeholder: "e.g. 5" },
      { key: "price_increase", label: "Price increase", unit: "%", payloadKey: "Price_increase_pc", readKeys: ["Price_increase_pc", "price_increase"], placeholder: "e.g. 3" },
      { key: "revenue_expansion", label: "Revenue expansion", unit: "%", payloadKey: "Rev_expansion_pc", readKeys: ["Rev_expansion_pc", "revenue_expansion"], placeholder: "e.g. 15" },
      { key: "nrr", label: "NRR", unit: "%", payloadKey: "NRR", readKeys: ["NRR", "nrr"], placeholder: "e.g. 111" },
      { key: "new_clients_revenue_growth", label: "New clients revenue growth", unit: "%", payloadKey: "New_client_growth_pc", readKeys: ["New_client_growth_pc", "new_clients_revenue_growth", "new_client_growth_pc"], placeholder: "e.g. 12" },
    ],
  },
  {
    title: "Other Metrics",
    color: "#7c3aed",
    metrics: [
      { key: "ebit_m", label: "EBIT (m)", unit: "$m", payloadKey: "EBIT_m", readKeys: ["EBIT_m", "ebit_m"], placeholder: "e.g. 19" },
      { key: "number_of_clients", label: "Number of clients", unit: "#", payloadKey: "No_of_Clients", readKeys: ["No_of_Clients", "number_of_clients", "no_of_clients"], placeholder: "e.g. 140" },
      { key: "revenue_per_client", label: "Revenue per client", unit: "$", payloadKey: "Rev_per_client", readKeys: ["Rev_per_client", "revenue_per_client"], placeholder: "e.g. 540000" },
      { key: "number_of_employees", label: "Number of employees", unit: "#", payloadKey: "No_Employees", readKeys: ["No_Employees", "number_of_employees", "no_employees"], placeholder: "e.g. 680" },
      { key: "revenue_per_employee", label: "Revenue per employee", unit: "$", payloadKey: "Revenue_per_employee", readKeys: ["Revenue_per_employee", "revenue_per_employee"], placeholder: "e.g. 245000" },
    ],
  },
];

const BY_KEY: Record<string, CardMetric> = {};
for (const g of FINANCIAL_METRIC_CARD_GROUPS) for (const m of g.metrics) BY_KEY[m.key] = m;

/** Card label for a contributor form key, e.g. "Revenue (m)". */
export function cardMetricLabel(key: string): string {
  return BY_KEY[key]?.label ?? key;
}
