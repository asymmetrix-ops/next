export type CompanyMcpStatus = boolean | null;

export function normalizeCompanyMcpStatus(raw: unknown): CompanyMcpStatus {
  if (typeof raw === "boolean") return raw;
  return null;
}

/** Read MCP from company object and optional API root payload. */
export function readCompanyMcpStatus(
  company?: { has_mcp?: unknown } | null,
  root?: { has_mcp?: unknown } | null
): CompanyMcpStatus {
  const fromCompany = normalizeCompanyMcpStatus(company?.has_mcp);
  if (fromCompany !== null) return fromCompany;
  return normalizeCompanyMcpStatus(root?.has_mcp);
}

export function formatCompanyMcpDisplay(value: boolean): "Yes" | "No" {
  return value ? "Yes" : "No";
}

export function isCompanyMcpPopulated(status: CompanyMcpStatus): status is boolean {
  return status !== null;
}
