import { cookies } from "next/headers";
import type { CompanyLinkedInResponse } from "@/lib/companyLinkedIn";

const XANO_COMPANY_LINKEDIN_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";

export async function fetchCompanyLinkedInServer(
  newCompanyId: string | number,
  token?: string | null
): Promise<CompanyLinkedInResponse | null> {
  const authToken =
    token ?? cookies().get("asymmetrix_auth_token")?.value ?? null;
  if (!authToken) return null;

  const companyId = String(newCompanyId).trim();
  if (!companyId) return null;

  const response = await fetch(
    `${XANO_COMPANY_LINKEDIN_BASE}/get_company_linkedin/${encodeURIComponent(companyId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `get_company_linkedin failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as CompanyLinkedInResponse;
}
