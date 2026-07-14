import { LOGO_FIELD_ALIASES } from "@/lib/companyLogo";

export const INVESTOR_COLUMN_FIELD_ALIASES: Record<string, readonly string[]> = {
  logo: LOGO_FIELD_ALIASES,
  name: ["company_name", "name"],
  type: ["investor_type"],
  description: ["description"],
  portfolio_companies: ["number_of_active_investments"],
  primary_sectors: ["da_primary_sector_names", "primary_sectors"],
  linkedin_members: ["linkedin_members"],
  country: ["country", "hq", "hq_country"],
  hq: ["hq", "country"],
  website: ["website", "url", "website_url"],
  linkedin_url: ["linkedin_url", "LinkedIn_URL"],
  year_founded: ["year_founded", "_years.Year"],
  total_investments: ["total_investments", "number_of_investments"],
  years_since_last_investment: [
    "days_since_last_investment",
    "years_since_last_investment",
    "last_investment.display",
    "last_investment",
  ],
  sub_region: ["sub_region", "geographical_sub_region"],
  state: ["state", "province", "hq_state"],
  city: ["city", "hq_city"],
};

export function getInvestorFieldAliasesForColumn(columnKey: string): readonly string[] {
  return INVESTOR_COLUMN_FIELD_ALIASES[columnKey] ?? [columnKey];
}
