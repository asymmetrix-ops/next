// Main Advisor Response Interface
export interface AdvisorActiveMandate {
  company_id: number;
  company_name: string;
  transaction_status_id: number;
  transaction_status?: string | null;
  process_stage?: string | null;
  set_at?: string | null;
  revenue_m?: number | string | null;
  revenue_currency?: string | null;
  revenue_year?: number | string | null;
  revenue_source?: string | null;
  ev?: number | string | null;
  ev_currency?: string | null;
  ev_year?: number | string | null;
  ev_source?: string | null;
}

export interface AdvisorResponse {
  Advisor: Advisor;
  Advised_DA_sectors: AdvisedSector[];
  Portfolio_companies_count: number;
  Advisors_individuals: AdvisorIndividual[];
  Active_Mandates?: AdvisorActiveMandate[];
  // Optional split lists if backend provides them
  Advisors_individuals_current?: AdvisorIndividual[];
  Advisors_individuals_past?: AdvisorIndividual[];
}

export interface OwnershipType {
  ownership?: string;
}

export interface LifecycleStage {
  Lifecycle_Stage?: string;
}

export interface AdvisorRoleRef {
  role_name?: string;
  advisor_role?: string;
  name?: string;
  counterparty_status?: string;
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
  _ownership_type?: OwnershipType;
  Lifecycle_stage?: LifecycleStage;
  ticker?: string;
  Ticker?: string;
  _advisor_roles?: AdvisorRoleRef[];
  advisor_roles?: AdvisorRoleRef[];
  status?: string;
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
   * New advisors corporate events payload (Xano `advisors_ce`).
   * Wire response is `{ items: [...], preferred_currency_id }` — `events`
   * here is `advisorService.getCorporateEvents`'s already-unwrapped `items`.
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
  // Wire values are JSON-encoded strings (e.g. `'[{"id":1,"name":"..."}]'`),
  // not parsed arrays — callers must JSON.parse (see `coerceArray`/
  // `coerceUnknownToArray` in the advisor UI). Typed as the parsed shape
  // here for convenience once decoded.
  target_companies?: AdvisorCeCompanyRef[] | string | null;
  primary_sectors?: AdvisorCeSectorTag[] | string | null;
  other_advisors?: AdvisorCeOtherAdvisor[] | string | null;
  advisor_individuals?: AdvisorCeAdvisorIndividual[] | string | null;
  // Enterprise value conversion metadata present on some items.
  enterprise_value_m_reported_value?: number | string | null;
  enterprise_value_m_reported_currency_id?: number | null;
  enterprise_value_m_native_currency_id?: number | null;
  enterprise_value_m_converted?: boolean | null;
  enterprise_value_m_is_approximate?: boolean | null;
  enterprise_value_m_fx_rate_id?: number | null;
}

// (Legacy advisor corporate events shapes removed; advisor pages now use `advisors_ce`.)
