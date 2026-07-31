import { COMPANIES_API_BASE } from "@/lib/companiesFilterPayload";

export const COMPANY_PROFILE_PROXY_PATH = "/api/company-profile";

export function getCompanyProfileUpstreamUrl(id: string): string {
  return `${COMPANIES_API_BASE}/get_company_profile/${id}`;
}
