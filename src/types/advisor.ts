// Main Advisor Response Interface
export interface AdvisorResponse {
  Advisor: Advisor;
  Advised_DA_sectors: AdvisedSector[];
  Portfolio_companies_count: number;
  Advisors_individuals: AdvisorIndividual[];
  // Optional split lists if backend provides them
  Advisors_individuals_current?: AdvisorIndividual[];
  Advisors_individuals_past?: AdvisorIndividual[];
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
  _years?: { Year?: number | string };
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
  // Optional job titles array if provided by backend
  job_titles_id?: Array<{ id?: number; job_title: string }>;
}

// Corporate Events Response Interface
export interface CorporateEventsResponse {
  /**
   * New advisors corporate events payload (Xano `advisors_ce`)
   * This endpoint returns a *flat array* (not wrapped in an object).
   */
  events: AdvisorCorporateEvent[];
}

// Corporate Event (new advisors CE endpoint)
export interface AdvisorCeCompanyRef {
  id: number;
  name: string;
}

export interface AdvisorCeSectorTag {
  id: number;
  is_derived?: boolean;
  sector_name: string;
  sector_importance?: string; // "Primary" | "Secondary" (backend string)
}

export interface AdvisorCeOtherAdvisor {
  id: number;
  individuals_id?: number[];
  advisor_company_id: number;
  advisor_company_name: string;
}

export interface AdvisorCeAdvisorIndividual {
  id: number;
  name: string;
}

export interface AdvisorCorporateEvent {
  id: number;
  description: string;
  announcement_date: string;
  deal_type: string;
  ev_source?: string | null;
  enterprise_value_m?: string | number | null;
  currency_id?: number | null;
  currency_name?: string | null; // e.g. "USD", "GBP"
  company_advised_id?: number | null;
  company_advised_name?: string | null;
  company_advised_role?: string | null;
  // API updated: arrays (not JSON strings)
  target_companies?: AdvisorCeCompanyRef[] | null;
  primary_sectors?: AdvisorCeSectorTag[] | null;
  other_advisors?: AdvisorCeOtherAdvisor[] | null;
  advisor_individuals?: AdvisorCeAdvisorIndividual[] | null;
}

// (Legacy advisor corporate events shapes removed; advisor pages now use `advisors_ce`.)
