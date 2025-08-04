// API 1: Get Individual Response
export interface IndividualResponse {
  Individual: IndividualProfile;
  Roles: IndividualRole[];
}

// Individual Profile
export interface IndividualProfile {
  id: number;
  advisor_individuals: string;
  bio: string;
  linkedin_URL: string;
  locations_id: number;
  phone: string;
  email: string;
  _locations: Location;
}

// Individual Role
export interface IndividualRole {
  id: number;
  employee_new_company_id: number;
  current_employer_url: string;
  Status: "Current" | "Past";
  job_titles_id: JobTitle[];
  new_company: RoleCompany;
}

// Role Company
export interface RoleCompany {
  id: number;
  name: string;
  linkedin_data: {
    linkedin_logo: string;
  };
  _is_that_investor: boolean;
  _linkedin_data_of_new_company: {
    linkedin_logo: string; // Base64 encoded
  };
}

// Job Title
export interface JobTitle {
  id: number;
  job_title: string;
}

// Location
export interface Location {
  id: number;
  City: string;
  State__Province__County: string;
  Country: string;
}

// API 2: Get Individual Events Response
export interface IndividualEventsResponse {
  events: CorporateEvent[];
  all_related_individuals: RelatedIndividual[];
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
  _relater_to_corporate_event_cpawa_advisors_individuals: unknown[];
  _counterparty_advised_of_corporate_events: CounterpartyAdvised[];
  _related_to_corporate_event_individuals: EventIndividual[];
  _related_advisor_to_corporate_events: RelatedAdvisor[];
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
    _linkedin_data_of_new_company: {
      linkedin_logo: string;
    };
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

// Event Individual
export interface EventIndividual {
  id: number;
  advisor_individuals: string;
}

// Related Advisor
export interface RelatedAdvisor {
  new_company_advised: number;
  _new_company: {
    id: number;
    name: string;
    primary_business_focus_id: number[];
    _is_that_investor: boolean;
    _is_that_data_analytic_company: boolean;
  };
}

// Related Individual
export interface RelatedIndividual {
  id: number;
  individuals_id: number;
  employee_new_company_id: number;
  Status: "Current" | "Past";
  job_titles_id: Array<{ job_title: string }>;
  _individuals: {
    id: number;
    advisor_individuals: string;
  };
  _new_company: {
    id: number;
    name: string;
    linkedin_data: {
      linkedin_logo: string;
    };
    _is_that_investor: boolean;
    _linkedin_data_of_new_company: {
      linkedin_logo: string;
    };
  };
}

// API 3: Get Individual Name Response (simple string)
export type IndividualNameResponse = string; 