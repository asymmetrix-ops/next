export interface InvestorLocation {
  City: string;
  State__Province__County: string;
  Country: string;
}

export interface InvestorYears {
  id: number;
  Year: string;
}

export interface LinkedInData {
  linkedin_employee: number;
  linkedin_emp_date: string;
  linkedin_logo: string;
}

export interface Investor {
  id: number;
  name: string;
  description: string;
  url: string;
  street_address: string;
  year_founded: number;
  _years: InvestorYears;
  _locations: InvestorLocation;
  _linkedin_data_of_new_company: LinkedInData;
}

export interface FocusSector {
  id: number;
  sector_name: string;
}

export interface TeamMember {
  Individual_text: string;
  job_titles_id: Array<{ job_title: string }>;
  current_employer_url: string;
}

export interface PortfolioCompany {
  id: number;
  name: string;
  locations_id: number;
  sectors_id: Array<{
    sector_name: string;
    Sector_importance: string;
  }>;
  description: string;
  linkedin_data: {
    LinkedIn_Employee: number;
    linkedin_logo: string;
  };
  _locations: {
    Country: string;
  };
  _is_that_investor: boolean;
  _linkedin_data_of_new_company: {
    linkedin_employee: number;
    linkedin_logo: string;
  };
}

export interface PortfolioResponse {
  items: PortfolioCompany[];
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  pageTotal: number;
}

export interface CorporateEvent {
  id?: number;
  description: string;
  announcement_date: string;
  deal_type: string;
  counterparty_status?: {
    counterparty_syayus?: {
      counterparty_status: string;
    };
  };
  ev_data?: {
    enterprise_value_m?: number;
    ev_band?: string;
  };
  "0"?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
  "1"?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
}

export interface CorporateEventsResponse {
  New_Events_Wits_Advisors: CorporateEvent[];
}

export interface InvestorData {
  Investor: Investor;
  Focus: FocusSector[];
  Invested_DA_sectors: FocusSector[];
  Investment_Team_Roles_current: TeamMember[];
  Investment_Team_Roles_past: TeamMember[];
}

export interface PaginationState {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  pageTotal: number;
}

export interface MappedCorporateEvent {
  id?: number;
  originalIndex: number;
  description: string;
  announcement_date: string;
  type: string;
  counterparty_status: string;
  other_counterparties: string;
  enterprise_value: string;
  advisors: string;
}
