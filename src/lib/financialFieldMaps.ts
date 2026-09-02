/** Monetary fields on `company_financial_metrics` rows → preferred-currency display key. */
export const FINANCIAL_METRICS_FIELDS: Record<string, string> = {
  Revenue_m: "Revenue_currency_display",
  Subscription_revenue_m: "Subscription_revenue_currency_display",
  ARR_m: "ARR_currency_display",
  EBITDA_m: "EBITDA_currency_display",
  EV: "EV_currency_display",
  EBIT_m: "EBIT_currency_display",
  Rev_per_client: "Revenue_currency_display",
  Revenue_per_employee: "Revenue_currency_display",
};

export const INCOME_STATEMENT_FIELDS: Record<string, string> = {
  revenue: "cost_of_goods_sold_currency",
  cost_of_goods_sold: "cost_of_goods_sold_currency",
  gross_profit: "cost_of_goods_sold_currency",
  ebit: "cost_of_goods_sold_currency",
  ebitda: "cost_of_goods_sold_currency",
  total_operating_expense: "cost_of_goods_sold_currency",
  interest_expense: "cost_of_goods_sold_currency",
  interest_income: "cost_of_goods_sold_currency",
  pre_tax_profit: "cost_of_goods_sold_currency",
  income_tax_expense: "cost_of_goods_sold_currency",
  net_income: "cost_of_goods_sold_currency",
};
