import { NextResponse } from "next/server";
import { analyticsUpstream } from "@/lib/emailAlertsServer";

export const BROADCAST_QUERY_KEYS = [
  "date",
  "timezone",
  "campaign_key",
  "campaign_id",
  "sort_by",
  "sort_order",
  "period",
  "from_date",
  "to_date",
] as const;

export function copyBroadcastQueryParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of BROADCAST_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }
  if (!query.has("timezone")) {
    query.set("timezone", "Europe/London");
  }
  return query;
}

export async function proxyBroadcastGet(
  pathSuffix: string,
  searchParams: URLSearchParams
): Promise<Response> {
  const query = copyBroadcastQueryParams(searchParams);
  const qs = query.toString();
  const upstreamPath = `/analytics/broadcast${pathSuffix}${
    qs ? `?${qs}` : ""
  }`;
  const upstreamResp = await analyticsUpstream(upstreamPath, { method: "GET" });

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

  return NextResponse.json(data, { status: upstreamResp.status });
}
