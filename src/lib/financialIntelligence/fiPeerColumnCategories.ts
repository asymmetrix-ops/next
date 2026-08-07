import type { CompanyColumnCategory } from "@/components/companies/companiesColumnCategories";

const FI_PEER_COLUMN_CATEGORIES_RAW: CompanyColumnCategory[] = [
  {
    id: "financial_metrics",
    name: "Financial Metrics",
    description: "Core financial and valuation metrics for peer comparison.",
    columns: [
      { id: "revenue", columnKey: "revenue", label: "Revenue", type: "currency", defaultVisible: true },
      { id: "ebitda", columnKey: "ebitda", label: "EBITDA", type: "currency", defaultVisible: true },
      { id: "ev", columnKey: "ev", label: "EV", type: "currency", defaultVisible: true },
      { id: "rev_multiple", columnKey: "rev_multiple", label: "Revenue multiple", type: "number", defaultVisible: true },
      { id: "rev_growth", columnKey: "rev_growth", label: "Revenue growth", type: "percent", defaultVisible: true },
      { id: "ebitda_margin", columnKey: "ebitda_margin", label: "EBITDA margin", type: "percent", defaultVisible: false },
      { id: "rule_of_40", columnKey: "rule_of_40", label: "Rule of 40", type: "number", defaultVisible: false },
      { id: "ev_revenue", columnKey: "ev_revenue", label: "EV / Revenue", type: "number", defaultVisible: true },
      { id: "ev_ebitda", columnKey: "ev_ebitda", label: "EV / EBITDA", type: "number", defaultVisible: true },
    ],
  },
  {
    id: "subscription_metrics",
    name: "Subscription Metrics",
    description: "Subscription and expansion metrics.",
    columns: [
      { id: "subscription_revenue_pc", columnKey: "subscription_revenue_pc", label: "Subscription revenue %", type: "percent", defaultVisible: false },
      { id: "subscription_revenue_m", columnKey: "subscription_revenue_m", label: "Subscription revenue (m)", type: "currency", defaultVisible: false },
      { id: "churn", columnKey: "churn", label: "Churn", type: "percent", defaultVisible: false },
      { id: "grr", columnKey: "grr", label: "GRR", type: "percent", defaultVisible: false },
      { id: "nrr", columnKey: "nrr", label: "NRR", type: "percent", defaultVisible: false },
      { id: "new_clients_rev", columnKey: "new_clients_rev", label: "New Clients Revenue Growth", type: "percent", defaultVisible: false },
      { id: "upsell", columnKey: "upsell", label: "Upsell", type: "percent", defaultVisible: false },
      { id: "cross_sell", columnKey: "cross_sell", label: "Cross-sell", type: "percent", defaultVisible: false },
      { id: "price_increase", columnKey: "price_increase", label: "Price Increase", type: "percent", defaultVisible: false },
      { id: "revenue_expansion", columnKey: "revenue_expansion", label: "Revenue Expansion", type: "percent", defaultVisible: false },
    ],
  },
  {
    id: "other_metrics",
    name: "Other Metrics",
    description: "Additional operating metrics.",
    columns: [
      { id: "ebit", columnKey: "ebit", label: "EBIT (m)", type: "currency", defaultVisible: true },
      { id: "num_clients", columnKey: "num_clients", label: "Number of Clients", type: "number", defaultVisible: false },
      { id: "rev_per_client", columnKey: "rev_per_client", label: "Revenue per Client", type: "currency", defaultVisible: false },
      { id: "num_employees", columnKey: "num_employees", label: "Number of Employees", type: "number", defaultVisible: false },
      { id: "rev_per_employee", columnKey: "rev_per_employee", label: "Revenue per Employee", type: "currency", defaultVisible: false },
    ],
  },
  {
    id: "company_info",
    name: "Company Info",
    description: "Reference fields for each peer row.",
    columns: [
      { id: "company", columnKey: "company", label: "Company", type: "text", locked: true, defaultVisible: true },
      { id: "financial_year", columnKey: "financial_year", label: "Financial Year", type: "date", defaultVisible: false },
      { id: "sector", columnKey: "sector", label: "Sector", type: "text", defaultVisible: true },
      { id: "hq", columnKey: "hq", label: "HQ", type: "text", defaultVisible: true },
    ],
  },
];

export const FI_PEER_COLUMN_CATEGORIES: CompanyColumnCategory[] = FI_PEER_COLUMN_CATEGORIES_RAW;

export const FI_PEER_COLUMN_DEFAULT_VISIBILITY: Record<string, boolean> = (() => {
  const out: Record<string, boolean> = {};
  for (const category of FI_PEER_COLUMN_CATEGORIES) {
    for (const column of category.columns) {
      out[column.id] = Boolean(column.defaultVisible);
    }
  }
  return out;
})();

export const FI_PEER_COLUMN_ORDER: string[] = [
  "company",
  ...FI_PEER_COLUMN_CATEGORIES.flatMap((category) =>
    category.columns.map((column) => column.id)
  ).filter((id) => id !== "company"),
];

export const DEFAULT_FI_PEER_COLUMN_IDS = FI_PEER_COLUMN_ORDER.filter(
  (id) => FI_PEER_COLUMN_DEFAULT_VISIBILITY[id]
);

export const FI_PEER_COLUMN_TOTAL = FI_PEER_COLUMN_ORDER.length;

export function columnIdsToVisibility(
  selectedIds: string[]
): Record<string, boolean> {
  const selected = new Set(selectedIds);
  const out: Record<string, boolean> = {};
  for (const category of FI_PEER_COLUMN_CATEGORIES) {
    for (const column of category.columns) {
      out[column.id] = column.locked ? true : selected.has(column.id);
    }
  }
  return out;
}

export function resolvePeerColumnIdsFromModal(
  visible: Record<string, boolean>,
  order?: string[]
): string[] {
  const ids = order?.length
    ? order.filter((id) => visible[id])
    : FI_PEER_COLUMN_ORDER.filter((id) => visible[id]);

  if (!ids.includes("company")) {
    return ids;
  }

  return ["company", ...ids.filter((id) => id !== "company")];
}
