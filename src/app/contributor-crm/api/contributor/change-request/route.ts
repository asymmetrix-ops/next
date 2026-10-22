import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessContributorCrmPage } from "@/lib/contributorCrm/server/contributorCrmRequestGuard";
import { CONTRIBUTOR_COMPANY_HEADER } from "@/lib/contributorCrm/linkToken";
import { checkSubmitterDomain } from "@/lib/contributorCrm/server/domainCheck";
import { fetchServiceCompany, postServiceChangeRequest } from "@/lib/contributorCrm/server/contributorApi";

export const dynamic = "force-dynamic";

// Read-only on the contributor page: never accepted from a submission.
const READ_ONLY_COMPANY_FIELDS = ["product_type", "revenue_model", "data_collection_method"];

function stripReadOnly(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripReadOnly);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !/^linkedin/i.test(k))
        .map(([k, v]) => [k, stripReadOnly(v)])
    );
  }
  return value;
}

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

    if (payload.entity_type !== "financial_metrics") {
      for (const side of ["old", "new"] as const) {
        const body = stripReadOnly(payload[side]) as Record<string, unknown> | undefined;
        const company = body?.company as Record<string, unknown> | undefined;
        if (company) {
          const target =
            company.data && typeof company.data === "object" ? (company.data as Record<string, unknown>) : company;
          for (const f of READ_ONLY_COMPANY_FIELDS) delete target[f];
        }
        if (body) payload[side] = body;
      }
    }

    // A link-bound session may only submit changes for its own company.
    const sessionCompany = request.headers.get(CONTRIBUTOR_COMPANY_HEADER);
    if (sessionCompany && String(payload.new_company_id ?? "") !== sessionCompany) {
      return NextResponse.json({ error: "Not allowed for this company." }, { status: 403 });
    }

    // Flag submissions whose email domain differs from the company website, e.g. a
    // forwarded link. The team sees this on the review screen.
    try {
      const company = await fetchServiceCompany(String(payload.new_company_id ?? ""));
      const check = checkSubmitterDomain(String(payload.submitted_by), company);
      payload.new = { ...((payload.new as Record<string, unknown>) ?? {}), domain_check: check };
    } catch {
      /* a failed lookup must not block the submission */
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
