import { readHqCountryIso2 } from "@/lib/dealRadar";

const COMPANY_OF_FOCUS_KEYS = [
  "companies_of_focus",
  "Company_of_Focus",
  "company_of_focus",
] as const;

export function getInsightHqCountryIso2(article: unknown): string | null {
  if (!article || typeof article !== "object") return null;
  const record = article as Record<string, unknown>;

  const fromArticle = readHqCountryIso2(record);
  if (fromArticle) return fromArticle;

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
