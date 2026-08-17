import { NextRequest } from "next/server";
import {
  analyticsUpstream,
  proxyAlertsResponse,
  requireAuthUser,
} from "@/lib/emailAlertsServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams();

  for (const key of ["from_date", "to_date", "timezone"] as const) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  if (!query.has("timezone")) {
    query.set("timezone", "Europe/London");
  }

  const qs = query.toString();
  const upstreamResp = await analyticsUpstream(
    `/analytics/dcp/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`,
    { method: "GET" }
  );

  return proxyAlertsResponse(upstreamResp);
}
