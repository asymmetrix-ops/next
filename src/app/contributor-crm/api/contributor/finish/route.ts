import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessContributorCrmPage } from "@/lib/contributorCrm/server/contributorCrmRequestGuard";
import {
  CONTRIBUTOR_DONE_COOKIE,
  CONTRIBUTOR_SESSION_COOKIE,
} from "@/lib/contributorCrm/linkToken";

export const dynamic = "force-dynamic";

/**
 * The contributor sent everything: close this link on this browser. The session cookie is
 * dropped and the link's id is remembered, so reopening the link (or going back to the page)
 * only shows the "already sent" screen.
 */
export async function POST(request: NextRequest) {
  const blocked = rejectUnlessContributorCrmPage(request);
  if (blocked) return blocked;

  const session = request.cookies.get(CONTRIBUTOR_SESSION_COOKIE)?.value ?? "";
  const parts = session.split(".");
  const response = NextResponse.json({ ok: true });
  if (parts.length === 4) {
    const used = (request.cookies.get(CONTRIBUTOR_DONE_COOKIE)?.value ?? "")
      .split(",")
      .filter(Boolean)
      .slice(-19);
    used.push(`${parts[0]}:${parts[2]}`);
    response.cookies.set(CONTRIBUTOR_DONE_COOKIE, used.join(","), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/contributor-crm",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  response.cookies.set(CONTRIBUTOR_SESSION_COOKIE, "", { path: "/contributor-crm", maxAge: 0 });
  return response;
}
