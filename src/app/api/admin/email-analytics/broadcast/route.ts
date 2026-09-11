import { NextRequest } from "next/server";
import { proxyBroadcastGet } from "@/lib/broadcastAnalyticsProxy";
import { requireAuthUser } from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  return proxyBroadcastGet("", searchParams);
}
