import { NextRequest } from "next/server";
import { proxyBroadcastGet } from "@/lib/broadcastAnalyticsProxy";
import { requireAuthUser } from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  return proxyBroadcastGet(
    `/campaigns/${encodeURIComponent(id)}`,
    searchParams
  );
}
