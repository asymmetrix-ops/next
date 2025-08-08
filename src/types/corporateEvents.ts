export interface CorporateEventsFilters {
  primary_sectors_ids: number[];
  Secondary_sectors_ids: number[];
  deal_types: string[];
  Countries: string[];
  Provinces: string[];
  Cities: string[];
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
}

export interface EnterpriseValueData {
  enterprise_value_m: string;
  currency: Currency;
}

export interface Sector {
  sector_name: string;
}

export interface Company {
  id: number;
  name: string;
  country: string;
  locations_id?: number;
  sectors_id?: number[];
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
  _counterpartys_type: {
    id: number;
    created_at: number;
    counterparty_status: string;
    notion_id: string;
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
  Primary_sectors: Sector[];
  "Sub-sectors": Sector[];
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
