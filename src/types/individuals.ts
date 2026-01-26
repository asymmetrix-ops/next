// Main API Response Interface (optimized flat structure)
export interface IndividualsResponse {
  individuals: Individual[];
  totalIndividuals: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
  currentRoles: number;
  pastRoles: number;
  ceos: number;
  chairs: number;
  founders: number;
}

// Individual Interface
export interface Individual {
  id: number;
  advisor_individuals: string;
  roles: Role[];
  locations_id: number;
  _locations_individual: IndividualLocation | null;
  total_count?: number;
  current_roles: CurrentRole[];
  current_company: string | null;
  current_company_location: Location[];
}

// Individual Location with region fields
export interface IndividualLocation extends Location {
  Continental_Region?: string;
  geographical_sub_region?: string;
}

// Role Interface
export interface Role {
  id: number;
  individuals_id: number;
  employee_new_company_id: number;
  current_employer_url: string;
  Status: string; // "Current" | "Past"
  job_titles_id: JobTitle[];
  new_company: Company;
}

// Job Title Interface
export interface JobTitle {
  id: number;
  job_title: string;
}

// Current Role Interface
export interface CurrentRole {
  id: number;
  job_title: string;
}

// Company Interface
export interface Company {
  id?: number;
  name: string;
  locations_id: number;
  sectors_id: number[];
  _locations: Location | null;
}

// Location Interface
export interface Location {
  City: string;
  State__Province__County: string;
  Country: string;
}

// Search Filters Interface
export interface IndividualsFilters {
  primary_sectors_ids: number[];
  Secondary_sectors_ids: number[];
  Countries: string[];
  Provinces: string[];
  Cities: string[];
  job_titles_ids: number[];
  statuses: string[];
  search_query: string;
  Offset: number;
  Per_page: number;
}

// Filter Options Interface
export interface FilterOptions {
  sectors: { id: number; name: string }[];
  countries: string[];
  provinces: string[];
  cities: string[];
  jobTitles: { id: number; title: string }[];
  statuses: string[];
}
