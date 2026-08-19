import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEFAULT_COMPANY_UNIVERSE_COUNTS,
  fetchCompanyUniverseCounts,
  resolveLandingCountsAuthToken,
} from "@/lib/landingCompanyUniverseCounts";
import { readPlatformCurrencyIdServer } from "@/lib/platformCurrencyServer";

export async function GET() {
  const cookieStore = await cookies();
  const token = resolveLandingCountsAuthToken(
    cookieStore.get("asymmetrix_auth_token")?.value
  );
  const preferredCurrencyId = await readPlatformCurrencyIdServer();
  const counts = await fetchCompanyUniverseCounts(token, preferredCurrencyId);

  return NextResponse.json(counts ?? DEFAULT_COMPANY_UNIVERSE_COUNTS, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
