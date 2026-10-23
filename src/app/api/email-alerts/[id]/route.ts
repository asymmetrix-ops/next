import {
  alertsUpstream,
  pickAlertWriteFields,
  proxyAlertsResponse,
  requireAuthUser,
} from "@/lib/emailAlertsServer";

export const runtime = "nodejs";

async function authorizeAlert(
  params: Promise<{ id: string }>
): Promise<{ ok: true; alertId: number } | { ok: false; response: Response }> {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return auth;
  }

  const { id } = await params;
  const alertId = Number(id);
  if (!Number.isInteger(alertId) || alertId <= 0) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid alert id." }, { status: 400 }),
    };
  }

  const existingResp = await alertsUpstream(`/${alertId}`);
  if (!existingResp.ok) {
    return { ok: false, response: await proxyAlertsResponse(existingResp) };
  }
  const existing = (await existingResp.json().catch(() => null)) as {
    user_id?: unknown;
  } | null;
  if (Number(existing?.user_id) !== auth.user.id) {
    return {
      ok: false,
      response: Response.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { ok: true, alertId };
}

/** Update an alert (toggle is_active, or edit schedule/filters) on the Fly email service. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await authorizeAlert(params);
  if (!authz.ok) {
    return authz.response;
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const fields = pickAlertWriteFields(body);
  if (Object.keys(fields).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }
  if ("is_active" in fields && typeof fields.is_active !== "boolean") {
    return Response.json(
      { error: "is_active must be a boolean." },
      { status: 400 }
    );
  }

  const upstreamResp = await alertsUpstream(`/${authz.alertId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return proxyAlertsResponse(upstreamResp);
}

/** Permanently delete an alert (Fly service hard delete). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await authorizeAlert(params);
  if (!authz.ok) {
    return authz.response;
  }

  const upstreamResp = await alertsUpstream(`/${authz.alertId}?hard=true`, {
    method: "DELETE",
  });
  return proxyAlertsResponse(upstreamResp);
}
