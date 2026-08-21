"use server";

import { cookies } from "next/headers";
import type { CompanyHoldingPeriodResponse } from "@/lib/holdingPeriod";

const HOLDING_PERIOD_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:OWf5rLk9:develop";

async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("asymmetrix_auth_token")?.value ?? null;
}

export async function fetchCompanyHoldingPeriodServer(
  companyId: string | number
): Promise<CompanyHoldingPeriodResponse | null> {
  try {
    const token = await getServerToken();
    if (!token) return null;

    const response = await fetch(
      `${HOLDING_PERIOD_API_BASE}/companies/${companyId}/holding-period`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "fetchCompanyHoldingPeriodServer failed:",
        response.status,
        await response.text().catch(() => "")
      );
      return null;
    }

    return (await response.json()) as CompanyHoldingPeriodResponse;
  } catch (error) {
    console.error("fetchCompanyHoldingPeriodServer error:", error);
    return null;
  }
}
