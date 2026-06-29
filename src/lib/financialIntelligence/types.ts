import type { FilterState } from "@/app/financials-tsx/types";

export type FiMetricSourceType = "Public" | "Estimate" | "Proprietary";

export interface FiCompanyRow {
  company_id: number;
  company_name: string;
  company_logo: string | null;
  sectors_id: string;
  location_country: string;
  location_region: string;
  financial_year: number;
  fy_ye_month: number;
  revenue_m_usd: number | null;
  rev_growth_pc: number | null;
  ebitda_margin: number | null;
  ebitda_m_usd: number | null;
  ebit_m_usd: number | null;
  rule_of_40: number | null;
  ev_usd: number | null;
  revenue_multiple: number | null;
  ev_revenue_x: number | null;
  ev_ebitda_x: number | null;
  revenue_source_type?: FiMetricSourceType | null;
  rev_growth_source_type?: FiMetricSourceType | null;
  ebitda_source_type?: FiMetricSourceType | null;
  ev_source_type?: FiMetricSourceType | null;
  url?: string | null;
  is_manually_added?: boolean;
}

export interface FiPeersResponse {
  peers: FiCompanyRow[];
  total_peers: number;
  is_default_mode: boolean;
}

export interface FiPeersRequest {
  target_company_id: number;
  sectors_id: number[];
  location_ids: number[];
  revenue_min_usd_m: string;
  revenue_max_usd_m: string;
  ebitda_margin_min: string;
  ebitda_margin_max: string;
  ev_min_usd_m: string;
  ev_max_usd_m: string;
  company_ids_include: number[];
  company_ids_exclude: number[];
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
  | "rev_growth_pc"
  | "rule_of_40"
  | "ebitda_margin"
  | "ebit_margin"
  | "ev_revenue_x"
  | "ev_ebitda_x"
  | "revenue_multiple";

export interface FiMetricDef {
  key: FiMetricKey;
  label: string;
  higherIsBetter: boolean;
  format: "percent" | "multiple";
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
  format: "percent" | "multiple" | "currency";
  targetSourceType?: FiMetricSourceType | null;
}

export interface FiHeadlineMetric {
  key: string;
  label: string;
  targetValue: number | null;
  peerMedian: number | null;
  peerValues: number[];
  percentile: number | null;
  deltaVsMedian: number | null;
  higherIsBetter: boolean;
  format: "percent" | "currency";
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

export type FiFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
