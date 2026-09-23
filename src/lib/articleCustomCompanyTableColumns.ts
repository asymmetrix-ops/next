/** Column config for article "Generate table" (mirrors company profile sections). */

export interface ArticleTableCompanyRow {
  id: number;
  name: string;
  url: string;
  loc: string;
  year_founded: string;
  primary_sectors: string;
  secondary_sectors: string;
  ownership: string;
  investors: string;
  li_emp: string;
  li_growth_pc: string;
  revenue_m: string;
  arr_m: string;
  ebitda_m: string;
  ebit_m: string;
  ev: string;
  arr_pc: string;
  churn_pc: string;
  grr_pc: string;
  nrr: string;
  upsell_pc: string;
  cross_sell_pc: string;
  price_increase_pc: string;
  rev_expansion_pc: string;
  new_client_growth_pc: string;
  rev_growth_pc: string;
  ebitda_margin: string;
  rule_of_40: string;
  revenue_multiple: string;
  no_of_clients: string;
  rev_per_client: string;
  no_employees: string;
  rev_per_employee: string;
}

export interface ArticleTableColumnDefinition {
  key: string;
  label: string;
}

export const ARTICLE_TABLE_COL_GROUPS: Array<{
  group: string;
  cols: ArticleTableColumnDefinition[];
}> = [
  {
    group: "Overview",
    cols: [
      { key: "primary_sectors", label: "Primary Sector(s)" },
      { key: "secondary_sectors", label: "Secondary Sector(s)" },
      { key: "year_founded", label: "Year Founded" },
      { key: "url", label: "Website" },
      { key: "ownership", label: "Ownership" },
      { key: "loc", label: "HQ" },
      { key: "li_emp", label: "LinkedIn Employee Count" },
      { key: "li_growth_pc", label: "LinkedIn Growth (%)" },
      { key: "investors", label: "Investors" },
    ],
  },
  {
    group: "Financial Metrics",
    cols: [
      { key: "revenue_m", label: "Revenue (m)" },
      { key: "ebitda_m", label: "EBITDA (m)" },
      { key: "ev", label: "Enterprise Value (m)" },
      { key: "revenue_multiple", label: "Revenue multiple" },
      { key: "rev_growth_pc", label: "Revenue Growth" },
      { key: "ebitda_margin", label: "EBITDA margin" },
      { key: "rule_of_40", label: "Rule of 40" },
    ],
  },
  {
    group: "Subscription Metrics",
    cols: [
      { key: "arr_pc", label: "Recurring Revenue" },
      { key: "arr_m", label: "ARR (m)" },
      { key: "churn_pc", label: "Churn" },
      { key: "grr_pc", label: "GRR" },
      { key: "upsell_pc", label: "Upsell" },
      { key: "cross_sell_pc", label: "Cross-sell" },
      { key: "price_increase_pc", label: "Price increase" },
      { key: "rev_expansion_pc", label: "Revenue expansion" },
      { key: "nrr", label: "NRR" },
      { key: "new_client_growth_pc", label: "New clients revenue growth" },
    ],
  },
  {
    group: "Other Metrics",
    cols: [
      { key: "ebit_m", label: "EBIT (m)" },
      { key: "no_of_clients", label: "Number of clients" },
      { key: "rev_per_client", label: "Revenue per client" },
      { key: "no_employees", label: "Number of employees" },
      { key: "rev_per_employee", label: "Revenue per employee" },
    ],
  },
];

export const ARTICLE_TABLE_ALL_COLUMNS: ArticleTableColumnDefinition[] =
  ARTICLE_TABLE_COL_GROUPS.flatMap((g) => g.cols);

export const ARTICLE_TABLE_WRAP_COLS = new Set([
  "primary_sectors",
  "secondary_sectors",
  "loc",
  "investors",
  "url",
]);
