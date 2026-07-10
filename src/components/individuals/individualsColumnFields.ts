import type { Individual } from "@/types/individuals";

export const INDIVIDUAL_COLUMN_FIELD_ALIASES: Record<string, readonly string[]> = {
  name: ["advisor_individuals"],
  current_company: ["current_company"],
  current_roles: ["current_roles"],
  location: ["_locations_individual"],
};

export function getIndividualFieldAliasesForColumn(
  columnKey: string
): readonly string[] {
  return INDIVIDUAL_COLUMN_FIELD_ALIASES[columnKey] ?? [columnKey];
}

export function formatIndividualLocation(
  location: Individual["_locations_individual"]
): string {
  if (!location) return "-";

  const parts = [
    location.City,
    location.State__Province__County,
    location.Country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "-";
}

export function resolveIndividualCompanyHref(ind: Individual): string | null {
  try {
    const currentRoles = Array.isArray(ind.roles)
      ? ind.roles.filter((r) => String(r.Status).toLowerCase() === "current")
      : [];
    const byName = currentRoles.find(
      (r) => r.new_company?.name && r.new_company.name === ind.current_company
    );
    const target = byName || currentRoles[0];
    const companyId =
      target?.new_company?.id ?? target?.employee_new_company_id;
    if (typeof companyId === "number" && Number.isFinite(companyId)) {
      return `/company/${companyId}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatIndividualRoles(individual: Individual): string {
  const titles = individual.current_roles
    ?.map((role) => role.job_title)
    .filter((title): title is string => Boolean(title && String(title).trim()));
  return titles && titles.length > 0 ? titles.join(", ") : "-";
}
