import {
  alertsUpstream,
  proxyAlertsResponse,
  requireAuthUser,
} from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function getAlertForUser(alertId: string, userId: number) {
  const upstreamResp = await alertsUpstream(`/${encodeURIComponent(alertId)}`, {
    method: "GET",
  });

  if (!upstreamResp.ok) {
    return { ok: false as const, upstreamResp };
  }

  const alert = (await upstreamResp.json().catch(() => null)) as {
    user_id?: unknown;
  } | null;

  const alertUserId =
    typeof alert?.user_id === "number"
      ? alert.user_id
      : typeof alert?.user_id === "string"
        ? Number.parseInt(alert.user_id, 10)
        : null;

  if (alertUserId == null || alertUserId !== userId) {
    return {
      ok: false as const,
      upstreamResp: new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { ok: true as const, alert };
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const auth = await requireAuthUser();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const ownership = await getAlertForUser(id, auth.user.id);
    if (!ownership.ok) {
      return proxyAlertsResponse(ownership.upstreamResp);
    }

    return Response.json(ownership.alert, { status: 200 });
  } catch (e) {
    return Response.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = await requireAuthUser();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const ownership = await getAlertForUser(id, auth.user.id);
    if (!ownership.ok) {
      return proxyAlertsResponse(ownership.upstreamResp);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const payload = { ...body };
    delete payload.id;
    delete payload.user_id;
    delete payload.created_at;

    const upstreamResp = await alertsUpstream(`/${encodeURIComponent(id)}`, {
      method: "PATCH",
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

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const auth = await requireAuthUser();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const ownership = await getAlertForUser(id, auth.user.id);
    if (!ownership.ok) {
      return proxyAlertsResponse(ownership.upstreamResp);
    }

    const upstreamResp = await alertsUpstream(`/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    return proxyAlertsResponse(upstreamResp);
  } catch (e) {
    return Response.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
