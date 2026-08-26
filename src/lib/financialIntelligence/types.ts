import type { FilterState } from "@/app/financials-tsx/types";

export type FiMetricSourceType = "Public" | "Estimate" | "Proprietary";

export type FiMetricFormat = "percent" | "multiple" | "currency" | "count" | "currency_k";

export type FiMetricDirectionHint = "cheaper" | "lower_better";

export type FiPeerAggregateMode = "median" | "mean";

export interface FiCompanyRow {
  company_id: number;
  company_name: string;
  company_logo: string | null;
  sectors_id: string;
  /** Resolved from API sector objects when available — used for suggested filters. */
  primary_sector_name?: string;
  primary_sector_names?: string[];
  primary_sector_ids?: number[];
  secondary_sector_name?: string;
  location_country: string;
  location_region: string;
  financial_year: number;
  /** Calendar year from API (`financial_year_value`), when available. */
  financial_year_value: number;
  fy_ye_month: number;
  revenue_m_usd: number | null;
  rev_growth_pc: number | null;
  new_client_growth_pc: number | null;
  ebitda_margin: number | null;
  ebitda_m_usd: number | null;
  ebit_m_usd: number | null;
  rule_of_40: number | null;
  subscription_revenue_pc: number | null;
  subscription_revenue_m: number | null;
  nrr: number | null;
  churn_pc: number | null;
  grr_pc: number | null;
  upsell_pc: number | null;
  cross_sell_pc: number | null;
  price_increase_pc: number | null;
  rev_expansion_pc: number | null;
  ev_usd: number | null;
  no_of_clients: number | null;
  revenue_per_client: number | null;
  no_employees: number | null;
  revenue_per_employee: number | null;
  revenue_multiple: number | null;
  ev_revenue_x: number | null;
  ev_ebitda_x: number | null;
  revenue_source_type?: string | null;
  rev_growth_source_type?: string | null;
  new_client_growth_source_type?: string | null;
  ebitda_source_type?: string | null;
  ebitda_margin_source_type?: string | null;
  ebit_source_type?: string | null;
  ev_source_type?: string | null;
  no_of_clients_source_type?: string | null;
  revenue_per_client_source_type?: string | null;
  no_employees_source_type?: string | null;
  revenue_per_employee_source_type?: string | null;
  rule_of_40_source_type?: string | null;
  subscription_revenue_pc_source_type?: string | null;
  subscription_revenue_m_source_type?: string | null;
  nrr_source_type?: string | null;
  churn_source_type?: string | null;
  grr_source_type?: string | null;
  upsell_source_type?: string | null;
  cross_sell_source_type?: string | null;
  price_increase_source_type?: string | null;
  rev_expansion_source_type?: string | null;
  revenue_multiple_source_type?: string | null;
  url?: string | null;
  is_manually_added?: boolean;
  /** Present when backend converted this field to preferred currency. */
  revenue_currency_code?: string | null;
  subscription_revenue_currency_code?: string | null;
  ebitda_currency_code?: string | null;
  ebit_currency_code?: string | null;
  ev_currency_code?: string | null;
  revenue_per_employee_currency_code?: string | null;
  revenue_converted?: boolean;
  subscription_revenue_converted?: boolean;
  ebitda_converted?: boolean;
  ebit_converted?: boolean;
  ev_converted?: boolean;
  revenue_per_employee_converted?: boolean;
  revenue_native_currency_id?: number | null;
  subscription_revenue_native_currency_id?: number | null;
  ebitda_native_currency_id?: number | null;
  ebit_native_currency_id?: number | null;
  ev_native_currency_id?: number | null;
  revenue_per_employee_native_currency_id?: number | null;
}

export interface FiPeersResponse {
  peers: FiCompanyRow[];
  total_peers: number;
  is_default_mode: boolean;
  target_logo?: string | null;
  preferred_currency_id?: number;
  preferred_currency_code?: string;
}

export interface FiPeersRequest {
  target_company_id: number;
  sectors_id: number[];
  regions: string[];
  location_ids: number[];
  revenue_min_usd_m: string;
  revenue_max_usd_m: string;
  ebitda_margin_min: string;
  ebitda_margin_max: string;
  ev_min_usd_m: string;
  ev_max_usd_m: string;
  company_ids_include: number[];
  company_ids_exclude: number[];
  preferred_currency_id?: number;
  excluded_source_labels?: string[];
}

export interface FiBenchmarkState {
  targetCompanyId: number | null;
  filters: FilterState[];
  companyIdsInclude: number[];
  companyIdsExclude: number[];
}

export interface SavedBenchmark {
  target_company_id: number;
  sectors_id: number[];
  regions: string[];
  location_ids: number[];
  revenue_min_usd_m: number | null;
  revenue_max_usd_m: number | null;
  ebitda_margin_min: number | null;
  ebitda_margin_max: number | null;
  ev_min_usd_m: number | null;
  ev_max_usd_m: number | null;
  company_ids_include: number[];
  company_ids_exclude: number[];
  saved_at: string;
  label?: string;
}

export type FiMetricKey =
  | "revenue_m_usd"
  | "ebitda_m_usd"
  | "ebit_m_usd"
  | "ev_usd"
  | "no_of_clients"
  | "revenue_per_client"
  | "no_employees"
  | "revenue_per_employee"
  | "rev_growth_pc"
  | "new_client_growth_pc"
  | "rule_of_40"
  | "subscription_revenue_pc"
  | "subscription_revenue_m"
  | "nrr"
  | "churn_pc"
  | "grr_pc"
  | "upsell_pc"
  | "cross_sell_pc"
  | "price_increase_pc"
  | "rev_expansion_pc"
  | "ebitda_margin"
  | "revenue_multiple"
  | "ev_revenue_x"
  | "ev_ebitda_x";

export interface FiMetricDef {
  key: FiMetricKey;
  label: string;
  higherIsBetter: boolean;
  directionHint?: FiMetricDirectionHint;
  format: FiMetricFormat;
}

export interface FiBenchmarkMetricRow {
  key: FiMetricKey | string;
  label: string;
  targetValue: number | null;
  peerMedian: number | null;
  peerValues: number[];
  min: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
  percentile: number | null;
  rank: number | null;
  rankTotal: number | null;
  deltaVsMedian: number | null;
  higherIsBetter: boolean;
  directionHint?: FiMetricDirectionHint;
  format: FiMetricFormat;
  targetSourceType?: string | null;
  displayCurrencyCode?: string;
}

export interface FiHeadlineMetric {
  key: string;
  label: string;
  targetValue: number | null;
  targetSourceType?: string | null;
  peerMedian: number | null;
  peerValues: number[];
  percentile: number | null;
  deltaVsMedian: number | null;
  higherIsBetter: boolean;
  format: "percent" | "currency";
  displayCurrencyCode?: string;
}

export interface FiLocationRow {
  id: number;
  Country?: string;
  Continental_Region?: string;
}

export interface FiSectorLookup {
  id: number;
  sector_name: string;
}

export interface FiSecondarySectorLookup extends FiSectorLookup {
  related_primary_id?: number | null;
  related_primary_name?: string | null;
}

export type FiFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
