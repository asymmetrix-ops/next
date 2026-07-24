import type { Individual } from "@/types/individuals";

/**
 * Xano returns several fields as serialised JSON strings rather than parsed
 * objects / arrays. This helper safely parses them; if the value is already
 * an object/array it is returned as-is.
 */
function parseJsonStringField<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "null") return null;
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeIndividualRole(raw: Record<string, unknown>) {
  const employeeNewCompanyId = Number(raw.employee_new_company_id);
  const companyName = String(raw.company_name ?? "").trim();
  const roleId = Number(raw.role_id ?? raw.id ?? 0);

  return {
    id: Number.isFinite(roleId) ? roleId : 0,
    individuals_id: Number(raw.individuals_id ?? 0),
    employee_new_company_id: Number.isFinite(employeeNewCompanyId)
      ? employeeNewCompanyId
      : 0,
    current_employer_url: String(
      raw.current_employer_url ?? raw.company_url ?? ""
    ),
    Status: String(raw.Status ?? ""),
    job_titles_id: Array.isArray(raw.job_titles_id)
      ? raw.job_titles_id.map((id, index) => ({
          id: Number(id),
          job_title: String(raw.job_title ?? `Role ${index + 1}`),
        }))
      : [],
    new_company: {
      id: Number.isFinite(employeeNewCompanyId) ? employeeNewCompanyId : undefined,
      name: companyName,
      locations_id: 0,
      sectors_id: [],
      _locations: null,
    },
  };
}

export function normalizeIndividualFromApi(
  raw: Record<string, unknown>
): Individual {
  const parsedCurrentRoles =
    parseJsonStringField<unknown[]>(raw.current_roles) ?? [];
  const parsedRoles = parseJsonStringField<unknown[]>(raw.roles) ?? [];

  const currentRoles = Array.isArray(parsedCurrentRoles)
    ? parsedCurrentRoles
        .map((role, index) => {
          if (!role || typeof role !== "object") return null;
          const jobTitle = String(
            (role as { job_title?: unknown }).job_title ?? ""
          ).trim();
          if (!jobTitle) return null;
          return {
            id: index + 1,
            job_title: jobTitle,
          };
        })
        .filter((role): role is { id: number; job_title: string } => role != null)
    : [];

  const roles = Array.isArray(parsedRoles)
    ? parsedRoles
        .filter(
          (role): role is Record<string, unknown> =>
            !!role && typeof role === "object"
        )
        .map(normalizeIndividualRole)
    : [];

  const location = parseJsonStringField<Individual["_locations_individual"]>(
    raw._locations_individual
  );

  return {
    id: Number(raw.id),
    advisor_individuals: String(raw.advisor_individuals ?? "").trim(),
    current_company:
      raw.current_company == null || String(raw.current_company).trim() === ""
        ? null
        : String(raw.current_company),
    current_roles: currentRoles,
    _locations_individual: location,
    roles,
    locations_id: Number(raw.locations_id ?? 0),
    current_company_location: Array.isArray(raw.current_company_location)
      ? (raw.current_company_location as Individual["current_company_location"])
      : [],
  };
}

export function normalizeIndividualExportRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  return normalizeIndividualFromApi(row) as unknown as Record<string, unknown>;
}
