import { alertsUpstream, proxyAlertsResponse, requireAuthUser } from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuthUser();
    if (!auth.ok) return auth.response;

    const upstreamResp = await alertsUpstream(
      `?user_id=${encodeURIComponent(String(auth.user.id))}`,
      { method: "GET" }
    );

    return proxyAlertsResponse(upstreamResp);
  } catch (e) {
    return Response.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthUser();
    if (!auth.ok) return auth.response;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : auth.user.email;

    if (!email) {
      return Response.json(
        { error: "Email is required to create an alert" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      ...body,
      user_id: auth.user.id,
      email,
    };

    delete payload.id;
    delete payload.created_at;
    delete payload.next_run_at_utc;
    delete payload.last_sent_at_utc;
    delete payload.status;

    const upstreamResp = await alertsUpstream("", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return proxyAlertsResponse(upstreamResp);
  } catch (e) {
    return Response.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
