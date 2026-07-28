import type { IncomeStatementApiEntry } from "@/lib/incomeStatement";

const API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_income_statement_card";

/** GET-only — endpoint does not support POST. Requires `new_company_id` query param. */
export async function fetchCompanyIncomeStatementCard(
  companyId: string | number
): Promise<IncomeStatementApiEntry[]> {
  const numericId = Number(companyId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return [];
  }

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const params = new URLSearchParams();
  params.set("new_company_id", String(numericId));

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data as IncomeStatementApiEntry[];
}
