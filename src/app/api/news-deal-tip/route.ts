import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USERS_DATA_RESEARCH_REQUESTS_URL } from "@/lib/usersDataResearchRequests";

export const runtime = "nodejs";

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

const DEAL_TIP_TYPE = "Deal Tip";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const getToken = (request: Request) =>
  cookies().get("asymmetrix_auth_token")?.value || request.headers.get("x-asym-token");

async function getUserId(token: string): Promise<number | null> {
  for (const authorization of [`Bearer ${token}`, token]) {
    const res = await fetch(`${AUTH_API_URL}/auth/me`, {
      headers: { "Content-Type": "application/json", Authorization: authorization },
      cache: "no-store",
    });
    if (res.status === 401) continue;
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { id?: unknown } | null;
    const id = Number(data?.id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const tip = str(body.tip);
    if (!tip) {
      return NextResponse.json({ error: "Please enter your tip." }, { status: 400 });
    }

    const token = getToken(request);
    const userId = token ? await getUserId(token) : null;
    if (!token || userId == null) {
      return NextResponse.json({ error: "Unable to identify the submitting user." }, { status: 401 });
    }

    const companyName = str(body.companyName);
    const details = [
      ...(companyName ? [`Company: ${companyName}`] : []),
      `Can contact: ${body.canContact === false ? "No" : "Yes"}`,
      "Source page: News",
      "",
      tip,
    ].join("\n");

    const payload = JSON.stringify({
      type: DEAL_TIP_TYPE,
      category: "Data",
      request_details: details,
      submitted_by: userId,
    });

    let res = await fetch(USERS_DATA_RESEARCH_REQUESTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: payload,
      cache: "no-store",
    });
    if (res.status === 401) {
      res = await fetch(USERS_DATA_RESEARCH_REQUESTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: payload,
        cache: "no-store",
      });
    }
    if (!res.ok) {
      throw new Error(`Xano submission failed (${res.status}): ${await res.text().catch(() => "")}`);
    }
    // TODO(backend): email the tip to Jordan (address TBC).
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deal tip submission failed:", error);
    return NextResponse.json({ error: "Unable to submit your tip. Please try again." }, { status: 500 });
  }
}
