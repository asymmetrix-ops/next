import { NextRequest, NextResponse } from "next/server";
import {
  analyticsUpstream,
  requireAuthUser,
} from "@/lib/emailAlertsServer";
import { enrichDcpAnalyticsResponse } from "@/lib/dcpAnalyticsServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams();

  for (const key of [
    "from_date",
    "to_date",
    "timezone",
    "company_name",
    "filter",
    "include_rounds",
  ] as const) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  if (!query.has("timezone")) {
    query.set("timezone", "Europe/London");
  }

  const qs = query.toString();
  const upstreamResp = await analyticsUpstream(
    `/analytics/dcp${qs ? `?${qs}` : ""}`,
    { method: "GET" }
  );

  const text = await upstreamResp.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!upstreamResp.ok) {
    return NextResponse.json(
      {
        error: "Upstream error",
        statusText: upstreamResp.statusText,
        data,
      },
      { status: upstreamResp.status }
    );
  }

  const enriched = await enrichDcpAnalyticsResponse(auth.token, data);
  return NextResponse.json(enriched, { status: upstreamResp.status });
}
