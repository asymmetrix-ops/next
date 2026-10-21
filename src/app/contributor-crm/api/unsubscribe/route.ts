import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/contributorCrm/linkToken";
import {
  clearContributorServiceToken,
  getContributorServiceToken,
} from "@/lib/contributorCrm/server/serviceAuth";

export const dynamic = "force-dynamic";

const OPT_OUT_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:tDNMS_i0/dcp_opt_out";

/** Confirms an unsubscribe from a signed email link: the address is never emailed again. */
export async function POST(request: NextRequest) {
  const { t } = (await request.json().catch(() => ({}))) as { t?: string };
  const email = await verifyUnsubscribeToken(t, process.env.CONTRIBUTOR_LINK_SECRET);
  if (!email) {
    return NextResponse.json({ error: "This unsubscribe link is not valid." }, { status: 400 });
  }

  const call = async (forceRefresh: boolean) =>
    fetch(OPT_OUT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getContributorServiceToken(forceRefresh)}`,
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

  let res = await call(false);
  if (res.status === 401) {
    clearContributorServiceToken();
    res = await call(true);
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Could not unsubscribe right now." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
