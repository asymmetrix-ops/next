import { LOGO_FIELD_ALIASES } from "@/lib/companyLogo";

export const ADVISOR_COLUMN_FIELD_ALIASES: Record<string, readonly string[]> = {
  logo: LOGO_FIELD_ALIASES,
  name: ["name"],
  description: ["description"],
  events_advised: ["events_advised"],
  sectors: ["sectors"],
  linkedin_members: ["linkedin_members"],
  country: ["country"],
};

export function getAdvisorFieldAliasesForColumn(columnKey: string): readonly string[] {
  return ADVISOR_COLUMN_FIELD_ALIASES[columnKey] ?? [columnKey];
}
