import type { Individual, IndividualCurrentCompany } from "@/types/individuals";

export const INDIVIDUAL_COLUMN_FIELD_ALIASES: Record<string, readonly string[]> = {
  name: ["advisor_individuals"],
  current_company: ["current_company"],
  current_roles: ["current_roles"],
  corporate_events: ["corporate_events_count"],
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

export function getIndividualCurrentCompanies(
  individual: Individual
): IndividualCurrentCompany[] {
  if (individual.current_companies?.length) {
    return individual.current_companies;
  }
  if (individual.current_company) {
    const href = resolveIndividualCompanyHref(individual);
    const companyIdMatch = href?.match(/\/company\/(\d+)/);
    const companyId = companyIdMatch ? Number(companyIdMatch[1]) : NaN;
    if (Number.isFinite(companyId)) {
      return [
        {
          employee_new_company_id: companyId,
          company_name: individual.current_company,
        },
      ];
    }
    return [
      {
        employee_new_company_id: 0,
        company_name: individual.current_company,
      },
    ];
  }
  return [];
}

export function formatIndividualRoles(individual: Individual): string {
  return (
    individual.current_roles?.map((role) => role.job_title).join(", ") || "-"
  );
}
