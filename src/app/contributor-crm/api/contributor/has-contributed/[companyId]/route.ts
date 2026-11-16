import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessContributorCrmPage } from "@/lib/contributorCrm/server/contributorCrmRequestGuard";
import { CONTRIBUTOR_COMPANY_HEADER } from "@/lib/contributorCrm/linkToken";
import { serviceCompanyHasContributions } from "@/lib/contributorCrm/server/contributorApi";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ companyId: string }> };

/** Has anyone already sent data for this company? Keeps the Benchmark open on any browser. */
export async function GET(request: NextRequest, context: RouteContext) {
  const blocked = rejectUnlessContributorCrmPage(request);
  if (blocked) return blocked;

  try {
    const { companyId } = await context.params;
    if (!companyId?.trim()) {
      return NextResponse.json({ error: "Company id is required." }, { status: 400 });
    }
    const sessionCompany = request.headers.get(CONTRIBUTOR_COMPANY_HEADER);
    if (sessionCompany && sessionCompany !== companyId.trim()) {
      return NextResponse.json({ error: "Not allowed for this company." }, { status: 403 });
    }
    return NextResponse.json({ contributed: await serviceCompanyHasContributions(companyId.trim()) });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to look up contributions" },
      { status: 500 }
    );
  }
}
