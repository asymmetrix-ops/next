/** One item of GET /transaction_comps (Xano api:lqZy8LiD). */
export interface TransactionCompRow {
  company_id: number;
  company_name: string;
  logo?: string | null;
  hq_country?: string | null;
  hq_city?: string | null;
  ev_m_usd?: number | null;
  ev_revenue?: number | null;
  ev_ebitda?: number | null;
  revenue_m_usd?: number | null;
  ebitda_m_usd?: number | null;
  revenue_growth_pc?: number | null;
  ebitda_margin_pc?: number | null;
  rule_of_40?: number | null;
  financial_year?: number | null;
  /** ISO date (YYYY-MM-DD). */
  deal_date?: string | null;
  deal_type?: string | null;
  deal_status?: string | null;
  /** Name the target traded under before the deal, when it changed. */
  former_name?: string | null;
  corporate_event?: { id: number; name: string } | null;
  acquirers?: { id: number; name: string }[] | null;
  primary_sectors?: { id: number; name: string }[] | null;
  ownership?: string | null;
}

export interface TransactionCompsResponse {
  total: number;
  page: number;
  per_page: number;
  items: TransactionCompRow[];
}

export type RangeValue = { min?: number; max?: number };

export interface TransactionCompsQuery {
  page: number;
  perPage: number;
  searchText: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  /** Range filters keyed by API param stem (ev, ev_revenue, rev_growth, ...). */
  ranges: Record<string, RangeValue>;
  dealDateFrom?: string;
  dealDateTo?: string;
  sectorIds: number[];
  secondarySectorIds: number[];
  countries: string[];
  ownershipIds: number[];
  dealTypes: string[];
  acquirerIds: number[];
  ceIds: number[];
  ids: number[];
}

export const DEFAULT_TRANSACTION_COMPS_QUERY: TransactionCompsQuery = {
  page: 1,
  perPage: 25,
  searchText: "",
  sortBy: "deal_date",
  sortDir: "desc",
  ranges: {},
  sectorIds: [],
  secondarySectorIds: [],
  countries: [],
  ownershipIds: [],
  dealTypes: [],
  acquirerIds: [],
  ceIds: [],
  ids: [],
};

export type TransactionCompsOptionType = "acquirer" | "corporate_event";

export interface TransactionCompsOption {
  id: number;
  label: string;
}
