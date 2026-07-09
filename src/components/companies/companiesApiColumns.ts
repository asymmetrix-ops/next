import { PROD_DEFAULT_COMPANY_COLUMN_KEYS } from "./companiesColumnCategories";

/** UI column keys always returned by Get_new_companies — identity columns not sent in `columns[]`. */
export const ALWAYS_INCLUDED_COLUMN_KEYS = new Set<string>([
  ...PROD_DEFAULT_COMPANY_COLUMN_KEYS,
]);

/**
 * Maps visible UI column keys → Get_new_companies `columns[]` request keys.
 * Item field aliases for reading responses live in companiesColumnFields.ts.
 */
export const COLUMN_KEY_TO_API_KEY: Record<string, string> = {
  description: "description",
  primary_sectors: "primary_sectors",
  secondary_sectors: "secondary_sectors",
  ownership: "ownership",
  linkedin_members: "linkedin_members",
  website: "website",
  follow: "follow",
  year_founded: "year_founded",
  hq: "hq",
  city: "city",
  state: "state",
  linkedin_url: "linkedin_url",
  linkedin_growth: "linkedin_growth",
  investors: "investors",
  years_since_last_investment: "years_since_last_investment",
  lifecycle_stage: "lifecycle_stage",
  product_type: "product_type",
  data_collection_method: "data_collection_method",
  revenue_model: "revenue_model",
  transaction_status: "transaction_status",
  created_at: "created_at",
  revenue_m: "revenue_m",
  ebitda_m: "ebitda_m",
  enterprise_value: "ev",
  revenue_multiple: "revenue_multiple",
  revenue_growth: "revenue_growth",
  ebitda_margin: "ebitda_margin",
  rule_of_40: "rule_of_40",
  arr_pc: "arr_pc",
  arr_m: "arr_m",
  churn_pc: "churn",
  grr_pc: "grr",
  nrr: "nrr",
  new_client_growth_pc: "new_client_growth",
  upsell_pc: "upsell",
  cross_sell_pc: "cross_sell",
  price_increase_pc: "price_increase",
  rev_expansion_pc: "rev_expansion",
  ebit_m: "ebit_m",
  no_of_clients: "no_clients",
  rev_per_client: "rev_per_client",
  no_employees: "no_employees",
  rev_per_employee: "rev_per_employee",
  financial_year: "financial_year",
  has_mcp: "has_mcp",
};

/** Frozen identity columns — API always returns these; omit from `columns[]`. */
const IDENTITY_COLUMN_KEYS = new Set(["logo", "name"]);

/**
 * All visible optional/default columns to request from Get_new_companies.
 * When `columns[]` is sent the API returns only listed fields, so defaults
 * like primary_sectors must be included whenever they are visible.
 */
export function getApiColumnsForSelectedKeys(selectedKeys: string[]): string[] {
  const apiKeys = new Set<string>();
  for (const key of selectedKeys) {
    if (IDENTITY_COLUMN_KEYS.has(key)) continue;
    const apiKey = COLUMN_KEY_TO_API_KEY[key];
    if (apiKey) apiKeys.add(apiKey);
  }
  return Array.from(apiKeys);
}

/** Stable signature for comparing which API fields are requested (order-independent). */
export function getApiColumnsSignature(selectedKeys: string[]): string {
  return getApiColumnsForSelectedKeys(selectedKeys).slice().sort().join("\0");
}
