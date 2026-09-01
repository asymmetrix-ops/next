import { cookies } from "next/headers";
import type { CompanyCapitalRadarResponse } from "@/lib/companyCapitalRadar";

const XANO_CAPITAL_RADAR_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:aRPLxo_v:develop";

export async function fetchCompanyCapitalRadarServer(
  companyId: string | number,
  token?: string | null
): Promise<CompanyCapitalRadarResponse | null> {
  const authToken =
    token ?? cookies().get("asymmetrix_auth_token")?.value ?? null;
  if (!authToken) return null;

  const id = String(companyId).trim();
  if (!id) return null;

  const response = await fetch(
    `${XANO_CAPITAL_RADAR_BASE}/company/${encodeURIComponent(id)}/capital_radar`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `capital_radar failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as CompanyCapitalRadarResponse;
  if (!data || typeof data !== "object") return null;
  return data;
}
