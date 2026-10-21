import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessContributorCrmPage } from "@/lib/contributorCrm/server/contributorCrmRequestGuard";
import { CONTRIBUTOR_COMPANY_HEADER } from "@/lib/contributorCrm/linkToken";
import { postServiceChangeRequest } from "@/lib/contributorCrm/server/contributorApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = rejectUnlessContributorCrmPage(request);
  if (blocked) return blocked;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (!payload?.submitted_by || !String(payload.submitted_by).trim()) {
      return NextResponse.json(
        { error: "Contributor email is required." },
        { status: 400 }
      );
    }

    // A link-bound session may only submit changes for its own company.
    const sessionCompany = request.headers.get(CONTRIBUTOR_COMPANY_HEADER);
    if (sessionCompany && String(payload.new_company_id ?? "") !== sessionCompany) {
      return NextResponse.json({ error: "Not allowed for this company." }, { status: 403 });
    }

    await postServiceChangeRequest(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to submit change request" },
      { status: 500 }
    );
  }
}
