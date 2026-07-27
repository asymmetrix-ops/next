export type CompanyMcpStatus = boolean | null;

export type CompanyMcpData = {
  has_mcp?: unknown;
  source_url?: unknown;
};

export function normalizeCompanyMcpStatus(raw: unknown): CompanyMcpStatus {
  if (typeof raw === "boolean") return raw;
  return null;
}

function readMcpFromDataBlock(block: unknown): CompanyMcpStatus {
  if (!block || typeof block !== "object") return null;
  return normalizeCompanyMcpStatus((block as CompanyMcpData).has_mcp);
}

/** Read MCP from company object and optional API root payload. */
export function readCompanyMcpStatus(
  company?: { has_mcp?: unknown; mcp_data?: unknown } | null,
  root?: { has_mcp?: unknown; mcp_data?: unknown } | null
): CompanyMcpStatus {
  const fromCompany = normalizeCompanyMcpStatus(company?.has_mcp);
  if (fromCompany !== null) return fromCompany;

  const fromCompanyMcpData = readMcpFromDataBlock(company?.mcp_data);
  if (fromCompanyMcpData !== null) return fromCompanyMcpData;

  const fromRoot = normalizeCompanyMcpStatus(root?.has_mcp);
  if (fromRoot !== null) return fromRoot;

  return readMcpFromDataBlock(root?.mcp_data);
}

export function formatCompanyMcpDisplay(value: boolean): "Yes" | "No" {
  return value ? "Yes" : "No";
}

export function isCompanyMcpPopulated(status: CompanyMcpStatus): status is boolean {
  return status !== null;
}
