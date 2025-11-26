export type BuyerInvestorType =
  | "private_equity"
  | "venture_capital"
  | "da_strategic"
  | "other_strategic";

export interface CorporateEventsFilters {
  primary_sectors_ids: number[];
  Secondary_sectors_ids: number[];
  deal_types: string[];
  Countries: string[];
  Provinces: string[];
  Cities: string[];
  // Optional geographic grouping filters (match Companies page UI)
  continentalRegions?: string[];
  subRegions?: string[];
  // Buyer / Investor type filter: values sent as strings in query
  Buyer_Investor_Types?: BuyerInvestorType[];
  // Funding stage filter: array of funding stage labels from funding_stage_options API
  Funding_stage?: string[];
  Date_start: string | null;
  Date_end: string | null;
  search_query: string;
  Page: number;
  Per_page: number;
  Deal_Status: string[];
}

export interface CorporateEventsStats {
  acquisitions: number;
  investments: number;
  ipos: number;
}

export interface Currency {
  Currency: string;
}

export interface InvestmentData {
  investment_amount_m: string;
  currency: Currency;
  Funding_stage?: string;
  funding_stage?: string;
}

export interface EnterpriseValueData {
  enterprise_value_m: string;
  currency: Currency;
}

export interface Sector {
  sector_name: string;
}

// Rich sector variants for new API shapes
export interface PrimarySector extends Sector {
  Sector_importance?: string;
}

export interface SubSector extends Sector {
  Sector_importance?: string;
  related_primary_sector?: Sector; // legacy
  related_primary_sectors?: Sector[]; // new
}

export interface Company {
  id: number;
  name: string;
  country: string;
  locations_id?: number;
  sectors_id?: number[];
  // New API fields: arrays of strings or sector objects
  primary_sectors?: Array<string | Sector>;
  secondary_sectors?: Array<string | Sector>;
  _sectors_primary: Sector[];
  _sectors_secondary: Sector[];
}

export interface TargetCounterparty {
  id: number;
  new_company_counterparty: number;
  new_company: Company;
}

export interface OtherCounterparty {
  id: number;
  new_company_counterparty: number;
  _new_company: {
    id: number;
    name: string;
    _is_that_investor: boolean;
    _is_that_data_analytic_company: boolean;
    _url?: string;
  };
  _counterparty_type: {
    counterparty_status: string;
  };
}

export interface Advisor {
  _new_company: {
    id: number;
    name: string;
  };
}

// Target entity reference for the new targets array
export interface TargetEntity {
  id: number;
  name: string;
  path: string;
  route: string;
  entity_type: string;
}

export interface CorporateEvent {
  id: number;
  description: string;
  announcement_date: string;
  deal_type: string;
  target_counterparty: TargetCounterparty;
  investment_data: InvestmentData;
  ev_data: EnterpriseValueData;
  other_counterparties: OtherCounterparty[];
  advisors: Advisor[];
  // New API fields for targets
  targets?: TargetEntity[];
  target_label?: string;
  buyer_investor_label?: string | null;
}

export interface CorporateEventsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  pageTotal: number;
  itemTotal: number;
  items: CorporateEvent[];
  acquisitions: number;
  investments: number;
  ipos: number;
  ev_buckets_present: boolean;
  ev_buckets: unknown[];
  total_ev_m: number;
}

// Corporate Event Detail Page Interfaces
export interface CorporateEventDetail {
  id: number;
  created_at: number;
  description: string;
  long_description: string;
  deal_status: string;
  announcement_date: string;
  closed_date: string;
  deal_type: string;
  investment_data: {
    investment_amount_source: string;
    investment_amount_m: string;
    currency_id: number;
    Funding_stage: string;
  };
  deal_terms_data: {
    deal_terms: string;
    deal_terms_source: string;
  };
  ev_data: {
    ev_source: string;
    EV_source_type: string;
    enterprise_value_m: string;
    currency_id: number;
    ev_band: string;
    _currency: {
      id: number;
      created_at: number;
      Currency: string;
    };
  };
}

export interface CorporateEventCounterparty {
  id: number;
  new_company_counterparty: number;
  counterparty_type: number;
  counterparty_announcement_url: string;
  counterparty_individuals: Array<{
    id: number;
    individuals_id: number;
    advisor_individuals: string;
  }>;
  _counterpartys_type?: {
    id: number;
    created_at: number;
    counterparty_status: string;
    notion_id: string;
  };
  // New API variant name
  _counterparty_type?: {
    id?: number;
    created_at?: number;
    counterparty_status?: string;
    notion_id?: string;
  };
  _new_company: {
    id: number;
    name: string;
    primary_business_focus_id: number[];
    sectors_id: number[];
    linkedin_data: {
      linkedin_logo: string;
    };
    _is_that_investor: boolean;
    _is_that_data_analytic_company: boolean;
    _url?: string;
    _linkedin_data_of_new_company?: {
      linkedin_logo: string;
    };
  };
}

export interface CorporateEventAdvisor {
  id: number;
  corporate_events_id: number;
  counterparty_advised: number;
  new_company_advised: number;
  advisor_role_id: number;
  individuals_id: number[];
  announcement_url: string;
  _new_company: {
    id: number;
    name: string;
  };
  _counterparties: {
    id: number;
    new_company_counterparty: number;
    counterparty_name: string;
    _new_company: {
      id: number;
      name: string;
      _linkedin_data_of_new_company?: { linkedin_logo: string };
    };
  };
  _advisor_role: {
    id: number;
    counterparty_status: string;
  };
}

export interface CorporateEventDetailResponse {
  Event: CorporateEventDetail[];
  Event_counterparties: CorporateEventCounterparty[];
  Event_advisors: CorporateEventAdvisor[];
  Primary_sectors: PrimarySector[];
  "Sub-sectors": SubSector[];
}

export interface FilterOptions {
  primary_sectors: Array<{ id: number; name: string }>;
  secondary_sectors: Array<{ id: number; name: string }>;
  deal_types: string[];
  countries: string[];
  provinces: string[];
  cities: string[];
  deal_statuses: string[];
}
