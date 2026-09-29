import { normalizeIso2, readHqCountryIso2 } from "@/lib/dealRadar";

const COMPANY_OF_FOCUS_KEYS = [
  "companies_of_focus",
  "Company_of_Focus",
  "company_of_focus",
] as const;

/** ISO2 for insight card flags — prefers API `primary_company.iso2`. */
export function readPrimaryCompanyIso2(article: unknown): string | null {
  if (!article || typeof article !== "object") return null;
  const primary = (article as Record<string, unknown>).primary_company;
  if (!primary || typeof primary !== "object") return null;
  const record = primary as Record<string, unknown>;
  const fromIso2 = normalizeIso2(record.iso2);
  if (fromIso2) return fromIso2;
  return readHqCountryIso2(record);
}

export function getInsightHqCountryIso2(article: unknown): string | null {
  if (!article || typeof article !== "object") return null;
  const record = article as Record<string, unknown>;

  const fromPrimary = readPrimaryCompanyIso2(record);
  if (fromPrimary) return fromPrimary;

  const fromArticle = readHqCountryIso2(record);
  if (fromArticle) return fromArticle;

  const mentioned = record.companies_mentioned;
  if (Array.isArray(mentioned)) {
    for (const company of mentioned) {
      if (!company || typeof company !== "object") continue;
      const iso2 = readHqCountryIso2(company as Record<string, unknown>);
      if (iso2) return iso2;
    }
  }

  // Non-empty `companies_of_focus` is not Company Analysis — use only as fallback.
  for (const key of COMPANY_OF_FOCUS_KEYS) {
    const companies = record[key];
    if (!Array.isArray(companies)) continue;
    for (const company of companies) {
      if (!company || typeof company !== "object") continue;
      const iso2 = readHqCountryIso2(company as Record<string, unknown>);
      if (iso2) return iso2;
    }
  }

  return null;
}
