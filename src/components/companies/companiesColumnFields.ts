/**
 * Canonical mapping between Companies Search UI column keys and
 * Get_new_companies item / pagination fields.
 *
 * `columns[]` request keys come from COLUMN_KEY_TO_API_KEY in companiesApiColumns.ts.
 * Item read aliases below match the live API shape (see Get_new_companies sample).
 */

/** Fields returned on every item without `columns[]`. */
export const IDENTITY_ITEM_FIELDS = ["id", "name", "linkedin_logo"] as const;

/**
 * UI column key → item field aliases (first match wins).
 * Primary alias matches the Get_new_companies response key.
 */
export const COMPANY_COLUMN_FIELD_ALIASES: Record<string, readonly string[]> = {
  logo: ["linkedin_logo"],
  name: ["name"],
  website: ["website", "url", "Website"],
  description: ["description"],
  primary_sectors: ["primary_sectors", "primary_sector_names"],
  secondary_sectors: ["secondary_sectors", "secondary_sector_names"],
  ownership: ["ownership", "ownership_type", "_ownership_type.ownership"],
  linkedin_members: ["linkedin_members", "li_emp", "linkedin_employee"],
  year_founded: ["year_founded", "year_founded_label", "_years.Year"],
  hq: ["hq", "loc", "location", "country", "hq_country", "_locations", "_locations.Country"],
  city: ["city", "hq_city", "_locations.City"],
  state: ["state", "province", "hq_state", "_locations.State__Province__County"],
  linkedin_url: ["linkedin_url", "LinkedIn_URL", "linkedin_data.LinkedIn_URL"],
  linkedin_growth: [
    "linkedin_growth",
    "linkedin_growth_pc",
    "li_growth_pc",
    "linkedin_growth_1y_pct",
    "growth_percent",
  ],
  investors: ["investors", "investor_names", "investors_new_company", "_companies_investors"],
  years_since_last_investment: [
    "years_since_last_investment",
    "last_investment.display",
    "last_investment.days_since",
    "last_investment",
  ],
  lifecycle_stage: ["lifecycle_stage", "Lifecycle_stage.Lifecycle_stage"],
  product_type: ["product_type", "Product_Type"],
  data_collection_method: ["data_collection_method", "Data_Collection_Method"],
  revenue_model: ["revenue_model", "Revenue_Model_", "Revenue_Model"],
  transaction_status: ["transaction_status", "transactionStatus"],
  revenue_m: ["revenue_m", "Revenue_m", "revenues.revenues_m"],
  ebitda_m: ["ebitda_m", "EBITDA_m", "EBITDA.EBITDA_m"],
  enterprise_value: ["ev", "enterprise_value", "EV", "ev_data.ev_value"],
  revenue_multiple: ["revenue_multiple", "Revenue_multiple"],
  revenue_growth: ["revenue_growth", "rev_growth_pc", "Rev_Growth_PC"],
  ebitda_margin: ["ebitda_margin", "EBITDA_margin"],
  rule_of_40: ["rule_of_40", "Rule_of_40"],
  arr_pc: ["arr_pc", "ARR_pc"],
  arr_m: ["arr_m", "ARR_m"],
  churn_pc: ["churn", "churn_pc", "Churn_pc"],
  grr_pc: ["grr", "grr_pc", "GRR_pc"],
  nrr: ["nrr", "NRR"],
  new_client_growth_pc: [
    "new_client_growth",
    "new_client_growth_pc",
    "New_client_growth_pc",
  ],
  upsell_pc: ["upsell", "upsell_pc"],
  cross_sell_pc: ["cross_sell", "cross_sell_pc"],
  price_increase_pc: ["price_increase", "price_increase_pc"],
  rev_expansion_pc: ["rev_expansion", "rev_expansion_pc"],
  ebit_m: ["ebit_m", "EBIT_m"],
  no_of_clients: ["no_clients", "no_of_clients", "No_of_clients"],
  rev_per_client: ["rev_per_client", "Revenue_per_client"],
  no_employees: ["no_employees", "No_Employees"],
  rev_per_employee: ["rev_per_employee", "Revenue_per_employee"],
  financial_year: ["financial_year", "Financial_Year"],
};

/** Columns whose API values may arrive as JSON strings or arrays. */
export const LIST_JSON_COLUMN_KEYS = new Set<string>([
  "primary_sectors",
  "secondary_sectors",
  "investors",
  "product_type",
  "data_collection_method",
  "revenue_model",
]);

export function getFieldAliasesForColumn(columnKey: string): readonly string[] {
  return COMPANY_COLUMN_FIELD_ALIASES[columnKey] ?? [columnKey];
}
