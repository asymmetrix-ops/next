import { COMPANIES_API_BASE } from "@/lib/companiesFilterPayload";

export const COMPANY_PROFILE_DEVELOP_BASE = `${COMPANIES_API_BASE}:develop`;

export const COMPANY_PROFILE_PROXY_PATH = "/api/company-profile";

export function getCompanyProfileUpstreamUrl(
  id: string,
  options?: { develop?: boolean }
): string {
  const base = options?.develop
    ? COMPANY_PROFILE_DEVELOP_BASE
    : COMPANIES_API_BASE;
  return `${base}/get_company_profile/${id}`;
}
