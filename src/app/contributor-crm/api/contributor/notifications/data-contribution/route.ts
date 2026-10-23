import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessContributorCrmPage } from "@/lib/contributorCrm/server/contributorCrmRequestGuard";
import { postServiceDataContributionNotification } from "@/lib/contributorCrm/server/contributorApi";

export const dynamic = "force-dynamic";

const CMS_BASE_URL = (
  process.env.CMS_BASE_URL ?? "https://asymmetrix-cms-phi.vercel.app"
).replace(/\/$/, "");

/** The "View request" button opens the CMS review screen for that company. */
function cmsReviewUrl(requestUrl: unknown): string {
  let companyId = "";
  try {
    companyId = new URL(String(requestUrl), "https://x.invalid").searchParams.get("companyId") ?? "";
  } catch {
    /* fall through: link to the whole queue */
  }
  const query = /^\d+$/.test(companyId) ? `?company=${companyId}` : "";
  return `${CMS_BASE_URL}/data-contributor-portal/review${query}`;
}

export async function POST(request: NextRequest) {
  const blocked = rejectUnlessContributorCrmPage(request);
  if (blocked) return blocked;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (!payload?.contributor_email || !String(payload.contributor_email).trim()) {
      return NextResponse.json({ error: "Contributor email is required." }, { status: 400 });
    }

    await postServiceDataContributionNotification({
      ...payload,
      request_url: cmsReviewUrl(payload.request_url),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message || "Failed to send data contribution notification",
      },
      { status: 500 }
    );
  }
}
