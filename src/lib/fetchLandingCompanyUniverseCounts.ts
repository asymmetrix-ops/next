import { cookies } from "next/headers";
import {
  DEFAULT_COMPANY_UNIVERSE_COUNTS,
  fetchCompanyUniverseCounts,
  resolveLandingCountsAuthToken,
  type CompanyUniverseCounts,
} from "@/lib/landingCompanyUniverseCounts";
import { readPlatformCurrencyIdServer } from "@/lib/platformCurrencyServer";

export async function fetchLandingCompanyUniverseCounts(): Promise<CompanyUniverseCounts> {
  const cookieStore = await cookies();
  const token = resolveLandingCountsAuthToken(
    cookieStore.get("asymmetrix_auth_token")?.value
  );
  const preferredCurrencyId = await readPlatformCurrencyIdServer();
  const counts = await fetchCompanyUniverseCounts(token, preferredCurrencyId);
  return counts ?? DEFAULT_COMPANY_UNIVERSE_COUNTS;
}

export type { CompanyUniverseCounts };
