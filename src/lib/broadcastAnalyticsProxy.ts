import { NextResponse } from "next/server";
import { analyticsUpstream } from "@/lib/emailAlertsServer";

export const BROADCAST_DASHBOARD_QUERY_KEYS = [
  "date",
  "timezone",
  "campaign_key",
  "search",
  "period",
  "limit",
  "offset",
] as const;

export function copyBroadcastDashboardQueryParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of BROADCAST_DASHBOARD_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }
  if (!query.has("timezone")) {
    query.set("timezone", "Europe/London");
  }
  return query;
}

export const BROADCAST_CAMPAIGN_KEYS = [
  "summit-london-2026-reg-clients",
  "summit-london-2026-reg-open",
] as const;

export type BroadcastCampaignKey = (typeof BROADCAST_CAMPAIGN_KEYS)[number];

export function isBroadcastCampaignKey(value: string): value is BroadcastCampaignKey {
  return (BROADCAST_CAMPAIGN_KEYS as readonly string[]).includes(value);
}

export async function proxyBroadcastCampaignGet(
  campaignKey: string,
  pathSuffix: string,
  searchParams: URLSearchParams
): Promise<Response> {
  const query = copyBroadcastDashboardQueryParams(searchParams);
  const qs = query.toString();
  const encodedKey = encodeURIComponent(campaignKey);
  const upstreamPath = `/analytics/broadcast/${encodedKey}${pathSuffix}${
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

export async function proxyBroadcastDashboardGet(
  pathSuffix: string,
  searchParams: URLSearchParams
): Promise<Response> {
  const query = copyBroadcastDashboardQueryParams(searchParams);
  const qs = query.toString();
  const upstreamPath = `/analytics/broadcast/dashboard${pathSuffix}${
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
