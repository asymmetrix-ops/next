const COMPANY_SEARCH_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/company_search";

export interface McpGuestCompanyOption {
  id: number;
  name: string;
}

export async function searchMcpGuestCompanies(
  query: string
): Promise<McpGuestCompanyOption[]> {
  const search = query.trim();
  if (search.length < 2) return [];

  const params = new URLSearchParams({ search });
  const response = await fetch(`${COMPANY_SEARCH_URL}?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { items?: unknown };
  if (!Array.isArray(data.items)) return [];

  return data.items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = Number(row.id);
      const name = String(row.name ?? "").trim();
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { id, name };
    })
    .filter((item): item is McpGuestCompanyOption => item !== null);
}
