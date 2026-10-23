import {
  alertsUpstream,
  proxyAlertsResponse,
  requireAuthUser,
} from "@/lib/emailAlertsServer";

export const runtime = "nodejs";

const ALLOWED_FREQUENCY = new Set(["daily", "weekly", "as_added"]);

/** User email alerts from the Fly email service (Turso-backed). */
export async function GET(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const requestedUserId = Number(url.searchParams.get("user_id"));
  if (
    Number.isFinite(requestedUserId) &&
    requestedUserId > 0 &&
    requestedUserId !== auth.user.id
  ) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const upstreamParams = new URLSearchParams({
    user_id: String(auth.user.id),
  });

  const itemType = url.searchParams.get("item_type")?.trim();
  if (itemType && /^[a-z0-9_]+$/i.test(itemType)) {
    upstreamParams.set("item_type", itemType);
  }

  const emailFrequency = url.searchParams.get("email_frequency")?.trim();
  if (emailFrequency && ALLOWED_FREQUENCY.has(emailFrequency)) {
    upstreamParams.set("email_frequency", emailFrequency);
  }

  const isActive = url.searchParams.get("is_active")?.trim().toLowerCase();
  if (isActive === "true" || isActive === "false") {
    upstreamParams.set("is_active", isActive);
  }

  const upstreamResp = await alertsUpstream(`?${upstreamParams.toString()}`);
  return proxyAlertsResponse(upstreamResp);
}
