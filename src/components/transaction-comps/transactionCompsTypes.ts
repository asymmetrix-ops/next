/** Period a multiple is based on, as returned by the API. */
export type MultipleBasis = "LTM" | "LFY" | "LFY-1" | "Fwd";

/** One item of GET /transaction_comps (Xano api:lqZy8LiD). */
export interface TransactionCompRow {
  company_id: number;
  company_name: string;
  logo?: string | null;
  hq_country?: string | null;
  hq_city?: string | null;
  ev_m_usd?: number | null;
  ev_revenue?: number | null;
  /** Null when there is no EV / Revenue. */
  ev_revenue_basis?: MultipleBasis | null;
  ev_ebitda?: number | null;
  /** Null when there is no EV / EBITDA. */
  ev_ebitda_basis?: MultipleBasis | null;
  revenue_m_usd?: number | null;
  ebitda_m_usd?: number | null;
  revenue_growth_pc?: number | null;
  ebitda_margin_pc?: number | null;
  rule_of_40?: number | null;
  financial_year?: number | null;
  /** ISO date (YYYY-MM-DD). */
  deal_date?: string | null;
  deal_type?: string | null;
  /** Name the target traded under before the deal, when it changed. */
  former_name?: string | null;
  corporate_event?: { id: number; name: string } | null;
  acquirers?: { id: number; name: string; logo?: string | null }[] | null;
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
  evSourceTypes: string[];
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
  evSourceTypes: [],
  acquirerIds: [],
  ceIds: [],
  ids: [],
};

export type TransactionCompsOptionType = "acquirer" | "corporate_event" | "secondary_sector";

export interface TransactionCompsOption {
  id: number;
  label: string;
}

/** One item of GET /corporate_event_transaction_comps?ce_id= (Xano api:lqZy8LiD). */
export interface CorporateEventTransactionComp {
  id: number;
  company_id: number;
  company_name: string;
  logo?: string | null;
  /** ISO date (YYYY-MM-DD). */
  deal_date?: string | null;
  financial_year?: number | null;
  ev_m?: number | null;
  ev_currency?: string | null;
  ev_source_type?: string | null;
  ev_m_usd?: number | null;
  revenue_m_usd?: number | null;
  ebitda_m_usd?: number | null;
  ev_revenue?: number | null;
  ev_revenue_basis?: MultipleBasis | null;
  ev_ebitda?: number | null;
  ev_ebitda_basis?: MultipleBasis | null;
  revenue_growth_pc?: number | null;
  ebitda_margin_pc?: number | null;
  rule_of_40?: number | null;
  acquirers?: { id: number; name: string; logo?: string | null }[] | null;
}
