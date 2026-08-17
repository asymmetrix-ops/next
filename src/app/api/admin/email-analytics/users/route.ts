import { NextRequest } from "next/server";
import {
  alertsUpstream,
  proxyAlertsResponse,
  requireAuthUser,
} from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams();

  const date = searchParams.get("date");
  if (date) query.set("date", date);

  const timezone = searchParams.get("timezone") ?? "Europe/London";
  query.set("timezone", timezone);

  const userId = searchParams.get("user_id");
  if (userId) query.set("user_id", userId);

  const itemType = searchParams.get("item_type");
  if (itemType) query.set("item_type", itemType);

  const qs = query.toString();
  const upstreamResp = await alertsUpstream(
    `/analytics/users${qs ? `?${qs}` : ""}`,
    { method: "GET" }
  );

  return proxyAlertsResponse(upstreamResp);
}
