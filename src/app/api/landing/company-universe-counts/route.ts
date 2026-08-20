import { NextResponse } from "next/server";
import { fetchLandingCompanyUniverseCounts } from "@/lib/fetchLandingCompanyUniverseCounts";
import {
  DEFAULT_COMPANY_UNIVERSE_COUNTS,
} from "@/lib/landingCompanyUniverseCounts";

export async function GET() {
  const counts = await fetchLandingCompanyUniverseCounts();

  if (!counts) {
    console.warn(
      "landing/company-universe-counts: no auth token — returning fallback counts. Set ASYMMETRIX_TOKEN or ASYMMETRIX_LANDING_TOKEN in env for live counts on public landing."
    );
    return NextResponse.json(
      { ...DEFAULT_COMPANY_UNIVERSE_COUNTS, live: false },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  return NextResponse.json(
    { ...counts, live: true },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
