// Main Advisor Response Interface
export interface AdvisorResponse {
  Advisor: Advisor;
  Advised_DA_sectors: AdvisedSector[];
  Portfolio_companies_count: number;
  Advisors_individuals: AdvisorIndividual[];
}

// Advisor Main Entity
export interface Advisor {
  id: number;
  name: string;
  locations_id: number;
  url: string;
  primary_business_focus_id: BusinessFocus[];
  sectors_id: number[];
  description: string;
  ownership_type_id: number;
  year_founded: number;
  investors_new_company: unknown[];
  linkedin_data: LinkedInData;
  revenues: unknown[];
  _locations: Location;
  _linkedin_data_of_new_company: LinkedInDataNew;
}

// Business Focus
export interface BusinessFocus {
  id: number;
  created_at: number;
  business_focus: string;
}

// LinkedIn Data
export interface LinkedInData {
  LinkedIn_URL: string;
  LinkedIn_Employee: number;
  LinkedIn_Emp__Date: string;
  linkedin_logo: string;
}

export interface LinkedInDataNew {
  linkedin_employee: number;
  linkedin_emp_date: string;
  linkedin_logo: string; // Base64 encoded
}

// Location
export interface Location {
  id: number;
  City: string;
  State__Province__County: string;
  Country: string;
}

// Advised Sectors
export interface AdvisedSector {
  id: number;
  sector_name: string;
}

// Advisor Individuals
export interface AdvisorIndividual {
  id: number;
  individuals_id: number;
  advisor_individuals: string;
}

// Corporate Events Response Interface
export interface CorporateEventsResponse {
  New_Events_Wits_Advisors: CorporateEvent[];
}

// Corporate Event
export interface CorporateEvent {
  id: number;
  description: string;
  announcement_date: string;
  deal_type: string;
  ev_data: EnterpriseValueData;
  _other_advisors_of_corporate_event: OtherAdvisor[];
  _target_counterparty_of_corporate_events?: TargetCounterparty;
  _other_counterparties_of_corporate_events: OtherCounterparty[];
  _counterparty_advised_of_corporate_events: CounterpartyAdvised[];
  __related_to_corporate_event_advisors_individuals: RelatedIndividual[];
}

// Enterprise Value Data
export interface EnterpriseValueData {
  ev_source: string;
  enterprise_value_m: string;
  currency_id: number;
  _currency?: Currency;
}

export interface Currency {
  id: number;
  created_at: number;
  Currency: string;
}

// Other Advisor
export interface OtherAdvisor {
  id: number;
  new_company_advised: number;
  individuals_id: number[];
  _new_company: {
    id: number;
    name: string;
  };
}

// Target Counterparty
export interface TargetCounterparty {
  new_company_counterparty: number;
  id: number;
  name: string;
}

// Other Counterparty
export interface OtherCounterparty {
  new_company_counterparty: number;
  id: number;
  name: string;
  _is_that_investor: boolean;
  _is_that_data_analytic_company: boolean;
}

// Counterparty Advised
export interface CounterpartyAdvised {
  counterparty_type: number;
  _counterpartys_type: {
    counterparty_status: string;
  };
}

// Related Individual
export interface RelatedIndividual {
  id: number;
  individuals_id: number;
  _individuals: {
    id: number;
    advisor_individuals: string;
  };
}
